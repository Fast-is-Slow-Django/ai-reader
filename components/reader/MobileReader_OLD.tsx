'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, Settings, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Rendition } from 'epubjs'
import SettingsPanel from './SettingsPanel'

/**
 * 动态导入 ReactReader（禁用 SSR）
 * 
 * EPUB.js 依赖浏览器 API，必须在客户端渲染
 */
const ReactReader = dynamic(
  () => import('react-reader').then((mod) => mod.ReactReader),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="text-blue-600 animate-spin" size={48} />
      </div>
    ),
  }
)

/**
 * 移动端 EPUB 阅读器组件
 * 
 * Props:
 * - url: EPUB 文件的下载链接
 * - title: 书籍标题
 * - bookId: 书籍 ID
 * 
 * 功能:
 * - ✅ 加载 EPUB 文件
 * - ✅ 渲染书籍内容
 * - ✅ 翻页功能（上一页/下一页）
 * - ✅ 进度显示
 * - ⏳ 进度保存（待实现）
 * - ⏳ 主题切换（待实现）
 * - ⏳ 字体大小调整（待实现）
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

  /**
   * 处理位置变化
   * 
   * 当用户翻页或跳转时触发
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
   * 
   * 保存 rendition 引用，监听事件
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
   * 处理两点选词的点击事件
   * 
   * 实现流程：
   * 1. 第一次点击：标记起点，显示黄色高亮
   * 2. 第二次点击：标记终点，提取文本，显示绿色高亮
   * 3. 触发 AI 解释
   */
  const handleTextSelection = useCallback((event: MouseEvent, rendition: Rendition) => {
    try {
      // 阻止默认行为
      event.preventDefault()
      event.stopPropagation()
      
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
      } else if (selectionState === 'WAITING_SECOND_CLICK' && firstCfi) {
        // 第二次点击：标记终点并处理选中文本
        handleSecondClick(firstCfi, cfi, rendition)
      }
    } catch (error) {
      console.error('❌ 处理点击事件失败:', error)
      // 重置状态
      resetSelection(rendition)
    }
  }, [selectionState, firstCfi])
  
  /**
   * 从点击事件中获取 CFI (Canonical Fragment Identifier)
   * 
   * CFI 是 EPUB 标准的位置标识符，可以精确定位到字符级别
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
        // 文本节点：选择整个文本
        range.selectNodeContents(target)
      } else {
        // 元素节点：选择节点内容
        range.selectNode(target as Element)
      }
      
      // 生成 CFI
      const cfi = contents.cfiFromRange(range)
      
      return cfi
    } catch (error) {
      console.error('❌ 获取 CFI 失败:', error)
      return null
    }
  }, [])
  
  /**
   * 处理第一次点击
   * 
   * 标记选择起点，显示黄色临时高亮
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
   * 
   * 标记选择终点，提取文本和上下文，触发回调
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
      
      // 5. 触发回调（传递给父组件）
      console.log('🤖 触发选择回调')
      console.log('   文本:', text)
      console.log('   上下文:', context)
      console.log('   CFI:', rangeCfi)
      
      if (onSelection) {
        onSelection({
          text,
          context,
          cfi: rangeCfi,
        })
      }
      
      // 6. 重置状态（延迟，让用户看到高亮）
      setTimeout(() => {
        resetSelection(rendition)
      }, 2000)
      
    } catch (error) {
      console.error('❌ 处理第二次点击失败:', error)
      resetSelection(rendition)
    }
  }, [getTextContext, onSelection])
  
  
  /**
   * 重置选择状态
   * 
   * 清除临时高亮和状态
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
   * 
   * 当字号变化时，更新 rendition 的字体大小
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
   * 
   * 当主题变化时，切换日间/夜间模式
   */
  useEffect(() => {
    if (renditionRef.current) {
      try {
        const themes = renditionRef.current.themes
        
        if (theme === 'dark') {
          // 注册夜间模式主题
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
          // 日间模式（默认）
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
      {/* 顶部导航栏 - 50px */}
      <header className="h-[50px] bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        {/* 左侧：返回按钮 */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft size={24} />
          <span className="hidden sm:inline text-sm font-medium">返回书架</span>
        </Link>

        {/* 中间：书籍标题 */}
        <h1 className="flex-1 text-center font-semibold text-gray-900 truncate px-4 text-sm sm:text-base">
          {title}
        </h1>

        {/* 右侧：设置按钮 */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="text-gray-700 hover:text-blue-600 transition-colors"
          title="阅读设置"
          aria-label="打开阅读设置"
        >
          <Settings size={24} />
        </button>
      </header>

      {/* 阅读器主体 - flex-1 */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <ReactReader
            url={url}
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
        </div>
      </main>

      {/* 底部工具栏 - 60px */}
      <footer className="h-[60px] bg-white border-t border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        {/* 上一页按钮 */}
        <button
          onClick={handlePrevPage}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">上一页</span>
        </button>

        {/* 中间：进度信息 */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 truncate max-w-[150px]">
            {currentChapter}
          </span>
          <span className="text-xs font-medium text-gray-700">
            {progress}%
          </span>
        </div>

        {/* 下一页按钮 */}
        <button
          onClick={handleNextPage}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}

/**
 * ReactReader 自定义样式
 * 
 * 调整阅读器的外观和行为
 */
const readerStyles = {
  ...{},
  // 容器样式
  container: {
    overflow: 'hidden',
    height: '100%',
  },
  // 阅读区域样式
  readerArea: {
    position: 'relative' as const,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  // 箭头按钮样式（隐藏默认箭头，使用自定义按钮）
  arrow: {
    display: 'none',
  },
  arrowHover: {
    display: 'none',
  },
  // 目录样式（暂时隐藏）
  tocArea: {
    display: 'none',
  },
  tocButton: {
    display: 'none',
  },
}
