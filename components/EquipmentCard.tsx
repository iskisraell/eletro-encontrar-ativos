import React from 'react';
import { motion } from 'framer-motion';
import { Equipment, MergedEquipment, PanelLayerRecord, AbrigoAmigoRecord } from '../types';
import { MapPinIcon, DigitalIcon, HeartIcon } from './Icons';
import { spring } from '../lib/animations';
import placeholderImg from '../assets/placeholder.jpg';

interface EquipmentCardProps {
  item: Equipment | MergedEquipment;
  onClick: (item: Equipment | MergedEquipment) => void;
  index?: number;
}

// Helper to check if item has panel data
const hasPanelData = (item: Equipment | MergedEquipment): item is MergedEquipment & { _panelData: PanelLayerRecord } => {
  return '_hasPanelData' in item && item._hasPanelData === true && '_panelData' in item && item._panelData !== undefined;
};

// Helper to check if item has Abrigo Amigo data
const hasAbrigoAmigoData = (item: Equipment | MergedEquipment): item is MergedEquipment & { _abrigoAmigoData: AbrigoAmigoRecord } => {
  return '_hasAbrigoAmigo' in item && item._hasAbrigoAmigo === true && '_abrigoAmigoData' in item && item._abrigoAmigoData !== undefined;
};

// Get Abrigo Amigo badge color based on client
const getAbrigoAmigoColor = (cliente: string | undefined): string => {
  const normalizedClient = cliente?.toLowerCase().trim();
  if (normalizedClient === 'claro') return '#dc3545'; // Red for Claro
  if (normalizedClient === 'governo') return '#31b11c'; // Green for Governo
  return '#6b7280'; // Gray fallback
};

const EquipmentCardComponent: React.FC<EquipmentCardProps> = ({ item, onClick, index = 0 }) => {
  // Fallback image if "Foto Referência" is missing or broken
  const imageUrl = item["Foto Referência"] || placeholderImg;
  const id = item["Nº Eletro"] || 'Sem ID';
  const address = item["Endereço"] || 'Endereço não informado';
  const city = item["Cidade"];

  return (
    <motion.div
      onClick={() => onClick(item)}
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...spring.gentle,
        delay: Math.min(index * 0.05, 0.3) // Stagger with max delay of 0.3s
      }}
      whileHover={{
        y: -4,
        transition: spring.stiff
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
        <motion.img
          src={imageUrl}
          alt={`Equipamento ${id}`}
          loading="lazy"
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = placeholderImg;
          }}
        />
        <div className="absolute top-3 left-3 bg-eletro-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          {id}
        </div>
        
        {/* Badges container - Panel and Abrigo Amigo */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {/* Abrigo Amigo Badge - Shows when equipment is in Abrigo Amigo program */}
          {hasAbrigoAmigoData(item) && item._abrigoAmigoData.enabled && (
            <div 
              className="flex items-center gap-1 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md"
              style={{ backgroundColor: getAbrigoAmigoColor(item._abrigoAmigoData.cliente) }}
            >
              <HeartIcon className="w-3 h-3 fill-current" />
              <span>ABRIGO AMIGO</span>
            </div>
          )}
          
          {/* Panel Badge - Shows when equipment has panel data */}
          {hasPanelData(item) && item._panelData.totalPanels > 0 && (
            <div className="flex items-center gap-1 bg-purple-600/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
              <DigitalIcon className="w-3 h-3" />
              <span>{item._panelData.totalPanels}</span>
              {item._panelData.digital?.brand && (
                <span className="text-purple-200 ml-1 border-l border-purple-400/50 pl-1.5">
                  {item._panelData.digital.brand.split('/')[0]}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-gray-900 dark:text-white font-bold text-lg leading-tight line-clamp-1">
            {item["Modelo de Abrigo"] || 'Modelo Desconhecido'}
          </h3>
        </div>

        <div className="flex items-start text-gray-500 dark:text-gray-400 text-sm mb-4">
          <MapPinIcon className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0 text-eletro-orange" />
          <span className="line-clamp-2">{address} {city ? `- ${city}` : ''}</span>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ver Detalhes</span>
          <motion.div
            className="w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-700 group-hover:bg-eletro-orange group-hover:text-white flex items-center justify-center transition-colors"
            whileHover={{ scale: 1.1 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// Memoized component with custom comparison to prevent unnecessary re-renders
const EquipmentCard = React.memo(EquipmentCardComponent, (prevProps, nextProps) => {
  // Only re-render if the equipment ID changes or onClick reference changes
  return (
    prevProps.item["Nº Eletro"] === nextProps.item["Nº Eletro"] &&
    prevProps.index === nextProps.index
  );
});

export default EquipmentCard;
