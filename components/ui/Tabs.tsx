import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { spring } from '../../lib/animations';

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
}

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

// Context for tabs
const TabsContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

const useTabsContext = () => {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs provider');
    }
    return context;
};

// Main Tabs component
export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className }) => {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={cn('w-full', className)}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

// Tabs List (container for triggers)
export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
    return (
        <div
            className={cn(
                'inline-flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1.5',
                className
            )}
        >
            {children}
        </div>
    );
};

// Individual Tab Trigger
export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className, icon }) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
        <button
            onClick={() => onValueChange(value)}
            className={cn(
                'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eletro-orange focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-50',
                isSelected
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                className
            )}
        >
            {/* Animated background */}
            {isSelected && (
                <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                    transition={spring.stiff}
                />
            )}

            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
                {icon && <span className={cn(isSelected ? 'text-eletro-orange' : '')}>{icon}</span>}
                {children}
            </span>
        </button>
    );
};

// Tab Content Panel
export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!isSelected) return null;

    return (
        <motion.div
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring.gentle}
            className={cn('mt-4 focus-visible:outline-none', className)}
        >
            {children}
        </motion.div>
    );
};

export default Tabs;
