export const runtime = 'edge'

/**
 * 使用 Gemini 2.0 Flash 原生音频生成
 */
export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return new Response('Missing text', { status: 400 })
    }

    console.log('🎤 使用Gemini生成语音:', text.substring(0, 50))

    // 检查 API Key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY 未配置')
      return new Response('API Key not configured', { status: 500 })
    }

    // 使用Gemini REST API生成音频
    // Gemini 2.0 支持通过modalities参数生成音频
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: text
            }]
          }],
          generationConfig: {
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: 'audio/mp3',
            responseModalities: ['AUDIO']
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini API错误:', errorText)
      
      // 降级：返回文本让前端用浏览器TTS
      return new Response(
        JSON.stringify({ 
          text,
          useBrowserTTS: true,
          error: 'Gemini audio not available, using browser TTS'
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    console.log('📊 Gemini响应:', data)

    // 检查是否有音频数据
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const content = data.candidates[0].content
      
      // 查找音频部分
      const audioPart = content.parts?.find((part: any) => part.inlineData?.mimeType === 'audio/mp3')
      
      if (audioPart && audioPart.inlineData?.data) {
        console.log('✅ 获取到Gemini音频数据')
        
        // Base64解码音频 (Edge runtime兼容)
        const audioBase64 = audioPart.inlineData.data
        const binaryString = atob(audioBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // 返回音频流
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
          },
        })
      }
    }

    console.warn('⚠️ 未找到音频数据，降级使用浏览器TTS')
    
    // 降级方案
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
