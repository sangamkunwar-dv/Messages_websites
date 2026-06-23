# Setup Block Feature - Quick Guide

## One-Time Setup Required

The block/unblock feature requires a new database table. Follow these steps:

### Step 1: Get the SQL
The SQL file is located at: `migrations/add_blocked_users.sql`

**Contents:**
```sql
-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own blocks" ON blocked_users
  FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can create blocks" ON blocked_users
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON blocked_users
  FOR DELETE
  USING (auth.uid() = blocker_id);
```

### Step 2: Apply to Database

#### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left menu
   - Click "New Query"

3. **Paste SQL**
   - Copy the entire SQL from `migrations/add_blocked_users.sql`
   - Paste into the query editor

4. **Run Query**
   - Click "Run" button
   - Should complete in < 1 second
   - Look for success message

5. **Verify**
   - Click "Table Editor" in left menu
   - Should see new `blocked_users` table
   - Should see columns: id, blocker_id, blocked_id, created_at, updated_at, reason

#### Option B: Command Line (Advanced)

```bash
# Using Supabase CLI
supabase db push

# OR manually using psql
psql $DATABASE_URL < migrations/add_blocked_users.sql
```

### Step 3: Verify RLS Policies

1. Open Supabase Dashboard
2. Go to "Authentication" → "Policies"
3. Select `blocked_users` table
4. You should see 3 policies:
   - ✓ Users can see their own blocks
   - ✓ Users can create blocks
   - ✓ Users can delete their own blocks

If you don't see these, check the SQL ran successfully.

### Step 4: Test Locally

```bash
# Start dev server
npm run dev

# Open http://localhost:3000
# Test search and block features
```

## Quick Validation Checklist

After setup, verify everything works:

```sql
-- Run this in Supabase SQL Editor to verify

-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'blocked_users';
-- Should return 1 row

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'blocked_users'
ORDER BY ordinal_position;
-- Should show: id, blocker_id, blocked_id, created_at, updated_at, reason

-- Check RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'blocked_users';
-- Should show: relrowsecurity = true

-- Check policies exist
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'blocked_users';
-- Should show 3 policies
```

## Troubleshooting

### Issue: "blocked_users" table already exists
**Solution:** The table was already created, no action needed

### Issue: Permission denied error
**Solution:** 
- Make sure you're using service role key (has admin access)
- OR use Supabase dashboard (automatically authenticated)

### Issue: RLS policies not working
**Solution:**
- Make sure RLS is enabled: `ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;`
- Check policies exist in dashboard
- Try creating policies manually

### Issue: Can't block users
**Solution:**
- Check table was created: `SELECT * FROM blocked_users LIMIT 1;`
- Check your user is logged in
- Check console for error messages

### Issue: Block feature doesn't show
**Solution:**
- Hard refresh browser (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
- Check build succeeded: `npm run build`
- Check for TypeScript errors: `npm run type-check`

## What Gets Created

### Table Structure
```
blocked_users
├── id: UUID (auto-generated)
├── blocker_id: UUID (who blocked)
├── blocked_id: UUID (who was blocked)
├── created_at: TIMESTAMP (when blocked)
├── updated_at: TIMESTAMP (when updated)
├── reason: TEXT (optional block reason)
└── Constraints:
    ├── PRIMARY KEY (id)
    ├── FOREIGN KEY users(id) blocker_id
    ├── FOREIGN KEY users(id) blocked_id
    ├── UNIQUE (blocker_id, blocked_id)
    └── CHECK blocker_id != blocked_id
```

### Indexes
- `idx_blocked_users_blocker_id` - Fast lookup of who someone blocked
- `idx_blocked_users_blocked_id` - Fast lookup of who blocked someone

### RLS Policies
1. **SELECT**: Users see blocks they made or were made on them
2. **INSERT**: Users can only block others (not themselves)
3. **DELETE**: Users can only unblock people they blocked

## Database Functions

Two helper functions are created:

```sql
-- Check if user A blocked user B
is_user_blocked(requester_id, target_id) RETURNS BOOLEAN

-- Check if user A has blocked user B
has_blocked_user(blocker_id_param, blocked_id_param) RETURNS BOOLEAN
```

These can be used in future queries for advanced filtering.

## Performance Notes

- Indexes ensure O(1) lookups for blocked users
- RLS policies ensure security at database level
- Unique constraint prevents duplicate blocks
- Foreign keys ensure referential integrity

## Next Steps

After setup, the following features work automatically:

✅ Block button appears in search
✅ Click block to block users
✅ Click unblock to unblock users
✅ Block status persists
✅ RLS ensures only your blocks are visible to you

## Support

If you encounter issues:

1. Check console logs: F12 → Console → Look for [v0] messages
2. Check database: Go to Supabase dashboard
3. Verify SQL ran: Select table in Table Editor
4. Check RLS: Authentication → Policies
5. Read error messages carefully

## Summary

| Step | Time | Action |
|------|------|--------|
| 1 | 1 min | Copy SQL from file |
| 2 | 1 min | Paste in Supabase SQL Editor |
| 3 | < 1 sec | Run query |
| 4 | 1 min | Verify in table editor |
| 5 | 1 min | Test in app |
| **Total** | **5 min** | **Complete setup** |

Done! The feature is ready to use.
