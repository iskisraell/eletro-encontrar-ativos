import React from 'react';
import { Equipment } from '../types';
import { MapPinIcon } from './Icons';
import placeholderImg from '../assets/placeholder.jpg';

interface EquipmentCardProps {
  item: Equipment;
  onClick: (item: Equipment) => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ item, onClick }) => {
  // Fallback image if "Foto Referência" is missing or broken
  const imageUrl = item["Foto Referência"] || placeholderImg;
  const id = item["Nº Eletro"] || 'Sem ID';
  const address = item["Endereço"] || 'Endereço não informado';
  const city = item["Cidade"];

  return (
    <div
      onClick={() => onClick(item)}
      className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden flex flex-col h-full"
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={`Equipamento ${id}`}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
          <h3 className="text-gray-900 font-bold text-lg leading-tight line-clamp-1">
            {item["Modelo de Abrigo"] || 'Modelo Desconhecido'}
          </h3>
        </div>

        <div className="flex items-start text-gray-500 text-sm mb-4">
          <MapPinIcon className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0 text-eletro-orange" />
          <span className="line-clamp-2">{address} {city ? `- ${city}` : ''}</span>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ver Detalhes</span>
          <div className="w-6 h-6 rounded-full bg-gray-50 group-hover:bg-eletro-orange group-hover:text-white flex items-center justify-center transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentCard;
