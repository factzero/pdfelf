# PDF Elf — 浏览器端 PDF 处理工具 设计文档

> 日期：2026-06-12
> 状态：设计中

---

## 1. 项目概述

**PDF Elf** 是一个完全在浏览器中运行的免费 PDF 处理工具，无需注册登录，所有文件处理在本地完成，不上传服务器。

### 1.1 产品定位

- 个人免费工具，开源
- 无需登录，即开即用
- 100% 浏览器本地处理，保障隐私

### 1.2 MVP 功能（v1.0）

| 序号 | 功能 | 描述 |
|------|------|------|
| 1 | PDF 压缩 | 基本压缩（去重/移除未用对象）+ 强压缩（含图片重编码） |
| 2 | 合并 PDF | 多 PDF 拖拽排序后合并为单文件 |
| 3 | 分割 PDF | 按页数/页码范围提取，输出 ZIP |
| 4 | PDF 转 Word | 提取文本内容重建 .docx 文档 |
| 5 | PDF 转图片 | 逐页渲染为 PNG/JPEG，可选分辨率和格式 |

### 1.3 非功能需求

- 文件永不上传服务器，所有处理在客户端完成
- 大文件处理使用 Web Worker，不阻塞 UI
- 首屏加载 < 3 秒（含 pdfjs-dist）
- 支持主流现代浏览器（Chrome/Firefox/Edge/Safari 近 2 个版本）

---

## 2. 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | Vue 3 + Composition API | 响应式 UI，中文社区活跃 |
| 构建 | Vite | 快速 HMR，原生 ESM |
| 路由 | vue-router 4 | SPA 页面路由 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| PDF 核心 | pdf-lib | 合并/分割/压缩/元数据操作 |
| PDF 渲染 | pdfjs-dist | 预览渲染、文本提取、转图片 |
| Word 读取 | mammoth.js | .docx → HTML/文本 |
| Word 生成 | docx.js | 编程式生成 .docx |
| ZIP 打包 | jszip | 多文件下载打包 |
| 语言 | TypeScript | 类型安全 |
| 部署 | 静态站点 | GitHub Pages / EdgeOne Pages |
| UI 风格 | 自研组件 | 参考 SmallPDF 简洁现代风格 |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────┐
│                   Vue 3 SPA                      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  路由层   │  │  状态管理  │  │   UI 组件库   │  │
│  │ vue-router│  │  Pinia   │  │  自定义组件    │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │              服务层 (Service Layer)          │ │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │ │
│  │  │ PDF 服务 │ │ Word 服务 │ │  图片服务    │  │ │
│  │  │ pdf-lib │ │mammoth.js│ │Canvas API   │  │ │
│  │  │+pdfjs   │ │+docx.js  │ │             │  │ │
│  │  └─────────┘ └──────────┘ └─────────────┘  │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │              共享工具层                       │ │
│  │  文件上传/下载 | 进度通知 | 错误处理 | 国际化  │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3.1 核心原则

- 每个 PDF 操作是独立服务函数，输入 `File/ArrayBuffer`，输出 `Blob/File`
- 耗时处理在 Web Worker 中执行，不阻塞 UI 主线程
- 服务层与 UI 层完全解耦，可独立测试

---

## 4. 路由设计

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 首页，展示所有工具卡片 |
| `/compress-pdf` | CompressPage | PDF 压缩 |
| `/merge-pdf` | MergePage | 合并 PDF |
| `/split-pdf` | SplitPage | 分割 PDF |
| `/pdf-to-word` | PdfToWordPage | PDF 转 Word |
| `/pdf-to-image` | PdfToImagePage | PDF 转图片 |

---

## 5. 页面布局

### 5.1 通用工具页布局

