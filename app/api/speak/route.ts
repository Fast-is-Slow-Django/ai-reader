import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'

/**
 * 使用 Gemini 2.5 Flash TTS 生成高质量语音
 * 支持音频缓存，减少API调用
 */
export async function POST(req: Request) {
  try {
    const { text, bookId } = await req.json()

    if (!text) {
      return new Response('Missing text', { status: 400 })
    }

    console.log('🎤 TTS请求:', text.substring(0, 50), '| bookId:', bookId || '(未提供)')

    // 验证用户身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ 用户未认证')
      return new Response(
        JSON.stringify({ 
          text,
          useBrowserTTS: true,
          error: 'Unauthorized'
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 🔍 查询音频缓存
    if (bookId) {
      console.log('🔍 查询音频缓存:', { userId: user.id, text, bookId })
      
      const { data: cachedData, error: cacheError } = await supabase
        .from('vocabulary_cache')
        .select('audio_data, audio_mime_type')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('selected_text', text)
        .not('audio_data', 'is', null)
        .maybeSingle()

      if (cachedData && cachedData.audio_data) {
        console.log('✅ 找到音频缓存，直接返回')
        
        // Base64解码音频
        const binaryString = atob(cachedData.audio_data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type': cachedData.audio_mime_type || 'audio/wav',
            'X-Audio-Cache': 'HIT',
          },
        })
      } else {
        console.log('ℹ️ 未找到音频缓存，将调用 Gemini TTS')
      }
    }

    console.log('🎤 使用Gemini 2.5 Flash Preview TTS生成语音:', text.substring(0, 50))

    // 检查 API Key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY 未配置')
      
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

    // 调用 Gemini 2.5 Flash Preview TTS API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
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
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Kore'  // 英语女声
                }
              }
            }
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini TTS API错误:', errorText)
      
      // 降级：返回文本让前端用浏览器TTS
      return new Response(
        JSON.stringify({ 
          text,
          useBrowserTTS: true,
          error: 'Gemini TTS error, using browser TTS'
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    console.log('📊 Gemini完整响应:', JSON.stringify(data, null, 2))
    console.log('📊 响应数据类型:', typeof data)
    console.log('📊 是否有candidates:', !!data.candidates)
    if (data.candidates) {
      console.log('📊 candidates长度:', data.candidates.length)
      console.log('📊 第一个candidate:', JSON.stringify(data.candidates[0], null, 2))
    }
    
    // 按照官方SDK示例解析：response.candidates[0].content.parts[0].inline_data.data
    if (data.candidates && 
        data.candidates[0] && 
        data.candidates[0].content && 
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].inlineData) {
      
      const audioData = data.candidates[0].content.parts[0].inlineData.data
      
      if (audioData) {
        console.log('✅ 获取到Gemini TTS音频数据 (PCM格式)')
        
        // Base64解码音频 (Edge runtime兼容)
        const binaryString = atob(audioData)
        const pcmBytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          pcmBytes[i] = binaryString.charCodeAt(i)
        }
        
        // 构建WAV文件头 (PCM 24000Hz, 16bit, mono)
        const sampleRate = 24000
        const numChannels = 1
        const bitsPerSample = 16
        const byteRate = sampleRate * numChannels * bitsPerSample / 8
        const blockAlign = numChannels * bitsPerSample / 8
        const dataSize = pcmBytes.length
        
        // WAV文件头 (44字节)
        const wavHeader = new Uint8Array(44)
        const view = new DataView(wavHeader.buffer)
        
        // "RIFF" chunk descriptor
        view.setUint32(0, 0x52494646, false) // "RIFF"
        view.setUint32(4, 36 + dataSize, true) // file size - 8
        view.setUint32(8, 0x57415645, false) // "WAVE"
        
        // "fmt " sub-chunk
        view.setUint32(12, 0x666d7420, false) // "fmt "
        view.setUint32(16, 16, true) // sub-chunk size
        view.setUint16(20, 1, true) // audio format (1 = PCM)
        view.setUint16(22, numChannels, true) // number of channels
        view.setUint32(24, sampleRate, true) // sample rate
        view.setUint32(28, byteRate, true) // byte rate
        view.setUint16(32, blockAlign, true) // block align
        view.setUint16(34, bitsPerSample, true) // bits per sample
        
        // "data" sub-chunk
        view.setUint32(36, 0x64617461, false) // "data"
        view.setUint32(40, dataSize, true) // data size
        
        // 合并WAV头和PCM数据
        const wavFile = new Uint8Array(44 + dataSize)
        wavFile.set(wavHeader, 0)
        wavFile.set(pcmBytes, 44)
        
        // 💾 保存音频到缓存
        if (bookId && user) {
          console.log('💾 保存音频到缓存')
          
          // 将WAV文件转为Base64
          let wavBase64 = ''
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
          const bytes = wavFile
          const len = bytes.length
          
          for (let i = 0; i < len; i += 3) {
            const byte1 = bytes[i]
            const byte2 = i + 1 < len ? bytes[i + 1] : 0
            const byte3 = i + 2 < len ? bytes[i + 2] : 0
            
            const encoded1 = byte1 >> 2
            const encoded2 = ((byte1 & 3) << 4) | (byte2 >> 4)
            const encoded3 = ((byte2 & 15) << 2) | (byte3 >> 6)
            const encoded4 = byte3 & 63
            
            wavBase64 += chars[encoded1] + chars[encoded2]
            wavBase64 += i + 1 < len ? chars[encoded3] : '='
            wavBase64 += i + 2 < len ? chars[encoded4] : '='
          }
          
          // 更新数据库中对应的记录
          const { error: updateError } = await supabase
            .from('vocabulary_cache')
            .update({
              audio_data: wavBase64,
              audio_mime_type: 'audio/wav',
            })
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .eq('selected_text', text)
          
          if (updateError) {
            console.error('❌ 保存音频缓存失败:', updateError)
          } else {
            console.log('✅ 音频已保存到缓存')
          }
        }
        
        // 返回WAV音频流
        return new Response(wavFile, {
          status: 200,
          headers: {
            'Content-Type': 'audio/wav',
            'X-Audio-Cache': 'MISS',
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
