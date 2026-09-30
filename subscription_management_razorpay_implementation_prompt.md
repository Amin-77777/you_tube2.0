# SUBSCRIPTION MANAGEMENT + RAZORPAY TEST PAYMENT IMPLEMENTATION

I want you to implement a complete, production-structured subscription management system in my EXISTING web application.

IMPORTANT:
- First inspect the existing project before modifying anything.
- Do NOT create a new project or replace the existing architecture.
- Reuse the existing authentication, users, database, API routes, UI components, video/content system, styling, and existing utilities.
- Do NOT break any existing functionality.
- Do NOT create duplicate authentication, database, payment, or user-management systems.
- Use Razorpay TEST MODE only. Do not use live payments.
- Never hardcode Razorpay secret keys.
- Use environment variables for all payment credentials and sensitive configuration.
- Implement proper server-side payment verification.
- Do not activate a paid subscription based only on frontend payment success.
- Premium access must be granted ONLY after server-side payment verification succeeds.

==================================================
STEP 1 — INSPECT THE EXISTING PROJECT
==================================================

Before modifying anything, inspect the entire relevant project structure.

Identify:

1. Frontend framework.
2. Backend/API architecture.
3. Database and existing MongoDB models.
4. Existing authentication system.
5. Existing User model/schema.
6. Existing video/content models.
7. Existing premium-content logic.
8. Existing dashboard/pages.
9. Existing API routes.
10. Existing email functionality.
11. Existing payment-related code, if any.
12. Existing environment variables.
13. Existing UI/component library.
14. Existing subscription-related components/pages, if any.

Pay special attention to:

- User model
- Video/content model
- Authentication middleware
- API routes
- Dashboard
- Video player
- Premium content protection
- Existing `.env` / `.env.local`
- Existing email service
- Existing database utilities

DO NOT modify files during this step.

First provide:
- Current architecture summary.
- Existing relevant files.
- Files that need to be created.
- Files that need modification.
- Dependencies that are already installed.
- Dependencies that may be required.
- Proposed subscription architecture.

Then wait for confirmation before implementing.

==================================================
SUBSCRIPTION PLANS
==================================================

Implement four subscription plans:

1. FREE
2. BRONZE
3. SILVER
4. GOLD

The plans should have progressively increasing benefits.

The exact pricing and limits should be configurable rather than hardcoded throughout the application.

Create a centralized plan configuration.

Example structure:

FREE:
- Limited premium videos
- Basic platform access
- Lower streaming quality
- Restricted watch time
- Limited downloads
- Advertisements enabled

BRONZE:
- Increased video access
- Better streaming quality
- Increased watch time
- More downloads
- Selected premium content

SILVER:
- Unlimited video access
- Higher streaming quality
- More downloads
- Priority content
- Faster streaming
- Premium courses
- Reduced/no advertisements depending on configuration

GOLD:
- All premium videos
- Highest supported streaming quality
- Unlimited or highest download allowance
- Priority content
- Premium courses
- Ad-free viewing
- Highest daily usage limits
- Other configurable premium benefits

IMPORTANT:
Do not assume these exact limits are final.

Make plan limits configurable so I can easily change:

- Price
- Currency
- Validity
- Video quality
- Daily watch time
- Download limits
- Premium content access
- Course access
- Advertisement status
- Priority access
- Other features

==================================================
SUBSCRIPTION DURATION
==================================================

Support:

- Monthly
- Quarterly
- Yearly

Each plan should have configurable pricing and duration.

For example:

plan:
  name
  tier
  duration
  durationInDays
  price
  currency
  features
  limits
  active

Do not duplicate pricing logic across multiple components.

Use one centralized configuration/database source.

==================================================
PLAN COMPARISON
==================================================

Create a subscription comparison page.

Users should be able to:

- View all plans.
- Compare features.
- Compare pricing.
- Compare validity.
- Compare streaming quality.
- Compare watch limits.
- Compare download limits.
- Compare premium content access.
- Compare advertisements.
- Compare courses.
- See which plan they currently have.
- See upgrade options.
- See downgrade options.

Clearly display:

CURRENT PLAN

for the user's active plan.

Provide appropriate action buttons:

- Upgrade
- Downgrade
- Renew
- Subscribe
- Cancel

Do not show inappropriate actions.

For example:
- Free → paid: Subscribe
- Bronze → Silver: Upgrade
- Silver → Gold: Upgrade
- Gold → lower plan: Downgrade
- Active subscription: Renew where applicable

