import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DirectEpubReader from '@/components/reader/DirectEpubReader'

/**
 * 阅读器页面 - Server Component
 * 
 * 路由：/read/[id]
 * 功能：
 * - 验证用户权限
 * - 获取书籍信息
 * - 渲染阅读器组件
 */
export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 1. 获取路由参数
  const { id } = await params

  // 2. 创建 Supabase 客户端
  const supabase = await createClient()

  // 3. 验证用户登录
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    // 未登录，重定向到登录页
    redirect('/login?redirectTo=/read/' + id)
  }

  // 4. 查询书籍信息
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, file_url, user_id')
    .eq('id', id)
    .eq('user_id', user.id) // 确保只能访问自己的书籍
    .single()

  // 5. 处理查询错误或书籍不存在
  if (bookError || !book) {
    console.error('查询书籍失败:', bookError)
    // 书籍不存在或无权限访问，重定向到书架
    redirect('/dashboard')
  }

  // 6. 验证 file_url
  if (!book.file_url) {
    console.error('书籍文件链接缺失:', book.id)
    redirect('/dashboard')
  }

  // 7. 渲染阅读器组件
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 阅读器组件 */}
      <DirectEpubReader
        url={book.file_url}
        title={book.title}
        bookId={book.id}
      />
    </div>
  )
}

/**
 * 页面配置
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 生成页面元数据
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // 获取书籍标题用于页面标题
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        title: '阅读器 - AI-Reader',
      }
    }

    const { data: book } = await supabase
      .from('books')
      .select('title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (book) {
      return {
        title: `${book.title} - AI-Reader`,
        description: `正在阅读《${book.title}》`,
      }
    }
  } catch (error) {
    console.error('生成元数据失败:', error)
  }

  return {
    title: '阅读器 - AI-Reader',
  }
}
