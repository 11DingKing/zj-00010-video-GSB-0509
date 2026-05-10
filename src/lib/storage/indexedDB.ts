const DB_NAME = "VideoEditorDB";
const DB_VERSION = 1;
const BLOB_STORE = "blobs";

let dbInstance: IDBDatabase | null = null;

function showToast(message: string, type: "error" | "warning" = "error") {
  let container = document.getElementById("idb-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "idb-toast-container";
    container.style.cssText =
      "position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const bgColor = type === "error" ? "#dc2626" : "#f59e0b";
  toast.style.cssText = `
    background:${bgColor};color:#fff;padding:12px 20px;border-radius:8px;
    font-size:14px;font-family:sans-serif;max-width:400px;
    box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:auto;
    animation:idb-toast-in 0.3s ease-out;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  if (!document.getElementById("idb-toast-keyframes")) {
    const style = document.createElement("style");
    style.id = "idb-toast-keyframes";
    style.textContent =
      "@keyframes idb-toast-in{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}";
    document.head.appendChild(style);
  }

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

async function estimateAvailableStorage(): Promise<number | null> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimation = await navigator.storage.estimate();
      if (estimation.quota !== undefined && estimation.usage !== undefined) {
        return estimation.quota - estimation.usage;
      }
    } catch {
      return null;
    }
  }
  return null;
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
        db.createObjectStore(BLOB_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const available = await estimateAvailableStorage();
  if (available !== null && blob.size > available) {
    const msg = `存储空间不足：需要 ${(blob.size / 1024 / 1024).toFixed(
      1,
    )}MB，剩余约 ${(available / 1024 / 1024).toFixed(1)}MB。请清理浏览器存储后重试。`;
    showToast(msg, "error");
    throw new DOMException(msg, "QuotaExceededError");
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BLOB_STORE, "readwrite");
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.put({ id, blob, createdAt: Date.now() });

    const timeout = setTimeout(() => {
      try {
        transaction.abort();
      } catch {
        // transaction may already be finished
      }
      const msg = `保存素材超时（文件 ${(blob.size / 1024 / 1024).toFixed(1)}MB）。大文件写入可能需要更长时间，请稍后重试。`;
      showToast(msg, "error");
      reject(new DOMException(msg, "TimeoutError"));
    }, 30000);

    request.onerror = () => {
      clearTimeout(timeout);
      const error = request.error;
      let msg = `素材保存失败`;
      if (
        error?.name === "QuotaExceededError" ||
        error?.name === "ConstraintError"
      ) {
        msg = `存储空间不足，素材保存失败（${(blob.size / 1024 / 1024).toFixed(
          1,
        )}MB）。请清理浏览器存储后重试。`;
      } else {
        msg = `素材保存失败：${error?.message || "未知错误"}。项目未保存状态已保留。`;
      }
      showToast(msg, "error");
      reject(error);
    };

    request.onsuccess = () => {
      clearTimeout(timeout);
      resolve();
    };
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
    const transaction = db.transaction(BLOB_STORE, "readwrite");
    const store = transaction.objectStore(BLOB_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function revokeBlobURL(url: string): Promise<void> {
  URL.revokeObjectURL(url);
}
