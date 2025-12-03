# 书架页面完整指南

AI-Reader 书架页面的详细文档。

## 📁 文件位置

```
app/dashboard/page.tsx
```

---

## 🎨 页面结构

```
┌─────────────────────────────────────────┐
│  Header (Sticky)                        │
│  ┌──────┐  我的书架                     │
│  │ 📖  │  user@email.com      [退出]   │
│  └──────┘                               │
├─────────────────────────────────────────┤
│  Main Content                           │
│  共 X 本书籍                             │
│                                         │
│  ┌───────┬───────┬───────┬───────┐     │
│  │ Upload│ Book 1│ Book 2│ Book 3│     │
│  │   +   │       │       │       │     │
│  └───────┴───────┴───────┴───────┘     │
│  ┌───────┬───────┬───────┬───────┐     │
│  │ Book 4│ Book 5│ Book 6│ Book 7│     │
│  └───────┴───────┴───────┴───────┘     │
└─────────────────────────────────────────┘
```

---

## 🔧 核心功能

### **1. Server Component 数据获取**

```typescript
// 1. 创建 Supabase 客户端
const supabase = await createClient()

// 2. 获取当前用户
const { data: { user } } = await supabase.auth.getUser()

// 3. 查询书籍列表
const { data: books } = await supabase
  .from('books')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

**特点：**
- ✅ 服务端渲染（SSR）
- ✅ 自动用户验证
- ✅ 未登录自动重定向
- ✅ 按时间倒序排列

---

### **2. 顶部导航栏**

```tsx
<header className="bg-white border-b sticky top-0 z-10">
  <div className="flex justify-between">
    {/* 左侧：Logo + 用户信息 */}
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-blue-600 rounded-lg">
        <BookOpen />
      </div>
      <div>
        <h1>我的书架</h1>
        <p>{user.email}</p>
      </div>
    </div>

    {/* 右侧：退出按钮 */}
    <SignOutButton variant="outline" />
  </div>
</header>
```

**特点：**
- ✅ Sticky 定位（滚动时固定）
- ✅ 显示用户邮箱
- ✅ 退出按钮（outline 样式）
- ✅ 响应式设计

---

### **3. 书籍网格**

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
  {/* 上传器 - 第一个位置 */}
  <BookUploader />

  {/* 书籍卡片 */}
  {books.map(book => (
    <BookCard key={book.id} book={book} />
  ))}
</div>
```

**响应式布局：**
- 📱 手机：2 列 (`grid-cols-2`)
- 📱 小平板：3 列 (`sm:grid-cols-3`)
- 💻 平板：4 列 (`md:grid-cols-4`)
- 🖥️ 桌面：5 列 (`lg:grid-cols-5`)

---

### **4. 书籍卡片设计**

```tsx
<Link href={`/read/${book.id}`} className="group">
  {/* 封面区域 - 渐变背景 */}
  <div className="bg-gradient-to-br from-blue-500 to-purple-600">
    <BookOpen />
    
    {/* 悬停时显示提示 */}
    <div className="opacity-0 group-hover:opacity-100">
      点击阅读
    </div>
  </div>

  {/* 信息区域 */}
  <div className="p-4">
    <h3>{book.title}</h3>
    <time>{formattedDate}</time>
  </div>
</Link>
```

**特点：**
- ✅ 3:4 比例（类似书籍封面）
- ✅ 渐变背景（蓝色到紫色）
- ✅ 悬停效果（阴影、遮罩、提示）
- ✅ 点击跳转到阅读器
- ✅ 显示书名和上传日期
- ✅ Line-clamp 限制标题行数

---

### **5. 空状态提示**

```tsx
{booksList.length === 0 && (
  <div className="mt-16 text-center">
    <BookOpen size={48} className="text-gray-400" />
    <h3>还没有书籍</h3>
    <p>点击左上角的卡片上传你的第一本电子书</p>
  </div>
)}
```

**显示时机：** 用户还没有上传任何书籍

---

## 🎨 设计细节

### **颜色方案**

```css
/* 主题色 */
蓝色：#3B82F6 (blue-600)
紫色：#9333EA (purple-600)

/* 背景 */
页面背景：渐变 from-gray-50 to-blue-50
卡片背景：白色 (#FFFFFF)

/* 文字 */
标题：gray-900 (#111827)
正文：gray-600 (#4B5563)
次要：gray-500 (#6B7280)
```

### **间距和圆角**

```css
/* 卡片 */
圆角：rounded-2xl (16px)
阴影：shadow-sm → shadow-xl (hover)
间距：p-4 (16px)

/* 网格 */
间距：gap-4 md:gap-6
```

### **悬停效果**

```css
/* 书籍卡片悬停 */
1. 阴影增强：shadow-sm → shadow-xl
2. 遮罩显示：bg-black/0 → bg-black/10
3. 提示显示：opacity-0 → opacity-100
4. 标题变色：text-gray-900 → text-blue-600
```

---

## 📊 数据流程

### **页面加载流程**

```
1. Next.js 服务端开始渲染
   ↓
2. 创建 Supabase 客户端
   ↓
3. 获取当前用户
   ├─ 成功：继续
   └─ 失败：redirect('/login')
   ↓
4. 查询书籍列表
   ├─ 成功：渲染书籍
   └─ 失败：显示空数组
   ↓
5. 返回完整的 HTML
   ↓
6. 浏览器显示页面
```

### **用户交互流程**

