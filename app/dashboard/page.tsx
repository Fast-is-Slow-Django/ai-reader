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

  // 转换数据格式（适配新界面）
  const booksList = (books || []).map(book => ({
    id: book.id,
    title: book.title || '未知书名',
    author: book.author,
    cover_url: book.cover_url,
    file_url: book.file_url,
    upload_date: book.created_at,
    reading_progress: book.reading_progress,
    is_favorite: book.is_favorite || false,
    last_read_at: book.last_read_at
  }))

  return <ZenithBookshelf initialBooks={booksList} user={user} />
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
  title: '我的书架 - iReader',
  description: '管理和阅读你的电子书收藏',
}
