# Real-Time Video Calling Feature: Requirements

## 1. Overview

The platform shall include a real-time video calling feature that lets users communicate securely through high-quality audio and video. Users can create or join one-to-one and group calls using a unique meeting link or room ID.

## 2. Call Creation and Joining

- Create an instant meeting and receive a unique meeting link and room ID.
- Join a call by opening the link or entering the room ID.
- Support one-to-one and group calls.
- Pre-join screen to preview camera, test microphone, and set display name.
- Optional waiting room where the host admits participants.

## 3. In-Call Controls

| Control | Description |
|---|---|
| Mute / unmute | Toggle the microphone |
| Camera on / off | Enable or disable video |
| Switch camera | Toggle front and rear cameras on mobile |
| Screen share | Share full screen, window, or tab |
| Leave / end call | Participants leave; the host can end for all |
| Participant list | View everyone in the meeting with status |
| Raise hand | Signal the host or participants |
| In-call chat | Messages, emojis, and file sharing |

## 4. Real-Time Indicators

- Participant display names.
- Speaking (active speaker) indicator.
- Microphone and camera status per participant.
- Connection quality indicator (good, fair, poor).
- Live call duration timer.

## 5. In-Call Chat

- Text messaging visible to all participants, with optional private messages.
- Emoji picker and reactions.
- File sharing with size and type limits.
- Chat history retained for the duration of the call.

## 6. Host Moderation Controls

- Mute individual participants or mute all.
- Remove participants from the meeting.
- Lock the meeting to prevent new participants from joining.
- Assign or revoke co-host privileges.
- Manage participant permissions for screen sharing and chat.
- Admit or deny participants from the waiting room.

## 7. Call Recording (Optional)

- Host or co-host can start and stop recording.
- All participants are notified visibly when recording begins.
- Recordings are stored securely and accessible to the host after the call.
- Recording can be disabled at the workspace or meeting level.

## 8. Security and Privacy

- End-to-end or transport-level encryption of audio, video, and data (DTLS-SRTP for WebRTC).
- Unpredictable, hard-to-guess room IDs and links.
- Optional meeting passcode.
- Authenticated access for hosts; guest access configurable.
- Permission prompts for camera, microphone, and screen capture.

## 9. Non-Functional Requirements

- **Latency:** target under 300 ms end-to-end for audio and video.
- **Quality:** adaptive bitrate and resolution based on network conditions.
- **Scalability:** support group calls with a configurable participant cap (for example 50), using an SFU architecture for larger groups.
- **Compatibility:** modern browsers (Chrome, Firefox, Safari, Edge) and iOS and Android devices.
- **Accessibility:** keyboard shortcuts, screen-reader labels, and high-contrast support.
- **Reliability:** automatic reconnection after brief network drops.

## 10. Suggested Technical Approach

- **Media transport:** WebRTC.
- **Signaling:** WebSocket server (for example Socket.IO).
- **Media server:** SFU such as mediasoup, LiveKit, or Janus for group calls; peer-to-peer for one-to-one.
- **NAT traversal:** STUN and TURN servers.
- **Storage:** object storage for recordings and shared files.
- **Frontend:** React (web) and React Native or native apps (mobile).

## 11. Acceptance Criteria

1. A user can create a meeting and share a working link or room ID.
2. Two or more users can join and see and hear each other.
3. All in-call controls function as described.
4. Host moderation actions take effect immediately for all participants.
5. Indicators (speaking, mic/camera status, quality, duration) update in real time.
6. Recording, when enabled, notifies participants and produces a playable file.
