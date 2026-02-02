import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { activityAPI, handleApiError } from '../lib/api'

// Initial state
const initialState = {
  // Global stats
  stats: {
    totalAgents: 0,
    totalQuestions: 0,
    averageAccuracy: 0,
    totalEarnings: 0,
    activeQuestions: 0,
    loading: true
  },
  
  // Current user session
  user: null,
  isAuthenticated: false,
  
  // App-wide loading states
  globalLoading: false,
  
  // Notifications
  notifications: [],
  
  // Real-time data
  liveActivity: [],
  
  // UI state
  sidebarOpen: false,
  theme: 'dark'
}

// Action types
const actionTypes = {
  SET_STATS: 'SET_STATS',
  SET_STATS_LOADING: 'SET_STATS_LOADING',
  SET_USER: 'SET_USER',
  SET_GLOBAL_LOADING: 'SET_GLOBAL_LOADING',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_LIVE_ACTIVITY: 'SET_LIVE_ACTIVITY',
  ADD_ACTIVITY: 'ADD_ACTIVITY',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_THEME: 'SET_THEME'
}

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_STATS:
      return {
        ...state,
        stats: {
          ...action.payload,
          loading: false
        }
      }
    
    case actionTypes.SET_STATS_LOADING:
      return {
        ...state,
        stats: {
          ...state.stats,
          loading: action.payload
        }
      }
    
    case actionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload
      }
    
    case actionTypes.SET_GLOBAL_LOADING:
      return {
        ...state,
        globalLoading: action.payload
      }
    
    case actionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      }
    
    case actionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    
    case actionTypes.SET_LIVE_ACTIVITY:
      return {
        ...state,
        liveActivity: action.payload
      }
    
    case actionTypes.ADD_ACTIVITY:
      return {
        ...state,
        liveActivity: [action.payload, ...state.liveActivity.slice(0, 19)] // Keep latest 20
      }
    
    case actionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen
      }
    
    case actionTypes.SET_THEME:
      return {
        ...state,
        theme: action.payload
      }
    
    default:
      return state
  }
}

// Create context
const AppContext = createContext()

// Context provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load initial stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        dispatch({ type: actionTypes.SET_STATS_LOADING, payload: true })
        const stats = await activityAPI.getStats()
        dispatch({ type: actionTypes.SET_STATS, payload: stats })
      } catch (error) {
        console.error('Failed to load stats:', error)
        const errorInfo = handleApiError(error)
        addNotification({
          type: 'error',
          title: 'Failed to load statistics',
          message: errorInfo.message
        })
      }
    }

    loadStats()
  }, [])

  // Actions
  const actions = {
    // Stats management
    refreshStats: async () => {
      try {
        dispatch({ type: actionTypes.SET_STATS_LOADING, payload: true })
        const stats = await activityAPI.getStats()
        dispatch({ type: actionTypes.SET_STATS, payload: stats })
      } catch (error) {
        console.error('Failed to refresh stats:', error)
        const errorInfo = handleApiError(error)
        addNotification({
          type: 'error',
          title: 'Failed to refresh statistics',
          message: errorInfo.message
        })
      }
    },

    // User management
    setUser: (user) => {
      dispatch({ type: actionTypes.SET_USER, payload: user })
    },

    logout: () => {
      dispatch({ type: actionTypes.SET_USER, payload: null })
      localStorage.removeItem('auth_token')
    },

    // Loading states
    setGlobalLoading: (loading) => {
      dispatch({ type: actionTypes.SET_GLOBAL_LOADING, payload: loading })
    },

    // Notification management
    addNotification: (notification) => {
      const id = Date.now().toString()
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          id,
          ...notification,
          timestamp: new Date()
        }
      })

      // Auto-remove after 5 seconds for non-error notifications
      if (notification.type !== 'error') {
        setTimeout(() => {
          dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: id })
        }, 5000)
      }
    },

    removeNotification: (id) => {
      dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: id })
    },

    // Activity management
    setLiveActivity: (activity) => {
      dispatch({ type: actionTypes.SET_LIVE_ACTIVITY, payload: activity })
    },

    addActivity: (activity) => {
      dispatch({ type: actionTypes.ADD_ACTIVITY, payload: activity })
    },

    // UI actions
    toggleSidebar: () => {
      dispatch({ type: actionTypes.TOGGLE_SIDEBAR })
    },

    setTheme: (theme) => {
      dispatch({ type: actionTypes.SET_THEME, payload: theme })
      localStorage.setItem('theme', theme)
    }
  }

  // Helper to add notifications (bound to actions)
  const addNotification = actions.addNotification

  return (
    <AppContext.Provider value={{ state, ...actions }}>
      {children}
    </AppContext.Provider>
  )
}

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext