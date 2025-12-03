'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createBookRecord } from '@/app/dashboard/actions'
import { Upload, Plus, Loader2, CheckCircle2 } from 'lucide-react'

/**
 * 书籍上传组件
 * 
 * 功能：
 * 1. 点击卡片触发文件选择
 * 2. 上传到 Supabase Storage
 * 3. 创建数据库记录
 * 4. 自动刷新页面
 * 
 * 使用：
 * ```tsx
 * import BookUploader from '@/components/dashboard/BookUploader'
 * 
 * <BookUploader />
 * ```
 */
export default function BookUploader() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 处理文件上传
   */
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    
    if (!file) return

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.epub')) {
      alert('只支持 EPUB 格式的电子书')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // 验证文件大小（50MB）
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      alert(`文件大小不能超过 50MB\n当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    await uploadBook(file)
  }

  /**
   * 上传书籍到 Storage 并创建数据库记录
   */
  async function uploadBook(file: File) {
    try {
      setUploading(true)
      setProgress('准备上传...')

      // 1. 创建 Supabase 客户端
      const supabase = createClient()

      // 2. 获取当前用户
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('请先登录')
      }

      setProgress('正在上传文件...')

      // 3. 生成唯一文件名（简洁格式，避免特殊字符）
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const fileName = `${user.id}-${timestamp}-${randomStr}.epub`

      // 4. 构建 Storage 路径：user_id/fileName
      const filePath = `${user.id}/${fileName}`

      // 5. 上传文件到 Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user_books')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('上传失败:', uploadError)
        throw new Error(uploadError.message || '上传文件失败')
      }

      setProgress('获取文件链接...')

      // 6. 获取文件的公开 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('user_books').getPublicUrl(filePath)

      if (!publicUrl) {
        // 如果无法获取 URL，删除已上传的文件
        await supabase.storage.from('user_books').remove([filePath])
        throw new Error('获取文件链接失败')
      }

      setProgress('保存书籍信息...')

      // 7. 从文件名提取书名（去掉时间戳和随机字符串）
      const bookTitle = file.name.replace(/\.epub$/i, '')

      // 8. 调用 Server Action 创建数据库记录
      const result = await createBookRecord(publicUrl, bookTitle, filePath)

      if (!result.success) {
        // 数据库记录创建失败，删除已上传的文件
        await supabase.storage.from('user_books').remove([filePath])
        throw new Error(result.error || '保存书籍信息失败')
      }

      setProgress('上传成功！')

      // 9. 成功提示
      alert(`《${bookTitle}》上传成功！`)

      // 10. 重置状态
      setTimeout(() => {
        setUploading(false)
        setProgress('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 1000)

      // 注意：不需要手动刷新，createBookRecord 已调用 revalidatePath
    } catch (error) {
      console.error('上传书籍时发生错误:', error)
      
      const errorMessage =
        error instanceof Error ? error.message : '上传失败，请重试'
      
      alert(`上传失败：${errorMessage}`)
      
      setUploading(false)
      setProgress('')
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  /**
   * 点击卡片触发文件选择
   */
  function handleCardClick() {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`
        relative overflow-hidden
        border-2 border-dashed rounded-2xl
        aspect-[3/4] flex flex-col items-center justify-center
        transition-all duration-200 cursor-pointer
        ${
          uploading
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
        }
      `}
    >
      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        aria-label="选择 EPUB 文件"
      />

      {/* 上传状态显示 */}
      {uploading ? (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          {progress === '上传成功！' ? (
            <>
              <CheckCircle2 className="text-green-500 animate-bounce" size={48} />
              <div>
                <p className="text-green-700 font-semibold">上传成功！</p>
                <p className="text-sm text-green-600 mt-1">
                  正在刷新书架...
                </p>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="text-blue-500 animate-spin" size={48} />
              <div>
                <p className="text-blue-700 font-semibold">上传中...</p>
                <p className="text-sm text-blue-600 mt-1">{progress}</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          {/* 上传图标 */}
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Plus className="text-gray-600 group-hover:text-blue-600" size={32} />
          </div>

          {/* 提示文字 */}
          <div>
            <p className="text-gray-900 font-semibold mb-1">上传书籍</p>
            <p className="text-sm text-gray-500">
              支持 EPUB 格式
            </p>
            <p className="text-xs text-gray-400 mt-1">
              最大 50MB
            </p>
          </div>

          {/* 上传按钮样式 */}
          <div className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Upload size={16} className="inline mr-2" />
            选择文件
          </div>
        </div>
      )}

      {/* 悬停效果 */}
      {!uploading && (
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/0 to-blue-500/0 hover:from-blue-500/5 hover:to-blue-500/10 transition-all duration-300 pointer-events-none" />
      )}
    </div>
  )
}
