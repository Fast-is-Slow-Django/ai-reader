# BookUploader 组件使用指南

书籍上传组件的完整使用文档。

## 📁 组件文件

```
components/dashboard/
├── BookUploader.tsx                    # 基础版上传组件
└── BookUploaderWithProgress.tsx        # 增强版（带进度条）
```

---

## 🎨 组件对比

| 特性 | BookUploader | BookUploaderWithProgress |
|------|--------------|--------------------------|
| 基础上传 | ✅ | ✅ |
| 点击上传 | ✅ | ✅ |
| 拖拽上传 | ❌ | ✅ |
| 进度条 | ❌ | ✅ |
| 文件预览 | ❌ | ✅ |
| 取消选择 | ❌ | ✅ |
| 文件大小 | 小 | 较大 |
| 推荐场景 | 简单书架 | 专业上传页 |

---

## 📦 BookUploader（基础版）

### **特点**

- ✅ 简洁设计，虚线边框卡片
- ✅ 点击触发文件选择
- ✅ 自动上传和创建记录
- ✅ 加载状态显示
- ✅ 成功/失败提示

### **使用方法**

```tsx
import BookUploader from '@/components/dashboard/BookUploader'

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <BookUploader />
      {/* 其他书籍卡片 */}
    </div>
  )
}
```

### **样式说明**

```tsx
// 默认状态
border-2 border-dashed border-gray-300
hover:border-blue-500 hover:bg-gray-50

// 上传中
border-blue-400 bg-blue-50

// 成功状态
显示绿色对勾图标
```

### **工作流程**

```
1. 用户点击卡片
   ↓
2. 触发文件选择器
   ↓
3. 验证文件类型（.epub）
   ↓
4. 验证文件大小（≤ 50MB）
   ↓
5. 上传到 Storage
   ↓
6. 获取公开 URL
   ↓
7. 调用 createBookRecord()
   ↓
8. 显示成功提示
   ↓
9. 自动刷新（revalidatePath）
```

### **错误处理**

```typescript
// 文件类型错误
alert('只支持 EPUB 格式的电子书')

// 文件过大
alert('文件大小不能超过 50MB\n当前文件：XX.XX MB')

// 上传失败
alert('上传失败：[错误信息]')

// 失败时自动清理已上传的文件
await supabase.storage.from('user_books').remove([filePath])
```

---

## 🚀 BookUploaderWithProgress（增强版）

### **特点**

- ✅ 拖拽上传支持
- ✅ 实时进度条（0-100%）
- ✅ 文件信息预览
- ✅ 可取消选择
- ✅ 详细状态显示

### **使用方法**

```tsx
import BookUploaderWithProgress from '@/components/dashboard/BookUploaderWithProgress'

export default function UploadPage() {
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">上传书籍</h1>
      <BookUploaderWithProgress />
    </div>
  )
}
```

### **交互流程**

```
1. 初始状态
   - 显示"点击或拖拽"提示
   - 虚线边框
   
2. 文件选择
   - 点击触发文件选择器
   - 或拖拽文件到区域
   
3. 文件预览
   - 显示文件名和大小
   - 显示"开始上传"和"取消"按钮
   
4. 上传中
   - 显示进度条（10% → 20% → 70% → 85% → 100%）
   - 显示当前状态文字
   
5. 上传成功
   - 显示绿色对勾
   - 弹出成功提示
   - 自动重置
```

### **进度阶段**

| 进度 | 阶段 | 说明 |
|------|------|------|
| 10% | 准备上传 | 初始化 |
| 20% | 正在上传文件 | 开始上传 |
| 70% | 获取文件链接 | 上传完成 |
| 85% | 保存书籍信息 | 创建记录 |
| 100% | 上传成功 | 完成 |

### **拖拽功能**

```tsx
// 拖拽悬停效果
onDragOver={handleDragOver}
// 边框变蓝，背景高亮，卡片放大

onDragLeave={handleDragLeave}
// 恢复原样

onDrop={handleDrop}
// 读取文件并验证
```

---

## 🎯 完整示例

### **示例 1：简单书架页面**

```tsx
// app/dashboard/page.tsx
import { getUserBooks } from './actions'
import BookUploader from '@/components/dashboard/BookUploader'
import BookCard from '@/components/BookCard'

export default async function DashboardPage() {
  const result = await getUserBooks()
  const books = result.data || []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">我的书架</h1>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* 上传器放在第一个位置 */}
        <BookUploader />
        
        {/* 书籍卡片 */}
        {books.map(book => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>

      {books.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p>还没有书籍</p>
          <p className="text-sm mt-2">点击上方卡片上传你的第一本书</p>
        </div>
      )}
    </div>
  )
}
```

---

### **示例 2：专业上传页面**

