# 两点选词功能文档

AI-Reader 的核心交互功能 - 两点选词实现完整文档。

## 🎯 功能概述

**两点选词**是 AI 解释功能的基础交互方式：

1. 用户点击文本起点 → 显示黄色高亮
2. 用户点击文本终点 → 显示绿色高亮
3. 提取选中文本 → 准备调用 AI 解释

---

## 🏗️ 架构设计

### **状态机**

```
┌─────────┐
│  IDLE   │ ← 初始状态
└────┬────┘
     │ 第一次点击
     ↓
┌──────────────────────┐
│ WAITING_SECOND_CLICK │
└────┬─────────────────┘
     │ 第二次点击
     ↓
┌─────────┐
│  IDLE   │ ← 重置状态
└─────────┘
```

### **数据流**

```
点击事件
  ↓
getCfiFromClick()
  ↓ 返回 CFI
handleFirstClick() or handleSecondClick()
  ↓
添加高亮 / 提取文本
  ↓
触发 AI 解释 (TODO)
```

---

## 📝 核心实现

### **1. 状态定义**

```typescript
// 选择状态
const [selectionState, setSelectionState] = useState<
  'IDLE' | 'WAITING_SECOND_CLICK'
>('IDLE')

// 第一次点击的 CFI
const [firstCfi, setFirstCfi] = useState<string | null>(null)

// 临时高亮的键
const tempHighlightKey = useRef<string | null>(null)
```

### **2. 监听点击事件**

```typescript
const handleRenditionReady = useCallback((rendition: Rendition) => {
  renditionRef.current = rendition
  
  // 监听点击事件
  rendition.on('click', (event: MouseEvent) => {
    handleTextSelection(event, rendition)
  })
  
  console.log('✅ 两点选词功能已启用')
}, [])
```

### **3. 点击处理逻辑**

```typescript
const handleTextSelection = useCallback((
  event: MouseEvent,
  rendition: Rendition
) => {
  // 阻止默认行为
  event.preventDefault()
  event.stopPropagation()
  
  // 获取点击位置的 CFI
  const cfi = getCfiFromClick(event, rendition)
  
  if (!cfi) return
  
  if (selectionState === 'IDLE') {
    // 第一次点击
    handleFirstClick(cfi, rendition)
  } else if (selectionState === 'WAITING_SECOND_CLICK' && firstCfi) {
    // 第二次点击
    handleSecondClick(firstCfi, cfi, rendition)
  }
}, [selectionState, firstCfi])
```

---

## 🎯 CFI（Canonical Fragment Identifier）

### **什么是 CFI？**

CFI 是 EPUB 标准的位置标识符，可以精确定位到：
- 章节
- 段落
- 句子
- **字符级别**

### **CFI 格式示例**

```
epubcfi(/6/4[chap01ref]!/4/2/1:3)
         │ │ └────┬────┘ │ │ │ └─ 字符偏移
         │ │      │      │ │ └─── 节点索引
         │ │      │      │ └───── 元素索引
         │ │      │      └─────── 段落索引
         │ │      └────────────── 章节 ID
         │ └───────────────────── 脊柱索引
         └─────────────────────── 根
```

### **获取 CFI**

```typescript
const getCfiFromClick = useCallback((
  event: MouseEvent,
  rendition: Rendition
): string | null => {
  try {
    let target = event.target as Node
    
    // 递归查找最近的文本/元素节点
    while (
      target &&
      target.nodeType !== Node.TEXT_NODE &&
      target.nodeType !== Node.ELEMENT_NODE
    ) {
      target = target.parentNode as Node
    }
    
    if (!target) return null
    
    // 获取当前章节的 contents
    const contentsArray = rendition.getContents() as unknown as any[]
    const contents = contentsArray[0]
    if (!contents) return null
    
    // 从节点生成 CFI
    const range = contents.document.createRange()
    
    if (target.nodeType === Node.TEXT_NODE) {
      range.selectNodeContents(target)
    } else {
      range.selectNode(target as Element)
    }
    
    const cfi = contents.cfiFromRange(range)
    return cfi
  } catch (error) {
    console.error('❌ 获取 CFI 失败:', error)
    return null
  }
}, [])
```

