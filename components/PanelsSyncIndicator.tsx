import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Optimized sync indicator for panel data synchronization.
 * Uses CSS animations for infinite loops instead of Framer Motion to reduce JS overhead.
 */

// São Paulo bus stop and Eletromidia-themed sync messages
const SYNC_MESSAGES = [
  "Sincronizando painéis digitais...",
  "Conectando com os pontos de ônibus...",
  "Mapeando abrigos de SP...",
  "Calibrando telas urbanas...",
  "Atualizando inventário de mídia...",
  "Buscando dados na Paulista...",
  "Escaneando rotas de ônibus...",
  "Carregando dados da matrix...",
  "Descobrindo novos abrigos...",
  "Consultando a rede SPTrans...",
  "Sincronizando BOE, LG, CHINA...",
  "Iluminando a cidade...",
  "Conectando Zona Norte a Zona Sul...",
  "Digitalizando pontos de parada...",
  "Atualizando o mapa urbano...",
];

// Fun emojis to accompany messages
const MESSAGE_EMOJIS = [
  "🚌", "🏙️", "📺", "✨", "📡", "🗺️", "🚏", "💡", "🔄", "📱",
  "🎯", "⚡", "🌆", "🔍", "🏗️"
];

// Reduced grid size for better performance (3x8 instead of 5x12)
const GRID_ROWS = 3;
const GRID_COLS = 8;

interface PanelsSyncIndicatorProps {
  isVisible: boolean;
  className?: string;
}

const PanelsSyncIndicator: React.FC<PanelsSyncIndicatorProps> = ({
  isVisible,
  className = ''
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [pixelRows, setPixelRows] = useState<boolean[][]>(() => 
    Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false))
  );

  // Rotate messages every 2.5 seconds
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % SYNC_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Animate pixel grid - reduced frequency (300ms instead of 150ms)
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setPixelRows(prev => {
        const newGrid = prev.map(row => [...row]);
        // Reduced updates per tick (4 instead of 8)
        for (let i = 0; i < 4; i++) {
          const r = Math.floor(Math.random() * GRID_ROWS);
          const c = Math.floor(Math.random() * GRID_COLS);
          if (newGrid[r]) {
            newGrid[r][c] = !newGrid[r][c];
          }
        }
        return newGrid;
      });
    }, 300); // Reduced from 150ms to 300ms

    return () => clearInterval(interval);
  }, [isVisible]);

  // Memoize the pixel grid to prevent recreation
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
                  : 'bg-gray-800 scale-100'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  ), [pixelRows]);

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
          <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Header bar - mimics digital panel header */}
            <div className="bg-gradient-to-r from-eletro-orange via-orange-500 to-amber-500 h-2" />
            
            <div className="p-4 min-w-[280px]">
              {/* Digital Panel Display */}
              <div className="mb-4">
                {/* Panel frame */}
                <div className="bg-gray-950 rounded-lg p-3 border-2 border-gray-600 shadow-inner relative overflow-hidden">
                  {/* Glow effect - CSS animation instead of Framer Motion */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 sync-glow" />
                  
                  {/* Pixel Grid */}
                  {pixelGrid}

                  {/* Scanline effect - CSS animation instead of Framer Motion */}
                  <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent sync-scanline" />
                </div>
              </div>

              {/* Message Display */}
              <div className="flex items-center gap-3">
                {/* Animated emoji - keep Framer Motion for key-based animation */}
                <motion.span
                  key={messageIndex}
                  className="text-2xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {MESSAGE_EMOJIS[messageIndex % MESSAGE_EMOJIS.length]}
                </motion.span>

                {/* Message text */}
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={messageIndex}
                      className="text-sm text-gray-300 font-medium"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {SYNC_MESSAGES[messageIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Spinning loader - CSS animation instead of Framer Motion */}
                <div className="w-5 h-5 border-2 border-eletro-orange border-t-transparent rounded-full sync-spin" />
              </div>

              {/* Progress dots - CSS animations instead of Framer Motion */}
              <div className="flex justify-center gap-1 mt-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full bg-eletro-orange sync-dot sync-dot-${i}`}
                  />
                ))}
              </div>
            </div>

            {/* Footer with branding */}
            <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Eletromidia Panel Sync</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Conectado
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(PanelsSyncIndicator);
