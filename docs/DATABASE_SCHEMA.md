# Together Messaging App - Database Schema

## Overview
Complete Supabase database schema for the Together messaging application with real-time chat, follows, and group messaging support.

## Tables

### 1. **users**
Stores user profile information linked to Supabase Auth.
```sql
- id (UUID) - Primary key, references auth.users(id)
- email (VARCHAR) - Unique email address
- username (VARCHAR) - Unique username
- avatar_url (TEXT) - Profile picture URL
- bio (TEXT) - User bio
- created_at (TIMESTAMP) - Account creation date
- updated_at (TIMESTAMP) - Last profile update
```

**RLS Policies:**
- SELECT: All users can view all profiles
- UPDATE: Users can only update their own profile
- INSERT: Users can only insert their own profile

---

### 2. **conversations**
Stores both direct message and group chat conversations.
```sql
- id (UUID) - Primary key
- conversation_type (VARCHAR) - 'direct' or 'group'
- group_name (VARCHAR) - Name for group chats
- group_avatar_url (TEXT) - Avatar for group chats
- relationship_type (VARCHAR) - 'girlfriend', 'boyfriend', 'bestfriend', 'others'
- group_category (VARCHAR) - 'girlfriend', 'bestfriend', 'family', 'others'
- created_by (UUID) - References users(id)
- created_at (TIMESTAMP) - Conversation creation date
- updated_at (TIMESTAMP) - Last activity
```

**RLS Policies:**
- SELECT: Users can only see conversations they participate in
- INSERT: Users can create conversations
- UPDATE: Only conversation creator can update

---

### 3. **conversation_participants**
Junction table linking users to conversations (many-to-many).
```sql
- id (UUID) - Primary key
- conversation_id (UUID) - References conversations(id)
- user_id (UUID) - References users(id)
- joined_at (TIMESTAMP) - When user joined conversation
- UNIQUE(conversation_id, user_id)
```

**RLS Policies:**
- SELECT: Users can only see their own participation records
- INSERT: Only conversation creator can add participants

---

### 4. **messages**
Stores all chat messages with support for whisper mode and soft deletes.
```sql
- id (UUID) - Primary key
- conversation_id (UUID) - References conversations(id)
- sender_id (UUID) - References users(id)
- content (TEXT) - Message text
- message_type (VARCHAR) - 'text', 'image', 'video', 'file', 'call'
- whisper_mode (BOOLEAN) - Auto-delete after 10 seconds if true
- created_at (TIMESTAMP) - Message sent time
- updated_at (TIMESTAMP) - Last edit time
- deleted_at (TIMESTAMP) - Soft delete timestamp (NULL = not deleted)
```

**Indexes:**
- conversation_id (for fast lookup of conversation messages)
- sender_id (for user message history)
- created_at (for chronological sorting)

**RLS Policies:**
- SELECT: Users can see messages in conversations they participate in
- INSERT: Users can only send messages to conversations they're in
- UPDATE: Users can only update their own messages
- DELETE: Users can only delete their own messages

---

### 5. **attachments**
Stores file attachments associated with messages.
```sql
- id (UUID) - Primary key
- message_id (UUID) - References messages(id)
- file_name (VARCHAR) - Original filename
- file_url (TEXT) - URL to stored file (typically Vercel Blob or S3)
- file_type (VARCHAR) - MIME type
- file_size (INTEGER) - File size in bytes
- created_at (TIMESTAMP) - Upload time
```

**RLS Policies:**
- SELECT: Users can see attachments in their conversations

---

### 6. **follows**
Tracks user follow relationships for social features.
```sql
- id (UUID) - Primary key
- follower_id (UUID) - References users(id) - user who follows
- following_id (UUID) - References users(id) - user being followed
- created_at (TIMESTAMP) - Follow date
- UNIQUE(follower_id, following_id)
- CHECK (follower_id != following_id)
```

**Indexes:**
- follower_id (find who this user follows)
- following_id (find this user's followers)

**RLS Policies:**
- SELECT: All follows are public
- INSERT: Users can only create follows as themselves
- DELETE: Users can only unfollow themselves

---

## Views

### 1. **user_stats**
Provides aggregated statistics for each user.
```sql
SELECT:
- id, username, email
- followers_count
- following_count
- conversation_count
- created_at
```

### 2. **conversation_last_message**
Retrieves the most recent message in each conversation efficiently.
```sql
SELECT:
- conversation_id
- id, sender_id, content, message_type, created_at
```

### 3. **conversations_with_details**
Full conversation information with all related data.
```sql
SELECT:
- All conversation fields
- participant_count
- last_message_content
- last_message_at
```

---

## Functions

### 1. **update_updated_at_column()**
Automatically updates the `updated_at` timestamp when records are modified.
**Triggers:** users, conversations, messages

### 2. **soft_delete_whisper_messages()**
Function to soft-delete whisper messages after 10 seconds.
Can be called via cron job or client-side timer.

### 3. **search_users(search_term TEXT)**
Searches users by username or email (case-insensitive).
**Parameters:** search_term (string)
**Returns:** User list with stats limited to 10 results

---

## Real-Time Subscriptions

Enabled for real-time updates via Supabase subscriptions:
- **messages** - New messages appear instantly
- **conversations** - Conversation updates sync in real-time
- **follows** - Follow/unfollow actions update immediately

---

## Security Notes

1. **Row Level Security (RLS)** is enabled on all tables
2. Users can only access their own data except:
   - Profile viewing is public
   - Follows are public
3. Soft deletes preserve message history while hiding content
4. Messages are scoped to conversation participants
5. Admin user (sangamkunwar48@gmail.com) has no special DB-level access (managed via app)

---

## Usage Examples

### Fetch User's Conversations
```javascript
const { data: conversations } = await supabase
  .from('conversations')
  .select(`
    id, conversation_type, group_name,
    conversation_participants!inner(user_id),
    messages(id, content, sender_id, created_at)
  `)
  .order('created_at', { ascending: false })
```

### Send Message with Real-Time Sync
```javascript
await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: 'Hello!',
    message_type: 'text',
    whisper_mode: false
  })
  .select()

// Subscribe to new messages
supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => console.log('New message:', payload)
  )
  .subscribe()
```

### Check if User Follows Someone
```javascript
const { data: follow } = await supabase
  .from('follows')
  .select('*')
  .eq('follower_id', currentUserId)
  .eq('following_id', targetUserId)
  .single()
```

---

## Maintenance

### Regular Tasks
1. Monitor soft-deleted messages (deleted_at IS NOT NULL)
2. Archive old conversations (> 1 year inactive)
3. Clean up orphaned attachments
4. Monitor storage usage for file attachments

### Backup Strategy
- Supabase automatic backups (check project settings)
- Consider weekly exports of critical tables
- Test restore procedures monthly

---

## Performance Optimization

- Indexes on frequently queried foreign keys
- Views for common aggregations
- RLS policies optimized for single-user queries
- Messages table has chronological index
- Consider pagination (LIMIT/OFFSET) for large result sets
