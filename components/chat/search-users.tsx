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

    if (value.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      console.log('[v0] Searching for:', value)
      
      // Search users from users table
      const { data: searchResults, error: searchError } = await supabase
        .from('users')
        .select('id, username, email, avatar_url')
        .or(`username.ilike.%${value}%,email.ilike.%${value}%`)
        .limit(10)

      if (searchError) {
        console.error('[v0] Search error:', searchError)
        setResults([])
        setLoading(false)
        return
      }

      console.log('[v0] Search results:', searchResults)

      if (!searchResults || searchResults.length === 0) {
        console.log('[v0] No results found')
        setResults([])
        setLoading(false)
        return
      }

      // Filter out current user
      const filtered = (searchResults || []).filter(user => user.id !== currentUser?.id)
      console.log('[v0] Filtered results:', filtered)

      // Check follow status for each user
      if (currentUser) {
        const followStates: Record<string, boolean> = {}
        for (const user of filtered) {
          try {
            // Check follow status
            const { data: followData, error: followError } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', currentUser.id)
              .eq('following_id', user.id)
              .limit(1)

            if (followError) {
              console.error('[v0] Follow check error for', user.id, followError)
              followStates[user.id] = false
            } else {
              followStates[user.id] = (followData && followData.length > 0) ? true : false
              console.log('[v0] Follow status for', user.username, ':', followStates[user.id])
            }
          } catch (err) {
            console.error('[v0] Error checking status for', user.id, err)
            followStates[user.id] = false
          }
        }
        setFollowingStates(followStates)
      }

      const resultsWithStatus = filtered.map(user => ({
        ...user,
        isFollowing: followingStates[user.id] || false,
      }))
      
      console.log('[v0] Final results to display:', resultsWithStatus)
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

    const isCurrentlyFollowing = followingStates[userId]

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId,
          })
      }

      setFollowingStates(prev => ({
        ...prev,
        [userId]: !isCurrentlyFollowing,
      }))

      setResults(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user
        )
      )
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const handleMessage = async (selectedUser: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return

    try {
      // Get or create direct conversation
      const { data: existingConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id)

      let conversationId = null
      for (const { conversation_id } of existingConversations || []) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversation_id)

        if (participants?.length === 2 && participants.some(p => p.user_id === selectedUser.id)) {
          conversationId = conversation_id
          break
        }
      }

      if (!conversationId) {
        // Create new conversation
        const { data: conversation } = await supabase
          .from('conversations')
          .insert({ conversation_type: 'direct' })
          .select()
          .single()

        conversationId = conversation?.id

        // Add participants
        await supabase.from('conversation_participants').insert([
          { conversation_id: conversationId, user_id: currentUser.id },
          { conversation_id: conversationId, user_id: selectedUser.id },
        ])

        const newConversation = {
          id: conversationId,
          conversation_type: 'direct' as const,
          created_at: new Date().toISOString(),
          participants: [selectedUser],
        }
        addConversation(newConversation)
      }

      setQuery('')
      setResults([])
      router.push('/chat')
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  return (
    <div className="space-y-3 w-full">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search by name or email..."
        className="w-full px-3 sm:px-4 py-2 border border-primary/30 rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base transition-all"
      />

      {loading && (
        <div className="text-sm text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span>Searching...</span>
        </div>
      )}

      {!loading && query.length < 2 && query.length > 0 && (
        <div className="text-sm text-muted-foreground text-center py-3">
          Type at least 2 characters to search
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
