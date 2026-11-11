# TASK: Develop an Advanced Multilingual Commenting and Moderation System

Act as a senior full-stack developer and software architect. Implement a complete, production-ready, advanced multilingual commenting system in the existing application.

Before making any changes, carefully analyze the existing project structure, frontend framework, backend architecture, database schema, authentication system, API endpoints, and UI design. Integrate the commenting system into the existing application without breaking or modifying unrelated features.

Do not create a separate demo application. Implement everything directly into the existing project.

## 1. Advanced Commenting System

Develop a fully functional commenting system with the following capabilities:

- Allow authenticated users to post comments in multiple languages.
- Support Unicode characters, regional languages, emojis, and special characters.
- Display comments dynamically without requiring a page refresh.
- Support multiline comments.
- Implement threaded replies with appropriate indentation.
- Support @username mentions.
- Provide user suggestions when typing @.
- Notify mentioned users.
- Allow users to like and dislike comments.
- Prevent users from liking or disliking the same comment multiple times.
- Allow users to change their reaction.
- Display total likes and dislikes.
- Do not automatically delete comments based on dislikes.

## 2. Comment Information Display

Every comment must display:

- User profile picture.
- Username.
- User location (only when available and permitted by privacy settings).
- Comment text.
- Posted date and time.
- Edited status when modified.
- Like count.
- Dislike count.
- Reply count.
- Translate button.
- Report option.
- Three-dot menu for available actions.

Use relative timestamps such as:
- Just now
- 5 minutes ago
- 2 hours ago
- Yesterday
- 10 November 2026

Allow users to view the exact date and time when needed.

## 3. Multilingual Translation System

Implement an integrated translation feature.

Requirements:

- Add a Translate button below every comment.
- Automatically detect the original comment language.
- Translate comments into the user's preferred language.
- Allow users to change their preferred language through account settings.
- Support major Indian languages, including:
  - English
  - Hindi
  - Kannada
  - Tamil
  - Telugu
  - Malayalam
  - Bengali
  - Marathi
  - Gujarati
  - Punjabi
  - Urdu
- Support additional languages wherever the translation provider allows.
- Display translated content below the original comment.
- Provide a Show Original option.
- Cache translated comments to reduce unnecessary API requests.
- Do not overwrite the original comment during translation.
- Handle translation API failures gracefully.
- Display a Retry Translation option when translation fails.

Use a suitable translation API or provider. Keep API credentials in environment variables. Never expose secret keys in frontend code.

## 4. Comment Editing and Deletion

Implement comment ownership and modification controls.

Requirements:

- Users can edit only their own comments.
- Users can delete only their own comments.
- Allow editing within a configurable time limit (default: 15 minutes).
- Display an Edited label after modification.
- Maintain the original comment and edit history in the database.
- Provide confirmation before deletion.
- Use soft deletion wherever appropriate.
- Prevent unauthorized users from modifying comments.
- Maintain audit logs of edits and deletions.

For comments with existing replies:
- Deleting the parent comment should not automatically delete its replies.
- Display a placeholder such as "This comment has been deleted."
- Preserve the reply hierarchy.

## 5. Comment Sorting and Filtering

Provide the following sorting options:

1. Newest First
2. Oldest First
3. Most Liked
4. Most Disliked
5. Most Relevant

Implement efficient database queries and pagination or infinite scrolling.

Ensure sorting works correctly with threaded replies.

## 6. Advanced Spam and Abuse Detection

Develop a multilayer comment protection system.

Automatically identify and block:

- Abusive and profane words.
- Harassment and hate speech.
- Repeated spam messages.
- Duplicate comments.
- Excessive special characters.
- Repeated emoji-only comments.
- Malicious URLs.
- Phishing links.
- Suspicious promotional links.
- Excessive consecutive posting.
- Flooding and automated bot activity.

Implement the following security mechanisms:

### A. Profanity Filter
- Maintain a configurable multilingual profanity dictionary.
- Detect abusive words across supported languages.
- Handle common spelling variations and character substitutions.
- Avoid blocking legitimate words through simple substring matching.

### B. Duplicate Comment Detection
- Detect identical comments from the same user.
- Normalize text before duplicate detection.
- Identify repeated messages within a configurable time window.
- Provide a meaningful error message.

### C. Rate Limiting
Implement configurable limits, such as:
- Maximum 5 comments within 60 seconds.
- Maximum 3 replies within 30 seconds.
- Additional restrictions for suspicious accounts.

These values should be configurable rather than hardcoded.

### D. CAPTCHA
- Trigger CAPTCHA after repeated posting attempts or suspicious activity.
- Validate CAPTCHA on the backend.
- Avoid requesting CAPTCHA for every normal comment.

