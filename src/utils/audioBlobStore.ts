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

export const MAX_AUDIO_BLOB_BYTES = 10 * 1024 * 1024; // 10 MB safety cap
export const MAX_RECORDING_SECONDS = 120; // 2 minute single-turn safety cap

export function validateAudioBlob(blob: Blob, durationSeconds: number): {
  valid: boolean;
  reason?: 'empty' | 'too_large' | 'too_long' | 'invalid_type';
} {
  if (!blob || blob.size <= 0) {
    return { valid: false, reason: 'empty' };
  }
  if (blob.size > MAX_AUDIO_BLOB_BYTES) {
    return { valid: false, reason: 'too_large' };
  }
  if (durationSeconds > MAX_RECORDING_SECONDS + 5) {
    return { valid: false, reason: 'too_long' };
  }
  if (blob.type && !blob.type.toLowerCase().startsWith('audio/')) {
    return { valid: false, reason: 'invalid_type' };
  }
  return { valid: true };
}

export async function deleteAudioBlobsByPrefix(prefix: string): Promise<number> {
  const keys = await listAudioBlobKeys();
  const matching = keys.filter((k) => k.startsWith(prefix));
  for (const key of matching) {
    await deleteAudioBlob(key);
  }
  return matching.length;
}


