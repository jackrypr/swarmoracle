import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  MessageSquare, 
  Users, 
  Activity, 
  TrendingUp,
  Zap,
  Settings,
  HelpCircle,
  X
} from 'lucide-react'
import { cn } from '../lib/utils'

const Sidebar = ({ onClose }) => {
  const location = useLocation()

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
      description: 'Dashboard & overview'
    },
    {
      icon: MessageSquare,
      label: 'Ask Question',
      href: '/question',
      description: 'Get AI consensus answers'
    },
    {
      icon: Users,
      label: 'AI Agents',
      href: '/agents',
      description: 'Browse agent leaderboard'
    },
    {
      icon: Activity,
      label: 'Live Activity',
      href: '/activity',
      description: 'Real-time updates'
    }
  ]

  const secondaryItems = [
    {
      icon: TrendingUp,
      label: 'Analytics',
      href: '/analytics',
      description: 'Performance insights'
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings',
      description: 'Customize your experience'
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      href: '/help',
      description: 'Get assistance'
    }
  ]

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  const NavLink = ({ item, onClick }) => {
    const Icon = item.icon
    const active = isActive(item.href)

    return (
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group",
          active 
            ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white" 
            : "hover:bg-white/5 text-gray-300 hover:text-white"
        )}
      >
        <Icon className={cn(
          "w-5 h-5 transition-colors",
          active ? "text-purple-400" : "text-gray-400 group-hover:text-gray-300"
        )} />
        <div className="flex-1">
          <div className="text-sm font-medium">{item.label}</div>
          <div className="text-xs text-gray-500 group-hover:text-gray-400">
            {item.description}
          </div>
        </div>
        {active && (
          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
        )}
      </Link>
    )
  }

  return (
    <div className="h-full bg-dark-800/50 backdrop-blur-xl border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3" onClick={onClose}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">SwarmOracle</h1>
              <p className="text-xs text-gray-400">Collective AI Intelligence</p>
            </div>
          </Link>
          
          {/* Close button - Mobile only */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Primary navigation */}
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <NavLink key={index} item={item} onClick={onClose} />
          ))}
        </div>

        {/* Divider */}
        <div className="py-4">
          <div className="border-t border-white/10"></div>
        </div>

        {/* Secondary navigation */}
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            More
          </div>
          {secondaryItems.map((item, index) => (
            <NavLink key={index} item={item} onClick={onClose} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">System Status</div>
              <div className="text-xs text-green-400 flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500 text-center">
          v1.0.0 • Made with ⚡ by SwarmOracle
        </div>
      </div>
    </div>
  )
}

export default Sidebar