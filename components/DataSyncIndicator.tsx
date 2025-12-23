import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Data Sync Indicator - displays sync progress for equipment data.
 * 
 * Features:
 * - Shows progress during initial data fetch and background sync
 * - Fun rotating messages about SP bus stops and Eletromidia
 * - Digital panel-inspired visual with pixel grid animation
 * - Progress bar with current/total counts
 * - Dark mode support following Eletromidia design system
 * - Estimated time remaining
 */

// Sync phase types
export type SyncPhase = 'initializing' | 'loading' | 'syncing_main' | 'syncing_panels' | 'syncing_abrigoamigo' | 'preparing_map' | 'complete';

// Props for sync progress
export interface SyncProgress {
  current: number;
  total: number;
  phase: SyncPhase;
  // Optional: Abrigo Amigo specific stats
  abrigoAmigoStats?: {
    claro: number;
    governo: number;
  };
}

// São Paulo bus stop and Eletromidia-themed sync messages
const SYNC_MESSAGES: Record<SyncPhase, string[]> = {
  initializing: [
    "Preparando conexão...",
    "Inicializando banco de dados...",
    "Acordando os servidores...",
  ],
  loading: [
    "Carregando primeiros equipamentos...",
    "Buscando abrigos próximos...",
    "Conectando com a rede...",
  ],
  syncing_main: [
    "Sincronizando equipamentos...",
    "Mapeando pontos de ônibus...",
    "Descobrindo abrigos de SP...",
    "Conectando Zona Norte a Zona Sul...",
    "Escaneando rotas urbanas...",
    "Atualizando inventário...",
    "Carregando dados da Paulista...",
    "Buscando pontos da Consolação...",
    "Mapeando a Vila Madalena...",
    "Digitalizando Pinheiros...",
    "Explorando a Faria Lima...",
    "Conectando Itaim Bibi...",
    "Sincronizando Moema...",
    "Atualizando Jardins...",
    "Carregando Brooklin...",
  ],
  syncing_panels: [
    "Sincronizando painéis digitais...",
    "Calibrando telas urbanas...",
    "Conectando painéis BOE, LG, CHINA...",
    "Atualizando faces de mídia...",
    "Iluminando a cidade...",
    "Digitalizando pontos de parada...",
  ],
  syncing_abrigoamigo: [
    "Sincronizando Abrigos Amigos...",
    "Conectando parceiros Claro...",
    "Carregando pontos do Governo...",
    "Mapeando abrigos especiais...",
    "Descobrindo parcerias urbanas...",
    "Atualizando rede de abrigos...",
    "Sincronizando benefícios...",
    "Carregando programa Abrigo Amigo...",
  ],
  preparing_map: [
    "Preparando mapa interativo...",
    "Processando coordenadas GPS...",
    "Gerando marcadores no mapa...",
    "Indexando pontos de ônibus...",
    "Otimizando clusters de abrigos...",
    "Construindo visualização...",
    "Mapeando São Paulo...",
    "Preparando exploração urbana...",
  ],
  complete: [
    "Sincronização completa!",
    "Dados atualizados!",
    "Tudo pronto!",
  ],
};

// Fun emojis by phase
const PHASE_EMOJIS: Record<SyncPhase, string[]> = {
  initializing: ["🔌", "💫", "🌟"],
  loading: ["📡", "🚀", "⚡"],
  syncing_main: ["🚌", "🏙️", "🗺️", "🚏", "📍", "🎯", "🏗️", "🌆", "🔄", "📊", "✨", "💡", "🔍", "📱", "🌐"],
  syncing_panels: ["📺", "💡", "✨", "🖥️", "📡", "🎬"],
  syncing_abrigoamigo: ["🏠", "🤝", "📱", "🏛️", "💚", "❤️", "🎯", "✨"],
  preparing_map: ["🗺️", "📍", "🎯", "🧭", "🌍", "📌", "🔍", "🛰️"],
  complete: ["✅", "🎉", "🚀"],
};

// Reduced grid size for performance (3x8)
const GRID_ROWS = 3;
const GRID_COLS = 8;

interface DataSyncIndicatorProps {
  isVisible: boolean;
  progress: SyncProgress | null;
  className?: string;
}

