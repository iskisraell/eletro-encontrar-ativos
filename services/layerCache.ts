import { Equipment, PanelLayerRecord } from '../types';

const DB_NAME = 'EletroLayersDB';
const DB_VERSION = 1;

// Object store names
const MAIN_STORE = 'main_layer';
const PANELS_STORE = 'panels_layer';
const META_STORE = 'layer_meta';

// Cache duration: 24 hours
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24;

type LayerType = 'main' | 'panels';

/**
 * Layer-based IndexedDB cache service.
 * Stores main and panels layers separately for efficient updates.
 */
export const layerCache = {
  /**
   * Initialize the database with all required stores.
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create main layer store (keyed by Nº Eletro)
        if (!db.objectStoreNames.contains(MAIN_STORE)) {
          db.createObjectStore(MAIN_STORE);
        }

        // Create panels layer store (keyed by Nº Eletro)
        if (!db.objectStoreNames.contains(PANELS_STORE)) {
          db.createObjectStore(PANELS_STORE);
        }

        // Create meta store for timestamps and sync status
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };
    });
  },

  /**
   * Get a database connection.
   */
  async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  // ========== MAIN LAYER OPERATIONS ==========

  /**
   * Save a chunk of main layer data.
   */
  async saveMainChunk(data: Equipment[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MAIN_STORE, 'readwrite');
      const store = transaction.objectStore(MAIN_STORE);

      data.forEach(item => {
        if (item["Nº Eletro"]) {
          store.put(item, item["Nº Eletro"]);
        }
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  /**
   * Get all main layer data.
   */
  async getAllMain(): Promise<Equipment[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MAIN_STORE, 'readonly');
      const store = transaction.objectStore(MAIN_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  /**
   * Get main layer record count.
   */
  async getMainCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MAIN_STORE, 'readonly');
      const store = transaction.objectStore(MAIN_STORE);
      const request = store.count();

      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  /**
   * Clear main layer store.
   */
  async clearMain(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MAIN_STORE, 'readwrite');
      const store = transaction.objectStore(MAIN_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  // ========== PANELS LAYER OPERATIONS ==========

  /**
   * Save a chunk of panels layer data.
   */
  async savePanelsChunk(data: PanelLayerRecord[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PANELS_STORE, 'readwrite');
      const store = transaction.objectStore(PANELS_STORE);

      data.forEach(item => {
        if (item["Nº Eletro"]) {
          store.put(item, item["Nº Eletro"]);
        }
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  /**
   * Get all panels layer data.
   */
  async getAllPanels(): Promise<PanelLayerRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PANELS_STORE, 'readonly');
      const store = transaction.objectStore(PANELS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  /**
   * Get panels layer records by specific IDs.
   * Useful for lazy-loading panel data for specific equipment.
   */
  async getPanelsByIds(ids: string[]): Promise<PanelLayerRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PANELS_STORE, 'readonly');
      const store = transaction.objectStore(PANELS_STORE);
      const results: PanelLayerRecord[] = [];
      let completed = 0;

      if (ids.length === 0) {
        db.close();
        resolve([]);
        return;
      }

      ids.forEach(id => {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            results.push(request.result);
          }
          completed++;
          if (completed === ids.length) {
            db.close();
            resolve(results);
          }
        };
        request.onerror = () => {
          completed++;
          if (completed === ids.length) {
            db.close();
            resolve(results);
          }
        };
      });
    });
  },

  /**
   * Get a single panel record by ID.
   */
  async getPanelById(id: string): Promise<PanelLayerRecord | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PANELS_STORE, 'readonly');
      const store = transaction.objectStore(PANELS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  /**
   * Get panels layer record count.
   */
  async getPanelsCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PANELS_STORE, 'readonly');
      const store = transaction.objectStore(PANELS_STORE);
      const request = store.count();

      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  /**
   * Clear panels layer store.
   */
  async clearPanels(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PANELS_STORE, 'readwrite');
      const store = transaction.objectStore(PANELS_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  // ========== META OPERATIONS ==========

  /**
   * Get timestamp for a specific layer.
   */
  async getLayerTimestamp(layer: LayerType): Promise<number | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(META_STORE, 'readonly');
      const store = transaction.objectStore(META_STORE);
      const request = store.get(`${layer}_timestamp`);

      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  /**
   * Set timestamp for a specific layer.
   */
  async setLayerTimestamp(layer: LayerType, timestamp: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(META_STORE, 'readwrite');
      const store = transaction.objectStore(META_STORE);
      store.put(timestamp, `${layer}_timestamp`);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  /**
   * Check if a layer's cache is stale (older than 24 hours).
   */
  async isLayerStale(layer: LayerType): Promise<boolean> {
    const timestamp = await this.getLayerTimestamp(layer);
    if (!timestamp) return true;

    const age = Date.now() - timestamp;
    return age > CACHE_DURATION_MS;
  },

  /**
   * Get layer sync status including timestamp and count.
   */
  async getLayerStatus(layer: LayerType): Promise<{
    timestamp: number | null;
    count: number;
    isStale: boolean;
    ageMs: number;
  }> {
    const timestamp = await this.getLayerTimestamp(layer);
    const count = layer === 'main' 
      ? await this.getMainCount() 
      : await this.getPanelsCount();
    const ageMs = timestamp ? Date.now() - timestamp : Infinity;
    const isStale = ageMs > CACHE_DURATION_MS;

    return { timestamp, count, isStale, ageMs };
  },

  // ========== UTILITY OPERATIONS ==========

  /**
   * Clear all data from all stores.
   */
  async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [MAIN_STORE, PANELS_STORE, META_STORE],
        'readwrite'
      );

      transaction.objectStore(MAIN_STORE).clear();
      transaction.objectStore(PANELS_STORE).clear();
      transaction.objectStore(META_STORE).clear();

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  /**
   * Clear a specific layer and its metadata.
   */
  async clearLayer(layer: LayerType): Promise<void> {
    if (layer === 'main') {
      await this.clearMain();
    } else {
      await this.clearPanels();
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(META_STORE, 'readwrite');
      const store = transaction.objectStore(META_STORE);
      store.delete(`${layer}_timestamp`);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }
};
