'use client'

import { useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import JSZip from 'jszip'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ClientUpload() {
  const [uploading, setUploading] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function extractCover(file: File): Promise<Blob | null> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)

      // 读取 container.xml
      const containerXml = await zip.file('META-INF/container.xml')?.async('text')
      if (!containerXml) return null

      const rootfileMatch = containerXml.match(/full-path="([^"]+)"/)
      if (!rootfileMatch) return null

      const contentOpfPath = rootfileMatch[1]
      const contentOpf = await zip.file(contentOpfPath)?.async('text')
      if (!contentOpf) return null

      // 查找封面
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
        if (itemMatch) {
          coverHref = itemMatch[1]
        }
      }

      // 方法2: properties="cover-image"
      if (!coverHref) {
        const coverImageMatch = contentOpf.match(/<item[^>]+properties="cover-image"[^>]+href="([^"]+)"/)
        if (coverImageMatch) {
          coverHref = coverImageMatch[1]
        }
      }

      // 方法3: 搜索文件名包含cover的图片
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

      // 提取封面
      const opfDir = contentOpfPath.substring(0, contentOpfPath.lastIndexOf('/') + 1)
      const fullCoverPath = isAbsolutePath ? coverHref : (opfDir + coverHref)

      const coverFile = zip.file(fullCoverPath)
      if (!coverFile) return null

      const coverBlob = await coverFile.async('blob')
      return coverBlob

    } catch (error) {
      console.error('封面提取失败:', error)
      return null
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const file = formData.get('file') as File
      const title = formData.get('title') as string

      if (!file || !title) {
        throw new Error('请选择文件并输入书名')
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('请先登录')
      }

      // 1. 提取封面（客户端）
      console.log('📸 开始提取封面...')
      const coverBlob = await extractCover(file)

      // 2. 生成文件名
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const epubFileName = `${user.id}-${timestamp}-${randomStr}.epub`
      const epubPath = `${user.id}/${epubFileName}`

      // 3. 上传 EPUB
      console.log('📤 上传 EPUB...')
      const { error: epubError } = await supabase.storage
        .from('user_books')
        .upload(epubPath, file)

      if (epubError) throw epubError

      const { data: epubUrlData } = supabase.storage
        .from('user_books')
        .getPublicUrl(epubPath)

      // 4. 上传封面（如果有）
      let coverUrl: string | null = null
      if (coverBlob) {
        console.log('📤 上传封面...')
        const coverFileName = `${epubFileName.replace('.epub', '_cover.jpg')}`
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

      // 5. 创建数据库记录
      console.log('💾 创建数据库记录...')
      const { error: dbError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: title.trim(),
          file_url: epubUrlData.publicUrl,
          cover_url: coverUrl,
        })

      if (dbError) throw dbError

      console.log('✅ 上传完成！')
      router.refresh()
      
      // 清空表单
      e.currentTarget.reset()
      setCoverPreview(null)

    } catch (err: any) {
      console.error('上传失败:', err)
      setError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  // 文件选择时预览封面
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const cover = await extractCover(file)
    if (cover) {
      const url = URL.createObjectURL(cover)
      setCoverPreview(url)
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">书名</label>
        <input
          type="text"
          name="title"
          placeholder="输入书名"
          required
          className="w-full px-4 py-2 border rounded-lg"
          disabled={uploading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">EPUB 文件</label>
        <input
          type="file"
          name="file"
          accept=".epub"
          required
          onChange={handleFileChange}
          className="w-full px-4 py-2 border rounded-lg"
          disabled={uploading}
        />
      </div>

      {coverPreview && (
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">封面预览</p>
          <img
            src={coverPreview}
            alt="Cover Preview"
            className="max-w-xs rounded-lg shadow-lg"
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            上传中...
          </>
        ) : (
          <>
            <Upload size={20} />
            上传书籍
          </>
        )}
      </button>
    </form>
  )
}
