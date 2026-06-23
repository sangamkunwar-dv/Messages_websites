# Authentication Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAT APPLICATION                            │
│                 Authentication System                          │
└─────────────────────────────────────────────────────────────────┘

                         SIGN UP FLOW
                         ============

User visits /auth/sign-up
        │
        ├─ Enters email
        │
        └─→ [Sign Up Button]
                │
                ├─→ POST /api/auth/send-otp
                │        │
                │        ├─ Generate OTP (6 digits)
                │        ├─ Store in verification_otp table
                │        ├─ Send via email (or log to console)
                │        └─ Return success
                │
                ├─→ Redirect to /auth/verify-otp?email=...
                │
                └─→ [Enter 6-digit code]
                        │
                        ├─→ POST /api/auth/verify-otp
                        │        │
                        │        ├─ Check OTP exists
                        │        ├─ Verify not expired
                        │        ├─ Check matches input
                        │        ├─ Increment attempts if wrong
                        │        └─ If correct → Create user profile
                        │
                        └─→ Redirect to /chat
                                │
                                └─→ User can now chat!


                         LOGIN FLOW
                         ===========

User visits /auth/login
        │
        ├─ Enters email
        ├─ Enters password
        │
        └─→ [Log In Button]
                │
                ├─→ supabase.auth.signInWithPassword()
                │        │
                │        └─ Validate email & password
                │
                ├─→ If valid → POST /api/auth/send-otp
                │        │
                │        └─ Send OTP via email
                │
                ├─→ Redirect to /auth/verify-otp?email=...
                │
                └─→ [Enter 6-digit code]
                        │
                        ├─→ POST /api/auth/verify-otp
                        │        │
                        │        └─ Verify OTP code
                        │
                        └─→ Redirect to /chat


                    VERIFICATION PAGE
                    =================

/auth/verify-otp
│
├─ [Display Email]
│
├─ [6-Digit Input Field]
│    │
│    ├─ User enters code
│    └─ Auto-validates (only numbers 0-9)
│
├─ [Verify Code Button]
│    │
│    └─ POST /api/auth/verify-otp
│         │
│         ├─ Valid → Show success ✓
│         │          Redirect to /chat
│         │
│         └─ Invalid → Show error ✗
│                      Increment attempt counter
│
├─ [Resend Code Button]
│    │
│    ├─ Disabled for 60 seconds (cooldown)
│    ├─ Shows countdown timer
│    └─ Sends new OTP when ready
│
└─ [Back to Login Button]


                     DATABASE FLOW
                     =============

Sign Up / Login Request
        │
        ├─→ Generate OTP (6 digits)
        │    │
        │    └─→ Insert into verification_otp table
        │         {
        │           email: "user@example.com",
        │           otp: "123456",
        │           expires_at: now + 10 minutes,
        │           attempts: 0,
        │           created_at: now
        │         }
        │
        ├─→ Send OTP email
        │    │
        │    └─→ Check SMTP configured
        │         If YES → Send via nodemailer
        │         If NO  → Log to console [DEV]
        │
        └─→ User receives code
                │
                └─→ Enters code in /auth/verify-otp
                     │
                     ├─→ Query verification_otp by email (latest)
                     │
                     ├─→ Check not expired
                     │    IF EXPIRED → Show error
                     │
                     ├─→ Check matches input
                     │    IF WRONG → Increment attempts
                     │    IF CORRECT → Continue
                     │
                     ├─→ Mark as verified
                     │    UPDATE verification_otp
                     │    SET verified_at = now
                     │
                     └─→ Create user profile if not exists
                          INSERT into users table


                    SECURITY CHECKS
                    ===============

┌─ OTP Validation
│  ├─ Must be 6 digits
│  ├─ Must not be expired (10 min max)
│  ├─ Must match stored value
│  └─ Limit 5 failed attempts
│
├─ Email Verification
│  ├─ User email confirmed
│  ├─ Only verified users can chat
│  └─ RLS policies enforce this
│
├─ Rate Limiting
│  ├─ Resend cooldown: 60 seconds
│  ├─ Failed attempts: max 5
│  └─ Request rate limiting via Supabase
│
└─ Data Encryption
   ├─ All data in Supabase encrypted at rest
   ├─ HTTPS for all requests (production)
   └─ Session tokens stored securely


                    ERROR HANDLING
                    ==============

