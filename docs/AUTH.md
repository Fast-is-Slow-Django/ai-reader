# 认证系统使用指南

AI-Reader 项目的完整认证系统实现和使用文档。

## 📁 文件结构

```
ireader/
├── app/
│   ├── login/
│   │   └── actions.ts              # 登录/注册 Server Actions
│   ├── actions/
│   │   └── auth.ts                 # 全局认证 Actions
│   └── auth/
│       └── callback/
│           └── route.ts            # 邮件确认回调路由
├── types/
│   └── auth.ts                     # 认证类型定义
└── docs/
    └── AUTH.md                     # 本文档
```

---

## 🔐 Server Actions

### **1. 登录 (`login`)**

**位置：** `app/login/actions.ts`

**功能：** 用户登录

**使用方法：**

```tsx
'use client'

import { login } from '@/app/login/actions'
import { useFormState } from 'react-dom'

export default function LoginForm() {
  const [state, formAction] = useFormState(login, undefined)

  return (
    <form action={formAction}>
      <input 
        name="email" 
        type="email" 
        placeholder="邮箱"
        required 
      />
      <input 
        name="password" 
        type="password"
        placeholder="密码"
        required 
      />
      {state?.error && (
        <p className="text-red-500">{state.error}</p>
      )}
      <button type="submit">登录</button>
    </form>
  )
}
```

**表单字段：**
- `email` (string, 必填) - 用户邮箱
- `password` (string, 必填) - 用户密码

**返回值：**
```typescript
{
  error?: string  // 错误信息（如果有）
}
```

**可能的错误：**
- "请输入邮箱和密码"
- "邮箱或密码错误"
- "请先确认您的邮箱"

---

### **2. 注册 (`signup`)**

**位置：** `app/login/actions.ts`

**功能：** 用户注册

**使用方法：**

```tsx
'use client'

import { signup } from '@/app/login/actions'
import { useFormState } from 'react-dom'

export default function SignupForm() {
  const [state, formAction] = useFormState(signup, undefined)

  return (
    <form action={formAction}>
      <input 
        name="email" 
        type="email" 
        placeholder="邮箱"
        required 
      />
      <input 
        name="password" 
        type="password"
        placeholder="密码（至少6位）"
        required 
        minLength={6}
      />
      {state?.error && (
        <p className="text-red-500">{state.error}</p>
      )}
      <button type="submit">注册</button>
    </form>
  )
}
```

**表单字段：**
- `email` (string, 必填) - 用户邮箱
- `password` (string, 必填) - 用户密码（至少 6 位）

**返回值：**
```typescript
{
  error?: string  // 错误信息（如果有）
}
```

**可能的错误：**
- "请输入邮箱和密码"
- "请输入有效的邮箱地址"
- "密码至少需要 6 个字符"
- "该邮箱已被注册"

**注意事项：**
- 如果 Supabase **启用了邮件确认**：
  - 用户会收到确认邮件
  - 需要点击邮件中的链接才能激活账号
  - 注册后会显示提示信息

- 如果 Supabase **关闭了邮件确认**：
  - 注册后立即自动登录
  - 直接重定向到 `/dashboard`

---

### **3. 登出 (`signout` / `signOut`)**

**位置：** 
- `app/login/actions.ts` (局部版本)
- `app/actions/auth.ts` (全局版本)

**功能：** 用户登出

**使用方法 A - 表单提交：**

```tsx
'use client'

import { signOut } from '@/app/actions/auth'

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <button type="submit">退出登录</button>
    </form>
  )
}
```

**使用方法 B - 客户端调用：**

```tsx
'use client'

import { signOut } from '@/app/actions/auth'
import { useTransition } from 'react'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <button 
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? '退出中...' : '退出登录'}
    </button>
  )
}
```

---

## 🌐 全局认证 Actions

**位置：** `app/actions/auth.ts`

### **`getCurrentUser()`**

获取当前登录用户的信息。

```typescript
import { getCurrentUser } from '@/app/actions/auth'

// 在 Server Component 中使用
export default async function ProfilePage() {
  const user = await getCurrentUser()
  
  if (!user) {
    return <div>请先登录</div>
  }

  return <div>欢迎，{user.email}</div>
}
```

**返回值：** `User | null`

---

### **`isAuthenticated()`**

检查用户是否已登录。

```typescript
import { isAuthenticated } from '@/app/actions/auth'

export default async function ProtectedPage() {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    redirect('/login')
  }

  return <div>受保护的内容</div>
}
```

**返回值：** `boolean`

---

### **`getUserEmail()`**

获取当前用户的邮箱。

```typescript
import { getUserEmail } from '@/app/actions/auth'

export default async function SettingsPage() {
  const email = await getUserEmail()
  
  return <div>当前邮箱：{email}</div>
}
```

**返回值：** `string | null`

---

### **`updatePassword(newPassword: string)`**

更新用户密码。

```tsx
'use client'

import { updatePassword } from '@/app/actions/auth'
import { useState } from 'react'

export default function ChangePasswordForm() {
  const [message, setMessage] = useState('')

  async function handleSubmit(formData: FormData) {
    const newPassword = formData.get('password') as string
    const result = await updatePassword(newPassword)
    
    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage('密码更新成功！')
    }
  }

  return (
    <form action={handleSubmit}>
      <input 
        name="password" 
        type="password"
        placeholder="新密码"
        required
        minLength={6}
      />
      <button type="submit">更新密码</button>
      {message && <p>{message}</p>}
    </form>
  )
}
```

