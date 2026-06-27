/**
 * 共享 SEO 元数据 — 用于服务端注入路由级别的 title / description / canonical / OG / JSON-LD / hreflang。
 * 这样即使 Googlebot 不执行 JS，也能看到每个页面的独立信息，而不是所有页面都是首页 HTML。
 */

export interface FaqItem {
  q: string
  a: string
}

export interface SeoEntry {
  path: string
  title: string
  description: string
  /** SoftwareApplication / WebApplication 的名称 */
  applicationName: string
  /** 面包屑分类（繁体中文）*/
  category: string
  /** 面包屑分类英文 */
  categoryEn: string
  /** FAQ 结构化数据 */
  faq?: FaqItem[]
}

export const homeSeo: SeoEntry = {
  path: '/',
  title: 'PDF Elf — 免费在线 PDF 工具 | 在线压缩合并拆分转换',
  description:
    'PDF Elf 是一款免费在线 PDF 处理工具，支持压缩、合并、拆分、转换、旋转、提取、重排页面等 20+ 功能，所有处理在浏览器本地完成，无需上传文件，保护隐私安全。',
  applicationName: 'PDF Elf',
  category: '首页',
  categoryEn: 'Home',
}

/** 所有工具页的 SEO 元数据（中文为主，Google 索引优先 zh-CN）*/
export const toolSeos: SeoEntry[] = [
  // ═══════════════════ 整理 PDF ═══════════════════
  {
    path: '/compress-pdf',
    title: '压缩 PDF - PDF Elf | 免费在线 PDF 压缩工具',
    description:
      'PDF Elf 免费在线 PDF 压缩工具，支持基本和强压缩两种模式。在浏览器本地完成 PDF 压缩处理，无需上传文件，保护隐私安全。拖拽上传即可快速减小 PDF 文件大小，保持高质量。',
    applicationName: 'PDF Elf — 压缩 PDF',
    category: '整理 PDF',
    categoryEn: 'Organize PDF',
    faq: [
      { q: 'PDF 压缩后文件质量会降低吗？', a: '基本压缩模式下，图像和文字质量几乎不受影响，肉眼难以分辨差异。强压缩模式可能有轻微质量损失，但文件体积会更小，适合对文件大小有严格要求的场景。' },
      { q: '压缩后的 PDF 文件保存在哪里？', a: '您的文件自始至终只存在于浏览器中，不会被上传到任何服务器。压缩完成后，文件会自动下载到您的设备本地。' },
      { q: '最大可以压缩多大的 PDF？', a: '理论上没有严格的大小限制，但受浏览器性能影响，建议 100MB 以内的文件处理效果最佳。' },
    ],
  },
  {
    path: '/merge-pdf',
    title: '合并 PDF - PDF Elf | 免费在线 PDF 合并工具',
    description:
      'PDF Elf 免费在线 PDF 合并工具，支持拖拽排序调整文件顺序，可在任意位置插入空白页或新 PDF。纯浏览器本地合并，多个 PDF 快速合为一个文件，无需上传，安全可靠。',
    applicationName: 'PDF Elf — 合并 PDF',
    category: '整理 PDF',
    categoryEn: 'Organize PDF',
    faq: [
      { q: '一次最多可以合并多少个 PDF 文件？', a: '没有严格的文件数量限制，您可以合并任意多个 PDF 文件。不过文件数量过多时，处理时间可能会相应增加。' },
      { q: '合并后文件顺序可以调整吗？', a: '可以，上传文件后直接拖拽缩略图即可调整合并顺序，非常直观方便。' },
      { q: '合并后的文件大小会很大吗？', a: '合并后的文件大小约等于各文件大小之和，建议合并前先用压缩工具将大文件压缩后再合并。' },
    ],
  },
  {
    path: '/split-pdf',
    title: '分割 PDF - PDF Elf | 免费在线 PDF 分割工具',
    description:
      'PDF Elf 免费在线 PDF 分割工具，支持按页码范围提取和按固定页数分割两种模式。纯浏览器本地分割 PDF，快速将大文件拆分为多个独立文件，无需上传服务器。',
    applicationName: 'PDF Elf — 分割 PDF',
    category: '整理 PDF',
    categoryEn: 'Organize PDF',
    faq: [
      { q: '分割后的文件会丢失格式吗？', a: '不会，分割操作只是将原 PDF 按页拆分，不会改动任何页面内容，排版格式和图片质量都会完整保留。' },
      { q: '如何只提取 PDF 中的某几页？', a: '使用「按范围提取」模式，输入您需要的页码范围即可。例如输入「1, 3-5」会提取第 1 页和第 3 到 5 页。' },
      { q: '分割后可以自动命名文件吗？', a: '分割后的文件名会包含原文件名和页码范围，方便您识别每个文件对应的内容。' },
    ],
  },
  {
    path: '/rotate-pdf',
    title: '旋转 PDF - PDF Elf | 免费在线 PDF 旋转工具',
    description:
      'PDF Elf 免费在线 PDF 旋转工具，每页独立设置旋转角度（90°、180°、270°），可视化缩略图预览，浏览器本地处理零上传。轻松解决 PDF 页面方向错误问题，快速高效。',
    applicationName: 'PDF Elf — 旋转 PDF',
    category: '整理 PDF',
    categoryEn: 'Organize PDF',
    faq: [
      { q: '旋转 PDF 会影响页面内容吗？', a: '不会，旋转只是改变页面的显示方向，不会影响文字、图片等任何页面内容的完整性。' },
      { q: '扫描件方向错了可以批量旋转吗？', a: '可以，每页独立设置旋转角度，您可以逐一调整为正确的方向，然后一次性导出。' },
      { q: '旋转后文件大小会变化吗？', a: '基本不会，旋转操作不重新压缩或改变内容，文件大小基本保持不变。' },
    ],
  },
  {
    path: '/delete-pages',
    title: '删除 PDF 页面 - PDF Elf | 免费在线删除 PDF 页面',
    description:
      'PDF Elf 免费在线 PDF 删除页面工具，可视化缩略图勾选即可删除不需要的页面。支持全选/批量操作，浏览器本地处理，原文件不受影响，安全快速删除 PDF 页面。',
    applicationName: 'PDF Elf — 删除 PDF 页面',
    category: '整理 PDF',
    categoryEn: 'Organize PDF',
    faq: [
      { q: '可以删掉 PDF 中的空白页吗？', a: '可以，查看缩略图找到空白页，勾选后删除即可。目前需要手动确认空白页位置。' },
      { q: '删除页面后原文件会被修改吗？', a: '不会，删除操作生成的是一个新的 PDF 文件，您的原始文件不受任何影响。' },
      { q: '不小心删错了可以撤销吗？', a: '勾选阶段只需取消勾选即可调整，操作执行后如需恢复请重新上传原始文件。' },
    ],
  },
  {
    path: '/extract-pages',
    title: '提取 PDF 页面 - PDF Elf | 免费在线 PDF 页面提取',
    description:
      'PDF Elf 免费在线 PDF 页面提取工具，可视化勾选页面即可从 PDF 中提取指定页面生成新文件。支持全选/批量提取，纯浏览器本地处理，排版格式完整保留。',
    applicationName: 'PDF Elf — 提取 PDF 页面',
    category: '整理 PDF',
    categoryEn: 'Organize PDF',
    faq: [
      { q: '提取的页面会保持原始排版吗？', a: '是的，提取操作只是从原 PDF 中复制选定页面，排版、格式、图片质量全部保持原样。' },
      { q: '一次最多能提取多少页？', a: '没有数量限制，您可以提取 PDF 中的任意页面组合，从 1 页到全部页面都可以。' },
      { q: '提取和分割有什么区别？', a: '提取是从 PDF 中选出若干页组成一个新文件，分割是将 PDF 按规则拆分为多个文件。如果只需要其中几页，用提取更便捷。' },
    ],
  },
  {
    path: '/reorder-pages',
    title: '重排 PDF 页面顺序 - PDF Elf | 免费在线 PDF 页面排序',
    description:
      'PDF Elf 免费在线 PDF 页面重排工具，拖拽缩略图即可自由调整 PDF 页面顺序，高清预览确保准确排列。浏览器本地处理，原文件不变，导出新顺序的 PDF 文件。',
    applicationName: 'PDF Elf — 重排 PDF 页面顺序',
    category: '整理 PDF',
    categoryEn: 'Organize PDF',
    faq: [
      { q: '重排页面顺序会修改原始文件吗？', a: '不会，原始文件完全不变，重排后的新 PDF 会作为新文件下载到您的设备。' },
      { q: '页面很多时如何快速重排？', a: '您可以拖拽页面缩略图到目标位置，系统会自动调整其他页面的顺序。对于较多页面的情况，建议分区域调整。' },
      { q: '重排后页码会重新生成吗？', a: '重排只是改变页面的显示顺序，不会自动添加或更改页码文字。如果需要添加页码，可以使用添加水印功能在页面上添加数字编号。' },
    ],
  },

  // ═══════════════════ 编辑 PDF ═══════════════════
  {
    path: '/add-watermark',
    title: 'PDF 添加水印 - PDF Elf | 免费在线 PDF 水印工具',
    description:
      'PDF Elf 免费在线 PDF 水印添加工具，支持自定义水印文字、字体大小、透明度、旋转角度和颜色。水印覆盖每一页，浏览器本地处理，保护文档版权和保密性。',
    applicationName: 'PDF Elf — PDF 添加水印',
    category: '编辑 PDF',
    categoryEn: 'Edit PDF',
    faq: [
      { q: '水印可以放图片或 logo 吗？', a: '目前支持文字水印，您可以输入公司名称、网址等文字作为水印。图片水印功能正在开发中。' },
      { q: '水印添加后可以去除吗？', a: 'PDF Elf 生成的水印是直接嵌入到 PDF 页面内容中的，无法通过本工具直接去除。如需去除请保留原始未加水印的文件。' },
      { q: '水印的推荐设置是什么？', a: '推荐使用 45° 旋转、25% 透明度、灰色文字，这样水印既能有效标识版权，又不会过于干扰阅读体验。' },
    ],
  },

  // ═══════════════════ 从 PDF 转换 ═══════════════════
  {
    path: '/pdf-to-word',
    title: 'PDF 转 Word - PDF Elf | 免费在线 PDF 转 Word 工具',
    description:
      'PDF Elf 免费在线 PDF 转 Word 工具，将 PDF 转换为可编辑的 Word 文档（.docx），保留段落结构和排版格式。纯浏览器本地转换，利用 Pyodide 引擎，文件不会离开您的设备。',
    applicationName: 'PDF Elf — PDF 转 Word',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: '转换后的 Word 文档格式能完全还原吗？', a: '文字内容和段落结构可以较好保留，但复杂的表格、图片排版可能会有少许偏差。对于文字为主的 PDF，转换效果最佳。' },
      { q: '扫描版 PDF 能转换成可编辑的 Word 吗？', a: '目前主要支持文字型 PDF 的转换。扫描版 PDF 本质上是图片，需要先使用 OCR 识别文字后才能转换，OCR 功能正在规划中。' },
      { q: '转换需要多长时间？', a: '较小的 PDF（几十页内）通常在几十秒内完成。首次使用需要短暂加载转换引擎，后续使用会更快。' },
    ],
  },
  {
    path: '/pdf-to-excel',
    title: 'PDF 转 Excel - PDF Elf | 免费在线 PDF 转 Excel 工具',
    description:
      'PDF Elf 免费在线 PDF 转 Excel 工具，将 PDF 中的表格数据转换为可编辑的 Excel 电子表格。每页 PDF 对应一个工作表，浏览器本地转换，敏感数据不会泄露。',
    applicationName: 'PDF Elf — PDF 转 Excel',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: '所有表格都能完整提取吗？', a: '规则的表格数据提取效果最好。合并单元格、嵌套表格等复杂结构可能有部分偏差，建议转换后简单检查调整。' },
      { q: 'PDF 中的图表和图片会保留吗？', a: '目前主要提取表格中的文字数据，嵌入的图表和图片可能不会被导出到 Excel 中。' },
      { q: '转换包含多个表格的页面会怎样？', a: '系统会尽力识别并提取页面中的所有表格数据，每页内容放入单独的 Excel 工作表。' },
    ],
  },
  {
    path: '/pdf-to-ppt',
    title: 'PDF 转 PPT - PDF Elf | 免费在线 PDF 转 PPT 工具',
    description:
      'PDF Elf 免费在线 PDF 转 PPT 工具，将 PDF 转换为 PowerPoint 演示文稿，每页 PDF 对应一张幻灯片。文字可自由编辑，纯浏览器本地转换，大型机密文档无需上传。',
    applicationName: 'PDF Elf — PDF 转 PPT',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: '转换后的 PPT 可以编辑吗？', a: '可以，文字以透明文本框形式覆盖在幻灯片上，您可以自由编辑。背景保留原 PDF 页面的外观。' },
      { q: 'PDF 中的图片会保留到 PPT 中吗？', a: '页面的整体外观（包括图片和背景）会作为幻灯片背景保留，但图片本身可能不可单独编辑或移动。' },
      { q: '转换后字体不一样怎么办？', a: '文字颜色和位置会尽量保留，但具体字体取决于您设备上安装的字体。如果原始 PDF 使用了特殊字体，PPT 可能会替换为相近的系统字体。' },
    ],
  },
  {
    path: '/pdf-to-image',
    title: 'PDF 转图片 - PDF Elf | 免费在线 PDF 转图片工具',
    description:
      'PDF Elf 免费在线 PDF 转图片工具，支持将 PDF 导出为 PNG、JPEG、BMP、TIFF 四种格式。可自定义分辨率（DPI），浏览器本地渲染，图片质量高清无损。每页生成一张图片打包下载。',
    applicationName: 'PDF Elf — PDF 转图片',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: '如何选择最合适的图片格式？', a: 'PNG 适合需要透明背景或高保真的场景，JPEG 适合文件大小敏感的场景（如网页展示），BMP/TIFF 适合印刷或存档用途。' },
      { q: '分辨率越高越好吗？', a: '高 DPI 会生成更清晰的图片，但文件体积也会成倍增加。网页使用建议 150 DPI，印刷建议 300 DPI。' },
      { q: '多页 PDF 转换后会怎样？', a: '每页 PDF 会生成一张独立的图片，所有图片打包为一个 ZIP 文件方便下载。' },
    ],
  },
  {
    path: '/pdf-to-jpg',
    title: 'PDF 转 JPG - PDF Elf | 免费在线 PDF 转 JPG 工具',
    description:
      'PDF Elf 免费在线 PDF 转 JPG 工具，将 PDF 页面导出为高质量 JPG 图片，适合网页展示和社交媒体分享。可自定义分辨率（72-300 DPI），浏览器本地转换，速度快文件安全。',
    applicationName: 'PDF Elf — PDF 转 JPG',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: 'JPG 和 PNG 格式有什么区别？', a: 'JPG 是有损压缩格式，文件体积更小，适合照片和网页展示。PNG 是无损格式，画质更好但文件更大，适合需要透明背景的场景。' },
      { q: 'JPG 图片会有水印吗？', a: '不会，转换生成的 JPG 图片完全干净，不含任何水印。PDF Elf 不添加任何标识或水印到您的文件中。' },
    ],
  },
  {
    path: '/pdf-to-png',
    title: 'PDF 转 PNG - PDF Elf | 免费在线 PDF 转 PNG 工具',
    description:
      'PDF Elf 免费在线 PDF 转 PNG 工具，将 PDF 页面导出为无损 PNG 图片，支持透明背景。可自定义分辨率，满足高清打印和设计需求。浏览器本地渲染，数据完全保密不泄露。',
    applicationName: 'PDF Elf — PDF 转 PNG',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: 'PNG 格式的优势是什么？', a: 'PNG 是无损压缩格式，图片质量不受压缩影响，支持透明背景，非常适合设计稿、Logo 等需要高品质输出的场景。' },
      { q: '转换后的 PNG 文件会很大吗？', a: 'PNG 文件通常比 JPG 大，但质量更好。如果您关心文件大小，可以尝试 JPG 格式。' },
    ],
  },
  {
    path: '/pdf-to-tiff',
    title: 'PDF 转 TIFF - PDF Elf | 免费在线 PDF 转 TIFF 工具',
    description:
      'PDF Elf 免费在线 PDF 转 TIFF 工具，将 PDF 页面导出为 TIFF 格式，适合印刷出版和专业影像处理。支持自定义分辨率，浏览器本地转换，保留最高质量图像信息。',
    applicationName: 'PDF Elf — PDF 转 TIFF',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: 'TIFF 格式适合什么场景？', a: 'TIFF 是无损图像格式，主要用于印刷出版、档案数字化和专业影像处理，能保留最高质量的图像信息。' },
      { q: 'TIFF 和 PNG 有什么区别？', a: '两者都是无损格式，但 TIFF 支持多页文件、CMYK 色彩模式和更高位深，更适合专业印刷。PNG 更通用，适合网页和日常使用。' },
    ],
  },
  {
    path: '/pdf-to-svg',
    title: 'PDF 转 SVG - PDF Elf | 免费在线 PDF 转 SVG 工具',
    description:
      'PDF Elf 免费在线 PDF 转 SVG 工具，将 PDF 全部页面合并为单个 SVG 矢量文件，支持无损缩放，任意放大不失真。浏览器本地转换，可用浏览器或设计软件打开编辑。',
    applicationName: 'PDF Elf — PDF 转 SVG',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: 'SVG 格式有什么优势？', a: 'SVG 是矢量格式，可以无限缩放而不失真，非常适合需要高清展示或在网页中嵌入的场景。可以用浏览器、Illustrator 等软件打开编辑。' },
      { q: '多页 PDF 转成 SVG 会怎样？', a: '所有页面会合并在一个 SVG 文件中，您可以用设计软件分页编辑或整体查看。' },
    ],
  },
  {
    path: '/pdf-to-text',
    title: 'PDF 转文本 - PDF Elf | 免费在线 PDF 文字提取工具',
    description:
      'PDF Elf 免费在线 PDF 转文本工具，从 PDF 中提取纯文字内容，保留段落和换行结构。自动识别文字层级关系，浏览器本地处理，适合快速提取文字用于编辑或翻译。',
    applicationName: 'PDF Elf — PDF 转文本',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: '扫描版 PDF 能提取文字吗？', a: '目前主要支持文字型 PDF 的文字提取。扫描版 PDF 本质上是图片，无法直接提取文字，需要 OCR 识别。' },
      { q: '提取的文字会保持原文格式吗？', a: '文字内容和段落结构会尽量保留，但字体样式、大小、颜色等格式信息不会保留。' },
      { q: '能提取特定区域的文字吗？', a: '目前提取整页的全部文字内容。如果需要区域提取，建议先用其他工具裁剪页面后再提取。' },
    ],
  },
  {
    path: '/pdf-to-html',
    title: 'PDF 转 HTML - PDF Elf | 免费在线 PDF 转 HTML 工具',
    description:
      'PDF Elf 免费在线 PDF 转 HTML 工具，将 PDF 转换为 HTML 网页格式，保留文字位置和页面布局。生成独立可运行的 HTML 文件，适合将 PDF 发布为网页或嵌入到网站中。',
    applicationName: 'PDF Elf — PDF 转 HTML',
    category: '从 PDF 转换',
    categoryEn: 'Convert from PDF',
    faq: [
      { q: '转换后的 HTML 能嵌入到网站中吗？', a: '可以，生成的 HTML 是独立文件，您可以直接用浏览器打开，或将其内容嵌入到您的网页中。' },
      { q: '图片和样式能保留吗？', a: '文字位置和基本布局会尽量还原，但复杂的 CSS 样式、嵌入图片可能需要手动调整。' },
    ],
  },

  // ═══════════════════ 转换成 PDF ═══════════════════
  {
    path: '/word-to-pdf',
    title: 'Word 转 PDF - PDF Elf | 免费在线 Word 转 PDF 工具',
    description:
      'PDF Elf 免费在线 Word 转 PDF 工具，将 Word 文档（.docx）转换为 PDF 格式，方便分享和打印。保留文字内容和基本排版，输出标准 PDF 文件，浏览器本地转换，内容不外泄。',
    applicationName: 'PDF Elf — Word 转 PDF',
    category: '转换成 PDF',
    categoryEn: 'Convert to PDF',
    faq: [
      { q: 'Word 中的图片和表格会保留吗？', a: '文字内容会完整保留，但复杂的表格、图片和排版格式可能无法完整转换，建议转换后检查并微调。' },
      { q: '支持哪些 Word 格式？', a: '目前支持 .docx 格式（Microsoft Word 2007 及以上版本），不支持旧版 .doc 格式。' },
      { q: 'Word 转 PDF 和 PDF 转 Word 有什么区别？', a: 'Word 转 PDF 是将可编辑的 Word 文档转为固定格式的 PDF，适合分享和打印。PDF 转 Word 则相反，将 PDF 转为可编辑的 Word 格式。' },
    ],
  },
  {
    path: '/excel-to-pdf',
    title: 'Excel 转 PDF - PDF Elf | 免费在线 Excel 转 PDF 工具',
    description:
      'PDF Elf 免费在线 Excel 转 PDF 工具，将 Excel 电子表格（.xlsx/.xls）转换为 PDF 格式。保留表格数据和基本结构，每工作表生成独立页面，浏览器本地转换，敏感数据不上传。',
    applicationName: 'PDF Elf — Excel 转 PDF',
    category: '转换成 PDF',
    categoryEn: 'Convert to PDF',
    faq: [
      { q: 'Excel 公式和图表会保留吗？', a: '表格数据会保留，但公式结果会转为静态数值。图表和复杂的条件格式可能无法完整呈现。' },
      { q: '多工作表的 Excel 会怎么处理？', a: '当前转换每个工作表为 PDF 中的独立页面，多个工作表会产生多页 PDF。' },
      { q: '支持 .xls 格式吗？', a: '支持 .xlsx（Excel 2007+）和 .xls（Excel 97-2003）格式。' },
    ],
  },
  {
    path: '/ppt-to-pdf',
    title: 'PPT 转 PDF - PDF Elf | 免费在线 PPT 转 PDF 工具',
    description:
      'PDF Elf 免费在线 PPT 转 PDF 工具，将 PowerPoint（.pptx）转换为 PDF 格式，方便跨设备分享和打印。保留幻灯片文字和基本排版，浏览器本地转换，演示文档内容不会泄露。',
    applicationName: 'PDF Elf — PPT 转 PDF',
    category: '转换成 PDF',
    categoryEn: 'Convert to PDF',
    faq: [
      { q: 'PPT 中的动画和切换效果会保留吗？', a: 'PDF 是静态文档格式，不支持动画。幻灯片的静态内容（文字、基本图形）会保留。' },
      { q: '转换后的 PDF 排版会乱吗？', a: '文字内容会尽量保留原始位置，但特殊字体、复杂的 SmartArt 图形可能需要手动微调。' },
      { q: '支持 .ppt 格式吗？', a: '目前仅支持 .pptx 格式（PowerPoint 2007 及以上版本），旧版 .ppt 格式不支持。' },
    ],
  },
  {
    path: '/image-to-pdf',
    title: '图片转 PDF - PDF Elf | 免费在线图片转 PDF 工具',
    description:
      'PDF Elf 免费在线图片转 PDF 工具，支持 PNG、JPEG、WebP、GIF 等多种格式合并转换为 PDF。可自定义页面尺寸（A4/A3/Letter）和方向，浏览器本地转换，多图一键合并。',
    applicationName: 'PDF Elf — 图片转 PDF',
    category: '转换成 PDF',
    categoryEn: 'Convert to PDF',
    faq: [
      { q: '图片转 PDF 后质量会变差吗？', a: '转换过程不会压缩图片，PDF 中的图片质量与原图保持基本一致。建议使用高分辨率原图以获得最佳输出效果。' },
      { q: '多张图片可以排在一页上吗？', a: '目前每张图片占据一页。如果需要多图排在一页上，建议先将图片拼接成一张图再转换。' },
      { q: '支持的图片格式有哪些？', a: '支持 PNG、JPEG、WebP 和 GIF 格式。推荐使用 PNG 或高质量 JPEG 以获得最佳效果。' },
    ],
  },

  // ═══════════════════ 阅读器 ═══════════════════
  {
    path: '/pdf-reader',
    title: 'PDF 阅读器 - PDF Elf | 免费在线 PDF 阅读器',
    description:
      'PDF Elf 免费在线 PDF 阅读器，纯浏览器端阅读 PDF，无需安装任何软件。支持键盘翻页、缩放、页码导航，适配手机和电脑，大文件快速加载，文件不会上传到服务器。',
    applicationName: 'PDF Elf — PDF 阅读器',
    category: '阅读器',
    categoryEn: 'Reader',
    faq: [
      { q: '阅读器支持哪些 PDF 功能？', a: '支持翻页、缩放、页码跳转等基本阅读功能。此阅读器专注于流畅的阅读体验，不包含编辑功能。' },
      { q: '可以在手机上使用吗？', a: '可以，PDF Elf 阅读器完全适配移动端浏览器，支持触屏滑动翻页和手势缩放。' },
      { q: '阅读的文件会被上传吗？', a: '不会，和 PDF Elf 所有工具一样，阅读的文件仅在您的浏览器本地加载，不会上传到任何服务器。' },
    ],
  },
]

