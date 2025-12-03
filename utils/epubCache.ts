/**
 * EPUB 缓存工具 - 使用 IndexedDB 本地持久化
 */

const DB_NAME = 'EpubCache'
const STORE_NAME = 'books'
const DB_VERSION = 1

interface CachedBook {
  bookId: string
  arrayBuffer: ArrayBuffer
  url: string
  cachedAt: number
  size: number
}

/**
 * 打开 IndexedDB 数据库
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // 创建对象存储（如果不存在）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'bookId' })
        objectStore.createIndex('url', 'url', { unique: false })
        objectStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        console.log('✅ IndexedDB 对象存储已创建')
      }
    }
  })
}

/**
 * 从缓存获取 EPUB
 */
export async function getCachedEpub(bookId: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(bookId)

      request.onsuccess = () => {
        const result = request.result as CachedBook | undefined
        if (result) {
          console.log('✅ 从 IndexedDB 读取缓存:', {
            bookId,
            size: (result.size / 1024 / 1024).toFixed(2) + ' MB',
            cachedAt: new Date(result.cachedAt).toLocaleString()
          })
          resolve(result.arrayBuffer)
        } else {
          console.log('ℹ️ IndexedDB 中无缓存:', bookId)
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('❌ IndexedDB 读取失败:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('❌ 打开 IndexedDB 失败:', error)
    return null
  }
}

/**
 * 缓存 EPUB 到 IndexedDB
 */
export async function cacheEpub(
  bookId: string,
  arrayBuffer: ArrayBuffer,
  url: string
): Promise<boolean> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const cachedBook: CachedBook = {
        bookId,
        arrayBuffer,
        url,
        cachedAt: Date.now(),
        size: arrayBuffer.byteLength
      }

      const request = store.put(cachedBook)

      request.onsuccess = () => {
        console.log('✅ EPUB 已缓存到 IndexedDB:', {
          bookId,
          size: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2) + ' MB'
        })
        resolve(true)
      }

      request.onerror = () => {
        console.error('❌ 缓存到 IndexedDB 失败:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('❌ 打开 IndexedDB 失败:', error)
    return false
  }
}

/**
 * 删除缓存
 */
export async function deleteCachedEpub(bookId: string): Promise<boolean> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(bookId)

      request.onsuccess = () => {
        console.log('✅ 已删除缓存:', bookId)
        resolve(true)
      }

      request.onerror = () => {
        console.error('❌ 删除缓存失败:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('❌ 打开 IndexedDB 失败:', error)
    return false
  }
}

/**
 * 获取所有缓存的书籍列表
 */
export async function getAllCachedBooks(): Promise<Array<{
  bookId: string
  url: string
  size: number
  cachedAt: number
}>> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAllKeys()

      request.onsuccess = () => {
        const keys = request.result as string[]
        const books: Array<{
          bookId: string
          url: string
          size: number
          cachedAt: number
        }> = []

        let processed = 0
        
        if (keys.length === 0) {
          resolve([])
          return
        }

        keys.forEach((key) => {
          const getRequest = store.get(key)
          getRequest.onsuccess = () => {
            const book = getRequest.result as CachedBook
            if (book) {
              books.push({
                bookId: book.bookId,
                url: book.url,
                size: book.size,
                cachedAt: book.cachedAt
              })
            }
            processed++
            if (processed === keys.length) {
              resolve(books)
            }
          }
        })
      }

      request.onerror = () => {
        console.error('❌ 获取缓存列表失败:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('❌ 打开 IndexedDB 失败:', error)
    return []
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('✅ 已清空所有缓存')
        resolve(true)
      }

      request.onerror = () => {
        console.error('❌ 清空缓存失败:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('❌ 打开 IndexedDB 失败:', error)
    return false
  }
}

/**
 * 获取缓存总大小
 */
export async function getCacheSize(): Promise<number> {
  try {
    const books = await getAllCachedBooks()
    return books.reduce((total, book) => total + book.size, 0)
  } catch (error) {
    console.error('❌ 获取缓存大小失败:', error)
    return 0
  }
}
