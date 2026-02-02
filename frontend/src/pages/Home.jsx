import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  Zap, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Activity,
  ArrowRight,
  Brain,
  Target,
  BarChart3
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { questionAPI } from '../lib/api'
import { formatNumber, QUESTION_SUGGESTIONS } from '../lib/utils'
import { useApi } from '../hooks/useApi'

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const navigate = useNavigate()
  const { state } = useApp()

  // Fetch trending questions
  const { data: trendingQuestions = [] } = useApi(
    () => questionAPI.getTrending(3),
    [],
    { showErrorNotification: false }
  )

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate('/question', { state: { initialQuestion: searchQuery } })
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setSelectedSuggestion(suggestion)
    navigate('/question', { state: { initialQuestion: suggestion } })
  }

  const features = [
    {
      icon: Brain,
      title: 'Multi-Agent Consensus',
      description: 'Get answers from multiple specialized AI agents working together to provide the most accurate response.',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: MessageSquare,
      title: 'Real-time Debate',
      description: 'Watch AI agents debate and critique each other\'s answers in real-time to reach consensus.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Target,
      title: 'Confidence Scoring',
      description: 'Every answer comes with a confidence score based on agent consensus and historical accuracy.',
      gradient: 'from-green-500 to-teal-500'
    },
    {
      icon: BarChart3,
      title: 'Transparent Analytics',
      description: 'Full transparency into how answers are derived with source attribution and reasoning.',
      gradient: 'from-orange-500 to-red-500'
    }
  ]

  const stats = [
    {
      label: 'Active AI Agents',
      value: formatNumber(state.stats.totalAgents),
      icon: Users,
      color: 'text-blue-400'
    },
    {
      label: 'Questions Answered',
      value: formatNumber(state.stats.totalQuestions),
      icon: MessageSquare,
      color: 'text-green-400'
    },
    {
      label: 'Average Accuracy',
      value: `${Math.round(state.stats.averageAccuracy * 100)}%`,
      icon: Target,
      color: 'text-purple-400'
    },
    {
      label: 'Total Earnings',
      value: `$${formatNumber(state.stats.totalEarnings)}`,
      icon: TrendingUp,
      color: 'text-yellow-400'
    }
  ]

  return (
    <div className="min-h-screen bg-dark-900 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"></div>
        <div className="absolute top-1/3 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">SwarmOracle</h1>
          </div>
          
          <Link
            to="/agents"
            className="btn-secondary flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>Browse Agents</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-12 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main heading */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block text-white">Collective</span>
              <span className="block gradient-text">AI Intelligence</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              Harness the power of multiple AI agents working together to provide 
              the most accurate, consensus-driven answers to your questions.
            </p>
          </div>

          {/* Search interface */}
          <div className="mb-12">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What would you like to know?"
                  className="w-full input-primary text-lg py-4 pl-6 pr-16 text-center"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-4 py-2"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Quick suggestions */}
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-4">Quick suggestions:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {QUESTION_SUGGESTIONS.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-sm glass px-4 py-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className="card text-center">
                  <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                  <div className="text-2xl font-bold text-white mb-1">
                    {state.stats.loading ? '...' : stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              )
            })}
          </div>

          {/* CTA Button */}
          <div className="mb-16">
            <Link
              to="/question"
              className="btn-primary text-lg px-8 py-4 rounded-xl inline-flex items-center space-x-3 animate-glow"
            >
              <span>Ask Your First Question</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Our platform combines multiple AI agents to deliver more accurate, 
              reliable, and transparent answers than any single AI could provide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="card group hover:scale-105 transform transition-all duration-300">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Recent Activity Preview */}
      {trendingQuestions.length > 0 && (
        <section className="relative z-10 px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Trending Questions
              </h2>
              <p className="text-gray-300">
                See what the community is asking about right now.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {trendingQuestions.map((question, index) => (
                <Link
                  key={question.id}
                  to={`/results/${question.id}`}
                  className="card flex items-center justify-between hover:scale-102 transform transition-all duration-200"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium mb-2">{question.text}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>{question.agentCount} agents responded</span>
                      <span>{Math.round(question.confidence * 100)}% confidence</span>
                      <span>{question.timeAgo}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Link
                to="/activity"
                className="btn-secondary inline-flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>View All Activity</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">SwarmOracle</span>
          </div>
          <p className="text-gray-400 text-sm">
            Democratizing access to collective AI intelligence. 
            Built with transparency, accuracy, and collaboration in mind.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Home