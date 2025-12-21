import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import RBush from 'rbush';
import { motion, AnimatePresence } from 'framer-motion';
import { MergedEquipment } from '../types';
import { useIsDark } from '../hooks/useDarkMode';
import { isAbrigo } from '../schemas/equipment';
import { MapPin, Box, Image, Smartphone, Filter, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  mapDataCache,
  MapMarkerData as CacheMarkerData,
  MapFiltersState as ImportedMapFiltersState,
} from '../services/mapDataCache';

// Import Leaflet CSS directly in JS for reliable loading
import 'leaflet/dist/leaflet.css';

// São Paulo city center coordinates
const SAO_PAULO_CENTER: [number, number] = [-23.5505, -46.6333];
const DEFAULT_ZOOM = 12;

// Tile layer URLs (CartoDB - free, no API key required)
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Performance constants
const CHUNK_SIZE = 500; // Process 500 markers per chunk
const CHUNK_DELAY = 16; // ~60fps delay between chunks
const VIEWPORT_PADDING = 0.1; // 10% padding outside viewport
const SPATIAL_INDEX_THRESHOLD = 3000; // Use R-tree when markers exceed this count

// Cluster icon cache for Phase 6 optimization
const clusterIconCache = new Map<string, L.DivIcon>();

// Custom cluster icon creator - optimized with caching
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

  // Create cache key based on count ranges for better cache hits
  const cacheKey = count >= 1000 
    ? `${size}-${Math.floor(count / 100) * 100}` // Round to nearest 100 for large counts
    : count >= 100 
      ? `${size}-${Math.floor(count / 10) * 10}` // Round to nearest 10 for medium counts
      : `${size}-${count}`; // Exact count for small

  // Return cached icon if available
  if (clusterIconCache.has(cacheKey)) {
    return clusterIconCache.get(cacheKey)!;
  }

  const icon = L.divIcon({
    html: `<div>${count.toLocaleString()}</div>`,
    className: `marker-cluster marker-cluster-${size}`,
    iconSize: L.point(dimensions, dimensions, true),
  });

  // Cache the icon
  clusterIconCache.set(cacheKey, icon);
  
  return icon;
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
  
  // Set initial view from cache on mount
  useEffect(() => {
    if (!isInitialized.current && initialCenter && initialZoom) {
      map.setView(initialCenter, initialZoom, { animate: false });
      isInitialized.current = true;
    }
  }, [map, initialCenter, initialZoom]);
  
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
// TileLayerSwitcher - Handle dark/light mode tile switching with performance optimizations
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
      // Performance optimizations
      keepBuffer={4}              // Keep 4 rows/cols of tiles around viewport (vs default 2)
      updateWhenZooming={false}   // Don't reload tiles during zoom animation
      updateWhenIdle={true}       // Only fetch tiles after movement stops
      maxNativeZoom={18}          // Prevent over-fetching at high zoom levels
      maxZoom={19}                // Allow zooming past native but upscale tiles
      tileSize={256}              // Standard tile size
      zoomOffset={0}              // No offset needed for CartoDB
      crossOrigin="anonymous"     // Enable CORS for potential caching
    />
  );
};

// ============================================
// ViewportTracker - Track map viewport for optimized rendering
// ============================================
interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const ViewportTracker: React.FC<{
  onBoundsChange: (bounds: ViewportBounds | null) => void;
}> = ({ onBoundsChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const padding = VIEWPORT_PADDING;
      const latDiff = (bounds.getNorth() - bounds.getSouth()) * padding;
      const lngDiff = (bounds.getEast() - bounds.getWest()) * padding;
      
      onBoundsChange({
        north: bounds.getNorth() + latDiff,
        south: bounds.getSouth() - latDiff,
        east: bounds.getEast() + lngDiff,
        west: bounds.getWest() - lngDiff,
      });
    },
    zoomend: () => {
      const bounds = map.getBounds();
      const padding = VIEWPORT_PADDING;
      const latDiff = (bounds.getNorth() - bounds.getSouth()) * padding;
      const lngDiff = (bounds.getEast() - bounds.getWest()) * padding;
      
      onBoundsChange({
        north: bounds.getNorth() + latDiff,
        south: bounds.getSouth() - latDiff,
        east: bounds.getEast() + lngDiff,
        west: bounds.getWest() - lngDiff,
      });
    },
  });

  // Set initial bounds
  useEffect(() => {
    const bounds = map.getBounds();
    const padding = VIEWPORT_PADDING;
    const latDiff = (bounds.getNorth() - bounds.getSouth()) * padding;
    const lngDiff = (bounds.getEast() - bounds.getWest()) * padding;
    
    onBoundsChange({
      north: bounds.getNorth() + latDiff,
      south: bounds.getSouth() - latDiff,
      east: bounds.getEast() + lngDiff,
      west: bounds.getWest() - lngDiff,
    });
  }, [map, onBoundsChange]);

  return null;
};

