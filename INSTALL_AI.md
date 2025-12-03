# 🚀 AI 功能安装指南

快速设置 AI 解释功能。

## 📦 步骤 1：安装依赖

```bash
npm install ai @ai-sdk/openai
```

## 🔑 步骤 2：配置 API Key

1. **获取 OpenAI API Key**
   - 访问：https://platform.openai.com/api-keys
   - 点击 "Create new secret key"
   - 复制生成的 key

2. **添加到环境变量**

编辑 `.env.local` 文件，添加：

```env
# OpenAI API Key
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Supabase（已有）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## ✅ 步骤 3：重启服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

## 🧪 步骤 4：测试

1. **打开浏览器**
   ```
   http://localhost:3000
   ```

2. **登录并打开一本英文书**

3. **选择文本**
   - 点击一个单词（第一次）
   - 点击结束位置（第二次）

4. **查看 AI 面板**
   - 应该自动弹出
   - 显示 "AI is thinking..."
   - 流式显示解释

5. **测试朗读**
   - 点击小喇叭图标 🔊
   - 听到英文发音

## 📋 功能清单

完成以上步骤后，你将拥有：

- ✅ 两点选词交互
- ✅ AI 简单英语解释
- ✅ 流式响应
- ✅ 朗读功能
- ✅ i+1 教学模式

## 💰 成本说明

**gpt-4o-mini 定价：**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

**估算：**
- 每次解释约 150 tokens
- 1000 次解释 ≈ $0.10
- 非常经济实惠！ 💰

## 🐛 故障排除

### 问题：找不到模块 "ai"

**解决：**
```bash
# 确保安装了依赖
npm install ai @ai-sdk/openai

# 重启服务器
npm run dev
```

### 问题：AI 请求失败 401

**原因：** API Key 未配置或不正确

**解决：**
1. 检查 `.env.local` 文件
2. 确认 `OPENAI_API_KEY` 正确
3. 重启服务器

### 问题：朗读不工作

**原因：** 浏览器不支持

**解决：**
- 使用 Chrome 或 Edge 浏览器
- 确保浏览器已授权音频权限

## 📚 详细文档

查看完整文档：
- `docs/AI_SETUP.md` - 详细设置指南
- `docs/TWO_CLICK_SELECTION.md` - 选词功能
- `docs/INTEGRATION_EXAMPLE.md` - 集成示例

---

**准备就绪！享受 AI 辅助阅读！** 🎓✨
