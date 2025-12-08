'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Book } from '@/utils/supabase/types'

/**
 * Server Actions - 书架和书籍管理
 */

// 返回类型定义
type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

/**
 * 创建书籍记录
 * 
 * 将上传的书籍信息保存到数据库
 * 
 * @param fileUrl - Storage 中的文件下载链接
 * @param title - 书籍标题
 * @param filePath - Storage 中的文件路径（用于后续删除）
 * @returns 操作结果
 * 
 * 使用示例：
 * ```tsx
 * const result = await createBookRecord(fileUrl, '书名', 'path/to/file.epub')
 * if (result.success) {
 *   console.log('书籍创建成功')
 * }
 * ```
 */
export async function createBookRecord(
  fileUrl: string,
  title: string,
  filePath?: string,
  coverUrl?: string | null,
): Promise<ActionResult<Book>> {
  try {
    // 1. 参数验证
    if (!fileUrl || !title || !filePath) {
      return {
        success: false,
        error: '缺少必需参数：fileUrl, title, filePath',
      }
    }

    // 验证 fileUrl 格式
    try {
      new URL(fileUrl)
    } catch {
      return {
        success: false,
        error: '无效的文件 URL',
      }
    }

    // 2. 创建 Supabase 客户端
    const supabase = await createClient()

    // 3. 验证用户是否登录
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('获取用户失败:', userError)
      return {
        success: false,
        error: '请先登录',
      }
    }

    // 4. 插入书籍记录
    const { data: book, error: insertError } = await supabase
      .from('books')
      .insert({
        user_id: user.id,
        title: title.trim(),
        file_url: fileUrl,
        cover_url: coverUrl,
      })
      .select()
      .single()

    // 5. 处理插入错误
    if (insertError) {
      console.error('插入书籍记录失败:', insertError)
      
      // 根据错误类型返回友好信息
      if (insertError.code === '23505') {
        // 唯一约束冲突
        return {
          success: false,
          error: '该书籍已存在',
        }
      }
      
      return {
        success: false,
        error: insertError.message || '保存书籍信息失败',
      }
    }

    // 6. 刷新书架页面缓存
    revalidatePath('/dashboard')

    // 7. 返回成功结果
    return {
      success: true,
      data: book,
    }
  } catch (error) {
    console.error('创建书籍记录时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建书籍记录失败',
    }
  }
}

/**
 * 删除书籍记录
 * 
 * 从数据库中删除书籍记录，同时删除 Storage 中的文件
 * 
 * @param bookId - 书籍 ID
 * @returns 操作结果
 * 
 * 使用示例：
 * ```tsx
 * const result = await deleteBook('book-id-123')
 * if (result.success) {
 *   console.log('书籍删除成功')
 * }
 * ```
 */
export async function deleteBook(bookId: string): Promise<ActionResult> {
  try {
    // 1. 参数验证
    if (!bookId) {
      return {
        success: false,
        error: '缺少书籍 ID',
      }
    }

    // 2. 创建 Supabase 客户端
    const supabase = await createClient()

    // 3. 验证用户是否登录
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: '请先登录',
      }
    }

    // 4. 获取书籍信息（用于删除文件）
    const { data: book, error: fetchError } = await supabase
      .from('books')
      .select('id, file_url, user_id')
      .eq('id', bookId)
      .eq('user_id', user.id) // 确保只能删除自己的书籍
      .single()

    if (fetchError || !book) {
      console.error('获取书籍信息失败:', fetchError)
      return {
        success: false,
        error: '书籍不存在或无权限删除',
      }
    }

    // 5. 从 file_url 中提取文件路径
    // 格式: https://xxx.supabase.co/storage/v1/object/public/user_books/user_id/file.epub
    let filePath: string | null = null
    try {
      const url = new URL(book.file_url)
      const pathMatch = url.pathname.match(/\/user_books\/(.+)$/)
      if (pathMatch) {
        filePath = pathMatch[1]
      }
    } catch (error) {
      console.error('解析文件路径失败:', error)
      // 继续删除数据库记录，即使文件删除失败
    }

    // 6. 删除 Storage 中的文件
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('user_books')
        .remove([filePath])

      if (storageError) {
        console.error('删除 Storage 文件失败:', storageError)
        // 不阻止删除数据库记录
      }
    }

    // 7. 删除数据库记录（级联删除会自动删除相关 notes）
    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('删除书籍记录失败:', deleteError)
      return {
        success: false,
        error: deleteError.message || '删除书籍失败',
      }
    }

    // 8. 刷新书架页面缓存
    revalidatePath('/dashboard')

    // 9. 返回成功结果
    return {
      success: true,
    }
  } catch (error) {
    console.error('删除书籍时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除书籍失败',
    }
  }
}