==================================================
SUBSCRIPTION DASHBOARD
==================================================

Create a dedicated subscription dashboard.

Display:

- Current plan
- Subscription status
- Subscription start date
- Subscription expiry date
- Remaining validity
- Next renewal date
- Auto-renewal status
- Payment status
- Current plan features
- Remaining daily watch time
- Remaining downloads
- Premium access status
- Billing history

Provide buttons for:

- Upgrade
- Downgrade
- Renew
- Cancel subscription

Also show:

- Previous subscriptions
- Previous transactions
- Invoice numbers
- Payment IDs
- Order IDs
- Amount
- Currency
- Payment status
- Payment date

==================================================
RAZORPAY TEST PAYMENT INTEGRATION
==================================================

Implement Razorpay TEST MODE payment integration.

Use Razorpay only for testing.

Required environment variables should follow a structure similar to:

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

Do not expose the secret key to the browser.

Only the public Razorpay key may be sent to the frontend when required.

Implement:

1. Create Razorpay order on the SERVER.
2. Send required order information to frontend.
3. Open Razorpay checkout.
4. Receive payment response.
5. Send payment details to backend.
6. Verify payment signature on SERVER.
7. Verify order/payment details.
8. Only then activate subscription.

Never trust:

- Frontend plan status
- Frontend payment status
- Frontend amount
- Frontend user role
- Frontend subscription status

The backend must determine these values.

==================================================
PAYMENT FLOW
==================================================

Implement the following flow:

USER SELECTS PLAN
        ↓
Validate user
        ↓
Validate plan
        ↓
Calculate amount SERVER-SIDE
        ↓
Create Razorpay order
        ↓
Return order information
        ↓
Open Razorpay Checkout
        ↓
User completes payment
        ↓
Razorpay returns payment information
        ↓
Frontend sends payment information to backend
        ↓
Backend verifies Razorpay signature
        ↓
Backend validates order/payment
        ↓
Store transaction
        ↓
Create/activate subscription
        ↓
Update user subscription status
        ↓
Enable premium features
        ↓
Generate invoice information
        ↓
Send confirmation email
        ↓
Show success page

==================================================
PAYMENT FAILURE HANDLING
==================================================

Properly handle:

- Successful payment
- Failed payment
- Cancelled payment
- User closing checkout
- Duplicate payment attempts
- Network interruption
- Payment response timeout
- Invalid payment signature
- Invalid order ID
- Invalid amount
- Payment verification failure
- Server/database failure after payment
- Retry scenarios

Never activate a subscription when verification fails.

Display clear messages such as:

Payment successful
Payment failed
Payment cancelled
Payment verification failed
Please try again
Payment already processed

Do not expose sensitive payment information.

==================================================
DUPLICATE PAYMENT PROTECTION
==================================================

Implement idempotency/duplicate protection.

Before activating a subscription:

- Check whether the Razorpay payment ID already exists.
- Check whether the order has already been processed.
- Prevent duplicate subscription activation.
- Prevent duplicate transaction records.
- Prevent users from receiving multiple subscriptions for the same verified payment.

Use unique database indexes where appropriate.

==================================================
DATABASE DESIGN
==================================================

Inspect the existing database architecture and create appropriate models.

Possible models:

User
Subscription
SubscriptionPlan
PaymentTransaction
Invoice

Reuse the existing User model instead of creating another user system.

Subscription should contain information such as:

- userId
- planId
- planName
- tier
- status
- startDate
- expiryDate
- renewalDate
- autoRenew
- paymentId
- orderId
- invoiceNumber
- amount
- currency
- paymentStatus
- createdAt
- updatedAt

PaymentTransaction should contain:

- userId
- subscriptionId
- razorpayOrderId
- razorpayPaymentId
- razorpaySignature
- amount
- currency
- status
- paymentMethod if available/appropriate
- failureReason if applicable
- createdAt
- verifiedAt

Do not store unnecessary sensitive card information.

==================================================
INVOICE
==================================================

After successful payment, generate an invoice record containing:

- Invoice number
- User information
- Plan
- Subscription duration
- Amount
- Currency
- Payment ID
- Order ID
- Payment date
- Subscription start date
- Subscription expiry date
- Payment status

Invoice numbers must be unique.

Do not expose sensitive payment credentials.

If PDF invoice generation is practical within the current project, implement it.

Otherwise implement invoice data and leave the architecture ready for PDF generation.

