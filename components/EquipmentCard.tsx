import React from 'react';
import { motion } from 'framer-motion';
import { Equipment } from '../types';
import { MapPinIcon } from './Icons';
import { cardHover, spring } from '../lib/animations';
import placeholderImg from '../assets/placeholder.jpg';

interface EquipmentCardProps {
  item: Equipment;
  onClick: (item: Equipment) => void;
  index?: number;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ item, onClick, index = 0 }) => {
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

export default EquipmentCard;
