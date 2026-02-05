/**
 * Collapsible Card Component
 * Makes any content section collapsible
 */

import { useState } from 'react'

interface CollapsibleCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  actions?: React.ReactNode;
}

export default function CollapsibleCard({
  title,
  icon,
  children,
  defaultExpanded = true,
  actions
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <section className="card collapsible-card">
      <div className="card-header collapsible-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>
          {icon && <span className="material-symbols-outlined">{icon}</span>}
          {title}
          <span className={`collapse-icon material-symbols-outlined ${isExpanded ? 'expanded' : ''}`}>
            expand_more
          </span>
        </h2>
        {actions && (
          <div className="card-actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      <div className={`card-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {children}
      </div>

    </section>
  )
}
