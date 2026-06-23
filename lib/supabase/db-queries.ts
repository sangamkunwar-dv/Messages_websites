import { createClient } from './client'
import { Conversation, Message, User } from '../store/chat-store'

const supabase = createClient()

/**
 * User Queries
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getUserStats(userId: string) {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function searchUsers(query: string) {
  const { data, error } = await supabase
    .rpc('search_users', { search_term: query })

  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Conversation Queries
 */
export async function getUserConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations_with_details')
    .select(`
      *,
      conversation_participants!inner(user_id)
    `)
    .filter('conversation_participants.user_id', 'eq', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getConversation(conversationId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      conversation_participants(user_id, users!inner(*))
    `)
    .eq('id', conversationId)
    .single()

  if (error) throw error
  return data
}

export async function createDirectConversation(userId1: string, userId2: string) {
  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId1)

  if (existing) {
    for (const p of existing) {
      const { data: otherParticipant } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', p.conversation_id)
        .eq('user_id', userId2)
        .single()

      if (otherParticipant) {
        return p.conversation_id
      }
    }
  }

  // Create new conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      conversation_type: 'direct',
      created_by: userId1,
    })
    .select()
    .single()

  if (convError) throw convError

  // Add participants
  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conversation.id, user_id: userId1 },
      { conversation_id: conversation.id, user_id: userId2 },
    ])

  if (partError) throw partError

  return conversation.id
}

export async function createGroupConversation(
  name: string,
  userId: string,
  participantIds: string[],
  relationshipType?: string,
  groupCategory?: string
) {
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      conversation_type: 'group',
      group_name: name,
      created_by: userId,
      relationship_type: relationshipType,
      group_category: groupCategory,
    })
    .select()
    .single()

  if (convError) throw convError

  // Add all participants including creator
  const allParticipants = [
    ...new Set([userId, ...participantIds]), // Remove duplicates
  ]

  const participantData = allParticipants.map((id) => ({
    conversation_id: conversation.id,
    user_id: id,
  }))

  // Insert participants in batches to avoid issues
  const batchSize = 5
  for (let i = 0; i < participantData.length; i += batchSize) {
    const batch = participantData.slice(i, i + batchSize)
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(batch)

    if (partError) throw partError
  }

  return conversation.id
}

/**
 * Message Queries
 */
export async function getConversationMessages(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      users!sender_id(*),
      attachments(*)
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error

  return data.map((msg: any) => ({
    ...msg,
    sender: msg.users,
  }))
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  whisperMode = false,
  messageType = 'text'
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      whisper_mode: whisperMode,
      message_type: messageType,
    })
    .select(`
      *,
      users!sender_id(*),
      attachments(*)
    `)
    .single()

  if (error) throw error

  return {
    ...data,
    sender: data.users,
  }
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) throw error
}

export async function addAttachment(
  messageId: string,
  fileName: string,
  fileUrl: string,
  fileType: string,
  fileSize?: number
) {
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      message_id: messageId,
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileType,
      file_size: fileSize,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Follow Queries
 */
export async function followUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId,
    })

  if (error) throw error
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) throw error
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which is expected
    throw error
  }

  return !!data
}

/**
 * Subscription Setup
 */
export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: any) => void,
  onUpdate: (message: any) => void,
  onDelete: (messageId: string) => void
) {
  const channel = supabase.channel(`messages:${conversationId}`)

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onInsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onUpdate(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onDelete(payload.old.id)
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}

export function subscribeToFollows(
  userId: string,
  onInsert: (follow: any) => void,
  onDelete: (followId: string) => void
) {
  const channel = supabase.channel(`follows:${userId}`)

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'follows',
        filter: `follower_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'follows',
        filter: `follower_id=eq.${userId}`,
      },
      (payload) => {
        onDelete(payload.old.id)
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}

/**
 * Subscribe to conversation updates (group name, avatar, settings)
 */
export function subscribeToConversations(
  conversationId: string,
  onUpdate: (conversation: any) => void
) {
  const channel = supabase.channel(`conversations:${conversationId}`)

  channel
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`,
      },
      (payload) => {
        onUpdate(payload.new)
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}

/**
 * Subscribe to new conversation participants
 */
export function subscribeToParticipants(
  conversationId: string,
  onInsert: (participant: any) => void,
  onDelete: (participantId: string) => void
) {
  const channel = supabase.channel(`participants:${conversationId}`)

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onInsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onDelete(payload.old.id)
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}
