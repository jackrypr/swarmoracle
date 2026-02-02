import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Search, Bell, User, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatNumber } from '../lib/utils'

const Header = ({ onMenuClick, showMenuButton = true }) => {
  const location = useLocation()
  const { state } = useApp()

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Home'
    if (path === '/question') return 'Ask Question'
    if (path.startsWith('/results/')) return 'Results'
    if (path === '/agents') return 'Agents'
    if (path.startsWith('/agents/')) return 'Agent Profile'
    if (path === '/activity') return 'Live Activity'
    return 'SwarmOracle'
  }

  return (
    <header className="glass border-b border-white/10 px-4 lg:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* Menu button - Mobile */}
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Logo & Title */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold gradient-text">SwarmOracle</h1>
          </div>
        </Link>

        {/* Page title */}
        <div className="hidden sm:block text-gray-400">
          <span className="text-white/60">/</span>
          <span className="ml-2">{getPageTitle()}</span>
        </div>
      </div>

      {/* Center - Quick stats (desktop only) */}
      <div className="hidden lg:flex items-center space-x-8 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-gray-400">
            {formatNumber(state.stats.totalAgents)} Agents
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">
            {Math.round(state.stats.averageAccuracy * 100)}% Accuracy
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400">
            {formatNumber(state.stats.activeQuestions)} Active
          </span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-3">
        {/* Quick search */}
        <Link
          to="/question"
          className="hidden md:flex items-center space-x-2 glass px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Ask a question...</span>
        </Link>

        {/* Mobile search button */}
        <Link
          to="/question"
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Search className="w-5 h-5" />
        </Link>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
          <Bell className="w-5 h-5" />
          {/* Notification badge */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </button>

        {/* Profile */}
        <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

export default Header