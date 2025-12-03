# Server Actions 快速参考

所有 Server Actions 的快速查询表。

## 📚 书籍管理 (`app/dashboard/actions.ts`)

| 函数 | 参数 | 返回值 | 用途 |
|------|------|--------|------|
| **createBookRecord** | `fileUrl`, `title`, `filePath` | `ActionResult<Book>` | 创建书籍记录 |
| **deleteBook** | `bookId` | `ActionResult` | 删除书籍和文件 |
| **getUserBooks** | - | `ActionResult<Book[]>` | 获取书籍列表 |
| **getBook** | `bookId` | `ActionResult<Book>` | 获取单本书籍 |
| **updateBookTitle** | `bookId`, `newTitle` | `ActionResult<Book>` | 更新书名 |

---

## 📤 文件上传 (`app/dashboard/upload/actions.ts`)

| 函数 | 参数 | 返回值 | 用途 |
|------|------|--------|------|
| **uploadEpub** | `FormData` | `UploadResult` | 上传 EPUB 文件 |
| **validateEpubFile** | `File` | `{ valid, error }` | 验证文件 |

---

## 🔐 认证 (`app/login/actions.ts` & `app/actions/auth.ts`)

| 函数 | 参数 | 返回值 | 用途 |
|------|------|--------|------|
| **login** | `FormData` | `never` (redirect) | 用户登录 |
| **signup** | `FormData` | `never` (redirect) | 用户注册 |
| **signOut** | - | `never` (redirect) | 用户登出 |
| **getCurrentUser** | - | `User \| null` | 获取当前用户 |
| **isAuthenticated** | - | `boolean` | 检查登录状态 |
| **getUserEmail** | - | `string \| null` | 获取用户邮箱 |
| **updatePassword** | `newPassword` | `ActionResult` | 更新密码 |
| **sendPasswordResetEmail** | `email` | `ActionResult` | 发送重置邮件 |

---

## 🎯 常用代码片段

### 上传文件

```tsx
import { uploadEpub } from '@/app/dashboard/upload/actions'

async function handleUpload(formData: FormData) {
  const result = await uploadEpub(formData)
  if (result.success) {
    console.log('书籍 ID:', result.bookId)
  }
}
```

### 获取书籍列表

```tsx
import { getUserBooks } from '@/app/dashboard/actions'

const result = await getUserBooks()
const books = result.data || []
```

### 删除书籍

```tsx
import { deleteBook } from '@/app/dashboard/actions'

const result = await deleteBook(bookId)
if (result.success) {
  console.log('删除成功')
}
```

### 更新书名

```tsx
import { updateBookTitle } from '@/app/dashboard/actions'

const result = await updateBookTitle(bookId, '新书名')
```

---

## 📋 类型定义

### ActionResult<T>

```typescript
type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}
```

### UploadResult

```typescript
type UploadResult = {
  success: boolean
  error?: string
  fileUrl?: string
  bookId?: string
}
```

### Book

```typescript
type Book = {
  id: string
  user_id: string
  title: string
  file_url: string
  created_at: string
}
```

---

## ⚠️ 常见错误

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| "请先登录" | 用户未登录 | 重定向到 /login |
| "缺少必需参数" | 参数不完整 | 检查函数调用 |
| "只支持 EPUB 格式" | 文件类型错误 | 选择 .epub 文件 |
| "文件大小不能超过 50MB" | 文件太大 | 压缩或选择其他文件 |
| "书籍不存在或无权限访问" | bookId 错误或权限不足 | 检查 ID 和用户权限 |

---

## 🔄 数据刷新

所有修改操作都会自动调用 `revalidatePath()`：

- `createBookRecord()` → 刷新 `/dashboard`
- `deleteBook()` → 刷新 `/dashboard`
- `updateBookTitle()` → 刷新 `/dashboard` 和 `/read/[bookId]`

**无需手动刷新页面！**

---

## 🚀 快速开始

1. **上传书籍**
```tsx
<form action={uploadEpub}>
  <input name="file" type="file" accept=".epub" />
  <input name="title" type="text" placeholder="书名" />
  <button type="submit">上传</button>
</form>
```

2. **显示书架**
```tsx
const { data: books } = await getUserBooks()
books?.map(book => <BookCard key={book.id} book={book} />)
```

3. **删除书籍**
```tsx
<button onClick={() => deleteBook(bookId)}>删除</button>
```

---

## 📚 相关文档

- [完整文档](./DASHBOARD_ACTIONS.md) - 详细说明和示例
- [认证文档](./AUTH.md) - 认证系统完整文档
- [类型定义](../utils/supabase/types.ts) - TypeScript 类型

---

**提示：** 所有 Server Actions 都包含完整的错误处理和类型安全！
