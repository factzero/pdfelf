# 🧝 PDF Elf

免费在线 PDF 处理工具，所有处理在浏览器本地完成，无需上传服务器。

## ✨ 功能

- 🗜️ **压缩 PDF** — 基本压缩和强压缩两种模式
- 🔗 **合并 PDF** — 多个 PDF 合并为一个，支持拖拽排序
- ✂️ **分割 PDF** — 按页面范围或每 N 页分割
- 📄 **PDF 转 Word** — 转换为可编辑的 .docx 文档
- 🖼️ **PDF 转图片** — 导出为 PNG/JPEG，支持 72/150/300 DPI

## 🚀 快速开始

```bash
npm install
npm run dev
```

## 🏗️ 构建

```bash
npm run build
npm run preview
```

## 🛠️ 技术栈

- **框架**: Vue 3 + TypeScript
- **构建**: Vite
- **PDF 核心**: pdf-lib（合并/分割/压缩）
- **PDF 渲染**: pdfjs-dist（文本提取/转图片）
- **Word**: mammoth.js + docx.js
- **ZIP**: JSZip
- **状态管理**: Pinia
- **路由**: Vue Router

## 📁 项目结构

```
src/
├── pages/         # 页面组件
├── components/    # 共享组件
├── services/      # PDF/Word/图片处理服务
├── stores/        # Pinia 状态管理
├── router/        # 路由配置
├── utils/         # 工具函数
└── styles/        # 全局样式
```

## 🔒 隐私

所有文件处理在浏览器本地完成，不会上传到任何服务器。