==================================================
PREMIUM CONTENT PROTECTION
==================================================

This is VERY IMPORTANT.

Premium content must NOT be protected only by frontend UI.

For every protected API/resource:

SERVER must verify:

1. User authentication.
2. User subscription status.
3. Subscription expiry.
4. Required plan/tier.
5. Required feature/permission.
6. Download/watch limits where applicable.

Do not rely on:

- Hidden buttons
- React state
- LocalStorage
- Cookies controlled only by frontend
- Client-side plan values

A user should not be able to access premium content simply by manually calling an API.

==================================================
PLAN-BASED ACCESS CONTROL
==================================================

Create a centralized access-control system.

For example:

canWatchVideo(user, video)
canDownloadVideo(user, video)
canAccessCourse(user, course)
canUsePremiumFeature(user, feature)
getStreamingQuality(user)
getDailyWatchLimit(user)
getDownloadLimit(user)

These checks should be reusable throughout the application.

Avoid duplicating subscription checks in every component.

==================================================
VIDEO ACCESS
==================================================

Integrate subscriptions with the existing video system.

The existing video player should determine whether the user can access a video.

Support:

- Free video
- Bronze-only video
- Silver-only video
- Gold-only video
- All-premium video

If a user does not have access:

Show a professional upgrade message.

Example:

"This content requires a Silver subscription."

Provide:

VIEW PLANS

button.

Do not expose the protected video source before authorization.

==================================================
STREAMING QUALITY
==================================================

Implement plan-based video quality restrictions where supported by the existing video architecture.

Example:

FREE:
Lower quality

BRONZE:
HD

SILVER:
Higher quality

GOLD:
Highest available quality

Do not claim a quality is supported if the current video infrastructure does not actually provide it.

Make quality rules configurable.

==================================================
WATCH TIME LIMITS
==================================================

Implement daily watch-time tracking if the existing platform supports usage tracking.

Track:

- User
- Date
- Total watch time
- Remaining daily limit

Reset usage appropriately each day.

Do not simply trust the client-provided watch time.

Prevent users from bypassing limits by:

- Refreshing page
- Opening another tab
- Changing browser state
- Manipulating localStorage

Use server-side validation where practical.

==================================================
DOWNLOAD LIMITS
==================================================

Implement plan-based download limits.

Track:

- Daily downloads
- User
- Date
- Downloaded content

Prevent unauthorized premium downloads.

Validate download permissions server-side.

==================================================
SUBSCRIPTION EXPIRATION
==================================================

Implement automatic expiration handling.

When subscription expires:

- Mark subscription as expired.
- Downgrade user to FREE.
- Remove premium access.
- Preserve user account.
- Preserve watch history.
- Preserve transaction history.
- Preserve previous subscriptions.
- Preserve uploaded/user-generated content where applicable.

Do NOT delete user data.

Implement expiration checking through:

- Server-side validation when accessing protected features.
- Scheduled/background processing if supported by the deployment architecture.

Do not depend exclusively on a client-side timer.

==================================================
RENEWAL
==================================================

Implement subscription renewal.

When renewing:

- Validate existing subscription.
- Create a new Razorpay order.
- Complete payment.
- Verify payment.
- Update subscription dates only after successful verification.
- Store the new transaction.
- Generate a new invoice.
- Send confirmation email.

Do not extend subscription validity before payment verification.

==================================================
UPGRADE
==================================================

Implement upgrades.

Example:

Bronze → Silver
Silver → Gold

Before payment:

- Determine current plan.
- Determine requested plan.
- Calculate server-side amount.
- Determine upgrade rules.

After successful payment verification:

- Activate the new plan.
- Update subscription.
- Preserve transaction history.
- Generate invoice.
- Send email.

Clearly define how remaining validity is handled.

Do not invent a proration system unless required.

If proration is not implemented, clearly display the renewal/expiry behavior to the user.

==================================================
DOWNGRADE
==================================================

Implement downgrade functionality carefully.

A downgrade should not unexpectedly remove currently paid benefits.

Prefer scheduling the downgrade for the next renewal period if appropriate.

For example:

Gold → Silver

Current Gold benefits remain active until the existing expiry date.

Silver becomes active after renewal.

Clearly display:

"Your downgrade will take effect on [date]."

Do not immediately remove already-paid benefits unless the existing business rules explicitly require it.

==================================================
CANCELLATION
==================================================

Implement cancellation.

Support:

