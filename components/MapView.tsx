/**
 * MapView Component - Performance Optimized Version
 * 
 * This version replaces the DOM-based react-leaflet-cluster with:
 * 1. Supercluster - Fast geospatial clustering algorithm (runs in Web Worker)
 * 2. Viewport-based rendering - Only renders visible clusters/markers
 * 3. DivIcon clusters - Proper z-index handling within Leaflet's layer system
 * 4. Canvas points - Uses CircleMarker for individual points
 * 5. Lazy popup - Single shared popup that opens on click
 * 6. Throttled events - Prevents excessive re-renders during zoom/pan
 * 7. CSS animations - Scale + fade transitions for appear/disappear
 * 
 * Expected INP improvement: 1,408ms → <200ms
 */

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MergedEquipment } from '../types';
import { useIsDark } from '../hooks/useDarkMode';
import { 
  MapPin, X, Loader2,
  BusFront, Camera, Smartphone, Frame, 
  CheckCircle2, XCircle, Eye, Navigation, ExternalLink, Hash
} from 'lucide-react';
import { mapDataCache } from '../services/mapDataCache';
import { useMapNavigationOptional } from '../contexts/MapNavigationContext';
import { 
  useClusterWorker, 
  isCluster,
  type PointOrCluster,
  type PointProperties,
  type FilterConfig,
  type GeoJSONPoint,
} from '../hooks/useClusterWorker';

// Import Leaflet CSS directly in JS for reliable loading
import 'leaflet/dist/leaflet.css';

// São Paulo city center coordinates
const SAO_PAULO_CENTER: [number, number] = [-23.5505, -46.6333];
const DEFAULT_ZOOM = 12;

// Tile layer URLs (CartoDB - free, no API key required)
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Throttle delay for map events (ms) - optimized for smooth live updates
const THROTTLE_DELAY = 50;

// Spiderfy configuration
const SPIDERFY_THRESHOLD = 8; // Max points to show spiderfy

// ============================================
// Throttle hook for map events - live updates with rate limiting
// Uses leading edge: updates immediately, then throttles subsequent calls
// ============================================
function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRan.current;

    // If enough time has passed, update immediately (leading edge)
    if (timeSinceLastRun >= delay) {
      setThrottledValue(value);
      lastRan.current = now;
    } else {
      // Otherwise, schedule update for when throttle period ends (trailing edge)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }, delay - timeSinceLastRun);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}

// ============================================
// MapStateController - Persists map view state and handles navigation
// ============================================
interface MapStateControllerProps {
  onViewChange?: (center: [number, number], zoom: number, bounds: L.LatLngBounds) => void;
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
    
    map.flyTo([lat, lng], targetZoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
    
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
    
    map.flyTo(SAO_PAULO_CENTER, DEFAULT_ZOOM, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
    
    const handleMoveEnd = () => {
      mapNav.clearResetFlag();
      map.off('moveend', handleMoveEnd);
    };
    
    map.on('moveend', handleMoveEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, mapNav?.shouldResetView, mapNav]);
  
  // Notify view changes - called frequently during pan, throttled upstream
  const notifyViewChange = useCallback(() => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    
    mapDataCache.saveViewState([center.lat, center.lng], zoom);
    onViewChange?.([center.lat, center.lng], zoom, bounds);
  }, [map, onViewChange]);
  
  // Track view changes with throttling - including 'move' for live updates during pan
  useMapEvents({
    move: notifyViewChange,       // Live updates during panning
    moveend: notifyViewChange,    // Final update when pan ends
    zoomend: notifyViewChange,
    load: notifyViewChange,
  });
  
  // Initial notification and size invalidation
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
      notifyViewChange();
    }, 100);
    return () => clearTimeout(timer);
  }, [map, notifyViewChange]);

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
      keepBuffer={6}             // Increased buffer for smoother panning
      updateWhenZooming={false}  // Performance: don't fetch during zoom animation
      updateWhenIdle={false}     // Live updates: fetch tiles while panning
      maxNativeZoom={18}
      maxZoom={19}
      tileSize={256}
      zoomOffset={0}
      crossOrigin="anonymous"
    />
  );
};

