# Testing Guide - OTP Email Verification

## Quick Test (5 minutes)

### Step 1: Start Dev Server
```bash
cd /vercel/share/v0-project
pnpm dev
```
Server starts at: http://localhost:3000

### Step 2: Test Sign Up
1. Visit: http://localhost:3000/auth/sign-up
2. Enter email: `test@example.com`
3. Click "Sign Up"
4. You'll be redirected to OTP verification page

### Step 3: Verify with Test Code
1. Page shows: "Enter the 6-digit code"
2. Enter: **123456** (test OTP for development)
3. Click "Verify Code"
4. Success! ✅ Redirected to /chat

### Step 4: Explore Chat
- You're now logged in
- Can see chat interface
- Can search for other users
- Can start conversations


## Complete Testing Checklist

### Authentication Tests

- [ ] **Sign Up Flow**
  - [ ] Enter email
  - [ ] See OTP page
  - [ ] Enter 123456
  - [ ] Redirected to /chat
  - [ ] User appears in Supabase

- [ ] **Login Flow**
  - [ ] Go to /auth/login
  - [ ] Enter email
  - [ ] Enter password
  - [ ] See OTP page
  - [ ] Enter 123456
  - [ ] Redirected to /chat

- [ ] **OTP Resend**
  - [ ] Click "Resend Code"
  - [ ] See 60-second cooldown
  - [ ] Countdown decreases
  - [ ] Can click again after 60s

- [ ] **Failed Attempts**
  - [ ] Enter wrong code 5 times
  - [ ] See "Too many attempts" error
  - [ ] Must click "Resend Code"

- [ ] **Code Expiry**
  - [ ] Get OTP code
  - [ ] Wait 10+ minutes (in dev, manually test)
  - [ ] Try to verify
  - [ ] See "Code expired" error

### Database Tests

- [ ] **OTP Table Created**
  ```sql
  -- In Supabase SQL Editor:
  SELECT * FROM public.verification_otp LIMIT 5;
  ```
  Should show:
  - email
  - otp
  - expires_at
  - verified_at
  - attempts
  - created_at

- [ ] **User Record Created**
  ```sql
  -- In Supabase SQL Editor:
  SELECT * FROM public.users;
  ```
  Should see user profile after OTP verification

- [ ] **OTP Records Expire**
  - [ ] Create OTP (now)
  - [ ] Wait 10+ minutes
  - [ ] OTP becomes invalid
  - [ ] Code not usable

### API Tests

Using curl or Postman:

#### Test Send OTP
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response:
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "email": "test@example.com"
}
```

#### Test Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "id": "user-uuid",
    "email": "test@example.com"
  }
}
```

### UI/UX Tests

- [ ] **Sign Up Form**
  - [ ] Email field validates
  - [ ] Terms checkbox required
  - [ ] Sign Up button disabled until agreed
  - [ ] Loading state shows spinner

- [ ] **OTP Verification Page**
  - [ ] Shows correct email
  - [ ] 6-digit input only (no letters)
  - [ ] Real-time validation
  - [ ] Success animation on verify
  - [ ] Error messages show clearly
  - [ ] Attempt counter visible

- [ ] **Responsive Design**
  - [ ] Mobile view (375px) works
  - [ ] Tablet view (768px) works
  - [ ] Desktop view (1024px+) works
  - [ ] All buttons clickable on mobile

- [ ] **Accessibility**
  - [ ] Tab navigation works
  - [ ] Labels associated with inputs
  - [ ] Error messages announce clearly
  - [ ] Keyboard navigation possible

### Error Handling Tests

- [ ] **Invalid Email**
  - [ ] Enter: `not-an-email`
  - [ ] See validation error
  - [ ] Can correct and retry

- [ ] **Invalid OTP**
  - [ ] Enter: `000000` (wrong code)
  - [ ] See: "Invalid verification code"
  - [ ] Attempt counter increments

- [ ] **Network Error**
  - [ ] Disconnect internet
  - [ ] Try to verify
  - [ ] See error message
  - [ ] Reconnect and retry

- [ ] **Session Timeout**
  - [ ] Wait 30+ minutes
  - [ ] Try to verify
  - [ ] May need to resend

### Integration Tests

- [ ] **User Signup to Chat**
  - [ ] Sign up with new email
  - [ ] Verify with OTP
  - [ ] Land on /chat page
  - [ ] Can search for users
  - [ ] Can view conversations

