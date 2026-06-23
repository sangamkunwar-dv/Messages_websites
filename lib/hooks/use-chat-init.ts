import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/store/chat-store'

export function useChatInit() {
  const { setCurrentUser, setConversations, setUsers } = useChatStore()
  const supabase = createClient()

  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('[v0] Initializing chat...')

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log('[v0] No user session found')
          return
        }

        console.log('[v0] User session found:', user.id)

        // Fetch user profile
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('id, username, email, avatar_url')
          .eq('id', user.id)
          .single()

        if (userError) {
          console.error('[v0] Error fetching user profile:', userError)
          return
        }

        if (userProfile) {
          console.log('[v0] User profile loaded:', userProfile.username)
          setCurrentUser(userProfile)
        }

        // Load user's conversations
        await loadConversations(user.id)

        // Load all users for search/mentions
        await loadUsers()
      } catch (error) {
        console.error('[v0] Chat initialization error:', error)
      }
    }

    initializeChat()

    // Set up polling to refresh conversations every 3 seconds
    const pollInterval = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await loadConversations(user.id)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [])

  const loadConversations = async (userId: string) => {
    try {
      console.log('[v0] Loading conversations for user:', userId)

      const { data: conversations, error } = await supabase
        .from('conversation_participants')
        .select(
          `
          conversation_id,
          conversations!inner(
            id,
            conversation_type,
            group_name,
            group_avatar_url,
            relationship_type,
            group_category,
            created_at,
            created_by
          )
        `
        )
        .eq('user_id', userId)
        .order('conversations(created_at)', { ascending: false })

      if (error) {
        console.error('[v0] Error loading conversations:', error)
        return
      }

      if (!conversations || conversations.length === 0) {
        console.log('[v0] No conversations found')
        setConversations([])
        return
      }

      console.log('[v0] Found', conversations.length, 'conversations')

      // Transform data and fetch last messages and participants
      const formattedConversations = await Promise.all(
        conversations.map(async (conv: any) => {
          const conversation = conv.conversations
          
          // Fetch participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id, users(id, username, email, avatar_url)')
            .eq('conversation_id', conversation.id)

          // Fetch last message
          const { data: lastMessages } = await supabase
            .from('messages')
            .select('id, content, created_at, sender_id, users(username)')
            .eq('conversation_id', conversation.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)

          const lastMessage = lastMessages?.[0]

          return {
            id: conversation.id,
            conversation_type: conversation.conversation_type,
            group_name: conversation.group_name,
            group_avatar_url: conversation.group_avatar_url,
            relationship_type: conversation.relationship_type,
            group_category: conversation.group_category,
            created_at: conversation.created_at,
            participants: participants?.map((p: any) => p.users) || [],
            last_message: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender: lastMessage.users,
            } : undefined,
          }
        })
      )

      console.log('[v0] Conversations formatted successfully')
      setConversations(formattedConversations)
    } catch (error) {
      console.error('[v0] Exception loading conversations:', error)
    }
  }

  const loadUsers = async () => {
    try {
      console.log('[v0] Loading all users...')

      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, email, avatar_url')
        .limit(50)

      if (error) {
        console.error('[v0] Error loading users:', error)
        return
      }

      if (users) {
        console.log('[v0] Loaded', users.length, 'users')
        setUsers(users)
      }
    } catch (error) {
      console.error('[v0] Exception loading users:', error)
    }
  }
}