// ============================================
// Helper function to generate Street View URL
// ============================================
const getStreetViewUrl = (lat: number, lng: number) => {
  return `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
};

// ============================================
// Format cluster count for display
// ============================================
const formatClusterCount = (count: number): string => {
  if (count >= 10000) return `${Math.round(count / 1000)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
};

// ============================================
// Create cluster DivIcon - properly sized with label
// ============================================
const createClusterIcon = (count: number, animationClass: string = '', isSpiderfied: boolean = false): L.DivIcon => {
  // Determine size class based on count
  let sizeClass = 'cluster-small';
  let size = 36;
  
  if (count >= 1000) {
    sizeClass = 'cluster-xlarge';
    size = 54;
  } else if (count >= 100) {
    sizeClass = 'cluster-large';
    size = 48;
  } else if (count >= 10) {
    sizeClass = 'cluster-medium';
    size = 42;
  }
  
  const displayCount = formatClusterCount(count);
  const animClass = animationClass ? ` ${animationClass}` : '';
  const spiderfiedClass = isSpiderfied ? ' cluster-spiderfied' : '';
  
  return L.divIcon({
    html: `<div class="cluster-marker-inner${animClass}${spiderfiedClass}">${displayCount}</div>`,
    className: `cluster-marker-wrapper ${sizeClass}`,
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
};

// ============================================
// ClusterMarker - Renders a cluster using DivIcon
// ============================================
interface ClusterMarkerProps {
  position: [number, number];
  count: number;
  clusterId: number;
  onClusterClick: (clusterId: number, position: [number, number], count: number) => void;
  isNew?: boolean;
  isSpiderfied?: boolean;
}

const ClusterMarker: React.FC<ClusterMarkerProps> = React.memo(({ 
  position, 
  count, 
  clusterId, 
  onClusterClick,
  isNew = false,
  isSpiderfied = false,
}) => {
  const icon = useMemo(() => createClusterIcon(count, isNew ? 'cluster-appear' : '', isSpiderfied), [count, isNew, isSpiderfied]);

  const handleClick = useCallback(() => {
    onClusterClick(clusterId, position, count);
  }, [clusterId, position, count, onClusterClick]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: handleClick,
      }}
    />
  );
});

ClusterMarker.displayName = 'ClusterMarker';

// ============================================
// PointMarker - Renders an individual point (non-cluster)
// ============================================
interface PointMarkerProps {
  position: [number, number];
  properties: PointProperties;
  onMarkerClick: (properties: PointProperties, position: [number, number], isFromSpider: boolean) => void;
  isNew?: boolean;
}

const PointMarker: React.FC<PointMarkerProps> = React.memo(({ 
  position, 
  properties, 
  onMarkerClick,
  isNew = false,
}) => {
  const handleClick = useCallback(() => {
    onMarkerClick(properties, position, false);
  }, [properties, position, onMarkerClick]);

  return (
    <CircleMarker
      center={position}
      radius={7}
      pathOptions={{
        fillColor: '#ff4f00',
        fillOpacity: 0.9,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        className: isNew ? 'point-appear' : '',
      }}
      eventHandlers={{
        click: handleClick,
      }}
    />
  );
});

PointMarker.displayName = 'PointMarker';

// ============================================
// SharedPopup - Single popup component that shows for selected marker
// ============================================
interface SharedPopupProps {
  position: [number, number] | null;
  equipment: MergedEquipment | null;
  onClose: () => void;
  onViewDetails: (item: MergedEquipment) => void;
}

const SharedPopup: React.FC<SharedPopupProps> = ({ 
  position, 
  equipment, 
  onClose, 
  onViewDetails 
}) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [isClosingLightbox, setIsClosingLightbox] = useState(false);

  if (!position || !equipment) return null;

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(equipment);
  };

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowLightbox(true);
    setIsClosingLightbox(false);
  };

  const handleCloseLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosingLightbox(true);
    setTimeout(() => {
      setShowLightbox(false);
      setIsClosingLightbox(false);
    }, 200);
  };

  // Get photo URL
  const photoUrl = equipment["Foto Referência"];
  const hasPhoto = photoUrl && photoUrl.length > 0;
  
  // Check for panel data
  const hasMergedData = '_hasPanelData' in equipment && equipment._hasPanelData && '_panelData' in equipment;
  
  const hasDigital = hasMergedData && equipment._panelData
    ? equipment._panelData.hasDigital
    : (equipment["Painel Digital"] && equipment["Painel Digital"] !== "" && equipment["Painel Digital"] !== "-");
    
  const hasStatic = hasMergedData && equipment._panelData
    ? equipment._panelData.hasStatic
    : (equipment["Painel Estático - Tipo"] && equipment["Painel Estático - Tipo"] !== "" && equipment["Painel Estático - Tipo"] !== "-");

  // Generate Street View URL
  const streetViewUrl = getStreetViewUrl(position[0], position[1]);

  // Status info
  const status = equipment["Status"];
  const isActive = status === "Ativo";
  const showStatus = status && status !== "-";

  // Model name
  const modelName = equipment["Modelo de Abrigo"] || equipment["Modelo"] || 'Sem modelo';

  return (
    <>
      <Popup 
        position={position}
        className="custom-popup"
        offset={[0, -7]}
        autoPan={true}
        autoPanPadding={[50, 50]}
        eventHandlers={{
          remove: onClose,
        }}
      >
        <div className="equipment-popup">
          {/* Header with ID and Status */}
          <div className="popup-header">
            <span className="popup-id">
              <Hash className="w-3 h-3" />
              {equipment["Nº Eletro"] || 'N/A'}
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
          {equipment["Endereço"] && (
            <div className="popup-address-row">
              <MapPin className="popup-address-icon" />
              <p className="popup-address">{equipment["Endereço"]}</p>
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

      {/* Lightbox Modal for Photo */}
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
            alt={`Foto do abrigo ${equipment["Nº Eletro"]}`}
            className="popup-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
};

// ============================================
// ClusterLayer - Renders clusters and points from worker
// With animation tracking for appear/disappear effects
// ============================================
interface SpiderfyBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface ClusterLayerProps {
  clusters: PointOrCluster[];
  equipmentMap: Map<number, MergedEquipment>;
  onClusterClick: (clusterId: number, position: [number, number], count: number) => void;
  onMarkerClick: (properties: PointProperties, position: [number, number], isFromSpider: boolean) => void;
  spiderfiedClusterId: number | null;
  spiderfiedPointIds: Set<string>;
  spiderfyBounds: SpiderfyBounds | null;
}

// Helper function to check if a position is within spiderfy bounds (with padding)
const isWithinSpiderfyBounds = (
  lat: number, 
  lng: number, 
  bounds: SpiderfyBounds | null,
  padding: number = 0.0005 // ~50 meters padding
): boolean => {
  if (!bounds) return false;
  return (
    lat >= bounds.minLat - padding &&
    lat <= bounds.maxLat + padding &&
    lng >= bounds.minLng - padding &&
    lng <= bounds.maxLng + padding
  );
};

const ClusterLayer: React.FC<ClusterLayerProps> = React.memo(({
  clusters,
  equipmentMap,
  onClusterClick,
  onMarkerClick,
  spiderfiedClusterId,
  spiderfiedPointIds,
  spiderfyBounds,
}) => {
  // Track previous cluster IDs to detect new ones for animation
  const prevIdsRef = useRef<Set<string>>(new Set());
  
  // Get current IDs
  const currentIds = useMemo(() => {
    const ids = new Set<string>();
    clusters.forEach((feature) => {
      if (isCluster(feature)) {
        ids.add(`cluster-${feature.properties.cluster_id}`);
      } else {
        ids.add(`point-${(feature.properties as PointProperties).id}`);
      }
    });
    return ids;
  }, [clusters]);
  
  // Determine which are new (for animation)
  const newIds = useMemo(() => {
    const newSet = new Set<string>();
    currentIds.forEach(id => {
      if (!prevIdsRef.current.has(id)) {
        newSet.add(id);
      }
    });
    return newSet;
  }, [currentIds]);
  
  // Update previous IDs after render
  useEffect(() => {
    prevIdsRef.current = currentIds;
  }, [currentIds]);

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const position: [number, number] = [lat, lng];

        if (isCluster(feature)) {
          // Render cluster
          const { cluster_id, point_count } = feature.properties;
          const key = `cluster-${cluster_id}`;
          
          // Hide the spiderfied cluster entirely (it's now shown via SpiderfyLayer)
          if (spiderfiedClusterId === cluster_id) {
            return null;
          }
          
          // Hide any cluster that falls within the spiderfy bounding box
          // This prevents new clusters from appearing on top of the spider visualization
          if (isWithinSpiderfyBounds(position[0], position[1], spiderfyBounds)) {
            return null;
          }
          
          return (
            <ClusterMarker
              key={key}
              position={position}
              count={point_count}
              clusterId={cluster_id}
              onClusterClick={onClusterClick}
              isNew={newIds.has(key)}
              isSpiderfied={false}
            />
          );
        } else {
          // Render individual point
          const props = feature.properties as PointProperties;
          const key = `point-${props.id}`;
          
          // Skip points that are part of the active spiderfy (they're shown via SpiderfyLayer)
          if (spiderfiedPointIds.has(props.id)) {
            return null;
          }
          
          // Hide any point that falls within the spiderfy bounding box
          if (isWithinSpiderfyBounds(position[0], position[1], spiderfyBounds)) {
            return null;
          }
          
          return (
            <PointMarker
              key={key}
              position={position}
              properties={props}
              onMarkerClick={onMarkerClick}
              isNew={newIds.has(key)}
            />
          );
        }
      })}
    </>
  );
});

