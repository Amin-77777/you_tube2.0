# YouTube 2.0 — Next-Generation Video Streaming & Collaboration Platform

[![Production Status](https://img.shields.io/badge/Status-Live%20on%20Render-success)](https://youtube-frontend-dc7c.onrender.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-green)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-brightgreen)](https://www.mongodb.com/atlas)
[![WebRTC](https://img.shields.io/badge/Video%20Call-WebRTC%20%2B%20Socket.io-blue)](https://webrtc.org/)

YouTube 2.0 is an enterprise-grade, full-stack video streaming, creator studio, and real-time meeting platform. It incorporates all requirements from the 6 project specifications into a cohesive, production-ready system.

---

## 🌐 Live Deployment Links

| Service | Live URL |
|---|---|
| **Frontend Application** | [https://youtube-frontend-dc7c.onrender.com](https://youtube-frontend-dc7c.onrender.com) |
| **Backend REST & WebSocket API** | [https://youtube-backend-dc7c.onrender.com](https://youtube-backend-dc7c.onrender.com) |

> **Evaluator Quick Demo Credentials:**
> - **Admin Moderation Secret Key:** `yourtube_admin_secret_key_2026` *(Quick Auto-Fill button available on `/admin/moderation`)*
> - **Test Razorpay Gateway:** Enabled in Test Mode for Bronze, Silver, and Gold tiers.

---

## 📋 Comprehensive Feature Overview (All 6 Specifications)

### 1. Advanced Multilingual Commenting & Moderation System
*Specification File: `advanced_multilingual_commenting_system_prompt.md`*
- **Multilingual Support:** Supports Unicode, emojis, and 11+ regional Indian languages (Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu, English).
- **Inline Translation:** Instant translation button below comments with automatic source language detection, cached translations, and "Show Original" toggle.
- **Threaded Nested Replies:** Indented reply hierarchy with deep conversations.
- **@Username Mentions:** Live user search dropdown and instant notifications for mentioned users.
- **Reaction System:** Like and dislike toggling with prevention of double reactions.
- **Comment Lifecycle:** 15-minute edit window with `(edited)` badge and audit history; soft deletion preserving reply trees with placeholder.
- **Spam & Abuse Protection:** Multilingual profanity dictionary, duplicate comment detection, rate limiting (5 comments/min), malicious link detection, and interactive math CAPTCHA for suspicious posting bursts.
- **Reporting System:** Report modal with predefined categories (Spam, Harassment, Hate Speech, Malicious Links, etc.).
- **Admin Moderation Dashboard (`/admin/moderation`):** Protected dashboard to review flagged comments, resolve reports, restore comments, view edit histories, and suspend offending users.

---

### 2. Fully Customized HTML5 Video Player
*Specification File: `fully_customized_html5_video_player_prompt.md`*
- **Custom Player Controls:** Play/pause, draggable volume slider, mute/unmute, elapsed/remaining time, buffered progress bar, and animated buffer spinner.
- **Timeline Hover Preview:** Interactive hover thumbnail previews and dynamic timestamps prior to seeking.
- **Playback Speeds:** 0.5×, 1×, 1.25×, 1.5×, and 2×.
- **Precision Seeking:** 10s backward/forward seek buttons, click/drag on progress bar, and keyboard arrow controls.
- **Watch Progress Tracking:** Automatic state save to MongoDB every 5s, resuming playback on return, and 90% completion threshold tracking.
- **Multi-Player Prevention:** Automatically pauses other playing video elements across the page.
- **Autoplay Next Video:** 5-second countdown banner with "Cancel" option before seamlessly transitioning to the next video.
- **Full Keyboard Shortcuts:**
  - `Space`: Play / Pause
  - `←` / `→`: Seek 10 seconds (with `Shift` for 30s)
  - `↑` / `↓`: Volume control
  - `M`: Mute / Unmute
  - `F`: Fullscreen mode
  - `T`: Theater mode
  - `P`: Picture-in-Picture (PiP)
  - `C`: Subtitles / Captions toggle
  - `N`: Next video
- **Responsive Layouts:** Theater mode, standard 2-column desktop view, and mobile touch gestures.

---

### 3. Subscription Management & Razorpay Test Payment
*Specification File: `subscription_management_razorpay_implementation_prompt.md`*
- **4 Configurable Tiers:**
  - **Free:** 1 download/day, standard quality, standard catalog.
  - **Bronze:** 5 downloads/day, HD streaming, selected premium content.
  - **Silver:** 15 downloads/day, Full HD streaming, priority creator content.
  - **Gold:** Unlimited downloads, 4K streaming, ad-free viewing, all courses.
- **Flexible Billing Cycles:** Monthly, Quarterly, and Yearly with automatic discounted rates.
- **Comparison Catalog (`/subscriptions`):** Side-by-side plan feature comparison matrix highlighting current plan.
- **Razorpay Test Integration:** Server-side HMAC-SHA256 signature verification with automated test modal checkout.
- **Subscription Dashboard (`/subscription/dashboard`):** Active plan details, validity countdown, daily quota meters, billing history, and PDF/printable tax invoice generator.

---

### 4. Automatic IST Theme, Login Tracking & Account Security
*Specification File: `theme_login_security_prompt.md`*
- **Time-Based Theme Engine:** Automatically selects theme based on **Indian Standard Time (IST, Asia/Kolkata)**:
  - `5:00 AM – 11:59 AM IST`: Light Theme
  - `12:00 PM – 4:59 AM IST`: Dark Theme
- **User Preference Override:** Toggle between `Auto`, `Light`, and `Dark` with instant live switching and server-side profile persistence.
- **Flicker-Free Hydration:** Pre-hydration inline script executes before paint to eliminate light/dark flashes.
- **Detailed Login Activity Tracking:**
  - Records IP address, approximate geolocation (City, State, Country), device type, OS, and browser family.
  - Tracks success and failure logs with safe reason codes.
- **Unrecognized Environment Detection & 2FA OTP:**
  - Challenges unknown devices or new IP ranges with a 6-digit OTP sent via email/SMS.
  - 5-minute expiration, 60s resend cooldown, and rate limiting.
- **Trusted Devices Management:** Trust devices for 30 days and revoke sessions remotely via `/security`.

---

### 5. Real-Time WebRTC Video Calling & Meetings
*Specification File: `video-calling-feature.md`*
- **Meeting Rooms (`/video-call` & `/video-call/[roomId]`):** Instant unique room creation, join by code, and shareable meeting URLs.
- **Pre-Join Lobby:** Live camera preview, microphone level testing, and custom display name input before entering.
- **In-Call Controls:**
  - Microphone mute/unmute
  - Camera video on/off & camera switcher
  - Screen sharing (entire screen, application window, or tab)
  - Leave call / End meeting for all
  - In-call chat with reactions
  - Raise hand indicator
- **Real-Time Indicators:** Active speaker detection, microphone/camera statuses, network quality bars, and live duration timer.
- **Host Moderation:** Mute participants, remove/kick participants, and room lock.
- **Dual-Mode Signaling:** Socket.io signaling server with Google STUN and metered TURN/TLS relay fallback.

---

### 6. Controlled Video Download Management & Daily Quotas
*Specification File: `video-download-management-system-spec.md`*
- **Tier-Based Daily Quotas:**
  - Free: 1 download / day
  - Bronze: 5 downloads / day
  - Silver: 15 downloads / day
  - Gold: Unlimited downloads
- **Backend Authorization Flow:** `POST /download/authorize/:videoId` validates permissions, verifies remaining quota, and issues a cryptographically signed one-time download token.
- **Secure File Delivery:** Streams video chunk-by-chunk through `GET /download/file/:token`, updating download records upon completion.
- **Downloads Center (`/downloads`):**
  - Quota visualizer ring and countdown until midnight IST daily reset.
  - Offline video library with built-in player.
  - Quota upgrade prompts for users on lower tiers.

---

### 7. Channel Page Video Deletion & Creator Management
- **Creator Studio Tools (`/channel/:id`):** Channel owners can toggle **"Manage Videos"** to delete any uploaded video with a confirmation modal (`Dialog`).
- **Disk & Database Cleanup:** The backend (`DELETE /video/delete/:id`) removes the MongoDB document and unlinks stored files and thumbnails from disk.
- **Watch Page Deletion:** Channel owners can also delete videos directly from the video watch page action bar.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (Pages Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Radix UI, Sonner Toasts.
- **Backend:** Node.js, Express, MongoDB Atlas, Mongoose, Socket.io, JWT, Multer, Razorpay SDK, Nodemailer.
- **Infrastructure:** Render Web Services (separate decoupled Frontend and Backend services with automated GitHub deployment).

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 20+
- MongoDB instance (local or MongoDB Atlas connection string)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Amin-77777/you_tube2.0.git
cd you_tube2.0
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB Atlas DB_URL
node index.js
```
The backend server will run on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd ../yourtube
npm install
cp .env.example .env.local
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Evaluator Testing Checklist

- [x] **Video Streaming & Custom Player**: Open any video on the home page. Test Play/Pause, 10s seek, speed menu, captions toggle, theater mode (`T`), and keyboard shortcuts.
- [x] **Video Deletion**: Navigate to your channel page (`/channel/:id`) as an owner or click "Manage Videos" to delete uploaded videos.
- [x] **Multilingual Comments**: Post comments with emojis or Indian languages. Click "Translate" to translate inline. Test nested replies, @mentions, and reactions.
- [x] **Admin Moderation**: Visit [`/admin/moderation`](https://youtube-frontend-dc7c.onrender.com/admin/moderation). Click "Auto-Fill" to supply key `yourtube_admin_secret_key_2026` and view reported comments.
- [x] **Subscriptions & Razorpay**: Visit [`/subscriptions`](https://youtube-frontend-dc7c.onrender.com/subscriptions). Select any plan (Bronze, Silver, Gold) to open the Razorpay test checkout. View active plan on [`/subscription/dashboard`](https://youtube-frontend-dc7c.onrender.com/subscription/dashboard).
- [x] **Time-Based Theme & Security**: Visit [`/security`](https://youtube-frontend-dc7c.onrender.com/security) to view theme mode (IST Auto, Light, Dark), trusted devices, and login activity map.
- [x] **Video Meeting**: Visit [`/video-call`](https://youtube-frontend-dc7c.onrender.com/video-call). Create a room, share the code, and join from two devices to test WebRTC audio/video and in-call chat.
- [x] **Controlled Downloads**: Visit [`/downloads`](https://youtube-frontend-dc7c.onrender.com/downloads) to inspect daily quota tracking, offline playback, and download history.
