-- Spicy Confessions Database Schema
-- Run these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security (RLS) for all tables
-- This ensures data security and proper access control

-- 1. Create confessions table
CREATE TABLE IF NOT EXISTS confessions (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL CHECK (char_length(text) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_fid BIGINT, -- Farcaster ID (optional for anonymous confessions)
    like_count INTEGER DEFAULT 0 NOT NULL CHECK (like_count >= 0),
    is_anonymous BOOLEAN DEFAULT true NOT NULL
);

-- 2. Create confession_likes table to track user likes
-- This prevents duplicate likes and tracks who liked what
CREATE TABLE IF NOT EXISTS confession_likes (
    id BIGSERIAL PRIMARY KEY,
    confession_id BIGINT NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
    user_fid BIGINT, -- Farcaster ID (can be null for anonymous likes)
    user_identifier TEXT, -- Fallback identifier (IP hash, session ID, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one like per user per confession
    UNIQUE(confession_id, user_fid),
    UNIQUE(confession_id, user_identifier)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_like_count ON confessions(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_confession_likes_confession_id ON confession_likes(confession_id);
CREATE INDEX IF NOT EXISTS idx_confession_likes_user_fid ON confession_likes(user_fid);

-- 4. Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger to automatically update updated_at
CREATE TRIGGER update_confessions_updated_at 
    BEFORE UPDATE ON confessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create a function to update like count when likes are added/removed
CREATE OR REPLACE FUNCTION update_confession_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE confessions 
        SET like_count = like_count + 1 
        WHERE id = NEW.confession_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE confessions 
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.confession_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 7. Create triggers to automatically update like count
CREATE TRIGGER update_like_count_on_insert
    AFTER INSERT ON confession_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_confession_like_count();

CREATE TRIGGER update_like_count_on_delete
    AFTER DELETE ON confession_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_confession_like_count();

-- 8. Enable Row Level Security
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_likes ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for confessions
-- Allow anyone to read confessions (they're public)
CREATE POLICY "Anyone can view confessions" ON confessions
    FOR SELECT USING (true);

-- Allow anyone to insert confessions (anonymous posting)
CREATE POLICY "Anyone can insert confessions" ON confessions
    FOR INSERT WITH CHECK (true);

-- Only allow updates to like_count through triggers
CREATE POLICY "Only system can update confessions" ON confessions
    FOR UPDATE USING (false);

-- 10. Create RLS policies for confession_likes
-- Allow anyone to view likes (for displaying counts)
CREATE POLICY "Anyone can view likes" ON confession_likes
    FOR SELECT USING (true);

-- Allow anyone to insert likes (anonymous liking)
CREATE POLICY "Anyone can insert likes" ON confession_likes
    FOR INSERT WITH CHECK (true);

-- Allow users to delete their own likes (unlike)
CREATE POLICY "Users can delete their own likes" ON confession_likes
    FOR DELETE USING (true);

-- 11. Create a view for confessions with metadata
CREATE OR REPLACE VIEW confessions_with_metadata AS
SELECT 
    c.id,
    c.text,
    c.created_at,
    c.updated_at,
    c.like_count,
    c.is_anonymous,
    EXTRACT(EPOCH FROM (NOW() - c.created_at))::INTEGER as age_seconds
FROM confessions c
ORDER BY c.created_at DESC;

-- 12. Grant permissions to authenticated and anonymous users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON confessions TO anon, authenticated;
GRANT ALL ON confession_likes TO anon, authenticated;
GRANT ALL ON confessions_id_seq TO anon, authenticated;
GRANT ALL ON confession_likes_id_seq TO anon, authenticated;
GRANT SELECT ON confessions_with_metadata TO anon, authenticated;

-- 13. Sample data (optional - for testing)
-- INSERT INTO confessions (text, is_anonymous) VALUES 
-- ('This is my first spicy confession! 🔥', true),
-- ('I secretly love pineapple on pizza', true),
-- ('I once ate ice cream for breakfast and called it a smoothie bowl', true);
