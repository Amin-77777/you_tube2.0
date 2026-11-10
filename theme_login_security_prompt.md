# TASK: Implement Automatic Theme Management, Login Activity Tracking, and Advanced Account Security

## 1. Objective

Implement a complete, production-ready theme personalization and account security system in the existing application.

The system must automatically select the appropriate theme based on the user's login time, persist theme preferences across sessions and devices, record detailed login activity, detect suspicious login attempts, require OTP verification for unrecognized login environments, manage trusted devices, and provide a comprehensive account security dashboard.

**Important:** Integrate these features into the existing project without breaking its current authentication system, database structure, UI components, APIs, or existing functionality.

Before making changes, inspect the entire project structure, identify the existing frontend framework, backend framework, authentication mechanism, database models, session management, and UI theme implementation. Reuse existing components and dependencies wherever possible.

Do not create duplicate authentication systems or unnecessary database models.

---

# 2. Automatic Theme Selection Based on Indian Standard Time (IST)

## 2.1 Default Theme Rules

Implement automatic theme selection based on the user's login time in Indian Standard Time (IST, Asia/Kolkata).

Apply the following rules:

- From 5:00 AM IST through 11:59 AM IST: Automatically select the Light Theme.
- From 12:00 PM IST through 4:59 AM IST the following day: Automatically select the Dark Theme.

Use the `Asia/Kolkata` timezone explicitly. Do not depend on the browser's local timezone or the server's timezone.

## 2.2 Theme Selection Logic

When a user logs in successfully:

1. Retrieve the user's saved theme preference.
2. Determine the current time in IST.
3. If the user has never selected a theme manually, choose the default theme according to the time-based rules.
4. If the user has manually selected a theme, preserve their saved preference instead of automatically overriding it on every login.
5. Apply the selected theme immediately after authentication.
6. Save the effective theme preference in the user's profile.
7. Synchronize the theme across supported devices and sessions.

### Theme Preference Values

Support the following theme settings:

- `auto`: Automatically determine the theme based on login time.
- `light`: Always use the light theme.
- `dark`: Always use the dark theme.

When the user selects Light or Dark manually, save the preference to the database.

When the user selects Auto, calculate the appropriate theme at the next successful login.

Provide an account settings option that allows users to switch between Auto, Light, and Dark.

If the user is already logged in and the application supports live theme changes, apply manual changes immediately without requiring another login.

## 2.3 Theme Persistence

Implement theme persistence across:

- Browser refreshes.
- Logout and subsequent login.
- Multiple supported browsers.
- Desktop and mobile devices.
- Different devices using the same account.

The server-side user profile must be the authoritative source for the saved preference.

Use local storage or cookies only as appropriate for immediate rendering and temporary synchronization.

Prevent theme flickering during page loading by applying the saved or calculated theme as early as possible.

Ensure the theme is consistent across the entire application, including dashboards, navigation bars, forms, modals, account settings, video pages, and other existing screens.

---

# 3. Detailed Login Activity Tracking

Create a secure login activity tracking system that records information about every login attempt.

Track both successful and unsuccessful login attempts without storing plaintext passwords, OTP values, authentication tokens, or other secrets.

## 3.1 Required Login Information

For every login attempt, record the following information where available:

### A. Account Information

- User ID.
- Registered account email or mobile number, preferably referenced through the user ID.
- Authentication method.
- Login status: Success, Failed, OTP Required, OTP Failed, or Blocked.
- Failure reason using a safe, predefined reason code.

### B. Network Information

- Public IP address observed by the trusted backend.
- IP address classification where appropriate, such as IPv4 or IPv6.
- Approximate location derived from an approved IP geolocation service.
- City.
- State or region.
- Country.
- Timezone associated with the approximate location, when available.

Do not trust client-submitted IP addresses or location information.

When deployed behind a reverse proxy or hosting platform, configure trusted proxy handling correctly. Do not blindly trust arbitrary `X-Forwarded-For` headers.

If the IP geolocation provider cannot determine a location, save the location as unknown rather than inventing a result.

