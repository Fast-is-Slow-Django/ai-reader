-- ============================================
-- 数据库更新脚本
-- 添加阅读设置记忆功能的字段
-- ============================================

-- 检查并添加 font_size 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reading_progress' 
        AND column_name = 'font_size'
    ) THEN
        ALTER TABLE reading_progress 
        ADD COLUMN font_size INTEGER DEFAULT 100;
        RAISE NOTICE '✅ 已添加 font_size 字段';
    ELSE
        RAISE NOTICE 'ℹ️ font_size 字段已存在';
    END IF;
END $$;

-- 检查并添加 theme 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reading_progress' 
        AND column_name = 'theme'
    ) THEN
        ALTER TABLE reading_progress 
        ADD COLUMN theme TEXT DEFAULT 'light';
        RAISE NOTICE '✅ 已添加 theme 字段';
    ELSE
        RAISE NOTICE 'ℹ️ theme 字段已存在';
    END IF;
END $$;

-- 验证字段已添加
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'reading_progress'
AND column_name IN ('font_size', 'theme')
ORDER BY column_name;
