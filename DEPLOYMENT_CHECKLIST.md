# 🚀 部署前检查清单

完整的部署前检查列表，确保应用正常运行。

## ✅ 环境配置

### Supabase 配置

- [ ] Supabase 项目已创建
- [ ] 数据库 Schema 已执行（`supabase-schema.sql`）
- [ ] `books` 表已创建并启用 RLS
- [ ] `notes` 表已创建并启用 RLS
- [ ] `user_books` Storage Bucket 已创建
- [ ] Storage Policies 已正确配置
- [ ] 获取了 `NEXT_PUBLIC_SUPABASE_URL`
- [ ] 获取了 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 环境变量

- [ ] `.env.local` 文件已创建（本地开发）
- [ ] 所有必需的环境变量已配置：
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  NEXT_PUBLIC_SITE_URL=
  ```
- [ ] 生产环境的 `NEXT_PUBLIC_SITE_URL` 指向正确域名

---

## 🧪 功能测试

### 认证系统

- [ ] 用户可以成功注册
- [ ] 用户可以成功登录
- [ ] 登录失败显示错误信息
- [ ] 密码少于 6 位时提示错误
- [ ] 退出登录功能正常
- [ ] 未登录访问 `/dashboard` 会重定向到 `/login`
- [ ] 登录后访问 `/login` 会重定向到 `/dashboard`

### 书架功能

- [ ] 空书架显示正确提示
- [ ] 上传器卡片可点击
- [ ] 可以选择 EPUB 文件
- [ ] 非 EPUB 文件被拒绝
- [ ] 超过 50MB 文件被拒绝
- [ ] 上传过程显示加载状态
- [ ] 上传成功后书籍自动显示
- [ ] 书籍按时间倒序排列
- [ ] 书籍卡片悬停效果正常
- [ ] 统计数字正确显示

### 阅读器功能

- [ ] 点击书籍可以进入阅读器
- [ ] EPUB 文件正确加载
- [ ] 书籍内容正常显示
- [ ] 翻页按钮功能正常
- [ ] 进度百分比正确显示
- [ ] 章节标题正确显示
- [ ] 返回按钮可以回到书架
- [ ] 设置按钮存在（虽然暂时无功能）

---

## 🔒 安全测试

### 权限验证

- [ ] 用户只能看到自己的书籍
- [ ] 无法访问别人的书籍 URL（会重定向）
- [ ] Storage 文件按用户隔离
- [ ] RLS 策略正确工作
- [ ] 未登录无法上传文件

### 输入验证

- [ ] SQL 注入尝试被阻止
- [ ] XSS 攻击被防御（书名显示为文本）
- [ ] 文件类型验证正常
- [ ] 文件大小限制有效

---

## 📱 响应式测试

### 桌面端（1920x1080）

- [ ] 登录页面布局正常
- [ ] 书架显示 4-5 列
- [ ] 阅读器全屏显示正常
- [ ] 所有按钮可点击
- [ ] 文字清晰可读

### 平板端（768x1024）

- [ ] 登录页面布局正常
- [ ] 书架显示 3-4 列
- [ ] 阅读器适配正常
- [ ] 触摸交互流畅

### 手机端（375x667）

- [ ] 登录页面布局正常
- [ ] 输入框大小合适
- [ ] 按钮足够大（易于点击）
- [ ] 书架显示 2 列
- [ ] 阅读器全屏显示
- [ ] 翻页按钮易于点击
- [ ] 无横向滚动条
- [ ] 文字大小适中

---

## 🎨 UI/UX 检查

### 视觉一致性

- [ ] 所有页面使用相同的颜色方案
- [ ] 按钮样式统一
- [ ] 圆角尺寸一致
- [ ] 阴影效果一致
- [ ] 字体大小合理

### 交互反馈

- [ ] 按钮有悬停效果
- [ ] 加载时显示动画或文字
- [ ] 操作成功有提示
- [ ] 操作失败有错误信息
- [ ] 表单验证即时反馈

### 无障碍性

- [ ] 所有表单有 label
- [ ] 按钮有清晰的文字或 aria-label
- [ ] 颜色对比度足够（WCAG AA 标准）
- [ ] 可以用键盘导航（Tab 键）
- [ ] 图片有 alt 文本

---

## 🌐 浏览器兼容性

### 桌面浏览器

- [ ] Chrome（最新版）
- [ ] Firefox（最新版）
- [ ] Safari（最新版）
- [ ] Edge（最新版）

### 移动浏览器

- [ ] iOS Safari
- [ ] Android Chrome
- [ ] 微信内置浏览器
- [ ] 其他主流浏览器

---

## ⚡ 性能检查

### 加载速度

- [ ] 首屏加载 < 3s
- [ ] 登录页面 < 1s
- [ ] 书架页面 < 2s
- [ ] 阅读器页面 < 3s

### 优化检查

- [ ] 图片已优化（如适用）
- [ ] 使用了动态导入（react-reader）
- [ ] 代码分割正常
- [ ] 不必要的依赖已移除
- [ ] 生产构建已优化

### Lighthouse 测试

```bash
# 运行 Lighthouse
npm run build
npm run start
# 在 Chrome DevTools 中运行 Lighthouse
```

- [ ] Performance > 80
- [ ] Accessibility > 90
- [ ] Best Practices > 90
- [ ] SEO > 80

---

## 📊 数据库检查

### Schema 验证

- [ ] `books` 表结构正确
  - id (uuid, primary key)
  - user_id (uuid, foreign key)
  - title (text)
  - file_url (text)
  - created_at (timestamp)

- [ ] `notes` 表结构正确
  - id (uuid, primary key)
  - book_id (uuid, foreign key)
  - user_id (uuid, foreign key)
  - content (text)
  - location (text)
  - created_at (timestamp)

### RLS 策略

- [ ] books 表有 SELECT 策略
- [ ] books 表有 INSERT 策略
- [ ] books 表有 UPDATE 策略
- [ ] books 表有 DELETE 策略
- [ ] notes 表有对应策略
- [ ] 所有策略使用 `auth.uid()` 验证

### Storage 配置

- [ ] `user_books` bucket 存在
- [ ] bucket 是 public 或有正确的权限
- [ ] upload policy 允许用户上传
- [ ] download policy 允许用户下载
- [ ] delete policy 允许用户删除自己的文件

---

## 🚀 部署步骤（Vercel）

### 1. 准备部署

- [ ] 代码已推送到 GitHub
- [ ] `package.json` 中的脚本正确
- [ ] `.gitignore` 包含敏感文件
- [ ] `README.md` 已更新

### 2. 连接 Vercel

- [ ] 登录 Vercel
- [ ] 导入 GitHub 仓库
- [ ] 选择正确的框架（Next.js）

### 3. 配置环境变量

在 Vercel 项目设置中添加：

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL`（使用 Vercel 域名）