**关键点：**
1. 递归查找有效节点
2. 区分文本节点和元素节点
3. 使用 `createRange()` 创建范围
4. 使用 `cfiFromRange()` 生成 CFI

---

## 🎨 高亮功能

### **添加高亮**

```typescript
const annotation = rendition.annotations.add(
  'highlight',        // 类型
  cfi,               // 位置
  {},                // 数据
  () => {},          // 回调
  'temp-highlight',  // CSS 类名
  {
    fill: 'yellow',
    'fill-opacity': '0.3',
    'mix-blend-mode': 'multiply',
  }
)
```

### **移除高亮**

```typescript
rendition.annotations.remove(cfi, 'highlight')
```

### **高亮颜色**

| 状态 | 颜色 | 用途 |
|------|------|------|
| 临时高亮 | 黄色 | 标记第一次点击 |
| 最终高亮 | 绿色 | 标记选中范围 |
| AI 高亮 | 蓝色 | 已解释的文本（待实现） |

---

## 📝 文本提取

### **方法 1：使用 CFI**

```typescript
const range = contents.range(startCfi)
const text = range.toString()
```

### **方法 2：使用 Selection API**

```typescript
const selection = contents.window.getSelection()
const text = selection?.toString()
```

### **完整实现**

```typescript
const getTextFromRange = useCallback(async (
  rendition: Rendition,
  startCfi: string,
  endCfi: string
): Promise<string> => {
  try {
    const contentsArray = rendition.getContents() as unknown as any[]
    const contents = contentsArray[0]
    if (!contents) return ''
    
    // 方法1：尝试使用 CFI
    try {
      const range = contents.range(startCfi)
      if (range) {
        const text = range.toString()
        if (text && text.trim()) {
          return text.trim()
        }
      }
    } catch (error) {
      console.warn('方法1失败，尝试方法2')
    }
    
    // 方法2：尝试使用 Selection API
    try {
      const selection = contents.window.getSelection()
      if (selection && selection.toString()) {
        return selection.toString().trim()
      }
    } catch (error) {
      console.warn('方法2失败')
    }
    
    // 默认返回
    return '已选中文本（提取失败）'
  } catch (error) {
    console.error('❌ 提取文本失败:', error)
    return ''
  }
}, [])
```

---

## 🔄 完整交互流程

### **第一次点击**

```typescript
const handleFirstClick = useCallback((cfi: string, rendition: Rendition) => {
  console.log('1️⃣ 第一次点击 - 标记起点')
  
  // 1. 保存 CFI
  setFirstCfi(cfi)
  
  // 2. 添加黄色临时高亮
  const annotation = rendition.annotations.add(
    'highlight',
    cfi,
    {},
    () => {},
    'temp-highlight',
    { fill: 'yellow', 'fill-opacity': '0.3' }
  )
  
  tempHighlightKey.current = cfi
  
  // 3. 更新状态
  setSelectionState('WAITING_SECOND_CLICK')
  
  // 4. 视觉反馈
  showToast('请点击选择结束位置')
}, [])
```

### **第二次点击**

```typescript
const handleSecondClick = useCallback(async (
  startCfi: string,
  endCfi: string,
  rendition: Rendition
) => {
  console.log('2️⃣ 第二次点击 - 标记终点')
  
  try {
    // 1. 移除临时高亮
    if (tempHighlightKey.current) {
      rendition.annotations.remove(tempHighlightKey.current, 'highlight')
      tempHighlightKey.current = null
    }
    
    // 2. 生成范围 CFI
    const EpubCFI = (rendition as any).book.spine.epubcfi.constructor
    const rangeCfi = new EpubCFI(startCfi, endCfi).toString()
    
    // 3. 提取选中的文本
    const selectedText = await getTextFromRange(rendition, startCfi, endCfi)
    
    if (!selectedText || selectedText.trim().length === 0) {
      showToast('未选中任何文本')
      resetSelection(rendition)
      return
    }
    
    // 4. 添加绿色高亮
    rendition.annotations.add(
      'highlight',
      rangeCfi,
      {},
      () => {},
      'selection-highlight',
      { fill: 'green', 'fill-opacity': '0.3' }
    )
    
    // 5. 显示选中的文本
    showToast(`已选中：${selectedText.substring(0, 20)}...`)
    
    // 6. TODO: 触发 AI 解释
    console.log('🤖 准备调用 AI 解释')
    console.log('   文本:', selectedText)
    console.log('   位置:', rangeCfi)
    
    // 7. 重置状态
    setTimeout(() => {
      resetSelection(rendition)
    }, 2000)
    
  } catch (error) {
    console.error('❌ 处理第二次点击失败:', error)
    showToast('选择失败，请重试')
    resetSelection(rendition)
  }
}, [])
```

