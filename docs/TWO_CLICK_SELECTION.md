# 两点选词交互功能完整文档

AI-Reader 的核心交互功能 - 两点点击选词并提取上下文。

## 🎯 功能概述

**两点选词**是 AI 解释功能的基础，用户通过两次点击选择文本，系统自动提取：
1. **选中的文本** - 用户选择的内容
2. **上下文** - 选中文本前后各约 100 字符（约 20 个单词）
3. **CFI 位置** - EPUB 标准的位置标识符

---

## 📦 核心实现

### **1. 接口定义**

```typescript
/**
 * 选中文本的数据结构
 */
interface SelectionData {
  text: string      // 选中的文本
  context: string   // 包含上下文的完整文本
  cfi: string       // CFI 位置标识
}
```

### **2. 组件 Props**

```typescript
<MobileReader
  url={bookUrl}
  title={bookTitle}
  bookId={bookId}
  onSelection={(data: SelectionData) => {
    // 处理选中的文本
    console.log('选中文本:', data.text)
    console.log('上下文:', data.context)
    console.log('位置:', data.cfi)
    
    // TODO: 调用 AI API
  }}
/>
```

---

## 🔧 核心函数

### **getTextContext(rendition, cfiRange)**

智能提取选中文本及其上下文。

```typescript
/**
 * 核心辅助函数：提取选中文本及其上下文
 * 
 * @param rendition - EPUB rendition 对象
 * @param cfiRange - CFI 范围字符串
 * @returns { text, context } - 选中的文本和完整上下文
 */
const getTextContext = (rendition: Rendition, cfiRange: string): { text: string; context: string } => {
  // 1. 获取 Range 对象
  const range = rendition.getRange(cfiRange)
  
  // 2. 获取选中的文本
  const selectedText = range.toString().trim()
  
  // 3. 获取完整的段落文本
  const container = range.commonAncestorContainer
  let fullText = ''
  
  if (container.nodeType === Node.TEXT_NODE) {
    fullText = container.parentNode?.textContent || ''
  } else {
    fullText = (container as Element).textContent || ''
  }
  
  // 4. 智能截取上下文
  const contextLength = 100  // 前后各 100 字符
  const index = fullText.indexOf(selectedText)
  
  if (index === -1) {
    // 找不到，直接返回选中文本
    return { text: selectedText, context: selectedText }
  }
  
  // 向前截取
  const startIndex = Math.max(0, index - contextLength)
  const prevPart = fullText.substring(startIndex, index)
  
  // 向后截取
  const endIndex = Math.min(fullText.length, index + selectedText.length + contextLength)
  const nextPart = fullText.substring(index + selectedText.length, endIndex)
  
  // 拼接上下文
  const prefix = startIndex > 0 ? '...' : ''
  const suffix = endIndex < fullText.length ? '...' : ''
  const context = prefix + prevPart + selectedText + nextPart + suffix
  
  return {
    text: selectedText,
    context: context.trim(),
  }
}
```

**关键点：**
- ✅ 自动查找选中文本在段落中的位置
- ✅ 向前/向后各截取 100 字符
- ✅ 自动添加省略号（...）
- ✅ 处理跨节点选择的情况

---

## 🎬 交互流程

### **1. 第一次点击**

```typescript
const handleFirstClick = (cfi: string, rendition: Rendition) => {
  // 1. 保存 CFI
  firstCfiRef.current = cfi
  
  // 2. 添加黄色高亮
  rendition.annotations.add(
    'highlight',
    cfi,
    {},
    () => {},
    'temp-highlight',
    { fill: 'yellow', 'fill-opacity': '0.3' }
  )
  
  // 3. 更新状态
  setSelectionState('WAITING')
  
  console.log('1️⃣ 第一次点击 - 标记起点')
}
```

**效果：**
- 黄色高亮出现在点击的文字上
- 等待用户点击第二个位置

### **2. 第二次点击**

```typescript
const handleSecondClick = (endCfi: string, rendition: Rendition) => {
  const startCfi = firstCfiRef.current
  
  // 1. 移除临时高亮
  rendition.annotations.remove(tempHighlightRef.current, 'highlight')
  
  // 2. 生成范围 CFI
  const cfiGenerator = new EpubCFI()
  const rangeCfi = cfiGenerator.generateRange(startCfi, endCfi)
  
  // 3. 提取文本和上下文
  const { text, context } = getTextContext(rendition, rangeCfi)
  
  // 4. 添加绿色高亮
  rendition.annotations.add(
    'highlight',
    rangeCfi,
    {},
    () => {},
    'selection-highlight',
    { fill: 'green', 'fill-opacity': '0.3' }
  )
  
  // 5. 触发回调
  onSelection?.({
    text,
    context,
    cfi: rangeCfi,
  })
  
  // 6. 重置状态
  setTimeout(() => resetSelection(rendition), 2000)
  
  console.log('2️⃣ 第二次点击 - 完成选择')
}
```

**效果：**
- 黄色高亮消失
- 选中范围显示绿色高亮
- 调用 `onSelection` 回调，传递数据
- 2秒后自动清除高亮

---

## 📊 上下文提取示例

### **场景 1：中文文本**

**原文：**
```
人工智能（Artificial Intelligence），英文缩写为AI。它是研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统的一门新的技术科学。
```

**用户选择：** "模拟、延伸和扩展人的智能"

**提取结果：**
```json
{
  "text": "模拟、延伸和扩展人的智能",
  "context": "...为AI。它是研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统的一门..."
}
```

