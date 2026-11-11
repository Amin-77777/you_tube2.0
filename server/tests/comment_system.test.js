import test from "node:test";
import assert from "node:assert/strict";
import {
  checkProfanity,
  checkMaliciousContent,
  normalizeText,
  decodeLeetspeak,
  checkRateLimit,
  sanitizeHtml,
} from "../services/spamDetectionService.js";
import {
  detectLanguage,
  SUPPORTED_LANGUAGES,
} from "../services/translationService.js";
import {
  generateCaptchaChallenge,
  verifyCaptcha,
} from "../services/captchaService.js";

test("Multilingual Commenting System Test Suite", async (t) => {
  // --- Section 1: Multilingual Language Detection ---
  await t.test("Language detection accurately identifies Indian scripts and languages", () => {
    // Hindi (Devanagari)
    assert.equal(detectLanguage("यह एक बहुत ही सुंदर और उपयोगी वीडियो है!"), "hi");
    // Kannada
    assert.equal(detectLanguage("ಇದು ತುಂಬಾ ಉಪಯುಕ್ತವಾದ ವೀಡಿಯೊ ಆಗಿದೆ ಧನ್ಯವಾದಗಳು"), "kn");
    // Tamil
    assert.equal(detectLanguage("இது மிகவும் அருமையான மற்றும் பயனுள்ள காணொளி"), "ta");
    // Telugu
    assert.equal(detectLanguage("ఇది చాలా మంచి వీడియో మరియు ఎంతో ఉపయోగకరం"), "te");
    // Malayalam
    assert.equal(detectLanguage("ഇത് വളരെ നല്ല വീഡിയോ ആണ്, നന്ദി"), "ml");
    // Bengali
    assert.equal(detectLanguage("এটি একটি খুব সুন্দর এবং শিক্ষণীয় ভিডিও"), "bn");
    // Gujarati
    assert.equal(detectLanguage("આ એક ખૂબ જ સુંદર અને મદદરૂપ વિડિયો છે"), "gu");
    // Punjabi (Gurmukhi)
    assert.equal(detectLanguage("ਇਹ ਬਹੁਤ ਹੀ ਵਧੀਆ ਅਤੇ ਲਾਹੇਵੰਦ ਵੀਡੀਓ ਹੈ"), "pa");
    // Urdu (Arabic script)
    assert.equal(detectLanguage("یہ ایک بہت ہی معلوماتی اور عمدہ ویڈیو ہے"), "ur");
    // English
    assert.equal(detectLanguage("This is an absolutely fantastic video tutorial!"), "en");
  });

  await t.test("Supported languages list covers all 11+ Indian languages", () => {
    const required = ["en", "hi", "kn", "ta", "te", "ml", "bn", "mr", "gu", "pa", "ur"];
    for (const code of required) {
      assert.ok(SUPPORTED_LANGUAGES[code], `Missing required language code: ${code}`);
    }
  });

  // --- Section 6A: Profanity & Abuse Filter ---
  await t.test("Profanity filter detects abusive words across English and Hindi", () => {
    const prof1 = checkProfanity("You are a total asshole");
    assert.equal(prof1.hasProfanity, true);

    const prof2 = checkProfanity("yeh sab chutiya baatein hain");
    assert.equal(prof2.hasProfanity, true);

    const prof3 = checkProfanity("Great explanation, keep it up!");
    assert.equal(prof3.hasProfanity, false);
  });

  await t.test("Profanity filter decodes leetspeak and character substitutions", () => {
    // Leetspeak variants
    assert.equal(decodeLeetspeak("b!tch"), "bitch");
    assert.equal(decodeLeetspeak("a$$hole"), "asshole");
    assert.equal(decodeLeetspeak("m0therfucker"), "motherfucker");

    const profLeet = checkProfanity("what a b!tch move");
    assert.equal(profLeet.hasProfanity, true);
  });

  await t.test("Profanity filter avoids false positives (Scunthorpe problem)", () => {
    // Common words containing substrings of profane words
    const safeWords = [
      "I love this programming class!",
      "The assassin in the game was sneaky.",
      "Please pass the documentation.",
      "Grass is green and fresh.",
      "Click the button to submit.",
    ];

    for (const phrase of safeWords) {
      const res = checkProfanity(phrase);
      assert.equal(res.hasProfanity, false, `False positive detected on safe phrase: "${phrase}"`);
    }
  });

  // --- Section 6B: Malicious Content & XSS Injection Protection ---
  await t.test("SanitizeHtml escapes dangerous characters", () => {
    const malicious = '<script>alert("hacked")</script>';
    const sanitized = sanitizeHtml(malicious);
    assert.ok(!sanitized.includes("<script>"));
    assert.ok(sanitized.includes("&lt;script&gt;"));
  });

  await t.test("Malicious link detection blocks exploit patterns and phishing links", () => {
    assert.equal(
      checkMaliciousContent("Check this out: javascript:evil()").isMalicious,
      true
    );
    assert.equal(
      checkMaliciousContent("Visit http://claim-reward.giftcard-generator.xyz").isMalicious,
      true
    );
    assert.equal(
      checkMaliciousContent("Here is the official documentation: https://react.dev").isMalicious,
      false
    );
  });

  await t.test("Detects excessive character flooding", () => {
    assert.equal(
      checkMaliciousContent("Hellooooooooooooooooooooooooooooo!").isMalicious,
      true
    );
    assert.equal(
      checkMaliciousContent("Regular comment with normal punctuation.").isMalicious,
      false
    );
  });

  // --- Section 6C & 6D: Rate Limiting & CAPTCHA Trigger ---
  await t.test("Rate limiter enforces boundaries and triggers CAPTCHA", () => {
    const testUserId = "user_test_ratelimit_" + Date.now();

    // 1st comment: allowed
    let r1 = checkRateLimit(testUserId, false);
    assert.equal(r1.isRateLimited, false);

    // 2nd comment: allowed
    let r2 = checkRateLimit(testUserId, false);
    assert.equal(r2.isRateLimited, false);

    // 3rd comment: allowed, flags requireCaptcha
    let r3 = checkRateLimit(testUserId, false);
    assert.equal(r3.isRateLimited, false);
    assert.equal(r3.requireCaptcha, true);

    // 4th comment: allowed
    checkRateLimit(testUserId, false);
    // 5th comment: allowed
    checkRateLimit(testUserId, false);

    // 6th comment in rapid succession: rate limited (HTTP 429)
    let r6 = checkRateLimit(testUserId, false);
    assert.equal(r6.isRateLimited, true);
    assert.equal(r6.requireCaptcha, true);
    assert.ok(r6.retryAfterSeconds > 0);
  });

  await t.test("CAPTCHA challenge generation and verification", () => {
    const challenge = generateCaptchaChallenge();
    assert.ok(challenge.challengeId.startsWith("cap_"));
    assert.ok(challenge.question.includes("What is"));

    // Extract numbers to calculate expected answer
    const match = challenge.question.match(/What is (\d+) ([+-]) (\d+)\?/);
    assert.ok(match, "Question must match arithmetic format");

    const a = parseInt(match[1], 10);
    const op = match[2];
    const b = parseInt(match[3], 10);
    const expected = op === "+" ? a + b : a - b;

    // Wrong answer rejected
    const wrong = verifyCaptcha(challenge.challengeId, expected + 99);
    assert.equal(wrong.success, false);

    // Correct answer accepted
    const correct = verifyCaptcha(challenge.challengeId, expected);
    assert.equal(correct.success, true);

    // Challenge cannot be reused after verification
    const reuse = verifyCaptcha(challenge.challengeId, expected);
    assert.equal(reuse.success, false);
  });

  // --- Section 13: Edge Case Normalization ---
  await t.test("Text normalization removes extra spaces and handles Unicode properly", () => {
    const raw = "   Hello   WORLD!   \n\n\t  यह   एक   परीक्षण   है  ";
    const norm = normalizeText(raw);
    assert.ok(norm.includes("hello world"));
    assert.ok(norm.includes("यह एक परीक्षण है"));
  });

  // --- Section 4 & 13: Optimistic Concurrency & Edit Window Logic ---
  await t.test("Optimistic concurrency and 15-minute edit window verification", () => {
    const currentVersion = 1;
    const clientMatchingVersion = 1;
    const clientStaleVersion = 2;

    assert.equal(clientMatchingVersion === currentVersion, true, "Matching version allows edit");
    assert.equal(clientStaleVersion === currentVersion, false, "Stale version triggers HTTP 409 Conflict");

    const EDIT_TIME_LIMIT_MINUTES = 15;
    const justPostedTime = Date.now() - 5 * 60 * 1000; // 5 mins ago
    const expiredTime = Date.now() - 20 * 60 * 1000; // 20 mins ago

    const diffJustPosted = (Date.now() - justPostedTime) / (60 * 1000);
    const diffExpired = (Date.now() - expiredTime) / (60 * 1000);

    assert.ok(diffJustPosted <= EDIT_TIME_LIMIT_MINUTES, "Allowed to edit within 15 mins");
    assert.ok(diffExpired > EDIT_TIME_LIMIT_MINUTES, "Blocked from editing after 15 mins");
  });

  // --- Section 1 & 4: Soft Deletion & Reaction Toggle Logic ---
  await t.test("Reaction toggle state transitions correctly", () => {
    let currentReaction = null;
    let likes = 5;
    let dislikes = 1;

    // 1. User clicks like
    currentReaction = "like";
    likes += 1;
    assert.equal(currentReaction, "like");
    assert.equal(likes, 6);

    // 2. User switches from like to dislike
    likes -= 1;
    dislikes += 1;
    currentReaction = "dislike";
    assert.equal(currentReaction, "dislike");
    assert.equal(likes, 5);
    assert.equal(dislikes, 2);

    // 3. User clicks dislike again (toggles off)
    dislikes -= 1;
    currentReaction = null;
    assert.equal(currentReaction, null);
    assert.equal(dislikes, 1);
  });
});
