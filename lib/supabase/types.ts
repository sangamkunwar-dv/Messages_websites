/**
 * Database Types for Together App
 * Generated from Supabase schema
 */

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'call'
export type ConversationType = 'direct' | 'group'
export type RelationshipType = 'girlfriend' | 'boyfriend' | 'bestfriend' | 'others'
export type GroupCategory = 'girlfriend' | 'bestfriend' | 'family' | 'others'

/**
 * Users Table
 */
export interface User {
  id: string
  email: string
  username: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

/**
 * Conversations Table
 */
export interface Conversation {
  id: string
  conversation_type: ConversationType
  group_name: string | null
  group_avatar_url: string | null
  relationship_type: RelationshipType | null
  group_category: GroupCategory | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Conversation with full details (view)
 */
export interface ConversationWithDetails extends Conversation {
  participant_count: number
  last_message_content: string | null
  last_message_at: string | null
}

/**
 * Conversation Participants Table
 */
export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
}

/**
 * Conversation Participant with user data
 */
export interface ConversationParticipantWithUser extends ConversationParticipant {
  users: User
}

/**
 * Messages Table
 */
export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  message_type: MessageType
  whisper_mode: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Message with sender and attachments
 */
export interface MessageWithDetails extends Message {
  users?: User
  attachments?: Attachment[]
}

/**
 * Attachments Table
 */
export interface Attachment {
  id: string
  message_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number | null
  created_at: string
}

/**
 * Follows Table
 */
export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

/**
 * User Stats View
 */
export interface UserStats {
  id: string
  username: string
  email: string
  followers_count: number
  following_count: number
  conversation_count: number
  created_at: string
}

/**
 * Conversation Last Message View
 */
export interface ConversationLastMessage {
  conversation_id: string
  id: string
  sender_id: string
  content: string | null
  message_type: MessageType
  created_at: string
}

/**
 * Request/Response Types
 */

export interface SendMessageRequest {
  conversationId: string
  content: string
  messageType?: MessageType
  whisperMode?: boolean
}

export interface CreateDirectConversationRequest {
  userId1: string
  userId2: string
}

export interface CreateGroupConversationRequest {
  name: string
  userId: string
  participantIds: string[]
  relationshipType?: RelationshipType
  groupCategory?: GroupCategory
}

export interface UpdateUserProfileRequest {
  username?: string
  avatar_url?: string
  bio?: string
}

export interface SearchUsersRequest {
  query: string
}

export interface FollowUserRequest {
  followerId: string
  followingId: string
}

export interface UnfollowUserRequest {
  followerId: string
  followingId: string
}

/**
 * API Response Types
 */

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export interface ApiListResponse<T> {
  data: T[]
  count: number
  error: string | null
  status: number
}

/**
 * Real-time Event Types
 */

export interface MessageInsertedEvent {
  type: 'INSERT'
  old: null
  new: Message
}

export interface MessageUpdatedEvent {
  type: 'UPDATE'
  old: Message
  new: Message
}

export interface MessageDeletedEvent {
  type: 'DELETE'
  old: Message
  new: null
}

export interface FollowInsertedEvent {
  type: 'INSERT'
  old: null
  new: Follow
}

export interface FollowDeletedEvent {
  type: 'DELETE'
  old: Follow
  new: null
}

export type RealtimeEvent =
  | MessageInsertedEvent
  | MessageUpdatedEvent
  | MessageDeletedEvent
  | FollowInsertedEvent
  | FollowDeletedEvent

/**
 * RPC Function Types
 */

export interface SearchUsersResult {
  id: string
  username: string
  email: string
  avatar_url: string | null
  followers_count: number
  following_count: number
}
