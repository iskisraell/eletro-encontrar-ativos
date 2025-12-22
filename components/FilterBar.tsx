import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Filter, SortAsc, SortDesc, X, Check, Image, MapPin, Home, AlertTriangle, ChevronDown, PanelTop } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';

interface FilterBarProps {
    isOpen: boolean;
    onClose: () => void;
    filters: {
        workArea: string[];
        neighborhood: string[];
        shelterModel: string[];
        riskArea: string[];
        hasPhoto: boolean;
        panelType: string[];
    };
    sort: {
        field: string;
        direction: 'asc' | 'desc';
    };
    options: {
        workAreas: { value: string; count: number }[];
        neighborhoods: { value: string; count: number }[];
        shelterModels: { value: string; count: number }[];
        riskAreas: { value: string; count: number }[];
        panelTypes: { value: string; count: number; key: string }[];
    };
    onFilterChange: (key: string, value: any) => void;
    onSortChange: (field: string) => void;
    onClearFilters: () => void;
    featureFilters?: string[];
    onFeatureFilterChange?: (featureName: string) => void;
    activeTab?: 'list' | 'dashboard' | 'map';
}

const sidebarVariants = {
    initial: { x: '-100%' },
    animate: { x: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as any } },
    exit: { x: '-100%', transition: { duration: 0.25 } }
};

const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
};

