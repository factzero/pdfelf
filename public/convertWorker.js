/**
 * PDF 转换 Web Worker
 *
 * 在后台线程中运行 pyodide，支持：
 *   - PDF → Word  (pdf2docx)
 *   - PDF → Excel (pymupdf + openpyxl)
 *   - PDF → PPT   (pymupdf + python-pptx)
 *
 * 消息协议:
 *   Main → Worker: { type: 'init' }
 *   Main → Worker: { type: 'convert', id: string, data: ArrayBuffer, convertType?: 'word'|'excel'|'ppt' }
 *   Worker → Main: { type: 'ready' }
 *   Worker → Main: { type: 'progress', id, percent, stage, params? }
 *   Worker → Main: { type: 'result',  id, data: ArrayBuffer }
 *   Worker → Main: { type: 'error',   id, message }
 */

let pyodide = null
let pyodideReady = false
let initPromise = null
const installed = new Set()

/* ---- 路径 ---- */
const PYODIDE_BASE = '/pyodide/'
const WHL_BASE = '/pyodide/whl/'

/* ---- 包列表 ---- */
const BUILTIN_PKGS = [
  'cryptography',       // pdfminer.six 依赖（wasm/C 扩展，必须用 loadPackage）
  'fonttools',
  'lxml',
  'micropip',
  'numpy',
  'opencv-python',
  'pillow',
  'pymupdf',
  'typing-extensions',
]

// 纯 Python 包，通过 micropip 从本地 whl 安装
// 顺序很重要：先装依赖再装主包（deps=False 不会自动解析依赖）
const WHL_PKGS = {
  'charset-normalizer': 'charset_normalizer-3.4.7-py3-none-any.whl',  // pdfminer.six 依赖
  'pdfminer-six':       'pdfminer_six-20260107-py3-none-any.whl',      // pdf2docx 依赖
  'python-docx':        'python_docx-1.2.0-py3-none-any.whl',          // pdf2docx 依赖
  'pdf2docx':           'pdf2docx-0.5.13-py3-none-any.whl',            // PDF→Word
  'et-xmlfile':         'et_xmlfile-2.0.0-py3-none-any.whl',           // openpyxl 依赖
  'openpyxl':           'openpyxl-3.1.5-py2.py3-none-any.whl',         // PDF→Excel
  'python-pptx':        'python_pptx-1.0.2-py3-none-any.whl',          // PDF→PPT
}

/* ---- 工具函数 ---- */
function post(msg) {
  self.postMessage(msg)
}

function logErr() {
  var args = Array.prototype.slice.call(arguments)
  console.error.apply(console, ['[convertWorker]'].concat(args))
}

// 临时屏蔽 pyodide 内部的 console.log 打印
function silenceConsole() {
  self.__consoleLog = console.log
  console.log = function () {}
}
function restoreConsole() {
  if (self.__consoleLog) {
    console.log = self.__consoleLog
    delete self.__consoleLog
  }
}

