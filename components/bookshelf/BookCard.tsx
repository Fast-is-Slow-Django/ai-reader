'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Heart, Check } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface BookCardProps {
  book: {
    id: string
    title: string
    author?: string | null
    cover_url?: string | null
    upload_date: string
    reading_progress?: any
    metadata?: {
      favorite?: boolean
      tags?: string[]
      rating?: number
      [key: string]: any
    }
  }
  onToggleFavorite: (bookId: string, isFavorite: boolean) => void
  isMultiSelectMode?: boolean
  isSelected?: boolean
  onLongPress?: (bookId: string) => void
  onSelect?: (bookId: string) => void
}

export default function BookCard({ 
  book, 
  onToggleFavorite, 
  isMultiSelectMode = false,
  isSelected = false,
  onLongPress,
  onSelect 
}: BookCardProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // Debug: log selection state
  // isSelected状态更新会自动重新渲染，不需要额外日志
  
  const [isLongPress, setIsLongPress] = useState(false)
  const [isFavorite, setIsFavorite] = useState(book.metadata?.favorite || false)
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
    isPressed.current = true
    setIsLongPress(false)
    
    // 记录起始位置
    const pos = 'touches' in e ? e.touches[0] : e
    touchStartPos.current = { x: pos.clientX, y: pos.clientY }
    
    // 如果不在多选模式，启动长按计时器
    if (!isMultiSelectMode) {
      longPressTimer.current = setTimeout(() => {
        if (isPressed.current) {
          // 触发长按
          setIsLongPress(true)
          
          // 进入多选模式
          if (onLongPress) {
            onLongPress(book.id)
          }
          
          // 震动反馈（如果支持且用户已交互）
          try {
            if ('vibrate' in navigator) {
              navigator.vibrate(50)
            }
          } catch (error) {
            // 忽略振动错误
          }
        }
      }, LONG_PRESS_DURATION)
    }
  }

  // 触摸/鼠标移动
  const handlePressMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPressed.current) return
    
    // 在多选模式下，允许移动也能取消点击
    if (isMultiSelectMode) {
      const pos = 'touches' in e ? e.touches[0] : e
      const deltaX = Math.abs(pos.clientX - touchStartPos.current.x)
      const deltaY = Math.abs(pos.clientY - touchStartPos.current.y)
      
      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        isPressed.current = false
      }
      return
    }
    
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
    // 阻止事件冒泡
    e.stopPropagation()
    
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

  // 处理点击 - 多选模式下切换选中，普通模式下打开阅读器
  const handleClick = () => {
    if (isMultiSelectMode && onSelect) {
      // 多选模式：切换选中状态
      onSelect(book.id)
    } else {
      // 普通模式：打开阅读器
      router.push(`/read/${book.id}`)
    }
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
      onClick={(e) => {
        // 桌面端点击支持（移动端已被touch事件处理）
        if (!('ontouchstart' in window)) {
          handlePressStart(e as React.MouseEvent)
          handlePressEnd(e as React.MouseEvent)
        }
      }}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
    >
      {/* 封面图片 */}
      <div className={`
        relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 
        shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 
        ${!isMultiSelectMode && 'group-hover:scale-105 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] group-hover:-translate-y-1'}
        ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''}
      `}>
        {book.cover_url && book.cover_url.trim() ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
            priority={false}
            onError={(e) => {
              // If image fails to load, hide it
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        
        {/* Gradient placeholder - always show as background */}
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, 
              hsl(${book.title.charCodeAt(0) * 137.5 % 360}, 70%, 60%), 
              hsl(${(book.title.charCodeAt(0) * 137.5 + 60) % 360}, 70%, 50%)
            )`,
            zIndex: book.cover_url && book.cover_url.trim() ? -1 : 0
          }}
        >
          <span className="text-4xl md:text-5xl font-bold text-white/30">
            {book.title.charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* 多选模式 - 选中状态 */}
        {isMultiSelectMode && (
          <div className="absolute top-2 right-2 z-10">
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center
              transition-all duration-200
              ${isSelected 
                ? 'bg-blue-500 scale-110' 
                : 'bg-white/80 backdrop-blur-sm border-2 border-gray-300'
              }
            `}>
              {isSelected && <Check size={16} className="text-white" />}
            </div>
          </div>
        )}
        
        {/* 收藏爱心 - 非多选模式显示 */}
        {!isMultiSelectMode && isFavorite && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
            <Heart size={14} className="text-red-500 fill-red-500" />
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
            <span className="text-xs font-semibold text-white">Finished</span>
          </div>
        )}
      </div>

      {/* 书籍信息 */}
      <div className="mt-3 w-full text-center px-1">
        <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-gray-900 group-hover:text-black">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-gray-500 mt-0.5">
          {book.author || 'Unknown Author'}
        </p>
      </div>
    </div>
  )
}