ClusterLayer.displayName = 'ClusterLayer';

// ============================================
// SpiderfyLayer - Shows actual equipment locations from a cluster
// Spider legs connect cluster center to real equipment positions
// Clicking a point opens the equipment popup
// ============================================
interface SpiderfyState {
  center: [number, number];
  points: GeoJSONPoint[];
  clusterId: number;
}

interface SpiderfyLayerProps {
  spiderfy: SpiderfyState | null;
  equipmentMap: Map<number, MergedEquipment>;
  onPointClick: (properties: PointProperties, position: [number, number], isFromSpider: boolean) => void;
  onClose: () => void;
}

const SpiderfyLayer: React.FC<SpiderfyLayerProps> = React.memo(({
  spiderfy,
  equipmentMap,
  onPointClick,
  onClose,
}) => {
  // Close spiderfy only when map zooms (not when panning)
  useMapEvents({
    zoomstart: onClose,
  });
  
  if (!spiderfy) return null;
  
  const { center, points } = spiderfy;
  
  return (
    <>
      {/* Spider legs - connect cluster center to actual equipment positions */}
      {points.map((point) => {
        const [lng, lat] = point.geometry.coordinates;
        const actualPosition: [number, number] = [lat, lng];
        
        return (
          <Polyline
            key={`leg-${point.properties.id}`}
            positions={[center, actualPosition]}
            pathOptions={{
              color: '#ff4f00',
              weight: 2,
              opacity: 0.5,
              dashArray: '4, 6',
              className: 'spider-leg-line',
            }}
          />
        );
      })}
      
      {/* Center marker (faded cluster position) - subtle since cluster is shrunk */}
      <CircleMarker
        center={center}
        radius={12}
        pathOptions={{
          fillColor: '#ff4f00',
          fillOpacity: 0.1,
          color: '#ff4f00',
          weight: 1.5,
          opacity: 0.2,
          className: 'spider-center',
        }}
      />
      
      {/* Actual equipment point markers at their real locations */}
      {points.map((point) => {
        const [lng, lat] = point.geometry.coordinates;
        const actualPosition: [number, number] = [lat, lng];
        const props = point.properties;
        
        return (
          <CircleMarker
            key={`spider-point-${props.id}`}
            center={actualPosition}
            radius={9}
            pathOptions={{
              fillColor: '#ff4f00',
              fillOpacity: 0.95,
              color: '#ffffff',
              weight: 3,
              opacity: 1,
              className: 'spider-point-marker',
            }}
            eventHandlers={{
              click: () => onPointClick(props, actualPosition, true),
            }}
          />
        );
      })}
    </>
  );
});