/* ---- 初始化 pyodide ---- */
async function doInit() {
  if (pyodideReady) return

  post({ type: 'progress', id: '__init__', percent: 5, stage: 'preparing' })

  // 1. 加载 pyodide runtime（Module Worker 使用 dynamic import）
  try {
    var pyodideModule = await import(PYODIDE_BASE + 'pyodide.esm.js')
  } catch (err) {
    logErr('import pyodide.esm.js 失败:', err)
    throw new Error('加载 pyodide 入口脚本失败: ' + (err && err.message ? err.message : String(err)))
  }

  // 2. 初始化 pyodide 实例（下载 ~9MB wasm + 加载 stdlib）
  post({ type: 'progress', id: '__init__', percent: 8, stage: 'preparing' })
  try {
    pyodide = await pyodideModule.loadPyodide({ indexURL: PYODIDE_BASE })
  } catch (err) {
    logErr('loadPyodide 失败:', err)
    var wasmMsg = ''
    if (err && err.message && /wasm|WebAssembly|Network|aborted/i.test(err.message)) {
      wasmMsg = '（WebAssembly 加载失败，请检查网络或服务端是否有反向代理超时配置）'
    }
    throw new Error('初始化 pyodide 运行时失败: ' + (err && err.message ? err.message : String(err)) + wasmMsg)
  }

  // 3. 加载 micropip
  try {
    silenceConsole()
    try { await pyodide.loadPackage('micropip') } finally { restoreConsole() }
    installed.add('micropip')
  } catch (err) {
    logErr('加载 micropip 失败:', err)
    throw new Error('加载 micropip 失败: ' + (err && err.message ? err.message : String(err)))
  }

  // 4. 加载内置包（wasm/C 扩展）
  var builtinToLoad = BUILTIN_PKGS.filter(function (p) { return !installed.has(p) })
  if (builtinToLoad.length > 0) {
    post({ type: 'progress', id: '__init__', percent: 10, stage: 'loadingDeps' })
    try {
      silenceConsole()
      try { await pyodide.loadPackage(builtinToLoad) } finally { restoreConsole() }
      builtinToLoad.forEach(function (p) { installed.add(p) })
    } catch (err) {
      logErr('加载内置包失败:', err)
      throw new Error('加载内置包失败: ' + (err && err.message ? err.message : String(err)))
    }
  }

  // 5. 安装纯 Python 包（从 whl 文件）
  var thirdPartyToLoad = Object.keys(WHL_PKGS).filter(function (p) { return !installed.has(p) })
  if (thirdPartyToLoad.length > 0) {
    var origin = self.location.origin
    for (var i = 0; i < thirdPartyToLoad.length; i++) {
      var pkg = thirdPartyToLoad[i]
      var url = origin + WHL_BASE + WHL_PKGS[pkg]
      try {
        await pyodide.runPythonAsync('import micropip; await micropip.install(\'' + url + '\', deps=False)')
        installed.add(pkg)
      } catch (err) {
        logErr('安装 whl 包失败:', pkg, err)
        throw new Error('安装 ' + pkg + ' 失败: ' + (err && err.message ? err.message : String(err)))
      }
    }
  }

  pyodideReady = true
  post({ type: 'ready' })
}

/* ---- 执行转换 ---- */
async function doConvert(id, pdfData, convertType) {
  if (convertType === 'excel') {
    return doConvertPdfToExcel(id, pdfData)
  }
  if (convertType === 'ppt') {
    return doConvertPdfToPpt(id, pdfData)
  }
  return doConvertPdfToWord(id, pdfData)
}

