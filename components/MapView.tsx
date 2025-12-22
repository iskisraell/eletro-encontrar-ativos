import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MergedEquipment } from '../types';
import { useIsDark } from '../hooks/useDarkMode';
import { isAbrigo } from '../schemas/equipment';
import { 
  MapPin, X, Loader2,
  BusFront, Camera, Smartphone, Frame, 
  CheckCircle2, XCircle, Eye, Navigation, ExternalLink, Hash
} from 'lucide-react';
import {
  mapDataCache,
  MapMarkerData as CacheMarkerData,
} from '../services/mapDataCache';
import { useMapNavigationOptional } from '../contexts/MapNavigationContext';

// Import Leaflet CSS directly in JS for reliable loading
import 'leaflet/dist/leaflet.css';

// São Paulo city center coordinates
const SAO_PAULO_CENTER: [number, number] = [-23.5505, -46.6333];
const DEFAULT_ZOOM = 12;

// Tile layer URLs (CartoDB - free, no API key required)
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Performance constants - optimized for 12k+ markers
const CHUNK_SIZE = 2000; // Process 2000 markers per chunk (larger = fewer iterations)
const CHUNK_DELAY = 32; // ~30fps delay between chunks

// Custom cluster icon creator - simple, no caching (L.divIcon is cheap)
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'small';
  let dimensions = 36;

  if (count >= 100) {
    size = 'large';
    dimensions = 52;
  } else if (count >= 10) {
    size = 'medium';
    dimensions = 44;
  }

  return L.divIcon({
    html: `<div>${count.toLocaleString()}</div>`,
    className: `marker-cluster marker-cluster-${size}`,
    iconSize: L.point(dimensions, dimensions, true),
  });
};

