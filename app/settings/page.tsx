import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, User, Bell, Shield, Palette, Globe } from 'lucide-react'

export default async function SettingsPage() {
  // 创建 Supabase 客户端
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // 如果未登录，重定向到登录页
  if (userError || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="返回书架"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shadow-md">
                <Settings className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 用户信息 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.email}</h2>
              <p className="text-sm text-gray-500">用户ID: {user.id.slice(0, 8)}...</p>
            </div>
          </div>
        </div>

        {/* 设置选项 */}
        <div className="space-y-4">
          {/* 账户设置 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User size={18} />
                账户设置
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">修改密码</span>
                <span className="text-gray-400 text-sm">即将推出</span>
              </button>
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">邮箱地址</span>
                <span className="text-gray-500 text-sm">{user.email}</span>
              </button>
            </div>
          </div>

          {/* 通知设置 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Bell size={18} />
                通知设置
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">邮件通知</span>
                <span className="text-gray-400 text-sm">即将推出</span>
              </button>
            </div>
          </div>

          {/* 外观设置 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Palette size={18} />
                外观设置
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">主题模式</span>
                <span className="text-gray-400 text-sm">即将推出</span>
              </button>
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">语言设置</span>
                <span className="text-gray-500 text-sm">简体中文</span>
              </button>
            </div>
          </div>

          {/* 隐私设置 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield size={18} />
                隐私与安全
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">数据导出</span>
                <span className="text-gray-400 text-sm">即将推出</span>
              </button>
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">删除账户</span>
                <span className="text-gray-400 text-sm">联系支持</span>
              </button>
            </div>
          </div>

          {/* 关于 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe size={18} />
                关于
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">版本信息</span>
                <span className="text-gray-500 text-sm">v1.0.0</span>
              </button>
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">使用条款</span>
              </button>
              <button className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="text-gray-700">隐私政策</span>
              </button>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>&copy; 2024 iReader. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}

/**
 * 页面元数据
 */
export const metadata = {
  title: 'Settings - iReader',
  description: '管理你的账户和偏好设置',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
