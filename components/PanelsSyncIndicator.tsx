import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Creative sync indicator for panel data synchronization.
 * Features animated bus stop/panel display with São Paulo-themed messages.
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

interface PanelsSyncIndicatorProps {
  isVisible: boolean;
  className?: string;
}

const PanelsSyncIndicator: React.FC<PanelsSyncIndicatorProps> = ({
  isVisible,
  className = ''
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [pixelRows, setPixelRows] = useState<boolean[][]>([]);

  // Initialize pixel grid
  useEffect(() => {
    const rows = 5;
    const cols = 12;
    const initialGrid = Array(rows).fill(null).map(() => 
      Array(cols).fill(false)
    );
    setPixelRows(initialGrid);
  }, []);

  // Rotate messages every 2.5 seconds
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % SYNC_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Animate pixel grid - random "scan" effect
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setPixelRows(prev => {
        const newGrid = prev.map(row => [...row]);
        const rows = newGrid.length;
        const cols = newGrid[0]?.length || 0;
        
        // Random pixel updates for scanning effect
        for (let i = 0; i < 8; i++) {
          const r = Math.floor(Math.random() * rows);
          const c = Math.floor(Math.random() * cols);
          if (newGrid[r]) {
            newGrid[r][c] = !newGrid[r][c];
          }
        }
        
        return newGrid;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isVisible]);

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
                  {/* Glow effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Pixel Grid */}
                  <div className="relative z-10 flex flex-col gap-1">
                    {pixelRows.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-1 justify-center">
                        {row.map((isLit, colIndex) => (
                          <motion.div
                            key={`${rowIndex}-${colIndex}`}
                            className={`w-3 h-3 rounded-sm ${
                              isLit 
                                ? 'bg-eletro-orange shadow-lg shadow-orange-500/50' 
                                : 'bg-gray-800'
                            }`}
                            animate={{
                              scale: isLit ? [1, 1.1, 1] : 1,
                            }}
                            transition={{
                              duration: 0.3,
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Scanline effect */}
                  <motion.div
                    className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
                    animate={{
                      top: ['0%', '100%', '0%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </div>
              </div>

              {/* Message Display */}
              <div className="flex items-center gap-3">
                {/* Animated emoji */}
                <motion.span
                  key={messageIndex}
                  className="text-2xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
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

                {/* Spinning loader */}
                <motion.div
                  className="w-5 h-5 border-2 border-eletro-orange border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1 mt-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-eletro-orange"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
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

export default PanelsSyncIndicator;
