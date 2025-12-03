import { createClient } from '@/utils/supabase/client'

/**
 * 添加书签
 */
export async function addBookmark(
  bookId: string,
  cfi: string,
  chapterName?: string,
  note?: string
) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        book_id: bookId,
        cfi,
        chapter_name: chapterName,
        note,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('❌ 添加书签失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 书签已添加')
    return { success: true }
  } catch (error) {
    console.error('❌ 添加书签异常:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 删除书签
 */
export async function deleteBookmark(bookmarkId: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ 删除书签失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 书签已删除')
    return { success: true }
  } catch (error) {
    console.error('❌ 删除书签异常:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 获取书签列表
 */
export async function getBookmarks(bookId?: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    let query = supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 获取书签列表失败:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('❌ 获取书签列表异常:', error)
    return { success: false, error: String(error), data: [] }
  }
}

/**
 * 更新书签备注
 */
export async function updateBookmarkNote(bookmarkId: string, note: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('bookmarks')
      .update({ note })
      .eq('id', bookmarkId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ 更新书签备注失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 书签备注已更新')
    return { success: true }
  } catch (error) {
    console.error('❌ 更新书签备注异常:', error)
    return { success: false, error: String(error) }
  }
}
