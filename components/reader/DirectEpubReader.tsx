'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, Settings, ChevronRight, Loader2, BookMarked, Menu, X } from 'lucide-react'
import Link from 'next/link'
import ePub, { Book, Rendition } from 'epubjs'
import SettingsPanel from './SettingsPanel'
import AIPanel from './AIPanel'
import VocabularyList from './VocabularyList'
import { loadReadingProgress, saveReadingProgress, saveReadingSettings } from '@/utils/readingProgress'
import { getCachedEpub, cacheEpub } from '@/utils/epubCache'

interface DirectEpubReaderProps {
  url: string
  title: string
  bookId: string
}

/**
 * 直接使用 EPUB.js 的阅读器
 * 完全绕过 react-reader，解决加载问题
 */
export default function DirectEpubReader({ url, title, bookId }: DirectEpubReaderProps) {
  // EPUB 相关状态
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentChapter, setCurrentChapter] = useState('加载中...')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // 设置面板
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [chapters, setChapters] = useState<Array<{ label: string; href: string }>>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  
  // 控制面板显示状态
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)
  
  // 悬浮按钮的位置和大小 - 从localStorage加载
  const [buttonPosition, setButtonPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    const saved = localStorage.getItem('floatingButtonPosition')
    return saved ? JSON.parse(saved) : { x: 0, y: 0 }
  })
  const [buttonSizePercent, setButtonSizePercent] = useState(() => {
    if (typeof window === 'undefined') return 50
    const saved = localStorage.getItem('floatingButtonSize')
    return saved ? Number(saved) : 50
  })
  const [buttonOpacity, setButtonOpacity] = useState(() => {
    if (typeof window === 'undefined') return 70
    const saved = localStorage.getItem('floatingButtonOpacity')
    return saved ? Number(saved) : 70
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // 将百分比转换为实际像素大小 (44px - 88px)
  const buttonSize = Math.round(44 + (buttonSizePercent / 100) * 44)
  
  // 保存悬浮按钮设置到localStorage
  useEffect(() => {
    localStorage.setItem('floatingButtonPosition', JSON.stringify(buttonPosition))
  }, [buttonPosition])
  
  useEffect(() => {
    localStorage.setItem('floatingButtonSize', String(buttonSizePercent))
  }, [buttonSizePercent])
  
  useEffect(() => {
    localStorage.setItem('floatingButtonOpacity', String(buttonOpacity))
  }, [buttonOpacity])

  // AI 面板
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [aiSelectedText, setAiSelectedText] = useState('')
  const [aiContext, setAiContext] = useState('')
  const isAIPanelOpenRef = useRef(false)

  // 词汇列表面板
  const [isVocabularyListOpen, setIsVocabularyListOpen] = useState(false)

  // 两点选词状态（使用 ref 避免闭包问题）
  const selectionStateRef = useRef<'IDLE' | 'WAITING'>('IDLE')
  const firstClickInfoRef = useRef<{ node: Node; offset: number; element: HTMLElement } | null>(null)
  const tempHighlightOverlayRef = useRef<HTMLDivElement | null>(null) // 改为overlay div，不修改DOM
  const finalHighlightRef = useRef<HTMLSpanElement | null>(null)

  // EPUB.js 引用
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  // 标记是否是初始加载（用于避免初始化时保存设置）
  const isInitialLoadRef = useRef(true)
  
  // 标记是否正在进行初始跳转（用于跳过第一次relocated事件）
  const isInitialJumpRef = useRef(false)
  
  // 标记是否已经初始化过（防止 React Strict Mode 重复初始化）
  const hasInitializedRef = useRef(false)
  
  // 使用 ref 保存最新的设置值（避免闭包问题）
  const fontSizeRef = useRef(fontSize)
  const themeRef = useRef(theme)
  
  // 滑动手势状态
  const touchStateRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false
  })
  
  // 保存翻页函数引用（避免闭包问题）
  const handlePrevPageRef = useRef<(() => void) | null>(null)
  const handleNextPageRef = useRef<(() => void) | null>(null)
  
  // 同步 ref 和 state
  useEffect(() => {
    fontSizeRef.current = fontSize
    themeRef.current = theme
    isAIPanelOpenRef.current = isAIPanelOpen
  }, [fontSize, theme, isAIPanelOpen])

  /**
   * 初始化 EPUB
   */
  useEffect(() => {
    // 等待 DOM 完全渲染
    if (!viewerRef.current) {
      console.log('⏳ 等待 DOM 渲染...')
      return
    }

    // 防止重复初始化的标志
    let cancelled = false

    // 如果已经初始化过，跳过（React Strict Mode 会执行两次）
    if (hasInitializedRef.current) {
      console.log('⚠️ 已经初始化过，跳过重复初始化')
      return
    }

    // 标记正在初始化
    hasInitializedRef.current = true
    isInitialLoadRef.current = true
    console.log('🔄 开始初始化 EPUB')

    const initEpub = async () => {
      if (cancelled) return
      try {
        console.log('📥 开始加载 EPUB:', url)
        setLoading(true)
        setError(null)

        // 1. 尝试从 IndexedDB 缓存读取
        let arrayBuffer = await getCachedEpub(bookId)
        
        if (!arrayBuffer) {
          // 2. 缓存未命中，从网络下载
          console.log('📡 从网络下载 EPUB...')
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          arrayBuffer = await response.arrayBuffer()
          console.log('✅ EPUB 下载完成:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB')

          // 3. 保存到 IndexedDB 缓存
          await cacheEpub(bookId, arrayBuffer, url)
        } else {
          console.log('⚡ 使用 IndexedDB 缓存，跳过下载')
        }

        // 2. 直接用 ArrayBuffer 打开（不用 Blob URL）
        console.log('🔧 创建 Book 对象...')
        const book = ePub(arrayBuffer)
        bookRef.current = book

        // 3. 等待 Book 就绪
        console.log('⏳ 等待 Book 就绪...')
        await book.ready

        console.log('✅ Book 已就绪')

        // 获取章节列表
        const toc = book.navigation?.toc || []
        const chapterList = toc.map((item: any) => ({
          label: item.label || item.title || '未命名章节',
          href: item.href
        }))
        setChapters(chapterList)
        console.log('📚 章节列表:', chapterList.length, '章')

        // 4. 渲染到容器
        if (!viewerRef.current) {
          throw new Error('Viewer 容器未找到')
        }

        console.log('🎨 开始渲染到容器...')
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          snap: true,
        })

        renditionRef.current = rendition
        console.log('✅ Rendition 已创建')

        // 5. 显示第一页或加载的位置
        console.log('📖 显示第一页...')
        
        // 尝试加载阅读进度和设置
        console.log('🔍 加载保存的阅读数据...')
        const progressResult = await loadReadingProgress(bookId)
        
        let loadedFontSize = 100  // 默认值
        let loadedTheme: 'light' | 'dark' = 'light'  // 默认值
        
        if (progressResult.success && progressResult.data) {
          console.log('✅ 找到保存的数据:', progressResult.data)
          
          // 先恢复设置（在显示页面之前）
          if (progressResult.data.font_size) {
            loadedFontSize = progressResult.data.font_size
            console.log('📝 恢复字体大小:', loadedFontSize)
          }
          if (progressResult.data.theme) {
            loadedTheme = progressResult.data.theme as 'light' | 'dark'
            console.log('🎨 恢复主题:', loadedTheme)
          }
          
          // 同步更新 state 和 ref
          setFontSize(loadedFontSize)
          setTheme(loadedTheme)
          fontSizeRef.current = loadedFontSize
          themeRef.current = loadedTheme
          console.log('🔄 已同步 ref 值:', { fontSize: loadedFontSize, theme: loadedTheme })
          
          // **关键：先应用样式，再跳转位置**（避免样式应用后位置被重置）
          console.log('🎨 先应用样式（使用恢复的值）')
          applyTheme(rendition, loadedTheme, loadedFontSize)
          
          // 恢复阅读位置
          const savedLocation = progressResult.data.cfi
          if (savedLocation) {
            console.log('📖 准备恢复位置:', savedLocation)
            
            // 等待渲染完成
            await new Promise<void>((resolve) => {
              rendition.once('rendered', () => {
                console.log('⏳ 首次渲染完成')
                resolve()
              })
              rendition.display()
            })
            
            // 解析保存的位置信息
            isInitialJumpRef.current = true
            
            if (savedLocation.startsWith('spine:')) {
              // 解析格式：spine:8:page:5 或 spine:8
              const parts = savedLocation.split(':')
              const spineIndex = parseInt(parts[1])
              const targetPage = parts[3] ? parseInt(parts[3]) : 1
              
              console.log('📖 跳转到章节:', spineIndex, '页码:', targetPage, '（已应用保存时的字体）')
              
              // 先跳转到章节
              await rendition.display(spineIndex)
              
              // 如果需要跳转到章节内的特定页，翻页到目标位置
              if (targetPage > 1) {
                console.log('📄 章节内翻页到第', targetPage, '页')
                // 等待首页渲染完成
                await new Promise(resolve => setTimeout(resolve, 300))
                
                // 翻页到目标页（翻 targetPage - 1 次）
                for (let i = 1; i < targetPage; i++) {
                  await rendition.next()
                  console.log(`  翻到第 ${i + 1} 页...`)
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              }
              
              console.log('✅ 跳转完成')
            } else {
              // 兼容旧的 CFI 格式
              console.log('📖 使用 CFI 跳转（兼容旧数据）:', savedLocation)
              await rendition.display(savedLocation)
              console.log('✅ 跳转完成')
            }
          } else {
            console.log('📖 无保存位置，显示第一页')
            isInitialJumpRef.current = true
            await rendition.display()
          }
        } else {
          console.log('ℹ️ 无保存数据，使用默认设置')
          // 应用默认样式
          applyTheme(rendition, loadedTheme, loadedFontSize)
          isInitialJumpRef.current = true  // 标记正在初始跳转
          await rendition.display()
        }

        // 5.5. 设置滑动翻页手势 - 延迟500ms添加，确保DOM完全加载
        setTimeout(() => {
          const viewer = viewerRef.current
          if (!viewer) {
            console.warn('⚠️ Viewer 不存在，无法设置滑动翻页')
            return
          }
          
          const iframe = viewer.querySelector('iframe') as HTMLIFrameElement
          if (!iframe || !iframe.contentDocument) {
            console.warn('⚠️ iframe 或 contentDocument 不存在，无法设置滑动翻页')
            return
          }
          
          const iframeDoc = iframe.contentDocument
          console.log('📱 开始设置滑动翻页手势...')
          
          const handleTouchStart = (e: TouchEvent) => {
            if (isAIPanelOpenRef.current) return
            
            const touch = e.touches[0]
            touchStateRef.current = {
              startX: touch.clientX,
              startY: touch.clientY,
              startTime: Date.now(),
              isSwiping: false
            }
          }
          
          const handleTouchEnd = (e: TouchEvent) => {
            if (isAIPanelOpenRef.current) return
            
            const touch = e.changedTouches[0]
            const endX = touch.clientX
            const endY = touch.clientY
            
            const deltaX = endX - touchStateRef.current.startX
            const deltaY = endY - touchStateRef.current.startY
            const absDeltaX = Math.abs(deltaX)
            const absDeltaY = Math.abs(deltaY)
            
            const CLICK_THRESHOLD = 10
            const SWIPE_THRESHOLD = 50
            
            if (absDeltaX < CLICK_THRESHOLD && absDeltaY < CLICK_THRESHOLD) {
              return
            }
            
            if (absDeltaY > absDeltaX) {
              return
            }
            
            if (absDeltaX > SWIPE_THRESHOLD) {
              if (deltaX > 0) {
                handlePrevPageRef.current?.()
              } else {
                handleNextPageRef.current?.()
              }
            }
            
            touchStateRef.current.isSwiping = false
          }
          
          iframeDoc.addEventListener('touchstart', handleTouchStart, { passive: true })
          iframeDoc.addEventListener('touchend', handleTouchEnd, { passive: true })
          
          console.log('✅ 滑动翻页手势已启用')
        }, 500)
        
        // 6. 监听位置变化
        rendition.on('relocated', (location: any) => {
          console.log('🔔 relocated 事件触发，完整 location:', {
            start_cfi: location?.start?.cfi,
            start_index: location?.start?.index,
            displayed_page: location?.start?.displayed?.page,
            displayed_total: location?.start?.displayed?.total,
            atStart: location?.atStart,
            atEnd: location?.atEnd
          })
          
          if (location.start) {
            const percent = Math.round((location.start.percentage || 0) * 100)
            setProgress(percent)

            // 更新页码
            const pageInfo = location.start.displayed
            if (pageInfo) {
              setCurrentPage(pageInfo.page || 1)
              setTotalPages(pageInfo.total || 0)
            }

            // 更新章节名
            book.loaded.navigation.then((navigation: any) => {
              const chapter = book.navigation?.get(location.start.href)
              if (chapter) {
                const chapterName = chapter.label || '未知章节'
                setCurrentChapter(chapterName)
                
                // 优先检查是否在初始化阶段
                if (isInitialLoadRef.current) {
                  console.log('⏭️ 初始化阶段，跳过所有保存')
                  // 如果是初始跳转，重置标志
                  if (isInitialJumpRef.current) {
                    isInitialJumpRef.current = false
                  }
                } else {
                  // 初始化完成后，保存 spine index + 章节内页码 + 字体
                  const spineIndex = location.start.index
                  const pageInfo = location.start.displayed
                  
                  console.log('📍 用户翻页，保存位置:', {
                    spineIndex: spineIndex,
                    page: pageInfo ? `${pageInfo.page}/${pageInfo.total}` : 'N/A',
                    chapter: chapterName,
                    percent: percent,
                    fontSize: fontSizeRef.current,
                    theme: themeRef.current
                  })
                  
                  // 格式：spine:8:page:5 表示第8章的第5页
                  let locationKey = `spine:${spineIndex}`
                  if (pageInfo && pageInfo.page) {
                    locationKey += `:page:${pageInfo.page}`
                  }
                  
                  console.log('💾 保存位置键:', locationKey)
                  
                  saveReadingProgress(
                    bookId,
                    locationKey,
                    chapterName,
                    percent,
                    fontSizeRef.current,
                    themeRef.current
                  )
                }  
              }
            })
          } else {
            console.warn('⚠️ relocated 事件但 location.start 为空')
          }
        })

        // 7. 添加两点选词事件监听
        rendition.on('click', handleClick)

        console.log('✅ EPUB 渲染成功')
        setLoading(false)
        
        // 标记初始加载完成（延迟以确保所有设置都已应用）
        setTimeout(() => {
          isInitialLoadRef.current = false
          console.log('✅ 初始加载完成，后续设置变化将自动保存')
          console.log('📊 当前设置:', { fontSize: loadedFontSize, theme: loadedTheme })
        }, 1500)

      } catch (err: any) {
        console.error('❌ EPUB 加载失败:', err)
        setError(err.message || '无法加载EPUB文件')
        setLoading(false)
      }
    }

    initEpub()

    // 清理函数：组件卸载时清理 EPUB 资源
    return () => {
      cancelled = true
      console.log('🧹🧹🧹 ========== 开始清理 EPUB 资源 ==========')
      
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy()
          console.log('✅ Rendition 已销毁')
        } catch (e) {
          console.warn('⚠️ Rendition 销毁失败:', e)
        }
        renditionRef.current = null
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy()
          console.log('✅ Book 已销毁')
        } catch (e) {
          console.warn('⚠️ Book 销毁失败:', e)
        }
        bookRef.current = null
      }
      // 清理高亮引用
      tempHighlightOverlayRef.current = null
      finalHighlightRef.current = null
      firstClickInfoRef.current = null
      // 重置标志
      isInitialLoadRef.current = true
      hasInitializedRef.current = false
      console.log('🔄 已重置所有标志')
      console.log('🧹🧹🧹 ========== 清理完成 ==========')
    }
  }, [url])

  /**
   * 应用主题和字号
   */
  const applyTheme = useCallback((rendition: Rendition, themeName: 'light' | 'dark', size: number) => {
    try {
      console.log('🎨 开始应用样式:', { themeName, size })

      // 使用 fontSize 方法设置字号
      rendition.themes.fontSize(`${size}%`)

      // 使用 override 注入 CSS
      const baseStyles = `
        body {
          line-height: 1.8 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
      `

      const lightStyles = `
        body {
          background: #ffffff !important;
          color: #000000 !important;
        }
        p, div, span, h1, h2, h3, h4, h5, h6 {
          color: #000000 !important;
        }
        a {
          color: #2563eb !important;
        }
      `

      const darkStyles = `
        body {
          background: #1a1a1a !important;
          color: #e5e5e5 !important;
        }
        p, div, span, h1, h2, h3, h4, h5, h6 {
          color: #e5e5e5 !important;
        }
        a {
          color: #60a5fa !important;
        }
      `

      // 注入样式到当前显示的页面（通过 viewerRef 找 iframe）
      if (viewerRef.current) {
        const iframe = viewerRef.current.querySelector('iframe')
        if (iframe && iframe.contentDocument) {
          const doc = iframe.contentDocument
          let styleEl = doc.getElementById('custom-reader-styles')
          if (!styleEl) {
            styleEl = doc.createElement('style')
            styleEl.id = 'custom-reader-styles'
            doc.head.appendChild(styleEl)
          }
          styleEl.textContent = baseStyles + (themeName === 'dark' ? darkStyles : lightStyles)
        }
      }

      console.log('✅ 样式应用完成')
    } catch (error) {
      console.error('❌ 应用样式失败:', error)
    }
  }, [])

  /**
   * 主题/字号变化时重新应用并保存设置
   */
  useEffect(() => {
    console.log('⚙️ 设置变化触发 useEffect:', { 
      theme, 
      fontSize, 
      loading,
      isInitial: isInitialLoadRef.current,
      hasRendition: !!renditionRef.current
    })
    
    if (renditionRef.current && !loading && !isInitialLoadRef.current) {
      console.log('🎨 用户修改设置，应用并保存:', { theme, fontSize })
      applyTheme(renditionRef.current, theme, fontSize)
      
      // 只保存设置，不保存位置（因为修改字体会改变位置CFI）
      console.log('💾 保存设置到数据库（不更新位置）')
      saveReadingSettings(bookId, fontSize, theme)
    } else {
      console.log('⏭️ 跳过保存 - 条件不满足')
    }
  }, [theme, fontSize])


  /**
   * 从事件中获取点击的文本节点和偏移量（扩展到单词边界）
   */
  const getClickPosition = useCallback((event: any, expandToEnd = false): { node: Node; offset: number; element: HTMLElement; word?: string } | null => {
    try {
      const iframe = viewerRef.current?.querySelector('iframe')
      if (!iframe?.contentDocument) return null

      const doc = iframe.contentDocument
      const target = event.target as HTMLElement

      // 获取点击的精确位置
      const range = doc.caretRangeFromPoint?.(event.clientX, event.clientY)
      
      if (range) {
        const node = range.startContainer
        const offset = range.startOffset
        const text = node.textContent || ''
        
        // 扩展到单词边界
        let wordStart = offset
        let wordEnd = offset
        
        // 向前找到单词开始（遇到空格、标点或开头）
        while (wordStart > 0 && /[a-zA-Z0-9]/.test(text[wordStart - 1])) {
          wordStart--
        }
        
        // 向后找到单词结束（遇到空格、标点或结尾）
        while (wordEnd < text.length && /[a-zA-Z0-9]/.test(text[wordEnd])) {
          wordEnd++
        }
        
        const word = text.substring(wordStart, wordEnd)
        const finalOffset = expandToEnd ? wordEnd : wordStart
        
        console.log('✅ 精确位置（扩展到单词）:', {
          node,
          originalOffset: offset,
          wordStart,
          wordEnd,
          word,
          useEnd: expandToEnd,
          finalOffset,
          fullText: text.substring(0, 50)
        })
        
        return {
          node,
          offset: finalOffset, // 根据参数返回单词的开始或结束位置
          element: target,
          word, // 返回识别出的单词
        }
      }

      // 降级方案：返回元素的第一个文本节点
      let textNode: Node | null = null
      
      if (target.nodeType === Node.TEXT_NODE) {
        textNode = target
      } else {
        const walker = doc.createTreeWalker(target, NodeFilter.SHOW_TEXT)
        textNode = walker.nextNode()
      }

      if (!textNode) {
        console.warn('⚠️ 未找到文本节点')
        return null
      }

      return {
        node: textNode,
        offset: 0,
        element: target
      }
    } catch (error) {
      console.error('❌ 获取点击位置失败:', error)
      return null
    }
  }, [])

  /**
   * 处理第一次点击
   */
  const handleFirstClick = useCallback((event: any) => {
    console.log('1️⃣ 第一次点击 - 标记起点')
    
    // 清理上一次的绿色高亮
    if (finalHighlightRef.current) {
      try {
        const parent = finalHighlightRef.current.parentNode
        const text = finalHighlightRef.current.textContent || ''
        const textNode = document.createTextNode(text)
        parent?.replaceChild(textNode, finalHighlightRef.current)
        finalHighlightRef.current = null
        console.log('🗑️ 已清理上一次的绿色高亮')
      } catch (error) {
        console.warn('清理绿色高亮失败:', error)
      }
    }
    
    const clickInfo = getClickPosition(event)
    if (!clickInfo) {
      console.error('❌ 无法获取点击位置')
      return
    }

    console.log('📍 保存起点:', {
      offset: clickInfo.offset,
      nodeText: clickInfo.node.textContent?.substring(0, 50)
    })

    // 添加黄色高亮 - 使用overlay，不修改DOM
    try {
      const iframe = viewerRef.current?.querySelector('iframe')
      if (!iframe?.contentDocument || !iframe?.contentWindow) return
      
      const doc = iframe.contentDocument
      const win = iframe.contentWindow
      const range = doc.createRange()
      
      // 获取单词的完整范围
      const text = clickInfo.node.textContent || ''
      const wordStart = clickInfo.offset
      
      // 重新计算单词结尾
      let wordEnd = wordStart
      while (wordEnd < text.length && /[a-zA-Z0-9]/.test(text[wordEnd])) {
        wordEnd++
      }
      
      range.setStart(clickInfo.node, wordStart)
      range.setEnd(clickInfo.node, wordEnd)
      
      const word = range.toString()
      console.log('📝 第一次点击的单词:', word)
      
      // 🔑 关键：使用绝对定位的overlay，不修改DOM结构
      const rects = range.getClientRects()
      if (rects.length > 0) {
        const rect = rects[0]
        
        // 创建overlay div
        const overlay = doc.createElement('div')
        overlay.style.position = 'absolute'
        overlay.style.left = rect.left + win.scrollX + 'px'
        overlay.style.top = rect.top + win.scrollY + 'px'
        overlay.style.width = rect.width + 'px'
        overlay.style.height = rect.height + 'px'
        overlay.style.backgroundColor = 'yellow'
        overlay.style.opacity = '0.4'
        overlay.style.pointerEvents = 'none' // 不阻挡点击事件
        overlay.style.zIndex = '999'
        overlay.setAttribute('data-temp-highlight', 'true')
        
        doc.body.appendChild(overlay)
        tempHighlightOverlayRef.current = overlay
        
        console.log('✨ 已添加overlay高亮（黄色）- DOM未修改')
      }
      
      // 保存第一次点击的位置（原始节点引用）
      firstClickInfoRef.current = {
        ...clickInfo,
        offset: wordStart // 保存单词开始位置
      }
      
      console.log('📍 已保存原始节点引用')
    } catch (error) {
      console.error('❌ 添加高亮失败:', error)
      firstClickInfoRef.current = clickInfo
    }
    
    // 更新状态
    selectionStateRef.current = 'WAITING'
    
    console.log('💬 等待第二次点击...')
  }, [getClickPosition])

  /**
   * 处理第二次点击
   */
  const handleSecondClick = useCallback((event: any) => {
    console.log('2️⃣ 第二次点击 - 标记终点')
    
    const startInfo = firstClickInfoRef.current
    
    if (!startInfo) {
      console.error('❌ 第一次点击的位置丢失')
      return
    }
    
    try {
      // 1. 先获取第二次点击位置（此时高亮还在，DOM未变化）
      const endInfo = getClickPosition(event, true) // true = 扩展到单词结尾
      if (!endInfo) {
        console.error('❌ 无法获取第二次点击位置，取消选词')
        // 清理第一次点击的高亮
        if (tempHighlightOverlayRef.current) {
          tempHighlightOverlayRef.current.remove()
          tempHighlightOverlayRef.current = null
        }
        selectionStateRef.current = 'IDLE'
        firstClickInfoRef.current = null
        return
      }
      
      // 检查是否点击在空白区域（没有实际文本）
      // 但如果已经识别出单词（endInfo.word 存在），则不认为是空白
      const endText = endInfo.node.textContent?.substring(endInfo.offset, endInfo.offset + 10) || ''
      const hasValidWord = endInfo.word && endInfo.word.length > 0
      if (endText.trim().length === 0 && !hasValidWord) {
        console.log('❌ 第二次点击在空白区域，取消选词')
        // 清理第一次点击的高亮
        if (tempHighlightOverlayRef.current) {
          tempHighlightOverlayRef.current.remove()
          tempHighlightOverlayRef.current = null
        }
        selectionStateRef.current = 'IDLE'
        firstClickInfoRef.current = null
        return
      }
      
      console.log('📍 终点位置（单词结尾）:', {
        offset: endInfo.offset,
        nodeText: endInfo.node.textContent?.substring(0, 50)
      })
      
      // 2. 位置已获取，现在可以安全移除overlay
      if (tempHighlightOverlayRef.current) {
        try {
          tempHighlightOverlayRef.current.remove()
          tempHighlightOverlayRef.current = null
          console.log('🗑️ 已移除overlay高亮（黄色）')
        } catch (error) {
          console.warn('移除overlay失败:', error)
        }
      }
      
      // 4. 创建 Range 对象选中文本
      const iframe = viewerRef.current?.querySelector('iframe')
      if (!iframe?.contentDocument) return

      const doc = iframe.contentDocument
      const range = doc.createRange()
      
      // 如果终点在起点之前，自动交换
      let actualStart = startInfo
      let actualEnd = endInfo
      
      if (endInfo.offset < startInfo.offset) {
        actualStart = endInfo
        actualEnd = startInfo
        console.log('🔄 检测到逆序选择，自动交换起止点')
      }
      
      console.log('🔧 尝试创建 Range:', {
        startNode: actualStart.node,
        startOffset: actualStart.offset,
        endNode: actualEnd.node,
        endOffset: actualEnd.offset,
        sameNode: actualStart.node === actualEnd.node
      })
      
      try {
        range.setStart(actualStart.node, actualStart.offset)
        range.setEnd(actualEnd.node, actualEnd.offset)
        console.log('✅ Range 创建成功')
      } catch (error) {
        console.error('❌ Range 设置失败:', error)
        selectionStateRef.current = 'IDLE'
        firstClickInfoRef.current = null
        return
      }
      
      // 5. 提取选中的文本
      const selectedText = range.toString().trim()
      
      if (!selectedText) {
        console.warn('⚠️ 未选中任何文本，请选择更长的范围')
        // 重置状态让用户重新选择
        selectionStateRef.current = 'IDLE'
        firstClickInfoRef.current = null
        return
      }
      
      // 如果选中文本太短（少于2个字符），提示用户
      if (selectedText.length < 2) {
        console.warn('⚠️ 选中文本太短，请选择更长的范围')
        selectionStateRef.current = 'IDLE'
        firstClickInfoRef.current = null
        return
      }
      
      console.log('✅ 选中文本:', selectedText)
      
      // 6. 获取上下文
      const container = range.commonAncestorContainer
      const fullText = container.textContent || ''
      const index = fullText.indexOf(selectedText)
      
      let context = fullText
      if (index !== -1 && fullText.length > 200) {
        const start = Math.max(0, index - 100)
        const end = Math.min(fullText.length, index + selectedText.length + 100)
        const prefix = start > 0 ? '...' : ''
        const suffix = end < fullText.length ? '...' : ''
        context = prefix + fullText.substring(start, end) + suffix
      }
      
      console.log('✅ 完整上下文:', context)
      
      // 7. 添加绿色高亮
      try {
        const span = doc.createElement('span')
        span.style.backgroundColor = 'lightgreen'
        span.style.opacity = '0.5'
        range.surroundContents(span)
        finalHighlightRef.current = span
        console.log('✅ 已添加最终高亮')
      } catch (error) {
        console.warn('添加高亮失败:', error)
      }
      
      // 8. 保存选中内容并打开 AI 面板
      console.log('🤖 打开 AI 面板')
      console.log('   文本:', selectedText)
      console.log('   上下文长度:', context.length)
      
      setAiSelectedText(selectedText)
      setAiContext(context)
      setIsAIPanelOpen(true)
      
      // 9. 自动重置状态（准备下一次选词）
      setTimeout(() => {
        selectionStateRef.current = 'IDLE'
        firstClickInfoRef.current = null
        console.log('🔄 状态已重置，可以开始新的选词')
      }, 500) // 延迟500ms重置，避免误触
      
    } catch (error) {
      console.error('❌ 处理第二次点击失败:', error)
      selectionStateRef.current = 'IDLE'
      firstClickInfoRef.current = null
    }
  }, [getClickPosition])

  /**
   * 处理点击事件
   */
  const handleClick = useCallback((event: any) => {
    try {
      console.log('📍 点击事件')
      console.log('📊 当前状态:', selectionStateRef.current)
      
      if (selectionStateRef.current === 'IDLE') {
        // 第一次点击：标记起点
        handleFirstClick(event)
      } else if (selectionStateRef.current === 'WAITING') {
        // 第二次点击：标记终点并提取文本
        handleSecondClick(event)
      }
    } catch (error) {
      console.error('❌ 处理点击事件失败:', error)
      selectionStateRef.current = 'IDLE'
      firstClickInfoRef.current = null
    }
  }, [handleFirstClick, handleSecondClick])

  /**
   * 翻页
   */
  const handlePrevPage = useCallback(() => {
    console.log('⬅️ 上一页')
    if (renditionRef.current) {
      renditionRef.current.prev()
    } else {
      console.log('❌ Rendition 不存在')
    }
  }, [])

  const handleNextPage = useCallback(() => {
    console.log('➡️ 下一页')
    if (renditionRef.current) {
      renditionRef.current.next()
    } else {
      console.log('❌ Rendition 不存在')
    }
  }, [])
  
  // 同步翻页函数到 ref
  useEffect(() => {
    handlePrevPageRef.current = handlePrevPage
    handleNextPageRef.current = handleNextPage
  }, [handlePrevPage, handleNextPage])

  // 悬浮按钮拖拽逻辑 - 触摸
  const handleButtonTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setIsDragging(true)
    dragStartPos.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }

  const handleButtonTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    const touch = e.touches[0]
    const newX = touch.clientX - dragStartPos.current.x
    const newY = touch.clientY - dragStartPos.current.y
    
    // 限制在屏幕范围内
    const maxX = window.innerWidth - buttonSize
    const maxY = window.innerHeight - buttonSize
    
    setButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }

  const handleButtonTouchEnd = () => {
    setIsDragging(false)
  }

  // 悬浮按钮拖拽逻辑 - 鼠标
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setIsDragging(true)
    dragStartPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newX = e.clientX - dragStartPos.current.x
      const newY = e.clientY - dragStartPos.current.y
      
      const maxX = window.innerWidth - buttonSize
      const maxY = window.innerHeight - buttonSize
      
      setButtonPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, buttonSize])

  // 双击切换按钮大小（现在通过设置面板调整，移除双击功能）
  const handleButtonDoubleClick = () => {
    // 不再需要双击功能，在设置面板中调整
  }

  /**
   * 章节切换
   */
  const handleChapterChange = useCallback((index: number) => {
    const chapter = chapters[index]
    if (chapter && renditionRef.current) {
      console.log('📖 切换章节:', chapter.label)
      renditionRef.current.display(chapter.href)
      setCurrentChapterIndex(index)
    }
  }, [chapters])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 🔥 移除顶部导航栏 - 阅读区域占满屏幕 */}

      {/* 阅读器主体 - 现在占据更大空间 */}
      <main className="flex-1 relative overflow-hidden">
        {/* Viewer 容器始终存在 */}
        <div ref={viewerRef} className="w-full h-full" />
        
        {/* 页码移动到底部工具栏 */}
        
        {/* 加载遮罩 */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="text-gray-600 text-sm">正在加载 EPUB 文件...</p>
          </div>
        )}
        
        {/* 错误遮罩 */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 p-8 z-10">
            <div className="text-red-600 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
            <p className="text-gray-600 text-sm text-center mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              重新加载
            </button>
          </div>
        )}
      </main>

      {/* 悬浮控制按钮 - 可拖拽、可调整透明度和大小 */}
      <button
        ref={buttonRef}
        onClick={() => !isDragging && setIsControlPanelOpen(!isControlPanelOpen)}
        onMouseDown={handleButtonMouseDown}
        onTouchStart={handleButtonTouchStart}
        onTouchMove={handleButtonTouchMove}
        onTouchEnd={handleButtonTouchEnd}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          right: buttonPosition.x === 0 ? '24px' : 'auto',
          bottom: buttonPosition.y === 0 ? '24px' : 'auto',
          left: buttonPosition.x > 0 ? `${buttonPosition.x}px` : 'auto',
          top: buttonPosition.y > 0 ? `${buttonPosition.y}px` : 'auto',
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundColor: `rgba(17, 24, 39, ${buttonOpacity / 100})`, // 使用动态透明度
        }}
        className="fixed text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center z-40 touch-none select-none"
        title={isControlPanelOpen ? "关闭控制面板" : "打开控制面板 (拖拽移动)"}
      >
        {isControlPanelOpen ? <X size={buttonSize * 0.43} /> : <Menu size={buttonSize * 0.43} />}
      </button>

      {/* 可展开的控制面板 */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-transform duration-300 z-30 ${
          isControlPanelOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 第一行：书名 + 进度 */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100/60">
          <h1 className="text-[13px] font-medium text-gray-700 truncate flex-1 mr-3 tracking-tight">
            {title}
          </h1>
          <span className="text-[12px] text-gray-500 font-medium whitespace-nowrap">{progress}%</span>
        </div>
        
        {/* 第二行：控制区域 */}
        <div className="flex items-center justify-between px-4 py-3.5">
          {/* 左侧：返回 */}
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-700 transition-all p-1.5 hover:bg-gray-100/60 rounded-lg"
            title="返回书架"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </Link>
          
          {/* 中间：翻页区域 */}
          <div className="flex items-center gap-6">
            <button
              onClick={handlePrevPage}
              disabled={loading || !!error}
              className="w-9 h-9 rounded-full bg-gray-900 text-white shadow-md hover:shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-sm flex items-center justify-center"
              title="上一页"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            
            {/* 章节和页码信息 */}
            <div className="flex flex-col items-center min-w-[160px]">
              <span className="text-[11px] text-gray-500 truncate max-w-[160px] mb-0.5">
                {currentChapter}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-gray-700 tracking-tight">
                  {totalPages > 0 ? `${currentPage}/${totalPages}` : '---'}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-[13px] font-semibold text-gray-600">
                  {progress}%
                </span>
              </div>
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={loading || !!error}
              className="w-9 h-9 rounded-full bg-gray-900 text-white shadow-md hover:shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-sm flex items-center justify-center"
              title="下一页"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
          
          {/* 右侧：功能按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsVocabularyListOpen(true)}
              className="text-gray-500 hover:text-purple-600 transition-all p-1.5 hover:bg-purple-50 rounded-lg"
              title="词汇列表"
            >
              <BookMarked size={20} strokeWidth={2} />
            </button>
            
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-gray-500 hover:text-blue-600 transition-all p-1.5 hover:bg-blue-50 rounded-lg"
              title="阅读设置"
            >
              <Settings size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        theme={theme}
        onThemeChange={setTheme}
        chapters={chapters}
        currentChapter={currentChapterIndex}
        onChapterChange={handleChapterChange}
        buttonSize={buttonSizePercent}
        onButtonSizeChange={setButtonSizePercent}
        buttonOpacity={buttonOpacity}
        onButtonOpacityChange={setButtonOpacity}
      />

      {/* AI 面板 */}
      <AIPanel
        isOpen={isAIPanelOpen}
        onClose={() => {
          setIsAIPanelOpen(false)
          // 清空选中文本，确保下次点击同一个词时能重新触发解释
          setAiSelectedText('')
          setAiContext('')
          // 关闭面板时清理绿色高亮（可选）
          // 如果想保留高亮，可以注释掉下面的代码
          if (finalHighlightRef.current) {
            try {
              const parent = finalHighlightRef.current.parentNode
              const text = finalHighlightRef.current.textContent || ''
              const textNode = document.createTextNode(text)
              parent?.replaceChild(textNode, finalHighlightRef.current)
              // 合并相邻的文本节点，恢复原始 DOM 结构
              // 这样下次选词时能获取到完整的上下文
              if (parent) {
                (parent as Element).normalize()
                console.log('🗑️ AI面板关闭，已清理高亮并合并文本节点')
              }
              finalHighlightRef.current = null
            } catch (error) {
              console.warn('清理高亮失败:', error)
            }
          }
        }}
        selectedText={aiSelectedText}
        context={aiContext}
        bookId={bookId}
      />

      {/* 词汇列表面板 */}
      <VocabularyList
        isOpen={isVocabularyListOpen}
        onClose={() => setIsVocabularyListOpen(false)}
        bookId={bookId}
      />
    </div>
  )
}
