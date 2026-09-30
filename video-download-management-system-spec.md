# CONTROLLED VIDEO DOWNLOAD MANAGEMENT SYSTEM

I want you to implement a complete, production-ready Video Download Management System in my existing web application.

IMPORTANT:
- First inspect the entire existing project structure before modifying anything.
- Do NOT create random files or replace existing architecture.
- Do NOT overwrite or break existing functionality.
- Reuse the existing authentication, user model, subscription system, video model, database, API structure, UI components, styling, storage system, and routing wherever possible.
- If a download system, subscription system, quota system, or related functionality already exists, improve and integrate it instead of creating a duplicate implementation.
- Before making changes, explain briefly:
  1. What already exists.
  2. What needs to be added/modified.
  3. Which files will be changed.
  4. Any dependencies or infrastructure required.
- Before modifying an existing file, inspect its current contents.
- Keep the application runnable after each major implementation step.
- Do not claim that a feature works until it has actually been implemented and tested.
- Never delete existing functionality unless explicitly required.
- Follow the existing project's coding style and architecture.

==================================================
1. FIRST: INSPECT THE EXISTING PROJECT
==================================================

Before writing code, identify:

FRONTEND:
- Framework
- Routing
- Component structure
- State management
- Existing profile/account pages
- Existing video pages/player
- Existing subscription UI
- Existing Downloads page, if any
- Existing authentication flow
- Existing API client/service structure
- Existing styling/UI framework

BACKEND:
- Framework
- API architecture
- Authentication middleware
- Authorization middleware
- Existing subscription APIs
- Existing video APIs
- Existing download APIs
- Existing file/storage system
- Existing rate limiting
- Existing validation
- Existing logging

DATABASE:
- Database type
- ORM/ODM
- User model
- Subscription model
- Video model
- Existing download-related models
- Existing payment/subscription records
- Existing device/session models

INFRASTRUCTURE:
- Video storage location
- CDN/storage provider if any
- Object storage if any
- Environment variables
- Deployment environment
- Existing background jobs/cron jobs
- Existing caching/Redis if any

Do not assume the technology stack.

==================================================
2. SHOW THE PROPOSED ARCHITECTURE
==================================================

After inspection, provide a concise implementation plan.

Clearly identify:

- Files to create
- Files to modify
- Database changes
- API endpoints
- Frontend pages/components
- Middleware
- Subscription/quota logic
- Download authorization flow
- Storage/download architecture
- Security mechanisms
- Testing strategy

Then implement the system step by step.

==================================================
3. SUBSCRIPTION-BASED DOWNLOAD LIMITS
==================================================

Implement controlled download limits based on the user's subscription plan.

Plans:

- Free
- Bronze
- Silver
- Gold

IMPORTANT:
Do NOT invent arbitrary download limits for Bronze, Silver, and Gold if the existing application already defines them.

First inspect the existing subscription configuration/database.

If limits are not defined anywhere, create a centralized configuration such as:

FREE_DOWNLOAD_LIMIT
BRONZE_DOWNLOAD_LIMIT
SILVER_DOWNLOAD_LIMIT
GOLD_DOWNLOAD_LIMIT

Do not hardcode plan limits throughout the application.

The system must support:

- Free users: maximum 1 video download per day.
- Bronze users: higher download limit according to the configured plan.
- Silver users: higher download limit according to the configured plan.
- Gold users: higher download limit according to the configured plan.

The architecture must make the limits configurable without changing business logic.

==================================================
4. DOWNLOAD AUTHORIZATION FLOW
==================================================

EVERY download request must be authorized by the backend.

Never trust:

- Client-side subscription status
- Client-side quota counters
- Client-side user role
- Client-provided remaining quota
- Client-provided download permissions

Before starting a download, the backend must verify:

1. User is authenticated.
2. User exists and is active.
3. User has a valid subscription if required.
4. Subscription has not expired.
5. Subscription plan allows downloads.
6. Video exists.
7. Video is accessible to the user.
8. Video is downloadable.
9. User has remaining quota.
10. User/device is authorized if device restrictions are enabled.
11. Request is not a duplicate download that should be excluded from quota calculation.
12. User is not exceeding rate limits.
13. Download request is valid.

Only after all checks pass should the download be authorized.

==================================================
5. DOWNLOAD QUOTA SYSTEM
==================================================

