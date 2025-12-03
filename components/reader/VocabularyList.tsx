'use client'

import { useEffect, useState } from 'react'
import { X, Search, Book, Trash2 } from 'lucide-react'
import { getAllVocabularyCache, searchVocabularyCache, deleteVocabularyCache } from '@/utils/vocabularyCache'

interface VocabularyItem {
  id: string
  selected_text: string
  context: string
  ai_explanation: string
  created_at: string
  accessed_count: number
  last_accessed_at: string
}

interface VocabularyListProps {
  isOpen: boolean
  onClose: () => void
  bookId?: string
}

export default function VocabularyList({
  isOpen,
  onClose,
  bookId,
}: VocabularyListProps) {
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([])
  const [filteredList, setFilteredList] = useState<VocabularyItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * 加载词汇列表
   */
  useEffect(() => {
    if (isOpen) {
      loadVocabulary()
    }
  }, [isOpen, bookId])

  const loadVocabulary = async () => {
    setIsLoading(true)
    const result = await getAllVocabularyCache(bookId)
    if (result.success && result.data) {
      setVocabularyList(result.data)
      setFilteredList(result.data)
    }
    setIsLoading(false)
  }

  /**
   * 搜索词汇
   */
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredList(vocabularyList)
    } else {
      const filtered = vocabularyList.filter(item =>
        item.selected_text.toLowerCase().includes(searchText.toLowerCase())
      )
      setFilteredList(filtered)
    }
  }, [searchText, vocabularyList])

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
  const truncateContext = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  /**
   * 删除单词
   */
  const handleDelete = async (vocabularyId: string) => {
    setIsDeleting(true)
    const result = await deleteVocabularyCache(vocabularyId)
    
    if (result.success) {
      // 从列表中移除
      setVocabularyList(prev => prev.filter(item => item.id !== vocabularyId))
      setFilteredList(prev => prev.filter(item => item.id !== vocabularyId))
      
      // 如果正在查看详情，关闭详情
      if (selectedItem?.id === vocabularyId) {
        setSelectedItem(null)
      }
      
      console.log('✅ 单词已删除')
    } else {
      alert(`删除失败: ${result.error}`)
    }
    
    setIsDeleting(false)
    setDeleteConfirm(null)
  }

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* 词汇列表面板 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[80vh] flex flex-col animate-slide-up">
        {/* 拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Book size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vocabulary List</h2>
              <p className="text-xs text-gray-500">
                {bookId ? 'Current Book' : 'All Books'} · {filteredList.length} words
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

        {/* 搜索栏 */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
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
                {searchText ? 'No matching vocabulary found' : 'No vocabulary yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-md transition-all relative group"
                >
                  <div
                    onClick={() => setSelectedItem(item)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.selected_text}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {item.accessed_count}x
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {truncateContext(item.context)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Last accessed: {formatDate(item.last_accessed_at)}
                    </p>
                  </div>
                  
                  {/* 删除按钮 - 移动端始终可见，桌面端悬停显示 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(item.id)
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 rounded-lg md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                    title="删除"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-purple-50">
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

              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <p>Created: {formatDate(selectedItem.created_at)}</p>
                  <p>Accessed: {selectedItem.accessed_count} times</p>
                  <p>Last accessed: {formatDate(selectedItem.last_accessed_at)}</p>
                </div>
                
                {/* 删除按钮 */}
                <button
                  onClick={() => setDeleteConfirm(selectedItem.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-60"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-60 p-6 w-80">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Vocabulary</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this vocabulary item?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </>
                )}
              </button>
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
