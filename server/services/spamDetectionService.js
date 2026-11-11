import Comment from "../Modals/comment.js";

// Configurable constants via environment
const MAX_COMMENT_LENGTH = parseInt(process.env.MAX_COMMENT_LENGTH || "2000", 10);
const COMMENT_RATE_LIMIT = parseInt(process.env.COMMENT_RATE_LIMIT || "5", 10); // per 60s
const COMMENT_RATE_WINDOW = parseInt(process.env.COMMENT_RATE_WINDOW || "60000", 10); // 60s
const REPLY_RATE_LIMIT = parseInt(process.env.REPLY_RATE_LIMIT || "3", 10); // per 30s
const REPLY_RATE_WINDOW = parseInt(process.env.REPLY_RATE_WINDOW || "30000", 10); // 30s
const DUPLICATE_TIME_WINDOW = parseInt(process.env.DUPLICATE_TIME_WINDOW || "300000", 10); // 5 min

// Sliding window trackers in memory
const userCommentTimestamps = new Map();
const userReplyTimestamps = new Map();

// Known malicious or dangerous domains & URL schemes
const MALICIOUS_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /vbscript:/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /(?:free-crypto|free-money|giftcard-generator|login-verify|bank-update|claim-reward|free-robux|verify-account-now)\.[a-z0-9.-]+/i,
  /\b(?:\d{1,3}\.){3}\d{1,3}\/(?:wp-admin|login|exploit|payload|bin)\b/i,
  /\.(?:exe|bat|cmd|vbs|sh|scr|hta)\b/i,
];

// Multilingual profanity dictionary (English, Hindi, Hinglish, regional)
// Carefully structured with word boundaries to prevent Scunthorpe problem
const PROFANITY_WORDS = [
  // English abusive words
  "asshole", "bitch", "bastard", "cunt", "motherfucker", "fucker", "fucking",
  "dickhead", "slut", "whore", "nigger", "nigga", "faggot", "chink", "retard",
  "blowjob", "dipshit", "jackass", "piss off", "cock",
  // Hindi / Hinglish abusive words
  "madarchod", "behenchod", "bhenchod", "bhosdike", "bhosadi", "bhosdika",
  "chutiya", "chutiye", "chutiyapa", "gaandu", "gandu", "harami", "kameena",
  "kamine", "lauda", "lodu", "randi", "saala kutta", "kuttiya", "tatte",
  "chinal", "hijra", "gaand", "lund", "suar ki aulaad",
];

// Leetspeak character substitution mapping
const LEET_MAP = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "+": "t",
  "7": "t",
};

/**
 * Escapes HTML characters to prevent XSS attacks
 */
export function sanitizeHtml(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Normalizes text for comparison and analysis
 */
export function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/\r\n|\r/g, "\n")
    .trim()
    .replace(/[^\w\s\n\u0900-\u0D7F]/gu, "") // preserve alphanumeric, newlines, and Indian Unicode blocks
    .replace(/\s+/g, " ");
}

/**
 * Normalizes text for leetspeak decoding
 */
export function decodeLeetspeak(text) {
  let decoded = text.toLowerCase();
  for (const [leet, char] of Object.entries(LEET_MAP)) {
    decoded = decoded.split(leet).join(char);
  }
  return decoded;
}

/**
 * Detects abusive and profane language
 */
