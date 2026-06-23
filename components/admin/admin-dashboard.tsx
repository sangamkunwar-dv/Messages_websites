'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, MessageSquare, BarChart3, Moon, Sun, LogOut, ArrowLeft } from 'lucide-react'
import { useTheme } from '@/lib/providers/theme-provider'

interface Statistics {
  totalUsers: number
  totalMessages: number
  totalConversations: number
  activeUsers: number
  totalFollowers: number
  totalCalls: number
}

interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
  created_at: string
  followers_count?: number
  following_count?: number
  conversation_count?: number
}

export function AdminDashboard() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const supabase = createClient()
  const [stats, setStats] = useState<Statistics>({
    totalUsers: 0,
    totalMessages: 0,
    totalConversations: 0,
    activeUsers: 0,
    totalFollowers: 0,
    totalCalls: 0,
  })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

  const checkAdminAndFetchData = async () => {
    let retries = 0
    const maxRetries = 3

    const attemptCheck = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (retries < maxRetries) {
            retries++
            await new Promise(resolve => setTimeout(resolve, 500))
            return attemptCheck()
          }
          router.push('/auth/login')
          return
        }

        // Check if user is admin by email
        const isAdminUser = user.email === 'sangamkunwar48@gmail.com'

        if (!isAdminUser) {
          router.push('/chat')
          return
        }

        setIsAdmin(true)
        await fetchStatistics()
        await fetchUsers()
      } catch (error) {
        if (retries < maxRetries) {
          retries++
          await new Promise(resolve => setTimeout(resolve, 500))
          return attemptCheck()
        }
        console.error('Error checking admin status:', error)
        router.push('/chat')
      } finally {
        setLoading(false)
      }
    }

    await attemptCheck()
  }

  const fetchStatistics = async () => {
    try {
      console.log('[v0] Fetching admin statistics...')
      
      // Fetch total users
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
      
      if (usersError) console.error('[v0] Users error:', usersError)

      // Fetch total messages
      const { count: messagesCount, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
      
      if (messagesError) console.error('[v0] Messages error:', messagesError)

      // Fetch total conversations
      const { count: conversationsCount, error: convsError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact' })
      
      if (convsError) console.error('[v0] Conversations error:', convsError)

      // Count active users (users with messages in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from('messages')
        .select('sender_id', { count: 'exact' })
        .gt('created_at', sevenDaysAgo.toISOString())
      
      if (activeUsersError) console.error('[v0] Active users error:', activeUsersError)

      const uniqueActiveUsers = new Set(activeUsersData?.map(m => m.sender_id) || []).size

      // Fetch total followers (follows table)
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact' })
      
      if (followersError) console.error('[v0] Followers error:', followersError)

      // Fetch total calls
      const { count: callsCount, error: callsError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .eq('conversation_type', 'call')
      
      if (callsError) console.error('[v0] Calls error:', callsError)

      const newStats = {
        totalUsers: usersCount || 0,
        totalMessages: messagesCount || 0,
        totalConversations: conversationsCount || 0,
        activeUsers: uniqueActiveUsers,
        totalFollowers: followersCount || 0,
        totalCalls: callsCount || 0,
      }
      
      console.log('[v0] Statistics fetched:', newStats)
      setStats(newStats)
    } catch (error) {
      console.error('[v0] Error fetching statistics:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      console.log('[v0] Fetching users...')
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[v0] Error fetching users:', error)
        setUsers([])
        return
      }

      console.log('[v0] Users fetched:', data?.length || 0)

      // Fetch followers and conversations for each user
      const usersWithDetails = await Promise.all(
        (data || []).map(async (user: User) => {
          try {
            const { count: followersCount, error: followersError } = await supabase
              .from('follows')
              .select('*', { count: 'exact' })
              .eq('following_id', user.id)

            if (followersError) console.error('[v0] Followers error for', user.id, followersError)

            const { count: followingCount, error: followingError } = await supabase
              .from('follows')
              .select('*', { count: 'exact' })
              .eq('follower_id', user.id)

            if (followingError) console.error('[v0] Following error for', user.id, followingError)

            const { count: conversationCount, error: convError } = await supabase
              .from('conversation_participants')
              .select('*', { count: 'exact' })
              .eq('user_id', user.id)

            if (convError) console.error('[v0] Conversations error for', user.id, convError)

            return {
              ...user,
              followers_count: followersCount || 0,
              following_count: followingCount || 0,
              conversation_count: conversationCount || 0,
            }
          } catch (err) {
            console.error('[v0] Error processing user', user.id, err)
            return {
              ...user,
              followers_count: 0,
              following_count: 0,
              conversation_count: 0,
            }
          }
        })
      )

      console.log('[v0] Users with details:', usersWithDetails)
      setUsers(usersWithDetails)
    } catch (error) {
      console.error('[v0] Error fetching users:', error)
      setUsers([])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleViewConversation = async (userId: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find or create direct conversation
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('conversation_type', 'direct')
        .single()

      let conversationId = existingConversation?.id

      if (!conversationId) {
        // Create a new direct conversation
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            conversation_type: 'direct',
          })
          .select('id')
          .single()

        conversationId = newConversation?.id

        // Add participants
        if (conversationId) {
          await supabase.from('conversation_participants').insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: userId },
          ])
        }
      }

      // Redirect to chat with conversation
      if (conversationId) {
        router.push(`/chat?conversation=${conversationId}`)
      }
    } catch (error) {
      console.error('Error opening conversation:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Back to Chat</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your chat application</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
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
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Users</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Messages</p>
                <p className="text-3xl font-bold">{stats.totalMessages}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Conversations</p>
                <p className="text-3xl font-bold">{stats.totalConversations}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Active Users (7d)</p>
                <p className="text-3xl font-bold">{stats.activeUsers}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Followers</p>
                <p className="text-3xl font-bold">{stats.totalFollowers}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Calls</p>
                <p className="text-3xl font-bold">{stats.totalCalls}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold">User Management</h2>
            <p className="text-sm text-muted-foreground mt-1">View all users, followers, conversations, and activity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Followers</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Following</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Conversations</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Joined</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">{user.username || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4 text-sm font-medium">{user.followers_count || 0}</td>
                      <td className="px-6 py-4 text-sm font-medium">{user.following_count || 0}</td>
                      <td className="px-6 py-4 text-sm font-medium">{user.conversation_count || 0}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.email === 'sangamkunwar48@gmail.com'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {user.email === 'sangamkunwar48@gmail.com' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleViewConversation(user.id)}
                          className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                        >
                          View Chat
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
