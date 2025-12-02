import React from 'react';
import { Search, MapPin, X, Info, LayoutGrid, AlertCircle, Loader2, Maximize2 } from 'lucide-react';

export const SearchIcon = ({ className }: { className?: string }) => <Search className={className} />;
export const MapPinIcon = ({ className }: { className?: string }) => <MapPin className={className} />;
export const CloseIcon = ({ className }: { className?: string }) => <X className={className} />;
export const InfoIcon = ({ className }: { className?: string }) => <Info className={className} />;
export const GridIcon = ({ className }: { className?: string }) => <LayoutGrid className={className} />;
export const AlertIcon = ({ className }: { className?: string }) => <AlertCircle className={className} />;
export const SpinnerIcon = ({ className }: { className?: string }) => <Loader2 className={`animate-spin ${className}`} />;
export const MaximizeIcon = ({ className }: { className?: string }) => <Maximize2 className={className} />;
