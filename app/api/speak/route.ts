import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'edge'

/**
 * 使用 Gemini 2.0 Flash 生成语音
 */
export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return new Response('Missing text', { status: 400 })
    }

    console.log('🎤 生成语音:', text.substring(0, 50))

    // 检查 API Key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY 未配置')
      return new Response('API Key not configured', { status: 500 })
    }

    // 使用 Gemini 2.0 Flash 生成音频
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
    })

    // 目前Gemini 2.0 Flash的音频功能还在实验阶段
    // 暂时使用浏览器端的Web Speech API
    // 这个API只是返回文本，前端使用speechSynthesis
    
    console.log('ℹ️ Gemini原生音频功能暂不可用，返回文本给前端使用Web Speech API')

    // 返回文本，让前端使用浏览器TTS
    return new Response(
      JSON.stringify({ 
        text,
        useBrowserTTS: true 
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ 生成语音失败:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
