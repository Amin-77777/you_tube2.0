# Fully Customized HTML5 Video Player — Implementation Prompt

## Task: Build a Fully Customized HTML5 Video Player

Implement a **fully customized, modern HTML5 video player** for the platform. Do **not** rely on the browser's default `<video>` controls. The player should provide a professional experience similar to modern video platforms such as YouTube.

### 1. Custom Video Player UI

Create a custom video player with:

- Play / Pause button
- Volume control with a draggable volume slider
- Mute / Unmute
- Current playback time
- Total video duration
- Remaining time
- Playback progress bar
- Buffering progress indicator
- Loading/spinner indicator
- Video quality information/menu
- Playback speed menu
- Subtitles / captions toggle
- Theater mode
- Full-screen mode
- Picture-in-Picture (PiP)
- Previous/Next video controls where applicable
- Autoplay countdown for the next video
- Cancel autoplay button

The UI should be responsive and work properly on desktop, tablet, and mobile.

### 2. Playback Speed

Provide these playback speed options:

- 0.5×
- 1×
- 1.25×
- 1.5×
- 2×

The selected playback speed should immediately apply to the video and remain selected until changed.

### 3. Seeking

Implement:

- 10-second backward seek
- 10-second forward seek
- Click-to-seek on the timeline
- Drag-to-seek on the timeline
- Smooth seeking behavior
- Keyboard-based seeking

The timeline should display both:

- Buffered portion
- Current playback position

### 4. Timeline Hover Preview

Implement a **timeline hover preview system**.

When the user moves the mouse over the progress bar:

- Display a small preview thumbnail/frame.
- Show the corresponding timestamp.
- Update the preview position dynamically as the mouse moves.
- Do not change the actual playback position until the user clicks or drags.
- Hide the preview when the mouse leaves the timeline.

Use an efficient approach so that hover previews do not significantly affect playback performance.

### 5. Remember Watch Position

The player must remember the user's last watched position.

Implement:

- Save playback position periodically.
- Save the position when the user pauses.
- Save the position when the user leaves the page.
- Save the position when the video ends.
- Automatically resume from the saved position when the user returns to the video.
- Provide sensible handling for nearly-completed videos so that the user does not resume from the final few seconds unnecessarily.

Use the platform's existing backend/database if one exists. If the backend watch-history system already exists, integrate with it instead of creating a duplicate system.

### 6. Watch Progress

Track watch progress continuously.

Store:

- Video ID
- User ID
- Current playback position
- Total duration
- Percentage watched
- Last watched timestamp
- Completion status

Update progress periodically without creating excessive API requests.

Make the save interval configurable.

### 7. Video Completion

Implement configurable completion logic.

For example:

```javascript
completionThreshold = 90;
```

When the user reaches the configured percentage:

- Mark the video as completed.
- Update the user's watch history.
- Persist completion status to the backend.
- Prevent unnecessary duplicate completion requests.

Make the completion percentage configurable rather than hardcoding it throughout the application.

### 8. Prevent Multiple Videos From Playing

Only one video should be allowed to play at a time.

If another video starts playing:

- Automatically pause the currently playing video.
- Ensure only one active `<video>` element is playing.
- Use a shared player/video manager or appropriate event-based solution if necessary.

This should work across video components/pages within the application where practical.

### 9. Keyboard Shortcuts

Implement complete desktop keyboard controls.

| Key | Action |
|---|---|
| Space | Play / Pause |
| ← | Seek backward 10 seconds |
| → | Seek forward 10 seconds |
| Shift + ← | Seek backward by a larger interval |
| Shift + → | Seek forward by a larger interval |
| ↑ | Increase volume |
| ↓ | Decrease volume |
| M | Mute / Unmute |
| P | Picture-in-Picture |
| T | Theater mode |
| C | Subtitles / Captions |
| F | Full-screen |
| N | Play next video |

Use configurable seek intervals, for example:

```javascript
normalSeekInterval = 10;
largeSeekInterval = 30;
```

Do not trigger video shortcuts while the user is typing inside:

- `<input>`
- `<textarea>`
- `<select>`
- Content-editable elements

Avoid conflicts with browser/system shortcuts where appropriate.

### 10. Mouse Interactions

Support intuitive mouse interactions:

- Click video → Play/Pause
- Double-click video → Full-screen
- Click timeline → Seek
- Drag timeline → Seek
- Drag volume slider → Adjust volume
- Move mouse → Show controls
- Mouse inactivity → Hide controls
- Hover timeline → Show preview
- Hover controls → Keep controls visible

Controls should smoothly fade out after a few seconds of inactivity during playback.

When the user moves the mouse again, controls should smoothly reappear.

### 11. Theater Mode

Implement a dedicated theater mode.

Theater mode should:

- Expand the player horizontally.
- Keep the surrounding page visible.
- Maintain the correct video aspect ratio.
- Work independently from browser full-screen mode.
- Provide a clear way to exit theater mode.

Do not confuse theater mode with full-screen mode.

### 12. Full-Screen Mode

Implement proper Fullscreen API support.

Requirements:

- Enter full-screen.
- Exit full-screen.
- Detect browser full-screen state.
- Update the UI when the user exits using the browser's Escape key.
- Maintain responsive sizing.
- Preserve playback state when entering/exiting full-screen.

### 13. Picture-in-Picture

Implement browser Picture-in-Picture support where supported.

Requirements:

- PiP button.
- Keyboard shortcut.
- Detect whether PiP is supported.
- Gracefully disable/hide the feature when unsupported.
- Correctly handle entering and exiting PiP.

Do not crash if the browser does not support PiP.

### 14. Subtitles / Captions

