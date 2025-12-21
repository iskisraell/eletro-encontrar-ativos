/**
 * Map State Cache Service
 * 
 * Persists map state (view position, filters, processed markers) to localStorage
 * with 24-hour expiry and chunked storage for efficient memory usage.
 */

// Storage keys
const STORAGE_PREFIX = 'eletro_map_';
const VIEW_STATE_KEY = `${STORAGE_PREFIX}view_state`;
const FILTERS_KEY = `${STORAGE_PREFIX}filters`;
const MARKERS_META_KEY = `${STORAGE_PREFIX}markers_meta`;
const MARKERS_CHUNK_PREFIX = `${STORAGE_PREFIX}markers_chunk_`;

// Cache duration: 24 hours
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24;

// Chunk size for markers (1000 items per chunk)
const CHUNK_SIZE = 1000;

// ============================================
// Types
// ============================================

export interface MapViewState {
  center: [number, number];
  zoom: number;
  timestamp: number;
}

export interface MapFiltersState {
  shelterModel: string[];
  panelType: string[];
  hasPhoto: boolean;
}

export interface MarkerData {
  id: string;
  position: [number, number];
  // Store only essential display data to reduce storage size
  nEletro: string | undefined;
  status: string | undefined;
  modelo: string | undefined;
  endereco: string | undefined;
  hasPhoto: boolean;
  hasDigital: boolean;
  hasStatic: boolean;
}

interface MarkersMeta {
  totalCount: number;
  chunkCount: number;
  equipmentHash: string;
  timestamp: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a simple hash from equipment data to detect changes
 */
export function generateEquipmentHash(equipmentCount: number, sampleIds: string[]): string {
  return `${equipmentCount}-${sampleIds.slice(0, 5).join('-')}`;
}

/**
 * Check if cached data is still valid (within 24 hours)
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION_MS;
}

/**
 * Safely parse JSON from localStorage
 */
function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely stringify and save to localStorage
 */
function safeLocalStorageSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // Handle quota exceeded or other storage errors
    console.warn(`[MapStateCache] Failed to save to localStorage (${key}):`, e);
    return false;
  }
}

// ============================================
// View State Operations
// ============================================

/**
 * Save map view state (center and zoom)
 */
export function saveMapViewState(center: [number, number], zoom: number): void {
  const state: MapViewState = {
    center,
    zoom,
    timestamp: Date.now(),
  };
  safeLocalStorageSet(VIEW_STATE_KEY, state);
}

/**
 * Get saved map view state
 */
export function getMapViewState(): MapViewState | null {
  const data = safeJsonParse<MapViewState | null>(
    localStorage.getItem(VIEW_STATE_KEY),
    null
  );
  
  if (data && isCacheValid(data.timestamp)) {
    return data;
  }
  
  // Clear stale data
  if (data) {
    localStorage.removeItem(VIEW_STATE_KEY);
  }
  
  return null;
}

// ============================================
// Filter State Operations
// ============================================

/**
 * Save map filter state
 */
export function saveMapFilters(filters: MapFiltersState): void {
  const data = {
    ...filters,
    timestamp: Date.now(),
  };
  safeLocalStorageSet(FILTERS_KEY, data);
}

/**
 * Get saved map filter state
 */
export function getMapFilters(): MapFiltersState | null {
  const data = safeJsonParse<(MapFiltersState & { timestamp: number }) | null>(
    localStorage.getItem(FILTERS_KEY),
    null
  );
  
  if (data && isCacheValid(data.timestamp)) {
    const { timestamp, ...filters } = data;
    return filters;
  }
  
  // Clear stale data
  if (data) {
    localStorage.removeItem(FILTERS_KEY);
  }
  
  return null;
}

// ============================================
// Markers Cache Operations (Chunked)
// ============================================

/**
 * Save processed markers in chunks
 */
export function saveProcessedMarkers(markers: MarkerData[], equipmentHash: string): boolean {
  try {
    // Clear old chunks first
    clearMarkerChunks();
    
    const chunkCount = Math.ceil(markers.length / CHUNK_SIZE);
    
    // Save metadata
    const meta: MarkersMeta = {
      totalCount: markers.length,
      chunkCount,
      equipmentHash,
      timestamp: Date.now(),
    };
    
    if (!safeLocalStorageSet(MARKERS_META_KEY, meta)) {
      return false;
    }
    
    // Save chunks
    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, markers.length);
      const chunk = markers.slice(start, end);
      
      if (!safeLocalStorageSet(`${MARKERS_CHUNK_PREFIX}${i}`, chunk)) {
        // If we fail to save a chunk, clear everything to avoid partial data
        clearMarkerChunks();
        return false;
      }
    }
    
    return true;
  } catch (e) {
    console.warn('[MapStateCache] Failed to save markers:', e);
    clearMarkerChunks();
    return false;
  }
}

