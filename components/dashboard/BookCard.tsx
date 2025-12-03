'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, Trash2, Loader2 } from 'lucide-react'
import { deleteBook } from '@/app/dashboard/actions'
import type { Book } from '@/utils/supabase/types'

/**
 * 书籍卡片组件 - 客户端组件
 * 
 * 功能：
 * - 显示书籍信息
 * - 点击进入阅读器
 * - 删除书籍
 */
export default function BookCard({ book }: { book: Book }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // 格式化日期
  const formattedDate = new Date(book.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  /**
   * 处理删除书籍
   */
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault() // 阻止链接跳转
    e.stopPropagation() // 阻止事件冒泡

    if (!showConfirm) {
      // 第一次点击：显示确认
      setShowConfirm(true)
      // 3秒后自动取消确认
      setTimeout(() => setShowConfirm(false), 3000)
      return
    }

    // 第二次点击：执行删除
    setIsDeleting(true)

    try {
      const result = await deleteBook(book.id)

      if (result.success) {
        // 删除成功，页面会自动刷新（因为 revalidatePath）
        console.log('✅ 书籍删除成功')
      } else {
        console.error('❌ 删除失败:', result.error)
        alert(result.error || '删除失败，请重试')
        setIsDeleting(false)
        setShowConfirm(false)
      }
    } catch (error) {
      console.error('❌ 删除时发生错误:', error)
      alert('删除失败，请重试')
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden aspect-[3/4] flex flex-col">
      {/* 删除按钮 */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`
          absolute top-3 right-3 z-20
          w-8 h-8 rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${showConfirm
            ? 'bg-red-500 text-white scale-110'
            : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-600'
          }
          shadow-md hover:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isDeleting ? 'animate-pulse' : ''}
        `}
        title={showConfirm ? '再次点击确认删除' : '删除书籍'}
      >
        {isDeleting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>

      {/* 确认提示 */}
      {showConfirm && (
        <div className="absolute top-14 right-3 z-20 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-bounce">
          再次点击确认
        </div>
      )}

      {/* 书籍内容 - 作为链接 */}
      <Link
        href={`/read/${book.id}`}
        className="flex-1 flex flex-col"
        onClick={(e) => {
          if (isDeleting) e.preventDefault() // 删除中禁止点击
        }}
      >
        {/* 书籍封面占位 - 渐变背景 */}
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-purple-600 relative">
          {/* 悬停时的遮罩 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          
          {/* 书籍图标 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="text-white/80 group-hover:text-white transition-colors" size={48} />
          </div>

          {/* 悬停提示 */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white text-sm font-medium">点击阅读</p>
          </div>
        </div>

        {/* 书籍信息 */}
        <div className="p-4 bg-white">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
            {book.title}
          </h3>
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={12} />
            <time dateTime={book.created_at}>{formattedDate}</time>
          </div>
        </div>

        {/* 装饰性角标 */}
        <div className="absolute top-3 left-3 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>
    </div>
  )
}
