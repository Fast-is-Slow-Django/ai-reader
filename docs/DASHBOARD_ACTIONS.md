# 书架和上传 Server Actions 使用指南

完整的书籍管理和文件上传 Server Actions 文档。

## 📁 文件结构

```
ireader/
├── app/
│   └── dashboard/
│       ├── actions.ts                # 书籍管理 Actions
│       └── upload/
│           └── actions.ts            # 文件上传 Actions
└── docs/
    └── DASHBOARD_ACTIONS.md          # 本文档
```

---

## 📚 书籍管理 Actions (`app/dashboard/actions.ts`)

### **1. createBookRecord** - 创建书籍记录

**功能：** 将上传的书籍信息保存到数据库

**签名：**
```typescript
async function createBookRecord(
  fileUrl: string,
  title: string,
  filePath: string
): Promise<ActionResult<Book>>
```

**参数：**
- `fileUrl` (string) - Storage 中的文件下载链接
- `title` (string) - 书籍标题
- `filePath` (string) - Storage 中的文件路径（格式：`user_id/filename.epub`）

**返回值：**
```typescript
{
  success: boolean
  error?: string
  data?: Book  // 创建的书籍对象
}
```

**使用示例：**
```typescript
import { createBookRecord } from '@/app/dashboard/actions'

const result = await createBookRecord(
  'https://xxx.supabase.co/storage/.../book.epub',
  '西游记',
  'user-123/1234567890-abc123-西游记.epub'
)

if (result.success) {
  console.log('书籍创建成功:', result.data?.id)
} else {
  console.error('创建失败:', result.error)
}
```

**内部流程：**
```
1. 验证参数（fileUrl, title, filePath 不为空）
   ↓
2. 验证 fileUrl 格式
   ↓
3. 获取当前登录用户
   ↓
4. 向 books 表插入记录
   ↓
5. revalidatePath('/dashboard')
   ↓
6. 返回结果
```

**可能的错误：**
- "缺少必需参数：fileUrl, title, filePath"
- "无效的文件 URL"
- "请先登录"
- "该书籍已存在"（唯一约束冲突）

---

### **2. deleteBook** - 删除书籍

**功能：** 删除书籍记录和 Storage 中的文件

**签名：**
```typescript
async function deleteBook(bookId: string): Promise<ActionResult>
```

**参数：**
- `bookId` (string) - 书籍 ID

**返回值：**
```typescript
{
  success: boolean
  error?: string
}
```

**使用示例：**
```typescript
import { deleteBook } from '@/app/dashboard/actions'

const result = await deleteBook('book-id-123')

if (result.success) {
  console.log('书籍删除成功')
} else {
  console.error('删除失败:', result.error)
}
```

**内部流程：**
```
1. 验证 bookId
   ↓
2. 获取当前用户
   ↓
3. 查询书籍信息（验证所有权）
   ↓
4. 从 file_url 提取文件路径
   ↓
5. 删除 Storage 中的文件
   ↓
6. 删除数据库记录（级联删除笔记）
   ↓
7. revalidatePath('/dashboard')
   ↓
8. 返回结果
```

**注意事项：**
- ✅ 只能删除自己的书籍（RLS + 代码双重保护）
- ✅ 级联删除：删除书籍时自动删除所有相关笔记
- ✅ 即使 Storage 文件删除失败，也会删除数据库记录
- ✅ 文件路径自动从 URL 提取

---

### **3. getUserBooks** - 获取书籍列表

**功能：** 获取当前用户的所有书籍

**签名：**
```typescript
async function getUserBooks(): Promise<ActionResult<Book[]>>
```

**返回值：**
```typescript
{
  success: boolean
  error?: string
  data?: Book[]  // 书籍数组
}
```

**使用示例：**
```typescript
import { getUserBooks } from '@/app/dashboard/actions'

const result = await getUserBooks()

if (result.success && result.data) {
  result.data.forEach(book => {
    console.log(`书名: ${book.title}`)
    console.log(`上传时间: ${book.created_at}`)
  })
} else {
  console.error('获取失败:', result.error)
}
```

**排序：** 按创建时间倒序（最新的在前）

---

### **4. getBook** - 获取单本书籍

**功能：** 获取指定书籍的详细信息

**签名：**
```typescript
async function getBook(bookId: string): Promise<ActionResult<Book>>
```

**参数：**
- `bookId` (string) - 书籍 ID

**返回值：**
```typescript
{
  success: boolean
  error?: string
  data?: Book
}
```

**使用示例：**
```typescript
import { getBook } from '@/app/dashboard/actions'

const result = await getBook('book-id-123')

if (result.success && result.data) {
  console.log('书名:', result.data.title)
  console.log('文件 URL:', result.data.file_url)
} else {
  console.error('获取失败:', result.error)
}
```

**可能的错误：**
- "缺少书籍 ID"
- "请先登录"
- "书籍不存在或无权限访问"

---

