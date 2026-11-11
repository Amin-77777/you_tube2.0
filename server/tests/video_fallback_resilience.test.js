import test from "node:test";
import assert from "node:assert/strict";
import { checkVideoAccess } from "../controllers/payment.js";
import {
  handleview,
  handlehistory,
  saveWatchProgress,
  getWatchProgress,
  getallhistoryVideo,
} from "../controllers/history.js";
import { handlelike, getallLikedVideo } from "../controllers/like.js";
import { handlewatchlater, getallwatchlater } from "../controllers/watchlater.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("Video Playback & Fallback ID Resilience Test Suite", async (t) => {
  await t.test("checkVideoAccess returns 200 with allowed:true for fallback video 'default-1'", async () => {
    const req = {
      params: { videoId: "default-1" },
      userId: null,
    };
    const res = createMockRes();

    await checkVideoAccess(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.allowed, true);
    assert.equal(res.body.accessLevel, "free");
    assert.equal(res.body.videoId, "default-1");
  });

  await t.test("handleview returns 200 without throwing CastError on fallback video 'default-1'", async () => {
    const req = {
      params: { videoId: "default-1" },
    };
    const res = createMockRes();

    await handleview(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  await t.test("handlehistory returns 200 without throwing CastError on fallback video 'default-1'", async () => {
    const req = {
      params: { videoId: "default-1" },
      body: { userId: "guest-user" },
    };
    const res = createMockRes();

    await handlehistory(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.history, true);
  });

  await t.test("saveWatchProgress returns 200 without throwing CastError on fallback video 'default-1'", async () => {
    const req = {
      params: { videoId: "default-1" },
      body: { userId: "user-123", playbackPosition: 12, duration: 60 },
    };
    const res = createMockRes();

    await saveWatchProgress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  await t.test("getWatchProgress returns 200 with progress:null on fallback video 'default-1'", async () => {
    const req = {
      params: { videoId: "default-1" },
      query: { userId: "user-123" },
      headers: {},
    };
    const res = createMockRes();

    await getWatchProgress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.progress, null);
  });

  await t.test("handlelike returns 200 with liked:false on fallback video 'default-1'", async () => {
    const req = {
      params: { videoId: "default-1" },
      body: { userId: "user-123" },
    };
    const res = createMockRes();

    await handlelike(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.liked, false);
  });

  await t.test("handlewatchlater returns 200 with watchlater:false on fallback video 'default-1'", async () => {
    const req = {
      params: { videoId: "default-1" },
      body: { userId: "user-123" },
    };
    const res = createMockRes();

    await handlewatchlater(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.watchlater, false);
  });

  await t.test("getallhistoryVideo returns 200 with empty array for invalid userId", async () => {
    const req = {
      params: { userId: "guest" },
    };
    const res = createMockRes();

    await getallhistoryVideo(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
  });

  await t.test("getallLikedVideo returns 200 with empty array for invalid userId", async () => {
    const req = {
      params: { userId: "guest" },
    };
    const res = createMockRes();

    await getallLikedVideo(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
  });

  await t.test("getallwatchlater returns 200 with empty array for invalid userId", async () => {
    const req = {
      params: { userId: "guest" },
    };
    const res = createMockRes();

    await getallwatchlater(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
  });
});
