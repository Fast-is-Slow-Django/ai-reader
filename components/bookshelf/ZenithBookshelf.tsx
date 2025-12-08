'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Search, Grid, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import BookCard from './BookCard'
import ProfileDropdown from './ProfileDropdown'
import BookUploader from '@/components/dashboard/BookUploader'
import { createClient } from '@/utils/supabase/client'

type Category = 'All' | 'Reading' | 'Favorites'

interface ZenithBookshelfProps {
  initialBooks: any[]
  user: any
}

export default function ZenithBookshelf({ initialBooks, user }: ZenithBookshelfProps) {
  const [books, setBooks] = useState(initialBooks)
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  const supabase = createClient()

  // 每页显示的书籍数量（根据屏幕大小调整）
  const getItemsPerPage = () => {
    if (typeof window === 'undefined') return 8
    const width = window.innerWidth
    if (width < 640) return 6 // 手机: 2列x3行
    if (width < 1024) return 9 // 平板: 3列x3行
    return 12 // 桌面: 4列x3行
  }
  
  const [itemsPerPage, setItemsPerPage] = useState(8)
  
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage())
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 计算阅读进度
  const calculateProgress = (book: any) => {
    if (!book.reading_progress) return 0
    const { current_cfi, locations } = book.reading_progress
    if (!current_cfi || !locations || locations.length === 0) return 0
    
    const currentIndex = locations.indexOf(current_cfi)
    if (currentIndex === -1) return 0
    
    return Math.round((currentIndex / locations.length) * 100)
  }

  // 筛选和搜索逻辑
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // 分类筛选
      let matchesCategory = false
      if (activeCategory === 'All') {
        matchesCategory = true
      } else if (activeCategory === 'Reading') {
        const progress = calculateProgress(book)
        matchesCategory = progress > 0 && progress < 100
      } else if (activeCategory === 'Favorites') {
        matchesCategory = book.is_favorite === true
      }
      
      // 搜索筛选
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = searchQuery === '' || 
        book.title.toLowerCase().includes(searchLower) || 
        (book.author && book.author.toLowerCase().includes(searchLower))
      
      return matchesCategory && matchesSearch
    })
  }, [books, activeCategory, searchQuery])

  // 生成页面
  const pages = useMemo(() => {
    const pageList = []
    
    if (filteredBooks.length === 0) {
      // 如果没有书籍，显示空状态页（但仍包含上传器）
      pageList.push({ type: 'empty', content: [] })
    } else {
      // 第一页少放一本书，给上传器留位置
      const firstPageBooks = filteredBooks.slice(0, itemsPerPage - 1)
      pageList.push({
        type: 'grid',
        content: firstPageBooks
      })
      
      // 后续页面正常分页
      for (let i = itemsPerPage - 1; i < filteredBooks.length; i += itemsPerPage) {
        pageList.push({
          type: 'grid',
          content: filteredBooks.slice(i, i + itemsPerPage)
        })
      }
    }
    
    return pageList
  }, [filteredBooks, itemsPerPage])

  // 重置页码当筛选条件改变
  useEffect(() => {
    setCurrentPage(0)
  }, [activeCategory, searchQuery])

  const totalPages = pages.length

  // 导航处理
  const nextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(c => c + 1)
  }

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(c => c - 1)
  }

  // 滑动手势处理
  const minSwipeDistance = 50
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
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) nextPage()
    if (isRightSwipe) prevPage()
  }

  // 切换收藏状态的回调
  const handleToggleFavorite = (bookId: string, isFavorite: boolean) => {
    setBooks(prevBooks => 
      prevBooks.map(book => 
        book.id === bookId ? { ...book, is_favorite: isFavorite } : book
      )
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F] select-none overflow-hidden">
      
      {/* Header - 固定顶部 */}
      <header className="flex-none px-6 py-4 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Logo和标题 */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
              <Grid size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">iReader</h1>
          </div>

          {/* 搜索栏 */}
          <div className="flex-1 mx-4 md:mx-12 max-w-sm">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="搜索书籍..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border-none bg-white/80 py-2 pl-9 pr-4 text-sm shadow-sm ring-1 ring-gray-900/5 focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md"
              />
            </div>
          </div>

          {/* 用户头像 */}
          <div className="flex items-center gap-3">
            <ProfileDropdown user={user} />
          </div>
        </div>
        
        {/* 分类过滤器 */}
        <div className="mt-4 flex justify-center items-center space-x-3">
          {(['All', 'Reading', 'Favorites'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300
                ${activeCategory === cat 
                  ? 'bg-black text-white shadow-lg shadow-black/10' 
                  : 'bg-white/50 text-gray-500 hover:bg-white hover:text-gray-900'}
              `}
            >
              {cat === 'All' ? '全部' : cat === 'Reading' ? '在读' : '收藏'}
            </button>
          ))}
        </div>
      </header>

      {/* 主内容区 - 横向滑动 */}
      <main 
        className="flex-1 relative w-full overflow-hidden"
      >
        <div 
          className="h-full flex transition-transform duration-500"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {pages.map((page, index) => (
            <div 
              key={index} 
              className="w-full h-full flex-shrink-0 overflow-y-auto overflow-x-hidden"
            >
              <div className="p-4 md:p-8 flex flex-col items-center min-h-full">
                <div className="w-full max-w-6xl flex flex-col">
                
                {/* 网格布局 */}
                {page.type === 'grid' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 py-8">
                    {/* 第一页第一个位置显示上传器 */}
                    {index === 0 && (
                      <div className="aspect-[2/3]">
                        <BookUploader />
                      </div>
                    )}
                    {page.content.map((book: any) => (
                      <BookCard 
                        key={book.id} 
                        book={book}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                )}

                {/* 空状态 */}
                {page.type === 'empty' && (
                  <div className="h-full flex flex-col justify-center items-center">
                    {/* 空状态时也显示上传器 */}
                    <div className="grid grid-cols-1 gap-8 max-w-md w-full">
                      <div className="aspect-[2/3]">
                        <BookUploader />
                      </div>
                      <div className="text-center text-gray-400">
                        {activeCategory === 'Favorites' && (
                          <>
                            <p className="text-lg">还没有收藏</p>
                            <p className="text-sm mt-2">长按书籍封面添加到收藏</p>
                          </>
                        )}
                        {activeCategory === 'Reading' && (
                          <>
                            <p className="text-lg">还没有在读的书</p>
                            <p className="text-sm mt-2">开始阅读一本书吧</p>
                          </>
                        )}
                        {activeCategory === 'All' && searchQuery && (
                          <>
                            <Search size={48} className="mb-4 opacity-50 mx-auto" />
                            <p className="text-lg">没有找到书籍</p>
                            <p className="text-sm mt-2">试试其他关键词</p>
                          </>
                        )}
                        {activeCategory === 'All' && !searchQuery && (
                          <>
                            <p className="text-lg">还没有书籍</p>
                            <p className="text-sm mt-2">点击上方卡片上传你的第一本电子书</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 页面导航（桌面端） */}
        {totalPages > 1 && (
          <>
            {/* 左箭头 */}
            {currentPage > 0 && (
              <button
                onClick={prevPage}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* 右箭头 */}
            {currentPage < totalPages - 1 && (
              <button
                onClick={nextPage}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </>
        )}
      </main>

      {/* 页面指示器（底部） */}
      {totalPages > 1 && (
        <div className="flex-none pb-4 flex justify-center items-center space-x-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${currentPage === index 
                  ? 'w-8 bg-black' 
                  : 'bg-gray-300 hover:bg-gray-400'}
              `}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
