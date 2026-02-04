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

      <style>{`
        .collapsible-card {
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .collapsible-header {
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        .collapsible-header:hover {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 0.5rem;
          margin: -0.5rem;
          padding: 0.5rem;
        }

        .collapsible-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
        }

        .collapse-icon {
          margin-left: auto;
          transition: transform 0.3s ease;
          font-size: 1.5rem;
          color: var(--text-secondary);
        }

        .collapse-icon.expanded {
          transform: rotate(180deg);
        }

        .card-content {
          max-height: 5000px;
          opacity: 1;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .card-content.collapsed {
          max-height: 0;
          opacity: 0;
          margin-top: 0;
        }

        .card-content.expanded {
          margin-top: 1rem;
        }
      `}</style>
    </section>
  )
}