Clearly distinguish approximate IP-derived locations from precise GPS locations. Do not request GPS access unless a separate, explicit feature requires it.

### C. Browser Information

- Browser name.
- Browser version, when available.
- Browser family.
- User-agent string, subject to an appropriate retention policy.
- Browser fingerprint or identifier, if implemented using a privacy-conscious and secure approach.

Examples:

- Chrome.
- Firefox.
- Microsoft Edge.
- Safari.
- Other or Unknown.

### D. Operating System Information

- Operating system name.
- Operating system version, when available.

Examples:

- Windows.
- macOS.
- Linux.
- Android.
- iOS.

### E. Device Information

- Device type: Desktop, Mobile, Tablet, or Unknown.
- Device model, when available.
- Device name, if explicitly supplied by the user or available through an appropriate mechanism.
- Device identifier or trusted-device identifier.
- Whether the device is trusted.
- Whether the login environment has changed.

Do not claim that browser-based JavaScript can reliably retrieve a physical device's unique hardware identifier. Use an application-generated identifier or a server-managed trusted-device token instead.

### F. Timestamp Information

- Login attempt timestamp in UTC.
- Display timestamp in IST.
- OTP request timestamp.
- OTP verification timestamp.
- Successful authentication timestamp.
- Session creation timestamp.
- Last activity timestamp, if supported.

Store timestamps consistently in UTC and convert them to IST for display.

### G. Security Information

- Whether OTP verification was required.
- Whether OTP verification succeeded.
- Verification method: Email or SMS.
- Trusted-device status.
- Risk indicators.
- Session identifier or session reference.
- Logout timestamp, where available.
- Session revocation status.

Never store raw passwords, raw OTPs, session cookies, access tokens, refresh tokens, or private authentication credentials in login history.

---

# 4. Detect New or Unrecognized Login Environments

Implement a risk-based login verification system.

The system must identify meaningful changes in a user's login environment and require additional verification before granting access.

## 4.1 Conditions Requiring OTP Verification

Require OTP verification when any applicable security condition is detected:

1. Login from a new browser that is not recognized as trusted.
2. Login from a new device.
3. Login from a previously unseen public IP address, subject to the configured risk policy.
4. Login from a different city or state, when reliable location information is available.
5. Login from an environment that differs significantly from the previously trusted environment.
6. Login associated with suspicious activity or an elevated security risk.
7. Login after a security-sensitive event, such as revocation of trusted devices or a password reset, according to the security policy.

A change in browser, IP address, or location must not automatically be treated as proof of account compromise.

IP addresses can change because of mobile networks, VPNs, carrier-grade NAT, and dynamic ISP assignments. Geolocation is approximate and can be inaccurate.

Implement a configurable risk policy that evaluates these signals and avoids unnecessary verification when a minor network change occurs on a trusted device.

**Security requirement:** A trusted-device record must not permanently bypass all future verification. Significant risk signals, account recovery, credential changes, and administrator-defined security rules must still be able to trigger OTP verification.

## 4.2 Initial Login

For an account that has no trusted devices:

1. Validate the user's credentials.
2. Identify the login environment.
3. Create a pending authentication attempt.
4. Require OTP verification.
5. Send the OTP to an eligible registered email address or mobile number.
6. Verify the submitted OTP.
7. Grant authenticated access only after successful verification.
8. Optionally register the device as trusted if the user chooses to trust it.
9. Create the authenticated session.
10. Record the completed login event.

Do not create a fully authenticated session before the required verification has succeeded.

Use a restricted, short-lived pre-authentication session to manage OTP verification.

---

# 5. Email and Mobile OTP Verification

Implement a secure OTP verification workflow.

## 5.1 OTP Generation

Generate cryptographically secure, unpredictable OTPs.

Requirements:

