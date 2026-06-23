'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/store/chat-store'
import { X, Save } from 'lucide-react'

interface ConversationSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function ConversationSettings({ isOpen, onClose }: ConversationSettingsProps) {
  const { currentConversation, currentUser } = useChatStore()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [nickname, setNickname] = useState(currentConversation?.nickname || '')
  const [theme, setTheme] = useState(currentConversation?.group_category || 'default')
  const [notifications, setNotifications] = useState(currentConversation?.notifications_enabled !== false)
  const [saved, setSaved] = useState(false)

  if (!isOpen || !currentConversation) return null

  const handleSave = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      console.log('[v0] Saving conversation settings')

      const { error } = await supabase
        .from('conversations')
        .update({
          nickname: nickname || null,
          group_category: theme === 'default' ? null : theme,
          notifications_enabled: notifications,
        })
        .eq('id', currentConversation.id)

      if (error) {
        console.error('[v0] Error saving settings:', error)
        alert('Failed to save settings. Please try again.')
        return
      }

      console.log('[v0] Settings saved successfully')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('[v0] Exception saving settings:', error)
      alert('An error occurred while saving settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full sm:w-96 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-bold text-lg">Conversation Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium mb-2">Conversation Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Give this conversation a nickname..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to use default name
            </p>
          </div>

          {/* Theme/Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Chat Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
            >
              <option value="default">Default</option>
              <option value="girlfriend">Girlfriend</option>
              <option value="bestfriend">Best Friend</option>
              <option value="family">Family</option>
              <option value="others">Others</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Changes the appearance and vibe of this conversation
            </p>
          </div>

          {/* Notifications */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm font-medium">Enable Notifications</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-7">
              Get alerts for new messages in this conversation
            </p>
          </div>

          {/* Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium">Conversation Info</p>
            <p className="text-xs text-muted-foreground">
              Type: {currentConversation.conversation_type === 'direct' ? 'Direct Message' : 'Group Chat'}
            </p>
            <p className="text-xs text-muted-foreground">
              Created: {new Date(currentConversation.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Save Status */}
          {saved && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-600 text-sm px-3 py-2 rounded-lg">
              Settings saved successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2 sticky bottom-0 bg-card">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
