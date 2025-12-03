import { createClient } from '@/utils/supabase/client'

/**
 * 添加批注
 */
export async function addAnnotation(
  bookId: string,
  cfiRange: string,
  selectedText: string,
  note?: string,
  color: string = 'yellow'
) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('annotations')
      .insert({
        user_id: user.id,
        book_id: bookId,
        cfi_range: cfiRange,
        selected_text: selectedText,
        note,
        color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 添加批注失败:', error)
      return { success: false, error: error.message, data: null }
    }

    console.log('✅ 批注已添加')
    return { success: true, data }
  } catch (error) {
    console.error('❌ 添加批注异常:', error)
    return { success: false, error: String(error), data: null }
  }
}

/**
 * 删除批注
 */
export async function deleteAnnotation(annotationId: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('id', annotationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ 删除批注失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 批注已删除')
    return { success: true }
  } catch (error) {
    console.error('❌ 删除批注异常:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 获取批注列表
 */
export async function getAnnotations(bookId?: string) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    let query = supabase
      .from('annotations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 获取批注列表失败:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('❌ 获取批注列表异常:', error)
    return { success: false, error: String(error), data: [] }
  }
}

/**
 * 更新批注
 */
export async function updateAnnotation(
  annotationId: string,
  note?: string,
  color?: string
) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    if (note !== undefined) updateData.note = note
    if (color !== undefined) updateData.color = color

    const { error } = await supabase
      .from('annotations')
      .update(updateData)
      .eq('id', annotationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ 更新批注失败:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ 批注已更新')
    return { success: true }
  } catch (error) {
    console.error('❌ 更新批注异常:', error)
    return { success: false, error: String(error) }
  }
}
