# Messages Website - Database Schema

## Overview

This document describes the complete database schema for the Messages website built with Supabase and Next.js. All tables have Row Level Security (RLS) enabled to protect user data.

---

## Tables

### 1. **users**
Stores user profile information, extending Supabase's auth.users table.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
  email TEXT NOT NULL UNIQUE
  username TEXT NOT NULL UNIQUE
  avatar_url TEXT
  bio TEXT
  status TEXT DEFAULT 'online'
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Usage:**
- Stores user profile details
- Auto-created via trigger when user signs up
- Users can only update their own profile (RLS)

---

### 2. **conversations**
Stores both direct message conversations and group conversations.

```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_type TEXT NOT NULL ('direct' | 'group')
  group_name TEXT
  group_avatar_url TEXT
  group_description TEXT
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Usage:**
- `conversation_type`: Either 'direct' for 1-on-1 or 'group' for group chats
- Only group conversations have `group_name`, `group_avatar_url`, `group_description`
- Users can only view conversations they are participants in (RLS)

---

### 3. **conversation_participants**
Maps users to conversations (many-to-many relationship).

```sql
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  muted BOOLEAN DEFAULT FALSE
  archived BOOLEAN DEFAULT FALSE
  UNIQUE(conversation_id, user_id)
)
```

**Usage:**
- Tracks which users are part of each conversation
- `muted`: User muted notifications for this conversation
- `archived`: User archived this conversation from their view
- Each user-conversation pair is unique

---

### 4. **messages**
Stores all messages sent in conversations.

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL
  content TEXT
  message_type TEXT NOT NULL DEFAULT 'text' ('text' | 'image' | 'video' | 'file' | 'call')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  deleted_at TIMESTAMP WITH TIME ZONE
  edited BOOLEAN DEFAULT FALSE
)
```

**Usage:**
- Stores all message types: text, images, videos, files, and call records
- `deleted_at`: Soft delete - message is marked but not removed
- `edited`: Tracks if message was edited
- Users can only send to conversations they're part of (RLS)
- Users can only edit/delete their own messages (RLS)

---

### 5. **attachments**
Stores file attachments associated with messages.

