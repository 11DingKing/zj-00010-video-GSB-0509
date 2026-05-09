const DB_NAME = 'VideoEditorDB';
const DB_VERSION = 1;
const BLOB_STORE = 'blobs';

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
        db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, 'readwrite');
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.put({ id, blob, createdAt: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
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
