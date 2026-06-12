# 🧝 PDF Elf

免费在线 PDF 处理工具，所有处理在浏览器本地完成，无需上传服务器。

## ✨ 功能

### 📂 整理 PDF
- 🗜️ **压缩 PDF** — 基本压缩和强压缩两种模式
- 🔗 **合并 PDF** — 多个 PDF 合并为一个，支持拖拽排序
- ✂️ **分割 PDF** — 按页面范围或每 N 页分割
- 🔄 **旋转 PDF** — 旋转 PDF 页面，每页独立设置角度
- 🗑️ **删除页面** — 从 PDF 中删除不需要的页面
- 📋 **提取页面** — 从 PDF 中提取指定页面为新文件

### ✏️ 编辑 PDF
- 🔏 **添加水印** — 给 PDF 每一页添加文字水印，支持自定义字体大小、透明度、颜色、角度

### 🔄 从 PDF 转换
- 📄 **PDF 转 Word** — 转换为可编辑的 .docx 文档
- 📊 **PDF 转 Excel** — 转换为 Excel 电子表格，每页对应一个工作表
- 📽️ **PDF 转 PPT** — 转换为 PowerPoint 演示文稿，每页对应一张幻灯片
- 🖼️ **PDF 转图片** — 导出为 PNG/JPEG，支持 72/150/300 DPI

### 📥 转换成 PDF
- 📝 **Word 转 PDF** — 将 Word 文档 (.docx) 转为 PDF
- 📊 **Excel 转 PDF** — 将 Excel 表格 (.xlsx) 转为 PDF
- 📽️ **PPT 转 PDF** — 将 PowerPoint (.pptx) 转为 PDF
- 🖼️ **图片转 PDF** — 将图片合并转换为 PDF 文件

### 📖 阅读器
- 📖 **PDF 阅读器** — 在浏览器中在线阅读 PDF 文件

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
- **PDF 操作**: pdf-lib（合并/分割/压缩/旋转/水印等）
- **PDF 渲染**: pdfjs-dist（文本提取/转图片/阅读器）
- **Word**: mammoth.js + docx.js（双向转换）
- **Excel**: SheetJS (xlsx)
- **PPT**: pptxgenjs（生成 PPTX）
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
