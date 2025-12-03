import React, { useEffect, useState } from 'react';
import { Filter, SortAsc, SortDesc, X, Check, Image, MapPin, Home, AlertTriangle } from 'lucide-react';
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
    };
    onFilterChange: (key: string, value: any) => void;
    onSortChange: (field: string) => void;
    onClearFilters: () => void;
}

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
        filters.hasPhoto;

    // Render Logic:
    // Mobile: Render as a fixed drawer if isOpen is true.
    // Desktop: Render as a sticky bar (always visible or toggleable - sticking to always visible for now, but respecting isOpen if we want to toggle it there too. Let's make it always visible on desktop for better UX, unless requested otherwise. The request said "on mobile only, make the filterbar as a left sidemenu". So desktop stays as is.)

    if (isMobile && !isOpen) return null;

    const containerClasses = isMobile
        ? "fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-gray-200"
        : "bg-white/90 backdrop-blur-md border-b border-gray-200 py-4 mb-6 sticky top-[72px] z-20 shadow-sm transition-all duration-300";

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <div className={containerClasses}>
                <div className={`h-full flex flex-col ${isMobile ? 'p-4 overflow-y-auto' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>

                    {/* Header & Sort */}
                    <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row justify-between items-center mb-4'}`}>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-gray-700 font-medium">
                                <Filter className="w-5 h-5 mr-2 text-eletro-orange" />
                                Filtros
                                {hasActiveFilters && (
                                    <button
                                        onClick={onClearFilters}
                                        className="ml-4 text-xs text-red-500 hover:text-red-700 flex items-center bg-red-50 px-2 py-1 rounded-full transition-colors"
                                    >
                                        <X className="w-3 h-3 mr-1" />
                                        Limpar
                                    </button>
                                )}
                            </div>

                            {isMobile && (
                                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                                    <X className="w-6 h-6" />
                                </button>
                            )}
                        </div>

                        <div className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-between bg-gray-50 p-2 rounded-lg' : ''}`}>
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
                                <button
                                    onClick={() => onSortChange(sort.field)}
                                    disabled={!sort.field}
                                    className={`p-2 rounded-md border transition-colors ${!sort.field ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-100 bg-white'}`}
                                >
                                    {sort.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Inputs Grid */}
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-1 mt-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>

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

                        {/* Contém Foto */}
                        <button
                            onClick={() => onFilterChange('hasPhoto', !filters.hasPhoto)}
                            className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${filters.hasPhoto
                                ? 'bg-eletro-orange text-white border-eletro-orange'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <Image className={`w-4 h-4 mr-2 ${filters.hasPhoto ? 'text-white' : 'text-gray-500'}`} />
                            {filters.hasPhoto ? 'Com Foto' : 'Apenas com Foto'}
                            {filters.hasPhoto && <Check className="w-4 h-4 ml-2" />}
                        </button>

                    </div>
                </div>
            </div>
        </>
    );
};

export default FilterBar;
