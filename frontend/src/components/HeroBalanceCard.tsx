/**
 * Hero Balance Card - Glassmorphic Portfolio Value Display
 * Follows "Invisible Complexity" design philosophy
 */

interface HeroBalanceCardProps {
  portfolioValue: number
  dayChange: number
  dayChangePercent: number
}

export default function HeroBalanceCard({
  portfolioValue,
  dayChange,
  dayChangePercent
}: HeroBalanceCardProps) {
  const isPositive = dayChange >= 0

  return (
    <div className="hero-balance-card">
      <div className="hero-balance-card__content">
        <div className="hero-balance-card__label">Portfolio Value</div>
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
          <span style={{ marginLeft: '8px', fontSize: '14px', opacity: 0.7 }}>
            Today
          </span>
        </div>
      </div>
    </div>
  )
}
