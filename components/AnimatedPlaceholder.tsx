import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verticalSwap } from '../lib/animations';

const placeholders = [
    "Buscar por Nº Eletro",
    "Buscar por Nº Parada",
    "Buscar por Endereço",
    "Buscar por Modelo",
    "Buscar por Bairro"
];

interface AnimatedPlaceholderProps {
    className?: string;
}

const AnimatedPlaceholder: React.FC<AnimatedPlaceholderProps> = ({ className = '' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % placeholders.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`overflow-hidden ${className}`}>
            <AnimatePresence mode="wait">
                <motion.span
                    key={currentIndex}
                    variants={verticalSwap}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="block text-gray-400 dark:text-gray-500 whitespace-nowrap"
                >
                    {placeholders[currentIndex]}...
                </motion.span>
            </AnimatePresence>
        </div>
    );
};

export default AnimatedPlaceholder;
