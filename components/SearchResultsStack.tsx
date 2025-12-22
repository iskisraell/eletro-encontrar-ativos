import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Hash, BusFront, Eye, Navigation, X, Smartphone, ChevronDown, Search, MapPinned, Loader2 } from 'lucide-react';
import { MergedEquipment } from '../types';
import { SearchResult, getEquipmentDisplayInfo, hasValidCoordinates, getCoordinates, highlightMatch } from '../hooks/useSearchResults';
import { useMapNavigation } from '../contexts/MapNavigationContext';
import { TabType } from './TabNavigation';
import { cn } from '../lib/utils';

// ============================================
// Animation Variants - Poppy and Snappy
// ============================================
const containerVariants = {
  hidden: { 
    opacity: 0,
    y: -12,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 28,
      staggerChildren: 0.035,
      delayChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    x: -16,
    scale: 0.95,
  },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 30,
      delay: index * 0.03,
    }
  }),
  exit: {
    opacity: 0,
    x: -8,
    scale: 0.97,
    transition: { 
      duration: 0.1,
    }
  }
};

const locationButtonVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
      delay: 0.02
    }
  },
  exit: { opacity: 0, y: -5, transition: { duration: 0.1 } }
};

const expandButtonVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    }
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } }
};

// ============================================
// Highlighted Text Component
// ============================================
const HighlightedText: React.FC<{ text: string; query: string; className?: string }> = ({ 
  text, 
  query, 
  className 
}) => {
  const highlight = highlightMatch(text, query);
  
  if (!highlight) {
    return <span className={className}>{text}</span>;
  }
  
  return (
    <span className={className}>
      {highlight.before}
      <mark className="bg-eletro-orange/20 text-eletro-orange font-semibold rounded px-0.5 ring-1 ring-eletro-orange/30">
        {highlight.match}
      </mark>
      {highlight.after}
    </span>
  );
};

