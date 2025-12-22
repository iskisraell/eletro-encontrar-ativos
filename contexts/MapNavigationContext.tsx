import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Target for map navigation
export interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

// Context type definition
interface MapNavigationContextType {
  // Fly to a specific location
  flyTo: (target: FlyToTarget, onComplete?: () => void) => void;
  // Reset view to São Paulo center
  resetView: () => void;
  // Current fly target (consumed by MapView)
  flyToTarget: FlyToTarget | null;
  // Flag to reset view (consumed by MapView)
  shouldResetView: boolean;
  // Callback when fly animation completes
  onFlyComplete: (() => void) | null;
  // Clear the fly target after MapView processes it
  clearFlyTarget: () => void;
  // Clear the reset flag after MapView processes it
  clearResetFlag: () => void;
  // Whether map is currently animating
  isFlying: boolean;
  setIsFlying: (flying: boolean) => void;
}

const MapNavigationContext = createContext<MapNavigationContextType | null>(null);

// Provider component
export const MapNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const [shouldResetView, setShouldResetView] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const onFlyCompleteRef = useRef<(() => void) | null>(null);

  const flyTo = useCallback((target: FlyToTarget, onComplete?: () => void) => {
    onFlyCompleteRef.current = onComplete || null;
    setFlyToTarget(target);
    setIsFlying(true);
  }, []);

  const resetView = useCallback(() => {
    setShouldResetView(true);
    setIsFlying(true);
  }, []);

  const clearFlyTarget = useCallback(() => {
    setFlyToTarget(null);
    // Call the completion callback if it exists
    if (onFlyCompleteRef.current) {
      onFlyCompleteRef.current();
      onFlyCompleteRef.current = null;
    }
    setIsFlying(false);
  }, []);

  const clearResetFlag = useCallback(() => {
    setShouldResetView(false);
    setIsFlying(false);
  }, []);

  return (
    <MapNavigationContext.Provider
      value={{
        flyTo,
        resetView,
        flyToTarget,
        shouldResetView,
        onFlyComplete: onFlyCompleteRef.current,
        clearFlyTarget,
        clearResetFlag,
        isFlying,
        setIsFlying,
      }}
    >
      {children}
    </MapNavigationContext.Provider>
  );
};

// Hook to use map navigation
export const useMapNavigation = (): MapNavigationContextType => {
  const context = useContext(MapNavigationContext);
  if (!context) {
    throw new Error('useMapNavigation must be used within a MapNavigationProvider');
  }
  return context;
};

// Optional hook that returns null if outside provider (for components that may or may not have context)
export const useMapNavigationOptional = (): MapNavigationContextType | null => {
  return useContext(MapNavigationContext);
};

export default MapNavigationContext;
