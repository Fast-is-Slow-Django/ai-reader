-- Add metadata JSONB field to books table for flexible feature storage
-- This single field can store: favorites, tags, ratings, custom covers, etc.

ALTER TABLE books ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create a GIN index on metadata for fast querying
CREATE INDEX IF NOT EXISTS idx_books_metadata ON books USING GIN (metadata);

-- Example metadata structure:
-- {
--   "favorite": true,
--   "tags": ["fiction", "must-read"],
--   "rating": 5,
--   "custom_cover": "https://...",
--   "reading_status": "reading",
--   "notes": "Great book!",
--   "last_read": "2024-12-08T10:00:00Z",
--   "color": "#FF5733"
-- }

-- Update existing RLS policies to include metadata updates
CREATE POLICY "Users can update their own books metadata"
  ON books
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
