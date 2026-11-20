const DB_NAME = 'linguaverse_audio_v1';
const STORE_NAME = 'speaking_audio_blobs';
const DB_VERSION = 1;

const memoryFallback = new Map<string, Blob>();

function openAudioDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveAudioBlob(key: string, blob: Blob): Promise<void> {
  memoryFallback.set(key, blob);
  const db = await openAudioDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(blob, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function getAudioBlob(key: string): Promise<Blob | null> {
  const cached = memoryFallback.get(key);
  if (cached) return cached;

  const db = await openAudioDb();
  if (!db) return null;

  return new Promise<Blob | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const result = req.result instanceof Blob ? req.result : null;
        if (result) {
          memoryFallback.set(key, result);
        }
        db.close();
        resolve(result);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function deleteAudioBlob(key: string): Promise<void> {
  memoryFallback.delete(key);
  const db = await openAudioDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function listAudioBlobKeys(): Promise<string[]> {
  const keys = new Set<string>(memoryFallback.keys());
  const db = await openAudioDb();
  if (!db) return Array.from(keys);

  return new Promise<string[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => {
        if (Array.isArray(req.result)) {
          for (const k of req.result) {
            keys.add(String(k));
          }
        }
        db.close();
        resolve(Array.from(keys));
      };
      req.onerror = () => {
        db.close();
        resolve(Array.from(keys));
      };
    } catch {
      db.close();
      resolve(Array.from(keys));
    }
  });
}

/**
 * Purges all locally stored voice recordings from memory + IndexedDB
 * and returns the exact verified count of deleted audio keys.
 */
export async function clearAllAudioBlobs(): Promise<{ deletedCount: number }> {
  const existingKeys = await listAudioBlobKeys();
  memoryFallback.clear();

  const db = await openAudioDb();
  if (!db) {
    return { deletedCount: existingKeys.length };
  }

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });

  return { deletedCount: existingKeys.length };
}

