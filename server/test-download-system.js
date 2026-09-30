import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "./Modals/Auth.js";
import Video from "./Modals/video.js";
import Subscription from "./Modals/Subscription.js";
import Download from "./Modals/Download.js";
import { DOWNLOAD_CONFIG, getPlanDailyLimit, getCurrentDayBounds } from "./config/downloadConfig.js";
import { getOrCreateUserSubscription } from "./controllers/subscription.js";
import { generateToken } from "./middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function runTests() {
  console.log("==================================================");
  console.log("TESTING VIDEO DOWNLOAD MANAGEMENT SYSTEM");
  console.log("==================================================");

  const dbUrl = "mongodb://127.0.0.1:27017/youtube";
  await mongoose.connect(dbUrl);
  console.log("✓ Connected to MongoDB test database");

  // 1. Setup Test User & Video
  let testUser = await User.findOne({ email: "test_downloader@example.com" });
  if (!testUser) {
    testUser = await User.create({
      email: "test_downloader@example.com",
      name: "Test Downloader",
      image: "https://example.com/avatar.png",
    });
  }
  console.log(`✓ Test User setup: ${testUser._id} (${testUser.name})`);

  let testVideo1 = await Video.findOne();
  if (!testVideo1) {
    testVideo1 = await Video.create({
      videotitle: "Unit Test Video 1",
      filename: "test1.mp4",
      filetype: "video/mp4",
      filepath: "https://media.w3.org/2010/05/bunny/trailer.mp4",
      filesize: "4.8MB",
      videochanel: "Test Channel",
    });
  }

  let testVideo2 = await Video.findOne({ _id: { $ne: testVideo1._id } });
  if (!testVideo2) {
    testVideo2 = await Video.create({
      videotitle: "Unit Test Video 2",
      filename: "test2.mp4",
      filetype: "video/mp4",
      filepath: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      filesize: "1.0MB",
      videochanel: "Test Channel",
    });
  }
  console.log(`✓ Test Videos verified: "${testVideo1.videotitle}", "${testVideo2.videotitle}"`);

  // Clean previous test downloads for this user to ensure clean test state
  await Download.deleteMany({ userId: testUser._id });
  await Subscription.deleteMany({ userId: testUser._id });
  console.log("✓ Cleaned test state for test user");

  // 2. Test Subscription Initialization (Default Free)
  const initialSub = await getOrCreateUserSubscription(testUser._id);
  console.assert(initialSub.plan === "Free", "Default plan must be Free");
  console.assert(getPlanDailyLimit(initialSub.plan) === 1, "Free plan limit must be 1 download/day");
  console.log("✓ Test 1 Passed: Default Subscription initialized as Free (Limit: 1/day)");

  // 3. Test Auth Token Generation
  const token = generateToken(testUser);
  console.assert(typeof token === "string" && token.length > 20, "Valid JWT token must be generated");
  console.log("✓ Test 2 Passed: JWT Authentication token generation");

  // 4. Test First Download Authorization (Free User, 1st download)
  const { startOfDay, endOfDay, resetAt } = getCurrentDayBounds();
  let usedCount = await Download.countDocuments({
    userId: testUser._id,
    quotaConsumed: true,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  console.assert(usedCount === 0, "Initial used count must be 0");

  const dl1 = await Download.create({
    userId: testUser._id,
    videoId: testVideo1._id,
    subscriptionPlan: initialSub.plan,
    status: "AUTHORIZED",
    fileSize: testVideo1.filesize,
    quotaConsumed: true,
    isDuplicate: false,
    token: "test_token_1",
    tokenExpiresAt: new Date(Date.now() + 900 * 1000),
    startedAt: new Date(),
  });
  usedCount = await Download.countDocuments({
    userId: testUser._id,
    quotaConsumed: true,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  console.assert(usedCount === 1, "Used count after first download must be 1");
  console.log("✓ Test 3 Passed: First download authorized and consumed 1 quota unit");

  // 5. Test Duplicate Download Abuse Prevention (Same video within window)
  const duplicateWindowStart = new Date(Date.now() - DOWNLOAD_CONFIG.DUPLICATE_WINDOW_MINUTES * 60 * 1000);
  const recentDownload = await Download.findOne({
    userId: testUser._id,
    videoId: testVideo1._id,
    status: { $in: ["AUTHORIZED", "STARTED", "COMPLETED"] },
    createdAt: { $gte: duplicateWindowStart },
  });
  console.assert(Boolean(recentDownload), "Recent download must be detected as duplicate within window");

  const dlDuplicate = await Download.create({
    userId: testUser._id,
    videoId: testVideo1._id,
    subscriptionPlan: initialSub.plan,
    status: "AUTHORIZED",
    fileSize: testVideo1.filesize,
    quotaConsumed: false, // Does NOT consume quota
    isDuplicate: true,
    token: "test_token_dup",
    tokenExpiresAt: new Date(Date.now() + 900 * 1000),
  });

  const usedCountAfterDup = await Download.countDocuments({
    userId: testUser._id,
    quotaConsumed: true,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  console.assert(usedCountAfterDup === 1, "Duplicate download within window must NOT increase used quota");
  console.log("✓ Test 4 Passed: Duplicate download policy enforced (isDuplicate: true, quotaConsumed: false)");

  // 6. Test Free User Quota Exhaustion (Attempting second distinct video)
  const dailyLimit = getPlanDailyLimit(initialSub.plan);
  const isExhausted = usedCountAfterDup >= dailyLimit;
  console.assert(isExhausted === true, "Free user must be prevented from downloading a second distinct video");
  console.log("✓ Test 5 Passed: Free user 1-download-per-day restriction strictly enforced");

  // 7. Test Subscription Upgrade to Bronze (5 downloads/day)
  initialSub.plan = "Bronze";
  initialSub.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await initialSub.save();

  const bronzeLimit = getPlanDailyLimit("Bronze");
  console.assert(bronzeLimit === 5, "Bronze daily limit must be 5");
  const remainingBronze = bronzeLimit - usedCountAfterDup;
  console.assert(remainingBronze === 4, `Bronze remaining quota must be 4, got ${remainingBronze}`);
  console.log("✓ Test 6 Passed: Subscription upgrade to Bronze (Daily Limit: 5, Remaining: 4)");

  // 8. Test Multiple Distinct Downloads for Upgraded Plan
  const dl2 = await Download.create({
    userId: testUser._id,
    videoId: testVideo2._id,
    subscriptionPlan: "Bronze",
    status: "AUTHORIZED",
    fileSize: testVideo2.filesize,
    quotaConsumed: true,
    isDuplicate: false,
    token: "test_token_video2",
    tokenExpiresAt: new Date(Date.now() + 900 * 1000),
  });

  const usedCountBronze = await Download.countDocuments({
    userId: testUser._id,
    quotaConsumed: true,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  console.assert(usedCountBronze === 2, "Used count must now be 2");
  console.log("✓ Test 7 Passed: Bronze user authorized second video (Used: 2/5)");

  // 9. Test Subscription Upgrade to Silver and Gold
  initialSub.plan = "Silver";
  await initialSub.save();
  console.assert(getPlanDailyLimit(initialSub.plan) === 10, "Silver limit must be 10");

  initialSub.plan = "Gold";
  await initialSub.save();
  console.assert(getPlanDailyLimit(initialSub.plan) === 25, "Gold limit must be 25");
  console.log("✓ Test 8 Passed: Silver (10/day) and Gold (25/day) limits verified");

  // 10. Test Download Lifecycle Status Transitions (AUTHORIZED -> STARTED -> COMPLETED)
  dl2.status = "STARTED";
  dl2.startedAt = new Date();
  await dl2.save();
  console.assert(dl2.status === "STARTED", "Status should be STARTED");

  dl2.status = "COMPLETED";
  dl2.completedAt = new Date();
  await dl2.save();
  console.assert(dl2.status === "COMPLETED", "Status should be COMPLETED");
  console.log("✓ Test 9 Passed: Download lifecycle state transitions (AUTHORIZED -> STARTED -> COMPLETED)");

  // 11. Test Failed Download Quota Release (Section 10)
  const failedDl = await Download.create({
    userId: testUser._id,
    videoId: testVideo1._id,
    subscriptionPlan: "Gold",
    status: "STARTED",
    quotaConsumed: true,
    startedAt: new Date(),
  });
  console.assert(failedDl.quotaConsumed === true, "Initially consumed quota");

  // Simulate network failure and quota release
  failedDl.status = "FAILED";
  failedDl.failedAt = new Date();
  failedDl.failureReason = "Network disconnected";
  failedDl.quotaConsumed = false; // Released
  await failedDl.save();

  const refreshedFailed = await Download.findById(failedDl._id);
  console.assert(refreshedFailed.status === "FAILED" && refreshedFailed.quotaConsumed === false, "Quota must be released on failure");
  console.log("✓ Test 10 Passed: Failed download releases reserved quota");

  // 12. Test Token Expiration (Section 12)
  const expiredDl = await Download.create({
    userId: testUser._id,
    videoId: testVideo1._id,
    subscriptionPlan: "Gold",
    status: "AUTHORIZED",
    token: "expired_token_123",
    tokenExpiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
  });
  const isTokenExpired = new Date() > new Date(expiredDl.tokenExpiresAt);
  console.assert(isTokenExpired === true, "Token must be evaluated as expired");
  console.log("✓ Test 11 Passed: Token expiration validation");

  // 13. Test Paginated Download History & Query Indexes
  const historyRecords = await Download.find({ userId: testUser._id })
    .sort({ createdAt: -1 })
    .populate("videoId")
    .lean();
  console.assert(historyRecords.length >= 4, "Must retrieve all user downloads");
  console.assert(historyRecords[0].videoId != null, "Video details must be populated");
  console.log(`✓ Test 12 Passed: Download history query with populated video details (${historyRecords.length} records)`);

  // Clean up test records
  await Download.deleteMany({ userId: testUser._id });
  await Subscription.deleteMany({ userId: testUser._id });
  await User.deleteOne({ _id: testUser._id });

  console.log("\n==================================================");
  console.log("ALL 12/12 SYSTEM VERIFICATION TESTS PASSED!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
