import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ActiveFilterChipProps {
    label: string;
    onClear: () => void;
    color?: string;
}

/**
 * A small animated chip to display active filter selections on charts.
 * Shows the filter value with a clear button.
 */
export const ActiveFilterChip: React.FC<ActiveFilterChipProps> = ({
    label,
    onClear,
    color = '#ff4f00' // Default to eletro-orange
}) => {
    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
                backgroundColor: `${color}15`,
                color: color,
            }}
        >
            <span className="max-w-[100px] truncate" title={label}>
                {label}
            </span>
            <motion.button
                onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                }}
                className="p-0.5 rounded-full hover:bg-black/10 transition-colors focus:outline-none focus:ring-1 focus:ring-current"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Remover filtro ${label}`}
            >
                <X className="w-3 h-3" />
            </motion.button>
        </motion.div>
    );
};

interface ActiveFilterChipsProps {
    values: string[];
    onRemove: (value: string) => void;
    onClearAll?: () => void;
    color?: string;
    maxVisible?: number;
}

/**
 * Container for multiple filter chips with overflow handling
 */
export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
    values,
    onRemove,
    onClearAll,
    color = '#ff4f00',
    maxVisible = 3,
}) => {
    if (values.length === 0) return null;

    const visibleValues = values.slice(0, maxVisible);
    const hiddenCount = values.length - maxVisible;

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <AnimatePresence mode="popLayout">
                {visibleValues.map((value) => (
                    <ActiveFilterChip
                        key={value}
                        label={value}
                        onClear={() => onRemove(value)}
                        color={color}
                    />
                ))}

                {hiddenCount > 0 && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-gray-500 dark:text-gray-400"
                    >
                        +{hiddenCount} mais
                    </motion.span>
                )}
            </AnimatePresence>

            {values.length > 1 && onClearAll && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={onClearAll}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1"
                >
                    Limpar todos
                </motion.button>
            )}
        </div>
    );
};

export default ActiveFilterChip;
