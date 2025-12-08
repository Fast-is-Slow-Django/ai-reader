'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Search, BookOpen, ChevronLeft, ChevronRight, Plus, Heart, Trash2, X } from 'lucide-react'
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
  
  // 多选模式
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  
  const supabase = createClient()

  // 每页显示的书籍数量（根据屏幕大小调整）
  const getItemsPerPage = () => {
    if (typeof window === 'undefined') return 15
    const width = window.innerWidth
    if (width < 640) return 12 // 手机: 3列x4行
    if (width < 1024) return 15 // 平板: 4列x4行
    return 20 // 桌面: 5列x4行
  }
  
  const [itemsPerPage, setItemsPerPage] = useState(15)
  
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

  // 进入多选模式
  const handleEnterMultiSelect = (bookId: string) => {
    setIsMultiSelectMode(true)
    setSelectedBooks(new Set([bookId]))
  }

  // 退出多选模式
  const handleExitMultiSelect = () => {
    setIsMultiSelectMode(false)
    setSelectedBooks(new Set())
  }

  // 切换书籍选中状态
  const handleToggleSelect = (bookId: string) => {
    const newSelected = new Set(selectedBooks)
    if (newSelected.has(bookId)) {
      newSelected.delete(bookId)
    } else {
      newSelected.add(bookId)
    }
    setSelectedBooks(newSelected)
  }

  // 批量添加收藏
  const handleBatchFavorite = async () => {
    const bookIds = Array.from(selectedBooks)
    
    // 乐观更新UI
    setBooks(prevBooks =>
      prevBooks.map(book =>
        bookIds.includes(book.id) ? { ...book, is_favorite: true } : book
      )
    )

    // 更新数据库
    for (const bookId of bookIds) {
      const { error } = await supabase
        .from('books')
        .update({ is_favorite: true })
        .eq('id', bookId)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Failed to favorite book:', bookId, error)
        // 回滚 UI
        setBooks(prevBooks =>
          prevBooks.map(book =>
            book.id === bookId ? { ...book, is_favorite: false } : book
          )
        )
      }
    }

    handleExitMultiSelect()
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedBooks.size} selected book(s)?`)) return
    
    const bookIds = Array.from(selectedBooks)
    
    // 更新UI
    setBooks(prevBooks => prevBooks.filter(book => !bookIds.includes(book.id)))

    // 删除数据库记录
    for (const bookId of bookIds) {
      await supabase
        .from('books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id)
    }

    handleExitMultiSelect()
  }

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F] select-none overflow-hidden">
      
      {/* Header - 固定顶部 */}
      <header className="flex-none px-6 py-4 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {!isMultiSelectMode ? (
            <>
              {/* Logo和标题 */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                  <BookOpen size={18} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">iReader</h1>
              </div>

              {/* 搜索栏 */}
              <div className="flex-1 mx-4 md:mx-12 max-w-sm">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search books..." 
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
            </>
          ) : (
            <>
              {/* 多选模式工具栏 */}
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={handleExitMultiSelect}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
                <span className="text-lg font-semibold">
                  {selectedBooks.size} Selected
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchFavorite}
                  disabled={selectedBooks.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Heart size={18} />
                  <span>Favorite</span>
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedBooks.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
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
              {cat}
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 py-8">
                    {/* 第一页第一个位置显示上传器 */}
                    {index === 0 && !isMultiSelectMode && (
                      <div className="aspect-[2/3]">
                        <BookUploader />
                      </div>
                    )}
                    {page.content.map((book: any) => (
                      <BookCard 
                        key={book.id} 
                        book={book}
                        onToggleFavorite={handleToggleFavorite}
                        isMultiSelectMode={isMultiSelectMode}
                        isSelected={selectedBooks.has(book.id)}
                        onLongPress={handleEnterMultiSelect}
                        onSelect={handleToggleSelect}
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
                            <p className="text-lg">No Favorites Yet</p>
                            <p className="text-sm mt-2">Long press to add books to favorites</p>
                          </>
                        )}
                        {activeCategory === 'Reading' && (
                          <>
                            <p className="text-lg">No Books In Progress</p>
                            <p className="text-sm mt-2">Start reading a book</p>
                          </>
                        )}
                        {activeCategory === 'All' && searchQuery && (
                          <>
                            <Search size={48} className="mb-4 opacity-50 mx-auto" />
                            <p className="text-lg">No Books Found</p>
                            <p className="text-sm mt-2">Try different keywords</p>
                          </>
                        )}
                        {activeCategory === 'All' && !searchQuery && (
                          <>
                            <p className="text-lg">No Books Yet</p>
                            <p className="text-sm mt-2">Upload your first ebook</p>
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