Implement a reliable quota system.

The system must support:

- Daily quotas
- Monthly quotas if required by the subscription configuration
- Quota reset
- Remaining quota calculation
- Used quota calculation
- Download history
- Failed download handling

Do NOT rely only on frontend counters.

Quota calculations must happen on the server.

Example:

User quota:
10 downloads/day

Used:
7

Remaining:
3

The API should return accurate values such as:

{
  "limit": 10,
  "used": 7,
  "remaining": 3,
  "resetAt": "..."
}

The frontend must display these values but must never be trusted as the source of truth.

==================================================
6. PREVENT DUPLICATE DOWNLOAD ABUSE
==================================================

Prevent users from repeatedly downloading the same video to artificially consume or abuse the system.

Implement a configurable duplicate-download policy.

For example:

- If the same user downloads the same video repeatedly within a defined time window, do not count duplicate requests as separate quota usage.
- Repeated refresh requests must not create multiple download records.
- Repeated clicks on the download button must not trigger unlimited downloads.
- Multiple simultaneous requests must be handled safely.

Make the duplicate window configurable.

Do not simply disable the download button on the frontend.

The backend must enforce this.

==================================================
7. CONCURRENCY / RACE CONDITIONS
==================================================

This is extremely important.

Handle situations such as:

- User opens multiple browser tabs.
- User clicks Download multiple times.
- User starts downloads from multiple devices simultaneously.
- Multiple download API requests arrive at almost the same time.

Prevent quota bypass caused by race conditions.

Use appropriate database mechanisms such as:

- Transactions
- Atomic updates
- Row/document locking where supported
- Unique constraints
- Idempotency keys
- Atomic quota reservation

Do not implement a simple:

"check quota -> download -> increment counter"

flow if it can be bypassed by concurrent requests.

The quota reservation/consumption mechanism must be concurrency-safe.

==================================================
8. DOWNLOAD RECORD / AUDIT SYSTEM
==================================================

Create a complete download record in the database.

Each download record should contain, where available:

- Download ID
- User ID
- Video ID
- Subscription ID
- Subscription plan
- Download timestamp
- Download status
- File size
- IP address
- Device information
- Browser
- Operating system
- User agent
- Device ID if device registration is enabled
- Download start time
- Download completion time
- Failure reason if applicable
- Quota consumed
- Duplicate download indicator
- Download history/reference
- Created timestamp
- Updated timestamp

Do not store sensitive information unnecessarily.

Follow the existing project's privacy/security architecture.

==================================================
9. DOWNLOAD STATUS
==================================================

Support meaningful download states such as:

- AUTHORIZED
- STARTED
- IN_PROGRESS
- COMPLETED
- FAILED
- CANCELLED
- EXPIRED

Choose terminology consistent with the existing project.

The system must distinguish between:

A. Download authorization
B. Download actually starting
C. Download completing
D. Download failing

Do not mark a download as completed simply because the authorization endpoint was called.

==================================================
10. INTERRUPTED / FAILED DOWNLOADS
==================================================

Handle:

- Browser closed during download
- Network disconnected
- Download interrupted
- Server error
- Storage error
- Video unavailable
- Partial download
- Request timeout
- User cancels download
- Device goes offline

Define clearly when quota is:

- Reserved
- Consumed
- Released

Do not permanently consume quota for a request that failed before the download actually started unless the business rules require it.

Make the behavior consistent and concurrency-safe.

==================================================
11. DOWNLOAD API
==================================================

Create or extend appropriate backend endpoints.

Possible architecture:

POST /api/videos/:videoId/download/authorize

GET /api/videos/:videoId/download

GET /api/downloads

GET /api/downloads/:downloadId

GET /api/downloads/quota

Use the project's existing routing conventions instead of blindly using these exact URLs.

The authorization endpoint should return information such as:

- authorized
- download ID
- secure download URL/token if applicable
- expiration time
- quota information
- file metadata

Never expose permanent unrestricted video storage URLs if that would allow users to bypass authorization.

==================================================
12. SECURE DOWNLOAD URLs
==================================================

If the project uses cloud/object storage/CDN:

Use short-lived signed URLs or equivalent secure mechanisms.

Requirements:

- URL should expire.
- URL should not expose permanent credentials.
- URL should not bypass subscription authorization.
- Authorization should happen before generating the URL.
- Do not expose storage credentials to the frontend.