async function doConvertPdfToWord(id, pdfData) {
  post({ type: 'progress', id, percent: 5, stage: 'preparing' })

  // 写入输入 PDF（到 pyodide 虚拟文件系统）
  try {
    pyodide.FS.writeFile('/input.pdf', pdfData)
  } catch (err) {
    logErr('写入 PDF 失败:', err)
    throw new Error('写入 PDF 文件失败: ' + (err && err.message ? err.message : String(err)))
  }
  post({ type: 'progress', id, percent: 22, stage: 'readingPdf' })

  // 捕获 stderr，从 pdf2docx 日志中提取实时进度
  pyodide.setStderr({
    batched: function (str) {
      var lines = str.split('\n')
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim()
        if (!line) continue

        // 逐页进度: "[INFO] (3/33) Page 3"
        var pageMatch = line.match(/\((\d+)\/(\d+)\)\s*Page/)
        if (pageMatch) {
          var current = parseInt(pageMatch[1], 10)
          var total = parseInt(pageMatch[2], 10)
          var ratio = total > 0 ? current / total : 0
          post({
            type: 'progress', id,
            percent: Math.round(40 + ratio * 48),
            stage: 'parsingPages',
            params: { current: current, total: total },
          })
          continue
        }

        // 阶段标记
        if (/\[1\/\d+\]/.test(line) || /Opening document/i.test(line)) {
          post({ type: 'progress', id, percent: 30, stage: 'openingDoc' })
        } else if (/\[2\/\d+\]/.test(line) || /Analyzing document/i.test(line)) {
          post({ type: 'progress', id, percent: 36, stage: 'analyzingDoc' })
        } else if (/\[4\/\d+\]/.test(line) || /Creating|Generating|Terminated/i.test(line)) {
          post({ type: 'progress', id, percent: 90, stage: 'creatingDocx' })
        }
      }
    },
  })

  // 运行 Python 转换
  try {
    await pyodide.runPythonAsync(
      'import logging\n' +
      'logging.disable(logging.NOTSET)\n' +
      'from pdf2docx import Converter\n' +
      "cv = Converter('/input.pdf')\n" +
      "cv.convert(docx_filename='/output.docx', multi_processing=False)\n" +
      'cv.close()\n'
    )
  } catch (err) {
    logErr('pdf2docx 转换失败:', err)
    throw new Error('PDF 转换失败: ' + (err && err.message ? err.message : String(err)))
  } finally {
    // 还原 stderr 为空操作，保持安静
    pyodide.setStderr({ batched: function () {} })
  }

  post({ type: 'progress', id, percent: 93, stage: 'finalizing' })

  // 读取输出
  var outputBytes
  try {
    outputBytes = pyodide.FS.readFile('/output.docx')
  } catch (err) {
    logErr('读取输出文件失败:', err)
    throw new Error('读取生成的 docx 文件失败: ' + (err && err.message ? err.message : String(err)))
  }

  // 清理虚拟文件系统
  try { pyodide.FS.unlink('/input.pdf') } catch (_) { /* ok */ }
  try { pyodide.FS.unlink('/output.docx') } catch (_) { /* ok */ }

  post({ type: 'progress', id, percent: 100, stage: 'finalizing' })

  // 返回 ArrayBuffer（通过 Transferable 零拷贝传输）
  return outputBytes.buffer
}