- Use a six-digit numeric OTP by default.
- Configure OTP expiration, such as five minutes.
- Store only a secure hash of the OTP whenever practical.
- Associate each OTP with the relevant user, authentication attempt, and verification channel.
- Allow only one valid active OTP per authentication attempt and channel.
- Invalidate previous OTPs when a new OTP is issued.
- Limit the number of incorrect verification attempts.
- Implement resend cooldowns and rate limits.
- Invalidate the OTP after successful verification.
- Prevent OTP reuse.
- Prevent brute-force attacks through rate limiting and temporary lockouts.

Suggested configurable defaults:

- OTP validity: 5 minutes.
- Maximum incorrect attempts: 5.
- Resend cooldown: 60 seconds.
- Maximum OTP resend requests: 5 per hour per account, subject to broader abuse controls.

Store OTP expiry timestamps and verification metadata securely.

Do not expose the OTP in API responses, application logs, analytics events, or frontend debugging output.

## 5.2 Email OTP

Provide an email verification option.

Requirements:

- Send OTPs to the registered email address.
- Use the existing email service if available.
- If no email provider exists, implement a configurable provider integration using environment variables.
- Provide a clear email subject and professional message.
- Include the OTP expiration time.
- Inform the user that the OTP must not be shared.
- Do not reveal the full registered email address in the UI.

Use a generic delivery response that does not unnecessarily reveal whether an account exists.

## 5.3 SMS OTP

Provide an SMS verification option when a registered, verified mobile number is available.

Requirements:

- Use an existing SMS provider if configured.
- Otherwise, create a provider abstraction that supports a configurable SMS service.
- Store credentials in environment variables.
- Never expose provider API keys in frontend code.
- Apply resend limits and delivery error handling.
- Mask the phone number in the interface.

If a user has not registered a verified mobile number, disable the SMS option and explain that they can use email verification or update their account details through the supported secure process.

Do not simulate successful OTP delivery in production.

## 5.4 OTP Verification Interface

Create a responsive verification screen containing:

- A message indicating that additional verification is required.
- The selected verification channel.
- A masked destination address or phone number.
- Six-digit OTP input.
- Automatic focus movement between input fields, if individual fields are used.
- Paste support for the complete OTP.
- Verify button.
- Resend OTP button with countdown.
- Switch verification method option when another eligible method exists.
- Clear success and error messages.
- OTP expiration information.
- A way to cancel the pending login.

The interface must work on desktop, tablet, and mobile.

---

# 6. Trusted Device Management

Implement a secure trusted-device system that allows users to reduce repeated OTP prompts on recognized devices.

## 6.1 Trust This Device

After successful OTP verification, offer the user an optional checkbox:

"Trust this device for future logins."

Do not enable trusted-device registration automatically without following the application's security policy and user-consent requirements.

When the user opts in:

1. Generate a cryptographically secure random device token.
2. Store only an appropriate hash of the token on the server.
3. Associate the token with the authenticated user.
4. Record device metadata and the creation timestamp.
5. Set an expiration timestamp.
6. Store the token in a Secure, HttpOnly cookie when supported by the application's architecture.
7. Apply appropriate SameSite and path settings.
8. Ensure cookies are transmitted only over HTTPS in production.
9. Use the token to recognize future logins from that trusted browser.
10. Require renewed verification when the token expires or security policy demands it.

Do not rely exclusively on local storage or a user-agent string to authenticate a trusted device.

## 6.2 Configurable Trust Duration

Provide a configurable trust duration, such as:

- 7 days.
- 30 days.
- 60 days.
- 90 days.

Use 30 days as the default unless the existing security policy specifies otherwise.

Store the creation and expiration timestamps.

Expired devices must no longer bypass OTP verification.

## 6.3 Trusted Device Revocation

Allow users to:

- View all trusted devices.
- See the device type and browser.
- View approximate location and last-used time.
- See the trusted-device creation date.
- See the expiration date.
- Remove a trusted device.
- Revoke all trusted devices.
- Require fresh verification on subsequent logins after revocation.

Device revocation must take effect on the server, not merely hide the device from the interface.

---

# 7. Account Security Dashboard

Create a dedicated Account Security page that integrates with the application's existing design system.

Use the existing frontend framework, routing, authentication state, components, and theme system.

