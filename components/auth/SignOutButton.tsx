'use client'

import { signOut } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'
import { useTransition } from 'react'

/**
 * 登出按钮组件
 * 
 * 功能：
 * - 点击退出登录
 * - 显示加载状态
 * - 可自定义样式
 * 
 * 使用示例：
 * ```tsx
 * import SignOutButton from '@/components/auth/SignOutButton'
 * 
 * <SignOutButton />
 * ```
 */
export default function SignOutButton({
  variant = 'default',
  className = '',
}: {
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
}) {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  // 样式变体
  const variantStyles = {
    default: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border-2 border-red-600 text-red-600 hover:bg-red-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${variantStyles[variant]}
        ${className}
      `}
      aria-label="退出登录"
    >
      <LogOut size={18} />
      <span>{isPending ? '退出中...' : '退出登录'}</span>
    </button>
  )
}

/**
 * 紧凑版登出按钮（仅图标）
 */
export function SignOutIconButton({
  className = '',
}: {
  className?: string
}) {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className={`
        p-2 rounded-lg text-gray-700 hover:bg-gray-100
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}
      `}
      title={isPending ? '退出中...' : '退出登录'}
      aria-label="退出登录"
    >
      <LogOut size={20} className={isPending ? 'animate-spin' : ''} />
    </button>
  )
}

/**
 * 表单版登出按钮（使用 form action）
 */
export function SignOutFormButton({
  className = '',
}: {
  className?: string
}) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          text-gray-700 hover:bg-gray-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors
          ${className}
        `}
        aria-label="退出登录"
      >
        <LogOut size={18} />
        <span>退出登录</span>
      </button>
    </form>
  )
}
