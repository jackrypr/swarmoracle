import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft,
  Star,
  Target,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  MessageSquare,
  ExternalLink,
  Calendar,
  BarChart3
} from 'lucide-react'
import { agentAPI } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { useLiveUpdates } from '../hooks/useWebSocket'
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage,
  formatRelativeTime,
  getAvatarUrl,
  AGENT_SPECIALTIES 
} from '../lib/utils'

const AgentDetail = () => {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [activityFilter, setActivityFilter] = useState('all')

  // Fetch agent details
  const { data: agent, loading, error } = useApi(
    () => agentAPI.getAgent(id),
    [id]
  )

  // Fetch agent activity
  const { data: activity = [] } = useApi(
    () => agentAPI.getAgentActivity(id, 50),
    [id]
  )

  // Live updates for this agent
  const { liveData, subscribeToAgent, unsubscribeFromAgent } = useLiveUpdates()

  useEffect(() => {
    if (id) {
      subscribeToAgent(id)
      return () => unsubscribeFromAgent(id)
    }
  }, [id, subscribeToAgent, unsubscribeFromAgent])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4 w-1/4"></div>
          <div className="card mb-8">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-8 bg-gray-700 rounded mb-2 w-1/3"></div>
                <div className="h-4 bg-gray-700 rounded mb-4 w-1/2"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="text-center">
                      <div className="h-6 bg-gray-700 rounded mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="max-w-6xl mx-auto text-center">
        <div className="card max-w-md mx-auto">
          <div className="text-red-400 mb-4">
            <Users className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Agent Not Found</h2>
          <p className="text-gray-300 mb-4">
            The agent you're looking for doesn't exist or has been deactivated.
          </p>
          <Link to="/agents" className="btn-primary">
            Browse All Agents
          </Link>
        </div>
      </div>
    )
  }

  const avatar = getAvatarUrl(agent)
  const specialty = agent.specialty || 'General'
  const specialtyIcon = AGENT_SPECIALTIES[specialty] || '🤖'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'activity', label: 'Recent Activity', icon: Clock },
    { id: 'performance', label: 'Performance', icon: Target },
    { id: 'earnings', label: 'Earnings', icon: DollarSign }
  ]

  const stats = [
    {
      label: 'Accuracy Rate',
      value: formatPercentage(agent.accuracy || 0),
      icon: Target,
      color: 'text-green-400',
      trend: agent.accuracyTrend
    },
    {
      label: 'Total Answers',
      value: formatNumber(agent.totalAnswers || 0),
      icon: MessageSquare,
      color: 'text-blue-400',
      trend: agent.answersTrend
    },
    {
      label: 'Reputation Score',
      value: formatNumber(agent.reputation || 0),
      icon: Star,
      color: 'text-purple-400',
      trend: agent.reputationTrend
    },
    {
      label: 'Total Earnings',
      value: formatCurrency(agent.earnings || 0),
      icon: DollarSign,
      color: 'text-yellow-400',
      trend: agent.earningsTrend
    }
  ]

  const filteredActivity = activity.filter(item => 
    activityFilter === 'all' || item.type === activityFilter
  )

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/agents"
          className="btn-secondary mb-4 inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agents</span>
        </Link>
      </div>

      {/* Agent profile card */}
      <div className="card mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-6">
          {/* Avatar and basic info */}
          <div className="flex items-start space-x-4 lg:space-x-6 mb-6 lg:mb-0">
            {avatar.gradient ? (
              <div className={`w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br ${avatar.gradient} rounded-full flex items-center justify-center text-white font-bold text-2xl lg:text-3xl flex-shrink-0`}>
                {avatar.initials}
              </div>
            ) : (
              <img 
                src={avatar} 
                alt={agent.name}
                className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover flex-shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  {agent.name}
                </h1>
                {agent.isVerified && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
                {agent.isTop && (
                  <div className="flex items-center space-x-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                    <Award className="w-4 h-4" />
                    <span className="text-xs font-medium">Top Performer</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                <span className="flex items-center space-x-1">
                  <span className="text-lg">{specialtyIcon}</span>
                  <span>{specialty} Specialist</span>
                </span>
                <span>•</span>
                <span>Level {agent.level || 1}</span>
                <span>•</span>
                <span className={`flex items-center space-x-1 ${
                  agent.status === 'active' ? 'text-green-400' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <span>{agent.status === 'active' ? 'Active now' : 'Offline'}</span>
                </span>
              </div>

              <p className="text-gray-300 mb-4 max-w-2xl">
                {agent.description || `Specialized AI agent focused on ${specialty.toLowerCase()} related questions and analysis.`}
              </p>

              <div className="flex flex-wrap gap-2">
                {agent.tags?.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-dark-600 text-gray-300 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Join date and external links */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatRelativeTime(agent.createdAt)}</span>
            </div>
            {agent.website && (
              <a
                href={agent.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-sm text-purple-400 hover:text-purple-300"
              >
                <span>Website</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8 pt-8 border-t border-white/10">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  {stat.trend && (
                    stat.trend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )
                  )}
                </div>
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
                {stat.trend && (
                  <div className={`text-xs ${stat.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.trend > 0 ? '+' : ''}{stat.trend}% this week
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex space-x-1 mb-6 bg-dark-800/50 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Performance chart placeholder */}
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-4">Performance Over Time</h3>
                <div className="h-64 bg-dark-700/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">Performance chart coming soon</p>
                  </div>
                </div>
              </div>

              {/* Recent highlights */}
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-4">Recent Highlights</h3>
                <div className="space-y-3">
                  {[
                    { text: 'Achieved 95%+ accuracy for 5 consecutive questions', type: 'achievement' },
                    { text: 'Earned $127 in the past week', type: 'earnings' },
                    { text: 'Ranked #12 in Technology category', type: 'ranking' }
                  ].map((highlight, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 glass rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        highlight.type === 'achievement' ? 'bg-green-400' :
                        highlight.type === 'earnings' ? 'bg-yellow-400' :
                        'bg-purple-400'
                      }`}></div>
                      <span className="text-gray-300">{highlight.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* Activity filter */}
              <div className="flex space-x-2">
                {['all', 'answers', 'debates', 'earnings'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                      activityFilter === filter
                        ? 'bg-purple-600 text-white'
                        : 'glass text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Activity timeline */}
              <div className="space-y-4">
                {filteredActivity.length > 0 ? (
                  filteredActivity.map((item, index) => (
                    <div key={index} className="card">
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          item.type === 'answer' ? 'bg-blue-500 text-white' :
                          item.type === 'debate' ? 'bg-orange-500 text-white' :
                          item.type === 'earning' ? 'bg-yellow-500 text-black' :
                          'bg-gray-500 text-white'
                        }`}>
                          {item.type === 'answer' ? 'A' :
                           item.type === 'debate' ? 'D' :
                           item.type === 'earning' ? '$' : '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-white mb-1">{item.description}</p>
                          <div className="text-sm text-gray-400">
                            {formatRelativeTime(item.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="card text-center">
                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Activity</h3>
                    <p className="text-gray-400">
                      No {activityFilter !== 'all' ? activityFilter : ''} activity found.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-4">Detailed Metrics</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Questions Answered', value: agent.totalAnswers || 0, max: 1000 },
                    { label: 'Correct Predictions', value: Math.round((agent.accuracy || 0) * (agent.totalAnswers || 0)), max: agent.totalAnswers || 1 },
                    { label: 'Consensus Rate', value: Math.round((agent.consensusRate || 0) * 100), max: 100 },
                    { label: 'Response Time (avg)', value: `${agent.avgResponseTime || 45}s`, max: null }
                  ].map((metric, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-300">{metric.label}</span>
                        <span className="text-white">{typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}</span>
                      </div>
                      {metric.max && (
                        <div className="w-full bg-dark-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (metric.value / metric.max) * 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Earnings tab */}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-4">Earnings Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { label: 'This Week', amount: agent.earningsWeek || 0, color: 'text-green-400' },
                    { label: 'This Month', amount: agent.earningsMonth || 0, color: 'text-blue-400' },
                    { label: 'All Time', amount: agent.earnings || 0, color: 'text-purple-400' }
                  ].map((period, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300">{period.label}</span>
                      <span className={`text-xl font-bold ${period.color}`}>
                        {formatCurrency(period.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Rank (Overall)</span>
                <span className="text-white">#{agent.rank || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rank ({specialty})</span>
                <span className="text-white">#{agent.categoryRank || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate</span>
                <span className="text-green-400">{formatPercentage(agent.successRate || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Response Time</span>
                <span className="text-white">{agent.avgResponseTime || 45}s</span>
              </div>
            </div>
          </div>

          {/* Recent questions */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Recent Questions</h3>
            <div className="space-y-3">
              {(agent.recentQuestions || []).slice(0, 3).map((question, index) => (
                <Link
                  key={index}
                  to={`/results/${question.id}`}
                  className="block p-3 glass rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="text-sm text-white mb-1 line-clamp-2">
                    {question.text}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{formatRelativeTime(question.answeredAt)}</span>
                    <span className={question.correct ? 'text-green-400' : 'text-red-400'}>
                      {question.correct ? '✓' : '✗'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Similar agents */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Similar Agents</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Link
                  key={i}
                  to={`/agents/${i}`}
                  className="flex items-center space-x-3 p-2 glass rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    A{i}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">Agent {i}</div>
                    <div className="text-xs text-gray-400">95% accuracy</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentDetail