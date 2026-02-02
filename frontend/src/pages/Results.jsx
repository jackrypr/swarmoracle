import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft,
  Share2,
  Download,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Users,
  Clock,
  Target,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { questionAPI } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { useLiveUpdates } from '../hooks/useWebSocket'
import { useNotify } from '../context/NotificationContext'
import { 
  formatConfidence, 
  formatRelativeTime, 
  getAvatarUrl,
  shareUrl,
  copyToClipboard
} from '../lib/utils'

const Results = () => {
  const { id } = useParams()
  const { success, error: notifyError } = useNotify()
  const [activeTab, setActiveTab] = useState('consensus')
  const [expandedAgents, setExpandedAgents] = useState(new Set())
  const [showAllSources, setShowAllSources] = useState(false)

  // Fetch question results
  const { 
    data: results, 
    loading, 
    error,
    refresh 
  } = useApi(() => questionAPI.getResults(id), [id])

  // Live updates for this question
  const { liveData, subscribeToQuestion, unsubscribeFromQuestion } = useLiveUpdates()

  useEffect(() => {
    if (id) {
      subscribeToQuestion(id)
      return () => unsubscribeFromQuestion(id)
    }
  }, [id, subscribeToQuestion, unsubscribeFromQuestion])

  // Update results with live data
  useEffect(() => {
    if (liveData.questions[id]) {
      refresh()
    }
  }, [liveData.questions, id, refresh])

  const handleShare = async () => {
    const url = window.location.href
    const shared = await shareUrl(url, `SwarmOracle: ${results?.question?.text}`)
    if (shared) {
      success('Results shared successfully!')
    }
  }

  const handleCopyLink = async () => {
    const copied = await copyToClipboard(window.location.href)
    if (copied) {
      success('Link copied to clipboard!')
    }
  }

  const toggleAgentExpansion = (agentId) => {
    const newExpanded = new Set(expandedAgents)
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId)
    } else {
      newExpanded.add(agentId)
    }
    setExpandedAgents(newExpanded)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-8"></div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="card">
                <div className="h-6 bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
            <div>
              <div className="card">
                <div className="h-20 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="max-w-6xl mx-auto text-center">
        <div className="card max-w-md mx-auto">
          <div className="text-red-400 mb-4">
            <MessageCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Results Not Found</h2>
          <p className="text-gray-300 mb-4">
            The question you're looking for doesn't exist or is still being processed.
          </p>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const { question, consensus, agents = [], debate = [], sources = [], status } = results
  const isProcessing = status === 'processing'
  const confidenceData = formatConfidence(consensus?.confidence || 0)

  const tabs = [
    { id: 'consensus', label: 'Consensus Answer', icon: Target },
    { id: 'agents', label: `Agent Responses (${agents.length})`, icon: Users },
    { id: 'debate', label: `Debate Timeline (${debate.length})`, icon: MessageCircle }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/activity"
          className="btn-secondary mb-4 inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Activity</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {question.text}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatRelativeTime(question.createdAt)}</span>
              </span>
              <span className="capitalize px-2 py-1 bg-gray-700 rounded-full">
                {question.category}
              </span>
              <span className={`px-2 py-1 rounded-full ${
                isProcessing ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {isProcessing ? 'Processing' : 'Complete'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleShare}
              className="btn-secondary flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Main content */}
        <div className="lg:col-span-3">
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
                  <span className="sm:hidden">{tab.id}</span>
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="space-y-6">
            {/* Consensus tab */}
            {activeTab === 'consensus' && (
              <div className="space-y-6">
                {consensus ? (
                  <>
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white">Consensus Answer</h3>
                        <div className={`text-lg font-bold ${confidenceData.color}`}>
                          {confidenceData.percentage}% confidence
                        </div>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-gray-200 text-lg leading-relaxed">
                          {consensus.answer}
                        </p>
                      </div>
                    </div>

                    {/* Key points */}
                    {consensus.keyPoints && consensus.keyPoints.length > 0 && (
                      <div className="card">
                        <h4 className="font-semibold text-white mb-3">Key Points</h4>
                        <ul className="space-y-2">
                          {consensus.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-300">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sources */}
                    {sources.length > 0 && (
                      <div className="card">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-white">Sources</h4>
                          {sources.length > 3 && (
                            <button
                              onClick={() => setShowAllSources(!showAllSources)}
                              className="text-sm text-purple-400 hover:text-purple-300"
                            >
                              {showAllSources ? 'Show Less' : `Show All (${sources.length})`}
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {(showAllSources ? sources : sources.slice(0, 3)).map((source, index) => (
                            <a
                              key={index}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 glass rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-white mb-1">{source.title}</div>
                                  <div className="text-sm text-gray-400">{source.domain}</div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0 ml-2" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="card text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-white mb-2">Building Consensus</h3>
                    <p className="text-gray-400">
                      Our AI agents are analyzing responses and building consensus...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Agents tab */}
            {activeTab === 'agents' && (
              <div className="space-y-4">
                {agents.map((agent) => {
                  const avatar = getAvatarUrl(agent)
                  const isExpanded = expandedAgents.has(agent.id)
                  const agentConfidence = formatConfidence(agent.confidence || 0)

                  return (
                    <div key={agent.id} className="card">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleAgentExpansion(agent.id)}
                      >
                        <div className="flex items-center space-x-3">
                          {avatar.gradient ? (
                            <div className={`w-10 h-10 bg-gradient-to-br ${avatar.gradient} rounded-full flex items-center justify-center text-white font-bold`}>
                              {avatar.initials}
                            </div>
                          ) : (
                            <img 
                              src={avatar} 
                              alt={agent.name}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-white">{agent.name}</div>
                            <div className="text-sm text-gray-400">{agent.specialty}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className={`text-sm font-bold ${agentConfidence.color}`}>
                            {agentConfidence.percentage}%
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="prose prose-invert max-w-none">
                            <p className="text-gray-300">{agent.answer}</p>
                          </div>
                          
                          {agent.reasoning && (
                            <div className="mt-3 p-3 bg-black/20 rounded-lg">
                              <div className="text-sm font-medium text-gray-400 mb-1">Reasoning:</div>
                              <div className="text-sm text-gray-300">{agent.reasoning}</div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Responded {formatRelativeTime(agent.respondedAt)}
                            </div>
                            <div className="flex space-x-2">
                              <button className="text-green-400 hover:text-green-300 p-1">
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button className="text-red-400 hover:text-red-300 p-1">
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Debate tab */}
            {activeTab === 'debate' && (
              <div className="space-y-6">
                {debate.length > 0 ? (
                  <div className="space-y-4">
                    {debate.map((entry, index) => (
                      <div key={index} className="card">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {entry.agent.name[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-white">{entry.agent.name}</span>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(entry.timestamp)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                entry.type === 'support' 
                                  ? 'bg-green-500/20 text-green-400'
                                  : entry.type === 'critique'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {entry.type}
                              </span>
                            </div>
                            <p className="text-gray-300">{entry.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card text-center">
                    <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Debate Yet</h3>
                    <p className="text-gray-400">
                      Agent debate and critique will appear here as it happens.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status card */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Question Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={isProcessing ? 'text-yellow-400' : 'text-green-400'}>
                  {isProcessing ? 'Processing' : 'Complete'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Agents</span>
                <span className="text-white">{agents.length} responded</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence</span>
                <span className={confidenceData.color}>
                  {confidenceData.percentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Processing Time</span>
                <span className="text-white">
                  {question.processingTime || '2m 34s'}
                </span>
              </div>
            </div>
          </div>

          {/* Related questions */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Related Questions</h3>
            <div className="space-y-3">
              <Link to="/results/123" className="block p-3 glass rounded-lg hover:bg-white/10 transition-colors">
                <div className="text-sm text-white mb-1">
                  How will AI impact job markets?
                </div>
                <div className="text-xs text-gray-400">94% confidence</div>
              </Link>
              <Link to="/results/124" className="block p-3 glass rounded-lg hover:bg-white/10 transition-colors">
                <div className="text-sm text-white mb-1">
                  What are the risks of AGI development?
                </div>
                <div className="text-xs text-gray-400">87% confidence</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results