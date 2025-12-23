import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Equipment, MergedEquipment, PanelLayerRecord, DigitalPanelDetails, PanelDetails, AbrigoAmigoRecord } from '../types';
import { CloseIcon, MapPinIcon, InfoIcon, MaximizeIcon, TagIcon, WifiIcon, CameraIcon, DigitalIcon, ZapIcon, CalendarIcon, BoxIcon, CheckIcon, ExternalLinkIcon, HeartIcon } from './Icons';
import MapEmbed from './MapEmbed';
import { spring } from '../lib/animations';
import placeholderImg from '../assets/placeholder.jpg';
import { cn } from '../lib/utils';

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
  if (k.includes('status')) return <CheckIcon className="w-4 h-4 text-emerald-500" />;
  if (k.includes('wi-fi')) return <WifiIcon className="w-4 h-4 text-sky-400" />;
  if (k.includes('câmera')) return <CameraIcon className="w-4 h-4 text-zinc-400" />;
  if (k.includes('digital')) return <DigitalIcon className="w-4 h-4 text-violet-400" />;
  if (k.includes('energizado') || k.includes('luminária')) return <ZapIcon className="w-4 h-4 text-amber-400" />;
  if (k.includes('cadastro')) return <CalendarIcon className="w-4 h-4 text-orange-400" />;
  if (k.includes('modelo') || k.includes('tipo')) return <BoxIcon className="w-4 h-4 text-indigo-400" />;
  return <TagIcon className="w-4 h-4 text-zinc-400" />;
};

// Animation variants
const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const panelVariants = {
  initial: { x: '100%', opacity: 0.8 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const }
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as const }
  }
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: spring.bouncy
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.2 }
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1
    }
  }
};

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Helper to check if item has panel data
const hasPanelData = (item: Equipment | MergedEquipment | null): item is MergedEquipment & { _panelData: PanelLayerRecord } => {
  if (!item) return false;
  return '_hasPanelData' in item && item._hasPanelData === true && '_panelData' in item && item._panelData !== undefined;
};

// Helper to check if item has Abrigo Amigo data
const hasAbrigoAmigoData = (item: Equipment | MergedEquipment | null): item is MergedEquipment & { _abrigoAmigoData: AbrigoAmigoRecord } => {
  if (!item) return false;
  return '_hasAbrigoAmigo' in item && item._hasAbrigoAmigo === true && '_abrigoAmigoData' in item && item._abrigoAmigoData !== undefined;
};

// Get Abrigo Amigo badge color based on client
const getAbrigoAmigoColor = (cliente: string | undefined): string => {
  const normalizedClient = cliente?.toLowerCase().trim();
  if (normalizedClient === 'claro') return '#dc3545'; // Red for Claro
  if (normalizedClient === 'governo') return '#31b11c'; // Green for Governo
  return '#6b7280'; // Gray fallback
};

// Panel stat card component - refined design
const PanelStatCard: React.FC<{ label: string; value: string | number; highlight?: boolean; icon?: React.ReactNode }> = ({ label, value, highlight, icon }) => (
  <div className={cn(
    "rounded-2xl p-4 text-center transition-all duration-200",
    highlight 
      ? 'bg-gradient-to-br from-eletro-orange/15 to-orange-500/5 border border-eletro-orange/20 shadow-sm shadow-eletro-orange/10' 
      : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50'
  )}>
    {icon && <div className="mb-2 flex justify-center">{icon}</div>}
    <div className={cn(
      "text-2xl font-bold tracking-tight",
      highlight ? 'text-eletro-orange' : 'text-zinc-900 dark:text-white'
    )}>
      {value}
    </div>
    <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1.5 font-medium">
      {label}
    </div>
  </div>
);

