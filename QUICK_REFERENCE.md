# Together App - Quick Reference Guide

## 🚀 Quick Start

### 1. Import Database Functions
```typescript
import {
  getUserProfile,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  followUser,
  subscribeToMessages
} from '@/lib/supabase/db-queries'
```

### 2. Common Operations

#### Get Current User
```typescript
const user = await getUserProfile(userId)
console.log(user.username, user.email)
```

#### Get All Conversations
```typescript
const convs = await getUserConversations(userId)
convs.forEach(c => console.log(c.group_name || 'Direct'))
```

#### Send a Message
```typescript
const msg = await sendMessage(
  conversationId,
  userId,
  'Hello!',
  false,  // whisper mode
  'text'  // message type
)
```

#### Send Whisper Message (Auto-delete after 10s)
```typescript
await sendMessage(
  conversationId,
  userId,
  'Secret message',
  true,  // whisper mode enabled
  'text'
)
```

#### Get Messages in Conversation
```typescript
const messages = await getConversationMessages(conversationId, 50)
messages.forEach(m => console.log(m.sender.username, ':', m.content))
```

#### Follow a User
```typescript
await followUser(currentUserId, targetUserId)
```

#### Check if Following
```typescript
const following = await isFollowing(currentUserId, targetUserId)
if (following) console.log('Already following!')
```

#### Real-Time Message Updates
```typescript
const unsubscribe = subscribeToMessages(
  conversationId,
  (newMessage) => {
    console.log('New message from', newMessage.sender.username)
    // Update UI here
  },
  (updated) => console.log('Message edited'),
  (deletedId) => console.log('Message deleted')
)

// Cleanup when done
return () => unsubscribe()
```

---

## 📊 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | User profiles | id, email, username, avatar_url |
| **conversations** | Chat conversations | id, conversation_type (direct/group), group_name |
| **conversation_participants** | User-conversation mapping | conversation_id, user_id |
| **messages** | Chat messages | id, content, whisper_mode, deleted_at |
| **attachments** | File attachments | message_id, file_url, file_type |
| **follows** | Follow relationships | follower_id, following_id |

---

## 🔐 Important Security Notes

1. **All queries must filter by current user** (RLS handles this)
2. **No hardcoded user IDs** - always use auth.uid()
3. **Whisper messages delete client-side** and server-side
4. **Soft deletes** - messages use deleted_at, not actual deletion
5. **RLS is active** - unauthorized queries will fail silently

---

## 🎨 Group Conversation Types

```typescript
// Girlfriend group
await createGroupConversation(
  'My Gf',
  userId,
  [userId2],
  'girlfriend',  // relationship_type
  'girlfriend'   // group_category for pink theme
)

// Bestfriend group
await createGroupConversation(
  'Squad',
  userId,
  [userId2, userId3],
  'bestfriend',
  'bestfriend'   // for cyan/teal theme
)
```

---

## 💬 Message Types

```typescript
'text'    // Regular text message
'image'   // Image attachment
'video'   // Video attachment
'file'    // Generic file
'call'    // Call initiated
```

---

## ⚡ Real-Time Events

```typescript
// Subscribe to new messages
supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => handleNewMessage(payload.new)
  )
  .subscribe()

// Subscribe to follows
supabase
  .channel(`follows:${userId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'follows' },
    (payload) => console.log('Followed:', payload.new)
  )
  .subscribe()
```

---

## 🔍 Search & Query

```typescript
// Search users
const results = await searchUsers('john')
// Returns: { id, username, email, avatar_url, followers_count, ... }

// Get user statistics
const stats = await getUserStats(userId)
// Returns: { id, username, followers_count, following_count, conversation_count, ... }

// Get specific conversation
const conv = await getConversation(conversationId)
// Returns: full conversation with participants
```

---

## 🎯 Admin Dashboard

Admin user: `sangamkunwar48@gmail.com`

Admin features (in `/admin`):
- View all users table
- See user statistics (followers, following, conversation count)
- "View Chat" button to open direct conversation
- User search functionality

---

## 🛠️ Environment Variables

```env
# Required in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## ⚠️ Common Mistakes

❌ **Wrong:** Hardcoding user IDs
```typescript
const userId = '123abc'  // DON'T DO THIS
```

