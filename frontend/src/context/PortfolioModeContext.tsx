import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import type { PortfolioMode } from '../types';

interface PortfolioModeContextValue {
  mode: PortfolioMode;
  setMode: (mode: PortfolioMode) => void;
  loading: boolean;
}

const PortfolioModeContext = createContext<PortfolioModeContextValue>({
  mode: 'paper',
  setMode: () => {},
  loading: true,
});

export function PortfolioModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PortfolioMode>('paper');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getPortfolioMode()
      .then(({ mode }) => setMode(mode))
      .catch(() => setMode('paper'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortfolioModeContext.Provider value={{ mode, setMode, loading }}>
      {children}
    </PortfolioModeContext.Provider>
  );
}

export function usePortfolioMode() {
  return useContext(PortfolioModeContext);
}
