# Google Cloud Text-to-Speech 配置指南

## 🎯 简化方案：使用现有的Gemini API Key

**好消息！** 你现有的 `GOOGLE_GENERATIVE_AI_API_KEY` 可以直接用于Google Cloud TTS！

### ✅ 无需额外配置

代码已经配置为：
```typescript
const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
```

如果你已经有 `GOOGLE_GENERATIVE_AI_API_KEY`，直接推送代码即可使用！

---

## 📋 完整配置方案（可选）

如果你想使用专门的TTS API Key：

### 1. 启用Google Cloud Text-to-Speech API

1. 访问：https://console.cloud.google.com
2. 选择你的项目（或创建新项目）
3. 启用 **Cloud Text-to-Speech API**：
   - 搜索 "Text-to-Speech API"
   - 点击 "启用"

### 2. 创建API Key（如果还没有）

1. 进入 **APIs & Services** > **Credentials**
2. 点击 **Create Credentials** > **API Key**
3. 复制生成的API Key

### 3. 添加到环境变量

在Vercel中：
1. 进入项目 Settings > Environment Variables
2. 添加：
   ```
   GOOGLE_CLOUD_TTS_API_KEY=你的API密钥
   ```

或在本地 `.env.local` 中：
```
GOOGLE_CLOUD_TTS_API_KEY=你的API密钥
```

---

## 💰 费用说明

### 免费额度（每月）
- **标准语音**：免费 400万字符
- **WaveNet/Neural2**：免费 100万字符

### 超出后定价
- **标准语音**：$4/百万字符
- **WaveNet/Neural2**：$16/百万字符

### 实际使用估算
```
查词: "biggest" = 7字符
解释朗读: 约200字符

每天朗读100次 = 20,000字符
每月 = 600,000字符

✅ 完全在免费额度内！
```

---

## 🎵 可用的语音

当前配置：`en-US-Neural2-C` (Neural2女声)

### 其他可选语音：
- `en-US-Neural2-A` - Neural2男声
- `en-US-Neural2-D` - Neural2男声
- `en-US-Neural2-F` - Neural2女声
- `en-US-Neural2-J` - Neural2男声

修改 `/app/api/speak/route.ts` 第47行即可切换。

---

## 🔧 测试

部署后，点击朗读按钮，查看控制台：

**成功：**
```
✅ 使用Google Cloud TTS音频
✅ Google Cloud TTS音频播放完成
```

**失败（自动降级）：**
```
⚠️ 降级使用浏览器TTS
```