async function doConvertPdfToExcel(id, pdfData) {
  post({ type: 'progress', id, percent: 5, stage: 'preparing' })

  // 写入输入 PDF
  try {
    pyodide.FS.writeFile('/input.pdf', pdfData)
  } catch (err) {
    logErr('写入 PDF 失败:', err)
    throw new Error('写入 PDF 文件失败: ' + (err && err.message ? err.message : String(err)))
  }
  post({ type: 'progress', id, percent: 15, stage: 'readingPdf' })

  // 捕获 stderr，提取进度信息
  pyodide.setStderr({
    batched: function (str) {
      var lines = str.split('\n')
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim()
        if (!line) continue

        // 逐页进度: "[EXCEL] page 3/10"
        var pageMatch = line.match(/\[EXCEL\]\s*page\s*(\d+)\/(\d+)/i)
        if (pageMatch) {
          var current = parseInt(pageMatch[1], 10)
          var total = parseInt(pageMatch[2], 10)
          var ratio = total > 0 ? current / total : 0
          post({
            type: 'progress', id,
            percent: Math.round(25 + ratio * 68),
            stage: 'parsingPages',
            params: { current: current, total: total },
          })
        }
      }
    },
  })

  // 运行 Python 转换
  try {
    await pyodide.runPythonAsync(
      'import fitz\n' +
      'from openpyxl import Workbook\n' +
      'from openpyxl.utils import get_column_letter\n' +
      '\n' +
      "doc = fitz.open('/input.pdf')\n" +
      'total = len(doc)\n' +
      'wb = Workbook()\n' +
      'if "Sheet" in wb.sheetnames and total > 1:\n' +
      '    del wb["Sheet"]\n' +
      '\n' +
      'for pn in range(total):\n' +
      '    page = doc[pn]\n' +
      '    words = page.get_text("words")\n' +
      '    if not words:\n' +
      '        ws = wb.create_sheet(title=f"Page {pn+1}") if total > 1 else wb.active\n' +
      '        continue\n' +
      '\n' +
      '    # Group words by Y position (tolerance 5pt)\n' +
      '    lines = {}\n' +
      '    for w in words:\n' +
      '        y = round(w[1])  # y0\n' +
      '        found = None\n' +
      '        for ky in lines:\n' +
      '            if abs(ky - y) <= 5:\n' +
      '                found = ky\n' +
      '                break\n' +
      '        if found is not None:\n' +
      '            lines[found].append(w)\n' +
      '        else:\n' +
      '            lines[y] = [w]\n' +
      '\n' +
      '    sorted_ys = sorted(lines.keys())\n' +
      '    sheet_name = f"Page {pn+1}" if total > 1 else "Sheet1"\n' +
      '    ws = wb.create_sheet(title=sheet_name)\n' +
      '\n' +
      '    for row_idx, y in enumerate(sorted_ys, 1):\n' +
      '        line = sorted(lines[y], key=lambda w: w[0])\n' +
      '        for col_idx, w in enumerate(line, 1):\n' +
      '            ws.cell(row=row_idx, column=col_idx, value=w[4])\n' +
      '\n' +
      '    # Auto-fit column widths\n' +
      '    for col_cells in ws.columns:\n' +
      '        max_len = 0\n' +
      '        col_letter = get_column_letter(col_cells[0].column)\n' +
      '        for cell in col_cells:\n' +
      '            if cell.value:\n' +
      '                max_len = max(max_len, len(str(cell.value)))\n' +
      '        ws.column_dimensions[col_letter].width = min(max_len + 3, 50)\n' +
      '\n' +
      '    import sys\n' +
      '    print(f"[EXCEL] page {pn+1}/{total}", file=sys.stderr)\n' +
      '\n' +
      "wb.save('/output.xlsx')\n" +
      'doc.close()\n'
    )
  } catch (err) {
    logErr('PDF→Excel 转换失败:', err)
    throw new Error('PDF 转 Excel 失败: ' + (err && err.message ? err.message : String(err)))
  } finally {
    pyodide.setStderr({ batched: function () {} })
  }

  post({ type: 'progress', id, percent: 95, stage: 'finalizing' })

  // 读取输出
  var outputBytes
  try {
    outputBytes = pyodide.FS.readFile('/output.xlsx')
  } catch (err) {
    logErr('读取输出文件失败:', err)
    throw new Error('读取生成的 xlsx 文件失败: ' + (err && err.message ? err.message : String(err)))
  }

  // 清理虚拟文件系统
  try { pyodide.FS.unlink('/input.pdf') } catch (_) { /* ok */ }
  try { pyodide.FS.unlink('/output.xlsx') } catch (_) { /* ok */ }

  post({ type: 'progress', id, percent: 100, stage: 'finalizing' })
  return outputBytes.buffer
}