### **5. updateBookTitle** - 更新书名

**功能：** 修改书籍标题

**签名：**
```typescript
async function updateBookTitle(
  bookId: string,
  newTitle: string
): Promise<ActionResult<Book>>
```

**参数：**
- `bookId` (string) - 书籍 ID
- `newTitle` (string) - 新标题

**返回值：**
```typescript
{
  success: boolean
  error?: string
  data?: Book  // 更新后的书籍对象
}
```

**使用示例：**
```typescript
import { updateBookTitle } from '@/app/dashboard/actions'

const result = await updateBookTitle('book-id-123', '新书名')

if (result.success) {
  console.log('标题更新成功:', result.data?.title)
} else {
  console.error('更新失败:', result.error)
}
```

**注意事项：**
- ✅ 自动 trim() 去除首尾空格
- ✅ 验证标题不为空
- ✅ 同时刷新 `/dashboard` 和 `/read/[bookId]` 缓存

---

## 📤 文件上传 Actions (`app/dashboard/upload/actions.ts`)

### **1. uploadEpub** - 上传 EPUB 文件

**功能：** 完整的文件上传流程

**签名：**
```typescript
async function uploadEpub(formData: FormData): Promise<UploadResult>
```

**参数：**
- `formData` (FormData) - 包含以下字段：
  - `file` (File) - EPUB 文件
  - `title` (string, 可选) - 书名（不提供则从文件名提取）

**返回值：**
```typescript
{
  success: boolean
  error?: string
  fileUrl?: string  // Storage 中的文件 URL
  bookId?: string   // 创建的书籍 ID
}
```

**使用示例：**
```tsx
'use client'

import { uploadEpub } from '@/app/dashboard/upload/actions'
import { useState } from 'react'

export default function UploadForm() {
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setUploading(true)
    
    const result = await uploadEpub(formData)
    
    if (result.success) {
      alert('上传成功！')
      console.log('书籍 ID:', result.bookId)
      console.log('文件 URL:', result.fileUrl)
    } else {
      alert(`上传失败: ${result.error}`)
    }
    
    setUploading(false)
  }

  return (
    <form action={handleSubmit}>
      <input 
        name="file" 
        type="file" 
        accept=".epub" 
        required 
      />
      <input 
        name="title" 
        type="text"
        placeholder="书名（可选）"
      />
      <button type="submit" disabled={uploading}>
        {uploading ? '上传中...' : '上传'}
      </button>
    </form>
  )
}
```

**完整流程：**
```
1. 获取文件和书名
   ↓
2. 验证文件存在
   ↓
3. 验证文件类型（.epub）
   ↓
4. 验证文件大小（≤ 50MB）
   ↓
5. 生成或验证书名
   ↓
6. 验证用户登录
   ↓
7. 生成唯一文件名（timestamp-random-originalName）
   ↓
8. 上传到 Storage（路径: user_id/fileName）
   ↓
9. 获取文件公开 URL
   ↓
10. 调用 createBookRecord() 创建数据库记录
   ↓
11. 如果失败，删除已上传的文件
   ↓
12. 返回结果
```

**文件命名规则：**
```
格式：{timestamp}-{randomStr}-{originalFileName}
示例：1732076400000-abc123-西游记.epub
```

**Storage 路径格式：**
```
user_books/{user_id}/{fileName}
示例：user_books/550e8400-e29b-41d4-a716-446655440000/1732076400000-abc123-西游记.epub
```

**限制：**
- 文件类型：仅 `.epub`
- 文件大小：最大 50MB
- 文件名长度：最大 100 字符（自动截断）

**可能的错误：**
- "请选择要上传的文件"
- "只支持 EPUB 格式的电子书"
- "文件大小不能超过 50MB"
- "书名不能为空"
- "请先登录"
- "文件已存在，请重试"
- "上传文件失败"
- "获取文件链接失败"
- "保存书籍信息失败"

---

### **2. validateEpubFile** - 验证文件

**功能：** 上传前预检查文件是否有效

**签名：**
```typescript
async function validateEpubFile(file: File): Promise<{
  valid: boolean
  error?: string
}>
```

**参数：**
- `file` (File) - 要验证的文件

**返回值：**
```typescript
{
  valid: boolean
  error?: string
}
```

**使用示例：**
```tsx
'use client'

import { validateEpubFile } from '@/app/dashboard/upload/actions'

function FileInput() {
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = await validateEpubFile(file)
    
    if (!validation.valid) {
      alert(validation.error)
      e.target.value = '' // 清空选择
    }
  }

  return (
    <input 
      type="file" 
      accept=".epub"
      onChange={handleChange}
    />
  )
}
```

**验证项：**
- ✅ 文件类型（.epub 扩展名或 MIME 类型）
- ✅ 文件大小（0 < size ≤ 50MB）
- ✅ 文件不为空

---

## 🎯 完整使用流程

### **场景 1：上传并显示书籍**

