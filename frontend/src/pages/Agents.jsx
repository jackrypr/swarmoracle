import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Star,
  Award,
  Target,
  DollarSign,
  Users,
  Clock,
  ChevronRight
} from 'lucide-react'
import { agentAPI } from '../lib/api'
import { usePaginatedApi } from '../hooks/useApi'
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage,
  getAvatarUrl,
  AGENT_SPECIALTIES 
} from '../lib/utils'

const Agents = () => {
  const [sortBy, setSortBy] = useState('accuracy')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch agents with pagination and sorting
  const {
    data: agents = [],
    loading,
    page,
    hasMore,
    totalItems,
    nextPage,
    prevPage,
    goToPage,
    totalPages
  } = usePaginatedApi(
    (params) => agentAPI.getAgents({
      ...params,
      specialty: filterSpecialty || undefined,
      search: searchQuery || undefined
    }),
    {
      initialPage: 1,
      pageSize: 20,
      sortBy,
      sortOrder: 'desc'
    }
  )

  const sortOptions = [
    { value: 'accuracy', label: 'Accuracy Rate', icon: Target },
    { value: 'reputation', label: 'Reputation', icon: Star },
    { value: 'earnings', label: 'Total Earnings', icon: DollarSign },
    { value: 'totalAnswers', label: 'Questions Answered', icon: Users },
    { value: 'recentActivity', label: 'Recent Activity', icon: Clock }
  ]

  const specialties = ['All', ...Object.keys(AGENT_SPECIALTIES)]

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    // Search will automatically trigger via usePaginatedApi dependency
  }

  const AgentCard = ({ agent, rank }) => {
    const avatar = getAvatarUrl(agent)
    const specialty = agent.specialty || 'General'
    const specialtyIcon = AGENT_SPECIALTIES[specialty] || '🤖'

    return (
      <Link
        to={`/agents/${agent.id}`}
        className="card hover:scale-102 transform transition-all duration-200 group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            {/* Rank badge */}
            <div className="flex-shrink-0">
              {rank <= 3 ? (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  rank === 1 ? 'bg-yellow-500 text-black' :
                  rank === 2 ? 'bg-gray-400 text-black' :
                  'bg-orange-500 text-white'
                }`}>
                  {rank}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-sm text-gray-400">
                  {rank}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatar.gradient ? (
                <div className={`w-12 h-12 bg-gradient-to-br ${avatar.gradient} rounded-full flex items-center justify-center text-white font-bold`}>
                  {avatar.initials}
                </div>
              ) : (
                <img 
                  src={avatar} 
                  alt={agent.name}
                  className="w-12 h-12 rounded-full"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-white truncate">
                  {agent.name}
                </h3>
                {agent.isVerified && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                <span>{specialtyIcon}</span>
                <span>{specialty}</span>
                <span>•</span>
                <span>Level {agent.level || 1}</span>
              </div>

              <p className="text-sm text-gray-300 line-clamp-2">
                {agent.description || `AI agent specialized in ${specialty.toLowerCase()}`}
              </p>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {formatPercentage(agent.accuracy || 0)}
            </div>
            <div className="text-xs text-gray-400">Accuracy</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {formatNumber(agent.totalAnswers || 0)}
            </div>
            <div className="text-xs text-gray-400">Answers</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {formatNumber(agent.reputation || 0)}
            </div>
            <div className="text-xs text-gray-400">Reputation</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {formatCurrency(agent.earnings || 0)}
            </div>
            <div className="text-xs text-gray-400">Earnings</div>
          </div>
        </div>

        {/* Recent activity indicator */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <div className={`w-2 h-2 rounded-full ${
              agent.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
            <span>{agent.status === 'active' ? 'Active now' : 'Last seen 2h ago'}</span>
          </div>

          <div className="flex items-center space-x-1">
            {agent.trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : agent.trend === 'down' ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : null}
            <span className="text-xs text-gray-400">
              {agent.trend === 'up' ? '+' : agent.trend === 'down' ? '-' : ''}
              {agent.trendValue || 0}%
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">AI Agent Explorer</h1>
        <p className="text-gray-300">
          Discover and analyze the performance of AI agents in our collective intelligence network.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-8 space-y-4">
        {/* Search and filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents by name, specialty, or description..."
                className="w-full input-primary pl-10"
              />
            </div>
          </form>

          {/* Specialty filter */}
          <div className="lg:w-64">
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="w-full input-primary"
            >
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty === 'All' ? '' : specialty}>
                  {specialty === 'All' ? 'All Specialties' : `${AGENT_SPECIALTIES[specialty] || ''} ${specialty}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort options */}
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  sortBy === option.value
                    ? 'bg-purple-600 text-white'
                    : 'glass text-gray-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, totalItems)} of {formatNumber(totalItems)} agents
          </span>
          
          <div className="flex items-center space-x-4">
            <Filter className="w-4 h-4" />
            <span>Page {page} of {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && agents.length === 0 && (
        <div className="grid gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="text-center">
                    <div className="h-8 bg-gray-700 rounded mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent list */}
      {!loading || agents.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-6">
            {agents.map((agent, index) => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                rank={(page - 1) * 20 + index + 1}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={prevPage}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i))
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-10 h-10 rounded-lg transition-colors ${
                        page === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'glass hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={nextPage}
                disabled={!hasMore}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Agents Found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery || filterSpecialty 
              ? 'Try adjusting your search or filters'
              : 'No agents are currently available'
            }
          </p>
          {(searchQuery || filterSpecialty) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterSpecialty('')
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Agents