Do not create an isolated demo page disconnected from the actual application.

## 7.1 Security Overview

Display:

- Account security status.
- Current theme preference.
- Last successful login.
- Last login IP address, with appropriate privacy protections.
- Last login location, when available.
- Number of active sessions.
- Number of trusted devices.
- Number of recent failed login attempts.
- Whether additional security verification is required.

Avoid exposing sensitive information to unauthenticated visitors.

## 7.2 Login History

Create a login history table showing:

| Field            | Description                                           |
| ---------------- | ----------------------------------------------------- |
| Date and Time    | Login time displayed in IST                           |
| Browser          | Browser name and version                              |
| Operating System | OS name and version                                   |
| Device           | Desktop, Mobile, Tablet, or Unknown                   |
| IP Address       | Public IP associated with the attempt                 |
| Location         | City, State, Country, when available                  |
| Status           | Success, Failed, OTP Required, OTP Failed, or Blocked |
| Verification     | Email OTP, SMS OTP, Not Required, or Pending          |
| Device Trust     | Trusted or Untrusted                                  |

Features:

- Pagination.
- Sorting by timestamp.
- Filtering by status.
- Filtering by device type.
- Search by IP address where appropriate.
- Detailed login event view.
- Clear distinction between login attempts and completed sessions.
- Responsive mobile layout.
- Appropriate empty states and error handling.

Use server-side pagination and filtering for large histories.

Do not allow users to view another user's login history.

## 7.3 Active Sessions

Provide an Active Sessions section.

Display:

- Current session indicator.
- Device and browser details.
- Approximate location.
- IP address.
- Session creation time.
- Last activity.
- Session expiration, when applicable.

Allow users to:

- Revoke an individual session.
- Log out of other sessions.
- Revoke all other sessions.
- Review recently revoked sessions where appropriate.

Revocation must invalidate the corresponding server-side session or refresh-token family.

Do not rely on deleting a frontend cookie alone when server-side session invalidation is required.

Require reauthentication or additional verification for sensitive account-security operations when appropriate.

## 7.4 Trusted Devices

Display a separate list of trusted devices, including:

- Device name or description.
- Browser.
- Operating system.
- Approximate location.
- Date added.
- Last used.
- Trust expiration.
- Revoke button.

Provide confirmation dialogs for device revocation.

## 7.5 Security Alerts

Display recent security events, such as:

- New device login.
- New browser login.
- Unrecognized IP address.
- Unusual location.
- Successful OTP verification.
- Failed OTP attempts.
- Trusted-device registration.
- Trusted-device revocation.
- Password change.
- Session revocation.

Where appropriate, notify users by email about new-device logins or other high-risk events.

Do not send excessive alerts for harmless, repetitive changes.

---

# 8. Database Schema and Data Relationships

Inspect the existing database and adapt the following conceptual models to the current database technology.

Do not create duplicate collections or tables if equivalent models already exist.

## 8.1 User Profile

Add or reuse the following fields:

- `themePreference`: `auto`, `light`, or `dark`.
- `registeredEmailVerified`.
- `registeredPhoneVerified`.
- Existing authentication-related fields.

Do not store passwords or OTP values in plaintext.

## 8.2 Login Event

Create a login event record containing:

- Unique event ID.
- User ID, when known.
- Authentication attempt ID.
- IP address.
- Browser name and version.
- Operating system.
- Device type.
- Device model, when available.
- Approximate city.
- Approximate state.
- Country.
- Timestamp.
- Authentication status.
- OTP verification status.
- Verification channel.
- Risk indicators.
- Trusted-device reference, when applicable.
- Safe failure reason code.

Use database indexes on fields frequently queried, including user ID, timestamp, authentication attempt ID, and relevant status fields.

Ensure that failed attempts against nonexistent accounts can be recorded without creating unnecessary user accounts.

## 8.3 Trusted Device

Create a trusted-device record containing:

- Unique device record ID.
- User ID.
- Hashed device token or secure token reference.
- Device display name.
- Browser metadata.
- Operating system.
- Device type.
- Creation timestamp.
- Last-used timestamp.
- Expiration timestamp.
- Revocation timestamp.
- Revocation status.

