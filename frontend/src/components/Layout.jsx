import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useApp } from '../context/AppContext'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { state } = useApp()

  // Don't show sidebar on home page for cleaner landing experience
  const isHomePage = location.pathname === '/'
  const showSidebar = !isHomePage

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar - Hidden on home page */}
      {showSidebar && (
        <>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="absolute inset-0 bg-black/50" />
            </div>
          )}
          
          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col ${showSidebar ? 'lg:ml-0' : ''}`}>
        {/* Header - Only show on non-home pages or mobile */}
        {(!isHomePage || window.innerWidth < 1024) && (
          <Header 
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            showMenuButton={showSidebar}
          />
        )}

        {/* Page content */}
        <main className={`flex-1 ${!isHomePage ? 'p-6' : ''}`}>
          <Outlet />
        </main>

        {/* Global loading overlay */}
        {state.globalLoading && (
          <div className="fixed inset-0 z-50 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="glass p-6 rounded-lg flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
              <span className="text-white">Loading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Layout