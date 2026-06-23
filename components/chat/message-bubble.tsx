'use client'

import { Message } from '@/lib/store/chat-store'
import { format } from 'date-fns'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  theme?: {
    ownBg?: string
    ownText?: string
    otherBg?: string
    otherText?: string
  }
}

export function MessageBubble({ message, isOwn, theme }: MessageBubbleProps) {
  const formattedTime = format(new Date(message.created_at), 'HH:mm')
  const supabase = createClient()
  
  const [isRevealed, setIsRevealed] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  // Auto-delete whisper messages after 10 seconds
  useEffect(() => {
    if (!message.whisper_mode) return

    const deleteTimer = setTimeout(async () => {
      setIsDeleted(true)
      
      // Soft-delete from database
      try {
        await supabase
          .from('messages')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', message.id)
      } catch (error) {
        console.error('[v0] Error deleting whisper message:', error)
      }
    }, 10000) // 10 seconds

    return () => clearTimeout(deleteTimer)
  }, [message.whisper_mode, message.id, supabase])

  const getBubbleClasses = () => {
    if (isOwn) {
      return theme?.ownBg || 'bg-indigo-600 text-white'
    }
    return theme?.otherBg || 'bg-gray-100 text-gray-900'
  }

  const getTextClasses = () => {
    if (isOwn) {
      return theme?.ownText || 'text-white'
    }
    return theme?.otherText || 'text-gray-900'
  }

  // If deleted, don't render
  if (isDeleted) {
    return null
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group cursor-pointer`}
      onClick={() => message.whisper_mode && setIsRevealed(!isRevealed)}
      onMouseEnter={() => message.whisper_mode && setIsRevealed(true)}
      onMouseLeave={() => message.whisper_mode && setIsRevealed(false)}
    >
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg relative ${getBubbleClasses()} ${
          isOwn ? 'rounded-br-none' : 'rounded-bl-none'
        } ${
          message.whisper_mode && !isRevealed
            ? 'opacity-50 blur-sm'
            : isRevealed && message.whisper_mode
            ? 'opacity-100 blur-none'
            : ''
        } transition-all duration-200`}
      >
        {/* Whisper Mode Indicator */}
        {message.whisper_mode && !isRevealed && (
          <div className="text-xs opacity-75">
            🔒 Whisper Message - Click to reveal
          </div>
        )}

        {/* Text Content */}
        {message.content && (isRevealed || !message.whisper_mode) && (
          <p className={`text-sm break-words ${getTextClasses()}`}>{message.content}</p>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => {
              if (attachment.file_type.startsWith('image/')) {
                return (
                  <div key={attachment.id} className="rounded overflow-hidden">
                    <Image
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      width={300}
                      height={200}
                      className="max-w-xs h-auto"
                    />
                  </div>
                )
              } else if (attachment.file_type.startsWith('video/')) {
                return (
                  <div key={attachment.id} className="rounded overflow-hidden">
                    <video
                      src={attachment.file_url}
                      controls
                      className="max-w-xs h-auto"
                    />
                  </div>
                )
              } else if (attachment.file_type.startsWith('audio/')) {
                return (
                  <audio
                    key={attachment.id}
                    src={attachment.file_url}
                    controls
                    className="max-w-xs"
                  />
                )
              } else {
                return (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1 1 0 11-2 0 1 1 0 012 0zM15 7H4a2 2 0 00-2 2v5a2 2 0 002 2h2.93l1.586 2.793A1 1 0 0010 17h5a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    </svg>
                    <span className="text-xs truncate">{attachment.file_name}</span>
                  </a>
                )
              }
            })}
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-xs mt-1 opacity-75`}>
          {formattedTime}
        </p>
      </div>
    </div>
  )
}
