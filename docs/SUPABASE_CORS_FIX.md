# Supabase Storage CORS 配置

解决 EPUB 加载问题的关键配置。

---

## 🎯 问题症状

```
GET http://localhost:3000/read/META-INF/container.xml 404 (Not Found)
```

EPUB.js 无法正确加载 EPUB 内部文件。

---

## ✅ 解决方案：配置 Storage CORS

### **步骤 1：访问 Supabase Dashboard**

1. 打开：https://supabase.com/dashboard
2. 选择你的项目
3. 左侧菜单 → **Storage** → **Configuration**

### **步骤 2：添加 CORS 配置**

在 **CORS Configuration** 部分，添加以下配置：

```json
[
  {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "HEAD"],
    "allowedHeaders": ["range", "content-type", "authorization"],
    "maxAgeSeconds": 3600
  }
]
```

**关键点：**
- `allowedOrigins: ["*"]` - 允许所有域名访问（开发环境）
- `allowedHeaders` 必须包含 `"range"` - EPUB.js 需要范围请求
- `allowedHeaders` 必须包含 `"content-type"`

### **步骤 3：确认 Bucket 是 Public**

1. Storage → Buckets
2. 找到 `user_books`
3. 确认旁边有 **"Public"** 标签
4. 如果没有，点击设置 → 勾选 "Public bucket" → Save

---

## 🧪 测试 CORS

### **方法 1：浏览器直接访问**

在新标签页访问你的 EPUB 文件 URL：
```
https://ybjswwpdyppahxhhylij.supabase.co/storage/v1/object/public/user_books/...
```

**期望：** 开始下载文件 ✅

### **方法 2：控制台测试**

在浏览器控制台运行：

```javascript
fetch('YOUR_EPUB_URL', {
  method: 'GET',
  headers: {
    'Range': 'bytes=0-1023'
  }
})
.then(res => {
  console.log('Status:', res.status);
  console.log('Headers:', [...res.headers.entries()]);
  console.log('CORS OK:', res.headers.get('access-control-allow-origin'));
})
.catch(err => console.error('Error:', err));
```

**期望输出：**
```
Status: 206
Headers: [...]
CORS OK: *
```

---

## 📋 完整检查清单

- [ ] Storage → Configuration → CORS 已配置
- [ ] CORS allowedHeaders 包含 "range"
- [ ] CORS allowedHeaders 包含 "content-type"
- [ ] user_books bucket 是 Public
- [ ] Storage Policies 包含公开读取 Policy
- [ ] 文件可以直接在浏览器中访问
- [ ] 控制台 fetch 测试通过

---

## 🔧 如果还是不行

### **重建 CORS 配置**

1. **清空现有 CORS**
   - 删除所有 CORS 规则

2. **添加新规则**（手动输入，不要粘贴）
   ```json
   [
     {
       "allowedOrigins": ["*"],
       "allowedMethods": ["GET", "HEAD", "OPTIONS"],
       "allowedHeaders": ["*"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

3. **保存并等待**
   - 点击 Save
   - 等待 10-30 秒让配置生效

4. **清除浏览器缓存**
   - 按 Ctrl+Shift+Delete
   - 清除缓存的图像和文件
   - 刷新页面

---

## 💡 生产环境建议

开发完成后，将 CORS 配置改为：

```json
[
  {
    "allowedOrigins": ["https://your-production-domain.com"],
    "allowedMethods": ["GET", "HEAD"],
    "allowedHeaders": ["range", "content-type"],
    "maxAgeSeconds": 3600
  }
]
```

只允许你的生产域名访问。

---

## 🎯 关键要点

1. **CORS 是最常见的 EPUB 加载问题原因**
2. **`Range` 头必须在 allowedHeaders 中**
3. **Bucket 必须是 Public**
4. **配置后需要等待片刻才能生效**

---

**配置完成后，刷新阅读器页面测试！** 🚀📚
