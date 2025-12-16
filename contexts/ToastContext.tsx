import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
    id: string;
    message: string;
    type: 'filter-add' | 'filter-remove' | 'info' | 'error';
    filterKey?: string;
    filterValue?: string;
}

interface ToastContextValue {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, 'id'>) => void;
    showFilterToast: (action: 'add' | 'remove', filterKey: string, value: string) => void;
    dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((toastData: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = { ...toastData, id };
        
        setToasts(prev => {
            const updated = [...prev, newToast];
            if (updated.length > 4) {
                return updated.slice(updated.length - 4);
            }
            return updated;
        });

        // Auto-dismiss logic handled in the component or here?
        // Usually better in the component if we want pause-on-hover.
        // But if we want simple auto-dismiss, we can do it here.
        // The plan says "Auto-dismiss after 3 seconds, Pause timer on hover".
        // This implies the timer should be in the Toast component.
    }, []);

    const showFilterToast = useCallback((action: 'add' | 'remove', filterKey: string, value: string) => {
        showToast({
            message: action === 'add' ? `Filtro aplicado: ${value}` : `Filtro removido: ${value}`,
            type: action === 'add' ? 'filter-add' : 'filter-remove',
            filterKey,
            filterValue: value
        });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, showFilterToast, dismissToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
