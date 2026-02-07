import { usePortfolioMode } from '../context/PortfolioModeContext';

export default function PaperModeBanner() {
  const { mode } = usePortfolioMode();

  if (mode !== 'paper') return null;

  return (
    <div className="paper-mode-banner">
      <span className="material-symbols-outlined">science</span>
      <span>PAPER TRADING</span>
      <span className="paper-mode-banner__detail">
        Virtual $100,000 &mdash; No real money at risk
      </span>
    </div>
  );
}
