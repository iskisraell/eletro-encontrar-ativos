import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Square, CheckSquare, Search } from 'lucide-react';

interface MultiSelectDropdownProps {
    label: string;
    icon: React.ReactNode;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    label,
    icon,
    options,
    selected,
    onChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm(''); // Reset search when closed
        }
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            opt.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const handleToggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const handleSelectAll = () => {
        // If searching, only select/deselect filtered options
        const optionsToToggle = searchTerm ? filteredOptions : options;

        const allFilteredSelected = optionsToToggle.every(opt => selected.includes(opt));

        if (allFilteredSelected) {
            // Deselect all visible options
            onChange(selected.filter(item => !optionsToToggle.includes(item)));
        } else {
            // Select all visible options
            const newSelected = new Set([...selected, ...optionsToToggle]);
            onChange(Array.from(newSelected));
        }
    };

    const isAllSelected = filteredOptions.length > 0 && filteredOptions.every(opt => selected.includes(opt));
    const isPartiallySelected = filteredOptions.some(opt => selected.includes(opt)) && !isAllSelected;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md transition-colors ${isOpen || selected.length > 0
                        ? 'border-eletro-orange ring-1 ring-eletro-orange bg-orange-50/50 text-eletro-orange'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
            >
                <div className="flex items-center truncate">
                    <span className={`mr-2 ${selected.length > 0 ? 'text-eletro-orange' : 'text-gray-400'}`}>
                        {icon}
                    </span>
                    <span className="font-medium truncate">
                        {selected.length === 0
                            ? label
                            : `${label} (${selected.length})`}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 flex flex-col animate-in fade-in zoom-in-95 duration-100">

                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-eletro-orange focus:ring-1 focus:ring-eletro-orange bg-gray-50"
                            />
                        </div>
                    </div>

                    {/* Select All Action */}
                    <div className="px-2 py-1 border-b border-gray-100 bg-gray-50/50">
                        <button
                            onClick={handleSelectAll}
                            className="flex items-center w-full px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-eletro-orange transition-colors"
                        >
                            <div className={`mr-2 ${isAllSelected || isPartiallySelected ? 'text-eletro-orange' : 'text-gray-400'}`}>
                                {isAllSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5" />
                                ) : isPartiallySelected ? (
                                    <div className="w-3.5 h-3.5 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-eletro-orange rounded-sm" />
                                    </div>
                                ) : (
                                    <Square className="w-3.5 h-3.5" />
                                )}
                            </div>
                            {isAllSelected ? 'Desmarcar Visíveis' : 'Selecionar Visíveis'}
                        </button>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-60">
                        {filteredOptions.map((option) => {
                            const isSelected = selected.includes(option);
                            return (
                                <button
                                    key={option}
                                    onClick={() => handleToggleOption(option)}
                                    className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors ${isSelected ? 'bg-orange-50 text-eletro-orange' : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className={`mr-2 ${isSelected ? 'text-eletro-orange' : 'text-gray-300'}`}>
                                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                    </div>
                                    <span className="truncate text-left">{option}</span>
                                </button>
                            );
                        })}
                        {filteredOptions.length === 0 && (
                            <div className="px-2 py-4 text-center text-sm text-gray-400">
                                Nenhuma opção encontrada
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
