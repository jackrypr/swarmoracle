import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility to merge Tailwind classes
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Format numbers with commas
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

// Format percentage
export const formatPercentage = (value) => {
  return `${Math.round(value * 100)}%`
}

// Format confidence score with color
export const formatConfidence = (score) => {
  const percentage = Math.round(score * 100)
  let color = 'text-gray-400'
  
  if (percentage >= 90) color = 'text-green-400'
  else if (percentage >= 75) color = 'text-blue-400'
  else if (percentage >= 60) color = 'text-yellow-400'
  else if (percentage >= 40) color = 'text-orange-400'
  else color = 'text-red-400'
  
  return { percentage, color }
}

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  const now = new Date()
  const diffMs = now - new Date(date)
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return new Date(date).toLocaleDateString()
}

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Generate avatar URL or initials
export const getAvatarUrl = (agent) => {
  if (agent.avatar) return agent.avatar
  
  // Generate gradient based on name
  const colors = [
    'from-purple-500 to-blue-500',
    'from-blue-500 to-teal-500',
    'from-teal-500 to-green-500',
    'from-green-500 to-yellow-500',
    'from-yellow-500 to-orange-500',
    'from-orange-500 to-red-500',
    'from-red-500 to-pink-500',
    'from-pink-500 to-purple-500'
  ]
  
  const colorIndex = agent.name.charCodeAt(0) % colors.length
  return {
    gradient: colors[colorIndex],
    initials: agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
}

// Generate unique question categories
export const QUESTION_CATEGORIES = [
  'Technology',
  'Science',
  'Politics',
  'Economics',
  'Health',
  'Environment',
  'Sports',
  'Entertainment',
  'Education',
  'Philosophy',
  'Other'
]

// Common question suggestions
export const QUESTION_SUGGESTIONS = [
  "What are the implications of AI regulation in 2024?",
  "Which renewable energy technology will dominate the next decade?",
  "How will remote work evolve in the post-pandemic era?",
  "What are the biggest cybersecurity threats facing businesses?",
  "Which cryptocurrency has the best long-term prospects?"
]

// Agent specialty icons mapping
export const AGENT_SPECIALTIES = {
  'Technology': '💻',
  'Science': '🔬',
  'Politics': '🏛️',
  'Economics': '📈',
  'Health': '🏥',
  'Environment': '🌍',
  'Sports': '⚽',
  'Entertainment': '🎭',
  'Education': '📚',
  'Philosophy': '🤔',
  'General': '🤖'
}

// Validation functions
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateQuestion = (question) => {
  if (!question || question.trim().length < 10) {
    return 'Question must be at least 10 characters long'
  }
  if (question.length > 500) {
    return 'Question must be less than 500 characters'
  }
  return null
}

// Local storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  }
}

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Share functionality
export const shareUrl = async (url, title) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return true
    } catch (error) {
      console.error('Failed to share:', error)
      return false
    }
  } else {
    // Fallback to copying URL
    return await copyToClipboard(url)
  }
}

// Debounce function for search
export const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export default {
  cn,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatConfidence,
  formatRelativeTime,
  truncateText,
  getAvatarUrl,
  validateEmail,
  validateQuestion,
  storage,
  copyToClipboard,
  shareUrl,
  debounce,
  generateId
}