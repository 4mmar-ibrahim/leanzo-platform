/**
 * Cleanzo Zo Studio - High-Capacity Multi-Tier Storage for Custom Mascot Assets
 * 
 * Provides instantaneous sync access via Memory Cache + Standalone LocalStorage Keys,
 * backed by persistent IndexedDB to guarantee custom character images NEVER fail to display.
 */

const DB_NAME = 'cleanzo_zo_studio_assets_db';
const STORE_NAME = 'mascot_images';
const DB_VERSION = 2;

// Memory cache for instantaneous sync access across components
const memoryCache = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an image dataUrl under a key with multi-tier redundancy:
 * 1. Memory Cache (Sync)
 * 2. Standalone LocalStorage Key (Sync & cross-session immediate availability)
 * 3. Master Mascot Image Key (Fallback for all pages)
 * 4. IndexedDB (Async persistent backing)
 */
export async function saveZoImage(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl) return;

  // 1. In-memory map
  memoryCache.set(key, dataUrl);

  // 2. Direct standalone localStorage (safe because single image ~40-80KB WebP fits easily)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`cleanzo_mascot_asset_${key}`, dataUrl);
    } catch (e) {
      console.warn('[ZoImageStorage] LocalStorage fallback write skipped:', e);
    }
  }

  // 3. Persistent IndexedDB
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(dataUrl, key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[ZoImageStorage] IndexedDB save warning (memory & localStorage active):', err);
  }
}

/**
 * Synchronous immediate check (Memory Cache -> Standalone LocalStorage)
 * Returns the data URL string immediately without any async latency.
 */
export function getCachedZoImage(key: string, fallbackToMaster = false): string | null {
  // 1. Memory cache check for specific key
  if (memoryCache.has(key)) {
    const val = memoryCache.get(key);
    if (val) return val;
  }

  // 2. LocalStorage synchronous check for specific key
  if (typeof window !== 'undefined') {
    try {
      const direct = window.localStorage.getItem(`cleanzo_mascot_asset_${key}`);
      if (direct) {
        memoryCache.set(key, direct);
        return direct;
      }
    } catch {}
  }

  // 3. Optional fallback to master image ONLY if explicitly permitted
  if (fallbackToMaster) {
    if (memoryCache.has('zo_master_custom_image')) {
      const masterMem = memoryCache.get('zo_master_custom_image');
      if (masterMem) return masterMem;
    }
    if (typeof window !== 'undefined') {
      try {
        const masterStorage = window.localStorage.getItem('cleanzo_master_mascot_image');
        if (masterStorage) {
          memoryCache.set('zo_master_custom_image', masterStorage);
          return masterStorage;
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Retrieve an image dataUrl by key (synchronous cache first, then IndexedDB)
 */
export async function getZoImage(key: string): Promise<string | null> {
  const cached = getCachedZoImage(key);
  if (cached) return cached;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result as string | undefined;
        if (result) {
          memoryCache.set(key, result);
          resolve(result);
        } else {
          // Try master key fallback
          const masterReq = store.get('zo_master_custom_image');
          masterReq.onsuccess = () => {
            const masterResult = masterReq.result as string | undefined;
            if (masterResult) {
              memoryCache.set(key, masterResult);
              memoryCache.set('zo_master_custom_image', masterResult);
              resolve(masterResult);
            } else {
              resolve(null);
            }
          };
          masterReq.onerror = () => resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[ZoImageStorage] Failed to read from IndexedDB:', err);
    return null;
  }
}

/**
 * Remove an image by key
 */
export async function deleteZoImage(key: string): Promise<void> {
  memoryCache.delete(key);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(`cleanzo_mascot_asset_${key}`);
    } catch {}
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}
