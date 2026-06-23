# Supabase Setup Guide for Together App

## Prerequisites
- Supabase project created
- Project URL and API keys configured
- Environment variables set

## Database Schema Status

✅ **All tables have been created and configured:**

### Core Tables
- `users` - User profiles linked to auth.users
- `conversations` - Direct and group conversations
- `conversation_participants` - User-conversation mapping
- `messages` - Chat messages with whisper mode support
- `attachments` - File attachments for messages
- `follows` - User follow relationships

### Views (for easier querying)
- `user_stats` - Aggregated user statistics
- `conversation_last_message` - Last message per conversation
- `conversations_with_details` - Full conversation information

### Automatic Functions
- `update_updated_at_column()` - Auto-updates timestamps
- `soft_delete_whisper_messages()` - Soft-deletes whisper messages after 10s
- `search_users()` - Searches users by username/email

### Real-Time Enabled
- ✅ messages table
- ✅ conversations table
- ✅ follows table

---

## Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## How to Use the Database

### 1. Import Database Utilities
```typescript
import {
  getUserProfile,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  followUser,
  unfollowUser,
  subscribeToMessages
} from '@/lib/supabase/db-queries'
```

### 2. Fetch User Data
```typescript
// Get current user profile
const user = await getUserProfile(userId)

// Get user statistics
const stats = await getUserStats(userId)
console.log(`${stats.followers_count} followers`)
```

### 3. Fetch Conversations
```typescript
// Get all user's conversations
const conversations = await getUserConversations(userId)

// Get specific conversation
const conv = await getConversation(conversationId)
```

### 4. Send Messages
```typescript
// Send regular message
const message = await sendMessage(
  conversationId,
  userId,
  'Hello!',
  false,
  'text'
)

// Send whisper mode message (auto-deletes after 10s)
const whisperMsg = await sendMessage(
  conversationId,
  userId,
  'Secret message',
  true,
  'text'
)
```

### 5. Manage Follows
```typescript
// Follow a user
await followUser(currentUserId, targetUserId)

// Unfollow a user
await unfollowUser(currentUserId, targetUserId)

// Check if following
const following = await isFollowing(currentUserId, targetUserId)
```

### 6. Real-Time Subscriptions
```typescript
// Subscribe to new messages
const unsubscribe = subscribeToMessages(
  conversationId,
  (newMessage) => {
    console.log('New message:', newMessage)
    addMessage(newMessage) // Update UI
  },
  (updatedMessage) => {
    console.log('Message updated:', updatedMessage)
  },
  (deletedMessageId) => {
    console.log('Message deleted:', deletedMessageId)
  }
)

// Cleanup when component unmounts
return () => unsubscribe()
```

---

## User Authentication Flow

1. **Signup**: Creates auth.users record and inserts into users table
2. **Login**: Redirects to `/chat` (regular users) or `/admin` (admin)
3. **Auto-login**: Users are logged in immediately after signup (no email verification)

### Admin User
- Email: `sangamkunwar48@gmail.com`
- Redirects to `/admin` dashboard on login
- Can view all users and their conversations

---

## Security Notes

### Row Level Security (RLS)
All tables have RLS enabled with specific policies:

- **users**: Can view all, update own only
- **conversations**: Can see only conversations they're part of
- **messages**: Can send/receive only in conversations they're in
- **follows**: Can create/delete own follows only
- **attachments**: Can see only in their conversations

### Best Practices
1. Always use RLS - never bypass security
2. Never expose API keys in client code
3. Use `NEXT_PUBLIC_` prefix for public keys only
4. Validate all user inputs on backend
5. Use soft deletes (deleted_at field) instead of hard deletes

---

## Testing the Database

### Test Signup
```bash
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### Test Creating Direct Message
```javascript
// In browser console
const msg = await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'xxx',
    content: 'Hello!',
    whisperMode: false
  })
})
```

---

## Troubleshooting

### "RLS policy violation"
- Ensure user is authenticated
- Check if user is part of the conversation
- Verify RLS policies are set correctly

### "No connection to Supabase"
- Check NEXT_PUBLIC_SUPABASE_URL is correct
- Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is valid
- Check network connection and CORS settings

### "Messages not appearing in real-time"
- Verify real-time is enabled for messages table
- Check browser console for subscription errors
- Ensure message has deleted_at = NULL

### "Whisper messages not deleting"
- Manually call soft_delete_whisper_messages() function
- Or add it to a cron job in Vercel
- Check deleted_at timestamp in database

---

## Database Backups

### Manual Backup
1. Go to Supabase Dashboard
2. Project Settings → Backups
3. Click "Request a backup now"

### Automatic Backups
- Supabase includes daily backups (check Plan)
- Point-in-time recovery available

### Export Data
```bash
# Export specific table
pg_dump -h db.xxx.supabase.co -U postgres -d postgres -t messages > messages.sql
```

---

## Performance Optimization

### Current Indexes
- messages(conversation_id)
- messages(sender_id)
- messages(created_at)
- follows(follower_id)
- follows(following_id)

### Query Optimization Tips
1. Use `.limit()` for large result sets
2. Use `.select()` to only fetch needed columns
3. Create composite indexes for common filters
4. Use views for complex aggregations

### Monitoring
- Check Supabase Dashboard for slow queries
- Monitor real-time connection count
- Set up alerts for high query times

---

## Common Queries

### Get all conversations with last message
```sql
SELECT c.*, clm.content, clm.created_at
FROM conversations c
LEFT JOIN conversation_last_message clm ON c.id = clm.conversation_id
WHERE c.id IN (
  SELECT conversation_id FROM conversation_participants 
  WHERE user_id = 'user-uuid'
)
ORDER BY c.updated_at DESC;
```

### Get user's followers
```sql
SELECT u.* FROM users u
WHERE u.id IN (
  SELECT follower_id FROM follows 
  WHERE following_id = 'user-uuid'
);
```

### Count unread messages
```sql
SELECT COUNT(*) FROM messages
WHERE conversation_id = 'conv-uuid'
  AND created_at > 'last-read-timestamp'
  AND sender_id != 'current-user-uuid'
  AND deleted_at IS NULL;
```

---

## Next Steps

1. ✅ Database tables created
2. ✅ RLS policies configured
3. ✅ Real-time enabled
4. Test the signup flow
5. Test creating conversations
6. Test sending messages
7. Test real-time updates
8. Set up error logging
9. Add database monitoring

---

## Support

For issues:
1. Check Supabase Dashboard for errors
2. Review RLS policies in Security section
3. Check real-time status in API Docs
4. See Database Schema docs for table structure
5. Review db-queries.ts for implementation examples
