# PDF Elf — 实施计划

> 基于设计文档 `docs/superpowers/specs/2026-06-12-pdfelf-design.md`

---

## 实施阶段概览

| 阶段 | 内容 | 预计文件数 |
|------|------|-----------|
| 1. 项目初始化 | Vite + Vue 3 + TS 脚手架，安装依赖 | ~8 文件 |
| 2. 基础框架 | 路由、布局、共享组件、样式系统 | ~10 文件 |
| 3. 首页 | 工具卡片、导航、信任条 | ~4 文件 |
| 4. PDF 压缩 | 上传→压缩→下载，含进度 | ~3 文件 |
| 5. 合并 PDF | 多文件上传→排序→合并→下载 | ~3 文件 |
| 6. 分割 PDF | 上传→选分割模式→分割→ZIP 下载 | ~3 文件 |
| 7. PDF 转 Word | 上传→提取文本→生成 docx→下载 | ~3 文件 |
| 8. PDF 转图片 | 上传→选格式/分辨率→渲染→下载 | ~3 文件 |
| 9. 收尾 | 错误处理完善、响应式适配、README | ~3 文件 |

---

## 阶段 1：项目初始化

**目标**：搭建 Vite + Vue 3 + TypeScript 项目骨架

**步骤**：
1. `npm create vite@latest pdfelf -- --template vue-ts`
2. 安装依赖：
   - `pdf-lib` — PDF 核心操作
   - `pdfjs-dist` — PDF 渲染/文本提取
   - `mammoth.js` — Word 读取
   - `docx` — Word 生成
   - `jszip` — ZIP 打包
   - `pinia` — 状态管理
   - `vue-router` — 路由
3. 配置 `vite.config.ts`（Worker 支持、路径别名）
4. 配置 `tsconfig.json`
5. 清理默认模板文件

**产出**：可运行的空白 Vue 3 项目

---

## 阶段 2：基础框架

**目标**：搭建通用布局和共享组件

**步骤**：
1. 创建路由配置 `src/router/index.ts`
2. 创建 `LayoutHeader.vue` — 顶部导航（Logo + 工具链接）
3. 创建 `FileDropZone.vue` — 通用拖放上传组件（支持拖放 + 点击选择 + 文件格式校验）
4. 创建 `ProgressBar.vue` — 处理进度条（百分比 + 状态文字）
5. 创建 `TrustBar.vue` — 底部信任条
6. 创建 `ResultDownload.vue` — 结果下载区（下载按钮 + 文件信息）
7. 创建全局样式 `src/styles/global.css`（CSS 变量、基础排版、颜色系统）
8. 创建 Pinia store `toolStore.ts`
9. 创建工具函数 `fileUtils.ts`、`formatUtils.ts`
10. 配置 `App.vue` 布局框架

**产出**：完整的布局框架，可切换路由，但页面为空壳

---

## 阶段 3：首页

**目标**：实现首页工具卡片展示

**步骤**：
1. 创建 `ToolCard.vue` — 工具卡片组件（图标 + 名称 + 描述 + 点击跳转）
2. 创建 `HomePage.vue` — 首页（标题 + 介绍 + 工具卡片网格）
3. 配置路由 `/` 指向 HomePage

**产出**：首页可展示 5 个工具卡片，点击跳转到对应工具页

---

## 阶段 4：PDF 压缩

**目标**：实现 PDF 压缩功能

**步骤**：
1. 创建 `src/services/pdfService.ts` — 实现 `compressPDF(file, mode)` 函数
   - 基本压缩：`PDFDocument.load()` → `save()`（自动去重优化）
   - 强压缩：基本压缩 + 遍历嵌入图片 → Canvas 重编码 JPEG
2. 创建 `src/workers/pdf.worker.ts` — Worker 入口，接收文件 + 参数，执行压缩，返回结果
3. 创建 `CompressPage.vue` — 压缩页
   - FileDropZone 上传
   - 压缩模式选择（基本/强压缩）
   - 进度显示
   - 结果下载

**产出**：可用的 PDF 压缩功能

---

## 阶段 5：合并 PDF

**目标**：实现多 PDF 合并功能

**步骤**：
1. 扩展 `pdfService.ts` — 实现 `mergePDFs(files)` 函数
   - 使用 `PDFDocument.copyPages()` 逐文件复制页面
   - 保持各 PDF 原始页面尺寸
2. 扩展 `pdf.worker.ts` — 合并处理
3. 创建 `MergePage.vue` — 合并页
   - 多文件上传
   - 拖拽排序文件列表
   - 合并按钮 → 下载

**产出**：可用的 PDF 合并功能

---

## 阶段 6：分割 PDF

**目标**：实现 PDF 分割功能

**步骤**：
1. 扩展 `pdfService.ts` — 实现 `splitPDF(file, mode, ranges)` 函数
   - 按页数模式：每 N 页一个文件
   - 按范围模式：按指定页码范围提取
   - 使用 JSZip 打包多个 PDF
2. 扩展 `pdf.worker.ts` — 分割处理
3. 创建 `SplitPage.vue` — 分割页
   - 上传 PDF
   - 选择分割模式 + 参数
   - ZIP 下载

**产出**：可用的 PDF 分割功能

---

## 阶段 7：PDF 转 Word

**目标**：实现 PDF → Word 转换

**步骤**：
1. 创建 `src/services/wordService.ts` — 实现 `pdfToWord(file)` 函数
   - 使用 pdfjs-dist 提取每页文本 + 坐标
   - 使用 docx.js 重建文档结构（段落、字体、大小）
2. 创建 `src/workers/word.worker.ts` — Worker 入口
3. 创建 `PdfToWordPage.vue` — 转换页
   - 上传 PDF
   - 显示进度
   - 下载 .docx

**产出**：可用的 PDF 转 Word 功能

---

## 阶段 8：PDF 转图片

**目标**：实现 PDF → 图片转换

**步骤**：
1. 创建 `src/services/imageService.ts` — 实现 `pdfToImage(file, format, dpi)` 函数
   - 使用 pdfjs-dist 逐页渲染到 Canvas
   - 按 DPI 计算缩放比例
   - 导出 PNG/JPEG
   - 多页打包 ZIP
2. 创建 `PdfToImagePage.vue` — 转换页
   - 上传 PDF
   - 选择格式（PNG/JPEG）、分辨率（72/150/300 DPI）
   - 预览第一页
   - 下载

**产出**：可用的 PDF 转图片功能

---

## 阶段 9：收尾

**目标**：完善细节

**步骤**：
1. 完善错误处理（文件格式校验、大小限制、加密检测）
2. 响应式适配（移动端基本可用）
3. 编写 README.md
4. 构建测试，确保 `vite build` 成功

---

## 依赖关系

```
阶段 1 (初始化)
  └→ 阶段 2 (基础框架)
       └→ 阶段 3 (首页)
            ├→ 阶段 4 (压缩)
            ├→ 阶段 5 (合并)
            ├→ 阶段 6 (分割)
            ├→ 阶段 7 (转Word)
            ├→ 阶段 8 (转图片)
            └→ 阶段 9 (收尾) ← 在所有功能完成后
```

阶段 4-8 可以并行开发（各自独立）。
