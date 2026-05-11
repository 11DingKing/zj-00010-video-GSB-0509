const DB_NAME = 'VideoEditorDB';
const DB_VERSION = 1;
const BLOB_STORE = 'blobs';
const QUOTA_CHECK_THRESHOLD = 50 * 1024 * 1024;
const WARN_QUOTA_THRESHOLD = 80;

let dbInstance: IDBDatabase | null = null;

export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export class TransactionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionTimeoutError';
  }
}

async function checkStorageQuota(requiredSize: number): Promise<{ available: boolean; usagePercent: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || Infinity;
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
      const available = usage + requiredSize < quota * 0.9;
      return { available, usagePercent };
    } catch {
      return { available: true, usagePercent: 0 };
    }
  }
  return { available: true, usagePercent: 0 };
}

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  if (blob.size > QUOTA_CHECK_THRESHOLD) {
    const quotaCheck = await checkStorageQuota(blob.size);
    if (!quotaCheck.available) {
      throw new StorageQuotaError('存储空间不足，无法保存素材');
    }
    if (quotaCheck.usagePercent > WARN_QUOTA_THRESHOLD) {
      console.warn(`存储空间使用率已达 ${quotaCheck.usagePercent.toFixed(1)}%`);
    }
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, 'readwrite');
    const store = transaction.objectStore(BLOB_STORE);

    let hasCompleted = false;
    const timeoutId = setTimeout(() => {
      if (!hasCompleted) {
        transaction.abort();
        reject(new TransactionTimeoutError('保存超时，请尝试较小的文件'));
      }
    }, 60000);

    transaction.oncomplete = () => {
      hasCompleted = true;
      clearTimeout(timeoutId);
      resolve();
    };

    transaction.onerror = () => {
      hasCompleted = true;
      clearTimeout(timeoutId);
      const error = transaction.error;
      if (error?.name === 'QuotaExceededError') {
        reject(new StorageQuotaError('存储空间不足，无法保存素材'));
      } else {
        reject(error || new Error('保存失败'));
      }
    };

    transaction.onabort = () => {
      hasCompleted = true;
      clearTimeout(timeoutId);
      reject(transaction.error || new TransactionTimeoutError('事务已中止'));
    };

    try {
      store.put({ id, blob, createdAt: Date.now() });
    } catch (error) {
      hasCompleted = true;
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, 'readonly');
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };
  });
}

export async function getBlobURL(id: string): Promise<string | null> {
  const blob = await getBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, 'readwrite');
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function revokeBlobURL(url: string): Promise<void> {
  URL.revokeObjectURL(url);
}
