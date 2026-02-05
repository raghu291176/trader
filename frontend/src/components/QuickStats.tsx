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

    </div>
  )
}
