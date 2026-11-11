import CommentTranslation from "../Modals/CommentTranslation.js";

// Supported language codes and their human-readable labels
export const SUPPORTED_LANGUAGES = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  ur: "Urdu",
  es: "Spanish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  ja: "Japanese",
};

/**
 * Detect language based on Unicode character block analysis
 */
export function detectLanguage(text) {
  if (!text || typeof text !== "string") return "en";

  const counts = {
    hi: 0, // Devanagari
    kn: 0, // Kannada
    ta: 0, // Tamil
    te: 0, // Telugu
    ml: 0, // Malayalam
    bn: 0, // Bengali
    gu: 0, // Gujarati
    pa: 0, // Gurmukhi / Punjabi
    ur: 0, // Arabic / Urdu
    en: 0, // Latin
  };

  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x0900 && code <= 0x097f) {
      counts.hi += 1;
    } else if (code >= 0x0c80 && code <= 0x0cff) {
      counts.kn += 1;
    } else if (code >= 0x0b80 && code <= 0x0bff) {
      counts.ta += 1;
    } else if (code >= 0x0c00 && code <= 0x0c7f) {
      counts.te += 1;
    } else if (code >= 0x0d00 && code <= 0x0d7f) {
      counts.ml += 1;
    } else if (code >= 0x0980 && code <= 0x09ff) {
      counts.bn += 1;
    } else if (code >= 0x0a80 && code <= 0x0aff) {
      counts.gu += 1;
    } else if (code >= 0x0a00 && code <= 0x0a7f) {
      counts.pa += 1;
    } else if (code >= 0x0600 && code <= 0x06ff) {
      counts.ur += 1;
    } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      counts.en += 1;
    }
  }

  let dominantLang = "en";
  let maxCount = 0;

  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantLang = lang;
    }
  }

  return dominantLang;
}

/**
 * Fetches translation from external API or falls back gracefully
 */
async function fetchTranslationFromProvider(text, sourceLang, targetLang) {
  // 1. Google Translate API if API Key is supplied
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.TRANSLATION_API_KEY;
  if (googleApiKey) {
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLang !== "auto" ? sourceLang : undefined,
          target: targetLang,
          format: "text",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const translatedText = data?.data?.translations?.[0]?.translatedText;
        if (translatedText) {
          return { translatedText, provider: "google" };
        }
      }
    } catch (err) {
      console.warn("Google Translate API call failed, trying backup:", err.message);
    }
  }

  // 2. LibreTranslate if configured
  const libreUrl = process.env.LIBRETRANSLATE_URL;
  if (libreUrl) {
    try {
      const response = await fetch(`${libreUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          return { translatedText: data.translatedText, provider: "libretranslate" };
        }
      }
    } catch (err) {
      console.warn("LibreTranslate call failed:", err.message);
    }
  }

  // 3. MyMemory Free Open API (supports 500+ language pairs including Indian languages)
  try {
    const langpair = `${sourceLang}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data?.responseData?.translatedText) {
        return {
          translatedText: data.responseData.translatedText,
          provider: "mymemory",
        };
      }
    }
  } catch (err) {
    console.warn("MyMemory translation call failed:", err.message);
  }

  throw new Error(`Translation service temporarily unavailable for ${sourceLang} to ${targetLang}`);
}

/**
 * Translates comment text and caches result in CommentTranslation collection
 */
export async function translateComment({ commentId, text, targetLanguage = "en", sourceLanguage = null }) {
  if (!text || typeof text !== "string") {
    throw new Error("Text to translate is required");
  }

  const cleanTarget = (targetLanguage || "en").toLowerCase();

  // If already in database cache, return immediately
  if (commentId) {
    try {
      const cached = await CommentTranslation.findOne({
        commentId,
        targetLanguage: cleanTarget,
      }).lean();

      if (cached && cached.translatedText) {
        return {
          translatedText: cached.translatedText,
          sourceLanguage: cached.sourceLanguage,
          targetLanguage: cached.targetLanguage,
          isCached: true,
          provider: cached.provider,
        };
      }
    } catch (dbErr) {
      console.warn("Failed to check translation cache:", dbErr.message);
    }
  }

  // Detect source language if not provided
  const detectedSource = sourceLanguage || detectLanguage(text);

  // If source and target are the same, no translation is needed
  if (detectedSource === cleanTarget) {
    return {
      translatedText: text,
      sourceLanguage: detectedSource,
      targetLanguage: cleanTarget,
      isCached: false,
      isIdentical: true,
      provider: "identity",
    };
  }

  // Fetch from provider
  const { translatedText, provider } = await fetchTranslationFromProvider(text, detectedSource, cleanTarget);

  // Cache in DB if commentId is available
  if (commentId && translatedText) {
    try {
      await CommentTranslation.findOneAndUpdate(
        { commentId, targetLanguage: cleanTarget },
        {
          sourceLanguage: detectedSource,
          targetLanguage: cleanTarget,
          translatedText,
          provider,
          cachedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (saveErr) {
      console.warn("Failed to save translation to cache:", saveErr.message);
    }
  }

  return {
    translatedText,
    sourceLanguage: detectedSource,
    targetLanguage: cleanTarget,
    isCached: false,
    provider,
  };
}
