import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, LayoutDashboard } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';
import { cn } from '../lib/utils';

interface TabNavigationProps {
    activeTab: 'list' | 'dashboard';
    onTabChange: (tab: 'list' | 'dashboard') => void;
    className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
    activeTab,
    onTabChange,
    className,
}) => {
    return (
        <div className={cn('flex justify-center', className)}>
            <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'list' | 'dashboard')}>
                <TabsList className="grid grid-cols-2 w-[280px] sm:w-[320px]">
                    <TabsTrigger
                        value="list"
                        icon={<LayoutGrid className="w-4 h-4" />}
                    >
                        Equipamentos
                    </TabsTrigger>
                    <TabsTrigger
                        value="dashboard"
                        icon={<LayoutDashboard className="w-4 h-4" />}
                    >
                        Dashboard
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
};

export default TabNavigation;