SpiderfyLayer.displayName = 'SpiderfyLayer';

// ============================================
// MapView - Main Component
// ============================================

interface MapFilters {
  shelterModel: string[];
  panelType: string[];
  hasPhoto: boolean;
}

interface MapViewProps {
  equipment: MergedEquipment[];
  onSelectEquipment: (item: MergedEquipment) => void;
  isLoading?: boolean;
  filters: MapFilters;
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
  const mapRef = useRef<L.Map | null>(null);
  const [mapKey, setMapKey] = useState(0);
  
  // View state
  const [initialViewState, setInitialViewState] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  
  // Tile loading state
  const [isTilesLoading, setIsTilesLoading] = useState(false);
  
  // Selected marker for popup
  const [selectedMarker, setSelectedMarker] = useState<{
    position: [number, number];
    equipment: MergedEquipment;
  } | null>(null);
  
  // Spiderfy state for small clusters
  const [spiderfyState, setSpiderfyState] = useState<SpiderfyState | null>(null);
  
  // Compute set of spiderfied point IDs to filter them from ClusterLayer
  const spiderfiedPointIds = useMemo(() => {
    if (!spiderfyState) return new Set<string>();
    return new Set(spiderfyState.points.map(p => p.properties.id));
  }, [spiderfyState]);
  
