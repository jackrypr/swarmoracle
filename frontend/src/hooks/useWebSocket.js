import { useEffect, useRef, useState, useCallback } from 'react'
import { createWebSocketConnection } from '../lib/api'
import { useNotify } from '../context/NotificationContext'

export const useWebSocket = (onMessage, options = {}) => {
  const {
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    enabled = true
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const { networkError } = useNotify()

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setError(null)
      
      wsRef.current = createWebSocketConnection(
        // onMessage
        (data) => {
          setIsConnected(true)
          setReconnectAttempts(0)
          onMessage?.(data)
        },
        // onError
        (error) => {
          console.error('WebSocket error:', error)
          setError(error)
          setIsConnected(false)
        },
        // onClose
        () => {
          setIsConnected(false)
          
          // Attempt reconnection if enabled
          if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
            setReconnectAttempts(prev => prev + 1)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`)
              connect()
            }, reconnectInterval)
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            networkError()
          }
        }
      )
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setError(error)
      setIsConnected(false)
    }
  }, [enabled, onMessage, autoReconnect, reconnectInterval, maxReconnectAttempts, reconnectAttempts, networkError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setReconnectAttempts(0)
  }, [])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        setError(error)
        return false
      }
    }
    return false
  }, [])

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect()
    }
    
    return disconnect
  }, [enabled, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage
  }
}

// Hook for specific real-time features
export const useLiveUpdates = () => {
  const [liveData, setLiveData] = useState({
    questions: {},
    agents: {},
    activity: []
  })

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'question_update':
        setLiveData(prev => ({
          ...prev,
          questions: {
            ...prev.questions,
            [data.questionId]: data.data
          }
        }))
        break
        
      case 'agent_update':
        setLiveData(prev => ({
          ...prev,
          agents: {
            ...prev.agents,
            [data.agentId]: data.data
          }
        }))
        break
        
      case 'new_activity':
        setLiveData(prev => ({
          ...prev,
          activity: [data.data, ...prev.activity.slice(0, 49)] // Keep latest 50
        }))
        break
        
      case 'stats_update':
        // Handle stats updates
        break
        
      default:
        console.log('Unhandled WebSocket message type:', data.type)
    }
  }, [])

  const { isConnected, error, sendMessage } = useWebSocket(handleMessage)

  const subscribeToQuestion = useCallback((questionId) => {
    return sendMessage({
      type: 'subscribe',
      target: 'question',
      id: questionId
    })
  }, [sendMessage])

  const unsubscribeFromQuestion = useCallback((questionId) => {
    return sendMessage({
      type: 'unsubscribe',
      target: 'question',
      id: questionId
    })
  }, [sendMessage])

  const subscribeToAgent = useCallback((agentId) => {
    return sendMessage({
      type: 'subscribe',
      target: 'agent',
      id: agentId
    })
  }, [sendMessage])

  const unsubscribeFromAgent = useCallback((agentId) => {
    return sendMessage({
      type: 'unsubscribe',
      target: 'agent',
      id: agentId
    })
  }, [sendMessage])

  return {
    liveData,
    isConnected,
    error,
    subscribeToQuestion,
    unsubscribeFromQuestion,
    subscribeToAgent,
    unsubscribeFromAgent
  }
}