import React from 'react';
import { LayoutGrid, LayoutDashboard, MapPin } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';
import { cn } from '../lib/utils';

// Tab type that includes the new 'map' option
export type TabType = 'list' | 'dashboard' | 'map';

interface TabNavigationProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
    activeTab,
    onTabChange,
    className,
}) => {
    return (
        <div className={cn('flex justify-center', className)}>
            <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabType)}>
                {/* Desktop: 3 columns including Map tab */}
                <TabsList className="hidden md:grid md:grid-cols-3 md:w-[420px]">
                    <TabsTrigger
                        value="list"
                        icon={<LayoutGrid className="w-4 h-4" />}
                        layoutId="tab-indicator-desktop"
                    >
                        Equipamentos
                    </TabsTrigger>
                    <TabsTrigger
                        value="dashboard"
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        layoutId="tab-indicator-desktop"
                    >
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger
                        value="map"
                        icon={<MapPin className="w-4 h-4" />}
                        layoutId="tab-indicator-desktop"
                    >
                        Mapa
                    </TabsTrigger>
                </TabsList>

                {/* Mobile: 2 columns without Map tab */}
                <TabsList className="grid grid-cols-2 w-[280px] sm:w-[320px] md:hidden">
                    <TabsTrigger
                        value="list"
                        icon={<LayoutGrid className="w-4 h-4" />}
                        layoutId="tab-indicator-mobile"
                    >
                        Equipamentos
                    </TabsTrigger>
                    <TabsTrigger
                        value="dashboard"
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        layoutId="tab-indicator-mobile"
                    >
                        Dashboard
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
};

export default TabNavigation;
