-- 添加 cover_url 列到 books 表
-- 用于存储书籍封面图片的 URL

-- 添加 cover_url 列（可以为空，因为旧书可能没有封面）
ALTER TABLE books
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 添加注释
COMMENT ON COLUMN books.cover_url IS '书籍封面图片的公开 URL（来自 Supabase Storage）';

-- 添加索引以加快查询速度（可选）
CREATE INDEX IF NOT EXISTS idx_books_cover_url ON books(cover_url) WHERE cover_url IS NOT NULL;
