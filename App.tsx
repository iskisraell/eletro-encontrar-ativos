import React, { useState, useEffect, useMemo } from 'react';
import { fetchEquipment, fetchPanelsLayer, fetchMainLayer } from './services/api';
import { layerCache } from './services/layerCache';
import { stackLayers, createPanelsMap, batchAttachPanelData } from './services/layerStacker';
import { Equipment, MergedEquipment, PanelLayerRecord } from './types';
import { isAbrigo } from './schemas/equipment';
import EquipmentCard from './components/EquipmentCard';
import DetailPanel from './components/DetailPanel';
import FilterBar from './components/FilterBar';
import TabNavigation from './components/TabNavigation';
import PanelsSyncIndicator from './components/PanelsSyncIndicator';
import { Dashboard } from './components/dashboard';
import { SearchIcon, AlertIcon, SpinnerIcon } from './components/Icons';
import AnimatedPlaceholder from './components/AnimatedPlaceholder';
import { useDarkMode } from './hooks/useDarkMode';
import desktopLogo from './assets/Eletromidia Horizontal (3).png';
import mobileLogo from './assets/LOGOELETRO.png';

import { useToast } from './contexts/ToastContext';

function App() {
  const { showFilterToast } = useToast();
  const [query, setQuery] = useState('');
  const [data, setData] = useState<MergedEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MergedEquipment | null>(null);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  // Layer-based caching state
  const [fullDataCache, setFullDataCache] = useState<MergedEquipment[]>([]);
  const [panelsCache, setPanelsCache] = useState<Map<string, PanelLayerRecord>>(new Map());
  const [isCacheReady, setIsCacheReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPanelsSyncing, setIsPanelsSyncing] = useState(false);

  // Filter Visibility State
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');

  // Dark Mode
  const { isDark } = useDarkMode();

  // Pagination State (Client-side)
  const [visibleCount, setVisibleCount] = useState(24);

  // Filter & Sort State
  const [filters, setFilters] = useState({
    workArea: [] as string[],
    neighborhood: [] as string[],
    shelterModel: [] as string[],
    riskArea: [] as string[],
    hasPhoto: false,
    panelType: [] as string[], // 'digital', 'static', 'none'
  });

  const [sort, setSort] = useState({
    field: '',
    direction: 'asc' as 'asc' | 'desc',
  });

  // Hidden feature filters - only accessible via FeaturesChart clicks
  // Maps feature display names to their selected state
  const [featureFilters, setFeatureFilters] = useState<string[]>([]);

  /**
   * Sync main layer data from API to IndexedDB cache.
   * Fetches in chunks and updates UI progressively.
   */
  const syncMainLayer = async (currentCount: number, totalItems: number): Promise<Equipment[]> => {
    let currentOffset = currentCount;
    const chunkSize = 5000;
    let allData: Equipment[] = [];

    try {
      // Get existing cached data
      const existingData = await layerCache.getAllMain();
      const dataMap = new Map<string, Equipment>();
      existingData.forEach(item => {
        if (item["Nº Eletro"]) dataMap.set(item["Nº Eletro"], item);
      });

      while (currentOffset < totalItems) {
        const { data: chunk } = await fetchMainLayer({ start: currentOffset, limit: chunkSize });
        if (chunk.length === 0) break;

        // Save to cache
        await layerCache.saveMainChunk(chunk);

        // Update map
        chunk.forEach(item => {
          if (item["Nº Eletro"]) dataMap.set(item["Nº Eletro"], item);
        });

        currentOffset += chunkSize;
      }

      allData = Array.from(dataMap.values());

      // Update timestamp
      await layerCache.setLayerTimestamp('main', Date.now());

      return allData;
    } catch (e) {
      console.error("Main layer sync failed", e);
      throw e;
    }
  };

  /**
   * Sync panels layer data from API to IndexedDB cache.
   * Fetches panel-specific data including brand information.
   */
  const syncPanelsLayer = async (): Promise<PanelLayerRecord[]> => {
    setIsPanelsSyncing(true);
    let currentOffset = 0;
    const chunkSize = 5000;
    const panelsMap = new Map<string, PanelLayerRecord>();

    try {
      // First, get total count
      const { total: totalPanels } = await fetchPanelsLayer({ start: 0, limit: 1 });

      while (currentOffset < totalPanels) {
        const { data: chunk } = await fetchPanelsLayer({ start: currentOffset, limit: chunkSize });
        if (chunk.length === 0) break;

        // Save to cache
        await layerCache.savePanelsChunk(chunk);

        // Update map
        chunk.forEach(panel => {
          if (panel["Nº Eletro"]) panelsMap.set(panel["Nº Eletro"], panel);
        });

        currentOffset += chunkSize;
      }

      // Update timestamp
      await layerCache.setLayerTimestamp('panels', Date.now());

      setIsPanelsSyncing(false);
      return Array.from(panelsMap.values());
    } catch (e) {
      console.error("Panels layer sync failed", e);
      setIsPanelsSyncing(false);
      throw e;
    }
  };

  /**
   * Merge main data with panels data and update state.
   */
  const mergeAndUpdateData = (mainData: Equipment[], panelsData: PanelLayerRecord[]) => {
    const merged = stackLayers(mainData, panelsData);
    const newPanelsMap = createPanelsMap(panelsData);
    
    setData(merged);
    setFullDataCache(merged);
    setPanelsCache(newPanelsMap);
  };

  // Initial load logic (Layer-based IndexedDB + Background Sync)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Initialize layer cache
        await layerCache.init();

        // Load cached data from both layers
        const [cachedMain, cachedPanels] = await Promise.all([
          layerCache.getAllMain(),
          layerCache.getAllPanels()
        ]);

        // If we have cached main data, show it immediately
        if (cachedMain.length > 0) {
          mergeAndUpdateData(cachedMain, cachedPanels);
          setLoading(false);
        }

        // Check if layers need syncing
        const [mainStale, panelsStale] = await Promise.all([
          layerCache.isLayerStale('main'),
          layerCache.isLayerStale('panels')
        ]);

        // Get API total for comparison
        const { total: apiTotal } = await fetchEquipment({ start: 0, limit: 1 });

        // Determine if we need to sync
        const needsMainSync = mainStale || cachedMain.length < apiTotal;
        const needsPanelsSync = panelsStale || cachedPanels.length === 0;

        if (needsMainSync || needsPanelsSync) {
          setIsSyncing(true);

          // Sync layers in parallel
          const syncPromises: Promise<any>[] = [];

          if (needsMainSync) {
            syncPromises.push(syncMainLayer(cachedMain.length, apiTotal));
          }

          if (needsPanelsSync) {
            syncPromises.push(syncPanelsLayer());
          }

          const results = await Promise.all(syncPromises);

          // Get final data
          const finalMain = needsMainSync ? results[0] : cachedMain;
          const finalPanels = needsPanelsSync 
            ? (needsMainSync ? results[1] : results[0]) 
            : cachedPanels;

          mergeAndUpdateData(finalMain, finalPanels);
          setIsSyncing(false);
        }

        setIsCacheReady(true);

      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar os dados iniciais. Tente buscar algo.');
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    };
    loadInitialData();
  }, []);

  // Debounced search logic
  useEffect(() => {
    // Clear error immediately when query changes
    setError(null);

    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);

        if (isCacheReady) {
          // Local Search
          const lowerQuery = query.toLowerCase();
          const results = fullDataCache.filter(item =>
            (item["Nº Eletro"] && String(item["Nº Eletro"]).toLowerCase().includes(lowerQuery)) ||
            (item["Nº Parada"] && String(item["Nº Parada"]).toLowerCase().includes(lowerQuery)) ||
            (item["Endereço"] && String(item["Endereço"]).toLowerCase().includes(lowerQuery)) ||
            (item["Modelo de Abrigo"] && String(item["Modelo de Abrigo"]).toLowerCase().includes(lowerQuery)) ||
            (item["Bairro"] && String(item["Bairro"]).toLowerCase().includes(lowerQuery))
          );
          setData(results);
          setLoading(false);
          if (results.length === 0) {
            setError(`Nenhum resultado encontrado para "${query}"`);
          }
        } else {
          // API Fallback - fetch and merge with panels
          try {
            const { data: mainResults } = await fetchEquipment({ q: query });
            // Try to get panels for these results from cache
            const panelsData = await layerCache.getAllPanels();
            const merged = stackLayers(mainResults, panelsData);
            setData(merged);
            if (merged.length === 0) {
              setError(`Nenhum resultado encontrado para "${query}"`);
            }
          } catch (err) {
            setError('Erro ao realizar a busca. Verifique sua conexão.');
          } finally {
            setLoading(false);
          }
        }
      } else if (query.trim() === '') {
        // Reset to full view
        setData(fullDataCache);
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, isCacheReady, fullDataCache]);



  const handleLogoClick = () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      // Desktop: Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Mobile: Toggle filter
      setIsFilterOpen(!isFilterOpen);
    }
  };

  const handleCardClick = (item: Equipment | MergedEquipment) => {
    setSelectedItem(item as MergedEquipment);
  };

  const closeDetail = () => {
    setSelectedItem(null);
  };

  // Extract unique options for filters
  const filterOptions = useMemo(() => {
    // Helper to filter data excluding specific keys (to determine options for that key)
    const getFilteredData = (excludeKey: string) => {
      return data.filter(item => {
        if (excludeKey !== 'workArea' && filters.workArea.length > 0) {
          if (!item["Área de Trabalho"] || !filters.workArea.includes(item["Área de Trabalho"])) return false;
        }
        if (excludeKey !== 'neighborhood' && filters.neighborhood.length > 0) {
          if (!item["Bairro"] || !filters.neighborhood.includes(item["Bairro"])) return false;
        }
        if (excludeKey !== 'shelterModel' && filters.shelterModel.length > 0) {
          if (!item["Modelo de Abrigo"] || !filters.shelterModel.includes(item["Modelo de Abrigo"])) return false;
        }
        if (excludeKey !== 'riskArea' && filters.riskArea.length > 0) {
          if (!item["Área de Risco"] || !filters.riskArea.includes(item["Área de Risco"])) return false;
        }
        if (excludeKey !== 'hasPhoto' && filters.hasPhoto) {
          if (!item["Foto Referência"] || item["Foto Referência"].length === 0) return false;
        }
        if (excludeKey !== 'panelType' && filters.panelType.length > 0) {
          // Only Abrigos can have panels - exclude TOTEMs from panel filter matching
          if (!isAbrigo(item)) return false;
          
          const hasDigital = item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
          const hasStatic = item['Painel Estático - Tipo'] !== undefined && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
          const matchesAny = filters.panelType.some(type => {
            if (type === 'digital') return hasDigital;
            if (type === 'static') return hasStatic;
            if (type === 'none') return !hasDigital && !hasStatic;
            return false;
          });
          if (!matchesAny) return false;
        }
        return true;
      });
    };

    const countOccurrences = (items: Equipment[], key: keyof Equipment) => {
      const counts = new Map<string, number>();
      items.forEach(item => {
        const value = item[key];
        if (typeof value === 'string' && value) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      });
      return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
    };

    const workAreas = countOccurrences(getFilteredData('workArea'), "Área de Trabalho");
    const neighborhoods = countOccurrences(getFilteredData('neighborhood'), "Bairro");
    const shelterModels = countOccurrences(getFilteredData('shelterModel'), "Modelo de Abrigo");
    const riskAreas = countOccurrences(getFilteredData('riskArea'), "Área de Risco");

    // Calculate panel type counts based on other active filters
    const countPanelTypes = () => {
      const filteredData = getFilteredData('panelType').filter(isAbrigo);

      const hasDigital = (item: Equipment) =>
        item['Painel Digital'] !== undefined &&
        item['Painel Digital'] !== '' &&
        item['Painel Digital'] !== '-';

      const hasStatic = (item: Equipment) =>
        item['Painel Estático - Tipo'] !== undefined &&
        item['Painel Estático - Tipo'] !== '' &&
        item['Painel Estático - Tipo'] !== '-';

      return [
        { value: 'Painel Digital', count: filteredData.filter(hasDigital).length, key: 'digital' },
        { value: 'Painel Estático', count: filteredData.filter(hasStatic).length, key: 'static' },
        { value: 'Sem Painéis', count: filteredData.filter(i => !hasDigital(i) && !hasStatic(i)).length, key: 'none' },
      ];
    };

    return {
      workAreas,
      neighborhoods,
      shelterModels,
      riskAreas,
      panelTypes: countPanelTypes(),
    };
  }, [data, filters]);

  // Filter and Sort Logic
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // 1. Filter
    if (filters.workArea.length > 0) {
      result = result.filter(item => item["Área de Trabalho"] && filters.workArea.includes(item["Área de Trabalho"]));
    }
    if (filters.neighborhood.length > 0) {
      result = result.filter(item => item["Bairro"] && filters.neighborhood.includes(item["Bairro"]));
    }
    if (filters.shelterModel.length > 0) {
      result = result.filter(item => item["Modelo de Abrigo"] && filters.shelterModel.includes(item["Modelo de Abrigo"]));
    }
    if (filters.riskArea.length > 0) {
      result = result.filter(item => item["Área de Risco"] && filters.riskArea.includes(item["Área de Risco"]));
    }
    if (filters.hasPhoto) {
      result = result.filter(item => item["Foto Referência"] && item["Foto Referência"].length > 0);
    }

    // Panel Type Filter
    // Only applies to Abrigos (shelters) - TOTEMs cannot have panels
    // Uses OR logic: equipment matches if it has ANY of the selected panel types
    // Prefers _panelData from merged layers, falls back to legacy fields
    if (filters.panelType.length > 0) {
      result = result.filter(item => {
        // Only Abrigos can have panels - exclude TOTEMs from panel filters
        if (!isAbrigo(item)) return false;
        
        // Check for merged panel data first
        const hasMergedData = '_hasPanelData' in item && item._hasPanelData === true && '_panelData' in item;
        
        return filters.panelType.some(type => {
          switch (type) {
            case 'digital':
              // Check merged data first, then legacy
              if (hasMergedData && item._panelData) {
                return item._panelData.hasDigital;
              }
              return item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
            case 'static':
              // Check merged data first, then legacy
              if (hasMergedData && item._panelData) {
                return item._panelData.hasStatic;
              }
              return item['Painel Estático - Tipo'] !== undefined && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
            case 'none':
              // Abrigos without panels
              if (hasMergedData && item._panelData) {
                return !item._panelData.hasDigital && !item._panelData.hasStatic;
              }
              const hasDigital = item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
              const hasStatic = item['Painel Estático - Tipo'] !== undefined && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
              return !hasDigital && !hasStatic;
            default:
              return false;
          }
        });
      });
    }

    // Apply hidden feature filters (from FeaturesChart only)
    // Uses OR logic: equipment matches if it has ANY of the selected features
    // Prefers _panelData for panel checks
    if (featureFilters.length > 0) {
      result = result.filter(item => {
        // Check for merged panel data
        const hasMergedData = '_hasPanelData' in item && item._hasPanelData === true && '_panelData' in item;
        
        return featureFilters.some(feature => {
          switch (feature) {
            case 'Wi-Fi':
              return item['Wi-Fi'] === 'Sim';
            case 'Câmera':
              return item['Câmera'] === 'Sim';
            case 'Painel Digital':
              if (!isAbrigo(item)) return false;
              if (hasMergedData && item._panelData) {
                return item._panelData.hasDigital;
              }
              return item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
            case 'Painel Estático':
              if (!isAbrigo(item)) return false;
              if (hasMergedData && item._panelData) {
                return item._panelData.hasStatic;
              }
              return item['Painel Estático - Tipo'] !== undefined && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
            case 'Luminária':
              return item['Luminária'] === 'Sim';
            case 'Energizado':
              return item['Energizado'] === 'Sim';
            default:
              return false;
          }
        });
      });
    }

    // 2. Sort
    if (sort.field) {
      result.sort((a, b) => {
        const aValue = a[sort.field];
        const bValue = b[sort.field];
        
        // Convert to strings for comparison
        const aStr = aValue != null ? String(aValue) : '';
        const bStr = bValue != null ? String(bValue) : '';

        if (sort.direction === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return result;
  }, [data, filters, sort, featureFilters]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 24);
  };

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !error && visibleCount < filteredAndSortedData.length) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loading, error, visibleCount, filteredAndSortedData.length]);

  // Reset pagination when filters or sort change
  useEffect(() => {
    setVisibleCount(24);
  }, [filters, sort, query]);

  // Slice data for display
  const visibleData = filteredAndSortedData.slice(0, visibleCount);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (field: string) => {
    setSort(prev => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { field, direction: 'asc' };
    });
  };

  const clearFilters = () => {
    setFilters({
      workArea: [],
      neighborhood: [],
      shelterModel: [],
      riskArea: [],
      hasPhoto: false,
      panelType: [],
    });
    setSort({ field: '', direction: 'asc' });
    setFeatureFilters([]);
  };

  const handlePanelFilterChange = (displayValue: string) => {
    // Map display name to filter key
    const filterKey = displayValue === 'Painel Digital' ? 'digital'
      : displayValue === 'Painel Estático' ? 'static'
        : 'none';

    // Show toast based on current state (before update)
    const isSelected = filters.panelType.includes(filterKey);
    showFilterToast(isSelected ? 'remove' : 'add', 'Painéis', displayValue);

    setFilters(prev => {
      // Re-calculate based on prev to ensure state consistency
      const isSelectedInPrev = prev.panelType.includes(filterKey);
      const newValues = isSelectedInPrev
        ? prev.panelType.filter(v => v !== filterKey)
        : [...prev.panelType, filterKey];

      return { ...prev, panelType: newValues };
    });
  };

  /**
   * Handle chart element clicks - implements toggle behavior
   * If value is already in the filter array → remove it
   * If value is not in the filter array → add it
   */
  const handleChartFilterChange = (filterKey: string, value: string) => {
    // Show toast based on current state (before update)
    const currentValues = filters[filterKey as keyof typeof filters];
    if (Array.isArray(currentValues)) {
      const isSelected = currentValues.includes(value);
      showFilterToast(isSelected ? 'remove' : 'add', filterKey, value);
    }

    setFilters(prev => {
      const currentValues = prev[filterKey as keyof typeof prev];

      if (Array.isArray(currentValues)) {
        const isSelected = currentValues.includes(value);
        const newValues = isSelected
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];

        return { ...prev, [filterKey]: newValues };
      }

      return prev;
    });
  };


  /**
   * Handle feature chart clicks - toggle feature filters
   * These filters are hidden (not in FilterBar) and only accessible via FeaturesChart
   */
  const handleFeatureFilterChange = (featureName: string) => {
    setFeatureFilters(prev => {
      const isSelected = prev.includes(featureName);
      return isSelected
        ? prev.filter(f => f !== featureName)
        : [...prev, featureName];
    });
  };

  // Determine if we should show Load More button:
  const showLoadMore = !loading && !error && visibleCount < filteredAndSortedData.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans pb-20 transition-colors duration-300">

      {/* Sticky Header & Search */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-row items-center justify-between py-4 gap-4">

            {/* Logo Area */}
            <div className="flex items-center self-start md:self-auto cursor-pointer" onClick={handleLogoClick}>
              {/* Desktop Logo */}
              <img
                src={desktopLogo}
                alt="Eletromidia Logo"
                className="hidden md:block h-10 w-auto object-contain"
              />
              {/* Mobile Logo */}
              <img
                src={mobileLogo}
                alt="Eletromidia Logo"
                className="block md:hidden h-10 w-auto object-contain"
              />
            </div>

            {/* Search Bar */}
            <div className="flex-1 md:w-1/2 relative flex items-center gap-4">
              <div className="relative group flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder=""
                  className="w-full bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-eletro-orange rounded-full py-3 pl-12 pr-4 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-300 shadow-inner"
                />
                {/* Animated Placeholder Overlay */}
                {!query && (
                  <AnimatedPlaceholder className="absolute left-12 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-eletro-orange transition-colors w-5 h-5" />

                {loading && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <SpinnerIcon className="text-eletro-orange w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Total Count Badge */}
              <div className="hidden md:flex flex-col items-end min-w-max">
                <div className="flex items-center gap-2">
                  {(loading || isSyncing) && (
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-eletro-orange rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-eletro-orange rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-eletro-orange rounded-full animate-bounce"></div>
                    </div>
                  )}
                  <span className="text-2xl font-bold text-eletro-orange leading-none">
                    {filteredAndSortedData.length}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Equipamentos</span>
              </div>
            </div>

          </div>

          {/* Tab Navigation */}
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="pb-4"
          />
        </div>
      </div>

      {/* Filter Bar - Always visible for filtering both views */}
      <FilterBar
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        sort={sort}
        options={filterOptions}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onClearFilters={clearFilters}
        featureFilters={featureFilters}
        onFeatureFilterChange={handleFeatureFilterChange}
        activeTab={activeTab}
      />


      {/* Main Content - Both tabs stay mounted to preserve state */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab Content */}
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard
            equipment={filteredAndSortedData}
            isLoading={loading && data.length === 0}
            filters={filters}
            onChartFilterChange={handleChartFilterChange}
            onPanelFilterChange={handlePanelFilterChange}
            featureFilters={featureFilters}
            onFeatureFilterChange={handleFeatureFilterChange}
          />
        </div>

        {/* Equipment List Tab Content */}
        <div className={activeTab === 'list' ? 'block' : 'hidden'}>
          {/* Status/Error Messages */}
          {error && (
            <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm px-5 py-3 rounded-2xl mb-6 flex items-center gap-3 animate-fade-in shadow-sm border border-red-100 dark:border-red-800/30">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-800/40 rounded-full flex items-center justify-center">
                <AlertIcon className="text-red-500 dark:text-red-400 w-4 h-4" />
              </div>
              <p className="text-red-600 dark:text-red-300 text-sm font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && filteredAndSortedData.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="text-gray-400 w-8 h-8" />
              </div>
              <h3 className="text-gray-600 dark:text-gray-300 font-medium text-lg">Nenhum equipamento encontrado</h3>
              <p className="text-gray-400 dark:text-gray-500">Tente ajustar seus filtros ou buscar por outro termo.</p>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleData.map((item, index) => {
              // Create a unique key fallback
              const key = item["Nº Eletro"] || index.toString();
              return (
                <EquipmentCard
                  key={key}
                  item={item}
                  onClick={handleCardClick}
                />
              );
            })}
          </div>

          {/* Loading Skeleton for Initial Load */}
          {loading && data.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 h-80 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="h-48 shimmer"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 shimmer rounded w-3/4"></div>
                    <div className="h-4 shimmer rounded w-1/2"></div>
                    <div className="h-8 shimmer rounded w-full mt-4"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button & Sentinel */}
          {showLoadMore && (
            <div className="mt-12 flex flex-col items-center justify-center">
              <button
                onClick={handleLoadMore}
                className="group relative flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-md hover:border-eletro-orange hover:text-eletro-orange transition-all duration-300 shadow-sm hover:shadow-md mb-4"
              >

                Carregar Mais
                <span className="ml-2 text-xs font-normal text-gray-400 group-hover:text-eletro-orange/70">
                  ({visibleCount} de {filteredAndSortedData.length} exibidos)
                </span>
              </button>
              {/* Sentinel for Infinite Scroll */}
              <div ref={observerTarget} className="h-4 w-full"></div>
            </div>
          )}
        </div>
      </main>

      {/* Detail Panel (Modal/Slide-over) */}
      <DetailPanel
        item={selectedItem}
        onClose={closeDetail}
      />

      {/* Panels Sync Indicator - Creative loading animation */}
      <PanelsSyncIndicator isVisible={isPanelsSyncing} />

    </div>
  );
}

export default App;