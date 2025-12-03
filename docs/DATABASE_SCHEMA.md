# 数据库表设计

## 1. reading_progress (阅读进度表)

```sql
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,  -- 书籍 ID（不使用外键，直接存储）
  cfi TEXT NOT NULL,  -- EPUB CFI 位置
  chapter_name TEXT,
  progress_percent DECIMAL(5,2),  -- 百分比 0-100
  font_size INTEGER DEFAULT 100,  -- 字体大小 (50-200)
  theme TEXT DEFAULT 'light',  -- 主题 ('light' or 'dark')
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, book_id)
);

-- 索引
CREATE INDEX idx_reading_progress_user_book ON reading_progress(user_id, book_id);

-- RLS 策略
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reading progress"
  ON reading_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## 2. vocabulary_cache (词汇缓存表)

```sql
CREATE TABLE vocabulary_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,  -- 书籍 ID（不使用外键，直接存储）
  selected_text TEXT NOT NULL,
  context TEXT NOT NULL,
  context_hash TEXT NOT NULL,  -- MD5(selected_text + context) 用于快速查询
  ai_explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_count INTEGER DEFAULT 1,  -- 访问次数
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_vocabulary_cache_user ON vocabulary_cache(user_id);
CREATE INDEX idx_vocabulary_cache_book ON vocabulary_cache(book_id);
CREATE INDEX idx_vocabulary_cache_hash ON vocabulary_cache(context_hash);
CREATE INDEX idx_vocabulary_cache_text ON vocabulary_cache(selected_text);

-- RLS 策略
ALTER TABLE vocabulary_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own vocabulary"
  ON vocabulary_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## 3. bookmarks (书签表)

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  cfi TEXT NOT NULL,  -- EPUB CFI 位置
  chapter_name TEXT,
  note TEXT,  -- 可选的备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_book ON bookmarks(book_id);
CREATE INDEX idx_bookmarks_user_book ON bookmarks(user_id, book_id);

-- RLS 策略
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks"
  ON bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## 4. annotations (批注标注表)

```sql
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  cfi_range TEXT NOT NULL,  -- EPUB CFI 范围
  selected_text TEXT NOT NULL,  -- 选中的文本
  note TEXT,  -- 批注内容
  color TEXT DEFAULT 'yellow',  -- 高亮颜色
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_annotations_user ON annotations(user_id);
CREATE INDEX idx_annotations_book ON annotations(book_id);
CREATE INDEX idx_annotations_user_book ON annotations(user_id, book_id);

-- RLS 策略
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own annotations"
  ON annotations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## 5. 使用说明

### 阅读进度
- 每次翻页时更新 `reading_progress`
- 使用 `UPSERT` 操作（有则更新，无则插入）
- 打开书籍时查询最新进度并跳转

### 词汇缓存
- 查询时先用 `context_hash` 查找缓存
- 找到则直接返回，并更新 `accessed_count` 和 `last_accessed_at`
- 未找到则调用 AI 并保存结果
- `context_hash = MD5(selected_text + '|' + context)` 保证精确匹配

### 词汇列表
- 按 `last_accessed_at` 或 `created_at` 排序
- 支持按 `selected_text` 搜索
- 显示词汇、上下文（截断）、解释