Support subtitles/captions using appropriate HTML5 mechanisms such as `<track>`.

Provide:

- Caption toggle
- Available language selection if multiple tracks exist
- Caption on/off state
- Proper handling when no captions are available

Do not display a subtitles button when no subtitle/caption track exists.

### 15. Autoplay Next Video

When the current video finishes:

1. Determine whether another video is available.
2. Display an autoplay countdown.
3. Example:

```text
Next video starts in 5...
```

4. Provide a **Cancel** button.
5. If cancelled, remain on the current video/end screen.
6. If countdown reaches zero, automatically start the next video.
7. Reset the countdown when the user manually selects another video.

Make the countdown duration configurable.

### 16. Loading and Buffering States

Properly handle:

- Initial loading
- Buffering
- Seeking
- Playback errors
- Network interruptions
- Video loading failures

Display an appropriate loading indicator while buffering.

Do not unnecessarily show the loading spinner during normal playback.

Use HTML5 media events such as:

- `loadstart`
- `loadedmetadata`
- `loadeddata`
- `canplay`
- `waiting`
- `playing`
- `timeupdate`
- `progress`
- `seeking`
- `seeked`
- `ended`
- `error`

where appropriate.

### 17. Video Quality

If the existing video system supports multiple qualities, integrate quality selection into the player.

Example:

```text
Auto
1080p
720p
480p
360p
```

If quality switching is not currently supported by the backend/video source, create the UI architecture so it can be integrated later rather than pretending that quality switching works.

### 18. Responsive Design

The player must work correctly on:

- Desktop
- Laptop
- Tablet
- Mobile

Desktop should provide the complete keyboard and mouse experience.

On mobile:

- Use touch-friendly controls.
- Support tap gestures where appropriate.
- Ensure buttons are large enough to interact with.
- Do not depend on hover-only functionality.

### 19. Accessibility

Implement accessibility properly.

Include:

- Accessible button labels
- ARIA labels where appropriate
- Keyboard navigation
- Visible focus states
- Sufficient contrast
- Accessible captions
- Screen-reader-friendly controls

Do not sacrifice accessibility for visual design.

### 20. State Management

Keep player state organized.

At minimum manage:

```javascript
isPlaying
isMuted
volume
currentTime
duration
bufferedTime
playbackRate
isFullscreen
isTheaterMode
isPiP
showControls
isBuffering
isSeeking
captionsEnabled
selectedQuality
watchProgress
isCompleted
autoplayCountdown
```

Avoid unnecessary re-renders and excessive API calls.

### 21. Backend Integration

Before implementing new APIs or database structures:

**Inspect the existing project first.**

Find:

- Existing video model/schema
- User model
- Watch history model
- Video routes/API
- Authentication system
- Existing player/video components
- Existing frontend state management
- Existing API utilities
- Existing database structure

Reuse existing functionality wherever possible.

Do not create duplicate watch-history or video-progress systems if equivalent functionality already exists.

If backend changes are required, implement them consistently with the existing project architecture.

### 22. Error Handling

Handle errors gracefully.

Examples:

- Video unavailable
- Network failure
- Invalid video URL
- Browser does not support PiP
- Fullscreen API unavailable
- Caption track unavailable
- Failed progress update
- Failed watch-history update

The UI should never crash because one optional feature is unavailable.

### 23. Performance

Optimize the implementation.

Avoid:

- Excessive `timeupdate` API calls
- Unnecessary React re-renders
- Repeated database writes
- Memory leaks
- Multiple event listeners
- Multiple active video players
- Expensive thumbnail generation on every mouse movement

Use debouncing/throttling where appropriate.

Clean up event listeners when components unmount.

### 24. UI/UX Design

The player should have a modern professional appearance.

The controls should resemble a polished streaming/video platform rather than a basic HTML `<video>` element.

Use:

- Clean control bar
- Smooth animations
- Proper spacing
- Tooltips for buttons
- Consistent icons
- Responsive layout
- Dark video-player theme
- Clear visual hierarchy

Do not use the browser's default video controls.

### 25. Important Implementation Rules

Before writing code:

1. Inspect the existing project structure.
2. Identify the current video player implementation.
3. Identify how videos are stored and played.
4. Identify the existing watch-history/progress functionality.
5. Identify the frontend framework and state-management approach.
6. Identify the backend/API architecture.
7. Reuse existing components and APIs where possible.
8. Do not unnecessarily rewrite unrelated parts of the application.

Then implement the player incrementally.

### 26. Testing Requirements

After implementation, test:

- Play/Pause
- Volume
- Mute
- Playback speeds
- Seeking
- Timeline dragging
- Timeline hover preview
- Buffering
- Full-screen
- Theater mode
- PiP
- Captions
- Keyboard shortcuts
- Mouse controls
- Autoplay countdown
- Cancel autoplay
- Resume playback
- Periodic watch-progress saving
- Completion threshold
- Multiple-video prevention
- Network/error states
- Mobile responsiveness

Also check browser console errors and fix all errors introduced by the implementation.

### Final Requirement

Do not simply create a visual mockup.

Implement the **fully functional video player and integrate it into the existing platform**.

Preserve existing functionality and styling where possible. Do not break authentication, video loading, subscriptions, watch history, downloads, comments, or other existing features.

At the end, provide:

1. Files/components created or modified
2. Backend/API changes
3. Database changes
4. Keyboard shortcut list
5. Configuration values added
6. Any dependencies installed
7. Testing performed
8. Any remaining limitations or browser-specific restrictions

Most importantly, **inspect the existing codebase first and adapt the implementation to the project's current architecture instead of blindly creating a separate video-player system.**