✅ **Right:** Get from auth
```typescript
const { data: { user } } = await supabase.auth.getUser()
const userId = user?.id
```

❌ **Wrong:** Querying all messages
```typescript
const msgs = await supabase.from('messages').select('*')  // Too much data
```

✅ **Right:** Use helpers with limits
```typescript
const msgs = await getConversationMessages(conversationId, 50)
```

❌ **Wrong:** Hard delete messages
```typescript
await supabase.from('messages').delete().eq('id', msgId)
```

✅ **Right:** Soft delete
```typescript
await supabase
  .from('messages')
  .update({ deleted_at: new Date() })
  .eq('id', msgId)
```

---

## 🧪 Testing

### Create Test User
```javascript
// In signup form
username: "testuser"
email: "test@example.com"
password: "Test123!@"
```

### Create Test Conversation
```typescript
const convId = await createDirectConversation(user1Id, user2Id)
```

### Send Test Message
```typescript
await sendMessage(convId, user1Id, 'Hello from test!')
```

### Test Real-Time
```typescript
// In one client
subscribeToMessages(convId, (msg) => console.log('Received:', msg))

// In another client
sendMessage(convId, user2Id, 'Should appear in first client')
```

---

## 📱 UI Components Integration

### Chat Window
```typescript
useEffect(() => {
  loadMessages(conversationId)
  
  const unsubscribe = subscribeToMessages(
    conversationId,
    (newMsg) => addMessage(newMsg),  // Add to UI
    (updated) => updateMessage(updated),
    (deleted) => removeMessage(deleted)
  )
  
  return unsubscribe
}, [conversationId])
```

### Follow Button
```typescript
const [following, setFollowing] = useState(false)

useEffect(() => {
  const isFollowing = await isFollowing(userId, targetId)
  setFollowing(isFollowing)
}, [targetId])

const handleFollow = async () => {
  await followUser(userId, targetId)
  setFollowing(true)  // Instant update
}
```

### Message Input
```typescript
const handleSend = async (e) => {
  e.preventDefault()
  const msg = await sendMessage(
    conversationId,
    userId,
    content,
    whisperMode,
    'text'
  )
  addMessage(msg)
  setContent('')
}
```

---

## 🆘 Debugging

### Check User is Authenticated
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user?.id)
```

### Check RLS Policies
```typescript
// If query returns empty but should have data, RLS is blocking
// Check Supabase Dashboard > SQL Editor > User Policies
```

### Monitor Real-Time
```typescript
supabase
  .channel('debug')
  .on('system', { event: 'error' }, (e) => console.error('RT Error:', e))
  .on('system', { event: 'status' }, (e) => console.log('RT Status:', e))
  .subscribe()
```

### Check Message Timestamps
```typescript
console.log(new Date(message.created_at))  // Check creation time
console.log(new Date(message.updated_at))  // Check last edit
console.log(message.deleted_at)            // Check if deleted
```

---

## 📚 Full Documentation

- **DATABASE_SCHEMA.md** - Complete table specifications
- **SUPABASE_SETUP.md** - Setup instructions and examples
- **lib/supabase/types.ts** - All TypeScript interfaces
- **lib/supabase/db-queries.ts** - 20+ helper functions

---

## 🚦 Status Dashboard

```
✅ Users Table        - Ready
✅ Conversations      - Ready
✅ Messages           - Ready
✅ Real-Time Sync     - Ready
✅ Whisper Mode       - Ready
✅ Follow System      - Ready
✅ Search             - Ready
✅ Admin Panel        - Ready
✅ RLS Security       - Ready
```

---

## 💡 Pro Tips

1. **Batch queries** - Use `.limit()` to reduce data transfer
2. **Cache user data** - Store in Zustand to avoid repeated queries
3. **Optimize subscriptions** - Only subscribe to needed channels
4. **Use soft deletes** - Never hard delete for audit trail
5. **Test RLS** - Check policies in Supabase console

---

## 🆘 Need Help?

1. Check **DATABASE_SCHEMA.md** for table details
2. Review **db-queries.ts** for function signatures
3. Check Supabase Dashboard for errors
4. Review browser console for RLS violations
5. Test with direct SQL in Supabase SQL Editor

---

**Database Setup Complete! Start building! 🚀**
