'use client'

import { useEffect, useState } from 'react'
import { X, Search, Book, Calendar, Filter } from 'lucide-react'
import { getAllVocabularyCache } from '@/utils/vocabularyCache'

interface VocabularyItem {
  id: string
  book_id: string
  selected_text: string
  context: string
  ai_explanation: string
  created_at: string
  accessed_count: number
  last_accessed_at: string
}

interface VocabularyManagerProps {
  isOpen: boolean
  onClose: () => void
}

export default function VocabularyManager({
  isOpen,
  onClose,
}: VocabularyManagerProps) {
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([])
  const [filteredList, setFilteredList] = useState<VocabularyItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedBookId, setSelectedBookId] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null)
  const [bookList, setBookList] = useState<Array<{ id: string; count: number }>>([])

  /**
   * 加载词汇列表
   */
  useEffect(() => {
    if (isOpen) {
      loadVocabulary()
    }
  }, [isOpen])

  const loadVocabulary = async () => {
    setIsLoading(true)
    const result = await getAllVocabularyCache() // 获取所有书籍的词汇
    if (result.success && result.data) {
      setVocabularyList(result.data)
      setFilteredList(result.data)
      
      // 统计每本书的词汇数量
      const bookCounts: Record<string, number> = {}
      result.data.forEach(item => {
        bookCounts[item.book_id] = (bookCounts[item.book_id] || 0) + 1
      })
      const books = Object.entries(bookCounts).map(([id, count]) => ({ id, count }))
      setBookList(books)
    }
    setIsLoading(false)
  }

  /**
   * 筛选词汇
   */
  useEffect(() => {
    let filtered = vocabularyList

    // 按书籍筛选
    if (selectedBookId !== 'all') {
      filtered = filtered.filter(item => item.book_id === selectedBookId)
    }

    // 按文本搜索
    if (searchText.trim() !== '') {
      filtered = filtered.filter(item =>
        item.selected_text.toLowerCase().includes(searchText.toLowerCase())
      )
    }

    setFilteredList(filtered)
  }, [searchText, selectedBookId, vocabularyList])

  /**
   * 格式化日期
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * 截断上下文
   */
  const truncateContext = (text: string, maxLength = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  /**
   * 截断 Book ID 显示
   */
  const formatBookId = (bookId: string) => {
    return bookId.substring(0, 8) + '...'
  }

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* 词汇管理面板 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[85vh] flex flex-col animate-slide-up">
        {/* 拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Book size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vocabulary Library</h2>
              <p className="text-xs text-gray-500">
                {bookList.length} books · {filteredList.length} words
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 筛选和搜索栏 */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 space-y-3">
          {/* 书籍筛选 */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
              <option value="all">All Books ({vocabularyList.length})</option>
              {bookList.map((book) => (
                <option key={book.id} value={book.id}>
                  Book {formatBookId(book.id)} ({book.count})
                </option>
              ))}
            </select>
          </div>

          {/* 搜索栏 */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search vocabulary..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 词汇列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchText || selectedBookId !== 'all' ? 'No matching vocabulary found' : 'No vocabulary yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.selected_text}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded">
                        {item.accessed_count}x
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {truncateContext(item.context)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Book size={12} />
                      <span>{formatBookId(item.book_id)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 词汇详情弹窗 */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedItem(null)}
          />
          <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* 详情头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedItem.selected_text}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* 详情内容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Context</h4>
                <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedItem.context}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Explanation</h4>
                <div className="prose prose-sm max-w-none">
                  <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap bg-purple-50 p-4 rounded-lg">
                    {selectedItem.ai_explanation}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <Book size={14} />
                  <span>Book ID: {selectedItem.book_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Created: {formatDate(selectedItem.created_at)}</span>
                </div>
                <p>Accessed: {selectedItem.accessed_count} times</p>
                <p>Last accessed: {formatDate(selectedItem.last_accessed_at)}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
