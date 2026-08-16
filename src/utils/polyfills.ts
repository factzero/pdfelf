/**
 * pdf.js 兼容性 polyfill（ES2024/ES2025 新特性，部分旧浏览器/WebView 缺失）
 *
 * pdf.js 6.x 依赖以下新方法，缺失时会导致：
 *   - "a.toHex is not a function"
 *   - "this[#methodPromises].getOrInsertComputed is not a function"
 *
 * 同时需要在主线程和 worker 中加载本模块。
 */

// ---- Uint8Array.prototype.toHex / toBase64 (ES2024) ----
const uint8Proto = Uint8Array.prototype as unknown as {
  toHex?: (...args: never[]) => string
  toBase64?: (...args: never[]) => string
}

if (typeof uint8Proto.toHex !== 'function') {
  Object.defineProperty(Uint8Array.prototype, 'toHex', {
    configurable: true,
    writable: true,
    value: function toHex(this: Uint8Array): string {
      let hex = ''
      for (let i = 0; i < this.length; i++) {
        hex += this[i].toString(16).padStart(2, '0')
      }
      return hex
    },
  })
}

if (typeof uint8Proto.toBase64 !== 'function') {
  Object.defineProperty(Uint8Array.prototype, 'toBase64', {
    configurable: true,
    writable: true,
    value: function toBase64(this: Uint8Array): string {
      let binary = ''
      for (let i = 0; i < this.length; i++) {
        binary += String.fromCharCode(this[i])
      }
      return btoa(binary)
    },
  })
}

// ---- Map.prototype.getOrInsertComputed (ES2025) ----
// 行为：key 存在则返回其值，否则用 callback() 计算结果插入并返回。
// 注意：callback 只在 key 缺失时调用一次，且无参数。
type GetOrInsertComputed = <K, V>(
  this: Map<K, V>,
  key: K,
  cb: () => V,
) => V

const mapProto = Map.prototype as unknown as {
  getOrInsertComputed?: GetOrInsertComputed
}

if (typeof mapProto.getOrInsertComputed !== 'function') {
  const getOrInsertComputed: GetOrInsertComputed = function (this, key, cb) {
    if (this.has(key)) return this.get(key)!
    const value = cb()
    this.set(key, value)
    return value
  }
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    configurable: true,
    writable: true,
    value: getOrInsertComputed,
  })
}

export {}
