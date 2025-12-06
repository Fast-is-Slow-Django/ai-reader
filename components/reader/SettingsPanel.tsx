'use client'

import { X, Type, Sun, Moon, List, Move, Droplet } from 'lucide-react'

/**
 * 阅读器设置面板组件
 * 
 * 功能：
 * - 字号调整（滑块 50-200%）
 * - 主题切换（日间、夜间）
 * - 章节选择
 * 
 * Props:
 * - isOpen: 面板是否显示
 * - onClose: 关闭面板回调
 * - fontSize: 当前字号（50-200）
 * - onFontSizeChange: 字号变化回调
 * - theme: 当前主题（'light'/'dark'）
 * - onThemeChange: 主题变化回调
 * - chapters: 章节列表
 * - currentChapter: 当前章节索引
 * - onChapterChange: 章节变化回调
 */
export default function SettingsPanel({
  isOpen,
  onClose,
  fontSize,
  onFontSizeChange,
  theme,
  onThemeChange,
  chapters = [],
  currentChapter = 0,
  onChapterChange,
  buttonSize = 50,
  onButtonSizeChange,
  buttonOpacity = 70,
  onButtonOpacityChange,
}: {
  isOpen: boolean
  onClose: () => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  chapters?: Array<{ label: string; href: string }>
  currentChapter?: number
  onChapterChange?: (index: number) => void
  buttonSize?: number
  onButtonSizeChange?: (size: number) => void
  buttonOpacity?: number
  onButtonOpacityChange?: (opacity: number) => void
}) {
  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* 设置面板 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slide-up">
        {/* 拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">阅读设置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="关闭"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* 字号调整 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Type size={20} className="text-gray-600" />
                <h3 className="font-medium text-gray-900">字号大小</h3>
              </div>
              <span className="text-sm font-medium text-blue-600">{fontSize}%</span>
            </div>
            
            {/* 滑块 */}
            <div className="space-y-2">
              <input
                type="range"
                min="50"
                max="200"
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(fontSize - 50) / 1.5}%, #e5e7eb ${(fontSize - 50) / 1.5}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>50%</span>
                <span>100%</span>
                <span>150%</span>
                <span>200%</span>
              </div>
            </div>
          </div>

          {/* 按钮大小调整 */}
          {onButtonSizeChange && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Move size={20} className="text-gray-600" />
                  <h3 className="font-medium text-gray-900">按钮大小</h3>
                </div>
                <span className="text-sm font-medium text-blue-600">{buttonSize}</span>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={buttonSize}
                  onChange={(e) => onButtonSizeChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${buttonSize}%, #e5e7eb ${buttonSize}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>最小</span>
                  <span>中等</span>
                  <span>最大</span>
                </div>
              </div>
            </div>
          )}

          {/* 按钮透明度调整 */}
          {onButtonOpacityChange && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Droplet size={20} className="text-gray-600" />
                  <h3 className="font-medium text-gray-900">按钮透明度</h3>
                </div>
                <span className="text-sm font-medium text-blue-600">{buttonOpacity}%</span>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={buttonOpacity}
                  onChange={(e) => onButtonOpacityChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${buttonOpacity}%, #e5e7eb ${buttonOpacity}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>透明</span>
                  <span>半透明</span>
                  <span>不透明</span>
                </div>
              </div>
            </div>
          )}

          {/* 主题切换 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {theme === 'light' ? (
                <Sun size={20} className="text-gray-600" />
              ) : (
                <Moon size={20} className="text-gray-600" />
              )}
              <h3 className="font-medium text-gray-900">阅读主题</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 日间模式 */}
              <button
                onClick={() => onThemeChange('light')}
                className={`
                  flex flex-col items-center justify-center gap-3 py-6 rounded-xl border-2 transition-all
                  ${
                    theme === 'light'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${theme === 'light' ? 'bg-yellow-400' : 'bg-gray-200'}
                  `}
                >
                  <Sun
                    size={24}
                    className={theme === 'light' ? 'text-white' : 'text-gray-500'}
                  />
                </div>
                <span
                  className={`font-medium ${
                    theme === 'light' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  日间模式
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 bg-white border border-gray-300 rounded" />
                  <span>黑字白底</span>
                </div>
              </button>

              {/* 夜间模式 */}
              <button
                onClick={() => onThemeChange('dark')}
                className={`
                  flex flex-col items-center justify-center gap-3 py-6 rounded-xl border-2 transition-all
                  ${
                    theme === 'dark'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}
                  `}
                >
                  <Moon
                    size={24}
                    className={theme === 'dark' ? 'text-yellow-400' : 'text-gray-500'}
                  />
                </div>
                <span
                  className={`font-medium ${
                    theme === 'dark' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  夜间模式
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 bg-gray-800 border border-gray-700 rounded" />
                  <span>白字黑底</span>
                </div>
              </button>
            </div>
          </div>

          {/* 章节选择 */}
          {chapters.length > 0 && onChapterChange && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <List size={20} className="text-gray-600" />
                <h3 className="font-medium text-gray-900">章节目录</h3>
                <span className="text-xs text-gray-500">
                  ({chapters.length} 章)
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {chapters.map((chapter, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onChapterChange(index)
                      onClose()
                    }}
                    className={`
                      w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors
                      ${
                        index === currentChapter
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">
                        {chapter.label}
                      </span>
                      {index === currentChapter && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                          当前
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              💡 设置会立即生效，无需手动保存
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            完成
          </button>
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
