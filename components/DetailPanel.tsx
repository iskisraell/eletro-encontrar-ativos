import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Equipment, MergedEquipment, PanelLayerRecord, DigitalPanelDetails, PanelDetails } from '../types';
import { CloseIcon, MapPinIcon, InfoIcon, MaximizeIcon, TagIcon, WifiIcon, CameraIcon, DigitalIcon, ZapIcon, CalendarIcon, BoxIcon, CheckIcon, ExternalLinkIcon } from './Icons';
import MapEmbed from './MapEmbed';
import { spring } from '../lib/animations';
import placeholderImg from '../assets/placeholder.jpg';

interface DetailPanelProps {
  item: Equipment | MergedEquipment | null;
  onClose: () => void;
}

// Helper to format values
const formatValue = (key: string, value: any, id?: string): string => {
  if (key === "Tipo de Estabelecimento") {
    if (id) {
      const firstChar = String(id).charAt(0).toUpperCase();
      if (firstChar === 'T') return "Abrigos São Paulo - Totens";
      if (firstChar === 'A') return "Abrigos São Paulo - Abrigos";
    }
    const valStr = String(value).toLowerCase();
    if (valStr.includes('totem')) return "Abrigos São Paulo - Totens";
    if (valStr.includes('abrigo')) return "Abrigos São Paulo - Abrigos";
  }
  return String(value);
};

// Helper to get icons for keys
const getIconForKey = (key: string) => {
  const k = key.toLowerCase();
  if (k.includes('status')) return <CheckIcon className="w-4 h-4 text-green-500" />;
  if (k.includes('wi-fi')) return <WifiIcon className="w-4 h-4 text-blue-400" />;
  if (k.includes('câmera')) return <CameraIcon className="w-4 h-4 text-gray-400" />;
  if (k.includes('digital')) return <DigitalIcon className="w-4 h-4 text-purple-400" />;
  if (k.includes('energizado') || k.includes('luminária')) return <ZapIcon className="w-4 h-4 text-yellow-400" />;
  if (k.includes('cadastro')) return <CalendarIcon className="w-4 h-4 text-orange-400" />;
  if (k.includes('modelo') || k.includes('tipo')) return <BoxIcon className="w-4 h-4 text-indigo-400" />;
  return <TagIcon className="w-4 h-4 text-gray-400" />;
};

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

// Helper to check if item has panel data
const hasPanelData = (item: Equipment | MergedEquipment | null): item is MergedEquipment & { _panelData: PanelLayerRecord } => {
  if (!item) return false;
  return '_hasPanelData' in item && item._hasPanelData === true && '_panelData' in item && item._panelData !== undefined;
};

