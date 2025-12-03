'use client'

import { useEffect, useState } from 'react'
import { Database, Trash2, HardDrive, X } from 'lucide-react'
import { getAllCachedBooks, getCacheSize, deleteCachedEpub, clearAllCache } from '@/utils/epubCache'

interface CachedBook {
  bookId: string
  url: string
  size: number
  cachedAt: number
}

interface CacheManagerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CacheManager({ isOpen, onClose }: CacheManagerProps) {
  const [cachedBooks, setCachedBooks] = useState<CachedBook[]>([])
  const [totalSize, setTotalSize] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCacheInfo()
    }
  }, [isOpen])

  const loadCacheInfo = async () => {
    setIsLoading(true)
    const books = await getAllCachedBooks()
    const size = await getCacheSize()
    setCachedBooks(books)
    setTotalSize(size)
    setIsLoading(false)
  }

  const handleDeleteCache = async (bookId: string) => {
    if (confirm('确定要删除这本书的缓存吗？')) {
      await deleteCachedEpub(bookId)
      loadCacheInfo()
    }
  }

  const handleClearAll = async () => {
    if (confirm('确定要清空所有缓存吗？下次阅读时需要重新下载。')) {
      await clearAllCache()
      loadCacheInfo()
    }
  }

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* 缓存管理面板 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[85vh] flex flex-col animate-slide-up">
        {/* 拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Database size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cache Manager</h2>
              <p className="text-xs text-gray-500">
                {cachedBooks.length} books · {formatSize(totalSize)}
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

        {/* 操作栏 */}
        <div className="px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={handleClearAll}
            disabled={cachedBooks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Trash2 size={16} />
            <span>Clear All Cache</span>
          </button>
        </div>

        {/* 缓存列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : cachedBooks.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No cached books</p>
              <p className="text-xs text-gray-400 mt-2">
                Books will be cached automatically when you open them
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cachedBooks.map((book) => (
                <div
                  key={book.bookId}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {book.bookId.substring(0, 20)}...
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatSize(book.size)} · Cached {formatDate(book.cachedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteCache(book.bookId)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors ml-2"
                      title="删除缓存"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            💡 Cached books can be read without downloading again
          </p>
        </div>
      </div>

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
