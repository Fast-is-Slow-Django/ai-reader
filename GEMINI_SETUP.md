# 🌟 Google Gemini AI 配置指南

使用 Google Gemini 作为 AI 解释引擎。

## ✅ 已完成

- ✅ 安装了 `@ai-sdk/google`
- ✅ 修改了 API 使用 `gemini-1.5-flash`

## 🔑 获取 Gemini API Key

### **步骤 1：访问 Google AI Studio**

访问：https://aistudio.google.com/app/apikey

### **步骤 2：创建 API Key**

1. 点击 "Get API key"
2. 选择或创建一个项目
3. 点击 "Create API key"
4. 复制生成的 API Key

### **步骤 3：配置环境变量**

编辑 `.env.local` 文件，添加：

```env
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your-api-key...

# Supabase（已有）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**注意：** 环境变量名必须是 `GOOGLE_GENERATIVE_AI_API_KEY`

## 🚀 启动服务

```bash
# 重启开发服务器
npm run dev
```

## 🧪 测试

1. 打开浏览器：http://localhost:3000
2. 登录并打开一本英文书籍
3. 两次点击选择文本
4. 查看 AI 面板（使用 Gemini）

控制台应该显示：
```
📝 AI 解释请求 (Gemini)
   目标词: artificial intelligence
   上下文: ...
```

## 💰 Gemini 定价

### **Gemini 1.5 Flash（推荐）**

**免费额度：**
- 每分钟 15 次请求
- 每天 1500 次请求
- **完全免费！** 🎉

**付费计划：**
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens
- 比 OpenAI 便宜 50%！

## 🎯 为什么选择 Gemini？

### **优势**

1. **✅ 免费额度大**
   - 每天 1500 次请求
   - 适合个人学习使用

2. **✅ 速度快**
   - Flash 模型专为速度优化
   - 流式响应流畅

3. **✅ 性价比高**
   - 付费价格更便宜
   - 质量接近 GPT-4

4. **✅ 多语言支持**
   - 中英文表现优秀
   - 适合语言学习

### **对比 OpenAI**

| 特性 | Gemini Flash | GPT-4o-mini |
|------|--------------|-------------|
| 免费额度 | 1500次/天 | 无 |
| Input 价格 | $0.075/1M | $0.15/1M |
| Output 价格 | $0.30/1M | $0.60/1M |
| 速度 | ⚡ 快 | ⚡ 快 |
| 质量 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🔧 高级配置

### **切换到 Gemini Pro**

如果需要更高质量的解释：

```typescript
// app/api/explain/route.ts
const result = await streamText({
  model: google('gemini-1.5-pro'),  // 改为 Pro
  // ...
})
```

**Pro 定价：**
- Input: $3.50 / 1M tokens
- Output: $10.50 / 1M tokens
- 更高质量，适合专业使用

### **调整参数**

```typescript
const result = await streamText({
  model: google('gemini-1.5-flash'),
  temperature: 0.5,  // 降低随机性（0.0-1.0）
  topP: 0.9,         // 控制多样性
  // ...
})
```

## 🐛 故障排除

### **问题 1：API Key 错误**

```
Error: Invalid API key
```

**解决：**
1. 检查 `.env.local` 中的 Key 是否正确
2. 确认变量名为 `GOOGLE_GENERATIVE_AI_API_KEY`
3. 重启服务器

### **问题 2：超出配额**

```
Error: Quota exceeded
```

**解决：**
- 免费用户：等待第二天重置
- 或升级到付费计划

### **问题 3：响应慢**

**优化：**
1. 确认使用 `gemini-1.5-flash`（最快）
2. 检查网络连接
3. 考虑使用 CDN

## 📊 使用统计

在 Google AI Studio 查看使用情况：
https://aistudio.google.com/app/apikey

可以看到：
- 请求次数
- Token 使用量
- 剩余配额

## 🎓 最佳实践

### **1. 使用缓存（可选）**

对于重复查询的单词，考虑缓存结果：

```typescript
// utils/cache.ts
const cache = new Map<string, string>()

export function getCachedExplanation(word: string) {
  return cache.get(word)
}

export function setCachedExplanation(word: string, explanation: string) {
  cache.set(word, explanation)
}
```

### **2. 错误重试**

```typescript
let retries = 0
while (retries < 3) {
  try {
    const result = await streamText({ ... })
    return result.toTextStreamResponse()
  } catch (error) {
    retries++
    if (retries >= 3) throw error
    await new Promise(r => setTimeout(r, 1000))
  }
}
```

### **3. 监控使用量**

定期检查 API 使用情况，避免超出配额。

## ✅ 完成！

现在你的 AI-Reader 使用 Google Gemini：

- ✅ 免费额度充足
- ✅ 速度快
- ✅ 性价比高
- ✅ 质量优秀

享受 AI 辅助阅读吧！🎓✨

---

**文档版本**: v1.0  
**最后更新**: 2025-11-20  
**使用模型**: Gemini 1.5 Flash