- Cancel auto-renewal.
- Keep current subscription active until expiry.
- Prevent future renewal where applicable.

Show confirmation before cancellation.

Example:

"Your subscription will remain active until [date], but it will not renew automatically."

Do not delete historical payment/subscription records.

==================================================
EMAIL CONFIRMATION
==================================================

After successful verified payment, automatically send a confirmation email.

Email should include:

- User name
- Plan name
- Subscription tier
- Amount paid
- Currency
- Payment status
- Payment ID
- Order ID
- Invoice number
- Subscription start date
- Subscription expiry date
- Renewal date
- Validity period
- Premium features
- Support contact details

Subject example:

"Subscription Payment Successful — [Platform Name]"

The email should be professional and responsive.

If the project already has an email service, reuse it.

If not, implement the email architecture using environment variables for SMTP/provider credentials.

Never hardcode email credentials.

==================================================
BILLING HISTORY
==================================================

Create a billing history section.

Display:

- Date
- Plan
- Amount
- Currency
- Payment status
- Invoice number
- Payment ID
- Order ID

Allow users to view invoice details.

If invoice downloads are implemented, protect them so only the correct authenticated user can access them.

==================================================
SUBSCRIPTION STATUS
==================================================

Possible statuses may include:

- FREE
- ACTIVE
- PENDING
- PAYMENT_FAILED
- CANCELLED
- EXPIRED
- REFUNDED

Use a centralized status definition.

Do not create inconsistent status strings across the application.

==================================================
SECURITY
==================================================

Implement strong security practices.

Requirements:

- Server-side authorization.
- Secure payment verification.
- Razorpay signature verification.
- Input validation.
- User ownership validation.
- Protected API routes.
- No secret keys on frontend.
- No trusting client-submitted prices.
- No trusting client-submitted subscription tiers.
- No trusting client-submitted user IDs.
- Prevent unauthorized invoice access.
- Prevent unauthorized subscription modification.
- Prevent duplicate payments.
- Prevent replay of old payment responses where applicable.
- Validate webhook events if webhooks are implemented.

==================================================
RAZORPAY WEBHOOKS
==================================================

If appropriate for the current architecture, implement Razorpay webhook support.

Use webhooks to improve reliability for payment events.

Handle relevant events such as:

- Payment success
- Payment failure
- Refund
- Other relevant subscription/payment events supported by the integration

Verify webhook signatures server-side.

Make webhook processing idempotent.

Do not activate subscriptions based solely on an unverified webhook request.

==================================================
ENVIRONMENT VARIABLES
==================================================

Use environment variables similar to:

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=

DATABASE_URL=

Use the project's existing database variable if already configured.

Do not expose secrets.

Do not commit `.env.local` or secret files to GitHub.

==================================================
UI PAGES
==================================================

Create or extend the following pages as appropriate:

1. Subscription Plans
2. Plan Comparison
3. Checkout/Payment
4. Payment Success
5. Payment Failure
6. Subscription Dashboard
7. Billing History
8. Invoice Details
9. Subscription Management

Reuse the existing application's design language.

Do not unnecessarily redesign unrelated pages.

==================================================
USER EXPERIENCE
==================================================

The user should be able to:

1. Open subscription page.
2. Compare plans.
3. Select a plan.
4. Review pricing.
5. Start Razorpay checkout.
6. Complete test payment.
7. Payment gets verified server-side.
8. Subscription becomes active.
9. Premium features become available.
10. Receive confirmation email.
11. View invoice.
12. View billing history.
13. View subscription expiry.
14. Upgrade/downgrade/renew/cancel later.

Provide clear loading states and error states throughout.

==================================================
PAYMENT STATES
==================================================

The UI must clearly handle:

LOADING
PAYMENT_PENDING
PAYMENT_SUCCESS
PAYMENT_FAILED
PAYMENT_CANCELLED
PAYMENT_VERIFICATION
PAYMENT_VERIFICATION_FAILED
ALREADY_PROCESSED

Never leave the user stuck on a loading screen.

==================================================
TESTING REQUIREMENTS
==================================================

Test the complete system.

### Account Tests

- New user gets FREE plan.
- Existing user can view subscription.
- Unauthorized users cannot access protected APIs.

### Plan Tests

- Free plan works.
- Bronze plan works.
- Silver plan works.
- Gold plan works.
- Plan comparison works.
- Feature restrictions work.

### Payment Tests

Use Razorpay TEST MODE.

Test:

