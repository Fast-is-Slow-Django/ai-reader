# 路由保护和中间件工作原理

本文档详细解释 AI-Reader 项目中 Next.js 中间件和 Supabase Session 管理的工作原理。

## 📁 文件结构

```
ireader/
├── middleware.ts                      # 根目录中间件（路由保护入口）
└── utils/supabase/
    └── middleware.ts                  # Supabase Session 刷新工具
```

---

## 🔄 工作流程

### 1. **每个请求的处理流程**

```
用户访问页面
    ↓
middleware.ts (根目录)
    ↓
updateSession() (刷新 Session)
    ↓
获取用户信息 (user)
    ↓
路由保护判断
    ↓
返回响应或重定向
```

---

## 🛡️ 路由保护规则

### **受保护路由（需要登录）**

```typescript
const protectedRoutes = ['/dashboard', '/read']
```

- **`/dashboard`** - 书架页面（查看所有上传的书籍）
- **`/read/*`** - 阅读器页面（阅读具体书籍）

**行为：**
- ✅ 已登录用户：正常访问
- ❌ 未登录用户：重定向到 `/login?redirectTo=/原路径`

---

### **认证路由（登录/注册页面）**

```typescript
const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
```

- **`/login`** - 登录页面
- **`/signup`** - 注册页面

**行为：**
- ✅ 未登录用户：正常访问
- ❌ 已登录用户：重定向到 `/dashboard` 或 `redirectTo` 指定的页面

---

### **公开路由（无限制）**

所有其他路由（如首页 `/`）：
- ✅ 任何人都可以访问
- Session 仍然会自动刷新（保持登录状态）

---

## 🔐 Session 刷新机制

### **`utils/supabase/middleware.ts`**

```typescript
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse
  user: User | null
}>
```

**功能：**

1. **创建 Supabase 客户端**
   ```typescript
   const supabase = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     { cookies: { ... } }
   )
   ```

2. **自动刷新 Token**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   ```
   - 调用 `getUser()` 时，Supabase 会自动检查 token 是否过期
   - 如果过期，自动使用 refresh token 刷新
   - 新的 token 会写入 cookies

3. **同步 Cookies**
   - 通过 `setAll()` 回调函数更新 request 和 response 的 cookies
   - 确保客户端和服务端的认证状态同步

4. **返回用户信息和响应**
   - 返回 `user` 对象供路由保护使用
   - 返回 `response` 对象（包含刷新后的 cookies）

---

## 🚦 路由保护逻辑详解

### **情况 1: 未登录访问受保护路由**

```typescript
if (isProtectedRoute && !user) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirectTo', pathname)
  return NextResponse.redirect(loginUrl)
}
```

**示例：**
```
用户访问：/dashboard
    ↓
检测到未登录
    ↓
重定向到：/login?redirectTo=/dashboard
    ↓
用户登录成功后
    ↓
自动返回：/dashboard
```

**URL 示例：**
- 访问：`http://localhost:3000/dashboard`
- 重定向：`http://localhost:3000/login?redirectTo=/dashboard`
- 登录后：`http://localhost:3000/dashboard`

---

### **情况 2: 已登录访问认证页面**

```typescript
if (isAuthRoute && user) {
  const redirectTo = request.nextUrl.searchParams.get('redirectTo')
  if (redirectTo && redirectTo.startsWith('/')) {
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

**示例 A（有 redirectTo）：**
```
用户已登录
    ↓
访问：/login?redirectTo=/read/123
    ↓
检测到已登录
    ↓
重定向到：/read/123
```

**示例 B（无 redirectTo）：**
```
用户已登录
    ↓
访问：/login
    ↓
检测到已登录
    ↓
重定向到：/dashboard
```

---

### **情况 3: 正常访问**

```typescript
return response
```

**适用场景：**
- 已登录用户访问受保护路由 ✅
- 未登录用户访问公开路由 ✅
- 已登录用户访问公开路由 ✅

所有这些情况都会返回带有刷新后 cookies 的正常响应。

---

## 🎯 配置匹配规则

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
```

