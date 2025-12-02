import React, { useEffect } from 'react';
import { Equipment } from '../types';
import { CloseIcon, MapPinIcon, InfoIcon, MaximizeIcon } from './Icons';
import MapEmbed from './MapEmbed';
import placeholderImg from '../assets/placeholder.jpg';

interface DetailPanelProps {
  item: Equipment | null;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ item, onClose }) => {
  const [activeItem, setActiveItem] = React.useState<Equipment | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = React.useState(false);

  const openImageModal = () => {
    setIsImageModalOpen(true);
    setTimeout(() => setIsImageModalVisible(true), 10);
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
    setTimeout(() => setIsImageModalOpen(false), 300);
  };

  useEffect(() => {
    if (item) {
      setActiveItem(item);
      // Use setTimeout to ensure the browser paints the initial "closed" state
      // before applying the "open" state, triggering the transition.
      setTimeout(() => setIsVisible(true), 50);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setActiveItem(null);
        document.body.style.overflow = 'unset';
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [item]);

  if (!activeItem) return null;

  const imageUrl = activeItem["Foto Referência"] || placeholderImg;
  const id = activeItem["Nº Eletro"] || 'N/A';
  const address = activeItem["Endereço"] || '';

  // Filter out empty keys and specific visual keys for the "Specs" list
  const specKeys = Object.keys(activeItem).filter(key =>
    key !== "Foto Referência" &&
    key !== "Endereço" &&
    key !== "Nº Eletro" &&
    key !== "Link Operações" &&
    activeItem[key] // Only show if value exists
  );

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-visibility duration-300 ${!activeItem ? 'invisible' : 'visible'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'
          }`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className={`relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/50 to-transparent">
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Image */}
          <div className="h-72 w-full relative bg-gray-900">
            <img
              src={imageUrl}
              alt={id}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = placeholderImg;
              }}
            />
            <button
              onClick={openImageModal}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-20"
              title="Expandir imagem"
            >
              <MaximizeIcon className="w-5 h-5" />
            </button>
            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white">
              <div className="inline-block px-3 py-1 bg-eletro-orange rounded mb-2 font-bold text-sm tracking-wide">
                {id}
              </div>
              <h2 className="text-3xl font-bold">{activeItem["Modelo de Abrigo"] || 'Modelo não especificado'}</h2>
              <div className="flex items-center mt-2 text-gray-200">
                <MapPinIcon className="w-4 h-4 mr-2" />
                <span className="text-sm font-light">{address}</span>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">

            {/* Specs Grid */}
            <section>
              <div className="flex items-center mb-4 text-gray-900">
                <InfoIcon className="w-5 h-5 mr-2 text-eletro-orange" />
                <h3 className="font-bold text-xl">Especificações Técnicas</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {specKeys.map((key) => (
                  <div key={key} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs font-semibold text-gray-400 uppercase mb-1">{key}</span>
                    <span className="block text-gray-900 font-medium break-words">{activeItem[key]}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Map Section */}
            {address && (
              <section>
                <div className="flex items-center mb-4 text-gray-900">
                  <MapPinIcon className="w-5 h-5 mr-2 text-eletro-orange" />
                  <h3 className="font-bold text-xl">Localização</h3>
                </div>
                <MapEmbed address={address} />
                <div className="mt-2 text-right">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-eletro-orange hover:underline font-medium"
                  >
                    Abrir no Google Maps &rarr;
                  </a>
                </div>
              </section>
            )}

          </div>
        </div>

        {/* Footer Actions (Optional) */}
        <div className="p-4 border-t border-gray-100 bg-white">
          {activeItem["Link Operações"] && (
            <a
              href={activeItem["Link Operações"]}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-eletro-orange text-white text-center rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Abrir no Operações
            </a>
          )}
        </div>

      </div>

      {/* Image Modal */}
      {isImageModalOpen && (
        <div
          className={`fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isImageModalVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeImageModal}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              closeImageModal();
            }}
          >
            <CloseIcon className="w-8 h-8" />
          </button>
          <img
            src={imageUrl}
            alt={id}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            onError={(e) => {
              (e.target as HTMLImageElement).src = placeholderImg;
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DetailPanel;
