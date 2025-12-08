'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

export default function TestCoverPage() {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setCoverUrl(null)
    setLogs([])

    try {
      addLog(`开始处理文件: ${file.name}`)
      addLog(`文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

      // 动态导入JSZip（客户端）
      const JSZip = (await import('jszip')).default
      addLog('JSZip加载完成')

      // 读取文件
      const arrayBuffer = await file.arrayBuffer()
      addLog('文件读取完成')

      // 解析EPUB
      const zip = await JSZip.loadAsync(arrayBuffer)
      addLog('EPUB解析完成')

      // 读取container.xml
      const containerXml = await zip.file('META-INF/container.xml')?.async('text')
      if (!containerXml) {
        throw new Error('未找到 META-INF/container.xml')
      }
      addLog('✓ 找到 container.xml')

      // 解析content.opf路径
      const rootfileMatch = containerXml.match(/full-path="([^"]+)"/)
      if (!rootfileMatch) {
        throw new Error('无法解析 content.opf 路径')
      }
      const contentOpfPath = rootfileMatch[1]
      addLog(`✓ content.opf 路径: ${contentOpfPath}`)

      // 读取content.opf
      const contentOpf = await zip.file(contentOpfPath)?.async('text')
      if (!contentOpf) {
        throw new Error('未找到 content.opf')
      }
      addLog('✓ 读取 content.opf 完成')

      // 方法1：查找meta标签中的cover
      let coverHref: string | null = null
      const coverMetaMatch = contentOpf.match(/<meta\s+name="cover"\s+content="([^"]+)"/)
      if (coverMetaMatch) {
        const coverId = coverMetaMatch[1]
        addLog(`✓ 找到封面ID (meta标签): ${coverId}`)
        const itemMatch = contentOpf.match(new RegExp(`<item[^>]+id="${coverId}"[^>]+href="([^"]+)"`))
        if (itemMatch) {
          coverHref = itemMatch[1]
          addLog(`✓ 方法1成功: ${coverHref}`)
        }
      }

      // 方法2：查找properties="cover-image"
      if (!coverHref) {
        addLog('尝试方法2: properties="cover-image"')
        const coverImageMatch = contentOpf.match(/<item[^>]+properties="cover-image"[^>]+href="([^"]+)"/)
        if (coverImageMatch) {
          coverHref = coverImageMatch[1]
          addLog(`✓ 方法2成功: ${coverHref}`)
        }
      }

      // 方法3：在所有文件中查找包含"cover"的图片文件
      if (!coverHref) {
        addLog('尝试方法3: 查找包含"cover"的图片文件')
        const allFiles = Object.keys(zip.files)
        addLog(`EPUB中的所有文件 (${allFiles.length}个):`)
        allFiles.slice(0, 30).forEach(f => addLog(`  - ${f}`))
        
        const coverFiles = allFiles.filter(f => {
          const lower = f.toLowerCase()
          return (lower.includes('cover') || lower.includes('mycoverimage')) && 
                 (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || 
                  lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp'))
        })
        
        if (coverFiles.length > 0) {
          addLog(`找到 ${coverFiles.length} 个可能的封面文件:`)
          coverFiles.forEach(f => addLog(`  - ${f}`))
          // 优先选择最短的路径
          coverHref = coverFiles.sort((a, b) => a.length - b.length)[0]
          addLog(`✓ 方法3成功: ${coverHref}`)
        }
      }
      
      // 方法4：查找常见封面文件名（精确匹配）
      if (!coverHref) {
        addLog('尝试方法4: 精确匹配常见封面文件名')
        const commonCoverNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif']
        const allFiles = Object.keys(zip.files)
        
        for (const name of commonCoverNames) {
          const files = allFiles.filter(f => f.toLowerCase().endsWith(name))
          if (files.length > 0) {
            coverHref = files[0]
            addLog(`✓ 方法4成功: ${coverHref}`)
            break
          }
        }
      }

      if (!coverHref) {
        throw new Error('未找到封面图片（尝试了3种方法）')
      }

      // 提取封面
      const opfDir = contentOpfPath.substring(0, contentOpfPath.lastIndexOf('/') + 1)
      const fullCoverPath = opfDir + coverHref
      addLog(`完整封面路径: ${fullCoverPath}`)

      const coverFile = zip.file(fullCoverPath)
      if (!coverFile) {
        throw new Error(`封面文件不存在: ${fullCoverPath}`)
      }

      const coverData = await coverFile.async('blob')
      addLog(`✓ 封面提取成功，大小: ${(coverData.size / 1024).toFixed(2)} KB`)

      // 创建预览URL
      const url = URL.createObjectURL(coverData)
      setCoverUrl(url)
      addLog('✅ 封面显示成功！')

    } catch (err: any) {
      const errorMsg = err.message || '未知错误'
      setError(errorMsg)
      addLog(`❌ 错误: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">EPUB 封面提取测试工具</h1>
        <p className="text-gray-600 mb-8">上传EPUB文件测试封面提取功能</p>

        {/* 上传区域 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
            <Upload size={40} className="text-gray-400 mb-2" />
            <span className="text-gray-600">点击选择EPUB文件</span>
            <input
              type="file"
              accept=".epub"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700">正在处理...</p>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-semibold">错误</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 封面预览 */}
        {coverUrl && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">封面预览</h2>
            <img
              src={coverUrl}
              alt="EPUB Cover"
              className="max-w-md mx-auto rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* 日志 */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">处理日志</h2>
            <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`text-sm font-mono mb-1 ${
                    log.includes('✓') || log.includes('✅')
                      ? 'text-green-600'
                      : log.includes('❌')
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
