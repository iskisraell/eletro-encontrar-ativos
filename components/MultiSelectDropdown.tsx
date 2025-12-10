import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Square, CheckSquare, Search } from 'lucide-react';

interface MultiSelectDropdownProps {
    label: string;
    icon: React.ReactNode;
    options: { value: string; count: number }[] | string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    singleSelect?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    label,
    icon,
    options,
    selected,
    onChange,
    singleSelect = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 256 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Normalize options to object format
    const normalizedOptions = useMemo(() => {
        return options.map(opt =>
            typeof opt === 'string' ? { value: opt, count: null } : opt
        );
    }, [options]);

    // Update dropdown position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4, // 4px gap
                left: rect.left,
                width: Math.max(rect.width, 256),
            });
        }
    }, [isOpen]);

    // Update position on scroll/resize
    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: Math.max(rect.width, 256),
                });
            }
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const closeDropdown = () => {
        if (isOpen) {
            setIsClosing(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsClosing(false);
                setSearchTerm('');
            }, 150);
        }
    };

    const toggleDropdown = () => {
        if (isOpen) {
            closeDropdown();
        } else {
            setIsOpen(true);
        }
    };

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                buttonRef.current && !buttonRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            // Small delay to ensure portal is rendered
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return normalizedOptions;
        return normalizedOptions.filter(opt =>
            opt.value.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [normalizedOptions, searchTerm]);

    const handleToggleOption = (option: string) => {
        if (singleSelect) {
            onChange([option]);
            closeDropdown();
        } else {
            if (selected.includes(option)) {
                onChange(selected.filter(item => item !== option));
            } else {
                onChange([...selected, option]);
            }
        }
    };

    const handleSelectAll = () => {
        const optionsToToggle = searchTerm ? filteredOptions : normalizedOptions;
        const allFilteredSelected = optionsToToggle.every(opt => selected.includes(opt.value));

        if (allFilteredSelected) {
            const valuesToDeselect = optionsToToggle.map(o => o.value);
            onChange(selected.filter(item => !valuesToDeselect.includes(item)));
        } else {
            const valuesToSelect = optionsToToggle.map(o => o.value);
            const newSelected = new Set([...selected, ...valuesToSelect]);
            onChange(Array.from(newSelected));
        }
    };

    const isAllSelected = !singleSelect && filteredOptions.length > 0 && filteredOptions.every(opt => selected.includes(opt.value));
    const isPartiallySelected = !singleSelect && filteredOptions.some(opt => selected.includes(opt.value)) && !isAllSelected;

    const animationClass = isClosing ? 'animate-slide-out' : 'animate-slide-in';

    const getButtonLabel = () => {
        if (singleSelect && selected.length === 1) {
            return selected[0];
        }
        if (selected.length === 0) return label;
        return `${label} (${selected.length})`;
    };

    // Dropdown content to render via portal
    const dropdownContent = (isOpen || isClosing) && createPortal(
        <div
            ref={dropdownRef}
            className={`fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 flex flex-col ${animationClass}`}
            style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                minWidth: 256,
            }}
        >
            {/* Search Input */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:border-eletro-orange focus:ring-1 focus:ring-eletro-orange bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Select All Action - Only for MultiSelect */}
            {!singleSelect && (
                <div className="px-2 py-1 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <button
                        onClick={handleSelectAll}
                        className="flex items-center w-full px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-eletro-orange transition-colors"
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
            )}

            {/* Options List */}
            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-60">
                {filteredOptions.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                        <button
                            key={option.value}
                            onClick={() => handleToggleOption(option.value)}
                            className={`flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors ${isSelected ? 'bg-orange-50 dark:bg-orange-900/30 text-eletro-orange' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className="flex items-center truncate">
                                <div className={`mr-2 ${isSelected ? 'text-eletro-orange' : 'text-gray-300'}`}>
                                    {singleSelect ? (
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-eletro-orange' : 'border-gray-300'}`}>
                                            {isSelected && <div className="w-2 h-2 bg-eletro-orange rounded-full" />}
                                        </div>
                                    ) : (
                                        isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />
                                    )}
                                </div>
                                <span className="truncate text-left">{option.value}</span>
                            </div>
                            {option.count !== null && (
                                <span className={`text-xs ml-2 ${isSelected ? 'text-eletro-orange/70' : 'text-gray-400'}`}>
                                    ({option.count})
                                </span>
                            )}
                        </button>
                    );
                })}
                {filteredOptions.length === 0 && (
                    <div className="px-2 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                        Nenhuma opção encontrada
                    </div>
                )}
            </div>
        </div>,
        document.body
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={toggleDropdown}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md transition-colors ${isOpen || selected.length > 0
                    ? 'border-eletro-orange ring-1 ring-eletro-orange bg-orange-50/50 dark:bg-orange-900/20 text-eletro-orange'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
            >
                <div className="flex items-center truncate">
                    <span className={`mr-2 ${selected.length > 0 ? 'text-eletro-orange' : 'text-gray-400'}`}>
                        {icon}
                    </span>
                    <span className="font-medium truncate">
                        {getButtonLabel()}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {dropdownContent}
        </div>
    );
};

export default MultiSelectDropdown;
