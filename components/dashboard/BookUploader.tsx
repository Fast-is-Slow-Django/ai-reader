'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Upload, Plus, Loader2, CheckCircle2 } from 'lucide-react'
import JSZip from 'jszip'
import { useRouter } from 'next/navigation'

/**
 * 客户端提取 EPUB 封面
 */
async function extractCover(file: File): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    const containerXml = await zip.file('META-INF/container.xml')?.async('text')
    if (!containerXml) return null

    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/)
    if (!rootfileMatch) return null

    const contentOpfPath = rootfileMatch[1]
    const contentOpf = await zip.file(contentOpfPath)?.async('text')
    if (!contentOpf) return null

    let coverHref: string | null = null
    let isAbsolutePath = false

    // 方法1: meta标签
    const coverMetaMatch = contentOpf.match(/<meta\s+name="cover"\s+content="([^"]+)"/)
    if (coverMetaMatch) {
      const coverId = coverMetaMatch[1]
      let itemMatch = contentOpf.match(new RegExp(`<item[^>]+id="${coverId}"[^>]+href="([^"]+)"`))
      if (!itemMatch) {
        itemMatch = contentOpf.match(new RegExp(`<item[^>]+href="([^"]+)"[^>]+id="${coverId}"`))
      }
      if (itemMatch) coverHref = itemMatch[1]
    }

    // 方法2: properties
    if (!coverHref) {
      const coverImageMatch = contentOpf.match(/<item[^>]+properties="cover-image"[^>]+href="([^"]+)"/)
      if (coverImageMatch) coverHref = coverImageMatch[1]
    }

    // 方法3: 搜索包含cover的图片
    if (!coverHref) {
      const allFiles = Object.keys(zip.files)
      const coverFiles = allFiles.filter(f => {
        const lower = f.toLowerCase()
        return (lower.includes('cover') || lower.includes('mycoverimage')) &&
          (lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
            lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp'))
      })
      if (coverFiles.length > 0) {
        coverHref = coverFiles.sort((a, b) => a.length - b.length)[0]
        isAbsolutePath = true
      }
    }

    if (!coverHref) return null

    const opfDir = contentOpfPath.substring(0, contentOpfPath.lastIndexOf('/') + 1)
    const fullCoverPath = isAbsolutePath ? coverHref : (opfDir + coverHref)

    const coverFile = zip.file(fullCoverPath)
    if (!coverFile) return null

    return await coverFile.async('blob')
  } catch (error) {
    console.error('封面提取失败:', error)
    return null
  }
}

export default function BookUploader() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.epub')) {
      alert('只支持 EPUB 格式的电子书')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      alert(`文件大小不能超过 50MB\n当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    await uploadBook(file)
  }

  /**
   * 客户端上传：提取封面 + 上传
   */
  async function uploadBook(file: File) {
    try {
      setUploading(true)
      setProgress('准备上传...')

      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('请先登录')
      }

      // 客户端提取封面
      setProgress('正在提取封面...')
      const coverBlob = await extractCover(file)
      if (coverBlob) {
        console.log('✅ 封面提取成功')
      } else {
        console.log('⚠️ 未找到封面')
      }

      setProgress('正在上传文件...')

      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const fileName = `${user.id}-${timestamp}-${randomStr}.epub`
      const filePath = `${user.id}/${fileName}`

      // 上传 EPUB
      const { error: uploadError } = await supabase.storage
        .from('user_books')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message || '上传文件失败')
      }

      const { data: { publicUrl } } = supabase.storage
        .from('user_books')
        .getPublicUrl(filePath)

      if (!publicUrl) {
        await supabase.storage.from('user_books').remove([filePath])
        throw new Error('获取文件链接失败')
      }

      // 上传封面（如果有）
      let coverUrl: string | null = null
      if (coverBlob) {
        setProgress('正在上传封面...')
        const coverFileName = `${fileName.replace('.epub', '_cover.jpg')}`
        const coverPath = `${user.id}/covers/${coverFileName}`

        const { error: coverError } = await supabase.storage
          .from('user_books')
          .upload(coverPath, coverBlob, {
            contentType: coverBlob.type,
            upsert: true
          })

        if (!coverError) {
          const { data: coverUrlData } = supabase.storage
            .from('user_books')
            .getPublicUrl(coverPath)
          coverUrl = coverUrlData.publicUrl
          console.log('✅ 封面上传成功:', coverUrl)
        }
      }

      setProgress('保存书籍信息...')

      const bookTitle = file.name.replace(/\.epub$/i, '')

      // 直接创建数据库记录（不用Server Action）
      const { error: dbError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: bookTitle,
          file_url: publicUrl,
          cover_url: coverUrl,
        })

      if (dbError) {
        await supabase.storage.from('user_books').remove([filePath])
        throw new Error(dbError.message || '保存书籍信息失败')
      }

      setProgress('上传成功！')

      alert(`《${bookTitle}》上传成功！`)

      // 重置状态并刷新页面
      setUploading(false)
      setProgress('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // 刷新书架
      router.refresh()
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