/** path → SeoEntry 快速查找表 */
export const seoMap = new Map<string, SeoEntry>()
for (const entry of [homeSeo, ...toolSeos]) {
  seoMap.set(entry.path, entry)
}

/**
 * 生成路由级 JSON-LD（@graph 数组，可包含 SoftwareApplication + FAQPage + BreadcrumbList）
 * 首页返回 WebApplication schema
 */
export function buildJsonLd(seo: SeoEntry): string {
  const isHome = seo.path === '/'

  const graph: Record<string, unknown>[] = []

  if (isHome) {
    // 首页：Organization — 告诉 Google 这是一个真实实体
    graph.push({
      '@type': 'Organization',
      name: 'PDF Elf',
      url: 'https://pdfelf.online/',
      description: '免费在线 PDF 处理工具，提供压缩、合并、拆分、转换等 20+ PDF 功能',
      logo: 'https://pdfelf.online/favicon.svg',
      sameAs: [
        'https://github.com/factzero/pdfelf',
      ],
    })

    // WebSite + SearchAction — 告诉 Google 这是一个可搜索的功能性网站
    graph.push({
      '@type': 'WebSite',
      name: 'PDF Elf',
      url: 'https://pdfelf.online/',
      description: seo.description,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://pdfelf.online/?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    })

    // WebApplication
    graph.push({
      '@type': 'WebApplication',
      name: seo.applicationName,
      url: 'https://pdfelf.online/',
      description: seo.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'All',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
      browserRequirements: 'Requires JavaScript',
    })
  } else {
    // 子页：SoftwareApplication
    graph.push({
      '@type': 'SoftwareApplication',
      name: seo.applicationName,
      url: `https://pdfelf.online${seo.path}`,
      description: seo.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'All',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    })

    // FAQPage
    if (seo.faq && seo.faq.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: seo.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      })
    }

    // BreadcrumbList
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: 'https://pdfelf.online/' },
        { '@type': 'ListItem', position: 2, name: seo.category, item: 'https://pdfelf.online/' },
        { '@type': 'ListItem', position: 3, name: seo.applicationName.replace('PDF Elf — ', '') },
      ],
    })
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  })
}
