'use client'

import { NotificationBell } from '@/components/NotificationBell'

export function AdminTopBar({ userName, onHamburgerClick }: { userName: string; onHamburgerClick?: () => void }) {
  return (
    <div
      className="admin-topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '12px 40px 0',
        gap: '12px',
      }}
    >
      {onHamburgerClick && (
        <button
          className="admin-hamburger-btn"
          onClick={onHamburgerClick}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            marginRight: 'auto',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      <span style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: '12px',
        color: 'rgba(255,255,255,0.3)',
      }}>{userName}</span>
      <NotificationBell />
    </div>
  )
}
