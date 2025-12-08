'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Settings, LogOut, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface ProfileDropdownProps {
  user: {
    email?: string
    id: string
  }
}

export default function ProfileDropdown({ user }: ProfileDropdownProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 处理退出登录
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 获取用户头像首字母
  const getInitials = () => {
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 头像按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-white shadow-md cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center"
      >
        <span className="text-white font-semibold text-sm">
          {getInitials()}
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {user.email || '用户'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ID: {user.id.slice(0, 8)}...
            </p>
          </div>

          {/* 菜单项 */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push('/vocabulary')
              }}
              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="mr-3 text-gray-400" size={18} />
              <span>Vocabulary List</span>
              <span className="ml-auto text-xs text-gray-400">词汇表</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                router.push('/settings')
              }}
              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="mr-3 text-gray-400" size={18} />
              <span>Settings</span>
              <span className="ml-auto text-xs text-gray-400">设置</span>
            </button>
          </div>

          {/* 分割线 */}
          <div className="border-t border-gray-100 my-1"></div>

          {/* 退出登录 */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                handleSignOut()
              }}
              className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3" size={18} />
              <span>Sign Out</span>
              <span className="ml-auto text-xs text-red-400">退出</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
