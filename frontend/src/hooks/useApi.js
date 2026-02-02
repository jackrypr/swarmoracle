import { useState, useEffect, useCallback, useRef } from 'react'
import { handleApiError } from '../lib/api'
import { useNotify } from '../context/NotificationContext'

// Generic API hook for async operations
export const useApi = (apiFunction, dependencies = [], options = {}) => {
  const {
    immediate = true,
    showErrorNotification = true,
    defaultValue = null
  } = options

  const [data, setData] = useState(defaultValue)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  
  const { apiError } = useNotify()
  const abortControllerRef = useRef(null)

  const execute = useCallback(async (...args) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiFunction(...args)
      setData(result)
      setLastFetch(new Date())
      return result
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorInfo = handleApiError(err)
        setError(errorInfo)
        
        if (showErrorNotification) {
          apiError(err)
        }
      }
      throw err
    } finally {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setLoading(false)
      }
    }
  }, [apiFunction, showErrorNotification, apiError])

  const refresh = useCallback(() => {
    return execute(...dependencies)
  }, [execute, dependencies])

  const clear = useCallback(() => {
    setData(defaultValue)
    setError(null)
    setLoading(false)
  }, [defaultValue])

  // Auto-execute on mount and dependency changes
  useEffect(() => {
    if (immediate) {
      execute(...dependencies)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [immediate, execute, ...dependencies])

  return {
    data,
    loading,
    error,
    execute,
    refresh,
    clear,
    lastFetch
  }
}

// Specialized hook for paginated data
export const usePaginatedApi = (apiFunction, options = {}) => {
  const {
    initialPage = 1,
    pageSize = 20,
    sortBy = null,
    sortOrder = 'desc',
    immediate = true,
    ...apiOptions
  } = options

  const [page, setPage] = useState(initialPage)
  const [hasMore, setHasMore] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sort, setSort] = useState({ by: sortBy, order: sortOrder })

  const fetchData = useCallback(async () => {
    const params = {
      page,
      limit: pageSize,
      ...(sort.by && { sortBy: sort.by, order: sort.order })
    }
    
    const result = await apiFunction(params)
    
    // Handle different API response formats
    if (result.data && result.pagination) {
      // Standard pagination format
      setTotalItems(result.pagination.total)
      setTotalPages(result.pagination.pages)
      setHasMore(page < result.pagination.pages)
      return result.data
    } else if (Array.isArray(result)) {
      // Simple array format
      setHasMore(result.length === pageSize)
      return result
    } else {
      // Direct data format
      setHasMore(false)
      return result
    }
  }, [apiFunction, page, pageSize, sort])

  const api = useApi(fetchData, [page, sort], { immediate, ...apiOptions })

  const nextPage = useCallback(() => {
    if (hasMore && !api.loading) {
      setPage(prev => prev + 1)
    }
  }, [hasMore, api.loading])

  const prevPage = useCallback(() => {
    if (page > 1 && !api.loading) {
      setPage(prev => prev - 1)
    }
  }, [page, api.loading])

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages && !api.loading) {
      setPage(newPage)
    }
  }, [totalPages, api.loading])

  const changeSort = useCallback((by, order = 'desc') => {
    setSort({ by, order })
    setPage(1) // Reset to first page when sorting changes
  }, [])

  const reset = useCallback(() => {
    setPage(initialPage)
    setHasMore(true)
    setTotalItems(0)
    setTotalPages(0)
    api.clear()
  }, [initialPage, api])

  return {
    ...api,
    page,
    pageSize,
    hasMore,
    totalItems,
    totalPages,
    sort,
    nextPage,
    prevPage,
    goToPage,
    changeSort,
    reset
  }
}

// Hook for optimistic updates
export const useOptimisticApi = (apiFunction, options = {}) => {
  const {
    optimisticUpdate = null,
    rollbackOnError = true,
    showErrorNotification = true
  } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [originalData, setOriginalData] = useState(null)
  
  const { apiError } = useNotify()

  const execute = useCallback(async (optimisticData, ...args) => {
    try {
      setLoading(true)
      setError(null)
      
      // Store original data for potential rollback
      setOriginalData(data)
      
      // Apply optimistic update immediately
      if (optimisticUpdate && optimisticData) {
        setData(optimisticUpdate(data, optimisticData))
      }
      
      // Execute the actual API call
      const result = await apiFunction(...args)
      
      // Update with real data
      setData(result)
      setOriginalData(null)
      
      return result
    } catch (err) {
      // Rollback on error if enabled
      if (rollbackOnError && originalData !== null) {
        setData(originalData)
      }
      
      const errorInfo = handleApiError(err)
      setError(errorInfo)
      
      if (showErrorNotification) {
        apiError(err)
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction, data, optimisticUpdate, rollbackOnError, showErrorNotification, apiError, originalData])

  const setInitialData = useCallback((initialData) => {
    setData(initialData)
    setError(null)
  }, [])

  const updateData = useCallback((updater) => {
    setData(prevData => typeof updater === 'function' ? updater(prevData) : updater)
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    setInitialData,
    updateData
  }
}

// Hook for debounced API calls (useful for search)
export const useDebouncedApi = (apiFunction, delay = 300, options = {}) => {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const timeoutRef = useRef(null)

  // Debounce the query
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, delay])

  // Use the API with debounced query
  const api = useApi(
    () => apiFunction(debouncedQuery), 
    [debouncedQuery],
    {
      immediate: false,
      ...options
    }
  )

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      api.execute()
    } else {
      api.clear()
    }
  }, [debouncedQuery])

  return {
    ...api,
    query,
    setQuery,
    isDebouncing: query !== debouncedQuery
  }
}