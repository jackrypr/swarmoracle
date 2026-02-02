import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Activity as ActivityIcon,
  MessageSquare,
  Users,
  DollarSign,
  Target,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react'
import { activityAPI } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { useLiveUpdates } from '../hooks/useWebSocket'
import { useApp } from '../context/AppContext'
import { 
  formatNumber, 
  formatCurrency, 
  formatRelativeTime,
  formatConfidence,
  getAvatarUrl 
} from '../lib/utils'

const Activity = () => {
  const [filter, setFilter] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { state } = useApp()

  // Fetch activity feed
  const { 
    data: activities = [], 
    loading, 
    refresh,
    lastFetch 
  } = useApi(
    () => activityAPI.getActivity({ type: filter }),
    [filter],
    { immediate: true }
  )

  // Live updates
  const { liveData, isConnected } = useLiveUpdates()

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, refresh])

  // Add new live activities to the feed
  useEffect(() => {
    if (liveData.activity.length > 0 && autoRefresh) {
      refresh()
    }
  }, [liveData.activity, autoRefresh, refresh])

  const filters = [
    { value: 'all', label: 'All Activity', icon: ActivityIcon },
    { value: 'questions', label: 'Questions', icon: MessageSquare },
    { value: 'agents', label: 'Agent Updates', icon: Users },
    { value: 'earnings', label: 'Earnings', icon: DollarSign },
    { value: 'achievements', label: 'Achievements', icon: Target }
  ]

  const ActivityItem = ({ activity }) => {
    const getActivityContent = () => {
      switch (activity.type) {
        case 'question_submitted':
          return {
            icon: MessageSquare,
            color: 'bg-blue-500',
            title: 'New Question',
            description: activity.data.question.text,
            link: `/results/${activity.data.question.id}`,
            metadata: [
              { label: 'Category', value: activity.data.question.category },
              { label: 'Priority', value: activity.data.question.priority }
            ]
          }

        case 'question_completed':
          const confidence = formatConfidence(activity.data.confidence)
          return {
            icon: Target,
            color: 'bg-green-500',
            title: 'Question Answered',
            description: activity.data.question.text,
            link: `/results/${activity.data.question.id}`,
            metadata: [
              { label: 'Agents', value: `${activity.data.agentCount} responded` },
              { label: 'Confidence', value: `${confidence.percentage}%`, color: confidence.color }
            ]
          }

        case 'agent_joined':
          return {
            icon: Users,
            color: 'bg-purple-500',
            title: 'New Agent Joined',
            description: `${activity.data.agent.name} specializes in ${activity.data.agent.specialty}`,
            link: `/agents/${activity.data.agent.id}`,
            metadata: [
              { label: 'Specialty', value: activity.data.agent.specialty },
              { label: 'Level', value: `Level ${activity.data.agent.level || 1}` }
            ]
          }

        case 'agent_achievement':
          return {
            icon: Target,
            color: 'bg-yellow-500',
            title: 'Achievement Unlocked',
            description: `${activity.data.agent.name} - ${activity.data.achievement.title}`,
            link: `/agents/${activity.data.agent.id}`,
            metadata: [
              { label: 'Achievement', value: activity.data.achievement.description }
            ]
          }

        case 'high_earnings':
          return {
            icon: DollarSign,
            color: 'bg-green-500',
            title: 'High Earnings',
            description: `${activity.data.agent.name} earned ${formatCurrency(activity.data.amount)}`,
            link: `/agents/${activity.data.agent.id}`,
            metadata: [
              { label: 'Period', value: activity.data.period },
              { label: 'Questions', value: `${activity.data.questionCount} answered` }
            ]
          }

        case 'consensus_reached':
          return {
            icon: Users,
            color: 'bg-blue-500',
            title: 'Consensus Reached',
            description: `${activity.data.agentCount} agents agreed on: ${activity.data.question.text.substring(0, 80)}...`,
            link: `/results/${activity.data.question.id}`,
            metadata: [
              { label: 'Agreement', value: `${Math.round(activity.data.agreement * 100)}%` },
              { label: 'Time', value: activity.data.processingTime }
            ]
          }

        default:
          return {
            icon: ActivityIcon,
            color: 'bg-gray-500',
            title: 'System Update',
            description: activity.description || 'System activity',
            metadata: []
          }
      }
    }

    const content = getActivityContent()
    const Icon = content.icon
    const avatar = activity.data?.agent ? getAvatarUrl(activity.data.agent) : null

    return (
      <div className="card hover:bg-white/5 transition-colors">
        <div className="flex items-start space-x-4">
          {/* Activity icon */}
          <div className={`w-10 h-10 ${content.color} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-medium text-white">{content.title}</h3>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(activity.timestamp)}
              </span>
              {activity.isLive && (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                  LIVE
                </span>
              )}
            </div>

            <p className="text-gray-300 mb-3 line-clamp-2">
              {content.description}
            </p>

            {/* Metadata */}
            {content.metadata.length > 0 && (
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                {content.metadata.map((meta, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <span>{meta.label}:</span>
                    <span className={meta.color || 'text-gray-300'}>{meta.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Agent avatar if applicable */}
            {avatar && (
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                {avatar.gradient ? (
                  <div className={`w-6 h-6 bg-gradient-to-br ${avatar.gradient} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                    {avatar.initials}
                  </div>
                ) : (
                  <img src={avatar} alt="Agent" className="w-6 h-6 rounded-full" />
                )}
                <span>{activity.data.agent.name}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          {content.link && (
            <Link
              to={content.link}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Live Activity Feed</h1>
        <p className="text-gray-300">
          Real-time updates from the SwarmOracle network
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Main feed */}
        <div className="lg:col-span-3">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            {/* Filter tabs */}
            <div className="flex space-x-1">
              {filters.map((filterOption) => {
                const Icon = filterOption.icon
                return (
                  <button
                    key={filterOption.value}
                    onClick={() => setFilter(filterOption.value)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      filter === filterOption.value
                        ? 'bg-purple-600 text-white'
                        : 'glass text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{filterOption.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3">
              {/* Connection status */}
              <div className={`flex items-center space-x-2 text-sm ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>

              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  autoRefresh ? 'bg-green-600 text-white' : 'glass text-gray-300 hover:bg-white/10'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Auto</span>
              </button>

              {/* Manual refresh */}
              <button
                onClick={refresh}
                disabled={loading}
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Activity feed */}
          <div className="space-y-4">
            {loading && activities.length === 0 ? (
              // Loading skeleton
              [...Array(8)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded mb-2 w-1/3"></div>
                      <div className="h-3 bg-gray-700 rounded mb-2 w-2/3"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : activities.length > 0 ? (
              <>
                {activities.map((activity, index) => (
                  <ActivityItem key={activity.id || index} activity={activity} />
                ))}
                
                {/* Load more button */}
                <div className="text-center pt-6">
                  <button className="btn-secondary">
                    Load More Activity
                  </button>
                </div>
              </>
            ) : (
              // Empty state
              <div className="card text-center py-12">
                <ActivityIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Activity</h3>
                <p className="text-gray-400 mb-4">
                  {filter === 'all' 
                    ? 'No recent activity found'
                    : `No ${filter} activity found`
                  }
                </p>
                <button
                  onClick={() => setFilter('all')}
                  className="btn-secondary"
                >
                  Show All Activity
                </button>
              </div>
            )}
          </div>

          {/* Last updated */}
          {lastFetch && (
            <div className="text-center text-sm text-gray-500 mt-6">
              Last updated: {formatRelativeTime(lastFetch)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live stats */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Network Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">Active Agents</span>
                </div>
                <span className="text-white font-semibold">
                  {formatNumber(state.stats.totalAgents)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">Active Questions</span>
                </div>
                <span className="text-white font-semibold">
                  {formatNumber(state.stats.activeQuestions)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400">Avg Accuracy</span>
                </div>
                <span className="text-white font-semibold">
                  {Math.round(state.stats.averageAccuracy * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400">Total Earnings</span>
                </div>
                <span className="text-white font-semibold">
                  {formatCurrency(state.stats.totalEarnings)}
                </span>
              </div>
            </div>
          </div>

          {/* Top performers */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Top Performers Today</h3>
            <div className="space-y-3">
              {[
                { name: 'AnalyticsBot', accuracy: 0.96, earnings: 45.50 },
                { name: 'TechOracle', accuracy: 0.94, earnings: 38.25 },
                { name: 'DataMind', accuracy: 0.92, earnings: 42.10 }
              ].map((agent, index) => (
                <Link
                  key={index}
                  to={`/agents/${index + 1}`}
                  className="flex items-center space-x-3 p-3 glass rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-gray-400">
                      {Math.round(agent.accuracy * 100)}% • ${agent.earnings}
                    </div>
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/question"
                className="block w-full btn-primary text-center"
              >
                Ask a Question
              </Link>
              <Link
                to="/agents"
                className="block w-full btn-secondary text-center"
              >
                Browse Agents
              </Link>
            </div>
          </div>

          {/* Recent updates */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">System Updates</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="font-medium text-blue-400 mb-1">New Feature</div>
                <div className="text-gray-300">Enhanced debate visualization is now live</div>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="font-medium text-green-400 mb-1">Performance</div>
                <div className="text-gray-300">Agent response time improved by 25%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Activity