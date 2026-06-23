# Supabase API Examples for Messages Website

This file contains common patterns and examples for working with the messages database.

---

## Authentication Setup

### Client-side (Browser)
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server-side
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

---

## User Management

### Get Current User
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
console.log(user?.id) // UUID
```

### Get User Profile
```typescript
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

console.log(profile)
// {
//   id: 'uuid',
//   email: 'user@example.com',
//   username: 'john_doe',
//   avatar_url: 'https://...',
//   bio: 'My bio',
//   status: 'online',
//   created_at: '2024-06-20T...'
// }
```

### Update User Profile
```typescript
const { data: updated } = await supabase
  .from('users')
  .update({
    username: 'new_username',
    bio: 'Updated bio',
    avatar_url: 'https://...'
  })
  .eq('id', userId)
  .select()
  .single()
```

### Search Users
```typescript
const { data: users } = await supabase
  .from('users')
  .select('id, username, avatar_url, email')
  .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
  .limit(10)
```

---

## Conversations

### Get User's Conversations
```typescript
const { data: conversations } = await supabase
  .from('user_conversations')
  .select('*')
  .order('last_message_at', { ascending: false })

conversations?.forEach(conv => {
  console.log({
    id: conv.id,
    type: conv.conversation_type,
    name: conv.group_name || conv.participants?.[0]?.username,
    lastMessage: conv.last_message_content,
    unreadCount: conv.unread_count
  })
})
```

### Get Conversation Details
```typescript
const { data: conversation } = await supabase
  .from('conversation_details')
  .select('*')
  .eq('id', conversationId)
  .single()

console.log({
  participants: conversation.participants,
  type: conversation.conversation_type,
  groupName: conversation.group_name
})
```

### Create Group Conversation
```typescript
const { data: conversation } = await supabase
  .from('conversations')
  .insert({
    conversation_type: 'group',
    group_name: 'Team Chat',
    group_avatar_url: 'https://...',
    group_description: 'Discussion for team',
    created_by: userId
  })
  .select()
  .single()

// Add participants
const participantIds = ['user1', 'user2', 'user3', userId]
await supabase
  .from('conversation_participants')
  .insert(
    participantIds.map(id => ({
      conversation_id: conversation.id,
      user_id: id
    }))
  )
```

### Get or Create Direct Conversation
```typescript
// Use the stored procedure
const { data: conversationId, error } = await supabase
  .rpc('get_or_create_direct_conversation', {
    other_user_id: otherUserId
  })

if (error) throw error
console.log('Conversation ID:', conversationId)
```

### Leave Conversation
```typescript
const { error } = await supabase
  .from('conversation_participants')
  .delete()
  .eq('conversation_id', conversationId)
  .eq('user_id', userId)
```

### Archive/Mute Conversation
```typescript
// Mute conversation
await supabase
  .from('conversation_participants')
  .update({ muted: true })
  .eq('conversation_id', conversationId)
  .eq('user_id', userId)

// Archive conversation
await supabase
  .from('conversation_participants')
  .update({ archived: true })
  .eq('conversation_id', conversationId)
  .eq('user_id', userId)
```

---

## Messages

### Get Messages in Conversation
```typescript
const { data: messages } = await supabase
  .from('messages')
  .select(`
    id,
    content,
    message_type,
    created_at,
    edited,
    sender:sender_id(id, username, avatar_url),
    attachments(*)
  `)
  .eq('conversation_id', conversationId)
  .is('deleted_at', null)
  .order('created_at', { ascending: true })
  .limit(50)

messages?.forEach(msg => {
  console.log({
    from: msg.sender.username,
    text: msg.content,
    attachments: msg.attachments,
    timestamp: msg.created_at
  })
})
```

### Send Text Message
```typescript
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: 'Hello, how are you?',
    message_type: 'text'
  })
  .select(`
    *,
    sender:sender_id(id, username, avatar_url)
  `)
  .single()
```

### Send Message with File Attachment
```typescript
// 1. Upload file to Vercel Blob
const formData = new FormData()
formData.append('file', file)
const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
})
const { url: fileUrl } = await uploadResponse.json()

// 2. Create message
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: file.name,
    message_type: 'image' // or 'video', 'file'
  })
  .select()
  .single()

// 3. Add attachment record
await supabase
  .from('attachments')
  .insert({
    message_id: message.id,
    file_url: fileUrl,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size
  })
```

### Edit Message
```typescript
const { data: updated } = await supabase
  .from('messages')
  .update({
    content: 'Updated message text',
    edited: true,
    updated_at: new Date().toISOString()
  })
  .eq('id', messageId)
  .eq('sender_id', userId) // Ensure user owns message
  .select()
  .single()
```

### Delete Message (Soft Delete)
```typescript
const { data: deleted } = await supabase
  .from('messages')
  .update({
    deleted_at: new Date().toISOString()
  })
  .eq('id', messageId)
  .eq('sender_id', userId) // Ensure user owns message
  .select()
  .single()
```

### Search Messages
```typescript
const { data: results } = await supabase
  .from('messages')
  .select(`
    id,
    content,
    created_at,
    sender:sender_id(username)
  `)
  .eq('conversation_id', conversationId)
  .ilike('content', `%${searchTerm}%`)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

