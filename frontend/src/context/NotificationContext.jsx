import React, { createContext, useContext, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../lib/utils'

const NotificationContext = createContext()

const NotificationComponent = ({ notification, onRemove }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const colors = {
    success: 'border-green-500/20 bg-green-500/10 text-green-400',
    error: 'border-red-500/20 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/20 bg-blue-500/10 text-blue-400'
  }

  const Icon = icons[notification.type] || Info

  return (
    <div className={cn(
      'glass rounded-lg p-4 border flex items-start space-x-3 shadow-lg',
      'transform transition-all duration-300 ease-in-out',
      'translate-x-0 opacity-100',
      colors[notification.type]
    )}>
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {notification.title && (
          <h4 className="font-medium text-sm mb-1">
            {notification.title}
          </h4>
        )}
        <p className="text-sm opacity-90">
          {notification.message}
        </p>
      </div>

      <button
        onClick={() => onRemove(notification.id)}
        className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])

  const addNotification = (notification) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newNotification = {
      id,
      type: 'info',
      ...notification,
      timestamp: new Date()
    }

    setNotifications(prev => [newNotification, ...prev])

    // Auto-remove after specified duration or 5 seconds
    const duration = notification.duration !== undefined ? notification.duration : 5000
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const removeAllNotifications = () => {
    setNotifications([])
  }

  const success = (message, title = null, options = {}) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    })
  }

  const error = (message, title = null, options = {}) => {
    return addNotification({
      type: 'error',
      title: title || 'Error',
      message,
      duration: 0, // Don't auto-remove errors
      ...options
    })
  }

  const warning = (message, title = null, options = {}) => {
    return addNotification({
      type: 'warning',
      title: title || 'Warning',
      message,
      ...options
    })
  }

  const info = (message, title = null, options = {}) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  const value = {
    notifications,
    addNotification,
    removeNotification,
    removeAllNotifications,
    success,
    error,
    warning,
    info
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
        {notifications.map(notification => (
          <NotificationComponent
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Convenience hook for common notification patterns
export const useNotify = () => {
  const { success, error, warning, info } = useNotifications()
  
  return {
    success,
    error,
    warning,
    info,
    
    // Common patterns
    apiError: (error) => {
      const message = error.response?.data?.message || error.message || 'Something went wrong'
      return error(message, 'API Error')
    },
    
    copied: () => success('Copied to clipboard!'),
    
    saved: () => success('Changes saved successfully!'),
    
    loading: (message = 'Loading...') => info(message, null, { duration: 0 }),
    
    networkError: () => error(
      'Please check your internet connection and try again.',
      'Network Error'
    )
  }
}