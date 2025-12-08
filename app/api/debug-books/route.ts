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

    // 显示每本书的详细信息，包括封面URL
    const results = (books || []).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author || null,
      cover_url: book.cover_url || null,
      file_url: book.file_url,
      metadata: book.metadata || null,
      created_at: book.created_at,
      has_cover: !!book.cover_url,
    }))

    return NextResponse.json({
      user: user.email,
      total: books?.length || 0,
      books: results,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
