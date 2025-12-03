-- 添加音频缓存字段到 vocabulary_cache 表
-- 日期: 2024-12-03

ALTER TABLE vocabulary_cache
ADD COLUMN IF NOT EXISTS audio_data TEXT,
ADD COLUMN IF NOT EXISTS audio_mime_type VARCHAR(50) DEFAULT 'audio/wav';

-- 添加注释
COMMENT ON COLUMN vocabulary_cache.audio_data IS 'Base64编码的音频数据（WAV格式）';
COMMENT ON COLUMN vocabulary_cache.audio_mime_type IS '音频MIME类型，默认为audio/wav';

-- 创建索引以加速查询（可选）
CREATE INDEX IF NOT EXISTS idx_vocabulary_cache_audio 
ON vocabulary_cache(user_id, selected_text) 
WHERE audio_data IS NOT NULL;
