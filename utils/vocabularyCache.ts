import { createClient } from '@/utils/supabase/client'

/**
 * 生成上下文哈希值（用于快速查询）
 */
function generateContextHash(selectedText: string, context: string): string {
  const text = `${selectedText}|${context}`
  // 简单哈希算法（生产环境建议使用 crypto 库）
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * 查询词汇缓存
 */
export async function getVocabularyCache(
  bookId: string,
  selectedText: string,
  context: string
) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated', data: null }
    }

    const contextHash = generateContextHash(selectedText, context)

    // 查询缓存
    const { data, error } = await supabase
      .from('vocabulary_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('context_hash', contextHash)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 没有缓存
        return { success: true, data: null }
      }
      console.error('❌ 查询词汇缓存失败:', error)
      return { success: false, error: error.message, data: null }
    }

    // 找到缓存，更新访问统计
    await supabase
      .from('vocabulary_cache')
      .update({
        accessed_count: (data.accessed_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    console.log('✅ 找到词汇缓存:', { selectedText, accessed_count: data.accessed_count + 1 })
    return { success: true, data }
  } catch (error) {
    console.error('❌ 查询词汇缓存异常:', error)
    return { success: false, error: String(error), data: null }
  }
}

/**
 * 保存词汇缓存
 */
export async function saveVocabularyCache(
  bookId: string,
  selectedText: string,
  context: string,
  aiExplanation: string
) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const contextHash = generateContextHash(selectedText, context)

    // 插入缓存
    const { error } = await supabase
      .from('vocabulary_cache')
      .insert({
        user_id: user.id,
        book_id: bookId,
        selected_text: selectedText,
        context,
        context_hash: contextHash,
        ai_explanation: aiExplanation,
        created_at: new Date().toISOString(),
        accessed_count: 1,
        last_accessed_at: new Date().toISOString(),
      })

    if (error) {
      console.error('❌ 保存词汇缓存失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 词汇缓存已保存:', { selectedText })
    return { success: true }
  } catch (error) {
    console.error('❌ 保存词汇缓存异常:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 获取所有词汇缓存（用于词汇列表）
 */
export async function getAllVocabularyCache(bookId?: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    let query = supabase
      .from('vocabulary_cache')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false })

    // 如果指定了书籍ID，只查询该书籍的词汇
    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 获取词汇列表失败:', error)
      return { success: false, error: error.message, data: [] }
    }

    console.log('✅ 词汇列表已加载:', data?.length || 0, '条')
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('❌ 获取词汇列表异常:', error)
    return { success: false, error: String(error), data: [] }
  }
}

/**
 * 搜索词汇缓存
 */
export async function searchVocabularyCache(searchText: string, bookId?: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    let query = supabase
      .from('vocabulary_cache')
      .select('*')
      .eq('user_id', user.id)
      .ilike('selected_text', `%${searchText}%`)
      .order('last_accessed_at', { ascending: false })

    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 搜索词汇失败:', error)
      return { success: false, error: error.message, data: [] }
    }

    console.log('✅ 搜索结果:', data?.length || 0, '条')
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('❌ 搜索词汇异常:', error)
    return { success: false, error: String(error), data: [] }
  }
}

/**
 * 删除单个词汇
 */
export async function deleteVocabularyCache(vocabularyId: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // 删除词汇（仅删除属于当前用户的）
    const { error } = await supabase
      .from('vocabulary_cache')
      .delete()
      .eq('id', vocabularyId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ 删除词汇失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 词汇已删除:', vocabularyId)
    return { success: true }
  } catch (error) {
    console.error('❌ 删除词汇异常:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 批量删除词汇
 */
export async function deleteMultipleVocabulary(vocabularyIds: string[]) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // 批量删除
    const { error } = await supabase
      .from('vocabulary_cache')
      .delete()
      .in('id', vocabularyIds)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ 批量删除词汇失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 批量删除完成:', vocabularyIds.length, '条')
    return { success: true }
  } catch (error) {
    console.error('❌ 批量删除词汇异常:', error)
    return { success: false, error: String(error) }
  }
}
