import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'

/**
 * AI 解释 API - i+1 纯英语教学模式
 * 
 * 使用 Google Gemini 生成简单英语解释
 */
export async function POST(req: Request) {
  try {
    // 1. 验证用户身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 2. 解析请求体
    const { text, context, bookId, forceRefresh } = await req.json()

    if (!text || !context) {
      return new Response('Missing required fields: text or context', { status: 400 })
    }

    console.log('📝 AI 解释请求 (Gemini)')
    console.log('   目标词:', text)
    console.log('   上下文:', context.substring(0, 100) + '...')
    console.log('   书籍ID:', bookId || '(未提供)')
    console.log('   强制刷新:', forceRefresh ? '是' : '否')

    // 3. 检查词汇缓存（强制刷新时跳过）
    if (bookId && !forceRefresh) {
      // 生成上下文哈希
      const contextData = `${text}|${context}`
      let hash = 0
      for (let i = 0; i < contextData.length; i++) {
        const char = contextData.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      const contextHash = hash.toString(36)
      
      console.log('🔍 查询缓存:', { text, contextHash, bookId })

      // 查询缓存
      const { data: cachedData, error: cacheError } = await supabase
        .from('vocabulary_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('context_hash', contextHash)
        .maybeSingle()  // 使用 maybeSingle 代替 single，避免找不到记录时报错

      if (cacheError) {
        console.error('❌ 查询缓存失败:', cacheError)
      } else if (cachedData) {
        console.log('✅ 找到缓存，直接返回', { 
          id: cachedData.id, 
          accessed_count: cachedData.accessed_count 
        })
        
        // 更新访问统计
        await supabase
          .from('vocabulary_cache')
          .update({
            accessed_count: (cachedData.accessed_count || 0) + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', cachedData.id)

        return new Response(
          JSON.stringify({ text: cachedData.ai_explanation, fromCache: true }), 
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      } else {
        console.log('ℹ️ 未找到缓存，调用 AI')
      }
    }

    // 4. 检查并显式传递 API 密钥
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY 未配置')
      return new Response('API Key not configured', { status: 500 })
    }
    console.log('✅ API Key 已找到，长度:', apiKey.length)

    // 4. 使用 Google Generative AI SDK
    let finalText = ''
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        systemInstruction: `You are a language teaching expert specializing in the "i+1" (Comprehensible Input) method.
Your task is to explain the target word or phrase to a learner using SIMPLE English.

Rules:
1. Analyze the target word's meaning based on the provided **Context**.
2. Definition must be in simple, easy-to-understand English (CEFR A2/B1 level).
3. Generate 3 example sentences. The first example should be relevant to the context/theme if possible.
4. STRICTLY follow this output format:

[Target Word] means [Simple Definition].

Examples:

[Example Sentence 1]

[Example Sentence 2]

[Example Sentence 3]`
      })

      const prompt = `Context: "${context}"\n\nTarget Word: "${text}"`
      
      console.log('🚀 开始生成...')
      const result = await model.generateContent(prompt)
      const response = result.response
      finalText = response.text()
      
      console.log('✅ AI 生成完成')
      console.log('📝 生成的文本:', finalText)
      console.log('📊 使用统计:', response.usageMetadata)
    } catch (geminiError: any) {
      console.error('❌ Gemini API 调用失败:', geminiError)
      console.error('错误类型:', geminiError?.name)
      console.error('错误信息:', geminiError?.message)
      console.error('错误详情:', JSON.stringify(geminiError?.errorDetails || {}))
      
      // 返回更具体的错误信息
      if (geminiError?.message?.includes('API key')) {
        return new Response(
          JSON.stringify({ 
            error: 'API Key Error',
            message: 'Google AI API key is invalid or expired'
          }), 
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      // 重新抛出错误让外层catch处理
      throw geminiError
    }

    // 5. 保存到词汇缓存
    if (bookId) {
      try {
        // 生成上下文哈希
        const contextData = `${text}|${context}`
        let hash = 0
        for (let i = 0; i < contextData.length; i++) {
          const char = contextData.charCodeAt(i)
          hash = ((hash << 5) - hash) + char
          hash = hash & hash
        }
        const contextHash = hash.toString(36)

        if (forceRefresh) {
          // 强制刷新：先尝试删除旧记录，再插入新记录
          console.log('🔄 更新缓存（强制刷新）')
          
          // 先删除旧记录（忽略删除错误，因为记录可能不存在）
          const { error: deleteError } = await supabase
            .from('vocabulary_cache')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .eq('context_hash', contextHash)
          
          if (deleteError) {
            console.log('⚠️ 删除旧缓存记录时出现问题（可忽略）:', deleteError.message)
          }
          
          // 插入新记录
          const { error: insertError } = await supabase
            .from('vocabulary_cache')
            .insert({
              user_id: user.id,
              book_id: bookId,
              selected_text: text,
              context,
              context_hash: contextHash,
              ai_explanation: finalText,
              created_at: new Date().toISOString(),
              accessed_count: 1,
              last_accessed_at: new Date().toISOString(),
            })
          
          if (insertError) {
            console.error('❌ 保存缓存失败:', insertError)
            // 继续执行，不影响返回AI结果
          } else {
            console.log('✅ 已更新缓存（强制刷新）')
          }
        } else {
          // 正常保存：只插入新记录
          const { error: insertError } = await supabase
            .from('vocabulary_cache')
            .insert({
              user_id: user.id,
              book_id: bookId,
              selected_text: text,
              context,
              context_hash: contextHash,
              ai_explanation: finalText,
              created_at: new Date().toISOString(),
              accessed_count: 1,
              last_accessed_at: new Date().toISOString(),
            })
          
          if (insertError) {
            // 如果是重复键错误，忽略（说明已有缓存）
            if (insertError.code === '23505') {
              console.log('⚠️ 缓存已存在，跳过保存')
            } else {
              console.error('❌ 保存缓存失败:', insertError)
            }
            // 继续执行，不影响返回AI结果
          } else {
            console.log('✅ 已保存到词汇缓存')
          }
        }
      } catch (cacheError) {
        // 缓存操作失败不应影响主功能
        console.error('⚠️ 缓存操作失败，但不影响AI解释:', cacheError)
      }
    }

    // 6. 返回 JSON 响应
    return new Response(JSON.stringify({ text: finalText, fromCache: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('❌ AI 解释失败:', error)
    console.error('错误详情:', error instanceof Error ? error.message : String(error))
    console.error('错误堆栈:', error instanceof Error ? error.stack : '')
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error)
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
