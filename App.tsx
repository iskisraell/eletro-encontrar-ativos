import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { fetchEquipment } from './services/api';
import { db } from './services/db';
import { Equipment } from './types';
import EquipmentCard from './components/EquipmentCard';
import DetailPanel from './components/DetailPanel';
import FilterBar from './components/FilterBar';
import TabNavigation from './components/TabNavigation';
import DarkModeToggle from './components/DarkModeToggle';
import { Dashboard } from './components/dashboard';
import { SearchIcon, AlertIcon, SpinnerIcon } from './components/Icons';
import { spring } from './lib/animations';
import { useDarkMode } from './hooks/useDarkMode';
import desktopLogo from './assets/Eletromidia Horizontal (3).png';
import mobileLogo from './assets/LOGOELETRO.png';

function App() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Equipment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  // Search Optimization State
  const [fullDataCache, setFullDataCache] = useState<Equipment[]>([]);
  const [isCacheReady, setIsCacheReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter Visibility State
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');

  // Dark Mode
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  // Pagination State (Client-side)
  const [visibleCount, setVisibleCount] = useState(24);

  // Filter & Sort State
  const [filters, setFilters] = useState({
    workArea: [] as string[],
    neighborhood: [] as string[],
    shelterModel: [] as string[],
    riskArea: [] as string[],
    hasPhoto: false,
  });

  const [sort, setSort] = useState({
    field: '',
    direction: 'asc' as 'asc' | 'desc',
  });

  // Hidden feature filters - only accessible via FeaturesChart clicks
  // Maps feature display names to their selected state
  const [featureFilters, setFeatureFilters] = useState<string[]>([]);

  // Initial load logic (IndexedDB + Background Sync)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await db.init();
        const cachedData = await db.getAll();

        if (cachedData.length > 0) {
          setData(cachedData);
          setFullDataCache(cachedData);
          setTotal(cachedData.length);
          setLoading(false);
        }

        // Start Background Sync if needed
        const { total: apiTotal } = await fetchEquipment({ start: 0, limit: 1 });

        if (cachedData.length < apiTotal) {
          setIsSyncing(true);
          syncData(cachedData.length, apiTotal);
        } else {
          setIsCacheReady(true);
        }

      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar os dados iniciais. Tente buscar algo.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const syncData = async (startOffset: number, totalItems: number) => {
    let currentOffset = startOffset;
    const chunkSize = 1000;

    try {
      while (currentOffset < totalItems) {
        const { data: chunk } = await fetchEquipment({ start: currentOffset, limit: chunkSize });
        if (chunk.length === 0) break;

        await db.saveChunk(chunk);

        setFullDataCache(prev => {
          // Deduplicate using a Map based on "Nº Eletro"
          const uniqueMap = new Map();

          // Add existing items
          prev.forEach(item => {
            if (item["Nº Eletro"]) uniqueMap.set(item["Nº Eletro"], item);
          });

          // Add/Update with new items
          chunk.forEach(item => {
            if (item["Nº Eletro"]) uniqueMap.set(item["Nº Eletro"], item);
          });

          const newData = Array.from(uniqueMap.values());

          // Update main display data if it was empty
          if (prev.length === 0) {
            setData(newData);
            setTotal(newData.length);
          }

          return newData;
        });

        currentOffset += chunkSize;
      }

      // Final Validation
      const finalCount = await db.count();
      if (finalCount !== totalItems) {
        console.warn(`Mismatch detected: DB has ${finalCount}, API expects ${totalItems}. Triggering full reload...`);
        // Optional: Force a re-sync or just update the total visual
        setTotal(finalCount);
      } else {
        setTotal(finalCount);
      }

      setIsCacheReady(true);
      setIsSyncing(false);
    } catch (e) {
      console.error("Background sync failed", e);
      setIsSyncing(false);
    }
  };

  // Debounced search logic (Scenario A: Specific Search)
  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        setError(null);

        if (isCacheReady) {
          // Local Search
          const lowerQuery = query.toLowerCase();
          const results = fullDataCache.filter(item =>
            (item["Nº Eletro"] && String(item["Nº Eletro"]).toLowerCase().includes(lowerQuery)) ||
            (item["Nº Parada"] && String(item["Nº Parada"]).toLowerCase().includes(lowerQuery)) ||
            (item["Endereço"] && String(item["Endereço"]).toLowerCase().includes(lowerQuery)) ||
            (item["Modelo de Abrigo"] && String(item["Modelo de Abrigo"]).toLowerCase().includes(lowerQuery))
          );
          setData(results);
          setTotal(results.length);
          setLoading(false);
          if (results.length === 0) {
            setError(`Nenhum resultado encontrado para "${query}"`);
          }
        } else {
          // API Fallback
          try {
            const { data: results, total: totalCount } = await fetchEquipment({ q: query });
            setData(results);
            setTotal(totalCount);
            if (results.length === 0) {
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
        if (isCacheReady) {
          setData(fullDataCache);
          setTotal(fullDataCache.length);
        } else {
          // If not ready, maybe we have partial data in fullDataCache?
          // Or we just show what we have.
          setData(fullDataCache);
          setTotal(fullDataCache.length);
        }
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

  const handleCardClick = (item: Equipment) => {
    setSelectedItem(item);
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

    return {
      workAreas,
      neighborhoods,
      shelterModels,
      riskAreas,
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

    // Apply hidden feature filters (from FeaturesChart only)
    // Uses OR logic: equipment matches if it has ANY of the selected features
    if (featureFilters.length > 0) {
      result = result.filter(item => {
        return featureFilters.some(feature => {
          switch (feature) {
            case 'Wi-Fi':
              return item['Wi-Fi'] === 'Sim';
            case 'Câmera':
              return item['Câmera'] === 'Sim';
            case 'Painel Digital':
              // Check for any non-empty, non-dash value (API uses '1', '2', etc.)
              return item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
            case 'Painel Estático':
              // Check "Painel Estático - Tipo" field per API structure
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
        const aValue = a[sort.field] || '';
        const bValue = b[sort.field] || '';

        if (sort.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
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
    });
    setSort({ field: '', direction: 'asc' });
  };

  /**
   * Handle chart element clicks - implements toggle behavior
   * If value is already in the filter array → remove it
   * If value is not in the filter array → add it
   */
  const handleChartFilterChange = (filterKey: string, value: string) => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20 transition-colors duration-300">

      {/* Sticky Header & Search */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
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
                  placeholder="Buscar por ID, Nº Parada, Endereço ou Modelo..."
                  className="w-full bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-eletro-orange rounded-full py-3 pl-12 pr-4 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-300 shadow-inner"
                />
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

              {/* Dark Mode Toggle */}
              <DarkModeToggle isDark={isDark} onToggle={toggleDarkMode} />
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
            featureFilters={featureFilters}
            onFeatureFilterChange={handleFeatureFilterChange}
          />
        </div>

        {/* Equipment List Tab Content */}
        <div className={activeTab === 'list' ? 'block' : 'hidden'}>
          {/* Status/Error Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded mb-6 flex items-start animate-fade-in">
              <AlertIcon className="text-red-500 w-5 h-5 mr-3 mt-0.5" />
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium">Ops, algo deu errado.</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
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
                className="group relative flex items-center justify-center px-8 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-full hover:border-eletro-orange hover:text-eletro-orange transition-all duration-300 shadow-sm hover:shadow-md mb-4"
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

    </div>
  );
}

export default App;