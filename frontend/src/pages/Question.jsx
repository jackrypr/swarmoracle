import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Send, 
  Lightbulb, 
  Clock, 
  Users,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { questionAPI } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { useNotify } from '../context/NotificationContext'
import { 
  validateQuestion, 
  QUESTION_CATEGORIES, 
  QUESTION_SUGGESTIONS 
} from '../lib/utils'

const Question = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { success, error: notifyError } = useNotify()
  
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('medium')
  const [validationError, setValidationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get categories
  const { data: categories = QUESTION_CATEGORIES } = useApi(
    questionAPI.getCategories,
    [],
    { showErrorNotification: false, defaultValue: QUESTION_CATEGORIES }
  )

  // Initialize with question from navigation state
  useEffect(() => {
    if (location.state?.initialQuestion) {
      setQuestion(location.state.initialQuestion)
    }
  }, [location.state])

  const handleQuestionChange = (value) => {
    setQuestion(value)
    if (validationError) {
      const error = validateQuestion(value)
      setValidationError(error || '')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate question
    const error = validateQuestion(question)
    if (error) {
      setValidationError(error)
      return
    }

    if (!category) {
      setValidationError('Please select a category')
      return
    }

    setIsSubmitting(true)
    setValidationError('')

    try {
      const result = await questionAPI.submitQuestion({
        text: question.trim(),
        category,
        priority
      })

      success('Question submitted successfully! Agents are now working on your answer.')
      
      // Navigate to results page
      navigate(`/results/${result.id}`)
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to submit question')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setQuestion(suggestion)
  }

  const priorities = [
    {
      value: 'low',
      label: 'Standard',
      description: 'Normal processing time (5-10 minutes)',
      icon: Clock
    },
    {
      value: 'medium',
      label: 'Priority',
      description: 'Faster processing (2-5 minutes)',
      icon: Users
    },
    {
      value: 'high',
      label: 'Urgent',
      description: 'Immediate processing (30 seconds - 2 minutes)',
      icon: AlertCircle
    }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary mb-4 inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        
        <h1 className="text-3xl font-bold text-white mb-2">Ask a Question</h1>
        <p className="text-gray-300">
          Get answers from multiple AI agents working together to provide the most accurate response.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question input */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Your Question
              </label>
              <textarea
                value={question}
                onChange={(e) => handleQuestionChange(e.target.value)}
                placeholder="What would you like to know? Be as specific as possible for better results..."
                rows={6}
                className="w-full input-primary resize-none"
              />
              
              {/* Character count and validation */}
              <div className="flex justify-between items-center mt-2">
                <div className="text-sm text-gray-400">
                  {question.length}/500 characters
                </div>
                {validationError && (
                  <div className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full input-primary"
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Processing Priority
              </label>
              <div className="grid gap-3">
                {priorities.map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={`card cursor-pointer transition-all duration-200 ${
                        priority === option.value 
                          ? 'ring-2 ring-purple-500 bg-purple-500/10' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="priority"
                          value={option.value}
                          checked={priority === option.value}
                          onChange={(e) => setPriority(e.target.value)}
                          className="sr-only"
                        />
                        
                        <Icon className={`w-5 h-5 ${
                          priority === option.value ? 'text-purple-400' : 'text-gray-400'
                        }`} />
                        
                        <div className="flex-1">
                          <div className="font-medium text-white">{option.label}</div>
                          <div className="text-sm text-gray-400">{option.description}</div>
                        </div>
                        
                        {priority === option.value && (
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !question.trim() || !category}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Question</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-white">Tips for Better Results</h3>
            </div>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>Be specific and detailed in your question</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>Choose the most relevant category</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>Avoid yes/no questions - ask for explanations</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>Include context when relevant</span>
              </li>
            </ul>
          </div>

          {/* Question suggestions */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Popular Questions</h3>
            <div className="space-y-2">
              {QUESTION_SUGGESTIONS.slice(0, 5).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left text-sm text-gray-300 hover:text-white p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">How It Works</h3>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex space-x-3">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <span>Multiple AI agents analyze your question</span>
              </div>
              <div className="flex space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span>Each agent provides their best answer</span>
              </div>
              <div className="flex space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span>Agents debate and reach consensus</span>
              </div>
              <div className="flex space-x-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <span>You get the most accurate answer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Question