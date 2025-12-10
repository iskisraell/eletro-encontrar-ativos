import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Equipment } from '../types';
import { CloseIcon, MapPinIcon, InfoIcon, MaximizeIcon } from './Icons';
import MapEmbed from './MapEmbed';
import { spring } from '../lib/animations';
import placeholderImg from '../assets/placeholder.jpg';

interface DetailPanelProps {
  item: Equipment | null;
  onClose: () => void;
}

// Animation variants
const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const panelVariants = {
  initial: { x: '100%' },
  animate: {
    x: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  },
  exit: {
    x: '100%',
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }
  }
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: spring.bouncy
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

const DetailPanel: React.FC<DetailPanelProps> = ({ item, onClose }) => {
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);

  const openImageModal = () => setIsImageModalOpen(true);
  const closeImageModal = () => setIsImageModalOpen(false);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (item) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [item]);

  // Get item data (use fallbacks when null for exit animation)
  const imageUrl = item?.["Foto Referência"] || placeholderImg;
  const id = item?.["Nº Eletro"] || 'N/A';
  const address = item?.["Endereço"] || '';

  // Filter out empty keys and specific visual keys for the "Specs" list
  const specKeys = item ? Object.keys(item).filter(key =>
    key !== "Foto Referência" &&
    key !== "Endereço" &&
    key !== "Nº Eletro" &&
    key !== "Link Operações" &&
    item[key]
  ) : [];

  return (
    <AnimatePresence mode="wait">
      {item && (
        <div key="detail-panel" className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/50 to-transparent">
              <motion.button
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <CloseIcon className="w-6 h-6" />
              </motion.button>
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
                <motion.button
                  onClick={openImageModal}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-20"
                  title="Expandir imagem"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <MaximizeIcon className="w-5 h-5" />
                </motion.button>
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white">
                  <div className="inline-block px-3 py-1 bg-eletro-orange rounded mb-2 font-bold text-sm tracking-wide">
                    {id}
                  </div>
                  <h2 className="text-3xl font-bold">{item["Modelo de Abrigo"] || 'Modelo não especificado'}</h2>
                  <div className="flex items-center mt-2 text-gray-200">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm font-light">{address}</span>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Specs Grid */}
                <section>
                  <div className="flex items-center mb-4 text-gray-900 dark:text-white">
                    <InfoIcon className="w-5 h-5 mr-2 text-eletro-orange" />
                    <h3 className="font-bold text-xl">Especificações Técnicas</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {specKeys.map((key, index) => (
                      <motion.div
                        key={key}
                        className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <span className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">{key}</span>
                        <span className="block text-gray-900 dark:text-gray-100 font-medium break-words">{item[key]}</span>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Map Section */}
                {address && (
                  <section>
                    <div className="flex items-center mb-4 text-gray-900 dark:text-white">
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

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
              {item["Link Operações"] && (
                <motion.a
                  href={item["Link Operações"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-eletro-orange text-white text-center rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Abrir no Operações
                </motion.a>
              )}
            </div>
          </motion.div>

          {/* Image Modal */}
          <AnimatePresence>
            {isImageModalOpen && (
              <motion.div
                className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
                variants={backdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={closeImageModal}
              >
                <motion.button
                  className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeImageModal();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <CloseIcon className="w-8 h-8" />
                </motion.button>
                <motion.img
                  src={imageUrl}
                  alt={id}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  variants={modalVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={(e) => e.stopPropagation()}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImg;
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DetailPanel;
