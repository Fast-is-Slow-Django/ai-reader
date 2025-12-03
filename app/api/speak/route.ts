export const runtime = 'edge'

/**
 * 使用 Google Cloud Text-to-Speech API 生成高质量语音
 */
export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return new Response('Missing text', { status: 400 })
    }

    console.log('🎤 使用Google Cloud TTS生成语音:', text.substring(0, 50))

    // 检查 Google Cloud TTS API Key
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('❌ Google Cloud API Key 未配置')
      
      // 降级：返回文本让前端用浏览器TTS
      return new Response(
        JSON.stringify({ 
          text,
          useBrowserTTS: true,
          error: 'API Key not configured'
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 调用Google Cloud Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Neural2-C', // 高质量Neural2女声
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9, // 稍慢，便于学习
            pitch: 0,
            volumeGainDb: 0,
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Google Cloud TTS API错误:', errorText)
      
      // 降级：返回文本让前端用浏览器TTS
      return new Response(
        JSON.stringify({ 
          text,
          useBrowserTTS: true,
          error: 'TTS API error, using browser TTS'
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    
    // 检查是否有音频数据
    if (data.audioContent) {
      console.log('✅ 获取到Google Cloud TTS音频数据')
      
      // Base64解码音频 (Edge runtime兼容)
      const audioBase64 = data.audioContent
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
