# 📖 阅读器错误排查指南

解决 "Error loading book" 错误。

## 🔍 快速诊断步骤

### **步骤 1：查看浏览器控制台**

1. **打开开发者工具**
   - 按 `F12` 或 `Ctrl+Shift+I`
   
2. **查看 Console 标签**
   - 寻找红色错误信息
   
3. **查看 Network 标签**
   - 找到 `.epub` 文件的请求
   - 查看状态码（200/403/404）

---

## 🐛 常见错误及解决方案

### **错误 1：403 Forbidden**

```
GET https://xxx.supabase.co/storage/v1/object/public/user_books/xxx.epub
Status: 403 Forbidden
```

**原因：** Storage bucket 不是公开的

**解决：**

1. 访问 Supabase Dashboard
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets
   ```

2. 找到 `user_books` bucket

3. 点击右侧设置按钮（⚙️）

4. 勾选 **"Public bucket"**

5. 保存设置

6. 刷新阅读器页面

---

### **错误 2：404 Not Found**

```
GET https://xxx.supabase.co/storage/v1/object/public/user_books/xxx.epub
Status: 404 Not Found
```

**原因：** 文件不存在或路径错误

**解决：**

1. 检查 Supabase Storage
   - 打开 `user_books` bucket
   - 确认文件存在
   - 文件路径应该是：`{user_id}/{book_id}.epub`

2. 检查数据库记录
   - 打开 Supabase SQL Editor
   - 运行查询：
   ```sql
   SELECT id, title, file_url 
   FROM books 
   WHERE id = 'YOUR_BOOK_ID';
   ```
   - 确认 `file_url` 正确

3. 如果文件不存在，重新上传

---

### **错误 3：CORS Error**

```
Access to fetch at '...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**原因：** Supabase Storage CORS 配置问题

**解决：**

1. 访问 Supabase Dashboard → Storage → Configuration

2. 添加 CORS 规则：
   ```json
   {
     "allowedOrigins": ["*"],
     "allowedMethods": ["GET", "HEAD"],
     "allowedHeaders": ["*"],
     "maxAgeSeconds": 3600
   }
   ```

3. 保存并刷新页面

---

### **错误 4：Invalid EPUB**

```
Error loading book
(No specific network error)
```

**原因：** EPUB 文件损坏或格式错误

**解决：**

1. **验证 EPUB 文件**
   - 下载文件到本地
   - 用专业 EPUB 阅读器打开（如 Calibre）
   - 确认文件可以正常打开

2. **重新上传**
   - 如果文件损坏，获取新的 EPUB 文件
   - 删除旧记录
   - 重新上传

3. **检查文件扩展名**
   - 必须是 `.epub` 扩展名
   - 不支持 `.mobi`、`.pdf` 等其他格式

---

### **错误 5：File URL 为空**

```
书籍文件链接缺失: xxx
```

**原因：** 数据库记录中 `file_url` 为空

**解决：**

1. 检查上传流程是否完整

2. 查看数据库：
   ```sql
   SELECT * FROM books WHERE id = 'YOUR_BOOK_ID';
   ```

3. 如果 `file_url` 为 NULL，说明上传失败

4. 删除记录并重新上传：
   ```sql
   DELETE FROM books WHERE id = 'YOUR_BOOK_ID';
   ```

---

## 🔧 完整调试流程

### **1. 在浏览器控制台运行**

打开 Console，粘贴并运行：

```javascript
// 测试 EPUB 文件是否可访问
const testUrl = 'YOUR_FILE_URL_HERE'; // 从页面或数据库获取

fetch(testUrl)
  .then(response => {
    console.log('✅ 状态码:', response.status);
    console.log('✅ 响应头:', response.headers);
    return response.blob();
  })
  .then(blob => {
    console.log('✅ 文件大小:', blob.size, 'bytes');
    console.log('✅ 文件类型:', blob.type);
  })
  .catch(error => {
    console.error('❌ 错误:', error);
  });
```

**期望输出：**
```
✅ 状态码: 200
✅ 响应头: Headers {...}
✅ 文件大小: 1234567 bytes
✅ 文件类型: application/epub+zip
```

---

### **2. 检查 Supabase 配置**

运行 SQL 查询：

```sql
-- 检查 Storage bucket 是否存在
SELECT * FROM storage.buckets WHERE name = 'user_books';

-- 检查书籍记录
SELECT 
  b.id,
  b.title,
  b.file_url,
  b.user_id,
  length(b.file_url) as url_length
FROM books b
WHERE b.id = 'YOUR_BOOK_ID';

-- 检查 Storage 对象
SELECT * FROM storage.objects 
WHERE bucket_id = 'user_books' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

### **3. 手动测试 EPUB 加载**

创建临时 HTML 文件测试：

```html
<!DOCTYPE html>
<html>
<head>
  <title>EPUB Test</title>
  <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
</head>
<body>
  <div id="viewer" style="width: 100%; height: 600px;"></div>
  <script>
    const book = ePub('YOUR_FILE_URL_HERE');
    const rendition = book.renderTo('viewer', {
      width: '100%',
      height: '600px'
    });
    
    rendition.display().then(() => {
      console.log('✅ EPUB 加载成功！');
    }).catch(error => {
      console.error('❌ EPUB 加载失败:', error);
    });
  </script>
</body>
</html>
```

---

## 🎯 快速修复清单

- [ ] Supabase Storage `user_books` bucket 是公开的
- [ ] EPUB 文件存在于 Storage 中
- [ ] `file_url` 不为空且格式正确
- [ ] 文件可以通过浏览器直接访问
- [ ] EPUB 文件格式正确（可用其他阅读器打开）
- [ ] 开发服务器正常运行
- [ ] 浏览器控制台无 CORS 错误

---

## 💡 预防措施

### **1. 验证上传**

在 `BookUploader` 组件中添加验证：

```typescript
// 上传后立即测试 URL
const testFileAccess = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('文件不可访问');
    }
    console.log('✅ 文件可访问');
  } catch (error) {
    console.error('❌ 文件访问测试失败:', error);
  }
};
```

### **2. 添加错误提示**

修改 `MobileReader.tsx`：

```typescript
const [error, setError] = useState<string>('');

// 在 ReactReader 中
<ReactReader
  url={url}
  locationChanged={handleLocationChanged}
  getRendition={handleRenditionReady}
  loadingView={<Loading />}
  epubOptions={{ flow: 'paginated' }}
  
  // 添加错误处理
  onError={(err) => {
    console.error('EPUB 加载错误:', err);
    setError('书籍加载失败，请检查文件是否存在');
  }}
/>

{error && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
      <h3 className="text-lg font-bold text-red-600 mb-2">加载失败</h3>
      <p className="text-gray-700">{error}</p>
      <button 
        onClick={() => window.location.href = '/dashboard'}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        返回书架
      </button>
    </div>
  </div>
)}
```

---

## 🆘 还是无法解决？

### **收集信息：**

1. 浏览器控制台的完整错误信息
2. Network 标签中 EPUB 请求的详细信息
3. Supabase Storage 的截图
4. 数据库中 `file_url` 的值

### **联系支持：**

- 提供以上信息
- 说明已尝试的解决方案
- 描述问题出现的具体步骤

---

**希望这个指南能帮你解决问题！** 🚀
