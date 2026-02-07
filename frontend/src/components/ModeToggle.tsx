import type { PortfolioMode } from '../types';

interface ModeToggleProps {
  mode: PortfolioMode;
  onModeChange: (mode: PortfolioMode) => void;
  disabled?: boolean;
}

export default function ModeToggle({ mode, onModeChange, disabled }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-toggle__btn ${mode === 'paper' ? 'active' : ''}`}
        onClick={() => onModeChange('paper')}
        disabled={disabled}
      >
        <span className="material-symbols-outlined">science</span>
        Paper
      </button>
      <button
        className={`mode-toggle__btn ${mode === 'live' ? 'active' : ''}`}
        onClick={() => onModeChange('live')}
        disabled={disabled}
      >
        <span className="material-symbols-outlined">attach_money</span>
        Live
      </button>
    </div>
  );
}
