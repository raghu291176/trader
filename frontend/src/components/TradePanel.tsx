import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { usePortfolioMode } from '../context/PortfolioModeContext';

interface TradePanelProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  side: 'buy' | 'sell';
  currentPrice: number;
  availableCash: number;
  currentShares?: number;
  onSubmit: (order: { ticker: string; side: 'buy' | 'sell'; shares: number }) => Promise<void>;
}

export default function TradePanel({
  isOpen,
  onClose,
  ticker,
  side,
  currentPrice,
  availableCash,
  currentShares = 0,
  onSubmit,
}: TradePanelProps) {
  const { mode } = usePortfolioMode();
  const [shares, setShares] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBuy = side === 'buy';
  const estimatedTotal = shares * currentPrice;
  const maxBuyShares = currentPrice > 0 ? Math.floor(availableCash / currentPrice) : 0;

  function handleSharesChange(value: number) {
    const clamped = Math.max(1, Math.min(value, isBuy ? maxBuyShares : currentShares));
    setShares(clamped);
    setError(null);
  }

  function handleMaxClick() {
    setShares(isBuy ? maxBuyShares : currentShares);
  }

  async function handleSubmit() {
    if (shares <= 0) return;
    if (isBuy && estimatedTotal > availableCash) {
      setError('Insufficient funds');
      return;
    }
    if (!isBuy && shares > currentShares) {
      setError('Cannot sell more shares than you own');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({ ticker, side, shares });
      setShares(1);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setShares(1);
    setError(null);
    onClose();
  }

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${isBuy ? 'Buy' : 'Sell'} ${ticker}`}
      icon={isBuy ? 'add_shopping_cart' : 'sell'}
    >
      <div className="trade-panel">
        {/* Current Price */}
        <div className="trade-panel__price-row">
          <span className="trade-panel__label">Current Price</span>
          <span className="trade-panel__price">${currentPrice.toFixed(2)}</span>
        </div>

        {/* Shares Input */}
        <div className="trade-panel__field">
          <label className="trade-panel__label">Shares</label>
          <div className="trade-panel__stepper">
            <button
              className="trade-panel__stepper-btn"
              onClick={() => handleSharesChange(shares - 1)}
              disabled={shares <= 1}
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <input
              type="number"
              className="trade-panel__shares-input"
              value={shares}
              onChange={(e) => handleSharesChange(Number(e.target.value))}
              min={1}
              max={isBuy ? maxBuyShares : currentShares}
            />
            <button
              className="trade-panel__stepper-btn"
              onClick={() => handleSharesChange(shares + 1)}
              disabled={shares >= (isBuy ? maxBuyShares : currentShares)}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button className="trade-panel__max-btn" onClick={handleMaxClick}>
              MAX
            </button>
          </div>
        </div>

        {/* Available / Holdings Info */}
        <div className="trade-panel__info-row">
          {isBuy ? (
            <>
              <span>Available Cash</span>
              <span>${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </>
          ) : (
            <>
              <span>Shares Held</span>
              <span>{currentShares.toLocaleString()}</span>
            </>
          )}
        </div>

        {/* Order Summary */}
        <div className={`trade-panel__summary ${isBuy ? 'trade-panel__summary--buy' : 'trade-panel__summary--sell'}`}>
          <div className="trade-panel__summary-label">
            Estimated {isBuy ? 'Cost' : 'Proceeds'}
          </div>
          <div className="trade-panel__summary-value">
            ${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="trade-panel__summary-detail">
            {shares} share{shares !== 1 ? 's' : ''} &times; ${currentPrice.toFixed(2)}
          </div>
        </div>

        {/* Paper Mode Note */}
        {mode === 'paper' && (
          <div className="trade-panel__paper-note">
            <span className="material-symbols-outlined">science</span>
            This is a simulated trade &mdash; no real money involved
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="trade-panel__error">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="trade-panel__actions">
          <button className="btn-secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className={`trade-panel__submit ${isBuy ? 'trade-panel__submit--buy' : 'trade-panel__submit--sell'}`}
            onClick={handleSubmit}
            disabled={submitting || shares <= 0}
          >
            {submitting ? 'Processing...' : `Place ${isBuy ? 'Buy' : 'Sell'} Order`}
          </button>
        </div>
      </div>
    </ConfirmationModal>
  );
}