/**
 * 获取当前用户的书籍列表
 * 
 * @returns 书籍列表
 * 
 * 使用示例：
 * ```tsx
 * const result = await getUserBooks()
 * if (result.success && result.data) {
 *   result.data.forEach(book => console.log(book.title))
 * }
 * ```
 */
export async function getUserBooks(): Promise<ActionResult<Book[]>> {
  try {
    // 1. 创建 Supabase 客户端
    const supabase = await createClient()

    // 2. 验证用户是否登录
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: '请先登录',
      }
    }

    // 3. 查询用户的书籍
    const { data: books, error: queryError } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('查询书籍失败:', queryError)
      return {
        success: false,
        error: queryError.message || '获取书籍列表失败',
      }
    }

    // 4. 返回结果
    return {
      success: true,
      data: books || [],
    }
  } catch (error) {
    console.error('获取书籍列表时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取书籍列表失败',
    }
  }
}

/**
 * 获取单本书籍的详细信息
 * 
 * @param bookId - 书籍 ID
 * @returns 书籍信息
 * 
 * 使用示例：
 * ```tsx
 * const result = await getBook('book-id-123')
 * if (result.success && result.data) {
 *   console.log(result.data.title)
 * }
 * ```
 */
export async function getBook(bookId: string): Promise<ActionResult<Book>> {
  try {
    // 1. 参数验证
    if (!bookId) {
      return {
        success: false,
        error: '缺少书籍 ID',
      }
    }

    // 2. 创建 Supabase 客户端
    const supabase = await createClient()

    // 3. 验证用户是否登录
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: '请先登录',
      }
    }

    // 4. 查询书籍信息
    const { data: book, error: queryError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id) // 确保只能访问自己的书籍
      .single()

    if (queryError) {
      console.error('查询书籍失败:', queryError)
      
      if (queryError.code === 'PGRST116') {
        // 记录不存在
        return {
          success: false,
          error: '书籍不存在或无权限访问',
        }
      }
      
      return {
        success: false,
        error: queryError.message || '获取书籍信息失败',
      }
    }

    // 5. 返回结果
    return {
      success: true,
      data: book,
    }
  } catch (error) {
    console.error('获取书籍信息时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取书籍信息失败',
    }
  }
}

/**
 * 更新书籍标题
 * 
 * @param bookId - 书籍 ID
 * @param newTitle - 新标题
 * @returns 操作结果
 * 
 * 使用示例：
 * ```tsx
 * const result = await updateBookTitle('book-id-123', '新书名')
 * if (result.success) {
 *   console.log('标题更新成功')
 * }
 * ```
 */
export async function updateBookTitle(
  bookId: string,
  newTitle: string
): Promise<ActionResult<Book>> {
  try {
    // 1. 参数验证
    if (!bookId || !newTitle) {
      return {
        success: false,
        error: '缺少必需参数',
      }
    }

    const trimmedTitle = newTitle.trim()
    if (trimmedTitle.length === 0) {
      return {
        success: false,
        error: '书名不能为空',
      }
    }

    // 2. 创建 Supabase 客户端
    const supabase = await createClient()

    // 3. 验证用户是否登录
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: '请先登录',
      }
    }

    // 4. 更新书籍标题
    const { data: book, error: updateError } = await supabase
      .from('books')
      .update({ title: trimmedTitle })
      .eq('id', bookId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('更新书籍标题失败:', updateError)
      return {
        success: false,
        error: updateError.message || '更新标题失败',
      }
    }

    // 5. 刷新书架页面缓存
    revalidatePath('/dashboard')
    revalidatePath(`/read/${bookId}`)

    // 6. 返回结果
    return {
      success: true,
      data: book,
    }
  } catch (error) {
    console.error('更新书籍标题时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新标题失败',
    }
  }
}
