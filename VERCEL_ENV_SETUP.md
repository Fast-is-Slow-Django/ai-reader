# 🔧 Vercel 环境变量配置指南

## 📊 问题诊断

**访问此链接检查环境配置状态：**
```
https://ai-reader-green.vercel.app/api/check-env
```

如果看到以下错误，说明需要配置环境变量：
- ⚠️ `GOOGLE_GENERATIVE_AI_API_KEY is not configured`
- ⚠️ `API key exists but may be invalid or expired`

## 🔑 配置步骤

### 1. 登录 Vercel Dashboard
访问：https://vercel.com/dashboard

### 2. 找到你的项目
点击 `ai-reader` 或 `ai-reader-green` 项目

### 3. 进入项目设置
点击顶部的 **Settings** 标签

### 4. 配置环境变量
1. 在左侧菜单选择 **Environment Variables**
2. 添加以下变量：

#### 必需的环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | `AIzaSy...` | Google AI Studio API密钥 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase项目URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Supabase匿名密钥 |

#### 获取 Google AI API Key：
1. 访问：https://aistudio.google.com/apikey
2. 点击 **Create API Key**
3. 选择或创建一个项目
4. 复制生成的密钥

### 5. 重新部署
配置完成后，需要重新部署：
1. 在 Vercel Dashboard 点击 **Deployments**
2. 找到最新的部署
3. 点击右侧的 **...** 菜单
4. 选择 **Redeploy**

## 🧪 验证配置

重新部署完成后（约2分钟）：

1. **检查环境状态**
   ```
   https://ai-reader-green.vercel.app/api/check-env
   ```
   
   应该看到：
   ```json
   {
     "status": "Environment Check",
     "checks": {
       "hasGoogleApiKey": true,
       "googleApiKeyLength": 39
     },
     "geminiTest": "API OK",
     "recommendation": "✅ Configuration looks good"
   }
   ```

2. **测试AI解释功能**
   - 打开一本书
   - 选择一个单词
   - 应该能看到AI生成的解释

## 🔒 安全提醒

- **不要**在代码中硬编码API密钥
- **不要**在GitHub仓库中提交`.env`文件
- 使用Vercel的环境变量功能来安全管理密钥

## 📝 环境变量说明

### Production vs Development
- **Production**: 在Vercel上运行时使用的变量
- **Development**: 本地开发时使用`.env.local`文件

### 变量作用域
- `NEXT_PUBLIC_*`: 客户端和服务端都可访问
- 其他变量：仅服务端可访问（更安全）

## 🆘 常见问题

### Q: 配置后仍然报错？
A: 确保重新部署了应用。环境变量修改后需要重新部署才会生效。

### Q: API密钥无效？
A: 
1. 检查是否启用了Google Generative AI API
2. 确认密钥没有过期
3. 检查是否有配额限制

### Q: 如何查看Vercel日志？
A: 在Vercel Dashboard > Functions标签 > 查看实时日志

## 📞 需要帮助？

如果问题仍未解决，请提供以下信息：
1. `/api/check-env`的返回结果
2. 浏览器控制台的错误信息
3. Vercel Functions的日志