```tsx
// app/dashboard/upload/page.tsx
import BookUploaderWithProgress from '@/components/dashboard/BookUploaderWithProgress'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft size={20} />
          返回书架
        </Link>

        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            上传书籍
          </h1>
          <p className="text-gray-600">
            上传 EPUB 格式的电子书到你的书架
          </p>
        </div>

        {/* 上传组件 */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <BookUploaderWithProgress />
        </div>

        {/* 提示信息 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">上传说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 支持 EPUB 格式的电子书</li>
            <li>• 文件大小不超过 50MB</li>
            <li>• 支持点击选择或拖拽上传</li>
            <li>• 上传后会自动提取书名</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
```

---

### **示例 3：响应式布局**

```tsx
// 移动端优化
<div className="
  grid 
  grid-cols-2        // 手机：2列
  sm:grid-cols-3     // 平板：3列
  md:grid-cols-4     // 笔记本：4列
  lg:grid-cols-5     // 桌面：5列
  xl:grid-cols-6     // 大屏：6列
  gap-4
">
  <BookUploader />
  {/* 书籍卡片 */}
</div>
```

---

## 🎨 样式自定义

### **修改卡片比例**

```tsx
// 默认 3:4 比例（类似书籍封面）
aspect-[3/4]

// 修改为正方形
aspect-square

// 修改为 16:9
aspect-video
```

### **修改主题色**

```tsx
// 搜索并替换
border-blue-500  → border-green-500
bg-blue-50       → bg-green-50
text-blue-600    → text-green-600
```

### **修改上传图标**

```tsx
// 替换 Plus 图标
import { Upload, CloudUpload, FolderPlus } from 'lucide-react'

<Upload size={32} />         // 上传箭头
<CloudUpload size={32} />    // 云上传
<FolderPlus size={32} />     // 文件夹加号
```

---

## 🔧 高级用法

### **自定义成功回调**

```tsx
// 修改 BookUploader.tsx
// 在上传成功后：

setProgress('上传成功！')

// 添加自定义逻辑
onUploadSuccess?.(result.data)  // 回调函数

// 或路由跳转
router.push(`/read/${result.data?.id}`)
```

### **添加文件预览**

```tsx
// 在文件选择后，添加封面提取逻辑
// 使用 epubjs 提取封面图
import ePub from 'epubjs'

const book = ePub(file)
const cover = await book.coverUrl()
setCoverPreview(cover)
```

### **批量上传**

```tsx
// 修改 input 添加 multiple 属性
<input
  type="file"
  accept=".epub"
  multiple  // 允许多选
  onChange={handleMultipleFiles}
/>

// 处理多个文件
async function handleMultipleFiles(files: FileList) {
  for (const file of Array.from(files)) {
    await uploadBook(file)
  }
}
```

---

## 📊 性能优化

### **1. 大文件分片上传**

```typescript
// 对于超大文件，可以使用分片上传
// Supabase Storage 支持 resumable upload

const { data, error } = await supabase.storage
  .from('user_books')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    // 添加分片配置
    duplex: 'half',
  })
```

### **2. 上传队列**

```typescript
// 如果需要批量上传，使用队列避免并发过多
const queue = files.map(file => () => uploadBook(file))

for (const task of queue) {
  await task()  // 串行上传
}
```

### **3. 错误重试**

```typescript
async function uploadWithRetry(file: File, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadBook(file)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}
```

---

## 🐛 常见问题

### Q: 上传后页面没有刷新

**原因**：`createBookRecord` 调用了 `revalidatePath`，但需要等待

**解决**：检查是否在 Server Component 中，或添加手动刷新

```tsx
import { useRouter } from 'next/navigation'

const router = useRouter()
// 上传成功后
router.refresh()
```

---

### Q: 拖拽上传不工作

**原因**：CSS pointer-events 或事件冲突

**解决**：检查父容器的 CSS，确保没有 `pointer-events: none`

---

### Q: 文件名乱码

**原因**：文件名包含特殊字符

**解决**：已处理，使用正则替换特殊字符

```typescript
const originalName = file.name
  .replace(/[^a-zA-Z0-9.\u4e00-\u9fa5-]/g, '_')
```

---

### Q: 上传速度慢

**可能原因**：
1. 文件太大
2. 网络慢
3. Supabase 服务器地区

**优化**：
- 压缩 EPUB 文件
- 使用 CDN
- 选择就近的 Supabase 区域

---

## ✅ 检查清单

部署前确认：

- [ ] 文件类型验证正常（仅 EPUB）
- [ ] 文件大小验证正常（≤ 50MB）
- [ ] 上传成功后自动刷新
- [ ] 上传失败时清理文件
- [ ] 错误信息友好清晰
- [ ] 移动端显示正常
- [ ] 拖拽功能正常（增强版）
- [ ] 进度条显示正常（增强版）

---

## 📚 相关文档

- [Server Actions 文档](./DASHBOARD_ACTIONS.md)
- [Supabase Storage 文档](https://supabase.com/docs/guides/storage)

---

**完成！** 上传组件已完全实现，可以直接使用。
