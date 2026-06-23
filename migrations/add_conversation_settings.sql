-- Add conversation settings columns
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(255),
ADD COLUMN IF NOT EXISTS group_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_group_category ON conversations(group_category);

-- Add comment for documentation
COMMENT ON COLUMN conversations.nickname IS 'Custom nickname for the conversation (overrides default name)';
COMMENT ON COLUMN conversations.group_category IS 'Theme/category for the conversation: girlfriend, bestfriend, family, others';
COMMENT ON COLUMN conversations.notifications_enabled IS 'Whether notifications are enabled for this conversation';
