const DB_NAME = "VideoEditorDB";
const DB_VERSION = 1;
const BLOB_STORE = "blobs";

let dbInstance: IDBDatabase | null = null;

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
        db.createObjectStore(BLOB_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, "readwrite");
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.put({ id, blob, createdAt: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, "readonly");
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
    const transaction = db.transaction(BLOB_STORE, "readwrite"

    transaction.onerror = () => {
      const error = transaction.error || new Error('Transaction failed');
      if (error && (error.name === 'QuotaExceededError' || 
          (error as any)?.name === 'QuotaExceededError' ||
          error?.message?.includes('QuotaExceeded')) {
        reject(new StorageQuotaExceededError('存储空间不足，请清理旧项目或使用更大的存储空间'));
      } else {
        reject(error);
      }
    };

    transaction.onabort = () => {
      reject(new Error('事务被中止，可能由于数据过大或超时'));
    };

    transaction.oncomplete = () => {
      resolve();
    };

    const request = store.put({ id, blob, createdAt: Date.now() });

    request.onerror = () => {
      const error = request.error;
      if (error && (error.name === 'QuotaExceededError' || 
          (error as any)?.name === 'QuotaExceededError' ||
          error?.message?.includes('QuotaExceeded')) {
        reject(new StorageQuotaExceededError('存储空间不足，请清理旧项目或使用更大的存储空间'));
      }
    };
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

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const request = store.delete(id);
    request.onerror = () => reject(request.error);
  });
}

export async function revokeBlobURL(url: string): Promise<void> {
  URL.revokeObjectURL(url);
}