### E. Malicious Link Detection
- Validate submitted URLs.
- Block known malicious domains using an appropriate security provider or maintained blocklist.
- Prevent dangerous HTML and JavaScript injection.
- Sanitize all user-generated content.
- Do not render arbitrary HTML submitted through comments.

When a comment violates community guidelines, display an appropriate explanation to the user.

## 7. Comment Reporting System

Implement a dedicated reporting mechanism.

Users should be able to report comments using predefined reasons:

- Spam
- Harassment
- Offensive Content
- Hate Speech
- Threats
- Misleading Information
- Malicious Links
- Other

Requirements:

- Display a Report option for every comment.
- Open a report dialog when selected.
- Allow the user to select a predefined reason.
- Provide an optional description.
- Prevent duplicate reports from the same user for the same comment.
- Record report date and time.
- Store the reporting user's ID.
- Store the reported comment ID.
- Maintain report status.

Report statuses:
- Pending
- Under Review
- Resolved
- Dismissed

IMPORTANT:
A comment must not be automatically deleted or hidden simply because it receives multiple dislikes or reports.

Reports should flag comments for administrator review.

Implement automatic hiding only when a clearly defined high-risk security or moderation rule requires it, and preserve the original content and moderation record.

## 8. Administrator Moderation Dashboard

Create a dedicated admin moderation interface.

Administrators should be able to:

- View all comments.
- View reported comments.
- Filter comments by report reason.
- Filter by user.
- Filter by date.
- View report history.
- View comment edit history.
- View moderation history.
- Review flagged comments.
- Approve comments.
- Remove comments that violate guidelines.
- Restore incorrectly removed comments.
- Suspend commenting privileges for users when necessary.
- Add moderation notes.
- Resolve or dismiss reports.

Every administrative action must be recorded with:

- Administrator ID.
- Action performed.
- Comment ID.
- Previous status.
- New status.
- Timestamp.
- Moderation reason.

Only authorized administrators should access these features.

## 9. Notification System

Integrate notifications for:

- Replies to comments.
- Likes on comments.
- Mentions using @username.
- Report-related administrative actions where appropriate.

Requirements:
- Display unread notification count.
- Provide a notification dropdown.
- Allow users to mark notifications as read.
- Avoid duplicate notifications.
- Respect user notification preferences.

## 10. Database Architecture

Design an efficient and scalable database structure.

Create or update the following collections/tables as appropriate:

1. Users
2. Comments
3. CommentReactions
4. CommentReports
5. CommentEditHistory
6. CommentModerationLogs
7. CommentTranslations
8. CommentMentions
9. Notifications

Each comment should include:

- _id
- userId
- parentCommentId
- videoId or relevant contentId
- originalText
- detectedLanguage
- createdAt
- updatedAt
- isEdited
- isDeleted
- deletion metadata
- moderationStatus
- likesCount
- dislikesCount
- repliesCount

Create appropriate database indexes for:
- Content ID.
- User ID.
- Parent comment ID.
- Creation date.
- Moderation status.
- Report status.
- Duplicate detection.

Use transactions or appropriate consistency mechanisms for operations involving multiple collections.

## 11. Backend API Development

Create secure REST APIs for:

### Comments
- POST /api/comments
- GET /api/comments/:contentId
- PUT /api/comments/:commentId
- DELETE /api/comments/:commentId
- GET /api/comments/:commentId/replies

### Reactions
- POST /api/comments/:commentId/reaction
- DELETE /api/comments/:commentId/reaction

### Translation
- POST /api/comments/:commentId/translate

### Reports
- POST /api/comments/:commentId/report
- GET /api/admin/comment-reports

### Moderation
- GET /api/admin/comments
- PUT /api/admin/comments/:commentId/moderate
- GET /api/admin/comments/:commentId/history

### Notifications
- GET /api/notifications
- PUT /api/notifications/:notificationId/read

Modify endpoint naming if necessary to match the existing application's conventions.

Every API must include:
- Authentication validation.
- Authorization checks.
- Request validation.
- Error handling.
- Rate limiting where appropriate.
- Secure database operations.

## 12. Frontend UI/UX Requirements

Create a modern, responsive commenting interface consistent with the existing application's design.

The interface should include:

- Comment input box.
- User profile image.
- Post Comment button.
- Character counter.
- Comment list.
- Like/dislike buttons.
- Reply button.
- Translate button.
- Report button.
- Sorting dropdown.
- Load More functionality.
- Edited indicator.
- Relative timestamps.
- Three-dot action menu.

Ensure:
- Mobile responsiveness.
- Desktop compatibility.
- Proper loading indicators.
- Empty comment state.
- Error messages.
- Success notifications.
- Confirmation dialogs.
- Accessible buttons and controls.

Do not redesign the entire application. Follow the existing design system, colors, fonts, spacing, and component structure.