const DataSyncIndicator: React.FC<DataSyncIndicatorProps> = ({
  isVisible,
  progress,
  className = ''
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [pixelRows, setPixelRows] = useState<boolean[][]>(() =>
    Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false))
  );

  const phase = progress?.phase || 'initializing';
  const messages = SYNC_MESSAGES[phase];
  const emojis = PHASE_EMOJIS[phase];

  // Rotate messages every 2.5 seconds
  useEffect(() => {
    if (!isVisible) return;

    setMessageIndex(0); // Reset when phase changes

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible, phase, messages.length]);

  // Animate pixel grid
  useEffect(() => {
    if (!isVisible || phase === 'complete') return;

    const interval = setInterval(() => {
      setPixelRows(prev => {
        const newGrid = prev.map(row => [...row]);
        for (let i = 0; i < 4; i++) {
          const r = Math.floor(Math.random() * GRID_ROWS);
          const c = Math.floor(Math.random() * GRID_COLS);
          if (newGrid[r]) {
            newGrid[r][c] = !newGrid[r][c];
          }
        }
        return newGrid;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isVisible, phase]);

  // Calculate progress percentage
  const percentage = useMemo(() => {
    if (!progress || progress.total === 0) return 0;
    return Math.min(100, Math.round((progress.current / progress.total) * 100));
  }, [progress]);

  // Estimate time remaining (rough estimate: ~100 records/second)
  const estimatedTime = useMemo(() => {
    if (!progress || progress.total === 0 || phase === 'complete') return null;
    const remaining = progress.total - progress.current;
    const seconds = Math.ceil(remaining / 100);
    if (seconds < 60) return `~${seconds}s restantes`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} min restantes`;
  }, [progress, phase]);

  // Format numbers with locale
  const formatNumber = (num: number) => num.toLocaleString('pt-BR');

  // Memoize pixel grid
  const pixelGrid = useMemo(() => (
    <div className="relative z-10 flex flex-col gap-1">
      {pixelRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 justify-center">
          {row.map((isLit, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`w-3 h-3 rounded-sm transition-all duration-200 ${
                isLit
                  ? 'bg-eletro-orange shadow-lg shadow-orange-500/50 scale-110'
                  : 'bg-gray-800 dark:bg-gray-700 scale-100'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  ), [pixelRows]);

  // Phase label for footer
  const phaseLabel = useMemo(() => {
    switch (phase) {
      case 'initializing': return 'Inicializando';
      case 'loading': return 'Carregando dados';
      case 'syncing_main': return 'Sincronizando equipamentos';
      case 'syncing_panels': return 'Sincronizando painéis';
      case 'syncing_abrigoamigo': return 'Sincronizando Abrigos Amigos';
      case 'preparing_map': return 'Preparando mapa';
      case 'complete': return 'Completo';
      default: return 'Sincronizando';
    }
  }, [phase]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed bottom-6 right-6 z-50 ${className}`}
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header bar - Eletromidia orange gradient */}
            <div className="bg-gradient-to-r from-eletro-orange via-orange-500 to-amber-500 h-2" />

            <div className="p-4 min-w-[320px]">
              {/* Digital Panel Display */}
              <div className="mb-4">
                <div className="bg-gray-100 dark:bg-gray-950 rounded-lg p-3 border-2 border-gray-300 dark:border-gray-600 shadow-inner relative overflow-hidden">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 sync-glow" />

                  {/* Pixel Grid */}
                  {pixelGrid}

                  {/* Scanline effect */}
                  <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent sync-scanline" />
                </div>
              </div>

              {/* Message Display */}
              <div className="flex items-center gap-3 mb-4">
                {/* Animated emoji */}
                <motion.span
                  key={`${phase}-${messageIndex}`}
                  className="text-2xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {emojis[messageIndex % emojis.length]}
                </motion.span>

                {/* Message text */}
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${phase}-${messageIndex}`}
                      className="text-sm text-gray-700 dark:text-gray-300 font-medium"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {messages[messageIndex % messages.length]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Spinning loader (not shown when complete) */}
                {phase !== 'complete' && (
                  <div className="w-5 h-5 border-2 border-eletro-orange border-t-transparent rounded-full sync-spin" />
                )}
              </div>

              {/* Progress Bar */}
              {progress && progress.total > 0 && (
                <div className="mb-3">
                  {/* Progress bar track */}
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-eletro-orange to-amber-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>

                  {/* Progress stats */}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {formatNumber(progress.current)} / {formatNumber(progress.total)}
                    </span>
                    <span className="text-eletro-orange font-bold">
                      {percentage}%
                    </span>
                  </div>
                </div>
              )}

              {/* Abrigo Amigo Stats - Show during syncing_abrigoamigo phase */}
              {phase === 'syncing_abrigoamigo' && progress?.abrigoAmigoStats && (
                <motion.div
                  className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">
                    Parceiros Abrigo Amigo
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Claro stats */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)' }}>
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: '#dc3545' }}
                      />
                      <span className="text-sm font-bold" style={{ color: '#dc3545' }}>
                        {formatNumber(progress.abrigoAmigoStats.claro)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Claro</span>
                    </div>
                    {/* Governo stats */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(49, 177, 28, 0.1)' }}>
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: '#31b11c' }}
                      />
                      <span className="text-sm font-bold" style={{ color: '#31b11c' }}>
                        {formatNumber(progress.abrigoAmigoStats.governo)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Governo</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Time estimate */}
              {estimatedTime && phase !== 'complete' && (
                <div className="text-center mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {estimatedTime}
                  </span>
                </div>
              )}

              {/* Progress dots */}
              {phase !== 'complete' && (
                <div className="flex justify-center gap-1 mt-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full bg-eletro-orange sync-dot sync-dot-${i}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with branding */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">{phaseLabel}</span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    phase === 'complete' 
                      ? 'bg-green-500' 
                      : 'bg-green-500 animate-pulse'
                  }`} />
                  {phase === 'complete' ? 'Pronto' : 'Conectado'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(DataSyncIndicator);
