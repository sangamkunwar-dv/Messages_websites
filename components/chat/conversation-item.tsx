'use client'

import { Conversation } from '@/lib/store/chat-store'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/store/chat-store'
import { AvatarImage } from '@/components/avatar-image'

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
      className="w-full px-4 py-3 border-b border-border hover:bg-muted transition-all duration-200 text-left group relative overflow-hidden"
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      
      <div className="flex items-center gap-3 relative z-10">
        {/* Avatar with image support */}
        <div className="group/avatar">
          <AvatarImage
            src={
              conversation.conversation_type === 'direct'
                ? otherUser?.avatar_url
                : conversation.group_avatar_url
            }
            alt={
              conversation.conversation_type === 'direct'
                ? otherUser?.username || 'User'
                : conversation.group_name || 'Group'
            }
            initials={
              conversation.conversation_type === 'direct'
                ? otherUser?.username?.[0]?.toUpperCase() || '?'
                : conversation.group_name?.[0]?.toUpperCase() || '?'
            }
            size="md"
            className="shadow-md group-hover/avatar:shadow-lg transition-shadow duration-200"
          />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate group-hover:font-semibold transition-all">
            {conversation.conversation_type === 'direct'
              ? otherUser?.username || 'Loading...'
              : conversation.group_name}
          </p>
          <p className="text-sm text-muted-foreground truncate group-hover:text-foreground/70 transition-colors">
            {conversation.last_message?.content || 'No messages yet'}
          </p>
        </div>

        {/* Follow button with enhanced styling */}
        {showFollowButton && (
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 ${
              isFollowing
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
                : 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md hover:shadow-red-500/50'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
          >
            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </button>
  )
}