**参数：** `newPassword: string`

**返回值：**
```typescript
{
  success?: boolean
  error?: string
}
```

---

### **`sendPasswordResetEmail(email: string)`**

发送密码重置邮件。

```tsx
'use client'

import { sendPasswordResetEmail } from '@/app/actions/auth'
import { useState } from 'react'

export default function ForgotPasswordForm() {
  const [message, setMessage] = useState('')

  async function handleSubmit(formData: FormData) {
    const email = formData.get('email') as string
    const result = await sendPasswordResetEmail(email)
    
    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage('密码重置邮件已发送，请检查您的邮箱')
    }
  }

  return (
    <form action={handleSubmit}>
      <input 
        name="email" 
        type="email"
        placeholder="邮箱地址"
        required
      />
      <button type="submit">发送重置邮件</button>
      {message && <p>{message}</p>}
    </form>
  )
}
```

**参数：** `email: string`

**返回值：**
```typescript
{
  success?: boolean
  error?: string
}
```

---

## 🔄 邮件确认流程

### **启用邮件确认时的完整流程**

```
1. 用户注册
   ↓
2. Supabase 发送确认邮件
   ↓
3. 用户点击邮件中的链接
   ↓
4. 重定向到 /auth/callback?code=xxx
   ↓
5. 后端交换 code 为 session
   ↓
6. 重定向到 /dashboard
   ↓
7. 用户登录成功
```

### **邮件确认回调路由**

**位置：** `app/auth/callback/route.ts`

**URL：** `/auth/callback?code=xxx&next=/dashboard`

**参数：**
- `code` (required) - Supabase 提供的确认码
- `next` (optional) - 确认后跳转的页面（默认 `/dashboard`）

**Supabase 配置：**

在注册时设置 `emailRedirectTo`：

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'http://localhost:3000/auth/callback',
  },
})
```

---

## 🎯 使用场景示例

### **场景 1：完整的登录页面**

```tsx
'use client'

import { login } from '@/app/login/actions'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full py-2 bg-blue-600 text-white rounded"
    >
      {pending ? '登录中...' : '登录'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, undefined)

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">登录</h1>
      
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-2">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full p-2 border rounded"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block mb-2">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full p-2 border rounded"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <div className="p-3 bg-red-50 text-red-600 rounded">
            {state.error}
          </div>
        )}

        <SubmitButton />

        <div className="text-center text-sm">
          还没有账号？
          <Link href="/signup" className="text-blue-600 ml-1">
            立即注册
          </Link>
        </div>
      </form>
    </div>
  )
}
```

---

### **场景 2：导航栏登出按钮**

```tsx
'use client'

import { signOut } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'

export default function UserMenu({ userEmail }: { userEmail: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm">{userEmail}</span>
      
      <form action={signOut}>
        <button 
          type="submit"
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded"
        >
          <LogOut size={16} />
          退出
        </button>
      </form>
    </div>
  )
}
```

---

### **场景 3：受保护的页面**

```tsx
import { getCurrentUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // 服务端验证用户身份
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <h1>书架</h1>
      <p>欢迎，{user.email}</p>
      {/* 书籍列表 */}
    </div>
  )
}
```

---

## 🔒 安全最佳实践

### ✅ 当前实现

1. **Server Actions** - 所有认证逻辑在服务端执行
2. **RLS 保护** - Supabase 行级安全策略
3. **输入验证** - 邮箱格式和密码强度验证
4. **错误处理** - 统一的错误信息
5. **Session 刷新** - 中间件自动刷新 token

### ⚠️ 注意事项

- ❌ 不要在客户端存储敏感信息
- ❌ 不要在 URL 中传递密码
- ❌ 不要跳过服务端验证
- ✅ 始终使用 HTTPS（生产环境）
- ✅ 使用强密码策略
- ✅ 定期更新依赖包

---

## 🐛 常见问题

### Q1: "邮箱或密码错误"

**原因：**
- 用户输入错误
- 用户未注册
- 密码不匹配

**解决：**
- 检查输入是否正确
- 确认是否已注册
- 尝试重置密码

---

### Q2: "请先确认您的邮箱"

**原因：**
- Supabase 启用了邮件确认
- 用户未点击确认邮件

**解决：**
- 检查邮箱（包括垃圾邮件）
- 点击邮件中的确认链接
- 或在 Supabase 后台关闭邮件确认

---

### Q3: 注册后无法登录

**原因：**
- 邮件确认未完成
- 账号被禁用

**解决：**
- 完成邮件确认
- 联系管理员检查账号状态

---

### Q4: Session 丢失

**原因：**
- Token 过期
- Cookies 被清除

**解决：**
- 重新登录
- 检查中间件配置
- 确保 cookies 未被阻止

---

## 📚 相关文档

- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [路由保护文档](./MIDDLEWARE.md)

---

**完成！** 认证系统已完全配置，可以开始实现登录和注册页面了。
