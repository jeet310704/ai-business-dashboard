# Supabase Setup for AI Chat

## Create Table: business_chat_messages

Run this SQL in your Supabase SQL Editor:

```sql
-- Create business_chat_messages table
CREATE TABLE business_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_business_chat_messages_business_id ON business_chat_messages(business_id);
CREATE INDEX idx_business_chat_messages_user_id ON business_chat_messages(user_id);
CREATE INDEX idx_business_chat_messages_created_at ON business_chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE business_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see chat messages for their own business
CREATE POLICY "Users can view their business chat messages"
  ON business_chat_messages
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert messages for their own business
CREATE POLICY "Users can insert chat messages for their business"
  ON business_chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own messages (owner can update any)
CREATE POLICY "Users can update their own chat messages"
  ON business_chat_messages
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
```

Run the above SQL first before deploying the app.
