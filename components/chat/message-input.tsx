'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/store/chat-store'
import { Button } from '@/components/ui/button'

interface MessageInputProps {
  conversationId: string
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [whisperMode, setWhisperMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { currentUser, addMessage } = useChatStore()

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !currentUser) return

    setSending(true)
    try {
      console.log('[v0] Sending message...', { conversationId, userId: currentUser.id })
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: content.trim(),
          message_type: 'text',
          whisper_mode: whisperMode,
        })
        .select()
        .single()

      if (error) {
        console.error('[v0] Error response from database:', error)
        throw error
      }

      console.log('[v0] Message sent successfully:', message.id)
      addMessage({
        ...message,
        sender: currentUser,
        attachments: [],
        whisper_mode: whisperMode,
      })

      setContent('')
      // Auto-disable whisper mode after sending
      if (whisperMode) {
        setWhisperMode(false)
      }
    } catch (error) {
      console.error('[v0] Error sending message:', error)
      // Show error to user
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !currentUser) return

    setUploadingFiles(true)
    try {
      for (const file of Array.from(files)) {
        // Determine message type
        let messageType: 'image' | 'video' | 'file' = 'file'
        if (file.type.startsWith('image/')) messageType = 'image'
        else if (file.type.startsWith('video/')) messageType = 'video'

        console.log('[v0] Uploading file:', file.name, 'Type:', messageType)

        // Create message record
        const { data: message, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            message_type: messageType,
            content: file.name,
          })
          .select()
          .single()

        if (msgError) {
          console.error('[v0] Error creating message record:', msgError)
          throw msgError
        }

        // Upload file to Blob storage
        try {
          console.log('[v0] Starting file upload to blob storage')
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error('[v0] Upload API error:', response.status, errorText)
            throw new Error(`Upload failed: ${response.status}`)
          }
          const { url: fileUrl } = await response.json()
          console.log('[v0] File uploaded successfully:', fileUrl)

          // Create attachment record with blob URL
          const { error: attachError } = await supabase.from('attachments').insert({
            message_id: message.id,
            file_url: fileUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          })

          if (attachError) {
            console.error('[v0] Error creating attachment record:', attachError)
            throw attachError
          }

          console.log('[v0] Attachment record created')
          addMessage({
            ...message,
            sender: currentUser,
            attachments: [
              {
                id: message.id,
                message_id: message.id,
                file_url: fileUrl,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
              },
            ],
          })
        } catch (uploadError) {
          console.error('[v0] Error uploading file to Blob:', uploadError)
          // Still add message without attachment
          addMessage({
            ...message,
            sender: currentUser,
            attachments: [],
          })
        }
      }
    } catch (error) {
      console.error('[v0] Error processing files:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
      <div className="space-y-2">
        {whisperMode && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex items-center gap-2 text-sm text-purple-900">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Whisper Mode: Message will blur and auto-delete after 10s</span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles}
            className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
            aria-label="Attach file"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx"
          />

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Aa"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />

          <button
            type="button"
            onClick={() => setWhisperMode(!whisperMode)}
            className={`p-2 rounded-full transition ${
              whisperMode
                ? 'bg-purple-100 text-purple-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Whisper mode"
            title="Whisper Mode: Message blurs and auto-deletes after 10 seconds"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          </button>

          <Button
            type="submit"
            disabled={!content.trim() || sending}
            className="px-4 py-2"
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </form>
  )
}
