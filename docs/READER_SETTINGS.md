# 阅读器设置功能文档

完整的阅读器排版设置功能说明。

## 📦 组件文件

```
components/reader/
├── MobileReader.tsx          # 阅读器主组件
└── SettingsPanel.tsx         # 设置面板组件
```

---

## 🎨 设置面板 UI

### **布局结构**

```
┌─────────────────────────────────┐
│  遮罩层 (半透明黑色)             │
│                                 │
│  ┌───────────────────────────┐ │
│  │  ─  (拖动指示器)          │ │
│  ├───────────────────────────┤ │
│  │  阅读设置            [X]  │ │
│  ├───────────────────────────┤ │
│  │                           │ │
│  │  字号大小                 │ │
│  │  [小] [中] [大]           │ │
│  │                           │ │
│  │  阅读主题                 │ │
│  │  [☀️ 日间] [🌙 夜间]      │ │
│  │                           │ │
│  │  💡 提示信息              │ │
│  │                           │ │
│  ├───────────────────────────┤ │
│  │  [完成]                   │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🔧 功能实现

### **1. 字号调整**

#### **三个预设尺寸**

| 选项 | 值 | 说明 |
|------|-----|------|
| 小 | 80% | 适合小屏幕，显示更多内容 |
| 中 | 100% | 默认大小，标准阅读 |
| 大 | 140% | 适合老年人，更易阅读 |

#### **实现代码**

```typescript
// MobileReader.tsx

// 字号状态
const [fontSize, setFontSize] = useState<number>(100)

// 监听字号变化，应用到 rendition
useEffect(() => {
  if (renditionRef.current) {
    const themes = renditionRef.current.themes
    themes.fontSize(`${fontSize}%`)
  }
}, [fontSize])
```

#### **API 调用**

```typescript
rendition.themes.fontSize('100%')  // 设置字体大小
```

---

### **2. 主题切换**

#### **两种主题**

| 主题 | 说明 | 颜色方案 |
|------|------|---------|
| 日间模式 | 适合白天阅读 | 黑字白底 |
| 夜间模式 | 适合夜晚阅读 | 白字黑底 |

#### **实现代码**

```typescript
// MobileReader.tsx

// 主题状态
const [theme, setTheme] = useState<'light' | 'dark'>('light')

// 监听主题变化，应用到 rendition
useEffect(() => {
  if (renditionRef.current) {
    const themes = renditionRef.current.themes
    
    if (theme === 'dark') {
      // 注册夜间模式
      themes.register('dark', {
        body: {
          background: '#1a1a1a !important',
          color: '#e0e0e0 !important',
        },
        'p, div, span, h1, h2, h3, h4, h5, h6': {
          color: '#e0e0e0 !important',
        },
        a: {
          color: '#60a5fa !important',
        },
      })
      themes.select('dark')
    } else {
      // 注册日间模式
      themes.register('light', {
        body: {
          background: '#ffffff !important',
          color: '#000000 !important',
        },
        'p, div, span, h1, h2, h3, h4, h5, h6': {
          color: '#000000 !important',
        },
        a: {
          color: '#2563eb !important',
        },
      })
      themes.select('light')
    }
  }
}, [theme])
```

#### **颜色配置**

##### **日间模式**
```css
背景色: #ffffff (白色)
文字色: #000000 (黑色)
链接色: #2563eb (蓝色)
```

##### **夜间模式**
```css
背景色: #1a1a1a (深灰)
文字色: #e0e0e0 (浅灰)
链接色: #60a5fa (亮蓝)
```

---

## 🎯 SettingsPanel 组件

### **Props 接口**

```typescript
interface SettingsPanelProps {
  isOpen: boolean                           // 是否显示
  onClose: () => void                       // 关闭回调
  fontSize: number                          // 当前字号
  onFontSizeChange: (size: number) => void  // 字号变化回调
  theme: 'light' | 'dark'                   // 当前主题
  onThemeChange: (theme: 'light' | 'dark') => void  // 主题变化回调
}
```

### **使用示例**

```tsx
import SettingsPanel from '@/components/reader/SettingsPanel'

function Reader() {
  const [isOpen, setIsOpen] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  return (
    <>
      <button onClick={() => setIsOpen(true)}>设置</button>
      
      <SettingsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        theme={theme}
        onThemeChange={setTheme}
      />
    </>
  )
}
```

---

## 🎨 UI 特性

### **1. 动画效果**

```css
/* 遮罩层淡入 */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 面板上滑 */
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

### **2. 交互状态**

- ✅ 悬停效果（hover）
- ✅ 激活状态（active）
- ✅ 选中高亮（border + background）
- ✅ 平滑过渡（transition）

### **3. 响应式设计**

- ✅ 移动端优先
- ✅ 触摸友好
- ✅ 大按钮（易于点击）
- ✅ 清晰的视觉反馈

---

## 🔍 技术细节

### **1. EPUB.js Themes API**