---

## 🐛 调试技巧

### **1. 查看控制台日志**

```
✅ Rendition 已就绪，两点选词功能已启用
📍 点击位置 CFI: epubcfi(/6/4!/4/2/1:0)
1️⃣ 第一次点击 - 标记起点
✨ 已添加临时高亮: epubcfi(/6/4!/4/2/1:0)
💬 提示: 请点击选择结束位置
📍 点击位置 CFI: epubcfi(/6/4!/4/2/1:50)
2️⃣ 第二次点击 - 标记终点
🗑️ 已移除临时高亮
📏 范围 CFI: epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:50)
📝 选中文本: Lorem ipsum dolor sit amet
✅ 已添加最终高亮
🤖 准备调用 AI 解释
   文本: Lorem ipsum dolor sit amet
   位置: epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:50)
```

### **2. 可视化高亮**

- 黄色 = 第一次点击（临时）
- 绿色 = 第二次点击（最终）

### **3. 常见问题**

#### **Q: 点击没有反应**

**检查：**
```typescript
// 1. 确认监听器已添加
console.log('Rendition ready:', renditionRef.current)

// 2. 确认事件触发
rendition.on('click', (e) => {
  console.log('点击事件触发:', e)
})
```

#### **Q: 无法获取 CFI**

**检查：**
```typescript
// 1. 确认 target 节点
console.log('Target node:', event.target)

// 2. 确认 contents
const contents = rendition.getContents()[0]
console.log('Contents:', contents)
```

#### **Q: 高亮不显示**

**检查：**
```typescript
// 1. 确认 CFI 格式正确
console.log('CFI:', cfi)

// 2. 尝试简单高亮
rendition.annotations.add('highlight', cfi, {}, () => {}, 'test', {
  fill: 'red',
  'fill-opacity': '0.5'
})
```

---

## 🚀 下一步：AI 集成

### **准备工作**

选中文本后，我们有：
1. **文本内容**：`selectedText`
2. **位置信息**：`rangeCfi`
3. **上下文**：当前章节、书籍信息

### **AI 解释流程**

```typescript
// TODO: 实现 AI 解释
async function explainWithAI(text: string, context: Context) {
  // 1. 调用 AI API
  const response = await fetch('/api/ai/explain', {
    method: 'POST',
    body: JSON.stringify({ text, context }),
  })
  
  // 2. 显示解释面板
  showExplanationPanel(response.data)
  
  // 3. 保存到笔记
  saveNote(text, response.data, rangeCfi)
}
```

### **待实现功能**

- [ ] AI API 集成
- [ ] 解释面板 UI
- [ ] 笔记保存功能
- [ ] 历史记录
- [ ] 分享功能

---

## ✅ 功能清单

### **已实现 ✅**
- [x] 两点选词状态机
- [x] CFI 获取
- [x] 第一次点击（黄色高亮）
- [x] 第二次点击（绿色高亮）
- [x] 文本提取
- [x] 高亮管理
- [x] 状态重置
- [x] 错误处理

### **待实现 ⏳**
- [ ] AI API 调用
- [ ] 解释面板
- [ ] 笔记保存
- [ ] Toast 组件
- [ ] 长按选词（可选）
- [ ] 滑动选词（可选）

---

## 📚 相关文档

- [EPUB.js Annotations](https://github.com/futurepress/epub.js/wiki/Annotations)
- [EPUB CFI Specification](http://www.idpf.org/epub/linking/cfi/)
- [MobileReader 组件](./MOBILE_READER.md)

---

**版本**: v1.0  
**最后更新**: 2025-11-20  
**状态**: ✅ 核心功能完成，待集成 AI
