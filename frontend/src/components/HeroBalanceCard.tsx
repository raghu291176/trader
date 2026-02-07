/**
 * Hero Balance Card - Glassmorphic Portfolio Value Display
 * Follows "Invisible Complexity" design philosophy
 */

import type { PortfolioMode } from '../types'

interface HeroBalanceCardProps {
  portfolioValue: number
  dayChange: number
  dayChangePercent: number
  mode?: PortfolioMode
}

export default function HeroBalanceCard({
  portfolioValue,
  dayChange,
  dayChangePercent,
  mode
}: HeroBalanceCardProps) {
  const isPositive = dayChange >= 0

  return (
    <div className={`hero-balance-card ${mode === 'paper' ? 'hero-balance-card--paper' : ''}`}>
      <div className="hero-balance-card__content">
        <div className="hero-balance-card__label">
          {mode === 'paper' ? 'Paper Portfolio Value' : 'Portfolio Value'}
          {mode === 'paper' && (
            <span className="hero-balance-card__mode-badge">
              <span className="material-symbols-outlined">science</span>
              PAPER
            </span>
          )}
        </div>
        <div className="hero-balance-card__value">
          ${portfolioValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
        <div className={`hero-balance-card__change ${isPositive ? 'hero-balance-card__change--positive' : ''}`}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>
            {isPositive ? '+' : ''}${Math.abs(dayChange).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
          <span>
            ({isPositive ? '+' : ''}{dayChangePercent.toFixed(2)}%)
          </span>
          <span className="hero-balance-card__today">
            Today
          </span>
        </div>
      </div>
    </div>
  )
}
