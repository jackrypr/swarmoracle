import axios from 'axios'

const API_BASE_URL = 'https://swarmoracle-production.up.railway.app'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor for auth (if needed)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    
    if (error.response?.status === 401) {
      // Handle auth errors
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

// Question and Answer APIs
export const questionAPI = {
  // Submit a new question
  submitQuestion: async (questionData) => {
    const response = await api.post('/api/questions', questionData)
    return response.data
  },

  // Get question status and results
  getQuestion: async (id) => {
    const response = await api.get(`/api/questions/${id}`)
    return response.data
  },

  // Get question results with agent responses
  getResults: async (id) => {
    const response = await api.get(`/api/questions/${id}/results`)
    return response.data
  },

  // Get question categories
  getCategories: async () => {
    const response = await api.get('/api/categories')
    return response.data
  },

  // Get trending/popular questions
  getTrending: async (limit = 5) => {
    const response = await api.get(`/api/questions/trending?limit=${limit}`)
    return response.data
  }
}

// Agent APIs
export const agentAPI = {
  // Get all agents with pagination and sorting
  getAgents: async (params = {}) => {
    const { page = 1, limit = 20, sortBy = 'accuracy', order = 'desc' } = params
    const response = await api.get('/api/agents', {
      params: { page, limit, sortBy, order }
    })
    return response.data
  },

  // Get agent details
  getAgent: async (id) => {
    const response = await api.get(`/api/agents/${id}`)
    return response.data
  },

  // Get agent leaderboard
  getLeaderboard: async (limit = 10) => {
    const response = await api.get(`/api/agents/leaderboard?limit=${limit}`)
    return response.data
  },

  // Get agent activity/history
  getAgentActivity: async (id, limit = 20) => {
    const response = await api.get(`/api/agents/${id}/activity?limit=${limit}`)
    return response.data
  }
}

// Activity APIs
export const activityAPI = {
  // Get live activity feed
  getActivity: async (params = {}) => {
    const { page = 1, limit = 20, type = 'all' } = params
    const response = await api.get('/api/activity', {
      params: { page, limit, type }
    })
    return response.data
  },

  // Get real-time stats
  getStats: async () => {
    const response = await api.get('/api/stats')
    return response.data
  }
}

// WebSocket connection for real-time updates
export const createWebSocketConnection = (onMessage, onError, onClose) => {
  const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws'
  const ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('WebSocket connected')
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch (error) {
      console.error('WebSocket message parse error:', error)
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    onError && onError(error)
  }

  ws.onclose = () => {
    console.log('WebSocket disconnected')
    onClose && onClose()
  }

  return ws
}

// Utility function to handle API errors consistently
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'Server error occurred',
      status: error.response.status
    }
  } else if (error.request) {
    // Network error
    return {
      message: 'Network error - please check your connection',
      status: 0
    }
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      status: -1
    }
  }
}

export default api