- Successful payment.
- Failed payment.
- Cancelled payment.
- Duplicate payment.
- Invalid signature.
- Invalid order.
- Network interruption.
- Refresh during payment.
- Payment callback interruption.
- Server restart during payment.

### Subscription Tests

Test:

- New subscription.
- Upgrade.
- Downgrade.
- Renewal.
- Cancellation.
- Expiration.
- Automatic downgrade to Free.
- Premium access removal after expiration.

### Security Tests

Try to bypass subscription access by:

- Changing frontend plan.
- Changing localStorage.
- Calling premium API directly.
- Changing user ID.
- Changing plan ID.
- Modifying payment amount.
- Replaying payment response.

The backend must reject unauthorized attempts.

### Email Tests

Verify successful purchase email contains:

- Correct user.
- Correct plan.
- Correct amount.
- Correct payment ID.
- Correct order ID.
- Correct invoice.
- Correct start date.
- Correct expiry date.
- Support details.

==================================================
PERFORMANCE
==================================================

Optimize:

- Database queries.
- Subscription checks.
- Premium content authorization.
- Billing history.
- API responses.
- UI rendering.

Use database indexes for:

- userId
- paymentId
- orderId
- invoiceNumber
- subscription status
- expiryDate

==================================================
IMPLEMENTATION RULES
==================================================

1. Never delete existing functionality.
2. Never replace the entire project with a new template.
3. Never create duplicate User models.
4. Never create duplicate authentication systems.
5. Reuse the existing database connection.
6. Reuse existing authentication.
7. Inspect existing files before modifying them.
8. Do not assume a library is installed.
9. Check `package.json` before adding dependencies.
10. Use environment variables for secrets.
11. Never expose Razorpay secret keys to the client.
12. Never trust payment status from the frontend.
13. Never trust subscription tier from the frontend.
14. Never activate premium access before server-side payment verification.
15. Never delete historical payment records.
16. Never delete watch history when a subscription expires.
17. Do not break the existing video-calling functionality.
18. Do not break the existing video playback system.
19. Do not redesign unrelated parts of the application.
20. Keep the implementation modular and maintainable.
21. Add proper error handling.
22. Add proper loading states.
23. Add proper success/failure states.
24. Keep API validation server-side.
25. Make plan pricing and limits configurable.
26. Do not use live Razorpay credentials.
27. Do not claim the feature is complete until it has been tested.

==================================================
FINAL IMPLEMENTATION CHECKLIST
==================================================

Before declaring completion, verify:

[ ] Four subscription plans implemented
[ ] Plan configuration implemented
[ ] Monthly/quarterly/yearly support
[ ] Plan comparison page
[ ] Subscription dashboard
[ ] Current subscription status
[ ] Remaining validity
[ ] Renewal date
[ ] Billing history
[ ] Razorpay TEST MODE
[ ] Server-side order creation
[ ] Server-side payment verification
[ ] Signature verification
[ ] Duplicate payment protection
[ ] Payment failure handling
[ ] Payment cancellation handling
[ ] Network interruption handling
[ ] Subscription activation
[ ] Premium access control
[ ] Video access restrictions
[ ] Streaming quality restrictions
[ ] Watch-time limits
[ ] Download limits
[ ] Upgrade
[ ] Downgrade
[ ] Renewal
[ ] Cancellation
[ ] Automatic expiration
[ ] Automatic downgrade to Free
[ ] Historical data preservation
[ ] Invoice generation/data
[ ] Email confirmation
[ ] Secure billing history
[ ] Server-side authorization
[ ] Database indexes
[ ] Responsive UI
[ ] Error handling
[ ] Loading states
[ ] Razorpay test transactions verified
[ ] Production build tested
[ ] Existing functionality verified

==================================================
START HERE
==================================================

DO NOT MODIFY ANY FILE YET.

Start with an inspection of my existing project.

First report:

1. Existing subscription/payment-related files.
2. Existing User model.
3. Existing authentication system.
4. Existing video/content authorization.
5. Existing database structure.
6. Existing email system.
7. Existing dashboard structure.
8. Existing API architecture.
9. Existing dependencies.
10. Which files should be modified.
11. Which new files should be created.
12. Any missing infrastructure.
13. Proposed database schema.
14. Proposed payment flow.
15. Proposed subscription architecture.

After the inspection, WAIT for my confirmation before making implementation changes.

The goal is to extend my current application with a secure, reliable, testable subscription system — NOT to rebuild my application from scratch.