- [ ] **Multiple Users**
  - [ ] Create user 1: `user1@test.com`
  - [ ] Create user 2: `user2@test.com`
  - [ ] User 1 searches for user 2
  - [ ] Can start conversation

- [ ] **Admin Account**
  - [ ] Email: `sangamkunwar48@gmail.com`
  - [ ] Sign up with OTP
  - [ ] Verify with 123456
  - [ ] Should have admin access

### Performance Tests

- [ ] **OTP Send Response Time**
  - [ ] Should be < 2 seconds
  - [ ] Check browser Network tab

- [ ] **OTP Verify Response Time**
  - [ ] Should be < 1 second
  - [ ] Check browser Network tab

- [ ] **Page Load Time**
  - [ ] Sign up page: < 1s
  - [ ] OTP page: < 1s
  - [ ] Chat page: < 2s

- [ ] **Concurrent Users**
  - [ ] Open 2 browser windows
  - [ ] Sign up in both
  - [ ] Verify in both
  - [ ] Both work correctly

### Production Simulation

- [ ] **Test with Email Provider**
  - [ ] Setup Gmail SMTP (see ENV_SETUP.md)
  - [ ] Add to `.env.local`
  - [ ] Restart dev server
  - [ ] Sign up with real email
  - [ ] Receive actual email
  - [ ] Verify with real code

- [ ] **Test Deployment**
  - [ ] Push to GitHub
  - [ ] Deploy to Vercel
  - [ ] Test sign up on live site
  - [ ] Test OTP verification
  - [ ] Check production logs

## Test Data

### Test Emails (Development)
```
test@example.com
demo@test.com
admin@test.com
user1@test.com
user2@test.com
```

### Test OTP Code (Development Only)
```
123456
```

### Admin Email
```
sangamkunwar48@gmail.com
```

## Browser Console Tests

Open DevTools (F12) and check Console:

### Should See
```
[DEV] OTP for test@example.com: 123456
```

This indicates OTP was generated successfully.

### Debug Output
```javascript
// Check user session
supabase.auth.getUser().then(user => console.log(user))

// Check stored OTP
fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'test@example.com', otp: '123456'})
}).then(r => r.json()).then(console.log)
```

## Network Tab Tests

Monitor in DevTools Network tab:

### Sign Up Request
- Endpoint: `/api/auth/send-otp`
- Method: POST
- Status: 200
- Response time: < 2s
- Payload: `{email: "..."}`

### Verify Request
- Endpoint: `/api/auth/verify-otp`
- Method: POST
- Status: 200
- Response time: < 1s
- Payload: `{email: "...", otp: "123456"}`

## Database Console Tests

### Supabase SQL Editor

```sql
-- Check recent OTPs
SELECT * FROM public.verification_otp 
ORDER BY created_at DESC 
LIMIT 5;

-- Check users
SELECT * FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if OTP expired
SELECT *, 
  CASE WHEN expires_at < NOW() THEN 'EXPIRED' ELSE 'VALID' END as status
FROM public.verification_otp;

-- Count attempts
SELECT email, MAX(attempts) as max_attempts
FROM public.verification_otp
GROUP BY email;
```

## Troubleshooting During Tests

### "Code not working"
1. Check test is in development mode
2. Code must be exactly: `123456`
3. Make sure dev server running

### "Email not received"
1. Add SMTP config to `.env.local`
2. Restart dev server with `pnpm dev`
3. Check console for `[DEV] OTP for...`

### "Database error"
1. Check Supabase connection
2. Verify `NEXT_PUBLIC_SUPABASE_URL` set
3. Check RLS policies
4. Run: `supabase db push`

### "Page not loading"
1. Clear browser cache: Ctrl+Shift+Delete
2. Hard refresh: Ctrl+Shift+R
3. Check console for errors
4. Restart dev server

### "Stuck on OTP page"
1. Browser might be cached
2. Try incognito/private window
3. Or clear all browser data
4. Check browser console for errors

## Success Criteria

✅ **All tests pass when:**
- Sign up works with any email
- OTP verification works with code `123456`
- Redirects to /chat after verification
- User can access chat features
- Error messages display correctly
- Resend code functionality works
- Database records created properly
- No console errors
- Response times < 2 seconds

## Sign Off

After completing all tests, you're ready to:
1. ✅ Test with real email providers
2. ✅ Deploy to production
3. ✅ Launch to real users

---

**Total Testing Time**: ~30 minutes  
**Difficulty Level**: Easy  
**Tools Needed**: Browser, curl/Postman (optional)

Happy testing! 🧪