const FilterBar: React.FC<FilterBarProps> = ({
    isOpen,
    onClose,
    filters,
    sort,
    options,
    onFilterChange,
    onSortChange,
    onClearFilters,
    featureFilters = [],
    onFeatureFilterChange,
    activeTab = 'list',
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Track scroll position for threshold-based collapse
    const lastScrollY = useRef(0);
    // Track where user manually expanded - allows re-collapse after scrolling 100px past this point
    const expandedAtScrollY = useRef<number | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setIsCollapsed(false);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Scroll logic:
    // - Auto-collapse on first scroll past 150px threshold
    // - If user manually expands while scrolled, track that position
    // - Re-collapse automatically if user scrolls 100px past where they expanded
    // - Auto-expand when scrolled to top
    useEffect(() => {
        if (isMobile) return;
        
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const threshold = 150;
            
            // First time crossing threshold - auto collapse
            if (scrollY > threshold && lastScrollY.current <= threshold) {
                setIsCollapsed(true);
                expandedAtScrollY.current = null;
            }
            
            // If user manually expanded and scrolls 100px past that point, re-collapse
            if (expandedAtScrollY.current !== null && scrollY > expandedAtScrollY.current + 100) {
                setIsCollapsed(true);
                expandedAtScrollY.current = null;
            }
            
            // Auto-expand when scrolled to top
            if (scrollY <= 10) {
                setIsCollapsed(false);
                expandedAtScrollY.current = null;
            }
            
            lastScrollY.current = scrollY;
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobile]);

    // Manual toggle - tracks expand position for smart re-collapse
    const handleToggleCollapse = () => {
        if (isMobile) return;
        setIsCollapsed(prev => {
            const next = !prev;
            if (!next) {
                // User is expanding - track scroll position for smart re-collapse
                expandedAtScrollY.current = window.scrollY;
            } else {
                expandedAtScrollY.current = null;
            }
            return next;
        });
    };

    // Memoize computed values to prevent recreation on every render
    // On map tab, only consider map-relevant filters (shelterModel, panelType, hasPhoto)
    const hasActiveFilters = useMemo(() => {
        if (activeTab === 'map') {
            return filters.shelterModel.length > 0 ||
                filters.panelType.length > 0 ||
                filters.hasPhoto;
        }
        return filters.workArea.length > 0 ||
            filters.neighborhood.length > 0 ||
            filters.shelterModel.length > 0 ||
            filters.riskArea.length > 0 ||
            filters.panelType.length > 0 ||
            filters.hasPhoto ||
            featureFilters.length > 0;
    }, [filters, featureFilters, activeTab]);

    const activePills = useMemo(() => {
        const pills = [
            // Only include non-map filters if not on map tab
            ...(activeTab !== 'map' ? filters.workArea.map(v => ({ key: 'workArea', label: v, value: v })) : []),
            ...(activeTab !== 'map' ? filters.neighborhood.map(v => ({ key: 'neighborhood', label: v, value: v })) : []),
            ...filters.shelterModel.map(v => ({ key: 'shelterModel', label: v, value: v })),
            ...(activeTab !== 'map' ? filters.riskArea.map(v => ({ key: 'riskArea', label: v, value: v })) : []),
            ...filters.panelType.map(t => ({ 
                key: 'panelType', 
                value: t,
                label: t === 'digital' ? 'Painel Digital' : t === 'static' ? 'Painel Estático' : 'Sem Painéis' 
            })),
            ...(filters.hasPhoto ? [{ key: 'hasPhoto', label: 'Com Foto', value: true }] : []),
            ...(activeTab !== 'map' ? featureFilters.map(f => ({ key: 'feature', label: f, value: f })) : [])
        ];
        return pills;
    }, [filters, featureFilters, activeTab]);

    const activeCount = activePills.length;

    const handleRemovePill = (pill: { key: string, value: any, label: string }) => {
        if (pill.key === 'feature' && onFeatureFilterChange) {
            onFeatureFilterChange(pill.value);
        } else if (pill.key === 'hasPhoto') {
            onFilterChange('hasPhoto', false);
        } else {
            const currentValues = filters[pill.key as keyof typeof filters];
            if (Array.isArray(currentValues)) {
                onFilterChange(pill.key, currentValues.filter(v => v !== pill.value));
            }
        }
    };

    const renderMainContent = (mobileView: boolean) => (
        <div className="flex flex-col w-full">
            <motion.div 
                layout
                className={`flex items-center justify-between min-h-[44px] ${!mobileView && isCollapsed ? 'mb-0' : 'mb-4'}`}
            >
                <motion.div layout className="flex flex-1 min-w-0">
                    <motion.div 
                        layout
                        className="flex items-center text-gray-700 dark:text-gray-200 font-semibold mr-4 whitespace-nowrap cursor-pointer hover:text-eletro-orange transition-colors group"
                        onClick={handleToggleCollapse}
                    >
                        <motion.div 
                            className="relative mr-2"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div>
                                <Filter className="w-5 h-5 text-eletro-orange" />
                            </motion.div>
                            <AnimatePresence>
                                {activeCount > 0 && (
                                    <motion.span 
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        className="absolute -top-2 -right-2 bg-eletro-orange text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950 shadow-sm"
                                    >
                                        {activeCount}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        <span className="hidden sm:inline">Filtros</span>
                    </motion.div>

                    {!mobileView && isCollapsed && activeCount > 0 && (
                        <motion.div 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-4 flex-1"
                        >
                            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2 flex-shrink-0" />
                            <div className="flex items-center gap-1.5">
                                {activePills.slice(0, 5).map((pill, i) => (
                                    <motion.span
                                        layout
                                        key={`${pill.key}-${pill.label}-${i}`}
                                        className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 text-eletro-orange text-[10px] font-bold rounded-full whitespace-nowrap border border-orange-100/50 dark:border-orange-800/20 flex items-center gap-1"
                                    >
                                        {pill.label}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemovePill(pill); }}
                                            className="ml-0.5 p-0.5 rounded-full hover:bg-eletro-orange hover:text-white transition-colors"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </motion.span>
                                ))}
                                {activeCount > 5 && (
                                    <motion.span layout className="text-[10px] text-gray-400 font-bold bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                                        +{activeCount - 5}
                                    </motion.span>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {hasActiveFilters && (!isCollapsed || mobileView) && (
                        <motion.button
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={onClearFilters}
                            className="text-[10px] uppercase tracking-wider font-bold text-red-500 hover:text-white hover:bg-red-500 flex items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md transition-all whitespace-nowrap ml-4"
                        >
                            <X className="w-3 h-3 mr-1" />
                            Limpar
                        </motion.button>
                    )}

                    {!mobileView && (
                        <LayoutGroup>
                            <motion.div 
                                layout
                                className="flex items-center ml-auto flex-shrink-0"
                                transition={{ 
                                    type: 'spring', 
                                    stiffness: 400, 
                                    damping: 30 
                                }}
                            >
                                <AnimatePresence mode="wait">
                                    {activeTab === 'list' && (
                                        <motion.div 
                                            key="sorter"
                                            layout
                                            initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, x: 20 }}
                                            transition={{ 
                                                type: 'spring', 
                                                stiffness: 400, 
                                                damping: 30 
                                            }}
                                            className="flex items-center space-x-2 mr-2"
                                        >
                                            <div className="w-40">
                                                <MultiSelectDropdown
                                                    label="Ordenar"
                                                    icon={<SortAsc className="h-4 w-4" />}
                                                    options={["Padrão", "ID", "Bairro", "Modelo"]}
                                                    selected={
                                                        sort.field === "Nº Eletro" ? ["ID"] :
                                                            sort.field === "Bairro" ? ["Bairro"] :
                                                                sort.field === "Modelo de Abrigo" ? ["Modelo"] :
                                                                    ["Padrão"]
                                                    }
                                                    onChange={(val) => {
                                                        const selectedLabel = val[0];
                                                        let field = "";
                                                        if (selectedLabel === "ID") field = "Nº Eletro";
                                                        else if (selectedLabel === "Bairro") field = "Bairro";
                                                        else if (selectedLabel === "Modelo") field = "Modelo de Abrigo";
                                                        onSortChange(field);
                                                    }}
                                                    singleSelect={true}
                                                />
                                            </div>
                                            <button
                                                onClick={() => onSortChange(sort.field)}
                                                disabled={!sort.field}
                                                className={`p-2 rounded-md border transition-colors ${!sort.field
                                                    ? 'text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                                    : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'}`}
                                            >
                                                {sort.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <motion.button
                                    layout
                                    onClick={handleToggleCollapse}
                                    className="p-1.5 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-eletro-orange flex-shrink-0"
                                    whileHover={{ 
                                        scale: 1.1, 
                                        backgroundColor: 'rgba(255, 79, 0, 0.1)',
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ 
                                        type: 'spring', 
                                        stiffness: 400, 
                                        damping: 30 
                                    }}
                                >
                                    <motion.div
                                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </motion.div>
                                </motion.button>
                            </motion.div>
                        </LayoutGroup>
                    )}
                </motion.div>
            </motion.div>

            <AnimatePresence initial={false}>
                {(mobileView || !isCollapsed) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        {/* Map tab: show only 3 filters; Other tabs: show all 6 filters */}
                        <div className={`grid gap-3 ${mobileView ? 'grid-cols-1' : activeTab === 'map' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6'}`}>
                            {/* Área de Trabalho - hidden on map */}
                            {activeTab !== 'map' && (
                                <MultiSelectDropdown
                                    label="Área de Trabalho"
                                    icon={<MapPin className="h-4 w-4" />}
                                    options={options.workAreas}
                                    selected={filters.workArea}
                                    onChange={(val) => onFilterChange('workArea', val)}
                                />
                            )}
                            {/* Bairro - hidden on map */}
                            {activeTab !== 'map' && (
                                <MultiSelectDropdown
                                    label="Bairro"
                                    icon={<Home className="h-4 w-4" />}
                                    options={options.neighborhoods}
                                    selected={filters.neighborhood}
                                    onChange={(val) => onFilterChange('neighborhood', val)}
                                />
                            )}
                            {/* Modelo - always visible */}
                            <MultiSelectDropdown
                                label="Modelo"
                                icon={<Home className="h-4 w-4" />}
                                options={options.shelterModels}
                                selected={filters.shelterModel}
                                onChange={(val) => onFilterChange('shelterModel', val)}
                            />
                            {/* Risco - hidden on map */}
                            {activeTab !== 'map' && (
                                <MultiSelectDropdown
                                    label="Risco"
                                    icon={<AlertTriangle className="h-4 w-4" />}
                                    options={options.riskAreas}
                                    selected={filters.riskArea}
                                    onChange={(val) => onFilterChange('riskArea', val)}
                                />
                            )}
                            {/* Painéis - always visible */}
                            <MultiSelectDropdown
                                label="Painéis"
                                icon={<PanelTop className="h-4 w-4" />}
                                options={options.panelTypes}
                                selected={filters.panelType.map(t => 
                                    t === 'digital' ? 'Painel Digital' : t === 'static' ? 'Painel Estático' : 'Sem Painéis'
                                )}
                                onChange={(val) => onFilterChange('panelType', val.map(v =>
                                    v === 'Painel Digital' ? 'digital' : v === 'Painel Estático' ? 'static' : 'none'
                                ))}
                            />
                            {/* Com Foto - always visible */}
                            <button
                                onClick={() => onFilterChange('hasPhoto', !filters.hasPhoto)}
                                className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${filters.hasPhoto
                                    ? 'bg-eletro-orange text-white border-eletro-orange'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <Image className={`w-4 h-4 mr-2 ${filters.hasPhoto ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                {filters.hasPhoto ? 'Com Foto' : 'Apenas com Foto'}
                                {filters.hasPhoto && <Check className="w-4 h-4 ml-2" />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    if (isMobile) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                            variants={backdropVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onClick={onClose}
                        />
                        <motion.div
                            className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-gray-950 shadow-2xl border-r border-gray-200 dark:border-gray-700"
                            variants={sidebarVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            <div className="h-full flex flex-col p-4 overflow-y-auto">
                                {renderMainContent(true)}
                                <div className="mt-auto pt-6 border-t dark:border-gray-800">
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 bg-eletro-orange text-white rounded-lg font-bold"
                                    >
                                        Ver Resultados
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }

    return (
        <motion.div 
            initial={false}
            animate={{ 
                paddingTop: isCollapsed ? 8 : 16,
                paddingBottom: isCollapsed ? 8 : 16,
            }}
            transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 30,
            }}
            className="bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 mb-6 sticky top-[152px] z-20 shadow-sm"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {renderMainContent(false)}
            </div>
        </motion.div>
    );
};

export default FilterBar;