If the current architecture does not support secure signed URLs, explain what infrastructure is required and implement the safest supported approach.

==================================================
13. VIDEO ACCESSIBILITY
==================================================

Before download, verify:

- Video exists.
- Video is published/available.
- User is allowed to view it.
- Subscription allows access to the video.
- Video is marked downloadable.
- Video has a valid downloadable file/source.
- Video has not been removed.
- User has not lost access due to subscription expiry.

Do not allow users to download videos they cannot normally access.

==================================================
14. SUBSCRIPTION EXPIRY
==================================================

When a subscription expires:

- Prevent new downloads requiring that subscription.
- Recalculate permissions from the current subscription state.
- Do not trust old frontend subscription information.
- Existing completed downloads should remain visible in download history unless the existing business rules require otherwise.
- Handle subscription upgrades/downgrades correctly.

If a user upgrades during the day, calculate the quota according to the project's intended subscription rules.

Do not accidentally reset or duplicate quota when a subscription changes.

==================================================
15. FREE USER RESTRICTIONS
==================================================

Free users must not be able to bypass the one-download-per-day limit through:

- Multiple browser tabs
- Multiple devices
- Incognito/private browsing
- Refreshing the page
- Changing client-side values
- Repeated API requests
- Manipulating request parameters
- Directly calling download URLs

The backend must enforce the restriction.

==================================================
16. DEVICE RESTRICTIONS
==================================================

If the application already supports registered devices, integrate with it.

If device restrictions are required but not implemented:

- Design the system so registered-device restrictions can be enabled.
- Do not collect unnecessary fingerprinting data.
- Use a secure device/session identifier where appropriate.
- Clearly document how devices are registered and validated.

Do not rely solely on browser fingerprinting for security.

==================================================
17. DOWNLOADS PROFILE SECTION
==================================================

Create a dedicated Downloads section inside the user's profile/account area.

It should display:

- Video thumbnail
- Video title
- Download date
- Download time
- Download status
- File size
- Subscription plan used
- Download quota used
- Remaining quota
- Download ID where useful
- Retry option for failed downloads where appropriate

Example:

--------------------------------------------------
Downloads
--------------------------------------------------

Daily quota: 3 / 5 used
Remaining: 2
Resets: Tomorrow at 12:00 AM

[Thumbnail]

Video Title
Downloaded: 21 Sep 2026, 8:42 PM
Size: 245 MB
Plan: Silver
Status: Completed

[Download Again]
--------------------------------------------------

Use the application's existing design system.

Do not unnecessarily redesign the profile page.

==================================================
18. DOWNLOAD HISTORY
==================================================

Provide a paginated download history.

Support:

- Pagination
- Search if appropriate
- Filtering by status
- Filtering by date
- Sorting by newest/oldest
- Video information
- Subscription plan
- Download status

Do not load thousands of records at once.

Use backend pagination.

==================================================
19. QUOTA DISPLAY
==================================================

Show users:

- Current subscription
- Daily limit
- Daily usage
- Remaining daily quota
- Monthly limit if applicable
- Monthly usage
- Remaining monthly quota
- Next quota reset time

Make the UI clear and understandable.

Do not expose internal security information.

==================================================
20. QUOTA RESET
==================================================

Implement reliable quota reset behavior.

Daily quota should reset at the appropriate start of the new day.

Do NOT rely solely on a frontend timer.

Prefer calculating quota from timestamps/date boundaries or a reliable backend mechanism.

Handle:

- Time zones
- Server timezone
- User timezone if the product requires it
- Daylight saving changes if relevant
- Month transitions
- Subscription changes

Define the timezone behavior clearly.

==================================================
21. RATE LIMITING
==================================================

Protect download-related APIs against abuse.

Implement appropriate rate limits for:

- Download authorization
- Download URL generation
- Download history requests
- Retry requests

Do not make rate limits so aggressive that legitimate downloads fail.

Reuse the existing rate-limiting infrastructure if available.

==================================================
22. SECURITY
==================================================

Implement server-side security.

Requirements:

