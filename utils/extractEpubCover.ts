import JSZip from 'jszip'

/**
 * 从EPUB文件中提取封面图片（服务器端）
 * @param arrayBuffer - EPUB文件的ArrayBuffer
 * @returns 封面图片的Buffer和MIME类型，如果没有封面则返回null
 */
export async function extractEpubCover(arrayBuffer: ArrayBuffer): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    // 使用JSZip解析EPUB文件（EPUB本质上是ZIP文件）
    const zip = await JSZip.loadAsync(arrayBuffer)
    
    // 1. 读取container.xml获取content.opf的位置
    const containerXml = await zip.file('META-INF/container.xml')?.async('text')
    if (!containerXml) {
      console.log('No container.xml found')
      return null
    }
    
    // 解析content.opf路径
    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/)
    if (!rootfileMatch) {
      console.log('No rootfile path found')
      return null
    }
    
    const contentOpfPath = rootfileMatch[1]
    
    // 2. 读取content.opf
    const contentOpf = await zip.file(contentOpfPath)?.async('text')
    if (!contentOpf) {
      console.log('No content.opf found')
      return null
    }
    
    // 3. 查找封面图片
    // 方法1：查找meta标签中的cover
    let coverHref: string | null = null
    const coverMetaMatch = contentOpf.match(/<meta\s+name="cover"\s+content="([^"]+)"/)
    if (coverMetaMatch) {
      const coverId = coverMetaMatch[1]
      // 尝试两种item标签格式：id在前或href在前
      let itemMatch = contentOpf.match(new RegExp(`<item[^>]+id="${coverId}"[^>]+href="([^"]+)"`))
      if (!itemMatch) {
        itemMatch = contentOpf.match(new RegExp(`<item[^>]+href="([^"]+)"[^>]+id="${coverId}"`))
      }
      if (itemMatch) {
        coverHref = itemMatch[1]
      }
    }
    
    // 方法2：查找properties="cover-image"的item
    if (!coverHref) {
      const coverImageMatch = contentOpf.match(/<item[^>]+properties="cover-image"[^>]+href="([^"]+)"/)
      if (coverImageMatch) {
        coverHref = coverImageMatch[1]
      }
    }
    
    // 方法3：在所有文件中查找包含"cover"的图片文件
    let isAbsolutePath = false
    if (!coverHref) {
      const allFiles = Object.keys(zip.files)
      const coverFiles = allFiles.filter(f => {
        const lower = f.toLowerCase()
        return (lower.includes('cover') || lower.includes('mycoverimage')) && 
               (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || 
                lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp'))
      })
      if (coverFiles.length > 0) {
        // 优先选择最短的路径（通常是真正的封面）
        coverHref = coverFiles.sort((a, b) => a.length - b.length)[0]
        isAbsolutePath = true // 方法3返回的是绝对路径
      }
    }
    
    // 方法4：查找常见的封面文件名（精确匹配）
    if (!coverHref) {
      const commonCoverNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif']
      const allFiles = Object.keys(zip.files)
      for (const name of commonCoverNames) {
        const files = allFiles.filter(f => f.toLowerCase().endsWith(name))
        if (files.length > 0) {
          coverHref = files[0]
          isAbsolutePath = true // 方法4返回的也是绝对路径
          break
        }
      }
    }
    
    if (!coverHref) {
      console.log('No cover image found in EPUB')
      return null
    }
    
    // 4. 提取封面图片
    // 处理相对路径（方法1和2返回相对路径，方法3和4返回绝对路径）
    const opfDir = contentOpfPath.substring(0, contentOpfPath.lastIndexOf('/') + 1)
    const fullCoverPath = isAbsolutePath ? coverHref : (opfDir + coverHref)
    
    const coverFile = zip.file(fullCoverPath)
    if (!coverFile) {
      console.log(`Cover file not found: ${fullCoverPath}`)
      return null
    }
    
    const coverData = await coverFile.async('nodebuffer')
    
    // 根据文件扩展名确定MIME类型
    const ext = coverHref.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }
    const mimeType = mimeTypes[ext || 'jpg'] || 'image/jpeg'
    
    return {
      buffer: coverData,
      mimeType
    }
  } catch (error) {
    console.error('Failed to extract EPUB cover:', error)
    return null
  }
}

/**
 * 生成封面文件名
 * @param bookId - 书籍ID
 * @param mimeType - 图片MIME类型
 * @returns 封面文件名
 */
export function generateCoverFileName(bookId: string, mimeType: string): string {
  const ext = mimeType.split('/')[1] || 'jpg'
  return `${bookId}_cover.${ext}`
}
