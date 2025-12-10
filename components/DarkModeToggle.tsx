import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { spring } from '../lib/animations';

interface DarkModeToggleProps {
    isDark: boolean;
    onToggle: () => void;
    className?: string;
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
    isDark,
    onToggle,
    className = ''
}) => {
    return (
        <motion.button
            onClick={onToggle}
            className={`relative p-2 rounded-full transition-colors ${isDark
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${className}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <motion.div
                initial={false}
                animate={{
                    rotate: isDark ? 180 : 0,
                    scale: isDark ? 1 : 1
                }}
                transition={spring.bouncy}
            >
                {isDark ? (
                    <Moon className="w-5 h-5" />
                ) : (
                    <Sun className="w-5 h-5" />
                )}
            </motion.div>
        </motion.button>
    );
};

export default DarkModeToggle;
