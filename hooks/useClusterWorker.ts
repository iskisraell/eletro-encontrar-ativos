/**
 * useClusterWorker Hook - Manages communication with the Cluster Web Worker
 * 
 * This hook provides a clean React interface to:
 * - Initialize the worker with equipment data
 * - Request clusters for a given viewport
 * - Handle filter changes reactively
 * - Clean up worker on unmount
 * 
 * The worker runs Supercluster off the main thread, eliminating the
 * 1,178ms input delay caused by synchronous clustering.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MergedEquipment } from '../types';
import { isAbrigo } from '../schemas/equipment';
import type {
  GeoJSONPoint,
  PointProperties,
  PointOrCluster,
  WorkerMessage,
  WorkerResponse,
  FilterConfig,
  ClusterProperties,
} from '../workers/clusterWorker';

// Re-export types for consumers
export type { GeoJSONPoint, PointOrCluster, PointProperties, ClusterProperties, FilterConfig };

// ============================================
// Types
// ============================================

export interface ClusterWorkerState {
  isReady: boolean;
  isLoading: boolean;
  clusters: PointOrCluster[];
  totalFiltered: number;
  error: string | null;
}

export interface ClusterWorkerActions {
  getClusters: (bbox: [number, number, number, number], zoom: number) => void;
  getClusterExpansionZoom: (clusterId: number) => Promise<number>;
  getLeaves: (clusterId: number, limit?: number, offset?: number) => Promise<GeoJSONPoint[]>;
}

export interface UseClusterWorkerReturn extends ClusterWorkerState, ClusterWorkerActions {
  equipmentMap: Map<number, MergedEquipment>;
}

// ============================================
// Worker Instance (Singleton via Vite)
// ============================================

// Vite's special import syntax for Web Workers
// ?worker tells Vite to bundle this as a web worker
const createWorker = () => {
  return new Worker(new URL('../workers/clusterWorker.ts', import.meta.url), {
    type: 'module',
  });
};

// ============================================
// Hook Implementation
// ============================================

export function useClusterWorker(
  equipment: MergedEquipment[],
  filters: FilterConfig
): UseClusterWorkerReturn {
  // Worker instance
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);
  const pendingCallsRef = useRef<Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>>(new Map());

  // State
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clusters, setClusters] = useState<PointOrCluster[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Equipment map for quick lookups (equipment index -> equipment)
  const equipmentMap = useMemo(() => {
    const map = new Map<number, MergedEquipment>();
    equipment.forEach((item, index) => {
      map.set(index, item);
    });
    return map;
  }, [equipment]);

  // Convert equipment to GeoJSON points (memoized)
  const geoJSONPoints = useMemo((): GeoJSONPoint[] => {
    const points: GeoJSONPoint[] = [];
    
    equipment.forEach((item, index) => {
      const lat = item["Latitude"];
      const lng = item["Longitude"];
      
      // Skip items without valid coordinates
      if (!lat || !lng || lat === '-' || lng === '-') return;
      
      const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
      const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
      
      if (isNaN(latNum) || isNaN(lngNum)) return;

      // Check for panel data - prefer merged _panelData, fallback to legacy fields
      const isAbrigoItem = isAbrigo(item);
      const hasMergedData = '_hasPanelData' in item && item._hasPanelData && '_panelData' in item;
      
      const hasDigital = isAbrigoItem && hasMergedData && item._panelData
        ? item._panelData.hasDigital
        : !!(item["Painel Digital"] && item["Painel Digital"] !== "" && item["Painel Digital"] !== "-");
        
      const hasStatic = isAbrigoItem && hasMergedData && item._panelData
        ? item._panelData.hasStatic
        : !!(item["Painel Estático - Tipo"] && item["Painel Estático - Tipo"] !== "" && item["Painel Estático - Tipo"] !== "-");

      const fotoUrl = item["Foto Referência"];
      const hasPhoto = !!(fotoUrl && fotoUrl.length > 0);

      const point: GeoJSONPoint = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lngNum, latNum], // GeoJSON uses [lng, lat] order!
        },
        properties: {
          id: item["Nº Eletro"] || `${latNum}-${lngNum}`,
          nEletro: item["Nº Eletro"],
          status: item["Status"],
          modelo: item["Modelo de Abrigo"] || item["Modelo"],
          endereco: item["Endereço"],
          bairro: item["Bairro"],
          fotoUrl,
          hasPhoto,
          hasDigital,
          hasStatic,
          equipmentIndex: index,
        },
      };
      
      points.push(point);
    });
    
    return points;
  }, [equipment]);

  // Send message to worker and get response
  const sendMessage = useCallback(<T>(type: WorkerMessage['type'], payload?: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = ++messageIdRef.current;
      pendingCallsRef.current.set(id, { resolve, reject });

      const message: WorkerMessage = { type, id, payload };
      workerRef.current.postMessage(message);
    });
  }, []);

  // Handle worker messages
  const handleWorkerMessage = useCallback((event: MessageEvent<WorkerResponse>) => {
    const { type, id, payload, error: responseError } = event.data;

    // Handle initialization message (id=0 is initial ready signal)
    if (type === 'ready' && id === 0) {
      console.log('[useClusterWorker] Worker loaded');
      return;
    }

    // Handle pending call resolution
    const pendingCall = pendingCallsRef.current.get(id);
    if (pendingCall) {
      pendingCallsRef.current.delete(id);

      if (type === 'error') {
        pendingCall.reject(new Error(responseError));
      } else {
        pendingCall.resolve(payload);
      }
    }

    // Handle specific response types for state updates
    switch (type) {
      case 'ready':
        setIsReady(true);
        setIsLoading(false);
        setTotalFiltered(payload?.pointCount ?? 0);
        break;
      case 'clusters':
        setClusters(payload?.clusters ?? []);
        setTotalFiltered(payload?.totalFiltered ?? 0);
        setIsLoading(false);
        break;
      case 'error':
        setError(responseError ?? 'Unknown error');
        setIsLoading(false);
        break;
    }
  }, []);

  // Initialize worker
  useEffect(() => {
    // Create worker
    const worker = createWorker();
    workerRef.current = worker;

    // Set up message handler
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (e) => {
      console.error('[useClusterWorker] Worker error:', e);
      setError(e.message);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingCallsRef.current.clear();
    };
  }, [handleWorkerMessage]);

  // Initialize with data when equipment changes
  useEffect(() => {
    if (!workerRef.current || geoJSONPoints.length === 0) return;

    setIsLoading(true);
    setIsReady(false);

    sendMessage('init', { points: geoJSONPoints, filters })
      .then(() => {
        console.log(`[useClusterWorker] Initialized with ${geoJSONPoints.length} points`);
      })
      .catch((e) => {
        console.error('[useClusterWorker] Init error:', e);
        setError(e.message);
      });
  }, [geoJSONPoints, sendMessage]); // Note: filters handled separately in getClusters

  // Get clusters for viewport
  const getClusters = useCallback((
    bbox: [number, number, number, number], // [westLng, southLat, eastLng, northLat]
    zoom: number
  ) => {
    if (!isReady) return;

    setIsLoading(true);
    sendMessage('getClusters', { bbox, zoom, filters })
      .catch((e) => {
        console.error('[useClusterWorker] getClusters error:', e);
        setError(e.message);
      });
  }, [isReady, filters, sendMessage]);

  // Get cluster expansion zoom
  const getClusterExpansionZoom = useCallback(async (clusterId: number): Promise<number> => {
    const result = await sendMessage<{ zoom: number }>('getClusterExpansionZoom', { clusterId });
    return result.zoom;
  }, [sendMessage]);

  // Get leaves of a cluster
  const getLeaves = useCallback(async (
    clusterId: number,
    limit?: number,
    offset?: number
  ): Promise<GeoJSONPoint[]> => {
    const result = await sendMessage<{ leaves: GeoJSONPoint[] }>('getLeaves', { clusterId, limit, offset });
    return result.leaves;
  }, [sendMessage]);

  return {
    isReady,
    isLoading,
    clusters,
    totalFiltered,
    error,
    equipmentMap,
    getClusters,
    getClusterExpansionZoom,
    getLeaves,
  };
}

// ============================================
// Utility: Check if feature is a cluster
// ============================================

export function isCluster(feature: PointOrCluster): feature is GeoJSON.Feature<GeoJSON.Point, ClusterProperties> {
  return feature.properties && 'cluster' in feature.properties && feature.properties.cluster === true;
}

export default useClusterWorker;
