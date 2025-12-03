import { createClient } from '@/utils/supabase/client'

/**
 * 保存阅读进度
 */
export async function saveReadingProgress(
  bookId: string,
  cfi: string,
  chapterName?: string,
  progressPercent?: number,
  fontSize?: number,
  theme?: string
) {
  try {
    const supabase = createClient()
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ 未登录，无法保存阅读进度')
      return { success: false, error: 'Not authenticated' }
    }

    // UPSERT 操作（有则更新，无则插入）
    const { error } = await supabase
      .from('reading_progress')
      .upsert(
        {
          user_id: user.id,
          book_id: bookId,
          cfi,
          chapter_name: chapterName,
          progress_percent: progressPercent,
          font_size: fontSize,
          theme: theme,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,book_id', // 根据用户ID和书籍ID判断冲突
        }
      )

    if (error) {
      console.error('❌ 保存阅读进度失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 阅读进度已保存:', { 
      bookId, 
      cfi, 
      chapterName, 
      progressPercent,
      fontSize,
      theme 
    })
    return { success: true }
  } catch (error) {
    console.error('❌ 保存阅读进度异常:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 只保存阅读设置（字体大小、主题），不更新位置
 * 如果记录不存在则创建，如果存在则只更新设置字段
 */
export async function saveReadingSettings(
  bookId: string,
  fontSize: number,
  theme: string
) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ 未登录，无法保存阅读设置')
      return { success: false, error: 'Not authenticated' }
    }

    // 先查询是否已有记录
    const { data: existing } = await supabase
      .from('reading_progress')
      .select('cfi, chapter_name, progress_percent')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    if (existing) {
      // 有记录：只更新设置，保留位置
      const { error } = await supabase
        .from('reading_progress')
        .update({
          font_size: fontSize,
          theme: theme,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('book_id', bookId)

      if (error) {
        console.error('❌ 更新阅读设置失败:', error)
        return { success: false, error: error.message }
      }
      console.log('✅ 阅读设置已更新:', { bookId, fontSize, theme })
    } else {
      // 无记录：创建新记录（使用默认位置）
      const { error } = await supabase
        .from('reading_progress')
        .insert({
          user_id: user.id,
          book_id: bookId,
          cfi: 'epubcfi(/6/2!/4/1:0)',  // 默认第一页
          chapter_name: '开始阅读',
          progress_percent: 0,
          font_size: fontSize,
          theme: theme,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error('❌ 创建阅读设置失败:', error)
        return { success: false, error: error.message }
      }
      console.log('✅ 阅读设置已创建:', { bookId, fontSize, theme })
    }

    return { success: true }
  } catch (error) {
    console.error('❌ 保存阅读设置异常:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 加载阅读进度
 */
export async function loadReadingProgress(bookId: string) {
  try {
    const supabase = createClient()
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ 未登录，无法加载阅读进度')
      return { success: false, error: 'Not authenticated', data: null }
    }

    // 查询阅读进度
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 没有记录，返回空
        console.log('ℹ️ 该书籍无阅读进度记录')
        return { success: true, data: null }
      }
      console.error('❌ 加载阅读进度失败:', error)
      return { success: false, error: error.message, data: null }
    }

    console.log('✅ 阅读进度已加载:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ 加载阅读进度异常:', error)
    return { success: false, error: String(error), data: null }
  }
}
