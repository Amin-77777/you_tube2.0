import crypto from "crypto";

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "yourtube_captcha_secret_2026";
const activeChallenges = new Map();

// Periodically clean up expired challenges (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of activeChallenges.entries()) {
    if (now - challenge.createdAt > 10 * 60 * 1000) {
      activeChallenges.delete(id);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a new CAPTCHA challenge
 */
export function generateCaptchaChallenge() {
  const challengeId = "cap_" + crypto.randomBytes(12).toString("hex");
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 15) + 1;
  const operator = Math.random() > 0.3 ? "+" : "-";

  let question = "";
  let answer = 0;

  if (operator === "+") {
    question = `What is ${a} + ${b}?`;
    answer = a + b;
  } else {
    const higher = Math.max(a, b);
    const lower = Math.min(a, b);
    question = `What is ${higher} - ${lower}?`;
    answer = higher - lower;
  }

  activeChallenges.set(challengeId, {
    answer: String(answer),
    createdAt: Date.now(),
    attempts: 0,
  });

  return {
    challengeId,
    question,
  };
}

/**
 * Verify a submitted CAPTCHA response
 */
export function verifyCaptcha(challengeId, userAnswer) {
  if (!challengeId || userAnswer === undefined || userAnswer === null) {
    return { success: false, message: "CAPTCHA challenge ID and answer are required" };
  }

  const challenge = activeChallenges.get(challengeId);
  if (!challenge) {
    return { success: false, message: "CAPTCHA challenge expired or invalid. Please try again." };
  }

  // Max 3 attempts
  challenge.attempts += 1;
  if (challenge.attempts > 3) {
    activeChallenges.delete(challengeId);
    return { success: false, message: "Too many failed CAPTCHA attempts. Please request a new challenge." };
  }

  const cleanUserAnswer = String(userAnswer).trim().toLowerCase();
  const correctAnswer = String(challenge.answer).trim().toLowerCase();

  if (cleanUserAnswer === correctAnswer) {
    activeChallenges.delete(challengeId);
    return { success: true };
  }

  return { success: false, message: "Incorrect CAPTCHA answer. Please try again." };
}
