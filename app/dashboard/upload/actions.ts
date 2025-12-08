'use server'

import { createClient } from '@/utils/supabase/server'
import { createBookRecord } from '../actions'

/**
 * Server Actions - 文件上传
 */

// 返回类型定义
type UploadResult = {
  success: boolean
  error?: string
  fileUrl?: string
  bookId?: string
}

/**
 * 上传 EPUB 文件到 Supabase Storage
 * 
 * 完整的上传流程：
 * 1. 验证用户登录
 * 2. 验证文件类型和大小
 * 3. 上传文件到 Storage
 * 4. 创建数据库记录
 * 5. 返回结果
 * 
 * @param formData - 包含文件的表单数据
 * @returns 上传结果
 * 
 * 使用示例：
 * ```tsx
 * 'use client'
 * import { uploadEpub } from './actions'
 * 
 * async function handleUpload(formData: FormData) {
 *   const result = await uploadEpub(formData)
 *   if (result.success) {
 *     console.log('上传成功！', result.fileUrl)
 *   } else {
 *     console.error('上传失败:', result.error)
 *   }
 * }
 * ```
 */
export async function uploadEpub(formData: FormData): Promise<UploadResult> {
  try {
    // 1. 获取文件和书名
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null

    // 2. 验证文件存在
    if (!file) {
      return {
        success: false,
        error: '请选择要上传的文件',
      }
    }

    // 3. 验证文件类型
    const allowedTypes = [
      'application/epub+zip',
      'application/epub',
      'application/x-epub',
    ]
    
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (fileExtension !== 'epub' && !allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: '只支持 EPUB 格式的电子书',
      }
    }

    // 4. 验证文件大小（限制 50MB）
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: '文件大小不能超过 50MB',
      }
    }

    // 5. 验证或生成书名
    let bookTitle = title?.trim()
    if (!bookTitle) {
      // 从文件名提取书名（去掉 .epub 扩展名）
      bookTitle = file.name.replace(/\.epub$/i, '')
    }

    if (bookTitle.length === 0) {
      return {
        success: false,
        error: '书名不能为空',
      }
    }

    // 6. 创建 Supabase 客户端
    const supabase = await createClient()

    // 7. 验证用户是否登录
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

    // 8. 生成唯一的文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    
    // 清理文件名：只保留字母、数字、中文、点和连字符
    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9.\u4e00-\u9fa5-]/g, '-')  // 使用连字符替代
      .replace(/-+/g, '-')  // 合并多个连字符为一个
      .replace(/^-|-$/g, '')  // 移除首尾的连字符
      .substring(0, 50)  // 限制长度为 50 字符
    
    // 生成最终文件名：使用 bookId 而不是复杂文件名
    const fileName = `${user.id}-${timestamp}-${randomStr}.epub`
    
    // 9. 构建 Storage 路径：user_id/fileName
    const filePath = `${user.id}/${fileName}`

    // 10. 上传文件到 Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user_books')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // 不覆盖已存在的文件
      })

    if (uploadError) {
      console.error('上传文件失败:', uploadError)
      
      if (uploadError.message.includes('already exists')) {
        return {
          success: false,
          error: '文件已存在，请重试',
        }
      }
      
      return {
        success: false,
        error: uploadError.message || '上传文件失败',
      }
    }

    // 11. 获取文件的公开 URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('user_books').getPublicUrl(filePath)

    if (!publicUrl) {
      // 上传成功但无法获取 URL，删除已上传的文件
      await supabase.storage.from('user_books').remove([filePath])
      
      return {
        success: false,
        error: '获取文件链接失败',
      }
    }

    // 12. 创建数据库记录
    // 暂时不处理封面，后续可以通过其他方式添加
    const bookResult = await createBookRecord(publicUrl, bookTitle, filePath, null)

    if (!bookResult.success) {
      // 数据库记录创建失败，删除已上传的文件
      await supabase.storage.from('user_books').remove([filePath])
      
      return {
        success: false,
        error: bookResult.error || '保存书籍信息失败',
      }
    }

    // 13. 返回成功结果
    return {
      success: true,
      fileUrl: publicUrl,
      bookId: bookResult.data?.id,
    }
  } catch (error) {
    console.error('上传 EPUB 时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    }
  }
}

/**
 * 验证 EPUB 文件（可选的预检查）
 * 
 * 在上传前验证文件是否有效
 * 
 * @param file - 要验证的文件
 * @returns 验证结果
 */
export async function validateEpubFile(file: File): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    // 1. 检查文件类型
    const allowedTypes = [
      'application/epub+zip',
      'application/epub',
      'application/x-epub',
    ]
    
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (fileExtension !== 'epub' && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: '只支持 EPUB 格式的电子书',
      }
    }

    // 2. 检查文件大小
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件大小不能超过 50MB（当前：${(file.size / 1024 / 1024).toFixed(2)}MB）`,
      }
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: '文件为空',
      }
    }

    // 3. 可以在这里添加更多验证逻辑
    // 例如：检查文件是否是有效的 ZIP 压缩包（EPUB 本质上是 ZIP）

    return {
      valid: true,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '文件验证失败',
    }
  }
}
