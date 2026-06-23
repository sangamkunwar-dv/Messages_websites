'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/store/chat-store'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { CallDialog } from './call-dialog'
import { ConversationSettings } from './conversation-settings'
import { AvatarImage } from '@/components/avatar-image'

export function ChatWindow() {
  const { currentConversation, currentUser, messages, setMessages, addMessage } = useChatStore()
  const [otherUser, setOtherUser] = useState<any>(null)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      let isMounted = true
      
      const initializeMessages = async () => {
        console.log('[v0] Initializing messages for conversation:', currentConversation.id)
        await loadMessages()
        
        if (isMounted) {
          await loadOtherUser()
          const unsubscribe = subscribeToMessages()
          return () => {
            unsubscribe?.()
          }
        }
      }
      
      initializeMessages()
      
      return () => {
        isMounted = false
      }
    }
  }, [currentConversation?.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async (retryCount = 0) => {
    if (!currentConversation) {
      setMessagesLoading(false)
      return
    }

    setMessagesLoading(true)
    try {
      console.log('[v0] Loading messages for conversation:', currentConversation.id, 'Attempt:', retryCount + 1)
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message loading timeout')), 8000)
      )
      
      // Create the query promise
      const queryPromise = supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          created_at,
          deleted_at,
          whisper_mode,
          users!sender_id(id, username, email, avatar_url),
          attachments(*)
        `)
        .eq('conversation_id', currentConversation.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      // Race between query and timeout
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (error) {
        console.error('[v0] Error loading messages:', error.message)
        // Retry once if there's an error
        if (retryCount < 1) {
          console.log('[v0] Retrying message load (attempt', retryCount + 2, ')')
          await new Promise(resolve => setTimeout(resolve, 1000))
          return loadMessages(retryCount + 1)
        }
        console.error('[v0] Max retries reached, showing empty state')
        setMessages([])
        return
      }
      
      const formattedMessages = (data || []).map((msg: any) => ({
        ...msg,
        sender: msg.users,
      }))
      
      console.log('[v0] Messages loaded successfully:', formattedMessages.length, 'messages')
      setMessages(formattedMessages)
    } catch (error) {
      console.error('[v0] Exception loading messages:', error instanceof Error ? error.message : error)
      
      // Retry on timeout
      if (retryCount < 1 && error instanceof Error && error.message === 'Message loading timeout') {
        console.log('[v0] Timeout - retrying...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        return loadMessages(retryCount + 1)
      }
      
      // Show empty state instead of stuck loading
      setMessages([])
      console.error('[v0] Failed to load messages after retries')
    } finally {
      setMessagesLoading(false)
    }
  }

  const loadOtherUser = async () => {
    if (currentConversation?.conversation_type !== 'direct') return

    try {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, users(id, username, avatar_url, email)')
        .eq('conversation_id', currentConversation.id)

      const other = participants?.find((p: any) => p.user_id !== currentUser?.id)
      if (other) {
        setOtherUser(other.users)
      }
    } catch (error) {
      console.error('Error loading other user:', error)
    }
  }

  const subscribeToMessages = () => {
    if (!currentConversation) return

    console.log('[v0] Setting up message subscription for:', currentConversation.id)

    const channel = supabase.channel(`messages:${currentConversation.id}`, {
      config: {
        broadcast: { self: true },
        presence: { key: currentUser?.id },
      },
    })
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation.id}`,
        },
        async (payload) => {
          console.log('[v0] New message event received:', payload.new.id)
          
          try {
            // Fetch the message with full details
            const { data: messageData, error } = await supabase
              .from('messages')
              .select(`
                id,
                conversation_id,
                sender_id,
                content,
                message_type,
                created_at,
                deleted_at,
                whisper_mode,
                users!sender_id(id, username, email, avatar_url),
                attachments(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              console.error('[v0] Error fetching message details:', error)
              return
            }

            if (messageData) {
              console.log('[v0] Adding message to store:', messageData.id)
              addMessage({
                ...messageData,
                sender: messageData.users,
              })
            }
          } catch (err) {
            console.error('[v0] Exception in message handler:', err)
          }
        }
      )
      .on('system', { event: 'error' }, (payload) => {
        console.error('[v0] Subscription error:', payload)
      })
      .subscribe((status) => {
        console.log('[v0] Subscription status changed:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[v0] Successfully subscribed to messages')
        } else if (status === 'CLOSED') {
          console.log('[v0] Subscription closed, attempting to reconnect...')
          setTimeout(() => {
            console.log('[v0] Reconnecting subscription...')
            subscribeToMessages()
          }, 2000)
        }
      })

    return () => {
      console.log('[v0] Unsubscribing from channel:', currentConversation.id)
      channel.unsubscribe()
    }
  }

  const handleStartCall = async (callType: 'audio' | 'video') => {
    try {
      console.log('[v0] Starting call:', callType)
      
      if (!currentConversation) {
        alert('Please select a conversation first')
        return
      }

      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          callType,
        }),
      })

      console.log('[v0] Call API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[v0] Call API error:', errorData)
        throw new Error(errorData.error || 'Failed to start call')
      }

      const data = await response.json()
      console.log('[v0] Call started successfully:', data)

      const callTypeLabel = callType.charAt(0).toUpperCase() + callType.slice(1)
      
      // Show alert with call details
      alert(`✅ ${callTypeLabel} call started!\n\nRoom ID: ${data.roomId}\n\nWaiting for the other person to join...`)
    } catch (error) {
      console.error('[v0] Error starting call:', error)
      const message = error instanceof Error ? error.message : 'Failed to start call'
      alert(`❌ ${message}`)
    }
  }

  const getThemeClasses = () => {
    const category = currentConversation?.relationship_type || currentConversation?.group_category
    
    switch (category) {
      case 'girlfriend':
        return {
          bg: 'from-rose-50/50 to-pink-50/50',
          textColor: 'text-foreground',
          headerBg: 'bg-gradient-to-r from-rose-100 to-pink-100',
          bubble: {
            ownBg: 'bg-rose-500 text-white',
            ownText: 'text-white',
            otherBg: 'bg-pink-100 text-pink-900',
            otherText: 'text-pink-900',
          },
        }
      case 'bestfriend':
        return {
          bg: 'from-slate-900 to-slate-800',
          textColor: 'text-cyan-50',
          headerBg: 'bg-slate-900 border-cyan-500/30',
          bubble: {
            ownBg: 'bg-cyan-500 text-slate-900',
            ownText: 'text-slate-900',
            otherBg: 'bg-cyan-400/30 text-cyan-50 border border-cyan-400/50',
            otherText: 'text-cyan-50',
          },
        }
      default:
        return {
          bg: 'bg-background',
          textColor: 'text-foreground',
          headerBg: 'bg-card',
          bubble: {
            ownBg: 'bg-indigo-600 text-white',
            ownText: 'text-white',
            otherBg: 'bg-gray-100 text-gray-900',
            otherText: 'text-gray-900',
          },
        }
    }
  }

  const theme = getThemeClasses()

  if (!currentConversation) {
    return (
      <div className="hidden sm:flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-muted-foreground text-lg">Select a conversation to start</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 flex flex-col ${theme.bg} pt-16 sm:pt-0 bg-gradient-to-b`}>
      {/* Chat Header */}
      <div className={`p-4 border-b border-border flex items-center justify-between ${theme.headerBg} sticky top-16 sm:top-0 z-40`}>
        <div className="flex items-center gap-3 min-w-0">
          <AvatarImage
            src={
              currentConversation.conversation_type === 'direct'
                ? otherUser?.avatar_url
                : currentConversation.group_avatar_url
            }
            alt={
              currentConversation.conversation_type === 'direct'
                ? otherUser?.username || 'User'
                : currentConversation.group_name || 'Group'
            }
            initials={
              currentConversation.conversation_type === 'direct'
                ? otherUser?.username?.[0]?.toUpperCase() || '?'
                : currentConversation.group_name?.[0]?.toUpperCase() || '?'
            }
            size="sm"
          />
          <div className="min-w-0">
            <h2 className="font-bold truncate">
              {currentConversation.conversation_type === 'direct'
                ? otherUser?.username || 'Loading...'
                : currentConversation.group_name}
            </h2>
            <p className="text-xs text-muted-foreground">Active now</p>
          </div>
        </div>

        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => handleStartCall('audio')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Audio Call"
            title="Start audio call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button
            onClick={() => handleStartCall('video')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Video Call"
            title="Start video call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Settings"
            title="Conversation settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Loading messages...</p>
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUser?.id}
              theme={theme.bubble}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput conversationId={currentConversation.id} />

      {/* Conversation Settings */}
      <ConversationSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
