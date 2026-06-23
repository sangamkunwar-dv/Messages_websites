'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/providers/theme-provider'
import { MessageCircle, Plus, Check, Share2, Sun, Moon, Heart } from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
  id: string
  username: string
  email: string
  avatar_url: string | null
  bio?: string
  created_at?: string
}

interface UserStats {
  followers: number
  following: number
  messages: number
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats>({ followers: 0, following: 0, messages: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    fetchData()
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [userId])

  // Subscribe to real-time follow updates
  useEffect(() => {
    if (!userId) return

    const subscription = supabase
      .channel(`follows:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${userId}`,
        },
        () => {
          console.log('[v0] Follow update detected, refreshing followers count')
          updateFollowersCount()
        }
      )
      .subscribe()

    subscriptionRef.current = subscription

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const updateFollowersCount = async () => {
    try {
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact' })
        .eq('following_id', userId)

      setStats(prev => ({
        ...prev,
        followers: followersCount || 0,
      }))
    } catch (error) {
      console.error('[v0] Error updating followers count:', error)
    }
  }

  const fetchData = async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/login')
        return
      }

      const { data: currentUserData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      setCurrentUser(currentUserData)

      // Get profile user
      const { data: profileUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profileUser) {
        router.push('/chat')
        return
      }

      setUser(profileUser)

      // Get followers count
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact' })
        .eq('following_id', userId)

      // Get following count
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact' })
        .eq('follower_id', userId)

      // Check if current user follows this user
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', authUser.id)
        .eq('following_id', userId)

      setIsFollowing(followData && followData.length > 0)
      setStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        messages: 0,
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser) return

    try {
      if (isFollowing) {
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

      const newFollowState = !isFollowing
      setIsFollowing(newFollowState)
      setStats(prev => ({
        ...prev,
        followers: prev.followers + (isFollowing ? -1 : 1),
      }))
    } catch (error) {
      console.error('[v0] Error toggling follow:', error)
    }
  }

  const handleMessage = async () => {
    if (!currentUser || !user) return

    try {
      // Get or create direct conversation
      const { data: existingConversations, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id)

      if (convError) throw convError

      let conversationId = null
      for (const { conversation_id } of existingConversations || []) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversation_id)

        if (participants?.length === 2 && participants.some(p => p.user_id === userId)) {
          conversationId = conversation_id
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
          { conversation_id: conversationId, user_id: userId },
        ])

        if (partError) throw partError
      }

      router.push('/chat')
    } catch (error) {
      console.error('[v0] Error starting conversation:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-foreground text-lg">User not found</p>
          <Link href="/chat" className="text-primary hover:underline mt-2 inline-block">
            Back to chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-card/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/chat" className="text-primary hover:text-primary/80 font-medium text-sm">
            ← Back
          </Link>
          <h2 className="text-lg font-bold">{user?.username}</h2>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Profile Header Section */}
        <div className="pt-6 pb-4">
          {/* Banner */}
          <div className="h-40 bg-gradient-to-br from-primary/30 via-primary/10 to-background rounded-xl mx-4 mb-4"></div>

          {/* Profile Info Card */}
          <div className="px-4">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-5xl font-bold text-white border-4 border-background shadow-lg -mt-16 flex-shrink-0">
                {user?.username?.[0]?.toUpperCase() || '?'}
              </div>

              {/* User Info & Actions */}
              <div className="flex-1 pt-2">
                <h1 className="text-2xl font-bold mb-1">{user?.username}</h1>
                <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>

                {/* Action Buttons */}
                {currentUser?.id !== userId && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleFollow}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 ${
                        isFollowing
                          ? 'bg-muted text-foreground hover:bg-muted/80'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="w-4 h-4" />
                          Following
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Follow
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleMessage}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                      title="Message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {user?.bio && (
              <p className="mt-4 text-foreground text-sm">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Stats Section - TikTok Style */}
        <div className="px-4 py-6 border-b border-border/50">
          <div className="grid grid-cols-3 gap-3">
            {/* Followers Stat */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-2xl p-4 text-center border border-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer group">
              <p className="text-3xl font-black text-red-500 group-hover:scale-110 transition-transform">
                {stats.followers.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">Followers</p>
              <div className="mt-2 text-xs text-muted-foreground">
                <Heart className="w-3 h-3 inline mr-1 fill-red-500 text-red-500" />
                Growing
              </div>
            </div>

            {/* Following Stat */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-4 text-center border border-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer group">
              <p className="text-3xl font-black text-blue-500 group-hover:scale-110 transition-transform">
                {stats.following.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">Following</p>
              <div className="mt-2 text-xs text-muted-foreground">
                Active
              </div>
            </div>

            {/* Messages Stat */}
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl p-4 text-center border border-purple-500/20 hover:border-purple-500/40 transition-colors cursor-pointer group">
              <p className="text-3xl font-black text-purple-500 group-hover:scale-110 transition-transform">
                {stats.messages.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">Messages</p>
              <div className="mt-2 text-xs text-muted-foreground">
                All time
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="px-4 py-6 text-center text-muted-foreground text-sm">
          {user?.created_at && (
            <p>Joined {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
          )}
        </div>
      </main>
    </div>
  )
}