// ============================================
// Debounce hook for filter changes
// ============================================
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// MapStateController - Persists map view state (center/zoom)
// ============================================
interface MapStateControllerProps {
  onViewChange?: (center: [number, number], zoom: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const MapStateController: React.FC<MapStateControllerProps> = ({ 
  onViewChange,
  initialCenter,
  initialZoom 
}) => {
  const map = useMap();
  const isInitialized = useRef(false);
  const mapNav = useMapNavigationOptional();
  
  // Set initial view from cache on mount
  useEffect(() => {
    if (!isInitialized.current && initialCenter && initialZoom) {
      map.setView(initialCenter, initialZoom, { animate: false });
      isInitialized.current = true;
    }
  }, [map, initialCenter, initialZoom]);
  
  // Handle flyTo requests from MapNavigationContext
  useEffect(() => {
    if (!mapNav?.flyToTarget) return;
    
    const { lat, lng, zoom } = mapNav.flyToTarget;
    const targetZoom = zoom || 18;
    
    // Fly to the target location with smooth animation
    map.flyTo([lat, lng], targetZoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
    
    // Listen for the animation to complete
    const handleMoveEnd = () => {
      mapNav.clearFlyTarget();
      map.off('moveend', handleMoveEnd);
    };
    
    map.on('moveend', handleMoveEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, mapNav?.flyToTarget, mapNav]);
  
  // Handle resetView requests from MapNavigationContext
  useEffect(() => {
    if (!mapNav?.shouldResetView) return;
    
    // Fly back to São Paulo center
    map.flyTo(SAO_PAULO_CENTER, DEFAULT_ZOOM, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
    
    // Listen for the animation to complete
    const handleMoveEnd = () => {
      mapNav.clearResetFlag();
      map.off('moveend', handleMoveEnd);
    };
    
    map.on('moveend', handleMoveEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, mapNav?.shouldResetView, mapNav]);
  
  // Track view changes and save to cache
  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      mapDataCache.saveViewState([center.lat, center.lng], zoom);
      onViewChange?.([center.lat, center.lng], zoom);
    },
    zoomend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      mapDataCache.saveViewState([center.lat, center.lng], zoom);
      onViewChange?.([center.lat, center.lng], zoom);
    },
  });
  
  // Invalidate map size on mount
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

// ============================================
// TileLayerSwitcher - Handle dark/light mode tile switching
// ============================================
interface TileLayerSwitcherProps {
  isDark: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
}

const TileLayerSwitcher: React.FC<TileLayerSwitcherProps> = ({ isDark, onLoadingChange }) => {
  const map = useMap();
  
  useEffect(() => {
    map.invalidateSize();
  }, [isDark, map]);

  // Track tile loading state
  useEffect(() => {
    if (!onLoadingChange) return;
    
    const handleLoadStart = () => onLoadingChange(true);
    const handleLoadEnd = () => onLoadingChange(false);
    
    map.on('loading', handleLoadStart);
    map.on('load', handleLoadEnd);
    
    return () => {
      map.off('loading', handleLoadStart);
      map.off('load', handleLoadEnd);
    };
  }, [map, onLoadingChange]);

  return (
    <TileLayer
      attribution={TILE_ATTRIBUTION}
      url={isDark ? TILE_DARK : TILE_LIGHT}
      keepBuffer={4}
      updateWhenZooming={false}
      updateWhenIdle={true}
      maxNativeZoom={18}
      maxZoom={19}
      tileSize={256}
      zoomOffset={0}
      crossOrigin="anonymous"
    />
  );
};

// ============================================
// Internal Marker Data Type (for rendering)
// ============================================
interface MarkerData {
  item: MergedEquipment;
  position: [number, number];
  id: string;
}

// ============================================
// Optimized Marker Component using CircleMarker (Canvas-based)
// Inline popup content - react-leaflet handles lazy rendering
// ============================================

// Helper function to generate Street View URL
const getStreetViewUrl = (lat: number, lng: number, address?: string) => {
  // Try Google Maps with Street View layer using coordinates
  // The cbll parameter sets the Street View position, cbp sets the camera angle
  const streetViewUrl = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
  
  // Fallback to address search if coordinates don't have Street View coverage
  const addressFallback = address 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : `https://www.google.com/maps?q=${lat},${lng}`;
  
  // We'll use the Street View URL - Google will redirect to address if no coverage
  return streetViewUrl;
};

const OptimizedMarker: React.FC<{
  data: MarkerData;
  onClick: (item: MergedEquipment) => void;
}> = React.memo(({ data, onClick }) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [isClosingLightbox, setIsClosingLightbox] = useState(false);
  
  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(data.item);
  }, [data.item, onClick]);

  const handleOpenLightbox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowLightbox(true);
    setIsClosingLightbox(false);
  }, []);

  const handleCloseLightbox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosingLightbox(true);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setShowLightbox(false);
      setIsClosingLightbox(false);
    }, 200);
  }, []);

  // Get photo URL
  const photoUrl = data.item["Foto Referência"];
  const hasPhoto = photoUrl && photoUrl.length > 0;
  
  // Check for panel data - prefer merged _panelData, fallback to legacy fields
  const hasMergedData = '_hasPanelData' in data.item && data.item._hasPanelData && '_panelData' in data.item;
  
  const hasDigital = hasMergedData && data.item._panelData
    ? data.item._panelData.hasDigital
    : (data.item["Painel Digital"] && data.item["Painel Digital"] !== "" && data.item["Painel Digital"] !== "-");
    
  const hasStatic = hasMergedData && data.item._panelData
    ? data.item._panelData.hasStatic
    : (data.item["Painel Estático - Tipo"] && data.item["Painel Estático - Tipo"] !== "" && data.item["Painel Estático - Tipo"] !== "-");

  // Generate Street View URL
  const streetViewUrl = getStreetViewUrl(
    data.position[0], 
    data.position[1], 
    data.item["Endereço"]
  );

  // Status info
  const status = data.item["Status"];
  const isActive = status === "Ativo";
  const showStatus = status && status !== "-";

  // Model name
  const modelName = data.item["Modelo de Abrigo"] || data.item["Modelo"] || 'Sem modelo';

  return (
    <>
      <CircleMarker
        center={data.position}
        radius={7}
        pathOptions={{
          fillColor: '#ff4f00',
          fillOpacity: 0.9,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
        }}
      >
        <Popup 
          className="custom-popup"
          offset={[0, -7]}
          autoPan={true}
          autoPanPadding={[50, 50]}
        >
          <div className="equipment-popup">
            {/* Header with ID and Status */}
            <div className="popup-header">
              <span className="popup-id">
                <Hash className="w-3 h-3" />
                {data.item["Nº Eletro"] || 'N/A'}
              </span>
              {showStatus && (
                <span className={`popup-status ${isActive ? 'status-active' : 'status-inactive'}`}>
                  {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {status}
                </span>
              )}
            </div>
            
            {/* Model Name with Bus Stop Icon */}
            <div className="popup-model-row">
              <BusFront className="popup-model-icon" />
              <h3 className="popup-title">{modelName}</h3>
            </div>
            
            {/* Address with Map Pin */}
            {data.item["Endereço"] && (
              <div className="popup-address-row">
                <MapPin className="popup-address-icon" />
                <p className="popup-address">{data.item["Endereço"]}</p>
              </div>
            )}

            {/* Feature Badges Row */}
            <div className="popup-info-row">
              {hasPhoto && (
                <button 
                  className="popup-badge popup-badge-foto"
                  onClick={handleOpenLightbox}
                  type="button"
                >
                  <Camera className="w-3 h-3" />
                  Foto
                </button>
              )}
              {hasDigital && (
                <span className="popup-badge popup-badge-digital">
                  <Smartphone className="w-3 h-3" />
                  Digital
                </span>
              )}
              {hasStatic && (
                <span className="popup-badge popup-badge-static">
                  <Frame className="w-3 h-3" />
                  Estático
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="popup-buttons">
              <button
                onClick={handleViewDetails}
                className="popup-button"
                type="button"
              >
                <Eye className="w-4 h-4" />
                Ver Detalhes
              </button>
              <a
                href={streetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="popup-button-secondary"
                onClick={(e) => e.stopPropagation()}
              >
                <Navigation className="w-4 h-4" />
                Street View
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>
        </Popup>
      </CircleMarker>

      {/* Lightbox Modal for Photo - rendered via portal to escape Leaflet DOM */}
      {showLightbox && hasPhoto && ReactDOM.createPortal(
        <div 
          className={`popup-lightbox${isClosingLightbox ? ' closing' : ''}`}
          onClick={handleCloseLightbox}
        >
          <button 
            className="popup-lightbox-close"
            onClick={handleCloseLightbox}
            type="button"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={photoUrl} 
            alt={`Foto do abrigo ${data.item["Nº Eletro"]}`}
            className="popup-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
});

OptimizedMarker.displayName = 'OptimizedMarker';

// ============================================
// MapView - Main Component (Simplified Architecture)
// ============================================

// Filter interface matching App.tsx filters structure (subset for map)
interface MapFilters {
  shelterModel: string[];
  panelType: string[];
  hasPhoto: boolean;
}

interface MapViewProps {
  equipment: MergedEquipment[];
  onSelectEquipment: (item: MergedEquipment) => void;
  isLoading?: boolean;
  // Filters now controlled by App.tsx via FilterBar
  filters: MapFilters;
  // Expose loading/progress state for external display
  onLoadingChange?: (isLoading: boolean, progress: number) => void;
}

const MapView: React.FC<MapViewProps> = ({ 
  equipment, 
  onSelectEquipment, 
  isLoading: externalLoading,
  filters,
  onLoadingChange,
}) => {
  const isDark = useIsDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapKey, setMapKey] = useState(0);
  const [containerHeight, setContainerHeight] = useState<string>('calc(100vh - 200px)');
  
  // View state - loaded from cache asynchronously (keep view state caching)
  const [initialViewState, setInitialViewState] = useState<{ center: [number, number]; zoom: number } | null>(null);
  
  // Cache initialization state
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  
  // Pre-loaded markers from IndexedDB cache
  const [cachedMarkersData, setCachedMarkersData] = useState<CacheMarkerData[] | null>(null);
  
  // Progressive loading state
  const [loadedMarkers, setLoadedMarkers] = useState<MarkerData[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Tile loading state
  const [isTilesLoading, setIsTilesLoading] = useState(false);
  
  // Debounce external filters to prevent rapid re-renders during filter changes
  const debouncedFilters = useDebounce(filters, 150);
  
  // Load cached state on mount (async) - only view state and markers, NOT filters
  useEffect(() => {
    const loadCachedState = async () => {
      try {
        await mapDataCache.init();
        
        // Load view state and markers in parallel (filters come from App.tsx now)
        const [viewState, markers] = await Promise.all([
          mapDataCache.getViewState(),
          mapDataCache.loadMarkers(),
        ]);
        
        if (viewState) {
          setInitialViewState(viewState);
        }
        
        if (markers && markers.length > 0) {
          setCachedMarkersData(markers);
          console.log(`[MapView] Loaded ${markers.length} cached markers`);
        }
        
        setIsCacheLoaded(true);
      } catch (e) {
        console.error('[MapView] Error loading cached state:', e);
        setIsCacheLoaded(true);
      }
    };
    
    loadCachedState();
  }, []);

  // Calculate container height to avoid overlapping header
  useEffect(() => {
    const calculateHeight = () => {
      const header = document.querySelector('.sticky.top-0');
      if (header) {
        const headerHeight = header.getBoundingClientRect().height;
        setContainerHeight(`calc(100vh - ${headerHeight + 48}px)`);
      }
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    const timer = setTimeout(calculateHeight, 100);
    
    return () => {
      window.removeEventListener('resize', calculateHeight);
      clearTimeout(timer);
    };
  }, []);

  // Force map remount when component becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapKey(prev => prev + 1);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Generate equipment hash for cache validation
  const equipmentHash = useMemo(() => {
    const sampleIds = equipment.slice(0, 10).map(e => e["Nº Eletro"] || '').filter(Boolean);
    return mapDataCache.generateHash(equipment.length, sampleIds);
  }, [equipment]);

  // Pre-filter equipment to only those with valid coordinates
  // Uses pre-loaded cache if available for instant display
  const equipmentWithCoords = useMemo(() => {
    // Use pre-loaded cached markers if available
    if (cachedMarkersData && cachedMarkersData.length > 0) {
      const equipmentMap = new Map(equipment.map(e => [e["Nº Eletro"], e]));
      
      const result = cachedMarkersData
        .map(cached => {
          const item = equipmentMap.get(cached.nEletro);
          if (!item) return null;
          return {
            item,
            position: cached.position,
            id: cached.id,
          };
        })
        .filter((m): m is MarkerData => m !== null);
      
      if (result.length > 0) {
        console.log(`[MapView] Using ${result.length} cached markers`);
        return result;
      }
    }
    
    // Process equipment and extract coordinates (fallback)
    const processed = equipment.filter(item => {
      const lat = item["Latitude"];
      const lng = item["Longitude"];
      if (!lat || !lng || lat === '-' || lng === '-') return false;
      const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
      const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
      return !isNaN(latNum) && !isNaN(lngNum);
    }).map(item => {
      const lat = typeof item["Latitude"] === 'number' ? item["Latitude"] : parseFloat(String(item["Latitude"]));
      const lng = typeof item["Longitude"] === 'number' ? item["Longitude"] : parseFloat(String(item["Longitude"]));
      return {
        item,
        position: [lat, lng] as [number, number],
        id: item["Nº Eletro"] || `${lat}-${lng}`,
      };
    });
    
    // Save to cache for future use (async, non-blocking)
    if (processed.length > 0 && isCacheLoaded) {
      const cacheData: CacheMarkerData[] = processed.map(m => {
        const hasMergedData = '_hasPanelData' in m.item && m.item._hasPanelData && '_panelData' in m.item;
        return {
          id: m.id,
          position: m.position,
          nEletro: m.item["Nº Eletro"],
          status: m.item["Status"],
          modelo: m.item["Modelo de Abrigo"] || m.item["Modelo"],
          endereco: m.item["Endereço"],
          bairro: m.item["Bairro"],
          hasPhoto: !!(m.item["Foto Referência"] && m.item["Foto Referência"].length > 0),
          hasDigital: hasMergedData && m.item._panelData
            ? m.item._panelData.hasDigital
            : !!(m.item["Painel Digital"] && m.item["Painel Digital"] !== "" && m.item["Painel Digital"] !== "-"),
          hasStatic: hasMergedData && m.item._panelData
            ? m.item._panelData.hasStatic
            : !!(m.item["Painel Estático - Tipo"] && m.item["Painel Estático - Tipo"] !== "" && m.item["Painel Estático - Tipo"] !== "-"),
        };
      });
      
      mapDataCache.saveMarkers(cacheData, equipmentHash).catch(e => {
        console.warn('[MapView] Failed to cache markers:', e);
      });
    }
    
    return processed;
  }, [equipment, cachedMarkersData, equipmentHash, isCacheLoaded]);

  // Apply filters to equipment with coords
  const filteredMarkersData = useMemo(() => {
    const filters = debouncedFilters;
    
    return equipmentWithCoords.filter(({ item }) => {
      // Apply shelter model filter
      if (filters.shelterModel.length > 0) {
        if (!item["Modelo de Abrigo"] || !filters.shelterModel.includes(item["Modelo de Abrigo"])) {
          return false;
        }
      }

      // Apply panel type filter
      if (filters.panelType.length > 0) {
        if (!isAbrigo(item)) return false;
        
        const hasMergedData = '_hasPanelData' in item && item._hasPanelData && '_panelData' in item;
        const matchesAny = filters.panelType.some(type => {
          if (type === 'digital') {
            if (hasMergedData && item._panelData) return item._panelData.hasDigital;
            return item['Painel Digital'] && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
          }
          if (type === 'static') {
            if (hasMergedData && item._panelData) return item._panelData.hasStatic;
            return item['Painel Estático - Tipo'] && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
          }
          return false;
        });
        if (!matchesAny) return false;
      }

      // Apply has photo filter
      if (filters.hasPhoto) {
        if (!item["Foto Referência"] || item["Foto Referência"].length === 0) {
          return false;
        }
      }

      return true;
    });
  }, [equipmentWithCoords, debouncedFilters]);

  // Progressive loading of markers - simplified without conflicting optimizations
  useEffect(() => {
    if (filteredMarkersData.length === 0) {
      setLoadedMarkers([]);
      setLoadingProgress(100);
      setIsProcessing(false);
      return;
    }

    // If we have cached data and it matches, load immediately (skip progressive loading)
    const isCacheValid = cachedMarkersData && cachedMarkersData.length > 0;
    if (isCacheValid && filteredMarkersData.length === equipmentWithCoords.length) {
      // No filters applied and cache is valid - instant load
      console.log(`[MapView] Cache hit - instant load of ${filteredMarkersData.length} markers`);
      setLoadedMarkers(filteredMarkersData);
      setLoadingProgress(100);
      setIsProcessing(false);
      return;
    }

    // Progressive loading for non-cached or filtered data
    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadedMarkers([]);

    let currentIndex = 0;
    const totalItems = filteredMarkersData.length;
    let cancelled = false;

    const processChunk = () => {
      if (cancelled) return;
      
      if (currentIndex < totalItems) {
        const endIndex = Math.min(currentIndex + CHUNK_SIZE, totalItems);
        const chunk = filteredMarkersData.slice(currentIndex, endIndex);
        
        setLoadedMarkers(prev => [...prev, ...chunk]);
        currentIndex = endIndex;
        setLoadingProgress((currentIndex / totalItems) * 100);

        if (currentIndex < totalItems) {
          setTimeout(processChunk, CHUNK_DELAY);
        } else {
          setIsProcessing(false);
        }
      } else {
        setIsProcessing(false);
      }
    };

    // Start processing with a small delay to allow UI to render
    const startTimer = setTimeout(processChunk, 10);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
    };
  }, [filteredMarkersData, cachedMarkersData, equipmentWithCoords.length]);

  // Notify parent about loading state changes
  useEffect(() => {
    onLoadingChange?.(isProcessing, loadingProgress);
  }, [isProcessing, loadingProgress, onLoadingChange]);

  // Handle marker click
  const handleMarkerClick = useCallback((item: MergedEquipment) => {
    onSelectEquipment(item);
  }, [onSelectEquipment]);

  if (externalLoading) {
    return (
      <div 
        className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center"
        style={{ minHeight: '400px' }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-eletro-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 isolate"
    >
      {/* Tile Loading Indicator - Top Right */}
      <AnimatePresence>
        {isTilesLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 right-4 z-[500] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg px-3 py-2 flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 text-eletro-orange animate-spin" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Carregando mapa...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Stats Indicator - Top Left */}
      <div className="absolute top-4 left-4 z-[500] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-lg px-4 py-2">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 text-eletro-orange animate-spin" />
              <span className="font-bold text-eletro-orange">{Math.round(loadingProgress)}%</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-eletro-orange" />
              <span className="font-bold text-eletro-orange">{filteredMarkersData.length.toLocaleString()}</span>
            </>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">pontos</span>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        key={mapKey}
        center={initialViewState?.center || SAO_PAULO_CENTER}
        zoom={initialViewState?.zoom || DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        preferCanvas={true}
        attributionControl={false}
      >
        {/* State controller - handles view persistence */}
        <MapStateController
          initialCenter={initialViewState?.center}
          initialZoom={initialViewState?.zoom}
        />
        
        {/* Tile layer with dark/light mode switching */}
        <TileLayerSwitcher isDark={isDark} onLoadingChange={setIsTilesLoading} />

        {/* Marker Cluster Group - animations only after loading complete */}
        <MarkerClusterGroup
          chunkedLoading={true}
          chunkDelay={50}
          chunkInterval={100}
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={80}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={17}
          removeOutsideVisibleBounds={true}
          animate={!isProcessing}
          animateAddingMarkers={false}
          spiderfyDistanceMultiplier={1.5}
        >
          {loadedMarkers.map((data) => (
            <OptimizedMarker
              key={data.id}
              data={data}
              onClick={handleMarkerClick}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Mobile Message Overlay */}
      <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 flex items-center justify-center md:hidden z-[1000]">
        <div className="text-center p-8">
          <MapPin className="w-16 h-16 text-eletro-orange mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Visualização de Mapa
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            O mapa está disponível apenas em dispositivos desktop.
            <br />
            Por favor, acesse em uma tela maior.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapView;