## 13. Important Edge Cases

The implementation must correctly handle:

1. Duplicate reports from the same user.
2. Multiple users reporting the same comment.
3. Deleted parent comments with existing replies.
4. Deleted users whose comments still exist.
5. Translation API failure.
6. Unsupported languages.
7. Simultaneous comment edits.
8. Unauthorized comment modification.
9. Duplicate comment submissions caused by repeated clicks.
10. Network interruptions during comment submission.
11. Invalid or malicious URLs.
12. Very long comments.
13. Unicode and multilingual text.
14. Emoji-only comments.
15. Repeated special characters.
16. Rapid comment flooding.
17. User account suspension.
18. Comments receiving multiple reports.
19. Admin restoration of removed comments.
20. Concurrent likes and dislikes.

For simultaneous edits, implement optimistic concurrency control using a version field or equivalent mechanism. Do not silently overwrite another user's changes.

## 14. Security Requirements

Follow secure development practices:

- Validate and sanitize all inputs.
- Prevent XSS attacks.
- Prevent NoSQL injection.
- Protect APIs against unauthorized access.
- Implement secure authentication and authorization.
- Keep API keys in environment variables.
- Avoid exposing sensitive user information.
- Apply appropriate CORS policies.
- Protect admin endpoints.
- Implement request size limits.
- Log suspicious activities.
- Ensure users cannot manipulate reaction counts or moderation status through frontend requests.

## 15. Performance and Scalability

- Use pagination instead of loading every comment.
- Optimize database queries.
- Add necessary indexes.
- Cache translation results.
- Avoid unnecessary API requests.
- Use efficient aggregation for reaction counts.
- Prevent duplicate database writes.
- Support concurrent users.
- Use background processing for expensive moderation and translation tasks where appropriate.

## 16. Testing Requirements

Test the complete system.

Include:

- Comment creation.
- Comment editing.
- Comment deletion.
- Nested replies.
- Likes and dislikes.
- Language detection.
- Translation.
- Duplicate detection.
- Profanity detection.
- Spam prevention.
- CAPTCHA triggering.
- Reporting.
- Admin moderation.
- Notification delivery.
- Rate limiting.
- Concurrent editing.
- Mobile responsiveness.
- Unauthorized access attempts.

Fix all discovered issues before considering implementation complete.

## 17. Implementation Instructions

Follow this implementation sequence:

PHASE 1: Analyze the existing project and identify integration points.

PHASE 2: Design the database schemas and relationships.

PHASE 3: Implement backend APIs and business logic.

PHASE 4: Implement multilingual translation.

PHASE 5: Implement spam detection and security mechanisms.

PHASE 6: Implement reporting and administrator moderation.

PHASE 7: Build the frontend commenting interface.

PHASE 8: Integrate notifications.

PHASE 9: Perform testing and fix bugs.

PHASE 10: Update documentation and environment configuration.

## 18. Final Deliverables

After completing the implementation, provide:

1. Complete working commenting system.
2. Updated frontend components.
3. Backend controllers and routes.
4. Database schemas and indexes.
5. Translation integration.
6. Spam detection and moderation services.
7. Admin moderation dashboard.
8. Notification integration.
9. Required environment variables in .env.example.
10. API documentation.
11. Testing results.
12. Setup and deployment instructions.

IMPORTANT FINAL INSTRUCTIONS:

- Do not generate placeholder functionality.
- Do not leave buttons non-functional.
- Do not use mock data in the final implementation.
- Do not break existing authentication, video playback, subscriptions, or other application features.
- Reuse existing user authentication and database connections.
- Do not duplicate existing components unnecessarily.
- Maintain clean, modular, reusable code.
- If an external API or service requires credentials, clearly identify it and provide setup instructions.
- Do not claim a feature is complete until it has been implemented and tested.
- If a requirement cannot be implemented because an external service or credential is unavailable, explain the limitation and implement the appropriate integration point.

The final result must be a secure, scalable, fully functional, production-ready multilingual commenting and community moderation system integrated into the existing application.

### Important recommendation before running this prompt

Since your platform already has a backend, authentication, video features and a MongoDB database, I recommend giving your AI coding agent these additional instructions:

1. **Analyze first:** Make it inspect the existing code before modifying anything.
2. **Implement phase by phase:** Avoid asking it to generate everything in one operation.
3. **Preserve existing features:** Especially authentication, video playback, subscriptions and notifications.
4. **Test each phase:** Verify backend APIs before connecting the frontend.

**One important technical recommendation:** Use optimistic concurrency control for simultaneous edits, server-side rate limiting for spam prevention, and a proper translation API rather than relying on browser-based translation.

This approach will help you integrate the commenting system without unnecessarily disturbing your existing YouTube 2.0 project.
