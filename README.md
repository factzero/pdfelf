# 🧝 PDF Elf

免费在线 PDF 处理工具，所有处理在浏览器本地完成，无需上传服务器。

## ✨ 功能

### 📂 整理 PDF
- ✅ 🗜️ **压缩 PDF** — 基本压缩和强压缩两种模式
- ✅ 🔗 **合并 PDF** — 多个 PDF 合并为一个，支持拖拽排序
- ✅ ✂️ **分割 PDF** — 按页面范围或每 N 页分割
- ✅ 🔄 **旋转 PDF** — 旋转 PDF 页面，每页独立设置角度
- ✅ 🗑️ **删除页面** — 从 PDF 中删除不需要的页面
- ✅ 📋 **提取页面** — 从 PDF 中提取指定页面为新文件
- ✅ 🔀 **重排页面顺序** — 拖拽调整 PDF 页面顺序后重新导出

### ✏️ 编辑 PDF
- ✅ 🔏 **添加水印** — 给 PDF 每一页添加文字水印，支持自定义字体大小、透明度、颜色、角度
- ✅ 🔢 **添加页码** — 将页码插入 PDF 文件，可选择页码的位置、大小、格式和字体

### 🔄 从 PDF 转换
- ✅ 📄 **PDF 转 Word** — 转换为可编辑的 .docx 文档
- ✅ 📊 **PDF 转 Excel** — 转换为 Excel 电子表格，每页对应一个工作表
- ✅ 📽️ **PDF 转 PPT** — 转换为 PowerPoint 演示文稿，每页对应一张幻灯片
- ✅ 🖼️ **PDF 转图片** — 导出为 PNG/JPEG，支持 72/150/300 DPI
- ✅ 🖼️ **PDF 转 JPG** — 将所有页面导出为 JPG 图片
- ✅ 🖼️ **PDF 转 PNG** — 将所有页面导出为 PNG 图片
- ✅ 🖼️ **PDF 转 TIFF** — 将所有页面导出为 TIFF 图片
- ✅ 🖼️ **PDF 转 SVG** — 将页面转换为 SVG 矢量图
- ✅ 📝 **PDF 转 Text** — 提取 PDF 中的纯文本内容
- ✅ 🌐 **PDF 转 HTML** — 将 PDF 页面转换为 HTML 文件

### 📥 转换成 PDF
- ✅ 📝 **Word 转 PDF** — 将 Word 文档 (.docx) 转为 PDF
- ✅ 📊 **Excel 转 PDF** — 将 Excel 表格 (.xlsx) 转为 PDF
- ✅ 📽️ **PPT 转 PDF** — 将 PowerPoint (.pptx) 转为 PDF
- ✅ 🖼️ **图片转 PDF** — 将图片合并转换为 PDF 文件

### 📖 阅读器
- ✅ 📖 **PDF 阅读器** — 在浏览器中在线阅读 PDF 文件

## 🚀 快速开始

```bash
npm install

# 仅前端开发
npm run dev

# 前端 + 访问统计后台
npm run dev:all
```

## 📊 访问统计

项目内置一个轻量级 Express 后台用于统计网站访问量。

统计 API：
- `GET /api/stats` — 获取统计数据（总访问量、今日访问、独立访客）
- `POST /api/stats/visit` — 记录一次页面访问

数据存储在 `server/statsData.json` 文件中（已加入 .gitignore）。

### 本地开发

```bash
# 仅前端
npm run dev

# 前端 + 统计后台（推荐）
npm run dev:all

# 预览生产构建（单进程，同源无代理）
npm run build
npm run preview:all
```

## 🚀 部署

生产环境由 **Nginx 托管静态文件** + **PM2 守护 stats server** 组成：

### 1. 服务器初始配置

```bash
# 安装 PM2（守护进程 + 开机自启）
npm install -g pm2

# 启动 stats server
cd /home/admin/pdfelf
pm2 start "npm run start" --name pdfelf-stats

# 设置开机自启
pm2 save
pm2 startup
```

### 2. Nginx 配置

在 HTTPS server 块中加入 `/api/` 代理：

```nginx
server {
    server_name your-domain.com;

    root /home/admin/pdfelf/dist;
    index index.html;

    # API 代理到 stats server
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源（带 hash，可长期缓存）
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    # ... SSL 证书配置
}
```

### 3. 更新部署

```bash
cd /home/admin/pdfelf
git pull
npm install && npm run build
pm2 restart pdfelf-stats
nginx -s reload
```

## 📁 项目结构

```
src/
├── pages/         # 页面组件
├── components/    # 共享组件
├── services/      # PDF/Word/图片/HTML/SVG 处理服务
├── stores/        # Pinia 状态管理
├── router/        # 路由配置
├── locales/       # 语言文件 (zh-CN, en)
├── utils/         # 工具函数
└── styles/        # 全局样式
public/
└── pyodide/       # Pyodide 运行时 (Python → TIFF/SVG)
server/
└── *.ts           # 访问统计后台 (Express)
```

## 🔒 隐私

所有文件处理在浏览器本地完成，不会上传到任何服务器。