```typescript
// 获取 themes 对象
const themes = rendition.themes

// 设置字体大小
themes.fontSize('120%')

// 注册自定义主题
themes.register('myTheme', {
  body: { background: '#fff' },
  h1: { color: '#000' }
})

// 选择主题
themes.select('myTheme')

// 覆盖样式
themes.override('color', '#000')
themes.override('background', '#fff')
```

### **2. 为什么使用 !important**

```css
/* EPUB 文件可能有自己的样式 */
body {
  background: #fff;  /* 可能被覆盖 */
}

/* 使用 !important 确保生效 */
body {
  background: #fff !important;  /* ✅ 强制应用 */
}
```

### **3. CSS 选择器优先级**

```typescript
themes.register('dark', {
  // 应用到所有文本元素
  'p, div, span, h1, h2, h3, h4, h5, h6': {
    color: '#e0e0e0 !important',
  },
  // 特殊处理链接
  a: {
    color: '#60a5fa !important',
  },
})
```

---

## 🎯 使用流程

### **用户视角**

```
1. 阅读书籍
   ↓
2. 点击右上角设置按钮 ⚙️
   ↓
3. 面板从底部滑出
   ↓
4. 选择字号（小/中/大）
   → 文字大小立即改变
   ↓
5. 切换主题（日间/夜间）
   → 背景和文字颜色立即改变
   ↓
6. 点击"完成"或遮罩关闭面板
   ↓
7. 继续阅读
```

### **技术流程**

```
1. 点击设置按钮
   ↓
2. setIsSettingsOpen(true)
   ↓
3. SettingsPanel 渲染（带动画）
   ↓
4. 用户修改字号/主题
   ↓
5. setState 更新状态
   ↓
6. useEffect 监听到变化
   ↓
7. 调用 rendition.themes API
   ↓
8. EPUB 内容立即更新
```

---

## 💾 未来扩展

### **字号调整增强**

```typescript
// 添加滑动条
const [fontSize, setFontSize] = useState(100)

<input
  type="range"
  min="80"
  max="200"
  step="10"
  value={fontSize}
  onChange={(e) => setFontSize(Number(e.target.value))}
/>
```

### **更多主题**

```typescript
// 添加护眼模式、羊皮纸等
const themes = [
  { name: '日间', bg: '#ffffff', color: '#000000' },
  { name: '夜间', bg: '#1a1a1a', color: '#e0e0e0' },
  { name: '护眼', bg: '#e8f5e0', color: '#1a1a1a' },
  { name: '羊皮纸', bg: '#f4e8c9', color: '#5c4a2f' },
]
```

### **字体选择**

```typescript
// 添加字体切换
const fonts = ['默认', '宋体', '黑体', '楷体']

themes.font('SimSun')  // 设置字体
```

### **行间距调整**

```typescript
// 添加行间距设置
themes.override('line-height', '1.8')
```

### **页边距调整**

```typescript
// 添加页边距设置
themes.override('padding', '20px')
```

---

## 🐛 常见问题

### Q: 设置不生效

**原因**：renditionRef 为 null

**解决**：
```typescript
useEffect(() => {
  if (!renditionRef.current) {
    console.warn('Rendition 未就绪')
    return
  }
  // 应用设置
}, [fontSize, theme])
```

---

### Q: 主题切换后文字颜色不变

**原因**：EPUB 文件有内联样式

**解决**：使用 `!important` 强制应用

```typescript
themes.register('dark', {
  body: {
    background: '#1a1a1a !important',  // ✅ 强制
    color: '#e0e0e0 !important',
  },
})
```

---

### Q: 字号变化不平滑

**原因**：EPUB.js 会重新渲染内容

**解决**：这是正常的，因为需要重新计算布局

---

### Q: 设置是否会保存

**状态**：当前未保存，刷新页面会重置

**计划**：使用 localStorage 或数据库保存

```typescript
// 保存到 localStorage
useEffect(() => {
  localStorage.setItem('fontSize', String(fontSize))
  localStorage.setItem('theme', theme)
}, [fontSize, theme])

// 加载时恢复
useEffect(() => {
  const savedFontSize = localStorage.getItem('fontSize')
  const savedTheme = localStorage.getItem('theme')
  
  if (savedFontSize) setFontSize(Number(savedFontSize))
  if (savedTheme) setTheme(savedTheme as 'light' | 'dark')
}, [])
```

---

## ✅ 功能清单

### **已实现 ✅**
- [x] 字号调整（3个预设）
- [x] 主题切换（日间/夜间）
- [x] 实时预览（立即生效）
- [x] 精美的 UI 设计
- [x] 平滑动画效果
- [x] 触摸友好

### **待实现 ⏳**
- [ ] 设置持久化（localStorage/数据库）
- [ ] 字号滑动条（更精细控制）
- [ ] 更多主题（护眼、羊皮纸）
- [ ] 字体选择
- [ ] 行间距调整
- [ ] 页边距调整
- [ ] 页面宽度调整

---

## 📚 相关文档

- [MobileReader 组件](./MOBILE_READER.md)
- [EPUB.js Themes 文档](https://github.com/futurepress/epub.js/wiki/Themes)

---

**版本**: v1.0  
**最后更新**: 2025-11-20  
**状态**: ✅ 基础功能完成
