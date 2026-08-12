'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AdminTopBar } from '@/components/AdminTopBar'

export function AdminSidebarWrapper({
  sidebar,
  children,
  userName,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
  userName: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar on ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {sidebar}
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: '#131313',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        <AdminTopBar
          userName={userName}
          onHamburgerClick={() => setSidebarOpen(true)}
        />
        <div className="admin-content" style={{ padding: '24px 40px 40px', flex: 1 }}>{children}</div>
      </main>

      <style>{`
        .admin-sidebar {
          width: 260px;
          background: #0e0e0e;
          border-right: 1px solid rgba(77,70,55,0.15);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        @media (max-width: 767px) {
          .admin-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            z-index: 50;
            transition: left 0.3s ease;
          }
          .admin-sidebar.closed {
            left: -260px;
          }
          .admin-sidebar.open {
            left: 0;
          }
          .admin-sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 49;
          }
          .admin-hamburger-btn {
            display: flex !important;
          }
          .admin-content {
            padding: 16px !important;
          }
          .admin-topbar {
            padding: 12px 16px 0 !important;
          }
        }
        @media (min-width: 768px) {
          .admin-sidebar {
            position: relative;
          }
          .admin-sidebar-backdrop {
            display: none;
          }
          .admin-hamburger-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
