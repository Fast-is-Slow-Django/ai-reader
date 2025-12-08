import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import VocabularyClient from './VocabularyClient'

export default async function VocabularyPage() {
  // 创建 Supabase 客户端
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // 如果未登录，重定向到登录页
  if (userError || !user) {
    redirect('/login')
  }

  // 查询用户的词汇缓存
  const { data: vocabularies, error: vocabulariesError } = await supabase
    .from('vocabulary_cache')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  // 获取关联的书籍信息
  let booksMap: Record<string, any> = {}
  if (vocabularies && vocabularies.length > 0) {
    const bookIds = [...new Set(vocabularies.filter(v => v.book_id).map(v => v.book_id))]
    if (bookIds.length > 0) {
      const { data: books } = await supabase
        .from('books')
        .select('id, title, author')
        .in('id', bookIds)
      
      if (books) {
        books.forEach(book => {
          booksMap[book.id] = book
        })
      }
    }
  }

  if (vocabulariesError) {
    console.error('查询词汇失败:', vocabulariesError)
  }

  // 转换数据格式为客户端组件需要的格式
  const vocabularyList = (vocabularies || []).map(vocab => ({
    ...vocab,
    book_title: vocab.book_id && booksMap[vocab.book_id] ? booksMap[vocab.book_id].title : undefined,
    book_author: vocab.book_id && booksMap[vocab.book_id] ? booksMap[vocab.book_id].author : undefined,
  }))

  return (
    <VocabularyClient 
      initialVocabularies={vocabularyList} 
      user={user} 
    />
  )
}

/**
 * 页面元数据
 */
export const metadata = {
  title: 'Vocabulary List - iReader',
  description: '查看你的单词学习记录',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