---

## Attachments

### Get Message Attachments
```typescript
const { data: attachments } = await supabase
  .from('attachments')
  .select('*')
  .eq('message_id', messageId)
```

### Download Attachment
```typescript
// Just use the file_url directly
const attachment = attachments[0]
const link = document.createElement('a')
link.href = attachment.file_url
link.download = attachment.file_name
link.click()
```

### Delete Attachment
```typescript
// Attachment is auto-deleted when message is deleted
// But you can manually delete:
await supabase
  .from('attachments')
  .delete()
  .eq('id', attachmentId)
```

---

## Calls

### Start a Call
```typescript
const { data: call } = await supabase
  .from('calls')
  .insert({
    conversation_id: conversationId,
    initiator_id: userId,
    call_type: 'video' // or 'audio'
  })
  .select()
  .single()

console.log('Call started:', call.id)
```

### Update Call Status
```typescript
const { data: updated } = await supabase
  .from('calls')
  .update({
    status: 'connected' // or 'ended', 'missed', 'declined'
  })
  .eq('id', callId)
  .select()
  .single()
```

### End Call
```typescript
const callDuration = Math.floor((Date.now() - callStartTime) / 1000)

await supabase
  .from('calls')
  .update({
    status: 'ended',
    ended_at: new Date().toISOString(),
    duration_seconds: callDuration
  })
  .eq('id', callId)
```

### Get Call History
```typescript
const { data: calls } = await supabase
  .from('calls')
  .select(`
    *,
    initiator:initiator_id(username)
  `)
  .eq('conversation_id', conversationId)
  .order('started_at', { ascending: false })
```

---

## Real-time Subscriptions

### Subscribe to New Messages
```typescript
const subscription = supabase
  .channel(`messages:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    async (payload) => {
      // Fetch full message with relations
      const { data: message } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, username, avatar_url),
          attachments(*)
        `)
        .eq('id', payload.new.id)
        .single()
      
      console.log('New message:', message)
    }
  )
  .subscribe()

// Cleanup
subscription.unsubscribe()
```

### Subscribe to Conversation Changes
```typescript
const subscription = supabase
  .channel(`conversations:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'conversation_participants',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('Participants changed:', payload)
    }
  )
  .subscribe()
```

### Subscribe to User Status
```typescript
const subscription = supabase
  .channel('user_status')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'users'
    },
    (payload) => {
      console.log('User status updated:', payload.new)
    }
  )
  .subscribe()
```

---

## Error Handling

### Safe Query Pattern
```typescript
try {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)

  if (error) {
    if (error.code === 'PGRST116') {
      console.error('Not found')
    } else if (error.code === '42501') {
      console.error('Permission denied (RLS)')
    } else {
      console.error('Database error:', error.message)
    }
    return null
  }

  return data
} catch (err) {
  console.error('Unexpected error:', err)
  return null
}
```

---

## Performance Tips

### 1. Use Pagination
```typescript
const pageSize = 20
const page = 0

const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .range(page * pageSize, (page + 1) * pageSize - 1)
  .order('created_at', { ascending: false })
```

### 2. Only Select Needed Columns
```typescript
// ❌ Bad - fetches all columns
const { data } = await supabase.from('messages').select('*')

// ✅ Good - fetch only needed columns
const { data } = await supabase
  .from('messages')
  .select('id, content, created_at, sender_id')
```

### 3. Batch Operations
```typescript
// Add multiple participants at once
await supabase
  .from('conversation_participants')
  .insert(
    userIds.map(id => ({
      conversation_id: conversationId,
      user_id: id
    }))
  )
```

### 4. Cache with SWR
```typescript
import useSWR from 'swr'

const fetcher = async (key: string) => {
  const { data, error } = await supabase
    .from(key.split(':')[0])
    .select('*')
    .eq('id', key.split(':')[1])

  if (error) throw error
  return data
}

const { data: messages } = useSWR(
  `messages:${conversationId}`,
  fetcher,
  { revalidateOnFocus: false }
)
```

---

## Common Issues & Solutions

### Issue: "Permission denied" error
**Solution:** Ensure RLS policies are correct and user is part of the conversation

### Issue: User not auto-created after signup
**Solution:** Check that the `on_auth_user_created` trigger exists and is enabled

### Issue: Real-time updates not working
**Solution:** Ensure you're subscribed to the correct channel and table

### Issue: Soft-deleted messages still appear
**Solution:** Always filter with `.is('deleted_at', null)` in queries

---

## Schema Relationships

```
auth.users
    ↓ (foreign key)
public.users (id)
    ├── conversations (created_by)
    ├── conversation_participants (user_id)
    ├── messages (sender_id)
    └── calls (initiator_id)

conversations
    ├── conversation_participants (conversation_id)
    ├── messages (conversation_id)
    └── calls (conversation_id)

messages
    ├── attachments (message_id)
    └── conversation_participants (via conversation_id)
```

---

## Next Steps

1. Review `DATABASE_SCHEMA.md` for complete schema documentation
2. Implement these patterns in your API routes and components
3. Set up real-time subscriptions for live features
4. Add error handling and loading states
5. Test RLS policies with different user accounts