## 8.4 OTP Challenge

Create an OTP challenge record containing:

- Challenge ID.
- User ID or pending authentication reference.
- OTP hash.
- Verification channel.
- Creation timestamp.
- Expiration timestamp.
- Failed attempt count.
- Resend count.
- Verification timestamp.
- Challenge status.

Apply expiration cleanup and appropriate rate limiting.

## 8.5 Session Management

Use the application's existing session or refresh-token infrastructure wherever possible.

Support:

- Session creation.
- Session expiration.
- Last activity updates.
- Session revocation.
- Device association.
- Login event association.

Do not store raw session tokens in database records or logs.

---

# 9. Backend API Requirements

Implement secure API endpoints that follow the project's existing naming conventions and architecture.

Adapt these suggested endpoints to the existing routes rather than blindly creating duplicates.

### Authentication and OTP

- `POST /api/auth/login`
  - Validate credentials.
  - Evaluate login risk.
  - Return a pending verification response when OTP is required.
  - Grant access only after the applicable authentication requirements are satisfied.
- `POST /api/auth/verify-otp`
  - Validate the challenge and OTP.
  - Enforce expiration and attempt limits.
  - Complete authentication only after successful verification.
- `POST /api/auth/resend-otp`
  - Enforce resend cooldowns and rate limits.
- `POST /api/auth/logout`
  - Invalidate the current session.
- `POST /api/auth/logout-all`
  - Revoke all applicable sessions.

### Theme Settings

- `GET /api/user/preferences`
  - Retrieve the saved theme preference.
- `PATCH /api/user/preferences`
  - Update the theme preference after validating the requested value.

### Login History

- `GET /api/security/login-history`
  - Return the authenticated user's paginated login history.
- `GET /api/security/login-history/:id`
  - Return an authorized login event.

### Trusted Devices

- `GET /api/security/trusted-devices`
  - List the authenticated user's trusted devices.
- `DELETE /api/security/trusted-devices/:id`
  - Revoke a specific trusted device.
- `POST /api/security/trusted-devices/revoke-all`
  - Revoke all trusted devices for the authenticated account.

### Active Sessions

- `GET /api/security/sessions`
  - List the authenticated user's active sessions.
- `DELETE /api/security/sessions/:id`
  - Revoke an individual session.
- `POST /api/security/sessions/revoke-others`
  - Revoke all other sessions while preserving the current session when appropriate.

Protect all sensitive endpoints using the existing authentication middleware and strict user-ownership checks.

Never accept a user ID from the client as sufficient authorization to access security records.

---

# 10. Security and Privacy Requirements

Implement security protections throughout the system.

### Authentication

- Never issue a fully authenticated session before required OTP verification.
- Use secure session management.
- Rotate session identifiers after authentication and privilege changes.
- Prevent session fixation.
- Validate authentication challenges server-side.
- Invalidate expired and revoked sessions.
- Apply appropriate CSRF protections when cookie-based authentication is used.

### OTP Security

- Generate OTPs using a cryptographically secure random generator.
- Store OTP hashes rather than plaintext OTPs.
- Enforce expiry and single-use semantics.
- Rate-limit OTP requests and verification attempts.
- Prevent brute-force attacks.
- Invalidate older challenges when required.
- Never log OTP values.

### Device Security

- Generate high-entropy device tokens.
- Hash tokens before database storage.
- Use Secure and HttpOnly cookies where appropriate.
- Apply SameSite cookie policies.
- Never treat browser fingerprints as reliable authentication credentials.
- Revoke trusted devices immediately when requested.
- Enforce expiration on the server.

### Authorization

- Enforce ownership checks for login history, trusted devices, and sessions.
- Prevent insecure direct object reference vulnerabilities.
- Validate request bodies and query parameters.
- Apply rate limits to sensitive endpoints.

### Network and Geolocation