**匹配规则：**
- ✅ **包含**：所有页面路由
- ❌ **排除**：
  - `_next/static/*` - Next.js 静态文件
  - `_next/image/*` - Next.js 图片优化
  - `favicon.ico` - 网站图标
  - `*.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp, *.ico` - 图片文件
  - `*.css, *.js` - 样式和脚本文件

**为什么要排除这些？**
- 静态资源不需要认证
- 避免不必要的中间件执行，提升性能
- 防止 CORS 和缓存问题

---

## 🔍 调试和测试

### **测试场景**

#### 场景 1: 未登录访问受保护路由
```bash
# 访问
http://localhost:3000/dashboard

# 期望结果
重定向到: http://localhost:3000/login?redirectTo=/dashboard
```

#### 场景 2: 已登录访问登录页
```bash
# 访问（已登录状态）
http://localhost:3000/login

# 期望结果
重定向到: http://localhost:3000/dashboard
```

#### 场景 3: 登录后返回原页面
```bash
# 1. 未登录访问
http://localhost:3000/read/abc123

# 2. 重定向到
http://localhost:3000/login?redirectTo=/read/abc123

# 3. 登录成功后
http://localhost:3000/read/abc123  # 自动返回
```

#### 场景 4: 公开路由
```bash
# 访问首页（登录或未登录都可以）
http://localhost:3000/

# 期望结果
正常显示首页，不重定向
```

---

## 🐛 常见问题

### Q1: 为什么要在 middleware 中刷新 Session？

**答：**
- Next.js 中间件在服务端运行，在页面渲染之前执行
- 可以在用户访问任何页面时自动刷新 token
- 避免用户在使用过程中突然失去登录状态
- 确保 cookies 中的认证信息始终有效

---

### Q2: Session 刷新频率是多少？

**答：**
- 每次请求都会检查 token
- 只有 token 快过期时才会刷新（Supabase 自动处理）
- 默认 access token 有效期：1 小时
- 默认 refresh token 有效期：30 天

---

### Q3: 如果 refresh token 也过期了怎么办？

**答：**
- `user` 会变成 `null`
- 中间件会重定向到 `/login`
- 用户需要重新登录

---

### Q4: 为什么不在客户端处理路由保护？

**答：**
- **安全性**：客户端代码可以被绕过
- **SEO**：服务端重定向对搜索引擎更友好
- **性能**：避免加载不必要的页面资源
- **用户体验**：更快的重定向，无闪烁

---

### Q5: 如何添加新的受保护路由？

**答：**

在 `middleware.ts` 中修改 `protectedRoutes` 数组：

```typescript
const protectedRoutes = [
  '/dashboard', 
  '/read',
  '/settings',     // 新增：设置页面
  '/profile',      // 新增：个人资料
]
```

---

## 📊 性能优化

### **已实现的优化：**

1. **精确的 matcher 配置**
   - 排除静态资源，减少中间件执行次数

2. **最小化 cookies 操作**
   - 只在需要时更新 cookies
   - 避免不必要的写操作

3. **快速路径匹配**
   - 使用 `pathname.startsWith()` 而非正则表达式
   - O(1) 时间复杂度

---

## 🔒 安全最佳实践

### ✅ 当前实现

- ✅ 所有敏感路由都有保护
- ✅ Session 自动刷新，防止 token 过期
- ✅ 重定向使用白名单验证（`redirectTo.startsWith('/')`）
- ✅ 使用 Supabase RLS 作为第二层保护

### ⚠️ 注意事项

- ❌ 不要在客户端存储敏感信息
- ❌ 不要依赖客户端路由保护作为唯一防线
- ❌ 不要在 URL 中传递敏感数据
- ✅ 始终在服务端验证用户权限

---

## 🚀 扩展示例

### 添加角色权限控制

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  
  // 检查用户角色
  if (pathname.startsWith('/admin') && user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  
  // ... 其他逻辑
}
```

### 添加 API 路由保护

```typescript
// 在 matcher 中包含 API 路由
export const config = {
  matcher: [
    '/api/:path*',  // 包含 API 路由
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

// 在 middleware 中处理 API 路由
if (pathname.startsWith('/api') && !user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
```

---

## 📚 相关文档

- [Next.js Middleware 文档](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [@supabase/ssr 文档](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

**完成！** 路由保护已完全配置，你的应用现在是安全的。
