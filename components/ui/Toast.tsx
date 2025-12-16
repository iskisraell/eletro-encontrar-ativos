import React, { useEffect, useState } from 'react';
import { useToast, Toast as ToastType } from '../../contexts/ToastContext';
import { X, Filter, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
    const { dismissToast } = useToast();
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        const timer = setTimeout(() => {
            dismissToast(toast.id);
        }, 3000);

        return () => clearTimeout(timer);
    }, [isPaused, toast.id, dismissToast]);

    const getIcon = () => {
        switch (toast.type) {
            case 'filter-add':
                return <Filter className="w-5 h-5 text-eletro-orange" />;
            case 'filter-remove':
                return <Filter className="w-5 h-5 text-gray-400" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-eletro-error" />;
            case 'info':
            default:
                return <Info className="w-5 h-5 text-eletro-purple" />;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
            className={`
                bg-eletro-black/95 backdrop-blur-sm
                border-l-4 border-eletro-orange
                rounded-lg shadow-lg
                p-4 mb-3
                flex items-center justify-between
                w-full md:w-96
                pointer-events-auto
            `}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            role="alert"
            // Mobile animation override could be done with variants but this is simple enough
            style={{
                // We'll trust framer-motion defaults or add variants if needed for mobile "slide up"
            }}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                {getIcon()}
                <div className="flex flex-col">
                    <span className="text-white text-sm font-medium truncate">
                        {toast.message}
                    </span>
                    {(toast.filterKey || toast.filterValue) && (
                        <span className="text-gray-400 text-xs">
                             {toast.type === 'filter-remove' ? 'Removido' : 'Ativo'}
                        </span>
                    )}
                </div>
            </div>
            <button
                onClick={() => dismissToast(toast.id)}
                className="text-gray-400 hover:text-white transition-colors ml-4"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts } = useToast();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="fixed z-50 flex flex-col gap-2 bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </AnimatePresence>
        </div>
    );
};
