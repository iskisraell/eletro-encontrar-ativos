/**
 * Map Data Cache Service - IndexedDB-based storage for map markers
 * 
 * Provides efficient storage and retrieval of pre-processed map marker data.
 * Uses IndexedDB for larger capacity than localStorage (~unlimited vs 5MB).
 * 
 * Features:
 * - Batch insert for performance
 * - Hash-based cache invalidation
 * - 24-hour expiry
 * - View state and filter persistence
 */

// Database configuration
const DB_NAME = 'EletroMapDB';
const DB_VERSION = 1;

// Object store names
const MARKERS_STORE = 'map_markers';
const META_STORE = 'map_meta';

// Cache duration: 24 hours
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24;

// ============================================
// Types
// ============================================

export interface MapMarkerData {
  id: string;
  position: [number, number]; // [lat, lng]
  nEletro: string | undefined;
  status: string | undefined;
  modelo: string | undefined;
  endereco: string | undefined;
  bairro: string | undefined;
  hasPhoto: boolean;
  hasDigital: boolean;
  hasStatic: boolean;
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

export interface MapFiltersState {
  shelterModel: string[];
  panelType: string[];
  hasPhoto: boolean;
}

// ============================================
// IndexedDB Map Cache Service
// ============================================

class MapDataCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    await this.getDB();
  }

  /**
   * Get database connection (lazy initialization)
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[MapDataCache] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create markers store with id as keyPath
        if (!db.objectStoreNames.contains(MARKERS_STORE)) {
          const markersStore = db.createObjectStore(MARKERS_STORE, { keyPath: 'id' });
          // Create indexes for spatial queries (not true R-tree, but helps)
          markersStore.createIndex('position', 'position', { unique: false });
        }

        // Create meta store for view state, filters, hash
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
    });

    return this.dbPromise;
  }

  // ============================================
  // Markers Operations
  // ============================================

  /**
   * Save markers in batch (efficient bulk insert)
   */
  async saveMarkers(markers: MapMarkerData[], equipmentHash: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      
      // Clear existing markers first
      await this.clearMarkers();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([MARKERS_STORE, META_STORE], 'readwrite');
        const markersStore = transaction.objectStore(MARKERS_STORE);
        const metaStore = transaction.objectStore(META_STORE);

        // Save all markers
        markers.forEach(marker => {
          markersStore.put(marker);
        });

        // Save metadata
        metaStore.put({
          key: 'markers_meta',
          value: {
            count: markers.length,
            hash: equipmentHash,
            timestamp: Date.now(),
          }
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => {
          console.error('[MapDataCache] Failed to save markers:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (e) {
      console.error('[MapDataCache] Error saving markers:', e);
      return false;
    }
  }

  /**
   * Load all markers from cache
   */
  async loadMarkers(): Promise<MapMarkerData[]> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(MARKERS_STORE, 'readonly');
        const store = transaction.objectStore(MARKERS_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.error('[MapDataCache] Failed to load markers:', request.error);
          reject(request.error);
        };
      });
    } catch (e) {
      console.error('[MapDataCache] Error loading markers:', e);
      return [];
    }
  }

  /**
   * Get markers count
   */
  async getMarkersCount(): Promise<number> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(MARKERS_STORE, 'readonly');
        const store = transaction.objectStore(MARKERS_STORE);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return 0;
    }
  }

  /**
   * Clear all markers
   */
  async clearMarkers(): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(MARKERS_STORE, 'readwrite');
        const store = transaction.objectStore(MARKERS_STORE);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('[MapDataCache] Error clearing markers:', e);
    }
  }

  // ============================================
  // Cache Validation
  // ============================================

  /**
   * Check if cached markers are valid (match current data and not expired)
   */
  async isMarkersCacheValid(currentHash: string): Promise<boolean> {
    try {
      const meta = await this.getMarkersMeta();
      if (!meta) return false;

      // Check hash matches
      if (meta.hash !== currentHash) return false;

      // Check not expired
      const age = Date.now() - meta.timestamp;
      if (age > CACHE_DURATION_MS) return false;

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get markers metadata
   */
  async getMarkersMeta(): Promise<{ count: number; hash: string; timestamp: number } | null> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readonly');
        const store = transaction.objectStore(META_STORE);
        const request = store.get('markers_meta');

        request.onsuccess = () => {
          const result = request.result;
          resolve(result?.value || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  }

  // ============================================
  // View State Operations
  // ============================================

  /**
   * Save map view state (center and zoom)
   */
  async saveViewState(center: [number, number], zoom: number): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readwrite');
        const store = transaction.objectStore(META_STORE);
        store.put({
          key: 'view_state',
          value: { center, zoom, timestamp: Date.now() }
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('[MapDataCache] Error saving view state:', e);
    }
  }

  /**
   * Get saved map view state
   */
  async getViewState(): Promise<MapViewState | null> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readonly');
        const store = transaction.objectStore(META_STORE);
        const request = store.get('view_state');

        request.onsuccess = () => {
          const result = request.result?.value;
          if (result && Date.now() - result.timestamp < CACHE_DURATION_MS) {
            resolve({ center: result.center, zoom: result.zoom });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  }

  // ============================================
  // Filter State Operations
  // ============================================

  /**
   * Save map filter state
   */
  async saveFilters(filters: MapFiltersState): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readwrite');
        const store = transaction.objectStore(META_STORE);
        store.put({
          key: 'filters',
          value: { ...filters, timestamp: Date.now() }
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('[MapDataCache] Error saving filters:', e);
    }
  }

  /**
   * Get saved map filter state
   */
  async getFilters(): Promise<MapFiltersState | null> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(META_STORE, 'readonly');
        const store = transaction.objectStore(META_STORE);
        const request = store.get('filters');

        request.onsuccess = () => {
          const result = request.result?.value;
          if (result && Date.now() - result.timestamp < CACHE_DURATION_MS) {
            const { timestamp, ...filters } = result;
            resolve(filters);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  }

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Generate hash from equipment data for cache validation
   */
  generateHash(equipmentCount: number, sampleIds: string[]): string {
    return `${equipmentCount}-${sampleIds.slice(0, 5).join('-')}`;
  }

  /**
   * Clear all map data
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([MARKERS_STORE, META_STORE], 'readwrite');
        transaction.objectStore(MARKERS_STORE).clear();
        transaction.objectStore(META_STORE).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('[MapDataCache] Error clearing all:', e);
    }
  }

  /**
   * Get cache status for debugging
   */
  async getStatus(): Promise<{
    hasMarkers: boolean;
    markerCount: number;
    hasViewState: boolean;
    hasFilters: boolean;
    ageMs: number | null;
  }> {
    const meta = await this.getMarkersMeta();
    const viewState = await this.getViewState();
    const filters = await this.getFilters();

    return {
      hasMarkers: meta !== null && meta.count > 0,
      markerCount: meta?.count ?? 0,
      hasViewState: viewState !== null,
      hasFilters: filters !== null,
      ageMs: meta?.timestamp ? Date.now() - meta.timestamp : null,
    };
  }
}

// Export singleton instance
export const mapDataCache = new MapDataCacheService();
export default mapDataCache;
