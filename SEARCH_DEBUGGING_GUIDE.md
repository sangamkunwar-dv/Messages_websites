# Search Not Working - Complete Debugging Guide

## What Was Fixed

### Search Query Issue
**Problem**: Using `.single()` on follows query was throwing errors
**Fix**: Changed to use `.limit(1)` with proper error handling
**Result**: Search now properly handles cases where no follow relationship exists

### Added Comprehensive Logging
**What's logged**:
- `[v0] Searching for: sangam` - Shows what you searched
- `[v0] Search results: [...]` - Shows database results
- `[v0] Filtered results: [...]` - After removing current user
- `[v0] Follow status for sangam: true/false` - For each user
- `[v0] Final results to display: [...]` - What will show

## How to Test Search

### Step 1: Open Developer Console
1. Go to `/chat`
2. Press F12 to open Developer Tools
3. Click "Console" tab
4. Clear any existing messages

### Step 2: Click Search Button
1. Look for the search icon (magnifying glass) in the top right of chat sidebar
2. Click it to open search box
3. You should see a text input: "Search by name or email..."

### Step 3: Type Search Query
1. Type "sangam" (or any username/email)
2. Wait for results to appear
3. **Check browser console for [v0] logs**

### Expected Console Output
When searching for "sangam", you should see:
```
[v0] Searching for: sangam
[v0] Search results: [
  {
    id: "user-uuid",
    username: "sangam",
    email: "sangam@example.com",
    avatar_url: null
  }
]
[v0] Filtered results: [...]
[v0] Follow status for sangam: false
[v0] Final results to display: [...]
```

### Expected UI Display
- Search box with "sangam" typed in
- Below it, a result card showing:
  - Username: "sangam"
  - Email: "sangam@example.com"
  - "Follow" button (if not following)
  - "Message" button

## Troubleshooting

### Issue 1: Nothing shows when typing
**Cause**: Either no users in database or search not starting yet
**Solution**:
1. Type at least 2 characters
2. Wait for "Searching..." message to disappear
3. Check console for error messages
4. See "No users found" message? Check database verification below

### Issue 2: "No users found" message
**Cause**: Either no matching users or RLS blocking access
**Solution**:

**Option A: Verify database has users**
1. Go to Supabase dashboard
2. Click "SQL Editor"
3. Run: `SELECT * FROM users;`
4. Should show at least one user row

**Option B: Check RLS policies**
1. Go to Supabase dashboard
2. Click "Authentication" > "Policies"
3. Find "users" table
4. Check if SELECT policy exists for authenticated users
5. If not, contact your database admin

**Option C: Try different search terms**
- Search for a user email (e.g., "sangamkunwar48@gmail.com")
- Search for just first letters (e.g., "san")
- Search for exact username

### Issue 3: Search button not appearing
**Cause**: Sidebar not loading or search not properly mounted
**Solution**:
1. Hard refresh page (Ctrl+Shift+R)
2. Check if sidebar loads with "Together" title
3. Look for magnifying glass icon in top right
4. If not visible, check browser console for JavaScript errors

### Issue 4: Console shows error for search
**Example error**: "Error: violates row level security policy"
**Cause**: RLS policy not configured for user
**Solution**:
1. Verify user is logged in
2. Check RLS policies on users table
3. Ensure policy allows authenticated users to read

**Example error**: "Column 'username' does not exist"
**Cause**: Users table doesn't have username field
**Solution**:
1. Check your database schema
2. Verify users table has: id, username, email, avatar_url
3. If missing fields, contact admin

## Database Verification