async function doConvertPdfToPpt(id, pdfData) {
  post({ type: 'progress', id, percent: 5, stage: 'preparing' })

  // 写入输入 PDF
  try {
    pyodide.FS.writeFile('/input.pdf', pdfData)
  } catch (err) {
    logErr('写入 PDF 失败:', err)
    throw new Error('写入 PDF 文件失败: ' + (err && err.message ? err.message : String(err)))
  }
  post({ type: 'progress', id, percent: 15, stage: 'readingPdf' })

  // 捕获 stderr，提取进度信息
  pyodide.setStderr({
    batched: function (str) {
      var lines = str.split('\n')
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim()
        if (!line) continue

        // 逐页进度: "[PPT] page 3/10"
        var pageMatch = line.match(/\[PPT\]\s*page\s*(\d+)\/(\d+)/i)
        if (pageMatch) {
          var current = parseInt(pageMatch[1], 10)
          var total = parseInt(pageMatch[2], 10)
          var ratio = total > 0 ? current / total : 0
          post({
            type: 'progress', id,
            percent: Math.round(20 + ratio * 75),
            stage: 'parsingPages',
            params: { current: current, total: total },
          })
        }

        // 文本框数量: "[PPT] 第1页: 12 个文本框"
        var tbMatch = line.match(/\[PPT\]\s*第\s*(\d+)\s*页[：:]\s*(\d+)\s*个文本框/)
        if (tbMatch && pageMatch === null) { // 只在不是标准进度行时处理
          // 阶段信息，已通过逐页进度处理
        }
      }
    },
  })

  // 运行 Python 转换: 混合模式 — pymupdf redact 去文字渲染背景图 + python-pptx 透明文本框覆盖 → 文字可编辑
  try {
    await pyodide.runPythonAsync(
      'import fitz, io, sys, os\n' +
      'from pptx import Presentation\n' +
      'from pptx.util import Inches, Emu, Pt\n' +
      'from pptx.dml.color import RGBColor\n' +
      'from pptx.enum.text import MSO_AUTO_SIZE\n' +
      'from pptx.oxml.ns import qn\n' +
      '\n' +
      '# ---- 字体映射 --------------------------------------------------------\n' +
      'FONT_FALLBACK = {\n' +
      '    "TimesNewRomanPSMT": "Times New Roman",\n' +
      '    "TimesNewRomanPS-BoldMT": "Times New Roman",\n' +
      '    "TimesNewRomanPS-ItalicMT": "Times New Roman",\n' +
      '    "TimesNewRomanPS-BoldItalicMT": "Times New Roman",\n' +
      '    "ArialMT": "Arial", "Arial-BoldMT": "Arial",\n' +
      '    "Arial-ItalicMT": "Arial", "Arial-BoldItalicMT": "Arial",\n' +
      '    "Courier": "Courier New", "CourierNewPSMT": "Courier New",\n' +
      '    "Helvetica": "Arial", "Helvetica-Bold": "Arial",\n' +
      '    "Helvetica-Oblique": "Arial", "Helvetica-BoldOblique": "Arial",\n' +
      '}\n' +
      'DEFAULT_FONT = "Arial"\n' +
      'DEFAULT_CN_FONT = "Microsoft YaHei"\n' +
      '\n' +
      'def _is_cn(c):\n' +
      '    cp = ord(c)\n' +
      '    return (0x4E00 <= cp <= 0x9FFF or 0x3400 <= cp <= 0x4DBF or\n' +
      '            0xFF00 <= cp <= 0xFFEF or 0x3000 <= cp <= 0x303F or\n' +
      '            0x2000 <= cp <= 0x206F)\n' +
      '\n' +
      'def _get_font_name(pf, t=""):\n' +
      '    pf = pf.strip() if pf else ""\n' +
      '    if pf in FONT_FALLBACK: return FONT_FALLBACK[pf]\n' +
      '    for k, v in FONT_FALLBACK.items():\n' +
      '        if k.lower() in pf.lower(): return v\n' +
      '    if t and any(_is_cn(c) for c in t): return DEFAULT_CN_FONT\n' +
      '    return DEFAULT_FONT\n' +
      '\n' +
      'def _clean_text(text):\n' +
      '    """移除 XML 不允许的控制字符"""\n' +
      '    allowed = {0x09, 0x0A, 0x0D}\n' +
      '    result = []\n' +
      '    for ch in text:\n' +
      '        cp = ord(ch)\n' +
      '        if cp in allowed or (0x20 <= cp <= 0xD7FF) or (0xE000 <= cp <= 0xFFFD) or (cp >= 0x10000):\n' +
      '            result.append(ch)\n' +
      '    return "".join(result)\n' +
      '\n' +
      'def _parse_flags(flags):\n' +
      '    return {"bold": bool(flags & 16), "italic": bool(flags & 2),\n' +
      '            "superscript": bool(flags & 1), "mono": bool(flags & 8)}\n' +
      '\n' +
      'def _int_to_rgb(c):\n' +
      '    return RGBColor((c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF)\n' +
      '\n' +
      'def _add_textbox(slide, block):\n' +
      '    """在幻灯片上添加透明文本框（无填充、无边框）"""\n' +
      '    x0, y0, x1, y1 = block["bbox"]\n' +
      '    pad = 3  # pt\n' +
      '    left = Emu(int((x0 - pad) * 12700))\n' +
      '    top = Emu(int((y0 - pad) * 12700))\n' +
      '    w = Emu(int((x1 - x0 + pad * 2) * 12700))\n' +
      '    h = Emu(int((y1 - y0 + pad * 2) * 12700))\n' +
      '    if w < Emu(200) or h < Emu(100): return\n' +
      '    txBox = slide.shapes.add_textbox(left, top, w, h)\n' +
      '    txBox.fill.background()\n' +
      '    txBox.line.fill.background()\n' +
      '    tf = txBox.text_frame\n' +
      '    tf.word_wrap = False\n' +
      '    tf.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT\n' +
      '    tf.paragraphs[0].clear()\n' +
      '    lines = block.get("lines", [])\n' +
      '    first_line = True\n' +
      '    for line in lines:\n' +
      '        spans = line.get("spans", [])\n' +
      '        if not spans: continue\n' +
      '        p = tf.paragraphs[0] if first_line else tf.add_paragraph()\n' +
      '        first_line = False\n' +
      '        for span in spans:\n' +
      '            text = span.get("text", "")\n' +
      '            if not text: continue\n' +
      '            run = p.add_run()\n' +
      '            run.text = _clean_text(text)\n' +
      '            fn = _get_font_name(span.get("font", ""), text)\n' +
      '            run.font.name = fn\n' +
      '            sz = span.get("size", 12)\n' +
      '            if sz < 2: sz = 12\n' +
      '            run.font.size = Pt(sz)\n' +
      '            fmt = _parse_flags(span.get("flags", 0))\n' +
      '            run.font.bold = fmt["bold"]\n' +
      '            run.font.italic = fmt["italic"]\n' +
      '            try: run.font.color.rgb = _int_to_rgb(span.get("color", 0))\n' +
      '            except: pass\n' +
      '            if fmt["mono"]: run.font.name = "Courier New"\n' +
      '        # 行距 120%\n' +
      '        pPr = p._p.get_or_add_pPr()\n' +
      '        lnSpc = pPr.makeelement(qn("a:lnSpc"), {})\n' +
      '        spcPct = lnSpc.makeelement(qn("a:spcPct"), {"val": "120000"})\n' +
      '        lnSpc.append(spcPct)\n' +
      '        pPr.append(lnSpc)\n' +
      '\n' +
      '# ---- 主转换逻辑 --------------------------------------------------------\n' +
      "doc = fitz.open('/input.pdf')\n" +
      'total = len(doc)\n' +
      'prs = Presentation()\n' +
      'prs.slide_width = Inches(13.333)\n' +
      'prs.slide_height = Inches(7.5)\n' +
      'layout = prs.slide_layouts[6]  # blank\n' +
      '\n' +
      'for pn in range(total):\n' +
      '    page = doc[pn]\n' +
      '    # 用第一页尺寸设定幻灯片大小\n' +
      '    if pn == 0:\n' +
      '        rect = page.rect\n' +
      '        prs.slide_width = Emu(int(rect.width * 12700))\n' +
      '        prs.slide_height = Emu(int(rect.height * 12700))\n' +
      '\n' +
      '    # 1) 提取文本信息（必须在 redact 之前）\n' +
      '    blocks = page.get_text("dict")["blocks"]\n' +
      '    text_blocks = [b for b in blocks if b.get("type") == 0]\n' +
      '\n' +
      '    # 2) 遮盖文字区域 → 渲染无文字背景图\n' +
      '    for block in text_blocks:\n' +
      '        bbox = block["bbox"]\n' +
      '        r = fitz.Rect(*bbox)\n' +
      '        r.x0 -= 2; r.y0 -= 2; r.x1 += 2; r.y1 += 2\n' +
      '        page.add_redact_annot(r, fill=None)\n' +
      '    page.apply_redactions(\n' +
      '        images=fitz.PDF_REDACT_IMAGE_NONE,\n' +
      '        graphics=fitz.PDF_REDACT_LINE_ART_NONE)\n' +
      '\n' +
      '    # 3) 渲染为 PNG 背景图 (150 DPI)\n' +
      '    mat = fitz.Matrix(150 / 72, 150 / 72)\n' +
      '    pix = page.get_pixmap(matrix=mat)\n' +
      '    with open("/tmp_bg.png", "wb") as f:\n' +
      '        f.write(pix.tobytes("png"))\n' +
      '\n' +
      '    # 4) 创建幻灯片，铺满背景图\n' +
      '    slide = prs.slides.add_slide(layout)\n' +
      '    slide.shapes.add_picture("/tmp_bg.png", Emu(0), Emu(0),\n' +
      '                             prs.slide_width, prs.slide_height)\n' +
      '\n' +
      '    # 5) 覆盖透明文本框（可编辑文字）\n' +
      '    for block in text_blocks:\n' +
      '        _add_textbox(slide, block)\n' +
      '\n' +
      '    os.unlink("/tmp_bg.png")\n' +
      '    print(f"[PPT] page {pn+1}/{total}", file=sys.stderr)\n' +
      '\n' +
      "prs.save('/output.pptx')\n" +
      'doc.close()\n'
    )
  } catch (err) {
    logErr('PDF→PPT 转换失败:', err)
    throw new Error('PDF 转 PPT 失败: ' + (err && err.message ? err.message : String(err)))
  } finally {
    pyodide.setStderr({ batched: function () {} })
  }

  post({ type: 'progress', id, percent: 95, stage: 'finalizing' })

  // 读取输出
  var outputBytes
  try {
    outputBytes = pyodide.FS.readFile('/output.pptx')
  } catch (err) {
    logErr('读取输出文件失败:', err)
    throw new Error('读取生成的 pptx 文件失败: ' + (err && err.message ? err.message : String(err)))
  }

  // 清理虚拟文件系统
  try { pyodide.FS.unlink('/input.pdf') } catch (_) { /* ok */ }
  try { pyodide.FS.unlink('/output.pptx') } catch (_) { /* ok */ }

  post({ type: 'progress', id, percent: 100, stage: 'finalizing' })
  return outputBytes.buffer
}

