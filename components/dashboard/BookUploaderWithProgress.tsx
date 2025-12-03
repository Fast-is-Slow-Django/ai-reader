'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createBookRecord } from '@/app/dashboard/actions'
import { Upload, Plus, Loader2, CheckCircle2, X } from 'lucide-react'

/**
 * 带进度条的书籍上传组件（增强版）
 * 
 * 功能：
 * 1. 文件拖拽上传
 * 2. 进度条显示
 * 3. 预览文件信息
 * 4. 可取消上传
 * 
 * 使用：
 * ```tsx
 * import BookUploaderWithProgress from '@/components/dashboard/BookUploaderWithProgress'
 * 
 * <BookUploaderWithProgress />
 * ```
 */
export default function BookUploaderWithProgress() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 处理文件选择
   */
  function handleFileSelect(file: File) {
    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.epub')) {
      alert('只支持 EPUB 格式的电子书')
      return
    }

    // 验证文件大小（50MB）
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      alert(`文件大小不能超过 50MB\n当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    setSelectedFile(file)
  }

  /**
   * 处理文件输入框变化
   */
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  /**
   * 处理拖拽
   */
  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  /**
   * 开始上传
   */
  async function startUpload() {
    if (!selectedFile) return

    try {
      setUploading(true)
      setProgress(10)
      setStatus('准备上传...')

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

      setProgress(20)
      setStatus('正在上传文件...')

      // 3. 生成唯一文件名
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const originalName = selectedFile.name
        .replace(/[^a-zA-Z0-9.\u4e00-\u9fa5-]/g, '_')
        .substring(0, 100)
      const fileName = `${timestamp}-${randomStr}-${originalName}`
      const filePath = `${user.id}/${fileName}`

      // 4. 上传文件
      const { error: uploadError } = await supabase.storage
        .from('user_books')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message || '上传文件失败')
      }

      setProgress(70)
      setStatus('获取文件链接...')

      // 5. 获取公开 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('user_books').getPublicUrl(filePath)

      if (!publicUrl) {
        await supabase.storage.from('user_books').remove([filePath])
        throw new Error('获取文件链接失败')
      }

      setProgress(85)
      setStatus('保存书籍信息...')

      // 6. 创建数据库记录
      const bookTitle = selectedFile.name.replace(/\.epub$/i, '')
      const result = await createBookRecord(publicUrl, bookTitle, filePath)

      if (!result.success) {
        await supabase.storage.from('user_books').remove([filePath])
        throw new Error(result.error || '保存书籍信息失败')
      }

      setProgress(100)
      setStatus('上传成功！')

      // 7. 成功提示
      setTimeout(() => {
        alert(`《${bookTitle}》上传成功！`)
        resetUploader()
      }, 1000)
    } catch (error) {
      console.error('上传失败:', error)
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      alert(`上传失败：${errorMessage}`)
      resetUploader()
    }
  }

  /**
   * 重置上传器
   */
  function resetUploader() {
    setUploading(false)
    setProgress(0)
    setStatus('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * 取消选择
   */
  function cancelSelection() {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative overflow-hidden
        border-2 border-dashed rounded-2xl
        aspect-[3/4] flex flex-col items-center justify-center
        transition-all duration-200
        ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : uploading
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50 cursor-pointer'
        }
      `}
      onClick={() => !selectedFile && !uploading && fileInputRef.current?.click()}
    >
      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />

      {/* 上传中 */}
      {uploading ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6">
          {progress === 100 ? (
            <>
              <CheckCircle2 className="text-green-500 animate-bounce mb-4" size={48} />
              <p className="text-green-700 font-semibold">上传成功！</p>
            </>
          ) : (
            <>
              <Loader2 className="text-blue-500 animate-spin mb-4" size={48} />
              <p className="text-blue-700 font-semibold mb-2">上传中...</p>
              <p className="text-sm text-blue-600 mb-4">{status}</p>
              
              {/* 进度条 */}
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{progress}%</p>
            </>
          )}
        </div>
      ) : selectedFile ? (
        /* 文件已选择 */
        <div className="w-full h-full flex flex-col items-center justify-center p-6">
          <CheckCircle2 className="text-green-500 mb-4" size={48} />
          
          <p className="text-sm text-gray-700 font-medium mb-1 text-center px-4 truncate max-w-full">
            {selectedFile.name}
          </p>
          <p className="text-xs text-gray-500 mb-6">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                startUpload()
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              开始上传
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                cancelSelection()
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        /* 初始状态 */
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus className="text-gray-600" size={32} />
          </div>

          <div>
            <p className="text-gray-900 font-semibold mb-1">上传书籍</p>
            <p className="text-sm text-gray-500">
              点击或拖拽 EPUB 文件到这里
            </p>
            <p className="text-xs text-gray-400 mt-1">
              最大 50MB
            </p>
          </div>

          <div className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors pointer-events-none">
            <Upload size={16} className="inline mr-2" />
            选择文件
          </div>
        </div>
      )}
    </div>
  )
}