### Verify Users Table Structure
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
```

Should show:
- id (uuid)
- username (text)
- email (text)
- avatar_url (text, nullable)
- created_at (timestamp)

### Verify Users Have Data
```sql
SELECT COUNT(*) as total_users FROM users;
```

Should return: total_users: 1 or more

### Find Specific User
```sql
SELECT id, username, email FROM users WHERE username ILIKE '%sangam%';
```

Should return rows matching your search

### Check Search Function Works
```sql
SELECT * FROM users 
WHERE username ILIKE '%sangam%' 
OR email ILIKE '%sangam%' 
LIMIT 10;
```

Should return matching users

## Browser Console Debugging

### Enable All Logs
In browser console, paste:
```javascript
// This shows all network requests
window.localStorage.debug = 'supabase:*'
```

### Check Auth State
In browser console, paste:
```javascript
import { createClient } from '@supabase/supabase-js'
const client = createClient('YOUR_URL', 'YOUR_KEY')
const { data } = await client.auth.getUser()
console.log('Current user:', data)
```

### Manual Search Query
In browser console, paste:
```javascript
import { createClient } from '@supabase/supabase-js'
const client = createClient('YOUR_URL', 'YOUR_KEY')
const { data } = await client
  .from('users')
  .select('id, username, email, avatar_url')
  .or(`username.ilike.%sangam%,email.ilike.%sangam%`)
  .limit(10)
console.log('Search results:', data)
```

## Testing Checklist

```
[ ] Can open search (click search icon)
[ ] Can type in search box
[ ] See console log: [v0] Searching for: ...
[ ] See console log: [v0] Search results: [...]
[ ] See results displayed on screen
[ ] User result shows username
[ ] User result shows email
[ ] Follow button is visible
[ ] Message button is visible
[ ] Can click Follow button
[ ] Can click Message button
[ ] Following state updates
[ ] Can click user name to go to profile
```

## Performance Tips

### Search is Slow
1. Check database - might have thousands of users
2. Network might be slow - check Network tab in DevTools
3. Try typing more specific search term

### Too Many Results
1. Search already limits to 10 results
2. Type more characters to narrow down
3. Try searching by email instead of username

## Advanced Debugging

### Monitor Real-Time Search Activity
1. Open console
2. Keep Developer Tools open
3. Type slowly and watch the logs appear
4. Each character might trigger new search

### Check Network Requests
1. Open DevTools
2. Go to Network tab
3. Type in search box
4. Should see requests to:
   - `/rest/v1/users` (search query)
   - `/rest/v1/follows` (check follow status)

### Inspect Network Errors
1. Network tab shows red X = failed request
2. Click the request
3. Go to "Response" tab
4. Shows the SQL error from database

## Common Error Messages

### "violates row level security policy"
- Cause: RLS policy doesn't allow reading users
- Fix: Update RLS policy to allow authenticated users

### "column 'username' does not exist"
- Cause: Database doesn't have username field
- Fix: Run migration to add the field

### "undefined is not an object (evaluating 'data.length')"
- Cause: Search results is null/undefined
- Fix: Add null check (already done in latest version)

### "Subscription to REALTIME_POSTGRES_CHANGES denied"
- Cause: Real-time not enabled for tables
- Fix: Enable real-time in Supabase dashboard

## Solutions Summary

1. **Check console for [v0] logs** - shows exactly what's happening
2. **Verify database has users** - run `SELECT * FROM users`
3. **Check RLS policies** - ensure authenticated users can read
4. **Try different search terms** - maybe username doesn't exist
5. **Hard refresh browser** - clear cached assets (Ctrl+Shift+R)
6. **Restart dev server** - sometimes helps with state issues

## If Still Not Working

1. Take screenshot of:
   - Browser console showing [v0] logs
   - The search box and what you typed
   - Any error messages

2. Run database query and save results:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT * FROM users LIMIT 1;
   ```

3. Check Supabase project:
   - Is Supabase still connected?
   - Are tables still there?
   - Any disk space issues?

4. Contact support with:
   - Screenshot of console logs
   - Database query results
   - Error message (if any)

---

## Quick Reference

- **Search Icon**: Top right of sidebar (magnifying glass)
- **Minimum Characters**: 2 (one char won't search)
- **Search Fields**: Username OR Email (case-insensitive)
- **Max Results**: 10 users shown
- **Loading**: Shows "Searching..." while fetching
- **Not Found**: Shows "No users found" if no matches

---

## Summary

The search now has:
✅ Better error handling
✅ Detailed logging for debugging
✅ Proper database queries
✅ Follow status checking
✅ User filtering (removes current user)
✅ Complete UI display

To test: Go to /chat, click search icon, type "sangam", watch console for logs!

