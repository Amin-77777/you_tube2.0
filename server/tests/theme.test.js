import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateThemeForIST,
  getEffectiveTheme,
  getISTTimeParts,
  formatToIST,
  IST_TIMEZONE,
} from "../services/themeService.js";

test("Theme Service - Indian Standard Time (IST) Rules", async (t) => {
  await t.test("4:59 AM IST selects Dark theme in Auto mode", () => {
    // 4:59:00 AM IST is 23:29:00 UTC previous day (IST = UTC + 5:30)
    // 4 hours 59 minutes - 5 hours 30 minutes = -31 minutes (23:29 UTC)
    const date = new Date("2026-10-26T23:29:00.000Z");
    const istParts = getISTTimeParts(date);
    assert.equal(istParts.hour, 4);
    assert.equal(istParts.minute, 59);

    const theme = calculateThemeForIST(date);
    assert.equal(theme, "dark");

    const effective = getEffectiveTheme("auto", date);
    assert.equal(effective, "dark");
  });

  await t.test("5:00 AM IST selects Light theme in Auto mode", () => {
    // 5:00:00 AM IST is 23:30:00 UTC previous day
    const date = new Date("2026-10-26T23:30:00.000Z");
    const istParts = getISTTimeParts(date);
    assert.equal(istParts.hour, 5);
    assert.equal(istParts.minute, 0);

    const theme = calculateThemeForIST(date);
    assert.equal(theme, "light");

    const effective = getEffectiveTheme("auto", date);
    assert.equal(effective, "light");
  });

  await t.test("11:59 AM IST selects Light theme in Auto mode", () => {
    // 11:59:00 AM IST is 06:29:00 UTC same day
    const date = new Date("2026-10-26T06:29:00.000Z");
    const istParts = getISTTimeParts(date);
    assert.equal(istParts.hour, 11);
    assert.equal(istParts.minute, 59);

    const theme = calculateThemeForIST(date);
    assert.equal(theme, "light");

    const effective = getEffectiveTheme("auto", date);
    assert.equal(effective, "light");
  });

  await t.test("12:00 PM IST selects Dark theme in Auto mode", () => {
    // 12:00:00 PM IST is 06:30:00 UTC same day
    const date = new Date("2026-10-26T06:30:00.000Z");
    const istParts = getISTTimeParts(date);
    assert.equal(istParts.hour, 12);
    assert.equal(istParts.minute, 0);

    const theme = calculateThemeForIST(date);
    assert.equal(theme, "dark");

    const effective = getEffectiveTheme("auto", date);
    assert.equal(effective, "dark");
  });

  await t.test("Manual 'light' preference always returns light regardless of time", () => {
    // At night (midnight IST / 18:30 UTC)
    const midnightIST = new Date("2026-10-26T18:30:00.000Z");
    assert.equal(getEffectiveTheme("light", midnightIST), "light");

    // At 4:59 AM IST
    const earlyMorningIST = new Date("2026-10-26T23:29:00.000Z");
    assert.equal(getEffectiveTheme("light", earlyMorningIST), "light");
  });

  await t.test("Manual 'dark' preference always returns dark regardless of time", () => {
    // At 9:00 AM IST (which would normally be light)
    const morningIST = new Date("2026-10-26T03:30:00.000Z");
    assert.equal(getEffectiveTheme("dark", morningIST), "dark");
  });

  await t.test("Format to IST string includes IST indicator and human readable time", () => {
    const date = new Date("2026-10-26T06:30:00.000Z"); // 12:00 PM IST
    const formatted = formatToIST(date);
    assert.ok(formatted.includes("IST"), "Must include IST identifier");
    assert.ok(formatted.includes("12:00"), "Must show 12:00");
  });
});
