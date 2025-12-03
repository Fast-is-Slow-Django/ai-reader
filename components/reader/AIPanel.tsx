'use client'

import { useEffect, useState } from 'react'
import { X, Volume2, Loader2 } from 'lucide-react'

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
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [completion, setCompletion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * 自动触发 AI 解释
   * 当面板打开且有选中文本时
   */
  useEffect(() => {
    if (isOpen && selectedText) {
      console.log('🤖 自动触发 AI 解释')
      console.log('   目标词:', selectedText)
      console.log('   上下文:', context.substring(0, 100))
      
      // 每次打开都重置状态并调用 AI
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
    }
  }, [isOpen, selectedText, context]) // 当文本或上下文变化时重新调用

  /**
   * 朗读功能 - 使用 Web Speech API
   * 只朗读选中的单词/短语
   */
  const handleSpeak = () => {
    if (!selectedText) return

    // 停止当前朗读
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    try {
      // 创建语音合成实例
      const utterance = new SpeechSynthesisUtterance(selectedText)
      
      // 设置语言为美式英语
      utterance.lang = 'en-US'
      
      // 设置语速和音调
      utterance.rate = 0.9 // 稍慢，便于学习
      utterance.pitch = 1.0
      
      // 监听事件
      utterance.onstart = () => {
        setIsSpeaking(true)
        console.log('🔊 开始朗读:', selectedText)
      }
      
      utterance.onend = () => {
        setIsSpeaking(false)
        console.log('✅ 朗读完成')
      }
      
      utterance.onerror = (event) => {
        setIsSpeaking(false)
        console.error('❌ 朗读失败:', event.error)
      }
      
      // 开始朗读
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('❌ 朗读功能不可用:', error)
      setIsSpeaking(false)
    }
  }

  /**
   * 清理：组件卸载时停止朗读
   */
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSpeaking])

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

          <div className="flex items-center gap-2">
            {/* 朗读按钮 */}
            <button
              onClick={handleSpeak}
              disabled={!selectedText}
              className={`
                p-2 rounded-full transition-all
                ${isSpeaking 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title={isSpeaking ? '停止朗读' : '朗读单词'}
            >
              <Volume2 size={20} className={isSpeaking ? 'animate-pulse' : ''} />
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="关闭"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-6 space-y-6">
          {/* 选中的文本 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Selected Text</h3>
            <div className="bg-gray-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <p className="text-lg font-medium text-gray-900">
                "{selectedText}"
              </p>
            </div>
          </div>

          {/* AI 解释内容 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">AI Explanation</h3>
            
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
            💡 Tip: Click the speaker icon to hear the pronunciation
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
