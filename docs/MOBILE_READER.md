# MobileReader 组件使用指南

完整的 EPUB 阅读器组件文档。

## 📦 组件概览

```tsx
<MobileReader
  url={book.file_url}
  title={book.title}
  bookId={book.id}
/>
```

**文件位置**: `components/reader/MobileReader.tsx`

---

## 🎨 界面布局

```
┌─────────────────────────────────────┐
│  Header (50px)                      │
│  [←] 返回书架    书名        [⚙️]   │
├─────────────────────────────────────┤
│                                     │
│                                     │
│          EPUB 阅读区域               │
│        (ReactReader 组件)           │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  Footer (60px)                      │
│  [← 上一页]  Chapter 1  [下一页 →] │
│               50%                   │
└─────────────────────────────────────┘
```

---

## 🔧 技术实现

### **1. 动态导入（禁用 SSR）**

```typescript
const ReactReader = dynamic(
  () => import('react-reader').then((mod) => mod.ReactReader),
  { 
    ssr: false,  // 关键：禁用服务端渲染
    loading: () => <Loader2 />,
  }
)
```

**为什么需要禁用 SSR？**
- EPUB.js 依赖浏览器 DOM API
- 服务端没有 `window`, `document` 等对象
- 必须在客户端加载和渲染

---

### **2. 状态管理**

```typescript
// 当前阅读位置（EPUB CFI 格式）
const [location, setLocation] = useState<string | number>(0)

// 当前章节名称
const [currentChapter, setCurrentChapter] = useState<string>('加载中...')

// 阅读进度（百分比）
const [progress, setProgress] = useState<number>(0)

// Rendition 引用（用于控制翻页）
const renditionRef = useRef<Rendition | null>(null)
```

**EPUB CFI (Canonical Fragment Identifier)**
- EPUB 标准的位置标识符
- 格式示例：`epubcfi(/6/4[chap01ref]!/4/2/1:3)`
- 可以精确定位到字符级别

---

### **3. 翻页实现**

```typescript
// 上一页
const handlePrevPage = useCallback(() => {
  if (renditionRef.current) {
    renditionRef.current.prev()
  }
}, [])

// 下一页
const handleNextPage = useCallback(() => {
  if (renditionRef.current) {
    renditionRef.current.next()
  }
}, [])
```

**Rendition 对象**
- EPUB.js 的核心对象
- 控制渲染、翻页、样式等
- 通过 `getRendition` 回调获取

---

### **4. 进度计算**

```typescript
const handleLocationChanged = useCallback((epubcfi: string) => {
  setLocation(epubcfi)
  
  if (renditionRef.current) {
    const { displayed, total } = renditionRef.current.location.start
    if (total > 0) {
      // 计算百分比
      const percentage = Math.round((displayed.page / total.pages) * 100)
      setProgress(percentage)
    }
  }
}, [])
```

**进度计算逻辑：**
```
当前页 / 总页数 × 100% = 阅读进度
```

---

### **5. 章节标题获取**

```typescript
const handleRenditionReady = useCallback((rendition: Rendition) => {
  renditionRef.current = rendition
  
  // 监听位置变化
  rendition.on('relocated', (location: any) => {
    // 获取当前章节
    const currentSection = rendition.book.navigation.get(location.start.href)
    if (currentSection) {
      setCurrentChapter(currentSection.label || '正在阅读')
    }
  })
}, [])
```

---

## 📱 ReactReader 配置

### **核心 Props**

```typescript
<ReactReader
  url={url}                           // EPUB 文件 URL
  location={location}                 // 当前位置
  locationChanged={handleLocationChanged}  // 位置变化回调
  getRendition={handleRenditionReady}     // 获取 rendition 对象
  swipeable={false}                   // 禁用滑动翻页
  epubOptions={{
    flow: 'paginated',                // 分页模式
    manager: 'default',
  }}
  epubInitOptions={{
    openAs: 'epub',
  }}
  readerStyles={readerStyles}         // 自定义样式
/>
```

### **为什么 swipeable={false}？**

- 避免与移动端手势冲突
- 使用自定义按钮更可控
- 更好的用户体验

---

## 🎨 自定义样式

### **隐藏默认 UI 元素**

```typescript
const readerStyles = {
  // 隐藏默认翻页箭头
  arrow: {
    display: 'none',
  },
  arrowHover: {
    display: 'none',
  },
  
  // 隐藏默认目录按钮
  tocArea: {
    display: 'none',
  },
  tocButton: {
    display: 'none',
  },
  
  // 自定义容器样式
  container: {
    overflow: 'hidden',
    height: '100%',
  },
  readerArea: {
    position: 'relative' as const,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
}
```

---

## 🎯 使用示例

### **基础使用**

```tsx
// app/read/[id]/page.tsx
import MobileReader from '@/components/reader/MobileReader'

export default async function ReadPage({ params }) {
  const { id } = await params
  const book = await getBook(id)
  
  return (
    <div className="h-screen">
      <MobileReader
        url={book.file_url}
        title={book.title}
        bookId={book.id}
      />
    </div>
  )
}
```

---

## ⌨️ 键盘快捷键（可选）

### **添加键盘支持**

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevPage()
    } else if (e.key === 'ArrowRight') {
      handleNextPage()
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [handlePrevPage, handleNextPage])
```

**快捷键：**
- `←` 上一页
- `→` 下一页
- `Home` 跳到开头（待实现）
- `End` 跳到结尾（待实现）

---

## 🎨 主题定制 ✅

### **夜间模式**

```typescript
const [theme, setTheme] = useState<'light' | 'dark'>('light')

