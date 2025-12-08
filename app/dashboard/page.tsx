import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ZenithBookshelf from '@/components/bookshelf/ZenithBookshelf'

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

  // 4. 查询用户的书籍列表（包含user_books关联数据）
  const { data: userBooks, error: booksError } = await supabase
    .from('user_books')
    .select(`
      id,
      book_id,
      reading_progress,
      is_favorite,
      last_read_at,
      books!inner (
        id,
        title,
        author,
        cover_url,
        file_url,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('last_read_at', { ascending: false, nullsFirst: false })

  // 5. 处理查询错误
  if (booksError) {
    console.error('查询书籍失败:', booksError)
  }

  // 转换数据格式
  const booksList = (userBooks || []).map(ub => {
    const bookData = Array.isArray(ub.books) ? ub.books[0] : ub.books
    return {
      id: ub.id,
      title: bookData?.title || '未知书名',
      author: bookData?.author,
      cover_url: bookData?.cover_url,
      file_url: bookData?.file_url,
      upload_date: bookData?.created_at,
      reading_progress: ub.reading_progress,
      is_favorite: ub.is_favorite,
      last_read_at: ub.last_read_at
    }
  })

  return (
    <div className="h-screen">
      <ZenithBookshelf initialBooks={booksList} user={user} />
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