```
┌──────────────────────────────────────────────────┐
│  Logo   工具1  工具2  工具3  工具4  工具5   语言  │  ← 顶部导航
├──────────────────────────────────────────────────┤
│                                                  │
│              工具标题 (如 🗜️ 压缩 PDF)            │  ← 工具标题
│                                                  │
│    ┌──────────────────────────────────┐          │
│    │          📁 拖放文件至此处        │          │  ← 上传区
│    │         或点击选择文件            │          │
│    └──────────────────────────────────┘          │
│                                                  │
│    支持格式：PDF / Word / 图片 (按工具不同)  │
│                                                  │
│    ┌─ 选项区（按工具不同）────────────────┐        │
│    │  · 压缩级别 / 排序 / 分割模式 等      │        │  ← 选项区
│    └────────────────────────────────────┘        │
│                                                  │
│              [ 开始处理 ]                         │  ← 操作按钮
│                                                  │
├──────────────────────────────────────────────────┤
│  ✓ 100% 浏览器本地处理  │  ✓ 无需上传  │  ✓ 免费  │  ← 信任条
└──────────────────────────────────────────────────┘
```

### 5.2 首页布局

```
┌──────────────────────────────────────────────────┐
│  Logo                         工具列表    语言     │
├──────────────────────────────────────────────────┤
│                                                  │
│            PDF Elf — 免费在线 PDF 工具             │
│            所有处理在浏览器本地完成                  │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 🗜️ 压缩  │ │ 🔗 合并  │ │ ✂️ 分割  │          │
│  │  PDF     │ │  PDF     │ │  PDF     │          │
│  └──────────┘ └──────────┘ └──────────┘          │
│                                                  │
│  ┌──────────┐ ┌──────────┐                       │
│  │ 📄→📝   │ │ 📄→🖼️   │                       │
│  │转 Word  │ │ 转图片   │                       │
│  └──────────┘ └──────────┘                       │
│                                                  │
├──────────────────────────────────────────────────┤
│  ✓ 100% 浏览器本地处理  │  ✓ 无需上传  │  ✓ 免费  │
└──────────────────────────────────────────────────┘
```

### 5.3 通用交互流程

```
进入工具页 → 上传文件（拖放/点击）→ 选择参数 → 点击处理
→ 显示进度 → 自动下载 / 预览结果
```

---

## 6. 组件树

```
App.vue
├── LayoutHeader.vue          # 顶部导航栏
├── <router-view>
│   ├── HomePage.vue          # 首页，工具卡片网格
│   ├── CompressPage.vue      # PDF 压缩页
│   ├── MergePage.vue         # 合并 PDF 页
│   ├── SplitPage.vue         # 分割 PDF 页
│   ├── PdfToWordPage.vue     # PDF 转 Word 页
│   └── PdfToImagePage.vue    # PDF 转图片页
├── components/
│   ├── FileDropZone.vue      # 拖放上传组件（通用）
│   ├── ProgressBar.vue       # 处理进度条
│   ├── ToolCard.vue          # 首页工具卡片
│   ├── TrustBar.vue          # 底部信任条
│   └── ResultDownload.vue    # 结果下载/预览区
├── workers/
│   ├── pdf.worker.ts         # PDF 处理 Web Worker
│   └── word.worker.ts        # Word 转换 Web Worker
├── services/
│   ├── pdfService.ts         # PDF 操作：压缩/合并/分割
│   ├── wordService.ts        # Word 转换：PDF→Word
│   └── imageService.ts       # 图片处理：PDF→Image
├── stores/
│   └── toolStore.ts          # Pinia 全局状态
└── utils/
    ├── fileUtils.ts          # 文件读取/下载工具
    └── formatUtils.ts        # 格式化工具
```

---

## 7. 核心功能实现方案

### 7.1 PDF 压缩

- **技术**：pdf-lib + Canvas API
- **基本压缩**：`PDFDocument.save()` 自动去重对象 + 移除未使用资源 + 字体子集化，预计缩小 20-40%
- **强压缩**：基本压缩 + 提取嵌入图片通过 Canvas 重编码为较低质量 JPEG（质量可调 0.5-0.9）
- **输入**：PDF 文件（最大 100MB）
- **输出**：压缩后的 PDF Blob

