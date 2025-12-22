/**
 * Cluster Worker - Offloads Supercluster operations to a Web Worker
 * 
 * This worker handles:
 * - Building the Supercluster index from GeoJSON points
 * - Computing clusters for a given bounding box and zoom level
 * - Filtering points before clustering
 * 
 * By running in a separate thread, we prevent blocking the main thread
 * during zoom/pan operations, which was causing the 1,178ms input delay.
 */

import Supercluster from 'supercluster';

// ============================================
// Types
// ============================================

export interface PointProperties {
  id: string;
  nEletro: string | undefined;
  status: string | undefined;
  modelo: string | undefined;
  endereco: string | undefined;
  bairro: string | undefined;
  fotoUrl: string | undefined;
  hasPhoto: boolean;
  hasDigital: boolean;
  hasStatic: boolean;
  // Keep full equipment data for popup
  equipmentIndex: number;
}

export interface ClusterProperties {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
}

export type GeoJSONPoint = GeoJSON.Feature<GeoJSON.Point, PointProperties>;
export type ClusterFeature = GeoJSON.Feature<GeoJSON.Point, ClusterProperties>;
export type PointOrCluster = GeoJSONPoint | ClusterFeature;

export interface WorkerMessage {
  type: 'init' | 'getClusters' | 'getClusterExpansionZoom' | 'getLeaves';
  id: number;
  payload?: any;
}

export interface WorkerResponse {
  type: 'ready' | 'clusters' | 'expansionZoom' | 'leaves' | 'error';
  id: number;
  payload?: any;
  error?: string;
}

// Filter configuration
export interface FilterConfig {
  shelterModel: string[];
  panelType: string[];
  hasPhoto: boolean;
}

// ============================================
// Worker State
// ============================================

let supercluster: Supercluster<PointProperties, ClusterProperties> | null = null;
let allPoints: GeoJSONPoint[] = [];
let currentFilteredPoints: GeoJSONPoint[] = [];
let currentFilterHash = '';

// ============================================
// Supercluster Configuration
// ============================================

const CLUSTER_OPTIONS: Supercluster.Options<PointProperties, ClusterProperties> = {
  radius: 120,          // Cluster radius in pixels (larger = fewer clusters, better aggregation)
  maxZoom: 17,          // Maximum zoom level to cluster points (same as disableClusteringAtZoom)
  minZoom: 0,           // Minimum zoom level to cluster points
  minPoints: 2,         // Minimum points to form a cluster
  extent: 512,          // Tile extent (for tile-based rendering)
  nodeSize: 64,         // Size of the KD-tree leaf node for faster indexing
  log: false,           // Disable logging
};

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a hash for filter configuration to detect changes
 */
function createFilterHash(filters: FilterConfig): string {
  return JSON.stringify({
    sm: filters.shelterModel.sort(),
    pt: filters.panelType.sort(),
    hp: filters.hasPhoto,
  });
}

/**
 * Filters points based on filter configuration
 */
function filterPoints(points: GeoJSONPoint[], filters: FilterConfig): GeoJSONPoint[] {
  // If no filters, return all points
  if (
    filters.shelterModel.length === 0 &&
    filters.panelType.length === 0 &&
    !filters.hasPhoto
  ) {
    return points;
  }

  return points.filter((point) => {
    const props = point.properties;

    // Apply shelter model filter
    if (filters.shelterModel.length > 0) {
      if (!props.modelo || !filters.shelterModel.includes(props.modelo)) {
        return false;
      }
    }

    // Apply panel type filter
    if (filters.panelType.length > 0) {
      const matchesAny = filters.panelType.some((type) => {
        if (type === 'digital') return props.hasDigital;
        if (type === 'static') return props.hasStatic;
        return false;
      });
      if (!matchesAny) return false;
    }

    // Apply has photo filter
    if (filters.hasPhoto && !props.hasPhoto) {
      return false;
    }

    return true;
  });
}

/**
 * Rebuilds the Supercluster index with the given points
 */
function rebuildIndex(points: GeoJSONPoint[]): void {
  supercluster = new Supercluster<PointProperties, ClusterProperties>(CLUSTER_OPTIONS);
  supercluster.load(points);
}

// ============================================
// Message Handlers
// ============================================

/**
 * Initialize worker with point data
 */
function handleInit(payload: { points: GeoJSONPoint[]; filters: FilterConfig }): void {
  allPoints = payload.points;
  
  // Apply initial filters
  const filterHash = createFilterHash(payload.filters);
  currentFilteredPoints = filterPoints(allPoints, payload.filters);
  currentFilterHash = filterHash;
  
  // Build index
  rebuildIndex(currentFilteredPoints);
  
  console.log(`[ClusterWorker] Initialized with ${allPoints.length} points, ${currentFilteredPoints.length} after filtering`);
}

/**
 * Get clusters for a bounding box and zoom level
 */
function handleGetClusters(payload: {
  bbox: [number, number, number, number]; // [westLng, southLat, eastLng, northLat]
  zoom: number;
  filters: FilterConfig;
}): PointOrCluster[] {
  if (!supercluster) {
    console.warn('[ClusterWorker] Supercluster not initialized');
    return [];
  }

  // Check if filters changed
  const filterHash = createFilterHash(payload.filters);
  if (filterHash !== currentFilterHash) {
    // Filters changed, need to rebuild index
    currentFilteredPoints = filterPoints(allPoints, payload.filters);
    currentFilterHash = filterHash;
    rebuildIndex(currentFilteredPoints);
    console.log(`[ClusterWorker] Filters changed, rebuilt index with ${currentFilteredPoints.length} points`);
  }

  // Get clusters
  const clusters = supercluster.getClusters(payload.bbox, payload.zoom);
  
  return clusters;
}

/**
 * Get the zoom level at which a cluster expands
 */
function handleGetClusterExpansionZoom(clusterId: number): number {
  if (!supercluster) return 17;
  return supercluster.getClusterExpansionZoom(clusterId);
}

/**
 * Get leaf points within a cluster
 */
function handleGetLeaves(payload: { clusterId: number; limit?: number; offset?: number }): GeoJSONPoint[] {
  if (!supercluster) return [];
  return supercluster.getLeaves(payload.clusterId, payload.limit ?? 100, payload.offset ?? 0) as GeoJSONPoint[];
}

// ============================================
// Message Router
// ============================================

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data;
  
  try {
    let response: WorkerResponse;
    
    switch (type) {
      case 'init':
        handleInit(payload);
        response = { type: 'ready', id, payload: { pointCount: currentFilteredPoints.length } };
        break;
        
      case 'getClusters':
        const clusters = handleGetClusters(payload);
        response = { type: 'clusters', id, payload: { clusters, totalFiltered: currentFilteredPoints.length } };
        break;
        
      case 'getClusterExpansionZoom':
        const expansionZoom = handleGetClusterExpansionZoom(payload.clusterId);
        response = { type: 'expansionZoom', id, payload: { zoom: expansionZoom } };
        break;
        
      case 'getLeaves':
        const leaves = handleGetLeaves(payload);
        response = { type: 'leaves', id, payload: { leaves } };
        break;
        
      default:
        response = { type: 'error', id, error: `Unknown message type: ${type}` };
    }
    
    self.postMessage(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    self.postMessage({ type: 'error', id, error: errorMessage } as WorkerResponse);
  }
};

// Signal that worker is loaded
self.postMessage({ type: 'ready', id: 0, payload: { status: 'loaded' } } as WorkerResponse);
