'use client'

import { Conversation } from '@/lib/store/chat-store'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/store/chat-store'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
}

export function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const { currentUser } = useChatStore()
  const supabase = createClient()
  
  // Get other user from conversation participants
  const otherUser = conversation.participants?.[0]
  
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // Check if current user follows the other user
  useEffect(() => {
    if (!otherUser || !currentUser) return
    
    const checkFollowStatus = async () => {
      try {
        const { data } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', otherUser.id)
          .single()
        
        setIsFollowing(!!data)
      } catch (error) {
        // No follow record found, which is fine
        setIsFollowing(false)
      }
    }

    checkFollowStatus()
  }, [otherUser?.id, currentUser?.id, supabase])

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!otherUser || !currentUser) return
    
    setFollowLoading(true)
    
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', otherUser.id)
        
        setIsFollowing(false)
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: otherUser.id,
          })
        
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow status:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  // Only show follow button for direct conversations
  const showFollowButton = conversation.conversation_type === 'direct' && otherUser

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
          {conversation.conversation_type === 'direct'
            ? otherUser?.username?.[0]?.toUpperCase() || '?'
            : conversation.group_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {conversation.conversation_type === 'direct'
              ? otherUser?.username || 'Loading...'
              : conversation.group_name}
          </p>
          <p className="text-sm text-gray-600 truncate">
            {conversation.last_message?.content || 'No messages yet'}
          </p>
        </div>
        {showFollowButton && (
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              isFollowing
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-red-500 text-white hover:bg-red-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </button>
  )
}
