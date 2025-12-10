import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant = 'default', width, height, style, ...props }, ref) => {
        const variantStyles = {
            default: 'rounded-md',
            circular: 'rounded-full',
            rectangular: 'rounded-none',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    'shimmer',
                    variantStyles[variant],
                    className
                )}
                style={{
                    width: width,
                    height: height,
                    ...style,
                }}
                {...props}
            />
        );
    }
);

Skeleton.displayName = 'Skeleton';

// Pre-built skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className)}>
        <Skeleton className="h-48 w-full" variant="rectangular" />
        <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full mt-4" />
        </div>
    </div>
);

export const SkeletonStatsCard: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
        <div className="flex items-start justify-between">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-12 w-12" variant="circular" />
        </div>
    </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 flex-1" style={{ width: `${100 - i * 15}%` }} />
                </div>
            ))}
        </div>
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({ rows = 5, className }) => (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className)}>
        <div className="p-4 border-b border-gray-100">
            <Skeleton className="h-6 w-48" />
        </div>
        <div className="divide-y divide-gray-100">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-6 w-16" />
                </div>
            ))}
        </div>
    </div>
);

export default Skeleton;