/**
 * Get markers metadata (for checking if cache is valid)
 */
export function getMarkersMeta(): MarkersMeta | null {
  const meta = safeJsonParse<MarkersMeta | null>(
    localStorage.getItem(MARKERS_META_KEY),
    null
  );
  
  if (meta && isCacheValid(meta.timestamp)) {
    return meta;
  }
  
  // Clear stale data
  if (meta) {
    clearMarkerChunks();
  }
  
  return null;
}

/**
 * Check if cached markers match current equipment data
 */
export function isMarkersCacheValid(currentHash: string): boolean {
  const meta = getMarkersMeta();
  return meta !== null && meta.equipmentHash === currentHash;
}

/**
 * Load all cached markers (reassembles chunks)
 */
export function loadProcessedMarkers(): MarkerData[] | null {
  const meta = getMarkersMeta();
  if (!meta) return null;
  
  try {
    const allMarkers: MarkerData[] = [];
    
    for (let i = 0; i < meta.chunkCount; i++) {
      const chunkData = localStorage.getItem(`${MARKERS_CHUNK_PREFIX}${i}`);
      if (!chunkData) {
        // Chunk missing, cache is corrupted
        clearMarkerChunks();
        return null;
      }
      
      const chunk = safeJsonParse<MarkerData[]>(chunkData, []);
      allMarkers.push(...chunk);
    }
    
    // Verify count matches
    if (allMarkers.length !== meta.totalCount) {
      console.warn('[MapStateCache] Marker count mismatch, clearing cache');
      clearMarkerChunks();
      return null;
    }
    
    return allMarkers;
  } catch (e) {
    console.warn('[MapStateCache] Failed to load markers:', e);
    clearMarkerChunks();
    return null;
  }
}

/**
 * Clear all marker chunks and metadata
 */
export function clearMarkerChunks(): void {
  // Get meta to know how many chunks to clear
  const meta = safeJsonParse<MarkersMeta | null>(
    localStorage.getItem(MARKERS_META_KEY),
    null
  );
  
  if (meta) {
    for (let i = 0; i < meta.chunkCount; i++) {
      localStorage.removeItem(`${MARKERS_CHUNK_PREFIX}${i}`);
    }
  }
  
  localStorage.removeItem(MARKERS_META_KEY);
  
  // Also clear any orphaned chunks (safety measure)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(MARKERS_CHUNK_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// ============================================
// Full Cache Operations
// ============================================

/**
 * Clear all map state from localStorage
 */
export function clearAllMapState(): void {
  localStorage.removeItem(VIEW_STATE_KEY);
  localStorage.removeItem(FILTERS_KEY);
  clearMarkerChunks();
}

/**
 * Get cache status summary (for debugging)
 */
export function getCacheStatus(): {
  hasViewState: boolean;
  hasFilters: boolean;
  hasMarkers: boolean;
  markerCount: number;
  ageMs: number | null;
} {
  const viewState = getMapViewState();
  const filters = getMapFilters();
  const meta = getMarkersMeta();
  
  return {
    hasViewState: viewState !== null,
    hasFilters: filters !== null,
    hasMarkers: meta !== null,
    markerCount: meta?.totalCount ?? 0,
    ageMs: meta?.timestamp ? Date.now() - meta.timestamp : null,
  };
}

/**
 * Export the cache service as a unified object
 */
export const mapStateCache = {
  // View state
  saveViewState: saveMapViewState,
  getViewState: getMapViewState,
  
  // Filters
  saveFilters: saveMapFilters,
  getFilters: getMapFilters,
  
  // Markers
  saveMarkers: saveProcessedMarkers,
  loadMarkers: loadProcessedMarkers,
  getMarkersMeta,
  isMarkersCacheValid,
  clearMarkers: clearMarkerChunks,
  
  // Utilities
  generateHash: generateEquipmentHash,
  clearAll: clearAllMapState,
  getStatus: getCacheStatus,
};

export default mapStateCache;
