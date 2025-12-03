# 两点选词功能集成示例

如何在 AI-Reader 中使用两点选词功能。

## 📝 基础使用

### **1. 在阅读器页面中集成**

```typescript
// app/read/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MobileReader from '@/components/reader/MobileReader'

export default async function ReadPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()
  
  // 验证用户
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login?redirectTo=/read/' + id)
  }

  // 获取书籍信息
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, file_url, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
    
  if (bookError || !book) {
    redirect('/dashboard')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <MobileReader 
        url={book.file_url} 
        title={book.title} 
        bookId={book.id}
        // 暂时只输出到控制台
        onSelection={(data) => {
          console.log('选中文本:', data.text)
          console.log('上下文:', data.context)
          console.log('位置:', data.cfi)
        }}
      />
    </div>
  )
}
```

## 🤖 AI 集成示例

### **2. 创建 AI API 路由**

```typescript
// app/api/ai/explain/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 验证用户
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    // 获取请求数据
    const { text, context, bookId } = await request.json()

    if (!text || !context) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      )
    }

    // TODO: 调用 OpenAI/Claude API
    // 这里使用模拟响应
    const explanation = await generateExplanation(text, context)

    // 保存到笔记（可选）
    if (bookId) {
      await supabase.from('notes').insert({
        book_id: bookId,
        user_id: user.id,
        content: text,
        note: explanation,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      explanation,
    })
  } catch (error) {
    console.error('AI 解释失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

async function generateExplanation(text: string, context: string): Promise<string> {
  // TODO: 实际调用 AI API
  // 例如：OpenAI GPT-4
  
  // 模拟 AI 响应
  return `这段文字 "${text}" 的意思是...（这里应该是 AI 生成的解释）`
}
```

### **3. 创建客户端解释面板**

```typescript
// components/reader/ExplanationPanel.tsx
'use client'

import { X, Loader2 } from 'lucide-react'

interface ExplanationPanelProps {
  isOpen: boolean
  onClose: () => void
  text: string
  explanation: string
  isLoading: boolean
}

export default function ExplanationPanel({
  isOpen,
  onClose,
  text,
  explanation,
  isLoading,
}: ExplanationPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* 解释面板 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
        {/* 拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI 解释</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-6 space-y-4">
          {/* 选中的文本 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">选中内容</h3>
            <p className="text-base text-gray-900 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              {text}
            </p>
          </div>

          {/* AI 解释 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">AI 解释</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="ml-3 text-gray-600">AI 正在思考...</span>
              </div>
            ) : (
              <div className="text-base text-gray-700 leading-relaxed">
                {explanation}
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
          <button
            className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            保存笔记
          </button>
        </div>
      </div>
    </>
  )
}
```

### **4. 完整集成到阅读器页面**

```typescript
// app/read/[id]/page.tsx（客户端部分）
'use client'

import { useState } from 'react'
import MobileReader from '@/components/reader/MobileReader'
import ExplanationPanel from '@/components/reader/ExplanationPanel'

interface SelectionData {
  text: string
  context: string
  cfi: string
}

export default function ReaderClient({
  url,
  title,
  bookId,
}: {
  url: string
  title: string
  bookId: string
}) {
  const [isExplaining, setIsExplaining] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSelection = async (data: SelectionData) => {
    console.log('📝 用户选中文本:', data.text)
    
    // 保存选中的文本
    setSelectedText(data.text)
    
    // 显示加载状态
    setIsExplaining(true)
    setIsLoading(true)
    
    try {
      // 调用 AI API
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: data.text,
          context: data.context,
          bookId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setExplanation(result.explanation)
      } else {
        setExplanation('AI 解释失败，请重试')
      }
    } catch (error) {
      console.error('调用 AI 失败:', error)
      setExplanation('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <MobileReader
        url={url}
        title={title}
        bookId={bookId}
        onSelection={handleSelection}
      />

      <ExplanationPanel
        isOpen={isExplaining}
        onClose={() => setIsExplaining(false)}
        text={selectedText}
        explanation={explanation}
        isLoading={isLoading}
      />
    </>
  )
}
```

---

## 🧪 测试步骤

### **1. 基础测试**

```bash
# 1. 启动开发服务器
npm run dev

# 2. 打开浏览器
# http://localhost:3000

# 3. 登录并上传一本书

# 4. 打开书籍开始阅读

# 5. 测试两点选词
#    - 点击任意文字（应该显示黄色高亮）
#    - 再点击另一处文字（应该显示绿色高亮）
#    - 打开浏览器控制台查看输出
```

### **2. 查看控制台输出**

```javascript
// 应该看到类似输出：
选中文本: artificial intelligence
上下文: ...the development of artificial intelligence has transformed...
位置: epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:50)
```

### **3. 测试 AI 集成**

```bash
# 1. 实现 AI API（见上面示例）

# 2. 测试选词
#    - 两次点击选择文本
#    - 应该弹出解释面板
#    - 显示 "AI 正在思考..."
#    - 显示 AI 生成的解释

# 3. 测试保存笔记
#    - 点击 "保存笔记" 按钮
#    - 检查数据库 notes 表
```

---

## 💡 最佳实践

### **1. 错误处理**

```typescript
const handleSelection = async (data: SelectionData) => {
  try {
    setIsLoading(true)
    
    const response = await fetch('/api/ai/explain', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('API 请求失败')
    }

    const result = await response.json()
    setExplanation(result.explanation)
  } catch (error) {
    console.error('AI 解释失败:', error)
    setExplanation('抱歉，AI 解释失败，请重试')
  } finally {
    setIsLoading(false)
  }
}
```

### **2. 加载状态**

```typescript
// 显示友好的加载提示
{isLoading && (
  <div className="flex items-center gap-3">
    <Loader2 className="animate-spin" />
    <span>AI 正在分析...</span>
  </div>
)}
```

### **3. 用户反馈**

```typescript
// 选择成功后给予视觉反馈
onSelection={(data) => {
  // 显示 toast 提示
  toast.success('已选中文本，正在生成解释...')
  
  // 调用 AI
  handleAIExplain(data)
}
```

---

## 📊 数据流程图

```
用户阅读
  ↓
点击文字（第一次）
  ↓
显示黄色高亮
  ↓
点击文字（第二次）
  ↓
提取文本 + 上下文
  ↓
触发 onSelection 回调
  ↓
调用 AI API
  ↓
显示解释面板
  ↓
保存到笔记（可选）
```

---

## ✅ 功能检查清单

- [ ] MobileReader 组件正确导入
- [ ] onSelection 回调函数已定义
- [ ] 能够接收 SelectionData 数据
- [ ] AI API 路由已创建
- [ ] 解释面板 UI 已实现
- [ ] 加载状态正常显示
- [ ] 错误处理完善
- [ ] 笔记保存功能正常
- [ ] 移动端适配良好

---

**准备就绪！** 🚀

现在你可以：
1. 测试两点选词基础功能
2. 集成 AI API
3. 添加解释面板 UI
4. 实现笔记保存

需要帮助请查看相关文档！