// Panel detail card component - refined design
const PanelDetailCard: React.FC<{
  type: 'Digital' | 'Estático';
  details: DigitalPanelDetails | PanelDetails;
}> = ({ type, details }) => {
  const isDigital = type === 'Digital';
  const brand = isDigital && 'brand' in details ? details.brand : null;
  
  return (
    <motion.div
      className={cn(
        "rounded-2xl border overflow-hidden mb-4 transition-all duration-200",
        isDigital 
          ? "bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-zinc-900 border-violet-200/50 dark:border-violet-800/30"
          : "bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/20 dark:to-zinc-900 border-sky-200/50 dark:border-sky-800/30"
      )}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      {/* Header */}
      <div className={cn(
        "px-5 py-4 flex items-center gap-3 border-b",
        isDigital ? 'border-violet-100 dark:border-violet-800/20' : 'border-sky-100 dark:border-sky-800/20'
      )}>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
          isDigital 
            ? 'bg-gradient-to-br from-violet-500 to-violet-600' 
            : 'bg-gradient-to-br from-sky-500 to-sky-600'
        )}>
          {isDigital ? (
            <DigitalIcon className="w-5 h-5 text-white" />
          ) : (
            <BoxIcon className="w-5 h-5 text-white" />
          )}
        </div>
        <div>
          <h4 className={cn(
            "font-bold text-base",
            isDigital ? 'text-violet-700 dark:text-violet-300' : 'text-sky-700 dark:text-sky-300'
          )}>
            Painel {type}
          </h4>
          {brand && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Marca: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{brand}</span>
            </span>
          )}
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {details.boxes > 0 && (
          <div className="text-center">
            <div className="text-xl font-bold text-zinc-900 dark:text-white">{details.boxes}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mt-0.5">Caixas</div>
          </div>
        )}
        {details.faces > 0 && (
          <div className="text-center">
            <div className="text-xl font-bold text-zinc-900 dark:text-white">{details.faces}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mt-0.5">Faces</div>
          </div>
        )}
        {details.position && details.position !== "-" && details.position !== "N/A" && (
          <div className="text-center">
            <div className="text-xl font-bold text-zinc-900 dark:text-white">{details.position}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mt-0.5">Posição</div>
          </div>
        )}
        {details.type && details.type !== "-" && details.type !== "N/A" && (
          <div className="text-center">
            <div className="text-xl font-bold text-zinc-900 dark:text-white">{details.type}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mt-0.5">Tipo</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Section header component
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; className?: string }> = ({ icon, title, className }) => (
  <div className={cn("flex items-center gap-3 mb-5", className)}>
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-eletro-orange to-orange-600 flex items-center justify-center shadow-sm shadow-eletro-orange/20">
      <span className="w-4.5 h-4.5 text-white [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
    </div>
    <h3 className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">{title}</h3>
  </div>
);

const DetailPanelComponent: React.FC<DetailPanelProps> = ({ item, onClose }) => {
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
  const modelName = item?.["Modelo de Abrigo"] || item?.["Modelo"] || 'Modelo não especificado';

  // Filter out empty keys and specific visual keys for the "Specs" list
  const specKeys = item ? Object.keys(item).filter(key => {
    const value = item[key];
    return (
      key !== "Foto Referência" &&
      key !== "Endereço" &&
      key !== "Nº Eletro" &&
      key !== "Link Operações" &&
      key !== "Modelo de Abrigo" &&
      key !== "Modelo" &&
      key !== "Status" &&
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
        <div key="detail-panel" className="fixed inset-0 z-[1100] flex justify-end">
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Hero Image Section */}
              <div className="relative h-80 w-full bg-zinc-950">
                <img
                  src={imageUrl}
                  alt={id}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImg;
                  }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                
                {/* Top Actions */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
                  <motion.button
                    onClick={onClose}
                    className="p-2.5 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white rounded-xl transition-all border border-white/10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CloseIcon className="w-5 h-5" />
                  </motion.button>
                  
                  <motion.button
                    onClick={openImageModal}
                    className="p-2.5 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white rounded-xl transition-all border border-white/10"
                    title="Expandir imagem"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MaximizeIcon className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Hero Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <motion.div 
                      className="px-3 py-1.5 bg-eletro-orange rounded-lg font-bold text-sm tracking-wide shadow-lg shadow-eletro-orange/30"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {id}
                    </motion.div>
                    {hasAbrigoAmigoData(item) && item._abrigoAmigoData.enabled && (
                      <motion.div 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide shadow-lg"
                        style={{ backgroundColor: getAbrigoAmigoColor(item._abrigoAmigoData.cliente) }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.12 }}
                      >
                        <HeartIcon className="w-3.5 h-3.5 fill-current" />
                        <span>Abrigo Amigo</span>
                        <span className="text-xs opacity-80 ml-0.5">({item._abrigoAmigoData.cliente})</span>
                      </motion.div>
                    )}
                    {item["Status"] && item["Status"] !== "-" && (
                      <motion.div 
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide shadow-lg",
                          item["Status"] === "Ativo" 
                            ? "bg-emerald-500 shadow-emerald-500/30" 
                            : "bg-rose-500 shadow-rose-500/30"
                        )}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                      >
                        {item["Status"]}
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Title */}
                  <motion.h2 
                    className="text-3xl font-bold tracking-tight mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {modelName}
                  </motion.h2>
                  
                  {/* Screen Model - if available */}
                  {item["Modelo"] && item["Modelo"] !== modelName && item["Modelo"] !== "-" && (
                    <motion.div 
                      className="text-white/70 text-sm font-medium mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.22 }}
                    >
                      {item["Modelo"]}
                    </motion.div>
                  )}
                  
                  {/* Address */}
                  {address && (
                    <motion.div 
                      className="flex items-start gap-2 text-white/80"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                    >
                      <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-snug">{address}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Content Sections */}
              <motion.div 
                className="p-6 space-y-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {/* Specs Grid */}
                <motion.section variants={staggerItem}>
                  <SectionHeader icon={<InfoIcon />} title="Especificações Técnicas" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {specKeys.length > 0 ? (
                      specKeys.map((key, index) => (
                        <motion.div
                          key={key}
                          className={cn(
                            "bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col group hover:border-eletro-orange/30 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 transition-all duration-200",
                            key === "Observações" ? "sm:col-span-2" : ""
                          )}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + index * 0.02 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-eletro-orange/10 transition-colors">
                              {getIconForKey(key)}
                            </div>
                            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{key}</span>
                          </div>
                          <span className="text-zinc-900 dark:text-zinc-100 font-medium break-words leading-snug pl-0.5">
                            {formatValue(key, item[key], id)}
                          </span>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-10 text-center text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                        Nenhuma especificação técnica adicional disponível.
                      </div>
                    )}
                  </div>
                </motion.section>

                {/* Dados de Painéis Section - Only shown when panel data is available */}
                {hasPanelData(item) && (
                  <motion.section variants={staggerItem}>
                    <SectionHeader icon={<DigitalIcon />} title="Dados de Painéis" />

                    {/* Panel Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      <PanelStatCard 
                        label="Total Painéis" 
                        value={item._panelData.totalPanels} 
                        highlight={true}
                      />
                      {item._panelData.hasDigital && (
                        <PanelStatCard 
                          label="Digital" 
                          value="Sim"
                          icon={<DigitalIcon className="w-5 h-5 text-violet-500" />}
                        />
                      )}
                      {item._panelData.hasStatic && (
                        <PanelStatCard 
                          label="Estático" 
                          value="Sim"
                          icon={<BoxIcon className="w-5 h-5 text-sky-500" />}
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
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/30">
                        <div className="flex items-center gap-2 mb-2">
                          <TagIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider font-semibold">Observações do Painel</span>
                        </div>
                        <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">{item._panelData.observation}</p>
                      </div>
                    )}
                  </motion.section>
                )}

                {/* Map Section */}
                {address && (
                  <motion.section variants={staggerItem}>
                    <SectionHeader icon={<MapPinIcon />} title="Localização" />
                    
                    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <MapEmbed address={address} />
                    </div>
                    
                    <div className="mt-3 text-right">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-eletro-orange hover:text-orange-600 font-semibold transition-colors"
                      >
                        Abrir no Google Maps
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.section>
                )}
              </motion.div>
            </div>

            {/* Footer Actions */}
            {item["Link Operações"] && typeof item["Link Operações"] === 'string' && (
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
                <motion.a
                  href={item["Link Operações"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-eletro-orange to-orange-500 text-white text-center rounded-xl font-bold shadow-lg shadow-eletro-orange/25 hover:shadow-xl hover:shadow-eletro-orange/30 transition-all"
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <ExternalLinkIcon className="w-4 h-4" />
                  Abrir no Operações
                </motion.a>
              </div>
            )}
          </motion.div>

          {/* Image Modal */}
          <AnimatePresence>
            {isImageModalOpen && (
              <motion.div
                className="fixed inset-0 z-[1200] bg-black/95 flex items-center justify-center p-4"
                variants={backdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={closeImageModal}
              >
                <motion.button
                  className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeImageModal();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CloseIcon className="w-6 h-6" />
                </motion.button>
                <motion.img
                  src={imageUrl}
                  alt={id}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
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

// Memoized DetailPanel component to prevent unnecessary re-renders
const DetailPanel = React.memo(DetailPanelComponent);

export default DetailPanel;
