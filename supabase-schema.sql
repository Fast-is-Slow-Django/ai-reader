-- =====================================================
-- AI-Reader Supabase Database Schema
-- =====================================================
-- 请在 Supabase SQL Editor 中运行此文件
-- =====================================================

-- =====================================================
-- 1. Books 表 - 存储用户上传的电子书信息
-- =====================================================

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 user_id 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);

-- 启用 Books 表的 RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Books RLS 策略 1: 用户只能查看自己的书籍
CREATE POLICY "Users can view their own books"
  ON books
  FOR SELECT
  USING (auth.uid() = user_id);

-- Books RLS 策略 2: 用户只能插入自己的书籍
CREATE POLICY "Users can insert their own books"
  ON books
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Books RLS 策略 3: 用户可以删除自己的书籍
CREATE POLICY "Users can delete their own books"
  ON books
  FOR DELETE
  USING (auth.uid() = user_id);

-- Books RLS 策略 4: 用户可以更新自己的书籍
CREATE POLICY "Users can update their own books"
  ON books
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 2. Notes 表 - 存储用户的笔记、高亮和 AI 解释
-- =====================================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  cfi_range TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  ai_explanation TEXT,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 user_id 和 book_id 创建索引
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_book ON notes(user_id, book_id);

-- 启用 Notes 表的 RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Notes RLS 策略 1: 用户只能查看自己的笔记
CREATE POLICY "Users can view their own notes"
  ON notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Notes RLS 策略 2: 用户只能插入自己的笔记
CREATE POLICY "Users can insert their own notes"
  ON notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Notes RLS 策略 3: 用户可以删除自己的笔记
CREATE POLICY "Users can delete their own notes"
  ON notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Notes RLS 策略 4: 用户可以更新自己的笔记
CREATE POLICY "Users can update their own notes"
  ON notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 3. Storage Bucket - 存储 EPUB 文件
-- =====================================================
-- 注意：Bucket 创建需要在 Supabase Dashboard 的 Storage 界面手动创建
-- 或使用以下 SQL（需要 supabase_admin 权限）
-- =====================================================

-- 创建 user_books 存储桶（如果尚未创建）
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_books', 'user_books', false)
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- 4. Storage Policies - 文件上传和下载权限
-- =====================================================

-- Storage 策略 1: 认证用户可以上传文件到自己的文件夹
CREATE POLICY "Users can upload their own books"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user_books' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage 策略 2: 用户只能查看自己上传的文件
CREATE POLICY "Users can view their own books"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user_books' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage 策略 3: 用户可以删除自己的文件
CREATE POLICY "Users can delete their own books"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user_books' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage 策略 4: 用户可以更新自己的文件
CREATE POLICY "Users can update their own books"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user_books' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'user_books' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- =====================================================
-- 完成！
-- =====================================================
-- 说明：
-- 1. 所有表都启用了 RLS，确保数据隔离
-- 2. Storage 文件路径格式建议：{user_id}/{book_id}.epub
-- 3. 索引已创建以优化查询性能
-- 4. 所有关系都设置了 CASCADE 删除，保持数据一致性
-- =====================================================
