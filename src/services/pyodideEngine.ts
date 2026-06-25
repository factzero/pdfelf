/**
 * Pyodide Engine — loads pyodide runtime from local server and manages Python packages.
 * Singleton: one pyodide instance shared across the app.
 * All dependencies served from /pyodide/ (no CDN).
 */

declare global {
  interface Window {
    loadPyodide?: (config?: { indexURL?: string }) => Promise<PyodideInstance>
  }
}

interface PyodideInstance {
  runPython: (code: string) => any
  runPythonAsync: (code: string) => Promise<any>
  pyimport: (name: string) => any
  loadPackage: (
    names: string | string[],
    options?: { messageCallback?: (msg: string) => void; errorCallback?: (msg: string) => void }
  ) => Promise<void>
  setStderr: (options: { batched?: (msg: string) => void; raw?: (charCode: number) => void } | null) => void
  FS: {
    writeFile: (path: string, data: Uint8Array) => void
    readFile: (path: string, options?: { encoding?: string }) => Uint8Array | string
    unlink: (path: string) => void
  }
}

let pyodideInstance: PyodideInstance | null = null
let loadingPromise: Promise<PyodideInstance> | null = null
const installedPackages = new Set<string>()

/** Base URL for pyodide runtime files */
const PYODIDE_BASE = '/pyodide/'
/** URL prefix for locally-served whl files (NOT a pyodide virtual-FS path) */
const WHL_URL = '/pyodide/whl/'

/**
 * Packages that are part of the pyodide distribution (listed in pyodide-lock.json).
 * These contain wasm/C extensions and MUST be loaded via `loadPackage()` —
 * micropip cannot satisfy their native deps (e.g. _cffi_backend for cryptography).
 * loadPackage resolves transitive deps automatically.
 */
const BUILTIN_PACKAGES = new Set([
  'cryptography',       // pdfminer.six 依赖（wasm/C 扩展）
  'fonttools',          // pdf2docx 依赖
  'lxml',               // python-docx 依赖
  'micropip',
  'numpy',              // pdf2docx 依赖
  'opencv-python',      // pdf2docx 依赖 (cv2 模块)
  'pillow',             // pdf2docx 依赖
  'pymupdf',            // pdf2docx 核心 PDF 引擎 (fitz)
  'typing-extensions',  // python-docx 依赖
])

/**
 * Pure-Python packages NOT in pyodide-lock.json. Loaded via micropip from
 * local whl files served by the web server.
 * Mapping of package name → whl filename (must match files in public/pyodide/whl/).
 */
// 顺序很重要：先装依赖再装主包（deps=False 不会自动解析依赖）
const PACKAGE_FILES: Record<string, string> = {
  'charset-normalizer': 'charset_normalizer-3.4.7-py3-none-any.whl',   // pdfminer.six 依赖
  'pdfminer-six':       'pdfminer_six-20260107-py3-none-any.whl',       // pdf2docx 依赖
  'python-docx':        'python_docx-1.2.0-py3-none-any.whl',           // pdf2docx 依赖
  'pdf2docx':           'pdf2docx-0.5.13-py3-none-any.whl',             // 主包
}

export class PyodideEngine {
  /**
   * Get or initialise the shared pyodide instance (loads from local server).
   */
  static async getInstance(): Promise<PyodideInstance> {
    if (pyodideInstance) return pyodideInstance

    if (!loadingPromise) {
      loadingPromise = (async () => {
        // Inject pyodide.js from local server
        if (!window.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = `${PYODIDE_BASE}pyodide.js`
            script.onload = () => resolve()
            script.onerror = () =>
              reject(new Error('无法加载 pyodide，请检查 pyodide 文件是否已部署'))
            document.head.appendChild(script)
          })
        }

        pyodideInstance = await window.loadPyodide!({
          indexURL: PYODIDE_BASE,
        })

        // micropip is not bundled into pyodide core — load it explicitly
        await pyodideInstance.loadPackage('micropip', {
          messageCallback: () => {},
        })

        return pyodideInstance
      })()
    }

    return loadingPromise
  }

  /**
   * Install Python packages.
   * - Packages in pyodide-lock.json (wasm/C extensions) → loadPackage (auto-resolves deps)
   * - Pure-Python packages → micropip.install from local whl served by the web server
   */
  static async ensurePackages(packages: string[]): Promise<void> {
    const toInstall = packages.filter((p) => !installedPackages.has(p))
    if (toInstall.length === 0) return

    const py = await PyodideEngine.getInstance()

    // Split into builtin (loadPackage) vs third-party (micropip)
    const builtin = toInstall.filter((p) => BUILTIN_PACKAGES.has(p))
    const thirdParty = toInstall.filter((p) => !BUILTIN_PACKAGES.has(p))

    // 1. Load builtin packages — pyodide resolves transitive native deps
    if (builtin.length > 0) {
      await py.loadPackage(builtin, {
        messageCallback: () => {},
      })
    }

    // 2. Install pure-Python packages from local whl via micropip
    if (thirdParty.length > 0) {
      const base = `${window.location.origin}${WHL_URL}`
      const urls: string[] = []
      for (const pkg of thirdParty) {
        const filename = PACKAGE_FILES[pkg]
        if (!filename) {
          throw new Error(
            `Unknown package "${pkg}" — add it to PACKAGE_FILES in pyodideEngine.ts`
          )
        }
        urls.push(`${base}${filename}`)
      }

      await py.runPythonAsync(`
import micropip
import traceback

urls = ${JSON.stringify(urls)}

for url in urls:
    try:
        await micropip.install(url, deps=False)
    except Exception:
        traceback.print_exc()
        raise RuntimeError(f'Failed to install {url}')
      `)
    }

    toInstall.forEach((p) => installedPackages.add(p))
  }

  /** Whether pyodide has finished loading. */
  static get isLoaded(): boolean {
    return pyodideInstance !== null
  }

  /** Reset pooled state (mainly for testing). */
  static reset(): void {
    pyodideInstance = null
    loadingPromise = null
    installedPackages.clear()
  }
}
