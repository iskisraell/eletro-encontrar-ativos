import React from 'react';
import { 
  Search, 
  MapPin, 
  X, 
  Info, 
  LayoutGrid, 
  AlertCircle, 
  Loader2, 
  Maximize2,
  Tag,
  Calendar,
  Zap,
  Wifi,
  Camera,
  Smartphone,
  Box,
  CheckCircle2,
  ExternalLink,
  Heart
} from 'lucide-react';

export const SearchIcon = ({ className }: { className?: string }) => <Search className={className} />;
export const MapPinIcon = ({ className }: { className?: string }) => <MapPin className={className} />;
export const CloseIcon = ({ className }: { className?: string }) => <X className={className} />;
export const InfoIcon = ({ className }: { className?: string }) => <Info className={className} />;
export const GridIcon = ({ className }: { className?: string }) => <LayoutGrid className={className} />;
export const AlertIcon = ({ className }: { className?: string }) => <AlertCircle className={className} />;
export const SpinnerIcon = ({ className }: { className?: string }) => <Loader2 className={`animate-spin ${className}`} />;
export const MaximizeIcon = ({ className }: { className?: string }) => <Maximize2 className={className} />;
export const TagIcon = ({ className }: { className?: string }) => <Tag className={className} />;
export const CalendarIcon = ({ className }: { className?: string }) => <Calendar className={className} />;
export const ZapIcon = ({ className }: { className?: string }) => <Zap className={className} />;
export const WifiIcon = ({ className }: { className?: string }) => <Wifi className={className} />;
export const CameraIcon = ({ className }: { className?: string }) => <Camera className={className} />;
export const DigitalIcon = ({ className }: { className?: string }) => <Smartphone className={className} />;
export const BoxIcon = ({ className }: { className?: string }) => <Box className={className} />;
export const CheckIcon = ({ className }: { className?: string }) => <CheckCircle2 className={className} />;
export const ExternalLinkIcon = ({ className }: { className?: string }) => <ExternalLink className={className} />;
export const HeartIcon = ({ className }: { className?: string }) => <Heart className={className} />;