### 4. 首次部署

- [ ] 点击 "Deploy" 按钮
- [ ] 等待构建完成（约 2-5 分钟）
- [ ] 检查构建日志无错误
- [ ] 访问生成的 URL

### 5. 验证部署

- [ ] 网站可以访问
- [ ] 注册功能正常
- [ ] 登录功能正常
- [ ] 上传功能正常
- [ ] 阅读器功能正常
- [ ] 所有资源正确加载

---

## 🔧 部署后配置

### DNS 设置（如使用自定义域名）

- [ ] 在 Vercel 添加域名
- [ ] 配置 DNS CNAME 记录
- [ ] 等待 SSL 证书生成
- [ ] 更新 `NEXT_PUBLIC_SITE_URL`
- [ ] 测试 HTTPS 访问

### Supabase 设置

- [ ] 更新 Supabase 项目的 Site URL
- [ ] 添加生产域名到允许列表
- [ ] 配置邮件模板（如启用邮箱确认）

---

## 📈 监控和日志

### 错误监控

- [ ] 配置错误追踪（如 Sentry）
- [ ] 测试错误报告
- [ ] 设置告警通知

### 分析工具

- [ ] 配置 Google Analytics（可选）
- [ ] 配置 Vercel Analytics
- [ ] 设置关键指标监控

---

## 📝 文档检查

### 用户文档

- [ ] README.md 包含安装说明
- [ ] README.md 包含使用指南
- [ ] README.md 包含常见问题

### 开发者文档

- [ ] API 文档完整
- [ ] 代码有清晰注释
- [ ] 架构文档清晰

---

## 🎉 发布前最后检查

- [ ] 所有测试通过
- [ ] 性能达标
- [ ] 安全检查通过
- [ ] 文档完整
- [ ] 备份数据库 Schema
- [ ] 准备回滚计划
- [ ] 通知相关人员

---

## 🐛 常见部署问题

### 构建失败

**问题**: Vercel 构建失败

**解决**:
```bash
# 本地测试构建
npm run build

# 检查错误
# 修复后重新推送
git push
```

### 环境变量错误

**问题**: 应用无法连接 Supabase

**解决**:
1. 检查 Vercel 环境变量是否正确
2. 确认变量名拼写正确
3. 重新部署项目

### CORS 错误

**问题**: 文件上传失败

**解决**:
1. 检查 Supabase Storage CORS 配置
2. 确认域名在允许列表中

---

## 📞 获取帮助

遇到问题时：

1. 查看 [文档](../docs/)
2. 检查 [测试指南](./docs/TESTING_GUIDE.md)
3. 查看 GitHub Issues
4. 联系技术支持

---

**祝部署顺利！** 🎉

---

**检查清单版本**: v1.0  
**最后更新**: 2025-11-20
