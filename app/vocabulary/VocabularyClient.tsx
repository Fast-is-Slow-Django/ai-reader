'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Calendar, Hash, FileText, Volume2, Trash2, ChevronDown, ChevronUp, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface VocabularyItem {
  id: string
  selected_text: string
  context?: string
  ai_explanation?: string
  created_at: string
  accessed_count?: number
  book_id?: string
  book_title?: string
  book_author?: string
}

interface VocabularyClientProps {
  initialVocabularies: VocabularyItem[]
  user: any
}

export default function VocabularyClient({ initialVocabularies, user }: VocabularyClientProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>(initialVocabularies)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [playingItems, setPlayingItems] = useState<Set<string>>(new Set())
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set())
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  // 每页显示的单词数量
  const ITEMS_PER_PAGE = 10

  // 切换展开/折叠
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
      // 更新访问次数
      updateAccessCount(id)
    }
    setExpandedItems(newExpanded)
  }

  // 更新访问次数
  const updateAccessCount = async (id: string) => {
    const vocab = vocabularies.find(v => v.id === id)
    if (!vocab) return
    
    const newCount = (vocab.accessed_count || 0) + 1
    
    // 乐观更新
    setVocabularies(prevList => 
      prevList.map(v => 
        v.id === id ? { ...v, accessed_count: newCount } : v
      )
    )
    
    // 更新数据库
    await supabase
      .from('vocabulary_cache')
      .update({ accessed_count: newCount })
      .eq('id', id)
  }

  // 朗读单词或解释
  const handleSpeak = async (text: string, vocabId: string, isExplanation = false) => {
    if (playingItems.has(vocabId)) return
    
    const newPlaying = new Set(playingItems)
    newPlaying.add(vocabId)
    setPlayingItems(newPlaying)
    
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          isExplanation,
          vocabId 
        })
      })
      
      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          const updatedPlaying = new Set(playingItems)
          updatedPlaying.delete(vocabId)
          setPlayingItems(updatedPlaying)
        }
        
        await audio.play()
      }
    } catch (error) {
      console.error('朗读失败:', error)
    } finally {
      const updatedPlaying = new Set(playingItems)
      updatedPlaying.delete(vocabId)
      setPlayingItems(updatedPlaying)
    }
  }

  // 刷新AI解释
  const handleRefreshExplanation = async (vocab: VocabularyItem) => {
    if (refreshingItems.has(vocab.id)) return
    
    const newRefreshing = new Set(refreshingItems)
    newRefreshing.add(vocab.id)
    setRefreshingItems(newRefreshing)
    
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          selectedText: vocab.selected_text,
          context: vocab.context,
          bookId: vocab.book_id,
          forceRefresh: true
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.explanation) {
          // 更新本地状态
          setVocabularies(prevList => 
            prevList.map(v => 
              v.id === vocab.id ? { ...v, ai_explanation: data.explanation } : v
            )
          )
        }
      }
    } catch (error) {
      console.error('刷新解释失败:', error)
    } finally {
      const updatedRefreshing = new Set(refreshingItems)
      updatedRefreshing.delete(vocab.id)
      setRefreshingItems(updatedRefreshing)
    }
  }

  // 删除词汇
  const handleDelete = async (id: string) => {
    if (deletingItems.has(id) || !confirm('Delete this word?')) return
    
    const newDeleting = new Set(deletingItems)
    newDeleting.add(id)
    setDeletingItems(newDeleting)
    
    try {
      const { error } = await supabase
        .from('vocabulary_cache')
        .delete()
        .eq('id', id)
      
      if (!error) {
        setVocabularies(prevList => prevList.filter(v => v.id !== id))
        expandedItems.delete(id)
        
        // 如果删除后当前页为空，回到上一页
        const newTotal = vocabularies.length - 1
        const newTotalPages = Math.ceil(newTotal / ITEMS_PER_PAGE)
        if (currentPage >= newTotalPages && currentPage > 0) {
          setCurrentPage(currentPage - 1)
        }
      }
    } catch (error) {
      console.error('删除失败:', error)
    } finally {
      const updatedDeleting = new Set(deletingItems)
      updatedDeleting.delete(id)
      setDeletingItems(updatedDeleting)
    }
  }

  // 分页计算
  const totalPages = Math.max(1, Math.ceil(vocabularies.length / ITEMS_PER_PAGE))
  const paginatedVocabularies = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return vocabularies.slice(start, end)
  }, [vocabularies, currentPage])

  // 翻页函数
  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  // 触摸手势处理
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const minSwipeDistance = 50
    
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) nextPage()
    if (isRightSwipe) prevPage()
  }

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="flex-none bg-white border-b border-gray-200 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：返回按钮和标题 */}
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="返回书架"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shadow-md">
                  <BookOpen className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Vocabulary List</h1>
                  <p className="text-sm text-gray-600">{vocabularies.length} words</p>
                </div>
              </div>
            </div>

            {/* 右侧：用户信息 */}
            <div className="text-right">
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区 - 横向翻页 */}
      <main 
        className="flex-1 relative w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="h-full w-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* 词汇列表 */}
            <div className="space-y-3">
              {paginatedVocabularies.map((vocab) => {
            const isExpanded = expandedItems.has(vocab.id)
            const isPlaying = playingItems.has(vocab.id)
            const isRefreshing = refreshingItems.has(vocab.id)
            const isDeleting = deletingItems.has(vocab.id)
            
            return (
              <div 
                key={vocab.id} 
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                {/* 单词头部 - 始终显示 */}
                <div 
                  onClick={() => toggleExpand(vocab.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {vocab.selected_text}
                    </h3>
                    {vocab.book_title && (
                      <span className="text-sm text-gray-500">
                        {vocab.book_title}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {vocab.accessed_count || 1} views
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* 快速朗读按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSpeak(vocab.selected_text, vocab.id)
                      }}
                      disabled={isPlaying}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Read aloud"
                    >
                      {isPlaying ? (
                        <Loader2 size={18} className="animate-spin text-blue-500" />
                      ) : (
                        <Volume2 size={18} className="text-gray-600" />
                      )}
                    </button>
                    
                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(vocab.id)
                      }}
                      disabled={isDeleting}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 size={18} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={18} className="text-red-500" />
                      )}
                    </button>
                    
                    {/* 展开/折叠图标 */}
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* 展开的详细内容 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* 上下文 */}
                    {vocab.context && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 italic">
                          ...{vocab.context}...
                        </p>
                      </div>
                    )}

                    {/* AI 解释 */}
                    {vocab.ai_explanation && (
                      <div className="prose prose-sm max-w-none">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">AI Explanation</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSpeak(vocab.ai_explanation!, vocab.id, true)}
                              disabled={isPlaying}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Read explanation"
                            >
                              {isPlaying ? (
                                <Loader2 size={14} className="animate-spin text-blue-500" />
                              ) : (
                                <Volume2 size={14} className="text-gray-600" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRefreshExplanation(vocab)}
                              disabled={isRefreshing}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Refresh explanation"
                            >
                              {isRefreshing ? (
                                <Loader2 size={14} className="animate-spin text-blue-500" />
                              ) : (
                                <RefreshCw size={14} className="text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="text-gray-700 whitespace-pre-wrap">
                          {vocab.ai_explanation}
                        </div>
                      </div>
                    )}
                    
                    {/* 元信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          {new Date(vocab.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      {vocab.book_author && (
                        <span>Author: {vocab.book_author}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

            {/* 空状态提示 */}
            {vocabularies.length === 0 && (
              <div className="mt-16 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-4">
                  <FileText className="text-gray-400" size={48} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Saved Words Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Words you look up while reading will be saved here
                </p>
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Bookshelf
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 翻页按钮（桌面端） */}
        {vocabularies.length > 0 && totalPages > 1 && (
          <>
            {/* 左箭头 */}
            {currentPage > 0 && (
              <button
                onClick={prevPage}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all z-10"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            
            {/* 右箭头 */}
            {currentPage < totalPages - 1 && (
              <button
                onClick={nextPage}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all z-10"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </>
        )}
      </main>

      {/* 页码指示器 */}
      {vocabularies.length > 0 && totalPages > 1 && (
        <footer className="flex-none py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <div className="flex gap-1 ml-3">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${index === currentPage 
                      ? 'bg-black w-6' 
                      : 'bg-gray-300 hover:bg-gray-400'
                    }
                  `}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
