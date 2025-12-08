'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface BookCardProps {
  book: {
    id: string
    title: string
    author?: string | null
    cover_url?: string | null
    upload_date: string
    reading_progress?: any
    is_favorite?: boolean
  }
  onToggleFavorite: (bookId: string, isFavorite: boolean) => void
}

export default function BookCard({ book, onToggleFavorite }: BookCardProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLongPress, setIsLongPress] = useState(false)
  const [isFavorite, setIsFavorite] = useState(book.is_favorite || false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef({ x: 0, y: 0 })
  const isPressed = useRef(false)
  
  // 长按时长（毫秒）
  const LONG_PRESS_DURATION = 500
  // 移动容差（像素）
  const MOVE_THRESHOLD = 10

  // 计算阅读进度
  const calculateProgress = () => {
    if (!book.reading_progress) return 0
    const { current_cfi, locations } = book.reading_progress
    if (!current_cfi || !locations) return 0
    
    const currentIndex = locations.indexOf(current_cfi)
    if (currentIndex === -1) return 0
    
    return Math.round((currentIndex / locations.length) * 100)
  }

  const progress = calculateProgress()

  // 触摸/鼠标按下
  const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    isPressed.current = true
    setIsLongPress(false)
    
    // 记录起始位置
    const pos = 'touches' in e ? e.touches[0] : e
    touchStartPos.current = { x: pos.clientX, y: pos.clientY }
    
    // 启动长按计时器
    longPressTimer.current = setTimeout(() => {
      if (isPressed.current) {
        // 触发长按
        setIsLongPress(true)
        handleLongPress()
        
        // 震动反馈（如果支持）
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
      }
    }, LONG_PRESS_DURATION)
  }

  // 触摸/鼠标移动
  const handlePressMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPressed.current) return
    
    const pos = 'touches' in e ? e.touches[0] : e
    const deltaX = Math.abs(pos.clientX - touchStartPos.current.x)
    const deltaY = Math.abs(pos.clientY - touchStartPos.current.y)
    
    // 如果移动超过阈值，取消长按
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      cancelLongPress()
    }
  }

  // 触摸/鼠标抬起
  const handlePressEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const wasLongPress = isLongPress
    
    // 清理状态
    cancelLongPress()
    
    // 如果不是长按，执行点击
    if (!wasLongPress && isPressed.current) {
      handleClick()
    }
    
    isPressed.current = false
    setIsLongPress(false)
  }

  // 取消长按
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // 处理长按 - 切换收藏
  const handleLongPress = async () => {
    console.log('📌 长按触发 - 切换收藏状态')
    const newFavoriteState = !isFavorite
    setIsFavorite(newFavoriteState)
    
    // 更新数据库 - 直接更新books表
    const { error } = await supabase
      .from('books')
      .update({ is_favorite: newFavoriteState })
      .eq('id', book.id)
    
    if (error) {
      console.error('更新收藏状态失败:', error)
      // 回滚状态
      setIsFavorite(!newFavoriteState)
    } else {
      onToggleFavorite(book.id, newFavoriteState)
    }
  }

  // 处理点击 - 打开阅读器
  const handleClick = () => {
    console.log('📖 点击触发 - 打开阅读器')
    router.push(`/reader/${book.id}`)
  }

  // 清理计时器
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return (
    <div 
      className={`
        group relative flex flex-col h-full w-full justify-start items-center cursor-pointer
        transition-transform duration-200 select-none
        ${isLongPress ? 'scale-95 opacity-80' : ''}
      `}
      onTouchStart={handlePressStart}
      onTouchMove={handlePressMove}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseMove={handlePressMove}
      onMouseUp={handlePressEnd}
      onMouseLeave={cancelLongPress}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
    >
      {/* 封面图片 */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] group-hover:-translate-y-1">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <span className="text-4xl font-bold text-white/50">
              {book.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* 收藏爱心 */}
        {isFavorite && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
            <Heart size={16} className="text-red-500 fill-red-500" />
          </div>
        )}
        
        {/* 进度条 */}
        {progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/30">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }} 
            />
          </div>
        )}
        
        {/* 完成标记 */}
        {progress === 100 && (
          <div className="absolute top-2 left-2 bg-green-500/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-md">
            <span className="text-xs font-semibold text-white">完成</span>
          </div>
        )}
      </div>

      {/* 书籍信息 */}
      <div className="mt-3 w-full text-center px-1">
        <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-gray-900 group-hover:text-black">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-gray-500 mt-0.5">
          {book.author || '未知作者'}
        </p>
      </div>
    </div>
  )
}