useEffect(() => {
  if (renditionRef.current) {
    const themes = renditionRef.current.themes
    if (theme === 'dark') {
      themes.register('dark', {
        body: {
          background: '#1a1a1a !important',
          color: '#e0e0e0 !important',
        },
        'p, div, span, h1, h2, h3, h4, h5, h6': {
          color: '#e0e0e0 !important',
        },
      })
      themes.select('dark')
    } else {
      themes.register('light', {
        body: {
          background: '#ffffff !important',
          color: '#000000 !important',
        },
      })
      themes.select('light')
    }
  }
}, [theme])
```

---

### **字体大小调整**

```typescript
const [fontSize, setFontSize] = useState(100)  // 百分比

useEffect(() => {
  if (renditionRef.current) {
    const themes = renditionRef.current.themes
    themes.fontSize(`${fontSize}%`)
  }
}, [fontSize])
```

---

### **设置面板**

点击顶部设置按钮打开设置面板：

```tsx
<SettingsPanel
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  fontSize={fontSize}
  onFontSizeChange={setFontSize}
  theme={theme}
  onThemeChange={setTheme}
/>
```

详见：[阅读器设置文档](./READER_SETTINGS.md)

---

## 💾 进度保存（待实现）

### **保存阅读位置**

```typescript
// 防抖保存
const debouncedSave = useMemo(
  () => debounce(async (location: string) => {
    await supabase
      .from('reading_progress')
      .upsert({
        book_id: bookId,
        location: location,
        updated_at: new Date().toISOString(),
      })
  }, 1000),
  [bookId]
)

useEffect(() => {
  if (location && typeof location === 'string') {
    debouncedSave(location)
  }
}, [location, debouncedSave])
```

### **加载保存的进度**

```typescript
useEffect(() => {
  async function loadProgress() {
    const { data } = await supabase
      .from('reading_progress')
      .select('location')
      .eq('book_id', bookId)
      .single()
    
    if (data?.location) {
      setLocation(data.location)
    }
  }
  
  loadProgress()
}, [bookId])
```

---

## 🐛 常见问题

### Q: 阅读器显示空白

**原因**：EPUB 文件加载失败或格式错误

**解决**：
1. 检查 `url` 是否正确
2. 打开浏览器控制台查看错误
3. 测试 EPUB 文件是否损坏
4. 检查 CORS 配置（Supabase Storage）

---

### Q: 翻页按钮不工作

**原因**：`renditionRef.current` 为 null

**解决**：
1. 确认 `getRendition` 回调被调用
2. 添加日志检查：
```typescript
useEffect(() => {
  console.log('Rendition:', renditionRef.current)
}, [])
```

---

### Q: 进度显示为 0%

**原因**：EPUB 没有分页信息或计算错误

**解决**：
1. 检查 `locationChanged` 是否被触发
2. 添加调试日志：
```typescript
const handleLocationChanged = (epubcfi: string) => {
  console.log('Location:', epubcfi)
  console.log('Progress:', renditionRef.current?.location)
}
```

---

### Q: 章节标题不显示

**原因**：EPUB 没有目录信息

**解决**：
- 某些 EPUB 文件可能没有完整的导航信息
- 显示默认文字"正在阅读"

---

## 📊 性能优化

### **1. 使用 useCallback**

```typescript
// ✅ 好：使用 useCallback 避免重复创建函数
const handlePrevPage = useCallback(() => {
  renditionRef.current?.prev()
}, [])

// ❌ 差：每次渲染都创建新函数
const handlePrevPage = () => {
  renditionRef.current?.prev()
}
```

### **2. 防抖进度保存**

```typescript
// 避免频繁写入数据库
const debouncedSave = useMemo(
  () => debounce(saveProgress, 1000),
  [bookId]
)
```

### **3. 懒加载**

```typescript
// ✅ 使用 dynamic import
const ReactReader = dynamic(() => import('react-reader'))

// ❌ 直接导入会增加首屏加载时间
import { ReactReader } from 'react-reader'
```

---

## 🎨 UI 增强建议

### **1. 添加加载骨架屏**

```tsx
{loading && (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4" />
    <div className="h-4 bg-gray-200 rounded mb-2" />
    <div className="h-4 bg-gray-200 rounded w-3/4" />
  </div>
)}
```

### **2. 添加错误边界**

```tsx
class ReaderErrorBoundary extends React.Component {
  state = { hasError: false }
  
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  
  render() {
    if (this.state.hasError) {
      return <div>加载书籍失败</div>
    }
    return this.props.children
  }
}
```

### **3. 添加手势提示**

```tsx
{firstTimeUser && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6">
      <p>点击底部按钮翻页</p>
      <button onClick={dismiss}>知道了</button>
    </div>
  </div>
)}
```

---

## ✅ 功能清单

### 已实现 ✅
- [x] 加载 EPUB 文件
- [x] 渲染书籍内容
- [x] 翻页功能（按钮）
- [x] 进度显示
- [x] 章节标题显示
- [x] 返回书架
- [x] 响应式布局
- [x] 动态导入（SSR 优化）
- [x] 字号调整（小/中/大）
- [x] 主题切换（日间/夜间）
- [x] 设置面板 UI

### 待实现 ⏳
- [ ] 进度保存/恢复
- [ ] 设置持久化（localStorage）
- [ ] 键盘快捷键
- [ ] 目录导航
- [ ] 书签功能
- [ ] 高亮和笔记
- [ ] 搜索功能
- [ ] 全屏模式
- [ ] 触摸手势（滑动翻页）
- [ ] 更多主题选项

---

## 📚 相关文档

- [EPUB.js 文档](https://github.com/futurepress/epub.js)
- [React-Reader 文档](https://github.com/gerhardsletten/react-reader)
- [阅读器页面文档](./READER_PAGE.md)

---

**当前版本**: v1.0 - 基础阅读功能完成
