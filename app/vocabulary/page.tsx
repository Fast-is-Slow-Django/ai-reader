import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Calendar, Hash, FileText } from 'lucide-react'

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

  const vocabularyList = vocabularies || []

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：返回按钮和标题 */}
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
                  <BookOpen className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Vocabulary List</h1>
                  <p className="text-sm text-gray-600">共 {vocabularyList.length} 个单词</p>
                </div>
              </div>
            </div>

            {/* 右侧：用户信息 */}
            <div className="text-right">
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 词汇列表 */}
        <div className="space-y-4">
          {vocabularyList.map((vocab) => (
            <div 
              key={vocab.id} 
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100"
            >
              {/* 单词和书籍信息 */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {vocab.selected_text}
                  </h3>
                  {vocab.book_id && booksMap[vocab.book_id] && (
                    <p className="text-sm text-gray-500">
                      来自《{booksMap[vocab.book_id].title}》
                      {booksMap[vocab.book_id].author && ` - ${booksMap[vocab.book_id].author}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Hash size={12} />
                    <span>{vocab.accessed_count || 1} 次</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>
                      {new Date(vocab.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 上下文 */}
              {vocab.context && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 italic">
                    ...{vocab.context}...
                  </p>
                </div>
              )}

              {/* AI 解释 */}
              {vocab.ai_explanation && (
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {vocab.ai_explanation}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 空状态提示 */}
        {vocabularyList.length === 0 && (
          <div className="mt-16 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-4">
              <FileText className="text-gray-400" size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              还没有保存的单词
            </h3>
            <p className="text-gray-600 mb-6">
              在阅读时选择单词查看AI解释，它们会自动保存到这里
            </p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={16} />
              返回书架
            </Link>
          </div>
        )}
      </main>
    </div>
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
