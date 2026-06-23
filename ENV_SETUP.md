# Environment Variables Setup Guide

This guide will help you set up the required environment variables for the messaging app to work properly with email OTP verification.

## Required Supabase Environment Variables

These are automatically set up when you connect Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Email (SMTP) Configuration for OTP

The app sends OTP verification codes via email. You need to configure an SMTP email service.

### Option 1: Using Gmail (Easiest)

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or any device type)
3. Google will generate a 16-character app password
4. Add these to your environment variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Option 2: Using SendGrid

1. Sign up at https://sendgrid.com
2. Get your API key from Settings > API Keys
3. Add these to your environment variables:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Option 3: Using Mailgun

1. Sign up at https://www.mailgun.com
2. Get your SMTP credentials from the Sending > Domain Settings
3. Add these to your environment variables:

```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=noreply@your-domain.mailgun.org
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Option 4: Using Resend (Recommended for Production)

1. Sign up at https://resend.com
2. Get your API key from the API Keys page
3. Add these to your environment variables:

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setting Environment Variables in Vercel

1. Go to your Vercel Project Dashboard
2. Click on "Settings" in the top menu
3. Click on "Environment Variables" in the left sidebar
4. Add each variable from your chosen email provider

## Testing Your Setup

After setting up environment variables:

1. Restart your development server
2. Go to the sign-up page and try creating an account
3. You should receive an OTP code in the email address you signed up with
4. Enter the code on the verification page to complete signup

## Troubleshooting

### "Email sending failed" error
- Check that all SMTP environment variables are set correctly
- Verify the email and password/API key are correct
- Check that the SMTP port is correct for your provider
- Make sure your email provider allows SMTP connections

### OTP not arriving
- Check the spam/junk folder in your email
- Verify the `SMTP_FROM` email address matches what your provider allows
- Check the application logs for detailed error messages

### CORS or authentication errors
- Make sure `NEXT_PUBLIC_APP_URL` is set to your app's URL
- For development: `http://localhost:3000`
- For production: `https://your-domain.com`

## Email Flow

1. User signs up → OTP sent to email
2. User verifies email with OTP code
3. User account is created and verified
4. User is automatically redirected to chat page

## Security Notes

- OTP codes expire after 10 minutes
- Maximum 5 failed verification attempts before resend is required
- OTP codes are stored in the database with expiry timestamps
- Only verified users can access the chat application
