'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/store/chat-store'
import { MessageCircle, Plus, Check } from 'lucide-react'

interface SearchResult {
  id: string
  username: string
  email: string
  avatar_url?: string
  isFollowing?: boolean
}

export function SearchUsers() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const supabase = createClient()
  const { currentUser, addConversation } = useChatStore()

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (value.length < 1) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      let searchResults = []
      
      if (value.length < 2) {
        // Show all users if query is short
        const { data: allUsers, error: allError } = await supabase
          .from('users')
          .select('id, username, email, avatar_url')
          .limit(50)
        
        if (!allError && allUsers) {
          searchResults = allUsers
        }
      } else {
        // Search by username or email
        const { data: queryResults, error: searchError } = await supabase
          .from('users')
          .select('id, username, email, avatar_url')
          .or(`username.ilike.%${value}%,email.ilike.%${value}%`)
          .limit(50)

        if (searchError) {
          console.error('[v0] Search error:', searchError)
          setResults([])
          setLoading(false)
          return
        }
        searchResults = queryResults || []
      }

      // Filter out current user
      const filtered = (searchResults || []).filter(user => user.id !== currentUser?.id)

      // Check follow status for each user
      const followStates: Record<string, boolean> = {}
      if (currentUser && filtered.length > 0) {
        const { data: allFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id)

        const followingIds = (allFollows || []).map(f => f.following_id)
        for (const user of filtered) {
          followStates[user.id] = followingIds.includes(user.id)
        }
        setFollowingStates(followStates)
      }

      const resultsWithStatus = filtered.map(user => ({
        ...user,
        isFollowing: followStates[user.id] || false,
      }))
      
      setResults(resultsWithStatus)
    } catch (error) {
      console.error('[v0] Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}`)
    setQuery('')
    setResults([])
  }

  const handleToggleFollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return

    const isCurrentlyFollowing = followingStates[userId] || false

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)
        if (error) throw error
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId,
          })
        if (error) throw error
      }

      const newFollowState = !isCurrentlyFollowing
      setFollowingStates(prev => ({
        ...prev,
        [userId]: newFollowState,
      }))

      setResults(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, isFollowing: newFollowState }
            : user
        )
      )
    } catch (error) {
      console.error('[v0] Error toggling follow:', error)
      // Revert state on error
      setFollowingStates(prev => ({
        ...prev,
        [userId]: isCurrentlyFollowing,
      }))
    }
  }

  const handleMessage = async (selectedUser: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return

    try {
      // Get or create direct conversation
      const { data: existingConversations, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id)

      if (convError) throw convError

      let conversationId = null
      let existingConv = false

      for (const { conversation_id } of existingConversations || []) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversation_id)

        if (participants?.length === 2 && participants.some(p => p.user_id === selectedUser.id)) {
          conversationId = conversation_id
          existingConv = true
          break
        }
      }

      if (!conversationId) {
        // Create new conversation
        const { data: conversation, error: createError } = await supabase
          .from('conversations')
          .insert({ conversation_type: 'direct', created_by: currentUser.id })
          .select()
          .single()

        if (createError || !conversation) {
          throw new Error('Failed to create conversation')
        }

        conversationId = conversation.id

        // Add participants
        const { error: partError } = await supabase.from('conversation_participants').insert([
          { conversation_id: conversationId, user_id: currentUser.id },
          { conversation_id: conversationId, user_id: selectedUser.id },
        ])

        if (partError) throw partError

        // Fetch user details for the conversation
        const { data: userDetails } = await supabase
          .from('users')
          .select('*')
          .eq('id', selectedUser.id)
          .single()

        const newConversation = {
          id: conversationId,
          conversation_type: 'direct' as const,
          created_at: conversation.created_at,
          participants: userDetails ? [userDetails] : [selectedUser],
        }
        addConversation(newConversation)
      }

      setQuery('')
      setResults([])
      
      // Wait a moment for state to update, then navigate
      setTimeout(() => {
        router.push('/chat')
      }, 100)
    } catch (error) {
      console.error('[v0] Error creating conversation:', error)
    }
  }

  return (
    <div className="space-y-3 w-full">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search users or type to see all..."
        className="w-full px-3 sm:px-4 py-2 border border-primary/30 rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base transition-all"
        autoFocus
      />

      {loading && (
        <div className="text-sm text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span>Loading users...</span>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto space-y-2">
        {results.length === 0 && query.length >= 2 && !loading && (
          <div className="text-sm text-muted-foreground text-center py-4">
            <p>No users found for "{query}"</p>
            <p className="text-xs mt-1">Try searching with a different name or email</p>
          </div>
        )}
        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-primary/5 transition-all cursor-pointer group bg-muted/30 border border-border hover:border-primary/30"
            onClick={() => handleViewProfile(user.id)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <span className="text-white font-bold text-sm hidden" style={{ display: user.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {user.username?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-shrink-0 ml-3">
              <button
                onClick={(e) => handleToggleFollow(user.id, e)}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap hidden sm:inline-block ${
                  followingStates[user.id]
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {followingStates[user.id] ? '✓ Follow' : 'Follow'}
              </button>
              <button
                onClick={(e) => handleMessage(user, e)}
                title="Send message"
                className="px-2 sm:px-3 py-1 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-colors text-xs font-semibold"
              >
                <span className="hidden sm:inline">Message</span>
                <span className="sm:hidden">💬</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
