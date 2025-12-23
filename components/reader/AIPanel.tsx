'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Volume2, Loader2, RefreshCw } from 'lucide-react'

/**
 * AI 解释面板 - i+1 纯英语教学模式
 * 
 * 功能：
 * - 自动调用 AI 生成简单英语解释
 * - 流式显示解释内容
 * - 朗读选中单词
 */
interface AIPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  context: string
  bookId?: string
}

export default function AIPanel({
  isOpen,
  onClose,
  selectedText,
  context,
  bookId,
}: AIPanelProps) {
  const [isSpeakingWord, setIsSpeakingWord] = useState(false)
  const [isSpeakingExplanation, setIsSpeakingExplanation] = useState(false)
  const [completion, setCompletion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // 追踪上一次的 isOpen 状态，用于检测面板从关闭变成打开
  const prevIsOpenRef = useRef(false)

  /**
   * 调用 AI 生成解释（独立函数，可复用）
   */
  const fetchExplanation = useCallback((forceRefresh = false) => {
    if (!selectedText) return

    console.log('🤖 调用 AI 解释', forceRefresh ? '(强制刷新)' : '')
    console.log('   目标词:', selectedText)
    console.log('   上下文:', context.substring(0, 100))
    
    setIsLoading(true)
    setError(null)
    setCompletion('')

    fetch('/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: selectedText,
        context,
        bookId,
        forceRefresh, // 添加强制刷新标记
      }),
    })
      .then(async (response) => {
        console.log('📥 收到响应，状态:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('📊 解析的数据:', data)
        console.log('📝 AI 返回的文本:', data.text)
        console.log('💾 是否来自缓存:', data.fromCache ? '是' : '否')
        
        setCompletion(data.text)
        setIsLoading(false)
        console.log('✅ 已设置 completion')
      })
      .catch((err) => {
        console.error('❌ AI 调用失败:', err)
        setError(err)
        setIsLoading(false)
      })
  }, [selectedText, context, bookId])

  /**
   * 自动触发 AI 解释
   * 当面板从关闭变成打开且有选中文本时
   */
  useEffect(() => {
    // 检测面板从关闭变成打开
    const wasJustOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = isOpen
    
    console.log('🔄 AIPanel useEffect 触发:', { 
      isOpen, 
      wasJustOpened, 
      selectedText: selectedText?.substring(0, 20),
      hasContext: !!context 
    })
    
    if (wasJustOpened && selectedText) {
      console.log('✅ 面板刚打开，触发 fetchExplanation')
      fetchExplanation()
    }
  }, [isOpen, selectedText, context, fetchExplanation])

  /**
   * 朗读单词 - 优先使用Gemini，降级到浏览器TTS
   */
  const handleSpeakWord = async () => {
    if (!selectedText) return

    // 停止当前朗读
    if (isSpeakingWord) {
      window.speechSynthesis.cancel()
      // 停止正在播放的音频
      const audioElements = document.querySelectorAll('audio')
      audioElements.forEach(audio => audio.pause())
      setIsSpeakingWord(false)
      return
    }

    setIsSpeakingWord(true)
    console.log('🔊 开始朗读单词:', selectedText)

    try {
      // 调用Gemini音频API（支持缓存）
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, bookId })
      })

      const contentType = response.headers.get('Content-Type')
      const cacheStatus = response.headers.get('X-Audio-Cache')
      
      // 检查是否返回音频
      if (contentType?.includes('audio')) {
        console.log(`✅ 使用Gemini音频 ${cacheStatus === 'HIT' ? '(来自缓存)' : '(新生成)'}`)
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        audio.onended = () => {
          setIsSpeakingWord(false)
          URL.revokeObjectURL(audioUrl)
          console.log('✅ Gemini音频播放完成')
        }
        
        audio.onerror = () => {
          setIsSpeakingWord(false)
          console.error('❌ 音频播放失败')
        }
        
        audio.play()
      } else {
        // 降级到浏览器TTS
        console.log('⚠️ 降级使用浏览器TTS')
        const utterance = new SpeechSynthesisUtterance(selectedText)
        utterance.lang = 'en-US'
        utterance.rate = 0.9
        utterance.pitch = 1.0
        
        utterance.onend = () => {
          setIsSpeakingWord(false)
          console.log('✅ 浏览器TTS完成')
        }
        
        utterance.onerror = () => {
          setIsSpeakingWord(false)
          console.error('❌ TTS失败')
        }
        
        window.speechSynthesis.speak(utterance)
      }
    } catch (error) {
      console.error('❌ 朗读失败:', error)
      setIsSpeakingWord(false)
    }
  }

  /**
   * 朗读AI解释 - 优先使用Gemini，降级到浏览器TTS
   */
  const handleSpeakExplanation = async () => {
    if (!completion) return

    // 停止当前朗读
    if (isSpeakingExplanation) {
      window.speechSynthesis.cancel()
      // 停止正在播放的音频
      const audioElements = document.querySelectorAll('audio')
      audioElements.forEach(audio => audio.pause())
      setIsSpeakingExplanation(false)
      return
    }

    setIsSpeakingExplanation(true)
    console.log('🔊 开始朗读解释')

    try {
      // 调用Gemini音频API（支持缓存）
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: completion, bookId })
      })

      const contentType = response.headers.get('Content-Type')
      const cacheStatus = response.headers.get('X-Audio-Cache')
      
      // 检查是否返回音频
      if (contentType?.includes('audio')) {
        console.log(`✅ 使用Gemini音频 ${cacheStatus === 'HIT' ? '(来自缓存)' : '(新生成)'}`)
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        audio.onended = () => {
          setIsSpeakingExplanation(false)
          URL.revokeObjectURL(audioUrl)
          console.log('✅ Gemini音频播放完成')
        }
        
        audio.onerror = () => {
          setIsSpeakingExplanation(false)
          console.error('❌ 音频播放失败')
        }
        
        audio.play()
      } else {
        // 降级到浏览器TTS
        console.log('⚠️ 降级使用浏览器TTS')
        const utterance = new SpeechSynthesisUtterance(completion)
        utterance.lang = 'en-US'
        utterance.rate = 0.9
        utterance.pitch = 1.0
        
        utterance.onend = () => {
          setIsSpeakingExplanation(false)
          console.log('✅ 浏览器TTS完成')
        }
        
        utterance.onerror = () => {
          setIsSpeakingExplanation(false)
          console.error('❌ TTS失败')
        }
        
        window.speechSynthesis.speak(utterance)
      }
    } catch (error) {
      console.error('❌ 朗读失败:', error)
      setIsSpeakingExplanation(false)
    }
  }

  /**
   * 清理：组件卸载时停止所有朗读
   */
  useEffect(() => {
    return () => {
      if (isSpeakingWord || isSpeakingExplanation) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSpeakingWord, isSpeakingExplanation])

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* AI 面板 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[50vh] overflow-y-auto animate-slide-up">
        {/* 拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">🎓</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">i+1 Assistant</h2>
              <p className="text-xs text-gray-500">Simple English Explanation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-6 space-y-6">
          {/* 选中的文本 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Selected Text</h3>
              <button
                onClick={handleSpeakWord}
                disabled={!selectedText}
                className={`
                  p-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs
                  ${isSpeakingWord 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-600'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={isSpeakingWord ? '停止朗读' : '朗读单词'}
              >
                <Volume2 size={16} className={isSpeakingWord ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">
                  {isSpeakingWord ? '停止' : '朗读'}
                </span>
              </button>
            </div>
            <div className="bg-gray-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <p className="text-lg font-medium text-gray-900">
                "{selectedText}"
              </p>
            </div>
          </div>

          {/* AI 解释内容 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">AI Explanation</h3>
              <div className="flex items-center gap-2">
                {/* 刷新按钮 */}
                <button
                  onClick={() => fetchExplanation(true)}
                  disabled={isLoading}
                  className="p-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs bg-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="重新生成解释"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">刷新</span>
                </button>
                
                {/* 朗读按钮 */}
                {completion && (
                  <button
                    onClick={handleSpeakExplanation}
                    disabled={!completion || isLoading}
                    className={`
                      p-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs
                      ${isSpeakingExplanation 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-600'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    title={isSpeakingExplanation ? '停止朗读' : '朗读解释'}
                  >
                    <Volume2 size={16} className={isSpeakingExplanation ? 'animate-pulse' : ''} />
                    <span className="hidden sm:inline">
                      {isSpeakingExplanation ? '停止' : '朗读'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            
            {/* 加载状态 */}
            {isLoading && !completion && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
                <span className="text-gray-600">AI is thinking...</span>
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">
                  ❌ Failed to generate explanation. Please try again.
                </p>
              </div>
            )}

            {/* AI 生成的内容（流式显示） */}
            {completion && (
              <div className="prose prose-sm max-w-none">
                <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {completion}
                </div>
                
                {/* 流式加载指示器 */}
                {isLoading && (
                  <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
                )}
              </div>
            )}

            {/* 提示信息 */}
            {!completion && !isLoading && !error && (
              <div className="text-center py-8 text-gray-500">
                <p>Select some text to get an explanation</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            💡 Tip: Click 🔊 to listen to word or explanation
          </p>
        </div>
      </div>

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