- Configure reverse-proxy trust correctly.
- Validate IP addresses before processing them.
- Do not trust client-provided geolocation as authoritative.
- Handle unknown or unavailable location information safely.
- Do not grant access solely because a login originates from a familiar location.

### Privacy and Data Retention

- Collect only information required for security and functionality.
- Avoid unnecessary device fingerprinting.
- Restrict access to sensitive login information.
- Define configurable retention periods for login history, security events, and expired challenges.
- Avoid logging raw credentials, OTPs, session tokens, or secrets.
- Provide clear explanations of the login information collected.

### Abuse Prevention

- Implement progressive delays or temporary lockouts where appropriate.
- Avoid permanent account lockouts that attackers could exploit for denial of service.
- Monitor repeated failed attempts.
- Return safe error messages that do not unnecessarily disclose account existence.
- Ensure that security events cannot be modified by ordinary users.

---

# 11. Frontend Design and User Experience

Follow the existing application's UI design, color system, typography, spacing, buttons, navigation, and responsive behavior.

The feature should look like a native part of the application.

Create or update the following interfaces:

1. Automatic theme settings.
2. OTP verification screen.
3. Account Security dashboard.
4. Login History page or tab.
5. Trusted Devices page or tab.
6. Active Sessions page or tab.
7. Security Alerts section.

Requirements:

- Support both Light and Dark themes.
- Provide clear loading indicators.
- Include empty states.
- Display meaningful error messages.
- Show success notifications after security actions.
- Add confirmation dialogs before revoking sessions or devices.
- Prevent duplicate form submissions.
- Ensure accessible keyboard navigation.
- Use semantic HTML and accessible labels.
- Make the layouts responsive.
- Preserve existing navigation and application functionality.

Do not use placeholder data in the production security dashboard.

Connect all displayed information to the actual backend APIs.

---

# 12. Environment Variables and External Services

Inspect the existing environment configuration and reuse existing integrations where available.

Add only the environment variables that are actually required.

Examples:

```env
# Email OTP provider
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM_ADDRESS=

# SMS OTP provider
SMS_PROVIDER_API_KEY=
SMS_SENDER_ID=

# IP geolocation provider
IP_GEOLOCATION_API_KEY=

# Security configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
TRUSTED_DEVICE_DURATION_DAYS=30
LOGIN_HISTORY_RETENTION_DAYS=180

```

These are illustrative names. Adapt them to the project's existing provider and configuration conventions.

Do not commit actual secrets to source control.

Validate required environment variables during startup and provide safe configuration errors.

If an external provider is unavailable, handle the error gracefully. Never bypass OTP verification merely because email or SMS delivery failed.

Provide clear development instructions for configuring and testing the required integrations.

---

# 13. Testing Requirements

Implement automated tests using the testing framework already present in the project. If no suitable framework exists, select a lightweight framework compatible with the current stack.

Test the following scenarios.

## Theme Tests

1. Login at 4:59 AM IST selects Dark in Auto mode.
2. Login at 5:00 AM IST selects Light in Auto mode.
3. Login at 11:59 AM IST selects Light in Auto mode.
4. Login at 12:00 PM IST selects Dark in Auto mode.
5. Manual Light preference persists across sessions.
6. Manual Dark preference persists across sessions.
7. Auto preference recalculates on the next successful login.
8. Theme preference synchronizes across supported devices.

## Authentication Tests

1. Login from a recognized trusted device.
2. Login from a new browser.
3. Login from a new device.
4. Login from an unrecognized IP address.
5. Login from a significantly different location.
6. Login when geolocation is unavailable.
7. OTP verification succeeds.
8. Incorrect OTP is rejected.
9. Expired OTP is rejected.
10. Reused OTP is rejected.
11. OTP resend cooldown is enforced.
12. Maximum failed attempts are enforced.
13. OTP delivery failure does not grant access.
14. Required verification cannot be bypassed by calling an API directly.
15. Trusted-device expiration triggers fresh verification.
16. Revoked trusted devices cannot bypass verification.
17. High-risk logins can require OTP even on trusted devices.

## Session and Security Tests

