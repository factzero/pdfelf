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

// ---- Promise.try (ES2024) ----
// 同步执行 fn(...args)，返回 Promise；fn 抛错则 reject，返回 Promise 则采纳。
// 注意：pdf.js 内部以 Promise.try(fn, ...args) 形式调用（带额外参数）。
interface PromiseTryConstructor {
  try?: <T>(fn: (...args: any[]) => T | PromiseLike<T>, ...args: any[]) => Promise<T>
}

const PromiseTryCtor = Promise as unknown as PromiseTryConstructor
if (typeof PromiseTryCtor.try !== 'function') {
  Object.defineProperty(Promise, 'try', {
    configurable: true,
    writable: true,
    value: function <T>(fn: (...args: any[]) => T | PromiseLike<T>, ...args: any[]): Promise<T> {
      try {
        return Promise.resolve(fn(...args))
      } catch (err) {
        return Promise.reject(err)
      }
    },
  })
}

// ---- Set.prototype.intersection (ES2025) ----
// 返回两个 Set 的交集（新 Set）。
interface SetWithIntersection<T> {
  intersection?: (other: Set<T>) => Set<T>
}

const SetProto = Set.prototype as unknown as SetWithIntersection<any>
if (typeof SetProto.intersection !== 'function') {
  Object.defineProperty(Set.prototype, 'intersection', {
    configurable: true,
    writable: true,
    value: function intersection<T>(this: Set<T>, other: Set<T>): Set<T> {
      const result = new Set<T>()
      for (const item of this) {
        if (other.has(item)) result.add(item)
      }
      return result
    },
  })
}

// ---- Math.sumPrecise (ES2025) ----
// 高精度求和（Neumaier 补偿算法，消除累积浮点误差）。
// pdf.js 在 worker 的字体尺寸计算与主库文本编辑中直接调用全局 Math.sumPrecise，
// Chrome 117+ / Firefox 119+ / Safari 17.4+ 才原生支持，缺失时：
//   "TypeError: Math.sumPrecise is not a function"（渲染/压缩卡死）。
interface MathConstructorLike {
  sumPrecise?: (items: Iterable<number>) => number
}

const MathCtor = Math as unknown as MathConstructorLike
if (typeof MathCtor.sumPrecise !== 'function') {
  Object.defineProperty(Math, 'sumPrecise', {
    configurable: true,
    writable: true,
    value: function sumPrecise(items: Iterable<number>): number {
      let sum = 0
      let compensation = 0
      for (const value of items) {
        const y = value - compensation
        const t = sum + y
        compensation = t - sum - y
        sum = t
      }
      return sum
    },
  })
}

// ---- ArrayBuffer.prototype.transferToFixedLength / transfer (ES2024) ----
// transferToFixedLength(newLength)：返回固定长度为 newLength 的新 ArrayBuffer，
// 并复制源数据（标准语义会 detach 源 buffer；polyfill 无法模拟 detach，无碍，
// 因为 pdf.js 调用后不再使用源 buffer）。
// pdf.js worker 的 compileSystemFontInfo 直接调用 o.transferToFixedLength(c)，
// 缺失时报 "TypeError: o.transferToFixedLength is not a function"。
interface ArrayBufferWithTransfer {
  transfer?: (newLength?: number) => ArrayBuffer
  transferToFixedLength?: (newLength: number) => ArrayBuffer
}

const abProto = ArrayBuffer.prototype as unknown as ArrayBufferWithTransfer
if (typeof abProto.transferToFixedLength !== 'function') {
  Object.defineProperty(ArrayBuffer.prototype, 'transferToFixedLength', {
    configurable: true,
    writable: true,
    value: function transferToFixedLength(newLength: number): ArrayBuffer {
      const source = this as ArrayBuffer
      const out = new ArrayBuffer(newLength)
      const copy = Math.min(source.byteLength, newLength)
      if (copy > 0) new Uint8Array(out).set(new Uint8Array(source, 0, copy))
      return out
    },
  })
}
if (typeof abProto.transfer !== 'function') {
  Object.defineProperty(ArrayBuffer.prototype, 'transfer', {
    configurable: true,
    writable: true,
    value: function transfer(newLength?: number): ArrayBuffer {
      const source = this as ArrayBuffer
      const len = newLength === undefined ? source.byteLength : newLength
      const out = new ArrayBuffer(len)
      const copy = Math.min(source.byteLength, len)
      if (copy > 0) new Uint8Array(out).set(new Uint8Array(source, 0, copy))
      return out
    },
  })
}

// ---- Object.hasOwn (ES2022) ----
// Chrome 93+ 才原生支持；pdf.js worker 的 getDestination 等路径会调用 Object.hasOwn。
if (typeof (Object as any).hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    configurable: true,
    writable: true,
    value: function hasOwn(obj: object, key: PropertyKey): boolean {
      return Object.prototype.hasOwnProperty.call(obj, key)
    },
  })
}

// ---- Array.prototype.findLast / findLastIndex (ES2023) ----
// Chrome 97+ 才原生支持；pdf.js 主库在 URL 参数解析等路径使用 findLast。
// 用 any 访问避免 TS lib 版本差异。
if (typeof (Array.prototype as any).findLast !== 'function') {
  Object.defineProperty(Array.prototype, 'findLast', {
    configurable: true,
    writable: true,
    value: function findLast<T>(
      this: T[],
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown,
    ): T | undefined {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return this[i]
      }
      return undefined
    },
  })
}
if (typeof (Array.prototype as any).findLastIndex !== 'function') {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    configurable: true,
    writable: true,
    value: function findLastIndex<T>(
      this: T[],
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown,
    ): number {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return i
      }
      return -1
    },
  })
}

export {}
