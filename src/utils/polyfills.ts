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

// ---- Promise.withResolvers (ES2024) ----
// 返回 { promise, resolve, reject }，避免手动构造 Promise 时的竞态问题。
interface PromiseConstructorLike {
  withResolvers?: <T>() => {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: unknown) => void
  }
}

const PromiseCtor = Promise as unknown as PromiseConstructorLike
if (typeof PromiseCtor.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    },
  })
}

// ---- Uint8Array.fromBase64 (ES2024) ----
// 解码 base64 字符串为 Uint8Array。注意：浏览器环境可用 atob，Worker 环境同样可用。
interface Uint8ArrayConstructorLike {
  fromBase64?: (str: string) => Uint8Array
}

const Uint8ArrayCtor = Uint8Array as unknown as Uint8ArrayConstructorLike
if (typeof Uint8ArrayCtor.fromBase64 !== 'function') {
  Object.defineProperty(Uint8Array, 'fromBase64', {
    configurable: true,
    writable: true,
    value: function fromBase64(str: string): Uint8Array {
      const binary = atob(str)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    },
  })
}

// ---- Array.prototype.at / TypedArray.prototype.at (ES2022) ----
// 支持负索引取元素。较老浏览器可能缺失。
function atPolyfill<T>(this: ArrayLike<T>, index: number): T | undefined {
  const len = this.length
  const i = index < 0 ? len + index : index
  return i >= 0 && i < len ? this[i] : undefined
}

if (typeof (Array.prototype as any).at !== 'function') {
  Object.defineProperty(Array.prototype, 'at', {
    configurable: true,
    writable: true,
    value: atPolyfill,
  })
}

// TypedArray.prototype.at（Uint8Array 等）
if (typeof (Uint8Array.prototype as any).at !== 'function') {
  Object.defineProperty(Uint8Array.prototype, 'at', {
    configurable: true,
    writable: true,
    value: atPolyfill,
  })
}

export {}