1. Users cannot access another user's login history.
2. Users cannot revoke another user's sessions.
3. Revoked sessions no longer authorize protected API requests.
4. Revoked devices cannot authenticate using old tokens.
5. Invalid request bodies are rejected.
6. Sensitive data is not returned in API responses.
7. Login attempts are recorded accurately.
8. Failed OTP attempts are recorded.
9. Rate limiting prevents OTP abuse.
10. The application works with both IPv4 and IPv6 addresses where supported.

## UI Tests

1. Account Security page loads successfully.
2. Login history pagination works.
3. Trusted-device revocation updates the interface.
4. Session revocation updates the interface.
5. OTP input supports keyboard input and paste.
6. Theme settings work on desktop and mobile.
7. Loading, error, and empty states render correctly.

Use a controllable clock or equivalent mechanism for timezone-boundary tests.

---

# 14. Implementation Workflow

Follow this workflow carefully.

### Phase 1: Inspect

- Inspect the entire project structure.
- Identify frontend and backend frameworks.
- Identify authentication and authorization logic.
- Identify database models and relationships.
- Identify existing theme handling.
- Identify existing email/SMS integrations.
- Identify session and token management.
- Identify deployment and environment configuration.
- Determine which existing components can be reused.

### Phase 2: Plan

- Define the required database changes.
- Map the authentication flow.
- Design the OTP challenge lifecycle.
- Design trusted-device verification.
- Design login risk evaluation.
- Define the API changes.
- Identify security risks and migration requirements.

### Phase 3: Implement

- Add database models and migrations where necessary.
- Implement automatic theme selection.
- Implement login event recording.
- Implement risk-based OTP verification.
- Implement email and SMS delivery integrations.
- Implement trusted-device management.
- Implement active-session management.
- Implement account security APIs.
- Build the frontend interfaces.
- Integrate all changes into the existing application.

### Phase 4: Validate

- Run existing tests.
- Run new automated tests.
- Run linting and type checks where available.
- Run database migrations safely.
- Test the complete login and OTP workflow.
- Verify that the existing authentication flow still works.
- Check the browser console and server logs.
- Test desktop and mobile layouts.
- Verify that secrets and sensitive authentication data are not exposed.

### Phase 5: Report

Provide a clear implementation summary containing:

1. Files created.
2. Files modified.
3. Database changes.
4. API endpoints added or updated.
5. Theme-selection behavior.
6. OTP verification workflow.
7. Trusted-device behavior.
8. Login history and session management.
9. Required environment variables.
10. Installation and migration commands.
11. Testing results.
12. External services that must be configured.
13. Any remaining limitations or unfinished work.

---

# 15. Final Acceptance Criteria

The implementation is complete only when all applicable requirements below are satisfied:

- The theme automatically follows the specified IST time rules when the preference is Auto.
- Manually selected themes persist across sessions and devices.
- All login attempts are recorded securely.
- Browser, operating system, device type, IP address, timestamp, and approximate location are captured where available.
- Unrecognized login environments trigger OTP verification according to the configured risk policy.
- OTPs are securely generated, delivered, validated, expired, and invalidated.
- Authentication cannot be completed before required verification.
- Trusted devices are optional, secure, revocable, and time-limited.
- Users can review login history and manage active sessions.
- Users can review and revoke trusted devices.
- Security information is accessible only to authorized users.
- The feature is integrated into the existing application.
- Existing application functionality continues to work.
- All required external services and environment variables are documented.
- Automated tests pass, or any failures are explicitly documented.
- No security-critical functionality is replaced with mock data or a frontend-only simulation.

## Critical Execution Instructions

Do not stop after generating a plan or describing the changes.

Inspect the existing codebase, implement the required functionality in the appropriate files, integrate it with the existing application, run the available tests, fix implementation errors, and provide a final summary of what was actually completed.

Do not claim that a feature is implemented or tested unless the corresponding code and tests support that claim.

If a required external service, credential, deployment setting, or database permission is unavailable, implement the appropriate integration and clearly identify the remaining configuration required to activate it.