// ============================================
// SearchResultItem - Individual result row
// ============================================
interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  activeTab: TabType;
  query: string;
  onSelectEquipment: (item: MergedEquipment) => void;
  onFlyToEquipment: (item: MergedEquipment) => void;
  onClose: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  index,
  activeTab,
  query,
  onSelectEquipment,
  onFlyToEquipment,
  onClose,
}) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [isClosingLightbox, setIsClosingLightbox] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const info = getEquipmentDisplayInfo(result.item);
  const hasCoords = hasValidCoordinates(result.item);
  
  // Determine if we should show Nº Parada pill
  const showNParada = 
    (result.matchType === 'nParada' || result.matchType === 'address') && 
    info.nParada;
  
  // Handle photo click
  const handlePhotoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (info.hasPhoto && !imageError) {
      setShowLightbox(true);
      setIsClosingLightbox(false);
    }
  }, [info.hasPhoto, imageError]);
  
  const handleCloseLightbox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosingLightbox(true);
    setTimeout(() => {
      setShowLightbox(false);
      setIsClosingLightbox(false);
    }, 200);
  }, []);
  
  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectEquipment(result.item);
    onClose();
  }, [result.item, onSelectEquipment, onClose]);
  
  const handleFlyTo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasCoords) {
      onFlyToEquipment(result.item);
      onClose();
    }
  }, [result.item, hasCoords, onFlyToEquipment, onClose]);
  
  const handleRowClick = useCallback(() => {
    if (activeTab === 'map' && hasCoords) {
      onFlyToEquipment(result.item);
      onClose();
    } else {
      onSelectEquipment(result.item);
      onClose();
    }
  }, [activeTab, hasCoords, result.item, onFlyToEquipment, onSelectEquipment, onClose]);
  
  // Determine which field to highlight based on match type
  const shouldHighlightModel = result.matchType === 'model';
  const shouldHighlightAddress = result.matchType === 'address' || result.matchType === 'bairro' || result.matchType === 'area';
  
  return (
    <>
      <motion.div
        variants={itemVariants}
        custom={index}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl cursor-pointer",
          "bg-white dark:bg-gray-800",
          "hover:bg-gradient-to-r hover:from-orange-50 hover:to-white dark:hover:from-gray-700/80 dark:hover:to-gray-800",
          "border border-gray-100 dark:border-gray-700/50",
          "hover:border-eletro-orange/40 dark:hover:border-eletro-orange/30",
          "hover:shadow-md hover:shadow-orange-100/50 dark:hover:shadow-orange-900/20",
          "transition-all duration-200"
        )}
        onClick={handleRowClick}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.01, x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Photo Thumbnail - Larger */}
        <div 
          className={cn(
            "w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative",
            "bg-gray-100 dark:bg-gray-700",
            "ring-2 transition-all duration-200",
            isHovered ? "ring-eletro-orange/50" : "ring-gray-200 dark:ring-gray-600",
            info.hasPhoto && !imageError ? "cursor-pointer" : ""
          )}
          onClick={info.hasPhoto && !imageError ? handlePhotoClick : undefined}
        >
          {info.hasPhoto && !imageError ? (
            <img
              src={info.photoUrl || ''}
              alt={info.model}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
              <BusFront className="w-6 h-6 text-gray-400" />
            </div>
          )}
          
          {/* Status Badge Overlay */}
          {info.status && info.status !== '-' && (
            <div className={cn(
              "absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800",
              info.isActive ? "bg-emerald-500" : "bg-red-400"
            )} title={info.status} />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          {/* Primary: Model Name with optional highlight */}
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
            {shouldHighlightModel ? (
              <HighlightedText text={info.model} query={query} className="line-clamp-1" />
            ) : (
              <span className="line-clamp-1">{info.model}</span>
            )}
          </h4>
          
          {/* Secondary: Address with icon and optional highlight */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <MapPin className="w-3 h-3 flex-shrink-0 text-eletro-orange" />
            {shouldHighlightAddress ? (
              <HighlightedText text={info.address} query={query} className="line-clamp-1" />
            ) : (
              <span className="line-clamp-1">{info.address}</span>
            )}
          </div>
          
          {/* Bairro if matched */}
          {result.matchType === 'bairro' && info.bairro && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              <MapPinned className="w-2.5 h-2.5 flex-shrink-0" />
              <HighlightedText text={info.bairro} query={query} />
            </div>
          )}
        </div>
        
        {/* Pills Container - Flex wrap */}
        <div className="flex flex-wrap items-center gap-1 flex-shrink-0 max-w-[140px] justify-end">
          {/* Nº Eletro Pill - Always visible, highlighted if matched */}
          <span className={cn(
            "px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-0.5 whitespace-nowrap",
            result.matchType === 'nEletro' 
              ? "bg-eletro-orange text-white ring-2 ring-eletro-orange/30" 
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          )}>
            <Hash className="w-2.5 h-2.5" />
            {info.nEletro}
          </span>
          
          {/* Nº Parada Pill - Conditional */}
          {showNParada && (
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-bold rounded-md whitespace-nowrap",
              result.matchType === 'nParada'
                ? "bg-sky-500 text-white ring-2 ring-sky-300/30"
                : "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
            )}>
              {info.nParada}
            </span>
          )}
          
          {/* Panel Icon */}
          {info.hasPanel && (
            <span className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md" title={`${info.panelCount} painel(is)`}>
              <Smartphone className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            </span>
          )}
        </div>
        
        {/* Action Buttons - Map Tab only, controlled by isHovered state */}
        {activeTab === 'map' && (
          <div className={cn(
            "flex items-center gap-1 ml-1 transition-opacity duration-150",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <motion.button
              onClick={handleViewDetails}
              className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white transition-colors"
              title="Ver Detalhes"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Eye className="w-4 h-4" />
            </motion.button>
            {hasCoords && (
              <motion.button
                onClick={handleFlyTo}
                className="p-2 rounded-lg bg-eletro-orange/10 text-eletro-orange hover:bg-eletro-orange hover:text-white transition-colors"
                title="Ir ao Local"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Navigation className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        )}
      </motion.div>
      
      {/* Lightbox Portal */}
      {showLightbox && info.hasPhoto && ReactDOM.createPortal(
        <motion.div 
          className="fixed inset-0 z-[1200] bg-black/95 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseLightbox}
        >
          <motion.button 
            className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
            onClick={handleCloseLightbox}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-6 h-6" />
          </motion.button>
          <motion.img 
            src={info.photoUrl || ''}
            alt={info.model}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>,
        document.body
      )}
    </>
  );
};

// ============================================
// SearchResultsStack - Main Container
// ============================================
interface SearchResultsStackProps {
  results: SearchResult[];
  activeTab: TabType;
  onSelectEquipment: (item: MergedEquipment) => void;
  onClose: () => void;
  isVisible: boolean;
  isLoading?: boolean;
  totalMatches?: number;
  query: string;
}

const SearchResultsStack: React.FC<SearchResultsStackProps> = ({
  results,
  activeTab,
  onSelectEquipment,
  onClose,
  isVisible,
  isLoading = false,
  totalMatches = 0,
  query,
}) => {
  const mapNav = useMapNavigation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Display results - show 7 by default, 15 when expanded
  const displayResults = useMemo(() => {
    return isExpanded ? results.slice(0, 15) : results.slice(0, 7);
  }, [results, isExpanded]);
  
  // Calculate how many more results are available to show
  const additionalResultsAvailable = Math.max(0, Math.min(results.length, 15) - 7);
  const hasMoreResults = additionalResultsAvailable > 0;
  const showingCount = displayResults.length;
  
  // Check if this is a location-based search
  const isLocationSearch = useMemo(() => {
    if (results.length === 0) return false;
    const locationMatches = results.filter(
      r => r.matchType === 'bairro' || r.matchType === 'area'
    );
    return locationMatches.length > results.length / 2;
  }, [results]);
  
  // Get matched location name for button
  const locationName = useMemo(() => {
    if (!isLocationSearch) return null;
    const locationResult = results.find(r => r.matchType === 'bairro' || r.matchType === 'area');
    if (locationResult) {
      return locationResult.matchType === 'bairro' 
        ? locationResult.item["Bairro"]
        : locationResult.item["Área de Trabalho"];
    }
    return null;
  }, [results, isLocationSearch]);
  
  // Calculate center for location search
  const locationCenter = useMemo(() => {
    if (!isLocationSearch || activeTab !== 'map') return null;
    
    const coordsList = results
      .map(r => getCoordinates(r.item))
      .filter((c): c is { lat: number; lng: number } => c !== null);
    
    if (coordsList.length === 0) return null;
    
    const avgLat = coordsList.reduce((sum, c) => sum + c.lat, 0) / coordsList.length;
    const avgLng = coordsList.reduce((sum, c) => sum + c.lng, 0) / coordsList.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [results, isLocationSearch, activeTab]);
  
  const handleFlyToLocationCenter = useCallback(() => {
    if (locationCenter && activeTab === 'map') {
      mapNav.flyTo(
        { lat: locationCenter.lat, lng: locationCenter.lng, zoom: 15 },
        () => onClose()
      );
    }
  }, [locationCenter, activeTab, mapNav, onClose]);
  
  const handleFlyToEquipment = useCallback((item: MergedEquipment) => {
    const coords = getCoordinates(item);
    if (coords && activeTab === 'map') {
      mapNav.flyTo(
        { lat: coords.lat, lng: coords.lng, zoom: 18 },
        () => {
          setTimeout(() => onSelectEquipment(item), 300);
        }
      );
    }
  }, [mapNav, activeTab, onSelectEquipment]);
  
  // Keyboard and click outside handlers
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput && searchInput.contains(e.target as Node)) return;
        onClose();
      }
    };
    
    if (isVisible) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isVisible, onClose]);
  
  // Reset expanded state when closing
  useEffect(() => {
    if (!isVisible) {
      setIsExpanded(false);
    }
  }, [isVisible]);
  
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          ref={containerRef}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-white dark:bg-gray-900",
            "rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30",
            "border border-gray-200 dark:border-gray-700",
            "overflow-hidden overflow-x-hidden"
          )}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            {/* Location Search - Prominent Button */}
            <AnimatePresence>
              {isLocationSearch && locationCenter && activeTab === 'map' && (
                <motion.div
                  variants={locationButtonVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="p-2"
                >
                  <motion.button
                    onClick={handleFlyToLocationCenter}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-4 py-3",
                      "bg-gradient-to-r from-eletro-orange to-orange-500",
                      "text-white font-semibold text-sm",
                      "rounded-xl shadow-lg shadow-orange-500/25",
                      "hover:shadow-xl hover:shadow-orange-500/30",
                      "transition-all duration-200"
                    )}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MapPinned className="w-5 h-5" />
                    <span>Ir para {locationName || 'região'}</span>
                    <span className="text-white/70 text-xs ml-1">
                      ({totalMatches} equipamentos)
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Results Count Header */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-eletro-orange animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {isLoading ? 'Buscando...' : (
                    <>
                      <span className="text-eletro-orange font-bold">{showingCount}</span>
                      {totalMatches > showingCount && (
                        <span> de {totalMatches}</span>
                      )}
                      <span> resultado{totalMatches !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Results List */}
          <div className={cn(
            "p-2 space-y-1.5",
            "max-h-[50vh] overflow-y-auto overflow-x-hidden",
            "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
          )}>
            {displayResults.length > 0 ? (
              displayResults.map((result, index) => (
                <SearchResultItem
                  key={result.item["Nº Eletro"] || `result-${index}`}
                  result={result}
                  index={index}
                  activeTab={activeTab}
                  query={query}
                  onSelectEquipment={onSelectEquipment}
                  onFlyToEquipment={handleFlyToEquipment}
                  onClose={onClose}
                />
              ))
            ) : (
              /* Empty State */
              <motion.div 
                className="py-8 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhum resultado encontrado
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Tente buscar por ID, endereço ou bairro
                </p>
              </motion.div>
            )}
          </div>
          
          {/* Expand Button */}
          <AnimatePresence>
            {hasMoreResults && !isExpanded && displayResults.length > 0 && (
              <motion.div
                variants={expandButtonVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <motion.button
                  onClick={() => setIsExpanded(true)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3",
                    "text-sm font-medium text-gray-600 dark:text-gray-300",
                    "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                    "transition-colors"
                  )}
                  whileHover={{ backgroundColor: "rgba(255, 79, 0, 0.05)" }}
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Ver mais resultados</span>
                  <span className="text-xs text-gray-400">
                    (+{additionalResultsAvailable} mais)
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Collapse Button */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                variants={expandButtonVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <motion.button
                  onClick={() => setIsExpanded(false)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3",
                    "text-sm font-medium text-gray-500 dark:text-gray-400",
                    "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                    "transition-colors"
                  )}
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                  <span>Mostrar menos</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Map Tab Hint */}
          {activeTab === 'map' && displayResults.length > 0 && (
            <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                Clique em um resultado para voar até o local no mapa
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchResultsStack;