- Authentication required.
- Authorization required.
- Validate user ownership/access.
- Validate video access.
- Validate subscription.
- Validate quota.
- Validate device if applicable.
- Validate download token.
- Short-lived download URLs.
- Prevent URL reuse after expiration where possible.
- Prevent unauthorized access to other users' download history.
- Prevent IDOR vulnerabilities.
- Validate all request parameters.
- Sanitize user-controlled data.
- Do not expose sensitive database information.
- Do not expose storage credentials.
- Protect download APIs against abuse.
- Use HTTPS/WSS-compatible architecture.
- Follow existing security middleware.

Never trust user-provided:

- userId
- subscriptionPlan
- quota
- role
- download permission
- device authorization

Determine these from authenticated server-side data.

==================================================
23. FILE SIZE / DOWNLOAD VALIDATION
==================================================

Before authorization:

- Confirm file exists.
- Confirm file size.
- Confirm file type.
- Confirm file is available.
- Validate storage metadata.

If the application has restrictions on downloadable file types/sizes, enforce them.

==================================================
24. FRONTEND DOWNLOAD FLOW
==================================================

Implement a clean user flow:

1. User clicks Download.
2. Frontend requests authorization.
3. Backend verifies authentication.
4. Backend verifies subscription.
5. Backend verifies video access.
6. Backend verifies quota.
7. Backend reserves/authorizes quota safely.
8. Backend generates secure download access.
9. Frontend starts download.
10. Backend records download status.
11. Completion/failure is handled.
12. Downloads page updates.
13. Remaining quota updates.

Show clear messages such as:

"Download started."

"No downloads remaining today."

"Your subscription has expired."

"This video is not available for download."

"Your download could not be completed. Please try again."

==================================================
25. IDEMPOTENCY
==================================================

Implement idempotency for download authorization.

Repeated requests caused by:

- Double clicking
- Page refresh
- Network retry
- Browser retry

must not accidentally consume multiple quotas.

Use an appropriate idempotency mechanism.

==================================================
26. BACKEND VALIDATION
==================================================

All important download rules must be enforced on the backend.

Frontend validation is only for user experience.

The backend remains the source of truth.

==================================================
27. ADMIN / AUDIT SUPPORT
==================================================

If the application already has an admin dashboard, integrate download monitoring.

Allow administrators to inspect:

- User
- Video
- Subscription plan
- Download date
- Download status
- IP
- Device
- Browser
- File size
- Failure reason
- Quota usage

Do not expose sensitive data to unauthorized administrators.

If there is no admin dashboard, create backend APIs/models that make future integration possible without unnecessarily building a complete admin panel.

==================================================
28. DATABASE DESIGN
==================================================

Design an appropriate Download model/table/collection.

Example conceptual structure:

Download
---------
id
userId
videoId
subscriptionId
subscriptionPlan
status
fileSize
ipAddress
userAgent
deviceInfo
deviceId
quotaConsumed
isDuplicate
startedAt
completedAt
failedAt
failureReason
createdAt
updatedAt

Adapt this to the existing database technology and conventions.

Add indexes for commonly queried fields such as:

- userId
- videoId
- createdAt
- status
- subscriptionId
- userId + videoId
- quota-related queries

Avoid unnecessary indexes.

==================================================
29. TRANSACTIONS / DATA CONSISTENCY
==================================================

Where supported, use transactions for:

- Download authorization
- Quota reservation
- Download record creation
- Duplicate detection
- Quota consumption

Ensure the database cannot end up in an inconsistent state such as:

quota says 5 used
but six download records exist.

==================================================
30. TESTING
==================================================

After implementation, test all of the following:

AUTHENTICATION:
- Logged-out user attempts download
- Logged-in user downloads video

SUBSCRIPTION:
- Free user
- Bronze user
- Silver user
- Gold user
- Expired subscription
- Upgraded subscription
- Downgraded subscription

QUOTA:
- First download
- Last allowed download
- Quota exhausted
- New day quota reset
- Monthly quota if applicable

DUPLICATES:
- Same video downloaded twice
- Repeated refresh
- Double click
- Multiple API requests

CONCURRENCY:
- Two simultaneous downloads
- Multiple tabs
- Multiple devices

VIDEO ACCESS:
- Valid video
- Invalid video
- Restricted video
- Non-downloadable video
- Deleted/unavailable video

DOWNLOAD STATUS:
- Successful download
- Failed download
- Interrupted download
- Cancelled download
- Retry

SECURITY:
- User attempts another user's download
- User modifies userId
- User modifies subscription plan
- User modifies quota
- Expired download URL
- Reused download URL
- Unauthorized API request

