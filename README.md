# PDF Elf

[**中文版 README**](README.zh-CN.md) | Read this in [Chinese](README.zh-CN.md)

Free online PDF toolkit with **49 PDF tools**, all processed locally in your browser — nothing is uploaded to any server.

## Features

### Organize PDF
- **Compress PDF** — Basic mode preserves the text layer (text-only pages unchanged, image pages rebuilt), Strong mode rebuilds all pages as JPEG; both modes significantly reduce file size
- **Merge PDF** — Combine multiple PDFs into one, with drag-and-drop ordering
- **Split PDF** — Split by page range or every N pages
- **Rotate PDF** — Rotate PDF pages, independent angle per page
- **Delete Pages** — Remove unwanted pages from a PDF
- **Extract Pages** — Extract specific pages into a new file
- **Reorder Pages** — Drag to reorder PDF pages, then re-export
- **Flatten PDF** — Permanently flatten fillable forms and annotations into read-only content
- **N-up Layout** — Scale multiple pages onto one sheet for printing
- **Split by Bookmarks** — Auto-split a PDF into multiple files by its bookmarks/table of contents
- **Deskew** — Automatically correct the tilt angle of scanned pages

### Edit PDF
- **Add Watermark** — Add text watermarks to every page, with custom font size, opacity, color, angle
- **Add Page Numbers** — Insert page numbers with configurable position, size, format, font
- **Header & Footer** — Add headers and footers to every page with custom alignment and font
- **PDF Overlay** — Overlay two PDF layers and merge into one file

### Security
- **Encrypt PDF** — Password-protect a PDF, restrict open/print/modify permissions
- **Decrypt PDF** — Remove password protection from a PDF
- **Crop PDF** — Crop page margins and change the visible page area
- **Extract Images** — Export all embedded images from a PDF
- **Repair PDF** — Attempt to fix corrupted PDF files

### More Tools
- **OCR Text Recognition** — Extract text from scanned/image PDFs, powered by Tesseract.js, runs locally
- **Edit PDF Content** — Add text, images, redactions directly on pages with an interactive dual-layer canvas
- **Edit Metadata** — Modify PDF author, title, keywords, and other properties
- **Flip Pages** — Mirror PDF pages horizontally or vertically
- **Grayscale Conversion** — Convert color PDFs to black-and-white/grayscale
- **Resize Pages** — Change page size, supporting A4/A3/Letter and other standards
- **E-Signature** — Three ways to sign: upload image signature, type text signature, draw handwritten signature
- **Redact** — Cover sensitive content with rectangle, rounded-rect, circle/ellipse, polygon, and freehand shapes
- **Fill Forms** — Auto-detect and fill PDF interactive form fields
- **Bates Numbering** — Add batch number stamps to legal documents, custom format and position
- **Compare PDF** — Side-by-side text diff of two PDFs, highlighting added, deleted, and modified content

### Convert from PDF
- **PDF to Word** — Convert to editable .docx documents
- **PDF to Excel** — Convert to Excel spreadsheets, one worksheet per page
- **PDF to PPT** — Convert to PowerPoint presentations, one slide per page
- **PDF to Image** — Export as PNG/JPEG, with 72/150/300 DPI options
- **PDF to JPG** — Export all pages as JPG images
- **PDF to PNG** — Export all pages as PNG images
- **PDF to TIFF** — Export all pages as TIFF images
- **PDF to SVG** — Convert pages to SVG vector graphics
- **PDF to Text** — Extract plain text content from a PDF
- **PDF to HTML** — Convert PDF pages to HTML files
- **PDF to PDF/A** — Convert to the long-term archival PDF/A standard

### Convert to PDF
- **Word to PDF** — Convert Word documents (.docx) to PDF
- **Excel to PDF** — Convert Excel spreadsheets (.xlsx) to PDF
- **PPT to PDF** — Convert PowerPoint (.pptx) to PDF
- **Image to PDF** — Merge images and convert to a PDF file
- **HTML to PDF** — Convert HTML code or files to PDF
- **EPUB to PDF** — Convert EPUB ebooks to PDF format
- **TXT to PDF** — Convert plain text files to PDF