/* ---- 消息处理 ---- */
self.onmessage = async function (e) {
  var msg = e.data
  var type = msg.type
  var id = msg.id

  try {
    if (type === 'init') {
      if (!initPromise) {
        initPromise = doInit().catch(function (err) {
          // 失败时重置 initPromise，允许下次重试
          initPromise = null
          throw err
        })
      }
      await initPromise
    } else if (type === 'convert') {
      // 确保 pyodide 已就绪
      if (!initPromise) {
        initPromise = doInit().catch(function (err) {
          initPromise = null
          throw err
        })
      }
      await initPromise

      var buffer = await doConvert(id, msg.data, msg.convertType || 'word')
      // Transferable: 零拷贝传输 ArrayBuffer 回主线程
      post({ type: 'result', id: id, data: buffer }, [buffer])
    } else {
      logErr('未知消息类型:', type)
      post({ type: 'error', id: id, message: 'Unknown message type: ' + type })
    }
  } catch (err) {
    var errMsg = err && err.message ? err.message : String(err)
    logErr('处理消息失败, type =', type, ', id =', id, ', error =', errMsg)
    post({ type: 'error', id: id, message: errMsg })
  }
}

// 顶层未捕获错误兜底
self.onerror = function (e) {
  logErr('Worker onerror:', e && e.message ? e.message : String(e))
}
self.onunhandledrejection = function (e) {
  logErr('Worker onunhandledrejection:', e && e.reason ? (e.reason.message || String(e.reason)) : String(e))
}
