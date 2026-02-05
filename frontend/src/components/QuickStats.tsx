/**
 * Quick Stats Widget
 * Shows key market metrics at a glance
 */

export default function QuickStats() {
  const stats = [
    {
      label: 'Fear & Greed',
      value: '62',
      subvalue: 'Greed',
      icon: 'sentiment_satisfied',
      color: '#10b981',
    },
    {
      label: 'VIX',
      value: '14.23',
      subvalue: '-2.3%',
      icon: 'show_chart',
      color: '#10b981',
    },
    {
      label: 'Adv/Dec',
      value: '1,842',
      subvalue: '1,245',
      icon: 'swap_vert',
      color: '#10b981',
    },
    {
      label: '52w High',
      value: '1,523',
      subvalue: 'Stocks',
      icon: 'trending_up',
      color: '#10b981',
    },
  ]

  return (
    <div className="quick-stats-widget">
      <div className="quick-stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="quick-stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}15` }}>
              <span className="material-symbols-outlined" style={{ color: stat.color }}>
                {stat.icon}
              </span>
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="stat-subvalue">{stat.subvalue}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .quick-stats-widget {
          width: 100%;
        }

        .quick-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.625rem;
        }

        .quick-stat-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--surface-dark);
          border: 1px solid var(--border-dark);
          border-radius: 0.375rem;
          transition: all 0.15s ease;
        }

        .quick-stat-card:hover {
          border-color: var(--primary);
          transform: scale(1.02);
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.375rem;
          flex-shrink: 0;
        }

        .stat-icon .material-symbols-outlined {
          font-size: 1.25rem;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .stat-subvalue {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          margin-top: 0.125rem;
        }

        @media (max-width: 768px) {
          .quick-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