### Reader
- **PDF Reader** — Read PDF files online directly in the browser

### Other
- **User Feedback** — Floating feedback button (bottom-right on the homepage), supporting bug reports / feature suggestions / other feedback, auto-forwarded to the admin by email

**49 tools in total, all free and unlimited.**

---

## Roadmap

### Phase 1 — AI Enhancements

| Task | Description | Notes |
|---|---|---|
| **AI PDF Summary** | Auto-extract key points from a PDF | Requires cloud API, optional feature, needs internet |
| **AI PDF Chat** | Natural language Q&A based on PDF content | Same as above |
| **Translate PDF** | Full-text translation preserving layout | Same as above |

### Phase 2 — User Experience

| Task | Description |
|---|---|
| **Enhanced Drag & Drop** | Support pasting images, batch folder drag-and-drop |
| **Processing Progress Bar** | Show real-time progress for large files |
| **History** | Locally record recently processed files, support re-download |
| **Batch Processing** | Process multiple files with one action |

---

## Quick Start

```bash
npm install

# Frontend only
npm run dev

# Frontend + stats server
npm run dev:all
```

## Access Statistics

The project includes a lightweight Express backend for tracking website visits.

Stats API:
- `GET /api/stats` — Get statistics (total visits, today's visits, unique visitors)
- `POST /api/stats/visit` — Record a page visit

Data is stored in `server/statsData.json` (added to .gitignore).

### Email Notifications (Optional)

When a user submits feedback, the content can optionally be forwarded to your email via SMTP. Configure through environment variables:

```bash
export SMTP_HOST=smtp.qq.com      # SMTP server
export SMTP_PORT=465              # Port (QQ/163 use 465)
export SMTP_USER=your@qq.com      # Sender email
export SMTP_PASS=your_auth_code   # Email authorization code (not login password)
export NOTIFY_EMAIL=admin@email.com  # Email to receive feedback (optional, defaults to sender)
```

If `SMTP_HOST` is not set, the email feature is silently skipped without affecting other features.

### Local Development

```bash
# Frontend only
npm run dev

# Frontend + stats server (recommended)
npm run dev:all

# Preview production build (single process, same-origin no proxy)
npm run build
npm run preview:all
```

## Deployment

Production setup consists of **Nginx serving static files** + **PM2 managing the stats server**:

### 1. Initial Server Setup

```bash
# Install PM2 (process manager + auto-start on boot)
npm install -g pm2

# Start stats server
cd /home/admin/pdfelf
pm2 start "npm run start" --name pdfelf-stats

# Enable auto-start on boot
pm2 save
pm2 startup
```

### 2. Nginx Configuration

Add the `/api/` proxy inside the HTTPS server block:

```nginx
server {
    server_name your-domain.com;

    root /home/admin/pdfelf/dist;
    index index.html;

    # Proxy API to stats server
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets (hashed, can be cached long-term)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        # Critical: under COEP require-corp, module workers (pdf.worker-*.js)
        # need a CORP header to be loadable. Otherwise pdf.js falls back to the
        # main-thread fake worker, blocking the UI for large PDFs.
        add_header Cross-Origin-Resource-Policy "same-origin";
    }

    # SPA route fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    # ... SSL certificate configuration
}
```

### 3. Update Deployment

```bash
cd /home/admin/pdfelf
git pull
npm install && npm run build
pm2 restart pdfelf-stats
nginx -s reload
```

## Project Structure

```
src/
├── pages/         # Page components
├── components/    # Shared components
├── services/      # PDF/Word/Image/HTML/SVG processing services
├── stores/        # Pinia state management
├── router/        # Router configuration
├── locales/       # Locale files (zh-CN, en)
├── utils/         # Utility functions (incl. pdf.js compatibility polyfills)
├── pdf.worker.ts  # Custom pdf.js worker (patches ES2024/2025 methods)
└── styles/        # Global styles
public/
└── pyodide/       # Pyodide runtime (Python → TIFF/SVG)
server/
└── *.ts           # Access stats + feedback email forwarding (Express)
```

## Privacy

All file processing happens locally in your browser. Nothing is uploaded to any server.
