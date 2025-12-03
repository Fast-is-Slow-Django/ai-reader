# AI 功能设置指南

完整的 AI 解释功能设置步骤。

## 📦 安装依赖

### **1. 安装 Vercel AI SDK**

```bash
npm install ai @ai-sdk/openai
```

**说明：**
- `ai` - Vercel AI SDK 核心库
- `@ai-sdk/openai` - OpenAI 提供商

### **2. 配置环境变量**

在 `.env.local` 中添加：

```env
# OpenAI API Key
OPENAI_API_KEY=sk-...your-api-key...

# Supabase (已有)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**获取 OpenAI API Key：**
1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 复制并粘贴到 `.env.local`

---

## 🔧 集成 AI 面板

### **修改 MobileReader.tsx**

```typescript
// components/reader/MobileReader.tsx
'use client'

import { useState } from 'react'
import AIPanel from './AIPanel'

export default function MobileReader({
  url,
  title,
  bookId,
  onSelection,
}: {
  url: string
  title: string
  bookId: string
  onSelection?: (data: SelectionData) => void
}) {
  // AI 面板状态
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [contextText, setContextText] = useState('')

  // ... 其他代码 ...

  /**
   * 处理第二次点击（在 handleSecondClick 中）
   */
  const handleSecondClick = useCallback((endCfi: string, rendition: Rendition) => {
    // ... 现有代码 ...

    // 提取文本和上下文
    const { text, context } = getTextContext(rendition, rangeCfi)

    if (!text || text.length === 0) {
      console.warn('⚠️ 未选中任何文本')
      resetSelection(rendition)
      return
    }

    // 保存选中的文本和上下文
    setSelectedText(text)
    setContextText(context)

    // 打开 AI 面板
    setIsAIPanelOpen(true)

    // 如果有外部回调，也触发它
    if (onSelection) {
      onSelection({ text, context, cfi: rangeCfi })
    }

    // 不再自动重置状态，等用户关闭面板后再重置
  }, [getTextContext, onSelection])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 阅读器 UI */}
      {/* ... */}

      {/* AI 解释面板 */}
      <AIPanel
        isOpen={isAIPanelOpen}
        onClose={() => {
          setIsAIPanelOpen(false)
          // 关闭面板后重置选择状态
          if (renditionRef.current) {
            setTimeout(() => {
              resetSelection(renditionRef.current!)
            }, 300)
          }
        }}
        selectedText={selectedText}
        context={contextText}
      />
    </div>
  )
}
```

---

## 🧪 测试步骤

### **1. 启动开发服务器**

```bash
npm run dev
```

### **2. 测试流程**

1. **登录并打开一本英文书籍**
   
2. **选择文本**
   - 点击一个单词/短语（第一次点击）
   - 点击结束位置（第二次点击）
   
3. **查看 AI 面板**
   - 应该自动弹出
   - 显示 "AI is thinking..."
   - 流式显示解释内容
   
4. **测试朗读功能**
   - 点击小喇叭图标 🔊
   - 应该听到英文发音
   - 再次点击停止朗读

### **3. 检查控制台**

```
🤖 自动触发 AI 解释
   目标词: artificial intelligence
   上下文长度: 180
📝 AI 解释请求
   目标词: artificial intelligence
   上下文: ...the development of artificial...
```

---

## 📝 AI 输出格式示例

### **输入**

```
Context: "The development of artificial intelligence has transformed many industries..."
Target Word: "artificial intelligence"
```

### **输出**

```
Artificial intelligence means machines that can think and learn like humans.

Examples:

Artificial intelligence is being used to develop new medicines and treatments.

Many companies use artificial intelligence to help answer customer questions.

Your smartphone uses artificial intelligence to understand your voice commands.
```

---

## 🎨 UI 特性

### **1. 自动触发**

- 面板打开时自动调用 AI
- 无需额外点击
- 流式显示内容

### **2. 朗读功能**

- 使用 Web Speech API
- 美式英语发音（en-US）
- 语速稍慢（0.9x）便于学习
- 点击切换播放/停止

### **3. 响应式设计**

- 高度 50vh
- 可滚动内容
- 移动端友好

---

## 🔍 API 详解

### **POST /api/explain**

**请求体：**
```json
{
  "text": "artificial intelligence",
  "context": "...the development of artificial intelligence has..."
}
```

**响应：**
- 流式响应（Server-Sent Events）
- 逐字返回生成的内容
- 自动处理连接

**使用的模型：**
- `gpt-4o-mini` - OpenAI 的高性价比模型
- Temperature: 0.7（平衡创造性和准确性）
- Max Tokens: 500（足够的解释长度）

---

## 💡 i+1 教学法说明

### **什么是 i+1？**

**i+1** 是语言学习理论，由 Stephen Krashen 提出：
- **i** = 当前水平（current level）
- **i+1** = 稍高一级（next level）

### **核心原则**

1. **可理解输入** - 使用简单英语解释
2. **上下文相关** - 结合文章主题
3. **实用例句** - 提供真实场景

### **CEFR 级别**

解释使用 A2/B1 级别英语：
- **A2** - 基础水平（Basic User）
- **B1** - 独立用户（Independent User）

---

## 🚀 高级配置

### **1. 更换 AI 模型**

```typescript
// app/api/explain/route.ts
import { anthropic } from '@ai-sdk/anthropic'

const result = await streamText({
  model: anthropic('claude-3-haiku-20240307'),
  // ...
})
```

### **2. 调整语言级别**

```typescript
system: `... 
2. Definition must be in simple, easy-to-understand English (CEFR A1 level).
...`
```

### **3. 自定义输出格式**

```typescript
system: `...
4. STRICTLY follow this output format:

📖 Definition: [Simple Definition]

💡 Examples:
1. [Example 1]
2. [Example 2]
3. [Example 3]
...`
```

---

## 🐛 故障排除

### **问题 1: AI 面板不显示**

**检查：**
```typescript
console.log('isAIPanelOpen:', isAIPanelOpen)
console.log('selectedText:', selectedText)
```

### **问题 2: AI 请求失败**

**检查：**
1. OPENAI_API_KEY 是否正确
2. 查看控制台错误
3. 检查网络连接

### **问题 3: 朗读不工作**

**原因：** 浏览器不支持 Web Speech API

**解决：**
- 使用 Chrome/Edge（推荐）
- 检查浏览器权限

### **问题 4: 流式响应中断**

**检查：**
- Edge Runtime 是否启用
- Vercel 部署配置

---

## 📊 成本估算

### **OpenAI API 定价**

**gpt-4o-mini:**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

**估算：**
- 每次解释约 150 tokens
- 1000 次解释 ≈ $0.10
- 非常经济实惠 ✅

---

## ✅ 功能清单

### **已实现 ✅**
- [x] AI 解释 API
- [x] 流式响应
- [x] i+1 教学模式
- [x] AI 面板 UI
- [x] 自动触发
- [x] 朗读功能
- [x] 用户认证
- [x] 错误处理

### **可选增强 ⏳**
- [ ] 保存解释到笔记
- [ ] 收藏生词本
- [ ] 复习功能
- [ ] 多语言支持
- [ ] 离线缓存

---

**准备就绪！开始使用 AI 功能吧！** 🚀