// ============================================
// MapFilterBar - Filter controls for the map
// ============================================
interface MapFiltersState {
  shelterModel: string[];
  panelType: string[];
  hasPhoto: boolean;
}

interface MapFilterBarProps {
  filters: MapFiltersState;
  onFilterChange: (filters: MapFiltersState) => void;
  shelterModelOptions: { value: string; count: number }[];
  totalCount: number;
  filteredCount: number;
  loadingProgress: number;
  isLoading: boolean;
}

const MapFilterBar: React.FC<MapFilterBarProps> = ({
  filters,
  onFilterChange,
  shelterModelOptions,
  totalCount,
  filteredCount,
  loadingProgress,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const activeFilterCount = 
    filters.shelterModel.length + 
    filters.panelType.length + 
    (filters.hasPhoto ? 1 : 0);

  const handlePanelTypeToggle = (type: string) => {
    const newTypes = filters.panelType.includes(type)
      ? filters.panelType.filter(t => t !== type)
      : [...filters.panelType, type];
    onFilterChange({ ...filters, panelType: newTypes });
  };

  const handleModelToggle = (model: string) => {
    const newModels = filters.shelterModel.includes(model)
      ? filters.shelterModel.filter(m => m !== model)
      : [...filters.shelterModel, model];
    onFilterChange({ ...filters, shelterModel: newModels });
  };

  const clearFilters = () => {
    onFilterChange({ shelterModel: [], panelType: [], hasPhoto: false });
  };

  return (
    <>
      {/* Filter Controls */}
      <div className="absolute top-4 left-4 z-[500] flex items-start gap-3">
        {/* Filter Toggle Button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-md transition-all",
            isExpanded 
              ? "bg-eletro-orange text-white" 
              : "bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Filter className="w-4 h-4" />
          <span className="font-medium text-sm">Filtros</span>
          {activeFilterCount > 0 && (
            <span className={cn(
              "ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full",
              isExpanded ? "bg-white/20" : "bg-eletro-orange text-white"
            )}>
              {activeFilterCount}
            </span>
          )}
        </motion.button>

        {/* Compact Count Badge with Loading */}
        {!isExpanded && (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-lg px-4 py-2">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-eletro-orange animate-spin" />
                  <span className="font-bold text-eletro-orange">{Math.round(loadingProgress)}%</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-eletro-orange" />
                  <span className="font-bold text-eletro-orange">{filteredCount.toLocaleString()}</span>
                </>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">pontos</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 right-4 z-[500] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-lg p-4"
          >
            {/* Loading Progress Bar */}
            {isLoading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Carregando marcadores...</span>
                  <span>{Math.round(loadingProgress)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-eletro-orange"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {/* Modelo de Abrigo Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    filters.shelterModel.length > 0
                      ? "border-eletro-orange bg-orange-50 dark:bg-orange-900/20 text-eletro-orange"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                  )}
                >
                  <Box className="w-4 h-4" />
                  <span>Modelo</span>
                  {filters.shelterModel.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-eletro-orange text-white text-xs rounded-full">
                      {filters.shelterModel.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showModelDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[600]"
                    >
                      <div className="p-2">
                        {shelterModelOptions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-400">Nenhum modelo disponível</div>
                        ) : (
                          shelterModelOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => handleModelToggle(option.value)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                filters.shelterModel.includes(option.value)
                                  ? "bg-orange-50 dark:bg-orange-900/30 text-eletro-orange"
                                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              )}
                            >
                              <span className="truncate">{option.value}</span>
                              <span className="text-xs text-gray-400 ml-2">{option.count}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Panel Type Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePanelTypeToggle('digital')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    filters.panelType.includes('digital')
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                  )}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Digital</span>
                </button>

                <button
                  onClick={() => handlePanelTypeToggle('static')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    filters.panelType.includes('static')
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                  )}
                >
                  <Box className="w-4 h-4" />
                  <span>Estático</span>
                </button>
              </div>

              {/* Has Photo Toggle */}
              <button
                onClick={() => onFilterChange({ ...filters, hasPhoto: !filters.hasPhoto })}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                  filters.hasPhoto
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                )}
              >
                <Image className="w-4 h-4" />
                <span>Com Foto</span>
              </button>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Limpar</span>
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Count Badge */}
              <div className="text-right">
                <div className="text-lg font-bold text-eletro-orange">
                  {isLoading ? `${Math.round(loadingProgress)}%` : filteredCount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">de {totalCount.toLocaleString()}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close dropdown */}
      {showModelDropdown && (
        <div
          className="fixed inset-0 z-[400]"
          onClick={() => setShowModelDropdown(false)}
        />
      )}
    </>
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

// R-tree bounding box interface for spatial indexing
interface MarkerBBox {
  minX: number; // longitude
  minY: number; // latitude
  maxX: number; // longitude
  maxY: number; // latitude
  marker: MarkerData;
}

// ============================================
// LazyPopupContent - Only renders full content when popup opens (Phase 7)
// ============================================
interface LazyPopupContentProps {
  item: MergedEquipment;
  onViewDetails: (e: React.MouseEvent) => void;
}

const LazyPopupContent: React.FC<LazyPopupContentProps> = React.memo(({ item, onViewDetails }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Lazy load content after a short delay to prioritize popup opening
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsLoaded(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // Check for photo
  const hasPhoto = item["Foto Referência"] && item["Foto Referência"].length > 0;
  
  // Check for panel data - prefer merged _panelData, fallback to legacy fields
  const hasMergedData = '_hasPanelData' in item && item._hasPanelData && '_panelData' in item;
  
  const hasDigital = hasMergedData && item._panelData
    ? item._panelData.hasDigital
    : (item["Painel Digital"] && item["Painel Digital"] !== "" && item["Painel Digital"] !== "-");
    
  const hasStatic = hasMergedData && item._panelData
    ? item._panelData.hasStatic
    : (item["Painel Estático - Tipo"] && item["Painel Estático - Tipo"] !== "" && item["Painel Estático - Tipo"] !== "-");

  // Show minimal content initially, then full content
  if (!isLoaded) {
    return (
      <div className="equipment-popup">
        <div className="popup-header">
          <span className="popup-id">{item["Nº Eletro"] || 'N/A'}</span>
        </div>
        <div className="text-xs text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="equipment-popup">
      {/* Header with ID and Status */}
      <div className="popup-header">
        <span className="popup-id">
          {item["Nº Eletro"] || 'N/A'}
        </span>
        {item["Status"] && item["Status"] !== "-" && (
          <span className={`popup-status ${item["Status"] === "Ativo" ? 'status-active' : 'status-inactive'}`}>
            {item["Status"]}
          </span>
        )}
      </div>
      
      {/* Model Name */}
      <h3 className="popup-title">
        {item["Modelo de Abrigo"] || item["Modelo"] || 'Sem modelo'}
      </h3>
      
      {/* Address */}
      {item["Endereço"] && (
        <p className="popup-address">
          {item["Endereço"]}
        </p>
      )}

      {/* Quick Info Row - Shows Photo, Digital, and Static badges */}
      <div className="popup-info-row">
        {hasPhoto && (
          <span className="popup-info-badge">
            <Image className="w-3 h-3" />
            Foto
          </span>
        )}
        {hasDigital && (
          <span className="popup-info-badge popup-info-digital">
            <Smartphone className="w-3 h-3" />
            Digital
          </span>
        )}
        {hasStatic && (
          <span className="popup-info-badge popup-info-static">
            <Box className="w-3 h-3" />
            Estático
          </span>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onViewDetails}
        className="popup-button"
      >
        Ver Detalhes
      </button>
    </div>
  );
});

LazyPopupContent.displayName = 'LazyPopupContent';

// ============================================
// Optimized Marker Component using CircleMarker (Canvas-based)
// Uses LazyPopupContent for Phase 7 optimization
// ============================================
const OptimizedMarker: React.FC<{
  data: MarkerData;
  onClick: (item: MergedEquipment) => void;
}> = React.memo(({ data, onClick }) => {
  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(data.item);
  }, [data.item, onClick]);

  return (
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
      <Popup className="custom-popup">
        <LazyPopupContent item={data.item} onViewDetails={handleViewDetails} />
      </Popup>
    </CircleMarker>
  );
});

OptimizedMarker.displayName = 'OptimizedMarker';

// ============================================
// MapView - Main Component with Performance Optimizations
// ============================================
interface MapViewProps {
  equipment: MergedEquipment[];
  onSelectEquipment: (item: MergedEquipment) => void;
  isLoading?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ equipment, onSelectEquipment, isLoading: externalLoading }) => {
  const isDark = useIsDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapKey, setMapKey] = useState(0);
  const [containerHeight, setContainerHeight] = useState<string>('calc(100vh - 200px)');
  
  // Filters state - loaded from cache asynchronously
  const [mapFilters, setMapFilters] = useState<MapFiltersState>({
    shelterModel: [],
    panelType: [],
    hasPhoto: false,
  });
  
  // View state - loaded from cache asynchronously
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
  
  // Viewport bounds for optimization
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  
  // Debounce filters to prevent rapid re-renders
  const debouncedFilters = useDebounce(mapFilters, 150);
  
  // Load cached state on mount (async)
  useEffect(() => {
    const loadCachedState = async () => {
      try {
        await mapDataCache.init();
        
        // Load filters, view state, and markers in parallel
        const [filters, viewState, markers] = await Promise.all([
          mapDataCache.getFilters(),
          mapDataCache.getViewState(),
          mapDataCache.loadMarkers(),
        ]);
        
        if (filters) {
          setMapFilters(filters);
        }
        
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
  
  // Save filters to cache when they change
  useEffect(() => {
    if (isCacheLoaded) {
      mapDataCache.saveFilters(debouncedFilters);
    }
  }, [debouncedFilters, isCacheLoaded]);

  // Calculate container height to avoid overlapping header
  useEffect(() => {
    const calculateHeight = () => {
      // Find the sticky header element
      const header = document.querySelector('.sticky.top-0');
      if (header) {
        const headerHeight = header.getBoundingClientRect().height;
        // Add some padding (32px = py-8 from main container)
        setContainerHeight(`calc(100vh - ${headerHeight + 48}px)`);
      }
    };
    
    // Calculate on mount and window resize
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    
    // Also recalculate after a short delay to ensure header is fully rendered
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

  // Calculate shelter model options from equipment (memoized)
  const shelterModelOptions = useMemo(() => {
    const counts = new Map<string, number>();
    equipment.forEach(item => {
      const model = item["Modelo de Abrigo"];
      if (model && model !== '-' && model !== 'N/A') {
        counts.set(model, (counts.get(model) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [equipment]);

  // Generate equipment hash for cache validation
  const equipmentHash = useMemo(() => {
    const sampleIds = equipment.slice(0, 10).map(e => e["Nº Eletro"] || '').filter(Boolean);
    return mapDataCache.generateHash(equipment.length, sampleIds);
  }, [equipment]);

  // Pre-filter equipment to only those with valid coordinates
  // Uses pre-loaded cache if available
  const equipmentWithCoords = useMemo(() => {
    // Use pre-loaded cached markers if available
    if (cachedMarkersData && cachedMarkersData.length > 0) {
      // Reconstruct MarkerData from cached data + equipment lookup
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
      
      // Save asynchronously to not block rendering
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

  // Progressive loading of markers using requestIdleCallback
  useEffect(() => {
    if (filteredMarkersData.length === 0) {
      setLoadedMarkers([]);
      setLoadingProgress(100);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadedMarkers([]);

    let currentIndex = 0;
    const totalItems = filteredMarkersData.length;

    const processChunk = (deadline?: IdleDeadline) => {
      const hasTimeRemaining = deadline ? deadline.timeRemaining() > 0 : true;
      
      if (currentIndex < totalItems && hasTimeRemaining) {
        const endIndex = Math.min(currentIndex + CHUNK_SIZE, totalItems);
        const chunk = filteredMarkersData.slice(currentIndex, endIndex);
        
        setLoadedMarkers(prev => [...prev, ...chunk]);
        currentIndex = endIndex;
        setLoadingProgress((currentIndex / totalItems) * 100);

        if (currentIndex < totalItems) {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(processChunk, { timeout: CHUNK_DELAY * 2 });
          } else {
            setTimeout(() => processChunk(), CHUNK_DELAY);
          }
        } else {
          setIsProcessing(false);
        }
      } else if (currentIndex < totalItems) {
        // If no time remaining but still have items, schedule next chunk
        if ('requestIdleCallback' in window) {
          requestIdleCallback(processChunk, { timeout: CHUNK_DELAY * 2 });
        } else {
          setTimeout(() => processChunk(), CHUNK_DELAY);
        }
      } else {
        setIsProcessing(false);
      }
    };

    // Start processing
    if ('requestIdleCallback' in window) {
      requestIdleCallback(processChunk, { timeout: 100 });
    } else {
      setTimeout(() => processChunk(), 10);
    }

    return () => {
      // Cleanup would require a more complex cancellation mechanism
      // For now, the state updates will be ignored if component unmounts
    };
  }, [filteredMarkersData]);

  // Build R-tree spatial index for fast viewport queries (O(log n) vs O(n))
  const spatialIndex = useMemo(() => {
    // Only build index for large datasets
    if (loadedMarkers.length < SPATIAL_INDEX_THRESHOLD) {
      return null;
    }
    
    const tree = new RBush<MarkerBBox>();
    const bboxes: MarkerBBox[] = loadedMarkers.map(marker => ({
      minX: marker.position[1], // longitude
      minY: marker.position[0], // latitude
      maxX: marker.position[1],
      maxY: marker.position[0],
      marker,
    }));
    
    // Bulk load is much faster than individual inserts
    tree.load(bboxes);
    console.log(`[MapView] Built R-tree index with ${loadedMarkers.length} markers`);
    
    return tree;
  }, [loadedMarkers]);

  // Filter markers by viewport using R-tree for O(log n) queries
  const visibleMarkers = useMemo(() => {
    // If no spatial index, return all markers (small dataset or no bounds)
    if (!spatialIndex || !viewportBounds) {
      return loadedMarkers;
    }

    // Use R-tree for fast spatial query
    const results = spatialIndex.search({
      minX: viewportBounds.west,  // longitude min
      minY: viewportBounds.south, // latitude min
      maxX: viewportBounds.east,  // longitude max
      maxY: viewportBounds.north, // latitude max
    });
    
    return results.map(bbox => bbox.marker);
  }, [loadedMarkers, viewportBounds, spatialIndex]);

  // Handle marker click
  const handleMarkerClick = useCallback((item: MergedEquipment) => {
    onSelectEquipment(item);
  }, [onSelectEquipment]);

  // Handle bounds change
  const handleBoundsChange = useCallback((bounds: ViewportBounds | null) => {
    setViewportBounds(bounds);
  }, []);

  if (externalLoading) {
    return (
      <div 
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center"
        style={{ height: containerHeight, minHeight: '400px' }}
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
      className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 isolate"
      style={{ height: containerHeight, minHeight: '400px', maxHeight: 'calc(100vh - 180px)' }}
    >
      {/* Filter Bar */}
      <MapFilterBar
        filters={mapFilters}
        onFilterChange={setMapFilters}
        shelterModelOptions={shelterModelOptions}
        totalCount={equipmentWithCoords.length}
        filteredCount={filteredMarkersData.length}
        loadingProgress={loadingProgress}
        isLoading={isProcessing}
      />

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

      {/* Map Container */}
      <MapContainer
        key={mapKey}
        center={initialViewState?.center || SAO_PAULO_CENTER}
        zoom={initialViewState?.zoom || DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        preferCanvas={true} // Force canvas rendering
        attributionControl={false} // Hide attribution watermark
      >
        {/* State controller - handles view persistence */}
        <MapStateController
          initialCenter={initialViewState?.center}
          initialZoom={initialViewState?.zoom}
        />
        
        {/* Viewport tracker for optimization */}
        <ViewportTracker onBoundsChange={handleBoundsChange} />
        
        {/* Tile layer with dark/light mode switching and performance optimizations */}
        <TileLayerSwitcher isDark={isDark} onLoadingChange={setIsTilesLoading} />

        {/* Marker Cluster Group with optimized settings (Phase 6 enhancements) */}
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
          animate={false} // Disable animation for better performance
          // Phase 6 additional optimizations
          singleMarkerMode={false} // Keep false - we want full marker functionality
          zoomToBoundsOnClick={true} // Zoom into cluster on click
          spiderfyDistanceMultiplier={1.5} // Spread spiderfied markers more
          polygonOptions={{ // Lighter polygon style for performance
            stroke: false,
            fill: false,
          }}
        >
          {visibleMarkers.map((data) => (
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