  // Compute bounding box of spiderfied points to filter overlapping clusters
  const spiderfyBounds = useMemo((): SpiderfyBounds | null => {
    if (!spiderfyState || spiderfyState.points.length === 0) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    // Include spiderfy center in bounds calculation
    const [centerLat, centerLng] = spiderfyState.center;
    minLat = Math.min(minLat, centerLat);
    maxLat = Math.max(maxLat, centerLat);
    minLng = Math.min(minLng, centerLng);
    maxLng = Math.max(maxLng, centerLng);
    
    // Include all spiderfied points
    spiderfyState.points.forEach(point => {
      const [lng, lat] = point.geometry.coordinates;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    
    return { minLat, maxLat, minLng, maxLng };
  }, [spiderfyState]);
  
  // Convert filters to worker format
  const workerFilters: FilterConfig = useMemo(() => ({
    shelterModel: filters.shelterModel,
    panelType: filters.panelType,
    hasPhoto: filters.hasPhoto,
  }), [filters.shelterModel, filters.panelType, filters.hasPhoto]);
  
  // Use cluster worker
  const {
    isReady: workerReady,
    isLoading: workerLoading,
    clusters,
    totalFiltered,
    equipmentMap,
    getClusters,
    getClusterExpansionZoom,
    getLeaves,
  } = useClusterWorker(equipment, workerFilters);
  
  // Throttle bounds changes to prevent excessive worker calls
  const throttledBounds = useThrottle(currentBounds, THROTTLE_DELAY);
  const throttledZoom = useThrottle(currentZoom, THROTTLE_DELAY);
  
  // Load cached state on mount
  useEffect(() => {
    const loadCachedState = async () => {
      try {
        await mapDataCache.init();
        const viewState = await mapDataCache.getViewState();
        
        if (viewState) {
          setInitialViewState(viewState);
        }
      } catch (e) {
        console.error('[MapView] Error loading cached state:', e);
      }
    };
    
    loadCachedState();
  }, []);

  // Force map remount when component becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapKey(prev => prev + 1);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Request clusters when bounds/zoom change
  useEffect(() => {
    if (!workerReady || !throttledBounds) return;
    
    const west = throttledBounds.getWest();
    const south = throttledBounds.getSouth();
    const east = throttledBounds.getEast();
    const north = throttledBounds.getNorth();
    
    // Supercluster expects bbox as [westLng, southLat, eastLng, northLat]
    getClusters([west, south, east, north], Math.floor(throttledZoom));
  }, [workerReady, throttledBounds, throttledZoom, getClusters]);

  // Notify parent about loading state
  useEffect(() => {
    const progress = workerReady ? 100 : 0;
    onLoadingChange?.(workerLoading, progress);
  }, [workerLoading, workerReady, onLoadingChange]);

  // Handle view change from map
  const handleViewChange = useCallback((
    _center: [number, number], 
    zoom: number, 
    bounds: L.LatLngBounds
  ) => {
    setCurrentBounds(bounds);
    setCurrentZoom(zoom);
  }, []);

  // Handle cluster click - zoom to expand or spiderfy for small clusters
  const handleClusterClick = useCallback(async (clusterId: number, position: [number, number], pointCount?: number) => {
    if (!mapRef.current) return;
    
    // Close any existing spiderfy and popup
    setSpiderfyState(null);
    setSelectedMarker(null);
    
    try {
      // For small clusters (≤ threshold points), show spiderfy
      if (pointCount && pointCount <= SPIDERFY_THRESHOLD) {
        const leaves = await getLeaves(clusterId, SPIDERFY_THRESHOLD + 5);
        if (leaves.length > 0) {
          // Zoom in by 1.5 levels to make spider points more visible
          const targetZoom = Math.min(currentZoom + 1.5, 18);
          mapRef.current.flyTo(position, targetZoom, {
            duration: 0.4,
          });
          
          // Set spiderfy state with clusterId for cluster shrinking
          setSpiderfyState({
            center: position,
            points: leaves,
            clusterId,
          });
          return;
        }
      }
      
      // For larger clusters, zoom to expansion level
      const expansionZoom = await getClusterExpansionZoom(clusterId);
      mapRef.current.flyTo(position, Math.min(expansionZoom, 18), {
        duration: 0.5,
      });
    } catch (e) {
      console.error('[MapView] Error expanding cluster:', e);
      // Fallback: zoom in by 2 levels
      mapRef.current.flyTo(position, Math.min(currentZoom + 2, 18), {
        duration: 0.5,
      });
    }
  }, [getClusterExpansionZoom, getLeaves, currentZoom]);

  // Handle spiderfy close
  const handleSpiderfyClose = useCallback(() => {
    setSpiderfyState(null);
  }, []);

  // Handle marker click - show popup (works for both regular points and spider points)
  const handleMarkerClick = useCallback((properties: PointProperties, position: [number, number], isFromSpider: boolean = false) => {
    const equip = equipmentMap.get(properties.equipmentIndex);
    if (equip) {
      // Only close spiderfy when opening popup for a non-spider marker
      if (!isFromSpider) {
        setSpiderfyState(null);
      }
      setSelectedMarker({ position, equipment: equip });
    }
  }, [equipmentMap]);

  // Handle popup close
  const handlePopupClose = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  // Handle view details from popup
  const handleViewDetails = useCallback((item: MergedEquipment) => {
    setSelectedMarker(null);
    onSelectEquipment(item);
  }, [onSelectEquipment]);

  // Store map reference
  const MapRefSetter = () => {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  };

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
          {workerLoading ? (
            <>
              <Loader2 className="w-4 h-4 text-eletro-orange animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Processando...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-eletro-orange" />
              <span className="font-bold text-eletro-orange">{totalFiltered.toLocaleString('pt-BR')}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">pontos</span>
            </>
          )}
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
        {/* Store map reference */}
        <MapRefSetter />
        
        {/* State controller - handles view persistence and navigation */}
        <MapStateController
          initialCenter={initialViewState?.center}
          initialZoom={initialViewState?.zoom}
          onViewChange={handleViewChange}
        />
        
        {/* Tile layer with dark/light mode switching */}
        <TileLayerSwitcher isDark={isDark} onLoadingChange={setIsTilesLoading} />

        {/* Cluster/Point Layer - rendered from worker data */}
        <ClusterLayer
          clusters={clusters}
          equipmentMap={equipmentMap}
          onClusterClick={handleClusterClick}
          onMarkerClick={handleMarkerClick}
          spiderfiedClusterId={spiderfyState?.clusterId ?? null}
          spiderfiedPointIds={spiderfiedPointIds}
          spiderfyBounds={spiderfyBounds}
        />

        {/* Spiderfy Layer - shows actual equipment locations from small clusters */}
        <SpiderfyLayer
          spiderfy={spiderfyState}
          equipmentMap={equipmentMap}
          onPointClick={handleMarkerClick}
          onClose={handleSpiderfyClose}
        />

        {/* Shared Popup - lazy loaded on marker click */}
        <SharedPopup
          position={selectedMarker?.position ?? null}
          equipment={selectedMarker?.equipment ?? null}
          onClose={handlePopupClose}
          onViewDetails={handleViewDetails}
        />
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