```tsx
// app/dashboard/upload/page.tsx
'use client'

import { uploadEpub } from './actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function UploadPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setUploading(true)
    setError('')

    const result = await uploadEpub(formData)

    if (result.success) {
      // 上传成功，返回书架
      router.push('/dashboard')
    } else {
      setError(result.error || '上传失败')
    }

    setUploading(false)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">上传书籍</h1>
      
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label>选择 EPUB 文件</label>
          <input 
            name="file" 
            type="file" 
            accept=".epub"
            required
            disabled={uploading}
          />
        </div>

        <div>
          <label>书名（可选）</label>
          <input 
            name="title" 
            type="text"
            placeholder="不填写则使用文件名"
            disabled={uploading}
          />
        </div>

        {error && (
          <div className="text-red-600">{error}</div>
        )}

        <button 
          type="submit"
          disabled={uploading}
        >
          {uploading ? '上传中...' : '上传'}
        </button>
      </form>
    </div>
  )
}
```

---

### **场景 2：显示书架**

```tsx
// app/dashboard/page.tsx
import { getUserBooks } from './actions'
import BookCard from '@/components/BookCard'

export default async function DashboardPage() {
  const result = await getUserBooks()

  if (!result.success) {
    return <div>加载失败: {result.error}</div>
  }

  const books = result.data || []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">我的书架</h1>
      
      {books.length === 0 ? (
        <div className="text-center text-gray-500">
          暂无书籍，去上传吧！
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {books.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### **场景 3：删除书籍**

```tsx
// components/BookCard.tsx
'use client'

import { deleteBook } from '@/app/dashboard/actions'
import { useState } from 'react'
import type { Book } from '@/utils/supabase/types'

export default function BookCard({ book }: { book: Book }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`确定要删除《${book.title}》吗？`)) {
      return
    }

    setDeleting(true)

    const result = await deleteBook(book.id)

    if (result.success) {
      // 删除成功，页面会自动刷新（revalidatePath）
    } else {
      alert(`删除失败: ${result.error}`)
      setDeleting(false)
    }
  }

  return (
    <div className="border rounded p-4">
      <h3 className="font-bold">{book.title}</h3>
      <p className="text-sm text-gray-500">
        {new Date(book.created_at).toLocaleDateString()}
      </p>
      
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="mt-2 text-red-600"
      >
        {deleting ? '删除中...' : '删除'}
      </button>
    </div>
  )
}
```

---

## 🔒 安全特性

### **1. 用户身份验证**
- ✅ 所有 actions 都验证用户登录状态
- ✅ 使用 `auth.getUser()` 获取当前用户

### **2. 数据隔离**
- ✅ 所有查询都添加 `eq('user_id', user.id)` 条件
- ✅ 用户只能访问自己的书籍
- ✅ Supabase RLS 作为第二层保护

### **3. 文件安全**
- ✅ 文件类型验证（仅 EPUB）
- ✅ 文件大小限制（50MB）
- ✅ 文件名安全处理（去除特殊字符）
- ✅ 文件路径隔离（每个用户独立目录）

### **4. 错误处理**
- ✅ 所有 actions 都有 try-catch
- ✅ 友好的错误信息
- ✅ 服务端日志记录
- ✅ 事务性操作（上传失败回滚）

---

## 📊 数据流程图

### 上传流程

```
用户选择文件
    ↓
前端表单提交 FormData
    ↓
uploadEpub() Server Action
    ↓
├─ 验证文件（类型、大小）
├─ 验证用户登录
├─ 上传到 Supabase Storage
├─ 获取文件 URL
└─ createBookRecord()
       ↓
   插入 books 表
       ↓
   revalidatePath('/dashboard')
       ↓
   返回成功 + bookId
```

### 删除流程

```
用户点击删除按钮
    ↓
deleteBook(bookId)
    ↓
├─ 验证用户登录
├─ 查询书籍（验证所有权）
├─ 提取文件路径
├─ 删除 Storage 文件
├─ 删除 books 表记录
│  └─ 级联删除 notes 表记录
└─ revalidatePath('/dashboard')
       ↓
   页面自动刷新
```

---

## ✅ 最佳实践

### **1. 错误处理**

```typescript
const result = await uploadEpub(formData)

if (!result.success) {
  // 显示错误信息
  setError(result.error || '操作失败')
  return
}

// 处理成功情况
console.log('书籍 ID:', result.bookId)
```

### **2. 加载状态**

```tsx
const [loading, setLoading] = useState(false)

async function handleAction() {
  setLoading(true)
  try {
    const result = await someAction()
    // 处理结果
  } finally {
    setLoading(false)
  }
}
```

### **3. 乐观更新**

```tsx
// revalidatePath 会自动刷新页面
// 无需手动更新 UI
await deleteBook(bookId)
// 页面会自动重新加载显示最新数据
```

---

**完成！** Server Actions 已完全实现，可以开始构建 UI 了。