```
1. 点击上传器 → 上传新书籍 → revalidatePath → 页面自动刷新
2. 点击书籍卡片 → 跳转到 /read/[id]
3. 点击退出按钮 → 登出 → 重定向到 /login
```

---

## 🔍 Server Component 说明

### **为什么使用 Server Component？**

1. **SEO 友好**
   - 搜索引擎可以直接抓取书籍列表
   - 服务端渲染完整 HTML

2. **性能优化**
   - 减少客户端 JavaScript
   - 数据在服务端获取（更快）
   - 不需要 loading 状态

3. **安全性**
   - 敏感查询在服务端执行
   - 不暴露数据库连接
   - 自动应用 RLS 策略

### **配置选项**

```typescript
// 强制动态渲染（不缓存）
export const dynamic = 'force-dynamic'

// 缓存时间（秒）
export const revalidate = 0

// 页面元数据
export const metadata = {
  title: '我的书架 - AI-Reader',
  description: '管理和阅读你的电子书收藏',
}
```

---

## 🎯 使用示例

### **访问书架页面**

```
http://localhost:3000/dashboard
```

### **权限验证**

```typescript
// 未登录用户访问
→ 自动重定向到 /login?redirectTo=/dashboard

// 已登录用户访问
→ 显示书架页面
```

### **上传书籍后**

```typescript
// BookUploader 调用
await createBookRecord(...)
  ↓
// Server Action 执行
revalidatePath('/dashboard')
  ↓
// 页面自动刷新，显示新书籍
```

---

## 🔧 自定义修改

### **修改网格列数**

```tsx
// 默认配置
grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5

// 更密集（更多列）
grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6

// 更宽松（更少列）
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
```

### **修改卡片比例**

```tsx
// 默认：3:4 比例
aspect-[3/4]

// 正方形
aspect-square

// 更高
aspect-[2/3]

// 更宽
aspect-[4/3]
```

### **修改封面渐变色**

```tsx
// 默认：蓝色到紫色
from-blue-500 to-purple-600

// 绿色到青色
from-green-500 to-cyan-600

// 橙色到红色
from-orange-500 to-red-600

// 使用随机色
from-${colors[Math.floor(Math.random() * colors.length)]}-500
```

### **添加书籍操作菜单**

```tsx
// 在 BookCard 中添加
<div className="absolute top-2 right-2">
  <button onClick={(e) => {
    e.preventDefault()
    // 显示菜单
  }}>
    <MoreVertical size={20} />
  </button>
</div>
```

---

## 📱 响应式设计

### **断点说明**

| 断点 | 屏幕宽度 | 列数 | 设备 |
|------|---------|------|------|
| 默认 | < 640px | 2 | 手机 |
| sm | ≥ 640px | 3 | 大手机 |
| md | ≥ 768px | 4 | 平板 |
| lg | ≥ 1024px | 5 | 笔记本 |
| xl | ≥ 1280px | 5 | 桌面 |

### **移动端优化**

```tsx
// 顶部导航
<div className="px-4 sm:px-6 lg:px-8">  // 响应式内边距

// 书籍网格
<div className="gap-4 md:gap-6">  // 响应式间距

// 统计信息
<span className="text-base md:text-lg">  // 响应式字体
```

---

## 🐛 常见问题

### Q: 页面显示"还没有书籍"但实际已上传

**原因**：缓存问题或查询失败

**解决**：
1. 检查 `revalidatePath` 是否正确调用
2. 查看浏览器控制台的错误信息
3. 检查 Supabase RLS 策略
4. 手动刷新页面（Ctrl+R）

---

### Q: 点击书籍卡片显示 404

**原因**：`/read/[id]` 页面还未创建

**解决**：这是正常的，阅读器页面在下一步实现

---

### Q: 退出按钮不工作

**原因**：SignOutButton 组件问题

**解决**：
1. 检查 `components/auth/SignOutButton.tsx` 是否存在
2. 确认导入路径正确
3. 查看浏览器控制台错误

---

### Q: 布局在某些屏幕不对齐

**原因**：容器宽度问题

**解决**：检查 `max-w-7xl` 容器是否正确应用

---

## ✅ 功能检查清单

部署前确认：

- [ ] 未登录用户被重定向到登录页
- [ ] 用户邮箱正确显示
- [ ] 退出按钮正常工作
- [ ] 书籍按时间倒序显示
- [ ] 上传器显示在第一个位置
- [ ] 书籍卡片点击可跳转
- [ ] 悬停效果流畅
- [ ] 空状态提示正确显示
- [ ] 移动端布局正常
- [ ] 平板和桌面端布局正常

---

## 🎨 设计资源

### **Figma 设计稿（示例）**

```
书籍卡片设计：
- 宽度：自适应（Grid）
- 高度：aspect-[3/4]
- 圆角：16px
- 阴影：0 1px 3px rgba(0,0,0,0.1) → 0 20px 25px rgba(0,0,0,0.15)
- 封面：渐变 + 图标
- 信息栏：白色背景，16px 内边距
```

### **颜色变量（可选）**

```css
/* tailwind.config.js */
colors: {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
  },
  accent: {
    500: '#9333ea',
    600: '#7e22ce',
  }
}
```

---

## 📚 相关文档

- [BookUploader 组件](./BOOK_UPLOADER.md)
- [Server Actions](./DASHBOARD_ACTIONS.md)
- [认证系统](./AUTH.md)

---

**完成！** 书架页面已完全实现，可以开始使用。