export function checkProfanity(text) {
  if (!text) return { hasProfanity: false };

  const rawNormalized = text.toLowerCase();
  const leetDecoded = decodeLeetspeak(rawNormalized);

  for (const word of PROFANITY_WORDS) {
    // Exact word boundary regex to avoid substring false positives (e.g. assassin, class)
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9\u0900-\u0D7F])${escapedWord}(?:$|[^a-zA-Z0-9\u0900-\u0D7F])`, "i");

    if (regex.test(rawNormalized) || regex.test(leetDecoded)) {
      return {
        hasProfanity: true,
        word,
        message: "Your comment contains language that violates our community standards.",
      };
    }
  }

  return { hasProfanity: false };
}

/**
 * Checks for malicious URLs and injection patterns
 */
export function checkMaliciousContent(text) {
  if (!text) return { isMalicious: false };

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isMalicious: true,
        message: "Your comment contains links or code patterns prohibited for safety reasons.",
      };
    }
  }

  // Check for excessive repetitive characters (e.g., "aaaaaaaaaaa" or "!!!!!!!!!!")
  const repetitiveCharRegex = /(.)\1{9,}/u;
  if (repetitiveCharRegex.test(text)) {
    return {
      isMalicious: true,
      message: "Your comment contains excessive repeated characters.",
    };
  }

  return { isMalicious: false };
}

/**
 * Detects duplicate comments from the same user within a time window
 */
export async function checkDuplicateComment(userId, videoId, text, parentCommentId = null) {
  if (!userId || !text) return { isDuplicate: false };

  const normalizedInput = normalizeText(text);
  if (!normalizedInput || normalizedInput.length < 3) {
    return { isDuplicate: false };
  }

  const since = new Date(Date.now() - DUPLICATE_TIME_WINDOW);

  try {
    const recentComments = await Comment.find({
      userId,
      createdAt: { $gte: since },
      isDeleted: false,
    })
      .select("originalText commentbody createdAt")
      .limit(10)
      .lean();

    for (const c of recentComments) {
      const existingText = c.originalText || c.commentbody || "";
      const normalizedExisting = normalizeText(existingText);

      if (normalizedInput === normalizedExisting) {
        return {
          isDuplicate: true,
          message:
            "You recently posted an identical comment. To avoid spam, duplicate comments are not permitted within 5 minutes.",
        };
      }
    }
  } catch (err) {
    console.warn("Duplicate check error:", err.message);
  }

  return { isDuplicate: false };
}

/**
 * Checks rate limiting for comments and replies
 */
export function checkRateLimit(userId, isReply = false) {
  const uid = String(userId);
  const now = Date.now();

  const timestampMap = isReply ? userReplyTimestamps : userCommentTimestamps;
  const limit = isReply ? REPLY_RATE_LIMIT : COMMENT_RATE_LIMIT;
  const windowMs = isReply ? REPLY_RATE_WINDOW : COMMENT_RATE_WINDOW;

  let timestamps = timestampMap.get(uid) || [];
  // Filter out timestamps outside window
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      isRateLimited: true,
      requireCaptcha: true,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      message: `You are posting ${isReply ? "replies" : "comments"} too quickly. Please wait ${Math.max(
        1,
        retryAfterSeconds
      )} seconds before trying again.`,
    };
  }

  // If user has made 3 or more comments rapidly, flag that CAPTCHA is recommended next time
  const requireCaptcha = !isReply && (timestamps.length + 1) >= 3;

  timestamps.push(now);
  timestampMap.set(uid, timestamps);

  return {
    isRateLimited: false,
    requireCaptcha,
  };
}

/**
 * Comprehensive spam and safety validation
 */
export async function validateCommentSubmission({
  userId,
  userDoc,
  videoId,
  text,
  parentCommentId = null,
  isReply = false,
  captchaToken = null,
}) {
  // 1. Text length validation
  if (!text || typeof text !== "string" || !text.trim()) {
    return { isValid: false, status: 400, message: "Comment text cannot be empty." };
  }

  if (text.length > MAX_COMMENT_LENGTH) {
    return {
      isValid: false,
      status: 400,
      message: `Comment exceeds the maximum allowed length of ${MAX_COMMENT_LENGTH} characters.`,
    };
  }

  // 2. User suspension check
  if (userDoc) {
    if (userDoc.isCommentBanned) {
      return {
        isValid: false,
        status: 403,
        message: "Your commenting privileges have been suspended by an administrator.",
      };
    }
    if (userDoc.commentSuspendedUntil && new Date(userDoc.commentSuspendedUntil) > new Date()) {
      return {
        isValid: false,
        status: 403,
        message: `Your commenting privileges are temporarily suspended until ${new Date(
          userDoc.commentSuspendedUntil
        ).toLocaleString()}.`,
      };
    }
  }

  // 3. Malicious content & script injection
  const malCheck = checkMaliciousContent(text);
  if (malCheck.isMalicious) {
    return { isValid: false, status: 400, message: malCheck.message };
  }

  // 4. Profanity check
  const profCheck = checkProfanity(text);
  if (profCheck.hasProfanity) {
    return { isValid: false, status: 400, message: profCheck.message };
  }

  // 5. Rate limiting
  const rateCheck = checkRateLimit(userId, isReply);
  if (rateCheck.isRateLimited) {
    return {
      isValid: false,
      status: 429,
      requireCaptcha: true,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
      message: rateCheck.message,
    };
  }

  // 6. Duplicate comment check
  const dupCheck = await checkDuplicateComment(userId, videoId, text, parentCommentId);
  if (dupCheck.isDuplicate) {
    return { isValid: false, status: 409, message: dupCheck.message };
  }

  return {
    isValid: true,
    requireCaptcha: rateCheck.requireCaptcha,
    sanitizedText: text.trim(), // Keep raw unicode with spaces trimmed
  };
}
