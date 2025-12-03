import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BookUploader from '@/components/dashboard/BookUploader'
import BookCard from '@/components/dashboard/BookCard'
import SignOutButton from '@/components/auth/SignOutButton'
import VocabularyButton from '@/components/dashboard/VocabularyButton'
import CacheButton from '@/components/dashboard/CacheButton'
import { BookOpen } from 'lucide-react'

/**
 * 书架页面 - Server Component
 * 
 * 功能：
 * - 显示用户的所有书籍
 * - 上传新书籍
 * - 点击书籍进入阅读器
 */
export default async function DashboardPage() {
  // 1. 创建 Supabase 客户端
  const supabase = await createClient()

  // 2. 获取当前用户
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // 3. 如果未登录，重定向到登录页
  if (userError || !user) {
    redirect('/login')
  }

  // 4. 查询用户的书籍列表
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 5. 处理查询错误
  if (booksError) {
    console.error('查询书籍失败:', booksError)
  }

  const booksList = books || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：标题和用户信息 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <BookOpen className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">我的书架</h1>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>

            {/* 右侧：退出按钮 */}
            <SignOutButton variant="outline" />
          </div>
        </div>
      </header>

      {/* 主要内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计信息和快捷操作 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <BookOpen size={20} />
            <span className="text-lg">
              共 <span className="font-semibold text-gray-900">{booksList.length}</span> 本书籍
            </span>
          </div>

          {/* 快捷操作按钮 */}
          <div className="flex items-center gap-3">
            <CacheButton />
            <VocabularyButton />
          </div>
        </div>

        {/* 书籍网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {/* 上传器 - 第一个位置 */}
          <BookUploader />

          {/* 书籍卡片列表 */}
          {booksList.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>

        {/* 空状态提示 */}
        {booksList.length === 0 && (
          <div className="mt-16 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-4">
              <BookOpen className="text-gray-400" size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              还没有书籍
            </h3>
            <p className="text-gray-600 mb-6">
              点击左上角的卡片上传你的第一本电子书
            </p>
          </div>
        )}
      </main>
    </div>
  )
}


/**
 * 生成静态参数（可选）
 * 
 * 如果需要 ISR 或 SSG，可以导出这个函数
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 页面元数据
 */
export const metadata = {
  title: '我的书架 - AI-Reader',
  description: '管理和阅读你的电子书收藏',
}
