# AI 集成调试文档

## 📋 问题描述
使用 Google Gemini AI 时遇到 404 错误：`models/gemini-1.5-flash is not found for API version v1beta`

---

## 🔧 当前技术栈

### 依赖包版本
```json
{
  "@ai-sdk/google": "^2.0.39",
  "ai": "^3.4.33",
  "next": "16.0.3",
  "react": "19.2.0"
}
```

### 运行环境
- Framework: Next.js 15 (App Router)
- Runtime: Edge Runtime
- TypeScript: ^5

---

## 📁 文件结构

```
app/
├── api/
│   └── explain/
│       └── route.ts          # AI API 路由
components/
└── reader/
    ├── AIPanel.tsx           # AI 面板（前端）
    └── DirectEpubReader.tsx  # 阅读器组件
.env.local                     # 环境变量
```

---

## 🔑 环境变量配置

**文件：`.env.local`**
```bash
GOOGLE_GENERATIVE_AI_API_KEY=你的完整API_KEY
# API Key 从这里获取：https://aistudio.google.com/app/apikey
```

---

## 🚀 后端 API 路由完整代码

**文件：`app/api/explain/route.ts`**
```typescript
import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
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
    const { text, context } = await req.json()

    if (!text || !context) {
      return new Response('Missing required fields: text or context', { status: 400 })
    }

    console.log('📝 AI 解释请求 (Gemini)')
    console.log('   目标词:', text)
    console.log('   上下文:', context.substring(0, 100) + '...')

    // 3. 检查并显式传递 API 密钥
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY 未配置')
      return new Response('API Key not configured', { status: 500 })
    }
    console.log('✅ API Key 已找到，长度:', apiKey.length)

    // 4. 创建 Google AI 实例并使用 Gemini
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: `You are a language teaching expert specializing in the "i+1" (Comprehensible Input) method.
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

[Example Sentence 3]`,
      prompt: `Context: "${context}"\n\nTarget Word: "${text}"`,
      temperature: 0.7,
    })

    // 5. 返回流式响应
    return result.toTextStreamResponse()
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
```

---

## 💻 前端调用代码

**文件：`components/reader/AIPanel.tsx`（关键部分）**
```typescript
'use client'

import { useEffect } from 'react'
import { useCompletion } from 'ai/react'

interface AIPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  context: string
}

export default function AIPanel({
  isOpen,
  onClose,
  selectedText,
  context,
}: AIPanelProps) {
  // 使用 Vercel AI SDK 的 useCompletion
  const { complete, completion, isLoading, error } = useCompletion({
    api: '/api/explain',
  })

  /**
   * 自动触发 AI 解释
   * 当面板打开且有选中文本时
   */
  useEffect(() => {
    if (isOpen && selectedText && !completion && !isLoading) {
      console.log('🤖 自动触发 AI 解释')
      console.log('   目标词:', selectedText)
      console.log('   上下文:', context.substring(0, 100))
      
      // 调用 AI API - 使用 body 中的 text 字段
      complete('', {
        body: {
          text: selectedText,  // 后端期望的字段名
          context,
        },
      })
    }
  }, [isOpen, selectedText]) // 只在打开时触发一次

  // ... 其他 UI 代码
}
```

---

## 🐛 当前错误信息

### 终端显示的错误：
```
❌ AI 解释失败: AI_APICallError: models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.

statusCode: 404
responseBody: {
  "error": {
    "code": 404,
    "message": "models/gemini-1.5-flash is not found for API version v1beta...",
    "status": "NOT_FOUND"
  }
}
```

### API 请求详情：
```
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse

请求体包含：
- generationConfig (temperature: 0.7)
- contents (用户消息)
- systemInstruction (system prompt)
```

---

## 🔄 已尝试的方案

### 1. 尝试过的模型名称：
- ❌ `gemini-1.5-flash` → 404 Not Found
- ❌ `gemini-1.5-flash-latest` → 404 Not Found
- ❌ `gemini-3-pro` → 404 Not Found
- ❌ `gemini-pro` → 404 Not Found

### 2. 尝试过的 API 版本：
- ❌ 默认 v1beta (使用 systemInstruction) → 404
- ❌ 手动指定 v1 (不支持 systemInstruction) → 400

### 3. 已确认的配置：
- ✅ `@ai-sdk/google` 已安装 (v2.0.39)
- ✅ API Key 已正确配置（长度正确）
- ✅ 使用 `createGoogleGenerativeAI` 显式传递 API Key
- ✅ 请求体格式正确（text + context）

---

## ❓ 待解决的问题

### 核心问题：
**Google Gemini API 的正确模型名称是什么？**

### 可能的原因：
1. 模型名称格式不对
2. API Key 权限不足（未启用某些模型）
3. SDK 版本与 API 不匹配
4. 需要特殊的模型访问权限

### 需要确认：
1. Google AI Studio API Key 支持哪些模型？
2. `@ai-sdk/google` v2.0.39 的正确用法是什么？
3. 是否需要升级或降级 SDK 版本？
4. 是否有其他配置项（如 region、project）？

---

## 🆘 请专家帮忙检查

请帮忙确认以下几点：

1. **模型名称**：`gemini-1.5-flash` 在 2024 年 12 月是否仍然可用？
2. **API 版本**：应该使用 v1 还是 v1beta？
3. **SDK 配置**：`createGoogleGenerativeAI` 的正确参数是什么？
4. **API Key**：是否需要特殊的权限或设置？

---

## 📚 参考链接

- Vercel AI SDK 文档：https://sdk.vercel.ai/docs
- Google Gemini API：https://ai.google.dev/gemini-api/docs
- API Studio：https://aistudio.google.com/app/apikey
- GitHub Issue (如果有)

---

**创建时间：** 2024-12-01
**Next.js 版本：** 16.0.3
**Node 环境：** Edge Runtime
