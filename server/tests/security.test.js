import test from "node:test";
import assert from "node:assert/strict";
import {
  generateNumericOtp,
  hashOtp,
  maskEmail,
  maskPhone,
} from "../services/otpService.js";
import { parseUserAgent } from "../services/deviceParserService.js";
import { classifyIp, isPrivateOrLocalIP } from "../services/geoService.js";
import { hashDeviceToken } from "../services/trustedDeviceService.js";

test("Security & Auth Subsystems", async (t) => {
  await t.test("OTP Generation produces valid 6-digit numeric codes", () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateNumericOtp();
      assert.equal(typeof otp, "string");
      assert.equal(otp.length, 6);
      assert.ok(/^\d{6}$/.test(otp), "OTP must be strictly 6 digits");
      const num = parseInt(otp, 10);
      assert.ok(num >= 100000 && num <= 999999);
    }
  });

  await t.test("OTP Hashing is deterministic, salted, and irreversible", () => {
    const code = "749201";
    const hash1 = hashOtp(code);
    const hash2 = hashOtp(code);
    const differentHash = hashOtp("749202");

    assert.equal(hash1, hash2, "Same code must produce same hash");
    assert.notEqual(hash1, differentHash, "Different code must produce different hash");
    assert.notEqual(hash1, code, "Hash must never equal plaintext");
    assert.equal(hash1.length, 64, "SHA-256 HMAC must be 64 hex characters");
  });

  await t.test("Email Masking protects user privacy in verification UI", () => {
    assert.equal(maskEmail("user@example.com"), "u**r@example.com");
    assert.equal(maskEmail("john.doe@gmail.com"), "j****e@gmail.com");
    assert.equal(maskEmail("ab@test.com"), "a***@test.com");
    assert.ok(!maskEmail("secureaccount@company.com").includes("secureaccount"));
  });

  await t.test("Phone Masking protects mobile numbers", () => {
    const masked = maskPhone("+919876543210");
    assert.ok(masked.startsWith("+91"));
    assert.ok(masked.endsWith("210"));
    assert.ok(masked.includes("******"));
  });

  await t.test("Device Parser correctly identifies Desktop browsers and OS", () => {
    const chromeWindowsUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    const parsed = parseUserAgent(chromeWindowsUA);
    assert.equal(parsed.browser.name, "Chrome");
    assert.equal(parsed.os.name, "Windows");
    assert.equal(parsed.device.type, "Desktop");

    const firefoxMacUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0";
    const parsedMac = parseUserAgent(firefoxMacUA);
    assert.equal(parsedMac.browser.name, "Firefox");
    assert.equal(parsedMac.os.name, "macOS");
    assert.equal(parsedMac.device.type, "Desktop");
  });

  await t.test("Device Parser correctly identifies Mobile and Tablet environments", () => {
    const iphoneUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1";
    const parsedIphone = parseUserAgent(iphoneUA);
    assert.equal(parsedIphone.os.name, "iOS");
    assert.equal(parsedIphone.device.type, "Mobile");
    assert.equal(parsedIphone.browser.name, "Safari");

    const ipadUA =
      "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
    const parsedIpad = parseUserAgent(ipadUA);
    assert.equal(parsedIpad.device.type, "Tablet");

    const androidUA =
      "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36";
    const parsedAndroid = parseUserAgent(androidUA);
    assert.equal(parsedAndroid.os.name, "Android");
    assert.equal(parsedAndroid.device.type, "Mobile");
    assert.equal(parsedAndroid.browser.name, "Chrome");
  });

  await t.test("IP Classification identifies IPv4 and IPv6", () => {
    assert.equal(classifyIp("192.168.1.1"), "IPv4");
    assert.equal(classifyIp("103.21.244.2"), "IPv4");
    assert.equal(classifyIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), "IPv6");
    assert.equal(classifyIp("::1"), "IPv6");
    assert.equal(classifyIp("invalid-ip"), "Unknown");
  });

  await t.test("Private/Local IP detection protects internal network requests", () => {
    assert.equal(isPrivateOrLocalIP("127.0.0.1"), true);
    assert.equal(isPrivateOrLocalIP("::1"), true);
    assert.equal(isPrivateOrLocalIP("192.168.0.50"), true);
    assert.equal(isPrivateOrLocalIP("10.0.0.1"), true);
    assert.equal(isPrivateOrLocalIP("172.16.0.1"), true);
    assert.equal(isPrivateOrLocalIP("8.8.8.8"), false);
    assert.equal(isPrivateOrLocalIP("103.25.12.9"), false);
  });

  await t.test("Device Token Hashing stores only cryptographic hashes", () => {
    const rawToken = "devtok_f839b94098274d7fbc28394a102948";
    const hash = hashDeviceToken(rawToken);
    assert.equal(hash.length, 64);
    assert.notEqual(hash, rawToken);
    assert.equal(hashDeviceToken(rawToken), hash);
  });
});
