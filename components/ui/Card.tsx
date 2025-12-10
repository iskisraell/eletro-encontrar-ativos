import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';
import { cardHover, fadeInUp } from '../../lib/animations';

interface CardProps extends HTMLMotionProps<"div"> {
    variant?: 'default' | 'dark' | 'accent' | 'outline';
    hover?: boolean;
    animated?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
    default: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm',
    dark: 'bg-eletro-black text-white border-none',
    accent: 'bg-eletro-orange text-white border-none',
    outline: 'bg-transparent border-2 border-gray-200',
};

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({
        className,
        variant = 'default',
        hover = false,
        animated = true,
        padding = 'md',
        children,
        ...props
    }, ref) => {
        const baseStyles = 'rounded-xl overflow-hidden';

        const motionProps = animated ? fadeInUp : {};
        const hoverProps = hover ? cardHover : {};

        return (
            <motion.div
                ref={ref}
                className={cn(
                    baseStyles,
                    variantStyles[variant],
                    paddingStyles[padding],
                    hover && 'cursor-pointer',
                    className
                )}
                initial={animated ? "initial" : undefined}
                animate={animated ? "animate" : undefined}
                whileHover={hover ? "hover" : undefined}
                whileTap={hover ? "tap" : undefined}
                variants={{ ...motionProps, ...hoverProps }}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

Card.displayName = 'Card';

// Card Header component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex flex-col space-y-1.5', className)}
            {...props}
        >
            {children}
        </div>
    )
);

CardHeader.displayName = 'CardHeader';

// Card Title component
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { }

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ className, children, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn('text-lg font-semibold leading-none tracking-tight', className)}
            {...props}
        >
            {children}
        </h3>
    )
);

CardTitle.displayName = 'CardTitle';

// Card Description component
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { }

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
    ({ className, children, ...props }, ref) => (
        <p
            ref={ref}
            className={cn('text-sm text-gray-500', className)}
            {...props}
        >
            {children}
        </p>
    )
);

CardDescription.displayName = 'CardDescription';

// Card Content component
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
    ({ className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('', className)}
            {...props}
        >
            {children}
        </div>
    )
);

CardContent.displayName = 'CardContent';

// Card Footer component
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
    ({ className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex items-center pt-4', className)}
            {...props}
        >
            {children}
        </div>
    )
);

CardFooter.displayName = 'CardFooter';

export default Card;