```sql
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE
  file_url TEXT NOT NULL
  file_name TEXT NOT NULL
  file_type TEXT NOT NULL
  file_size BIGINT
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Usage:**
- Linked to messages via `message_id`
- `file_url`: Vercel Blob storage URL
- `file_size`: Size in bytes
- Multiple attachments can be on one message
- Users can only upload to their own messages (RLS)

---

### 6. **calls**
Stores call history and metadata.

```sql
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE
  initiator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL
  call_type TEXT NOT NULL ('audio' | 'video')
  duration_seconds INTEGER
  status TEXT DEFAULT 'initiated' ('initiated' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined')
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  ended_at TIMESTAMP WITH TIME ZONE
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Usage:**
- Tracks audio and video calls within conversations
- `duration_seconds`: How long the call lasted
- `status`: Current state of the call
- Users can only view/initiate calls in their conversations (RLS)

---

## Views

### **user_conversations**
Provides a user's conversations with latest message and unread count.

**Returns:**
- All conversation details for the current user
- Last message content and metadata
- Unread message count
- List of other participants

**Usage:**
```typescript
const { data } = await supabase
  .from('user_conversations')
  .select('*')
  .order('last_message_at', { ascending: false });
```

---

### **conversation_details**
Provides full conversation details including all participants.

**Returns:**
- Conversation metadata
- Array of all participants with their info

**Usage:**
```typescript
const { data } = await supabase
  .from('conversation_details')
  .select('*')
  .eq('id', conversationId)
  .single();
```

---

## Stored Procedures

### **get_or_create_direct_conversation(other_user_id)**
Gets or creates a direct message conversation between two users.

**Parameters:**
- `other_user_id`: UUID of the other user

**Returns:**
- UUID of the conversation

**Usage:**
```typescript
const { data, error } = await supabase
  .rpc('get_or_create_direct_conversation', { other_user_id: userId });
```

---

## Indexes

All tables have indexes on frequently queried columns for optimal performance:

- `idx_conversations_created_by` - Filter conversations by creator
- `idx_conversation_participants_user_id` - Find conversations for a user
- `idx_conversation_participants_conversation_id` - Find participants in conversation
- `idx_messages_conversation_id` - Find messages in a conversation
- `idx_messages_sender_id` - Find messages from a sender
- `idx_messages_created_at` - Sort messages by date
- `idx_attachments_message_id` - Find attachments for a message
- `idx_calls_conversation_id` - Find calls in a conversation
- `idx_calls_initiator_id` - Find calls initiated by a user
- `idx_users_email` - Look up users by email
- `idx_users_username` - Look up users by username

---

## Row Level Security (RLS) Policies

All tables have RLS enabled. Here's a summary of the security model:

### **users**
- ✅ SELECT: Anyone can view user profiles (for mentions, contacts, etc.)
- ✅ UPDATE: Users can only update their own profile
- ✅ INSERT: Users can only create their own profile
- ❌ DELETE: Handled via auth cascade

### **conversations**
- ✅ SELECT: Users can only view conversations they're part of
- ✅ INSERT: Creators can create conversations
- ✅ UPDATE: Creators can update their conversations
- ❌ DELETE: Cascade from participants

### **conversation_participants**
- ✅ SELECT: Users can view participants in their conversations
- ✅ INSERT: Users can join conversations
- ✅ UPDATE: Users can update their own participant record (mute, archive)
- ✅ DELETE: Users can remove themselves from conversations

### **messages**
- ✅ SELECT: Users can view messages in their conversations
- ✅ INSERT: Users can send messages to their conversations
- ✅ UPDATE: Users can edit their own messages
- ✅ DELETE: Users can delete (soft delete) their own messages

### **attachments**
- ✅ SELECT: Users can view attachments in their conversations
- ✅ INSERT: Users can upload attachments to their messages
- ❌ DELETE: Cascade from messages

### **calls**
- ✅ SELECT: Users can view calls in their conversations
- ✅ INSERT: Users can initiate calls in their conversations
- ✅ UPDATE: Conversation participants can update call status

---

## Triggers

### **on_auth_user_created**
Automatically creates a user record in `public.users` when a new user signs up.

**Functionality:**
- Runs after INSERT on `auth.users`
- Creates corresponding row in `public.users`
- Generates username from email or metadata
- Sets avatar_url from metadata if provided

---

## Common Queries

### Get user's conversations
```typescript
const { data } = await supabase
  .from('user_conversations')
  .select('*')
  .order('last_message_at', { ascending: false });
```

### Get messages in a conversation
```typescript
const { data } = await supabase
  .from('messages')
  .select(`
    *,
    sender:sender_id(id, username, avatar_url),
    attachments(*)
  `)
  .eq('conversation_id', conversationId)
  .is('deleted_at', null)
  .order('created_at', { ascending: true });
```

### Send a message with attachment
```typescript
// Create message
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: 'Hello',
    message_type: 'text'
  })
  .select()
  .single();

// Add attachment
await supabase
  .from('attachments')
  .insert({
    message_id: message.id,
    file_url: blobUrl,
    file_name: 'image.jpg',
    file_type: 'image/jpeg',
    file_size: 1024
  });
```

### Start a direct conversation
```typescript
const { data, error } = await supabase
  .rpc('get_or_create_direct_conversation', { 
    other_user_id: otherUserId 
  });
```

---

## Real-time Features

Subscribe to real-time updates:

```typescript
// Listen for new messages in a conversation
supabase
  .channel(`messages:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```

---

## Environment Variables

The following Supabase environment variables are required:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for server-side operations)

These are automatically set up when you connect Supabase to your v0 project.

---

## Notes

1. **Auto User Sync**: When users sign up via Supabase auth, their profile is automatically created via the `on_auth_user_created` trigger.

2. **Soft Deletes**: Messages use soft deletes (`deleted_at` field) rather than hard deletes to preserve conversation history.

3. **Unread Count**: Calculated dynamically based on message timestamps and when user joined the conversation.

4. **Security First**: All data access is protected by RLS policies - users cannot see other users' private conversations or messages.

5. **Real-time Ready**: The schema supports Supabase's real-time subscriptions for live message updates.

6. **Scalable**: Indexes are strategically placed on frequently queried columns for optimal performance as data grows.

---

## Database Setup Summary

✅ All 6 tables created
✅ RLS enabled on all tables
✅ 22 security policies configured
✅ 10 performance indexes added
✅ 2 helpful views created
✅ 1 stored procedure for direct messages
✅ Auto-sync trigger for user creation

Your messaging database is now ready to use!