Invalid Email
├─ Error: "Please enter a valid email"
└─ User can retry

OTP Expired
├─ Error: "Verification code expired"
├─ Show "Resend Code" button
└─ Click to get new OTP

Invalid OTP Code
├─ Error: "Invalid verification code"
├─ Increment attempt counter
└─ After 5 attempts → Force "Resend Code"

Too Many Attempts
├─ Error: "Too many failed attempts"
├─ Show "Resend Code" button
└─ Request new OTP to continue

Network Error
├─ Error: "Failed to send verification code"
├─ Check internet connection
└─ Retry

Server Error
├─ Error: "Internal server error"
├─ Check server logs
└─ Contact support


                  DEVELOPMENT MODE
                  ================

Test OTP Code: 123456

Setup:
1. No email configuration needed
2. Run pnpm dev
3. Go to /auth/sign-up
4. Enter any email
5. See "[DEV] OTP for user@example.com: 123456" in console
6. Enter 123456 on OTP page
7. Logged in and redirected to /chat!

Note: Test OTP ONLY works in development mode (NODE_ENV=development)


                 PRODUCTION MODE
                 ================

Real Email Setup:

1. Configure SMTP (see ENV_SETUP.md)
   ├─ Gmail recommended (easiest)
   ├─ SendGrid, Mailgun, Resend (alternatives)
   └─ Add env vars to Vercel

2. Users receive real OTP codes via email

3. Security features active:
   ├─ Test OTP disabled
   ├─ 10-minute code expiry
   ├─ 5-attempt limit
   ├─ 60-second resend cooldown
   └─ All data encrypted


                   STATE TRANSITIONS
                   =================

               ┌─────────────────┐
               │  Sign Up Page   │
               │  /auth/sign-up  │
               └────────┬────────┘
                        │
                    [Submit]
                        │
                        ▼
               ┌─────────────────┐
               │  OTP Sent via   │
               │  Email (or log) │
               └────────┬────────┘
                        │
            [Verify OTP Page]
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    [Valid]         [Invalid]      [Expired]
        │               │               │
        ▼               ▼               ▼
    ┌────────┐    [Retry]    ┌──────────────┐
    │ /chat  │    [Max 5x]   │ Resend Code  │
    │ Page   │    [Show      │ [60s cooldown]
    └────────┘     Error]    └──────────────┘
                                     │
                                   [Resend]
                                     │
                                     ▼
                            [New OTP sent]


                     FILE STRUCTURE
                     ==============

/app/auth/
├─ /sign-up
│  └─ page.tsx ────────────── Sign up form (modified)
├─ /verify-otp
│  └─ page.tsx ────────────── OTP verification (new)
├─ /login
│  └─ page.tsx ────────────── Login form (modified)
└─ /callback
   └─ route.ts ───────────── OAuth callback

/app/api/auth/
├─ /send-otp
│  └─ route.ts ───────────── Send OTP endpoint (new)
└─ /verify-otp
   └─ route.ts ───────────── Verify OTP endpoint (new)

/lib/supabase/
├─ client.ts ────────────── Supabase browser client
├─ server.ts ────────────── Supabase server client
└─ proxy.ts ─────────────── Session proxy

Database:
└─ verification_otp ────── OTP storage table (new)

Documentation:
├─ QUICK_START.md ──────── Quick start guide
├─ ENV_SETUP.md ────────── Email provider setup
├─ OTP_IMPLEMENTATION_SUMMARY.md ── This implementation
├─ AUTHENTICATION_FLOW.md ─ Flow diagrams (this file)
├─ DATABASE_SCHEMA.md ──── Database schema
└─ SUPABASE_API_EXAMPLES.md ─ API code examples


---

This diagram shows the complete authentication flow with OTP verification.
All components are security-hardened and production-ready.

For step-by-step setup, see QUICK_START.md
For email setup, see ENV_SETUP.md
For troubleshooting, see OTP_IMPLEMENTATION_SUMMARY.md
