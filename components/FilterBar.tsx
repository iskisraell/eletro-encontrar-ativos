import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, SortAsc, SortDesc, X, Check, Image, MapPin, Home, AlertTriangle, ChevronUp, ChevronDown, PanelTop } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';
import { spring } from '../lib/animations';

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
}

// Animation variants for mobile sidebar
const sidebarVariants = {
    initial: { x: '-100%' },
    animate: {
        x: 0,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    },
    exit: {
        x: '-100%',
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }
    }
};

const backdropVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 }
    }
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
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Check for mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const hasActiveFilters =
        filters.workArea.length > 0 ||
        filters.neighborhood.length > 0 ||
        filters.shelterModel.length > 0 ||
        filters.riskArea.length > 0 ||
        filters.panelType.length > 0 ||
        filters.hasPhoto;

    // Filter content component (shared between mobile and desktop)
    const FilterContent = () => (
        <>
            {/* Header & Sort */}
            <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row justify-between items-center mb-4'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-700 dark:text-gray-200 font-medium">
                        <Filter className="w-5 h-5 mr-2 text-eletro-orange" />
                        Filtros
                        {hasActiveFilters && (
                            <motion.button
                                onClick={onClearFilters}
                                className="ml-4 text-xs text-red-500 hover:text-red-700 flex items-center bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <X className="w-3 h-3 mr-1" />
                                Limpar
                            </motion.button>
                        )}
                    </div>

                    {isMobile && (
                        <motion.button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X className="w-6 h-6" />
                        </motion.button>
                    )}
                    {!isMobile && (
                        <motion.button
                            onClick={() => setIsCollapsed(prev => !prev)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 ml-2"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title={isCollapsed ? 'Expandir filtros' : 'Recolher filtros'}
                        >
                            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </motion.button>
                    )}
                </div>

                <div className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-lg' : ''}`}>
                    <div className="flex items-center space-x-2">
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
                        <motion.button
                            onClick={() => onSortChange(sort.field)}
                            disabled={!sort.field}
                            className={`p-2 rounded-md border transition-colors ${!sort.field
                                ? 'text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'}`}
                            whileHover={sort.field ? { scale: 1.05 } : {}}
                            whileTap={sort.field ? { scale: 0.95 } : {}}
                        >
                            {sort.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Filter Inputs Grid - Collapsible on desktop */}
            <AnimatePresence initial={false}>
                {(!isCollapsed || isMobile) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'visible' }}
                    >
                        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1 mt-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 mt-4'}`}>
                            {/* Área de Trabalho */}
                            <MultiSelectDropdown
                                label="Área de Trabalho"
                                icon={<MapPin className="h-4 w-4" />}
                                options={options.workAreas}
                                selected={filters.workArea}
                                onChange={(val) => onFilterChange('workArea', val)}
                            />

                            {/* Bairro */}
                            <MultiSelectDropdown
                                label="Bairro"
                                icon={<Home className="h-4 w-4" />}
                                options={options.neighborhoods}
                                selected={filters.neighborhood}
                                onChange={(val) => onFilterChange('neighborhood', val)}
                            />

                            {/* Modelo de Abrigo */}
                            <MultiSelectDropdown
                                label="Modelo"
                                icon={<Home className="h-4 w-4" />}
                                options={options.shelterModels}
                                selected={filters.shelterModel}
                                onChange={(val) => onFilterChange('shelterModel', val)}
                            />

                            {/* Área de Risco */}
                            <MultiSelectDropdown
                                label="Risco"
                                icon={<AlertTriangle className="h-4 w-4" />}
                                options={options.riskAreas}
                                selected={filters.riskArea}
                                onChange={(val) => onFilterChange('riskArea', val)}
                            />

                            {/* Tipo de Painel */}
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

                            {/* Contém Foto */}
                            <motion.button
                                onClick={() => onFilterChange('hasPhoto', !filters.hasPhoto)}
                                className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${filters.hasPhoto
                                    ? 'bg-eletro-orange text-white border-eletro-orange'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Image className={`w-4 h-4 mr-2 ${filters.hasPhoto ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                {filters.hasPhoto ? 'Com Foto' : 'Apenas com Foto'}
                                {filters.hasPhoto && <Check className="w-4 h-4 ml-2" />}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    // Mobile: Render as animated sidebar drawer
    if (isMobile) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                            variants={backdropVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onClick={onClose}
                        />

                        {/* Sidebar */}
                        <motion.div
                            className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-700"
                            variants={sidebarVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            <div className="h-full flex flex-col p-4 overflow-y-auto">
                                <FilterContent />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }

    // Desktop: Render as sticky bar with proper offset
    // Header height: logo row (72px) + tabs (~45px) + border + padding = ~130px
    return (
        <div className="bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 py-4 mb-6 sticky top-[150px] z-20 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FilterContent />
            </div>
        </div>
    );
};

export default FilterBar;
