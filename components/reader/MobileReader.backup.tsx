'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, Settings, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Rendition } from 'epubjs'
import { EpubCFI } from 'epubjs'
import SettingsPanel from './SettingsPanel'
import AIPanel from './AIPanel'

/**
 * 选中文本的数据结构
 */
interface SelectionData {
  text: string      // 选中的文本
  context: string   // 包含上下文的完整文本
  cfi: string       // CFI 位置标识
}

/**
 * 动态导入 ReactReader（禁用 SSR）
 */
const ReactReader = dynamic(
  () => import('react-reader').then((mod) => mod.ReactReader),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    ),
  }
)

/**
 * MobileReader 组件
 * 
 * EPUB 阅读器，支持两点选词交互
 */
export default function MobileReader({
  url,
  title,
  bookId,
  onSelection,
}: {
  url: string
  title: string
  bookId: string
  onSelection?: (data: SelectionData) => void
}) {
  // EPUB Blob URL（用于解决远程加载问题）
  const [epubBlobUrl, setEpubBlobUrl] = useState<string | null>(null)
  const [loadingEpub, setLoadingEpub] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 当前阅读位置
  const [location, setLocation] = useState<string | number>(0)
  
  // 当前章节信息
  const [currentChapter, setCurrentChapter] = useState<string>('加载中...')
  
  // 阅读进度（百分比）
  const [progress, setProgress] = useState<number>(0)
  
  // Rendition 引用（用于控制翻页）
  const renditionRef = useRef<Rendition | null>(null)
  
  // 设置面板状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  // 字号设置（80%, 100%, 140%）
  const [fontSize, setFontSize] = useState<number>(100)
  
  // 主题设置（'light' / 'dark'）
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // 两点选词状态
  const [selectionState, setSelectionState] = useState<'IDLE' | 'WAITING'>('IDLE')
  
  // 第一次点击的 CFI 位置（使用 useRef 避免闭包问题）
  const firstCfiRef = useRef<string | null>(null)
  
  // 临时高亮的标记（用于删除）
  const tempHighlightRef = useRef<any>(null)
  
  // AI 面板状态
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [aiSelectedText, setAiSelectedText] = useState('')
  const [aiContext, setAiContext] = useState('')

  /**
   * 预加载 EPUB 文件为 Blob
   * 解决 EPUB.js 无法正确加载远程 URL 的问题
   */
  useEffect(() => {
    const loadEpubBlob = async () => {
      try {
        console.log('📥 开始下载 EPUB 文件:', url)
        setLoadingEpub(true)
        setLoadError(null)

        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        console.log('✅ EPUB 下载完成:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB')

        // 创建 Blob URL（从 ArrayBuffer）
        const blob = new Blob([arrayBuffer], { type: 'application/epub+zip' })
        const blobUrl = URL.createObjectURL(blob)
        setEpubBlobUrl(blobUrl)
        setLoadingEpub(false)

        // 清理函数
        return () => {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
          }
        }
      } catch (error: any) {
        console.error('❌ EPUB 加载失败:', error)
        setLoadError(error.message || '无法加载EPUB文件')
        setLoadingEpub(false)
      }
    }

    loadEpubBlob()
  }, [url])

  /**
   * 处理位置变化
   */
  const handleLocationChanged = useCallback((epubcfi: string) => {
    setLocation(epubcfi)
    
    // 更新进度
    if (renditionRef.current) {
      try {
        const location = renditionRef.current.location
        if (location && location.start) {
          const current = location.start.displayed.page
          const total = location.start.displayed.total
          if (total > 0) {
            const percentage = Math.round((current / total) * 100)
            setProgress(percentage)
          }
        }
      } catch (error) {
        console.error('计算进度失败:', error)
      }
    }
  }, [])

  /**
   * 处理 Rendition 准备就绪
   */
  const handleRenditionReady = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition
    
    // 获取当前章节标题
    rendition.on('relocated', (location: any) => {
      const currentSection = rendition.book.navigation.get(location.start.href)
      if (currentSection) {
        setCurrentChapter(currentSection.label || '正在阅读')
      }
    })
    
    // 监听点击事件 - 实现两点选词
    rendition.on('click', (event: MouseEvent) => {
      handleClick(event, rendition)
    })
    
    console.log('✅ Rendition 已就绪，两点选词功能已启用')
  }, [])
  
  /**
   * 核心辅助函数：提取选中文本及其上下文
   * 
   * @param rendition - EPUB rendition 对象
   * @param cfiRange - CFI 范围字符串
   * @returns { text, context } - 选中的文本和完整上下文
   */
  const getTextContext = useCallback((rendition: Rendition, cfiRange: string): { text: string; context: string } => {
    try {
      console.log('📝 提取文本和上下文，CFI:', cfiRange)
      
      // 1. 获取 Range 对象
      const range = rendition.getRange(cfiRange)
      if (!range) {
        console.warn('⚠️ 无法获取 Range')
        return { text: '', context: '' }
      }
      
      // 2. 获取选中的文本
      const selectedText = range.toString().trim()
      if (!selectedText) {
        console.warn('⚠️ 选中文本为空')
        return { text: '', context: '' }
      }
      
      console.log('✅ 选中文本:', selectedText)
      
      // 3. 获取整段文本（用于提取上下文）
      const container = range.commonAncestorContainer
      let fullText = ''
      
      if (container.nodeType === Node.TEXT_NODE) {
        // 文本节点：获取父节点的文本
        fullText = container.parentNode?.textContent || ''
      } else {
        // 元素节点：获取自身文本
        fullText = (container as Element).textContent || ''
      }
      
      // 如果整段文本为空，直接返回选中文本
      if (!fullText) {
        console.warn('⚠️ 无法获取完整文本，仅返回选中内容')
        return { text: selectedText, context: selectedText }
      }
      
      // 4. 智能截取上下文（前后各约 100 字符）
      const contextLength = 100 // 前后各 100 字符
      
      // 在完整文本中查找选中文本的位置
      const index = fullText.indexOf(selectedText)
      
      if (index === -1) {
        // 找不到，可能是跨节点选择，直接返回选中文本
        console.warn('⚠️ 选中文本不在容器内，使用选中文本作为上下文')
        return { text: selectedText, context: selectedText }
      }
      
      // 向前截取（最多 100 字符）
      const startIndex = Math.max(0, index - contextLength)
      const prevPart = fullText.substring(startIndex, index)
      
      // 向后截取（最多 100 字符）
      const endIndex = Math.min(fullText.length, index + selectedText.length + contextLength)
      const nextPart = fullText.substring(index + selectedText.length, endIndex)
      
      // 拼接上下文
      const prefix = startIndex > 0 ? '...' : ''
      const suffix = endIndex < fullText.length ? '...' : ''
      const context = prefix + prevPart + selectedText + nextPart + suffix
      
      console.log('✅ 完整上下文:', context)
      console.log('   上下文长度:', context.length, '字符')
      
      return {
        text: selectedText,
        context: context.trim(),
      }
    } catch (error) {
      console.error('❌ 提取文本上下文失败:', error)
      return { text: '', context: '' }
    }
  }, [])
  
  /**
   * 处理点击事件
   */
  const handleClick = useCallback((event: MouseEvent, rendition: Rendition) => {
    try {
      // 获取点击位置的 CFI
      const cfi = getCfiFromClick(event, rendition)
      
      if (!cfi) {
        console.warn('⚠️ 无法获取点击位置的 CFI')
        return
      }
      
      console.log('📍 点击位置 CFI:', cfi)
      
      if (selectionState === 'IDLE') {
        // 第一次点击：标记起点
        handleFirstClick(cfi, rendition)
      } else if (selectionState === 'WAITING') {
        // 第二次点击：标记终点并提取文本
        handleSecondClick(cfi, rendition)
      }
    } catch (error) {
      console.error('❌ 处理点击事件失败:', error)
      resetSelection(rendition)
    }
  }, [selectionState])
  
  /**
   * 从点击事件中获取 CFI
   */
  const getCfiFromClick = useCallback((event: MouseEvent, rendition: Rendition): string | null => {
    try {
      let target = event.target as Node
      
      // 递归查找最近的文本节点或元素节点
      while (target && target.nodeType !== Node.TEXT_NODE && target.nodeType !== Node.ELEMENT_NODE) {
        target = target.parentNode as Node
      }
      
      if (!target) {
        return null
      }
      
      // 获取当前章节的 contents
      const contentsArray = rendition.getContents() as unknown as any[]
      const contents = contentsArray[0]
      if (!contents) {
        return null
      }
      
      // 从节点生成 CFI
      const range = contents.document.createRange()
      
      if (target.nodeType === Node.TEXT_NODE) {
        range.selectNodeContents(target)
      } else {
        range.selectNode(target as Element)
      }
      
      const cfi = contents.cfiFromRange(range)
      return cfi
    } catch (error) {
      console.error('❌ 获取 CFI 失败:', error)
      return null
    }
  }, [])
  
  /**
   * 处理第一次点击
   */
  const handleFirstClick = useCallback((cfi: string, rendition: Rendition) => {
    console.log('1️⃣ 第一次点击 - 标记起点')
    
    // 保存第一次点击的 CFI（使用 ref）
    firstCfiRef.current = cfi
    
    // 添加黄色临时高亮
    try {
      const annotation = rendition.annotations.add(
        'highlight',
        cfi,
        {},
        () => {},
        'temp-highlight',
        {
          fill: 'yellow',
          'fill-opacity': '0.3',
          'mix-blend-mode': 'multiply',
        }
      )
      
      tempHighlightRef.current = annotation
      console.log('✨ 已添加临时高亮')
    } catch (error) {
      console.error('❌ 添加临时高亮失败:', error)
    }
    
    // 更新状态
    setSelectionState('WAITING')
    
    console.log('💬 等待第二次点击...')
  }, [])
  
  /**
   * 处理第二次点击
   */
  const handleSecondClick = useCallback((endCfi: string, rendition: Rendition) => {
    console.log('2️⃣ 第二次点击 - 标记终点')
    
    const startCfi = firstCfiRef.current
    
    if (!startCfi) {
      console.error('❌ 第一次点击的 CFI 丢失')
      resetSelection(rendition)
      return
    }
    
    try {
      // 1. 移除临时高亮
      if (tempHighlightRef.current) {
        try {
          rendition.annotations.remove(tempHighlightRef.current, 'highlight')
          console.log('🗑️ 已移除临时高亮')
        } catch (error) {
          console.warn('移除临时高亮失败:', error)
        }
        tempHighlightRef.current = null
      }
      
      // 2. 生成范围 CFI
      let rangeCfi: string
      
      try {
        // 使用 EpubCFI 类生成范围
        const cfiGenerator = new EpubCFI()
        rangeCfi = (cfiGenerator as any).generateRange(startCfi, endCfi)
        console.log('📏 范围 CFI:', rangeCfi)
      } catch (error) {
        console.error('❌ 生成范围 CFI 失败，使用起点 CFI')
        rangeCfi = startCfi
      }
      
      // 3. 提取选中的文本和上下文
      const { text, context } = getTextContext(rendition, rangeCfi)
      
      if (!text || text.length === 0) {
        console.warn('⚠️ 未选中任何文本')
        resetSelection(rendition)
        return
      }
      
      // 4. 添加绿色高亮表示最终选中
      try {
        rendition.annotations.add(
          'highlight',
          rangeCfi,
          {},
          () => {},
          'selection-highlight',
          {
            fill: 'green',
            'fill-opacity': '0.3',
            'mix-blend-mode': 'multiply',
          }
        )
        console.log('✅ 已添加最终高亮')
      } catch (error) {
        console.error('❌ 添加最终高亮失败:', error)
      }
      
      // 5. 保存选中内容并打开 AI 面板
      console.log('🤖 打开 AI 面板')
      console.log('   文本:', text)
      console.log('   上下文:', context)
      console.log('   CFI:', rangeCfi)
      
      setAiSelectedText(text)
      setAiContext(context)
      setIsAIPanelOpen(true)
      
      // 触发外部回调（可选）
      if (onSelection) {
        onSelection({
          text,
          context,
          cfi: rangeCfi,
        })
      }
      
      // 不自动重置，等用户关闭 AI 面板后再重置
      
    } catch (error) {
      console.error('❌ 处理第二次点击失败:', error)
      resetSelection(rendition)
    }
  }, [getTextContext, onSelection])
  
  /**
   * 重置选择状态
   */
  const resetSelection = useCallback((rendition: Rendition) => {
    console.log('🔄 重置选择状态')
    
    // 移除临时高亮
    if (tempHighlightRef.current) {
      try {
        rendition.annotations.remove(tempHighlightRef.current, 'highlight')
      } catch (error) {
        console.warn('移除临时高亮失败:', error)
      }
      tempHighlightRef.current = null
    }
    
    // 重置状态
    firstCfiRef.current = null
    setSelectionState('IDLE')
  }, [])

  /**
   * 翻到上一页
   */
  const handlePrevPage = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.prev()
    }
  }, [])

  /**
   * 翻到下一页
   */
  const handleNextPage = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.next()
    }
  }, [])

  /**
   * 应用字号设置
   */
  useEffect(() => {
    if (renditionRef.current) {
      try {
        const themes = renditionRef.current.themes
        themes.fontSize(`${fontSize}%`)
        console.log('字号已更新:', fontSize + '%')
      } catch (error) {
        console.error('应用字号失败:', error)
      }
    }
  }, [fontSize])

  /**
   * 应用主题设置
   */
  useEffect(() => {
    if (renditionRef.current) {
      try {
        const themes = renditionRef.current.themes
        
        if (theme === 'dark') {
          themes.register('dark', {
            body: {
              background: '#1a1a1a !important',
              color: '#e0e0e0 !important',
            },
            'p, div, span, h1, h2, h3, h4, h5, h6': {
              color: '#e0e0e0 !important',
            },
            a: {
              color: '#60a5fa !important',
            },
          })
          themes.select('dark')
          console.log('主题已切换: 夜间模式')
        } else {
          themes.register('light', {
            body: {
              background: '#ffffff !important',
              color: '#000000 !important',
            },
            'p, div, span, h1, h2, h3, h4, h5, h6': {
              color: '#000000 !important',
            },
            a: {
              color: '#2563eb !important',
            },
          })
          themes.select('light')
          console.log('主题已切换: 日间模式')
        }
      } catch (error) {
        console.error('应用主题失败:', error)
      }
    }
  }, [theme])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部导航栏 */}
      <header className="h-[50px] bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft size={24} />
          <span className="hidden sm:inline text-sm font-medium">返回书架</span>
        </Link>

        <h1 className="flex-1 text-center font-semibold text-gray-900 truncate px-4 text-sm sm:text-base">
          {title}
        </h1>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="text-gray-700 hover:text-blue-600 transition-colors"
          title="阅读设置"
        >
          <Settings size={24} />
        </button>
      </header>

      {/* 阅读器主体 */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          {loadingEpub ? (
            // 加载中
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
              <p className="text-gray-600 text-sm">正在加载 EPUB 文件...</p>
            </div>
          ) : loadError ? (
            // 加载失败
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
              <div className="text-red-600 text-6xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
              <p className="text-gray-600 text-sm text-center mb-4">{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                重新加载
              </button>
            </div>
          ) : epubBlobUrl ? (
            // 加载成功，显示阅读器
            <ReactReader
              url={epubBlobUrl}
              location={location}
              locationChanged={handleLocationChanged}
              getRendition={handleRenditionReady}
              epubOptions={{
                flow: 'paginated',
                manager: 'default',
              }}
              epubInitOptions={{
                openAs: 'epub',
              }}
              swipeable={false}
              tocChanged={() => {}}
              readerStyles={readerStyles as any}
            />
          ) : null}
        </div>
      </main>

      {/* 底部工具栏 */}
      <footer className="h-[60px] bg-white border-t border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <button
          onClick={handlePrevPage}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-sm"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">上一页</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 truncate max-w-[150px]">{currentChapter}</span>
          <span className="text-xs font-medium text-gray-700">{progress}%</span>
        </div>

        <button
          onClick={handleNextPage}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-sm"
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight size={18} />
        </button>
      </footer>

      {/* 设置面板 */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* AI 解释面板 */}
      <AIPanel
        isOpen={isAIPanelOpen}
        onClose={() => {
          setIsAIPanelOpen(false)
          // 关闭面板后清除高亮
          if (renditionRef.current) {
            setTimeout(() => {
              resetSelection(renditionRef.current!)
            }, 300)
          }
        }}
        selectedText={aiSelectedText}
        context={aiContext}
      />
    </div>
  )
}

/**
 * ReactReader 自定义样式
 */
const readerStyles = {
  container: { overflow: 'hidden', height: '100%' },
  readerArea: { position: 'relative', height: '100%', width: '100%', overflow: 'hidden', backgroundColor: '#ffffff' },
  arrow: { display: 'none' },
  arrowHover: { display: 'none' },
  tocArea: { display: 'none' },
  tocButton: { display: 'none' },
}
