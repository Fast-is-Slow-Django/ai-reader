# Supabase 工具函数使用指南

本目录包含 AI-Reader 项目中使用 Supabase 的所有工具函数和类型定义。

## 📁 文件结构

```
utils/supabase/
├── client.ts      # 客户端组件使用
├── server.ts      # 服务端组件使用
├── middleware.ts  # 中间件 Session 刷新
├── types.ts       # TypeScript 类型定义
└── README.md      # 本文档
```

---

## 🔧 使用方法

### 1. **客户端组件** (`'use client'`)

用于需要客户端交互的组件，如表单、按钮点击等。

```tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function BookList() {
  const [books, setBooks] = useState([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchBooks() {
      const { data } = await supabase.from('books').select()
      setBooks(data || [])
    }
    fetchBooks()
  }, [])

  return <div>{/* 渲染书籍列表 */}</div>
}
```

**使用场景：**
- ✅ 客户端数据获取
- ✅ 实时订阅（Realtime）
- ✅ 表单提交
- ✅ 用户交互事件

---

### 2. **服务端组件** (默认)

用于服务端渲染的组件，可以直接在服务器上获取数据。

```tsx
import { createClient } from '@/utils/supabase/server'

export default async function BookPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: book } = await supabase
    .from('books')
    .select()
    .eq('id', params.id)
    .single()

  return (
    <div>
      <h1>{book.title}</h1>
      {/* 渲染书籍详情 */}
    </div>
  )
}
```

**使用场景：**
- ✅ 服务端数据预取
- ✅ SEO 优化（SSR）
- ✅ 减少客户端 JavaScript
- ✅ 服务端权限验证

---

### 3. **Server Actions**

用于处理表单提交和服务端数据操作。

```tsx
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteBook(bookId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/books')
  return { success: true }
}
```

**使用场景：**
- ✅ 表单提交处理
- ✅ 数据库写入操作
- ✅ 文件上传
- ✅ 复杂业务逻辑

---

### 4. **Route Handlers (API 路由)**

用于创建 API 端点。

```tsx
// app/api/books/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: books, error } = await supabase
    .from('books')
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ books })
}
```

**使用场景：**
- ✅ REST API 端点
- ✅ Webhook 处理
- ✅ 第三方服务集成
- ✅ 文件上传/下载

---

## 🔐 认证相关

### 获取当前用户

**客户端：**
```tsx
'use client'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**服务端：**
```tsx
import { createClient } from '@/utils/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### 登录/注册

```tsx
'use client'
import { createClient } from '@/utils/supabase/client'

async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

async function signUp(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}
```

### 登出

```tsx
'use client'
import { createClient } from '@/utils/supabase/client'

async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
```

---

## 📦 Storage (文件存储)

### 上传文件

```tsx
'use server'
import { createClient } from '@/utils/supabase/server'

export async function uploadEpub(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const fileName = `${user.id}/${Date.now()}.epub`
  
  const { data, error } = await supabase.storage
    .from('user_books')
    .upload(fileName, file)

  if (error) throw error
  
  // 获取公开 URL
  const { data: { publicUrl } } = supabase.storage
    .from('user_books')
    .getPublicUrl(fileName)

  return publicUrl
}
```

### 下载文件

```tsx
const { data, error } = await supabase.storage
  .from('user_books')
  .download('path/to/file.epub')
```

---

## 📊 类型安全

使用 `types.ts` 中定义的类型以获得完整的 TypeScript 支持：

```tsx
import { createClient } from '@/utils/supabase/server'
import type { Book, Note } from '@/utils/supabase/types'

const supabase = await createClient()

// ✅ TypeScript 会自动推断类型
const { data: books } = await supabase
  .from('books')
  .select()
// books 的类型是 Book[] | null

// ✅ 插入数据时也有类型检查
await supabase.from('books').insert({
  title: '书名',
  file_url: 'url',
  user_id: 'user_id',
  // TypeScript 会提示缺少必填字段或字段类型错误
})
```

---

## 🔄 中间件工作原理

`middleware.ts` 会在每个请求时：
1. 检查用户的 Session 是否过期
2. 如果过期，自动刷新 access token
3. 更新 cookies 中的认证信息
4. 保持用户登录状态

**无需手动处理 token 刷新！**

---

## 🎯 最佳实践

### ✅ 推荐

1. **服务端优先**：尽可能使用 Server Components 获取数据
2. **类型安全**：使用 `types.ts` 中的类型定义
3. **错误处理**：始终检查 `error` 返回值
4. **RLS 策略**：依赖 Supabase RLS 保护数据，而不是客户端逻辑

### ❌ 避免

1. **在客户端暴露敏感信息**：不要在客户端组件中处理敏感数据
2. **绕过 RLS**：不要尝试使用 Service Role Key（仅用于服务端）
3. **过度客户端渲染**：优先使用服务端组件以提升性能和 SEO

---

## 🐛 常见问题

### Q: "cookies() can only be called on Server Components"

**原因**：在客户端组件中使用了 `server.ts` 的 `createClient()`

**解决**：在客户端组件中使用 `client.ts` 的 `createClient()`

```tsx
// ❌ 错误
'use client'
import { createClient } from '@/utils/supabase/server' // 不要这样！

// ✅ 正确
'use client'
import { createClient } from '@/utils/supabase/client'
```

---

### Q: Session 没有自动刷新

**原因**：`middleware.ts` 没有正确配置

**解决**：确保项目根目录有 `middleware.ts` 文件，并且 `matcher` 配置正确

---

### Q: RLS 策略阻止了数据访问

**原因**：Supabase RLS 策略限制了未授权访问

**解决**：
1. 确保用户已登录
2. 检查 Supabase Dashboard 中的 RLS 策略
3. 确认 `user_id` 字段正确设置

---

## 📚 参考资源

- [Supabase 官方文档](https://supabase.com/docs)
- [@supabase/ssr 文档](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js 15 文档](https://nextjs.org/docs)