// Panel stat card component
const PanelStatCard: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`rounded-xl p-4 text-center ${highlight ? 'bg-eletro-orange/10 border border-eletro-orange/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
    <div className={`text-2xl font-bold ${highlight ? 'text-eletro-orange' : 'text-gray-900 dark:text-white'}`}>
      {value}
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
      {label}
    </div>
  </div>
);

// Panel detail card component
const PanelDetailCard: React.FC<{
  type: 'Digital' | 'Estático';
  details: DigitalPanelDetails | PanelDetails;
}> = ({ type, details }) => {
  const isDigital = type === 'Digital';
  const brand = isDigital && 'brand' in details ? details.brand : null;
  
  return (
    <motion.div
      className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-2 ${isDigital ? 'bg-purple-500/10 border-b border-purple-500/20' : 'bg-blue-500/10 border-b border-blue-500/20'}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDigital ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
          {isDigital ? (
            <DigitalIcon className="w-4 h-4 text-purple-500" />
          ) : (
            <BoxIcon className="w-4 h-4 text-blue-500" />
          )}
        </div>
        <div>
          <h4 className={`font-semibold ${isDigital ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
            Painel {type}
          </h4>
          {brand && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Marca: <span className="font-medium text-gray-700 dark:text-gray-300">{brand}</span>
            </span>
          )}
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {details.boxes > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{details.boxes}</div>
            <div className="text-xs text-gray-500 uppercase">Caixas</div>
          </div>
        )}
        {details.faces > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{details.faces}</div>
            <div className="text-xs text-gray-500 uppercase">Faces</div>
          </div>
        )}
        {details.position && details.position !== "-" && details.position !== "N/A" && (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{details.position}</div>
            <div className="text-xs text-gray-500 uppercase">Posição</div>
          </div>
        )}
        {details.type && details.type !== "-" && details.type !== "N/A" && (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{details.type}</div>
            <div className="text-xs text-gray-500 uppercase">Tipo</div>
          </div>
        )}
      </div>
    </motion.div>
  );
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
  const specKeys = item ? Object.keys(item).filter(key => {
    const value = item[key];
    return (
      key !== "Foto Referência" &&
      key !== "Endereço" &&
      key !== "Nº Eletro" &&
      key !== "Link Operações" &&
      key !== "Modelo de Abrigo" &&
      key !== "Status" && // Shown as badge
      key !== "Latitude" &&
      key !== "Longitude" &&
      key !== "_hasPanelData" &&
      key !== "_panelData" &&
      value !== null &&
      value !== undefined &&
      value !== "" &&
      value !== "-" &&
      value !== "N/A" &&
      typeof value !== 'object'
    );
  }) : [];

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
            className="relative w-full max-w-2xl bg-white dark:bg-gray-950 h-full shadow-2xl flex flex-col"
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
              <div className="h-72 w-full relative bg-gray-950">
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
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors z-20"
                  title="Expandir imagem"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <MaximizeIcon className="w-6 h-6" />
                </motion.button>
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-3 py-1 bg-eletro-orange rounded font-bold text-sm tracking-wide">
                      {id}
                    </div>
                    {item["Status"] && item["Status"] !== "-" && (
                      <div className={`px-3 py-1 rounded text-sm font-bold uppercase tracking-wide ${
                        item["Status"] === "Ativo" ? "bg-green-500/80" : "bg-red-500/80"
                      }`}>
                        {item["Status"]}
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold">{item["Modelo de Abrigo"] || item["Modelo"] || 'Modelo não especificado'}</h2>
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
                    {specKeys.length > 0 ? (
                      specKeys.map((key, index) => (
                        <motion.div
                          key={key}
                          className={`bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col ${
                            key === "Observações" ? "sm:col-span-2" : ""
                          }`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getIconForKey(key)}
                            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-tight">{key}</span>
                          </div>
                          <span className="text-gray-900 dark:text-gray-100 font-medium break-words leading-tight">
                            {formatValue(key, item[key], id)}
                          </span>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                        Nenhuma especificação técnica adicional disponível.
                      </div>
                    )}
                  </div>
                </section>

                {/* Dados de Painéis Section - Only shown when panel data is available */}
                {hasPanelData(item) && (
                  <section className="mt-8">
                    <div className="flex items-center mb-4 text-gray-900 dark:text-white">
                      <DigitalIcon className="w-5 h-5 mr-2 text-eletro-orange" />
                      <h3 className="font-bold text-xl">Dados de Painéis</h3>
                    </div>

                    {/* Panel Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                      <PanelStatCard 
                        label="Total Painéis" 
                        value={item._panelData.totalPanels} 
                        highlight={true}
                      />
                      {item._panelData.hasDigital && (
                        <PanelStatCard 
                          label="Digital" 
                          value="Sim"
                        />
                      )}
                      {item._panelData.hasStatic && (
                        <PanelStatCard 
                          label="Estático" 
                          value="Sim"
                        />
                      )}
                    </div>

                    {/* Digital Panel Details */}
                    {item._panelData.digital && (item._panelData.digital.boxes > 0 || item._panelData.digital.faces > 0) && (
                      <PanelDetailCard type="Digital" details={item._panelData.digital} />
                    )}

                    {/* Static Panel Details */}
                    {item._panelData.static && (item._panelData.static.boxes > 0 || item._panelData.static.faces > 0) && (
                      <PanelDetailCard type="Estático" details={item._panelData.static} />
                    )}

                    {/* Observation if available */}
                    {item._panelData.observation && item._panelData.observation !== "-" && item._panelData.observation !== "N/A" && (
                      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Observações do Painel</span>
                        <p className="text-gray-900 dark:text-white mt-1">{item._panelData.observation}</p>
                      </div>
                    )}
                  </section>
                )}

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
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-950">
              {item["Link Operações"] && typeof item["Link Operações"] === 'string' && (
                <motion.a
                  href={item["Link Operações"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-eletro-orange text-white text-center rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ExternalLinkIcon className="w-4 h-4" />
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