### 7.2 合并 PDF

- **技术**：pdf-lib `PDFDocument.copyPages()` + `addPage()`
- **流程**：上传多个 PDF → 拖拽排序 → 点击合并 → 输出单一 PDF
- **边界处理**：混合不同页面尺寸的 PDF，保持各自原尺寸

### 7.3 分割 PDF

- **技术**：pdf-lib 按页码范围提取页面，生成多个 PDFDocument
- **模式**：
  - 按页数分割：每 N 页生成一个文件
  - 按范围提取：手动输入页码范围（如 1-3, 5-8）
- **输出**：JSZip 打包多个 PDF → 单个 ZIP 下载

### 7.4 PDF 转 Word

- **技术**：pdfjs-dist 提取文本 + 坐标 → docx.js 重建
- **策略**：优先保证文本完整性，尽可能保留段落结构和字体样式
- **已知限制**：复杂排版（多栏、表格）可能丢失布局信息

### 7.5 PDF 转图片

- **技术**：pdfjs-dist 逐页渲染到 Canvas → `Canvas.toBlob()`
- **选项**：
  - 格式：PNG（无损）/ JPEG（有损，体积小）
  - 分辨率：72 DPI（预览）/ 150 DPI（标准）/ 300 DPI（高清）
  - 页面范围：全部 / 指定页码
- **输出**：单页直接下载图片，多页打包为 ZIP

---

## 8. Web Worker 策略

耗时操作放入 Worker 避免阻塞 UI：

- **pdf.worker.ts**：合并 PDF、分割 PDF、PDF 压缩
- **word.worker.ts**：PDF 文本提取 + docx 生成
- **图片转换**：Canvas 操作本身不阻塞（异步），可直接在主线程

Worker 与主线程通过 `postMessage` 通信，传递 ArrayBuffer 数据（使用 Transferable 避免拷贝开销）。

---

## 9. 错误处理

| 场景 | 处理方式 |
|------|----------|
| 文件格式不支持 | 上传时前端校验，提示支持格式 |
| 文件过大（>100MB） | 上传时校验，提示文件过大 |
| PDF 加密/密码保护 | 提示用户输入密码或无法处理 |
| PDF 解析失败 | 捕获异常，提示文件可能损坏 |
| 浏览器不支持 | 检测关键 API（Worker/Canvas），不支持的浏览器给出提示 |
| Worker 超时 | 设置 60 秒超时，超时后提示并中止 |

---

## 10. 项目结构

```
pdfelf/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── pages/
│   │   ├── HomePage.vue
│   │   ├── CompressPage.vue
│   │   ├── MergePage.vue
│   │   ├── SplitPage.vue
│   │   ├── PdfToWordPage.vue
│   │   └── PdfToImagePage.vue
│   ├── components/
│   │   ├── LayoutHeader.vue
│   │   ├── FileDropZone.vue
│   │   ├── ProgressBar.vue
│   │   ├── ToolCard.vue
│   │   ├── TrustBar.vue
│   │   └── ResultDownload.vue
│   ├── services/
│   │   ├── pdfService.ts
│   │   ├── wordService.ts
│   │   └── imageService.ts
│   ├── workers/
│   │   ├── pdf.worker.ts
│   │   └── word.worker.ts
│   ├── stores/
│   │   └── toolStore.ts
│   ├── utils/
│   │   ├── fileUtils.ts
│   │   └── formatUtils.ts
│   └── styles/
│       └── global.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 11. 后续版本规划（v1.0 之后）

- 更多工具：旋转 PDF、删除页面、提取页面、添加水印
- 更多转换：Word/Excel/PPT 转 PDF、图片转 PDF
- 暗色模式
- 国际化（中/英）
- PWA 离线支持
- 桌面应用（Electron/Tauri 打包）
