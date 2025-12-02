import React, { useState, useEffect, useMemo } from 'react';
import { fetchEquipment } from './services/api';
import { Equipment } from './types';
import EquipmentCard from './components/EquipmentCard';
import DetailPanel from './components/DetailPanel';
import FilterBar from './components/FilterBar';
import { SearchIcon, AlertIcon, SpinnerIcon } from './components/Icons';
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

  // Filter Visibility State
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

  // Initial load logic (Scenario B: Bulk Sync - limit 1000 for better client-side filtering)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const { data: results, total: totalCount } = await fetchEquipment({ start: 0, limit: 1000 });
        setData(results);
        setTotal(totalCount);
      } catch (err) {
        setError('Não foi possível carregar os dados iniciais. Tente buscar algo.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Debounced search logic (Scenario A: Specific Search)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        setError(null);
        try {
          // Using Scenario A: Direct Search
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
      } else if (query.trim() === '') {
        // If query cleared, reload initial data to reset the view (Scenario B)
        setLoading(true);
        try {
          const { data: results, total: totalCount } = await fetchEquipment({ start: 0, limit: 1000 });
          setData(results);
          setTotal(totalCount);
          setError(null);
        } catch (e) {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const currentLength = data.length;
      const { data: newResults, total: totalCount } = await fetchEquipment({ start: currentLength, limit: 100 });

      setData(prev => [...prev, ...newResults]);
      setTotal(totalCount);
    } catch (err) {
      console.error("Erro ao carregar mais itens:", err);
    } finally {
      setLoadingMore(false);
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
    const workAreas = new Set<string>();
    const neighborhoods = new Set<string>();
    const shelterModels = new Set<string>();
    const riskAreas = new Set<string>();

    data.forEach(item => {
      if (item["Área de Trabalho"]) workAreas.add(item["Área de Trabalho"]);
      if (item["Bairro"]) neighborhoods.add(item["Bairro"]);
      if (item["Modelo de Abrigo"]) shelterModels.add(item["Modelo de Abrigo"]);
      if (item["Área de Risco"]) riskAreas.add(item["Área de Risco"]);
    });

    return {
      workAreas: Array.from(workAreas).sort(),
      neighborhoods: Array.from(neighborhoods).sort(),
      shelterModels: Array.from(shelterModels).sort(),
      riskAreas: Array.from(riskAreas).sort(),
    };
  }, [data]);

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
  }, [data, filters, sort]);

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

  // Determine if we should show Load More button:
  const showLoadMore = !loading && !error && query.trim() === '' && data.length > 0 && data.length < total;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">

      {/* Sticky Header & Search */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-row items-center justify-between py-4 gap-4">

            {/* Logo Area */}
            <div className="flex items-center self-start md:self-auto cursor-pointer" onClick={() => setIsFilterOpen(!isFilterOpen)}>
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
            <div className="flex-1 md:w-1/2 relative">
              <div className="relative group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por ID (ex: A02970), Endereço ou Modelo..."
                  className="w-full bg-gray-100 border-2 border-transparent focus:bg-white focus:border-eletro-orange rounded-full py-3 pl-12 pr-4 text-gray-800 placeholder-gray-400 outline-none transition-all duration-300 shadow-inner"
                />
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-eletro-orange transition-colors w-5 h-5" />

                {loading && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <SpinnerIcon className="text-eletro-orange w-5 h-5" />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Filter Bar */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Status/Error Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6 flex items-start animate-fade-in">
            <AlertIcon className="text-red-500 w-5 h-5 mr-3 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Ops, algo deu errado.</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && filteredAndSortedData.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="text-gray-400 w-8 h-8" />
            </div>
            <h3 className="text-gray-600 font-medium text-lg">Nenhum equipamento encontrado</h3>
            <p className="text-gray-400">Tente ajustar seus filtros ou buscar por outro termo.</p>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedData.map((item, index) => {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white h-80 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {showLoadMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="group relative flex items-center justify-center px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-full hover:border-eletro-orange hover:text-eletro-orange transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <SpinnerIcon className="w-5 h-5 mr-2" />
                  Carregando...
                </>
              ) : (
                <>
                  Carregar Mais
                  <span className="ml-2 text-xs font-normal text-gray-400 group-hover:text-eletro-orange/70">
                    ({data.length} de {total})
                  </span>
                </>
              )}
            </button>
          </div>
        )}

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