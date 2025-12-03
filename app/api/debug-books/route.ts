import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 调试 API：查看用户的所有书籍和文件 URL
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取用户的所有书籍
    const { data: books, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 测试每个文件 URL
    const results = await Promise.all(
      (books || []).map(async (book) => {
        try {
          const response = await fetch(book.file_url, { method: 'HEAD' })
          return {
            id: book.id,
            title: book.title,
            file_url: book.file_url,
            status: response.status,
            accessible: response.ok,
            cors: response.headers.get('access-control-allow-origin'),
          }
        } catch (err: any) {
          return {
            id: book.id,
            title: book.title,
            file_url: book.file_url,
            status: 'error',
            accessible: false,
            error: err.message,
          }
        }
      })
    )

    return NextResponse.json({
      user: user.email,
      total: books?.length || 0,
      books: results,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
