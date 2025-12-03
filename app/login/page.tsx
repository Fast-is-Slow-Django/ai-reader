'use client'

import { login, signup } from './actions'
import { useSearchParams } from 'next/navigation'
import { BookOpen, Mail, Lock } from 'lucide-react'
import Link from 'next/link'

/**
 * 登录页面
 * 
 * 功能：
 * - 邮箱密码登录
 * - 快速注册
 * - 错误提示
 * - 响应式设计（移动端优先）
 */
export default function LoginPage() {
  const searchParams = useSearchParams()
  
  // 获取 URL 中的错误参数
  const error = searchParams.get('error')
  const redirectTo = searchParams.get('redirectTo')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI-Reader
          </h1>
          <p className="text-gray-600">
            智能电子书阅读器
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* 欢迎文本 */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              欢迎回来
            </h2>
            <p className="text-gray-600 text-sm">
              登录或创建账号以继续
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium">错误</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* 重定向提示 */}
          {redirectTo && !error && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              <p>请先登录以继续访问</p>
            </div>
          )}

          {/* 统一表单 - 一个表单两个按钮 */}
          <form className="space-y-4">
            {/* Email 输入框 */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                邮箱地址
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={20} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Password 输入框 */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                密码至少 6 个字符
              </p>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              formAction={login}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              登录
            </button>

            {/* 分割线 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">或</span>
              </div>
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              formAction={signup}
              className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              创建新账号
            </button>
          </form>

          {/* 忘记密码链接 */}
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              忘记密码？
            </Link>
          </div>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-sm text-gray-600 mt-6">
          继续使用即表示您同意我们的{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">
            服务条款
          </Link>
          {' '}和{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            隐私政策
          </Link>
        </p>
      </div>
    </div>
  )
}