DEVICES:
- Registered device
- Unregistered device
- Multiple devices

UI:
- Download button
- Loading state
- Error state
- Quota display
- Downloads page
- Pagination
- Mobile layout

Also test:

- Browser refresh
- Network interruption
- Slow network
- Backend restart
- Multiple concurrent requests

Check browser console and backend logs for errors.

==================================================
31. PERFORMANCE
==================================================

Optimize for:

- Large download history
- Large number of users
- High download traffic
- Concurrent authorization requests
- Efficient database queries
- Pagination
- Caching where appropriate
- Storage/CDN efficiency

Do not load unnecessary download history records.

Do not perform expensive database operations on every frontend render.

==================================================
32. LOGGING AND MONITORING
==================================================

Add useful backend logs for:

- Authorization success
- Authorization failure
- Quota exceeded
- Subscription expired
- Unauthorized access
- Download started
- Download completed
- Download failed
- Duplicate request
- Rate limit violation

Do not log sensitive information unnecessarily.

Never log passwords, authentication tokens, signed URLs, or storage credentials.

==================================================
33. ENVIRONMENT VARIABLES
==================================================

If required, use environment variables for:

- Download limits
- Duplicate download window
- Signed URL expiration
- Storage configuration
- CDN configuration
- Device restrictions
- Rate limits

Show the exact variable names required.

Never ask me to expose secret values.

==================================================
34. IMPLEMENTATION ORDER
==================================================

Follow this exact implementation sequence:

STEP 1:
Inspect existing project architecture.

STEP 2:
Inspect existing authentication, users, subscriptions, videos, storage, and database.

STEP 3:
Show proposed architecture and files.

STEP 4:
Create/modify database models and migrations.

STEP 5:
Implement centralized subscription/download quota configuration.

STEP 6:
Implement backend download authorization.

STEP 7:
Implement concurrency-safe quota reservation and idempotency.

STEP 8:
Implement secure download URL/file delivery.

STEP 9:
Implement download records and audit history.

STEP 10:
Implement failed/interrupted download handling.

STEP 11:
Implement Downloads profile page.

STEP 12:
Implement quota display and download status UI.

STEP 13:
Implement rate limiting and security protections.

STEP 14:
Implement admin/audit APIs if compatible with the existing architecture.

STEP 15:
Run database migrations.

STEP 16:
Run frontend/backend builds.

STEP 17:
Run the complete testing checklist.

STEP 18:
Fix all errors discovered during testing.

STEP 19:
Provide a final implementation summary.

==================================================
35. DEVELOPMENT RULES
==================================================

IMPORTANT:

- Do not replace the project with a new template.
- Do not delete existing functionality.
- Do not create duplicate authentication or subscription systems.
- Do not create duplicate video models.
- Do not create duplicate download components if one already exists.
- Do not trust client-side quota information.
- Do not trust client-provided subscription information.
- Do not expose permanent private video URLs.
- Do not hardcode secrets.
- Do not hardcode subscription limits throughout the codebase.
- Do not bypass existing authentication.
- Do not silently change existing subscription behavior.
- Do not change unrelated parts of the application.
- Keep frontend and backend synchronized.
- Follow existing naming conventions.
- Use reusable components.
- Use proper error handling.
- Use proper database indexes.
- Use transactions/atomic operations where appropriate.
- Add comments only for non-obvious business/security logic.

Before every major change, inspect the existing implementation.

After every major change, run the relevant build/type-check/test command.

Tell me exactly which command I need to run after each major implementation step.

==================================================
36. FINAL REPORT
==================================================

After implementation, provide:

1. Summary of what was implemented.
2. Files created.
3. Files modified.
4. Database changes.
5. API endpoints added/modified.
6. Subscription quota rules.
7. Security measures.
8. Download flow.
9. Environment variables required.
10. Commands to install dependencies.
11. Database migration commands.
12. Testing performed.
13. Any remaining limitations.
14. Any infrastructure still required.

IMPORTANT:

Do not say "implemented" for something that was only planned.

If something cannot be fully implemented because the existing application lacks required infrastructure, clearly explain why and implement everything that can safely be implemented without breaking the existing application.

START NOW:

First inspect my existing project.

Do not start creating files until you understand the current architecture.