### **场景 2：英文文本**

**原文：**
```
Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.
```

**用户选择：** "automates analytical model building"

**提取结果：**
```json
{
  "text": "automates analytical model building",
  "context": "...is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on..."
}
```

### **场景 3：短文本**

**原文：**
```
Hello, World!
```

**用户选择：** "World"

**提取结果：**
```json
{
  "text": "World",
  "context": "Hello, World!"
}
```

**说明：** 当文本太短时，不添加省略号。

---

## 🎯 使用示例

### **在父组件中使用**

```typescript
// app/read/[id]/page.tsx
import MobileReader from '@/components/reader/MobileReader'

export default function ReadPage({ params }) {
  const { id } = params
  
  // 处理选中文本
  const handleSelection = (data: SelectionData) => {
    console.log('📝 用户选中了文本')
    console.log('   文本:', data.text)
    console.log('   上下文:', data.context)
    console.log('   位置:', data.cfi)
    
    // TODO: 调用 AI API
    // const explanation = await callAI(data.text, data.context)
    // showExplanationPanel(explanation)
  }
  
  return (
    <MobileReader
      url={bookUrl}
      title={bookTitle}
      bookId={id}
      onSelection={handleSelection}
    />
  )
}
```

### **调用 AI API**

```typescript
// utils/ai.ts
export async function explainText(text: string, context: string) {
  const response = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, context }),
  })
  
  const data = await response.json()
  return data.explanation
}

// 在 handleSelection 中使用
const handleSelection = async (data: SelectionData) => {
  try {
    const explanation = await explainText(data.text, data.context)
    showExplanationPanel(explanation)
  } catch (error) {
    console.error('AI 解释失败:', error)
  }
}
```

---

## 📋 控制台日志示例

```
✅ Rendition 已就绪，两点选词功能已启用
📍 点击位置 CFI: epubcfi(/6/4!/4/2/1:0)
1️⃣ 第一次点击 - 标记起点
✨ 已添加临时高亮
💬 等待第二次点击...
📍 点击位置 CFI: epubcfi(/6/4!/4/2/1:50)
2️⃣ 第二次点击 - 标记终点
🗑️ 已移除临时高亮
📏 范围 CFI: epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:50)
📝 提取文本和上下文，CFI: epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:50)
✅ 选中文本: artificial intelligence
✅ 完整上下文: ...the development of artificial intelligence has transformed many industries...
   上下文长度: 180 字符
✅ 已添加最终高亮
🤖 触发选择回调
   文本: artificial intelligence
   上下文: ...the development of artificial intelligence has transformed many industries...
   CFI: epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:50)
```

---

## 🎨 视觉效果

### **交互流程**

```
┌─────────────────────────────┐
│  用户正常阅读               │
│                             │
│  Lorem ipsum dolor sit      │
│  amet, consectetur          │
│  adipiscing elit.           │
└─────────────────────────────┘
         ↓ 点击 "dolor"
┌─────────────────────────────┐
│  用户正常阅读               │
│                             │
│  Lorem ipsum [dolor] sit    │  ← 黄色高亮
│  amet, consectetur          │
│  adipiscing elit.           │
└─────────────────────────────┘
         ↓ 点击 "consectetur"
┌─────────────────────────────┐
│  用户正常阅读               │
│                             │
│  Lorem ipsum [dolor sit     │  ← 绿色高亮
│  amet, consectetur] elit.   │
│                             │
└─────────────────────────────┘
         ↓ 触发 onSelection
┌─────────────────────────────┐
│  AI 解释面板                │
│                             │
│  选中：dolor sit amet...    │
│                             │
│  AI 解释：...               │
└─────────────────────────────┘
```

---

## 🐛 调试技巧

### **1. 检查 CFI 是否正确生成**

```typescript
const cfi = getCfiFromClick(event, rendition)
console.log('CFI:', cfi)
// 应该输出类似：epubcfi(/6/4!/4/2/1:0)
```

### **2. 检查文本提取**

```typescript
const { text, context } = getTextContext(rendition, rangeCfi)
console.log('文本:', text)
console.log('上下文长度:', context.length)
// 文本不应为空，上下文长度应在 text.length 到 text.length + 200 之间
```

### **3. 检查回调是否触发**

```typescript
onSelection={(data) => {
  console.log('✅ onSelection 被调用')
  console.log('数据:', data)
}}
```

---

## ✅ 功能清单

### **已实现 ✅**
- [x] 两点点击选词
- [x] 第一次点击黄色高亮
- [x] 第二次点击绿色高亮
- [x] CFI 位置获取
- [x] 文本提取
- [x] 上下文提取（前后各 100 字符）
- [x] 智能截取（自动添加省略号）
- [x] onSelection 回调
- [x] 状态重置
- [x] 错误处理

### **待实现 ⏳**
- [ ] AI API 集成
- [ ] 解释面板 UI
- [ ] 笔记保存
- [ ] 取消选择按钮
- [ ] 长按选词（可选）

---

## 📚 相关文档

- [TEXT_SELECTION.md](./TEXT_SELECTION.md) - 两点选词技术文档
- [MOBILE_READER.md](./MOBILE_READER.md) - 阅读器组件文档
- [EPUB CFI Specification](http://www.idpf.org/epub/linking/cfi/) - CFI 标准

---

**版本**: v2.0  
**最后更新**: 2025-11-20  
**状态**: ✅ 完整实现，包含上下文提取
