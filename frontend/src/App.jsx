import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Question from './pages/Question'
import Results from './pages/Results'
import Agents from './pages/Agents'
import AgentDetail from './pages/AgentDetail'
import Activity from './pages/Activity'
import { AppProvider } from './context/AppContext'
import { NotificationProvider } from './context/NotificationContext'

function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-dark-900 text-white">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="question" element={<Question />} />
              <Route path="results/:id" element={<Results />} />
              <Route path="agents" element={<Agents />} />
              <Route path="agents/:id" element={<AgentDetail />} />
              <Route path="activity" element={<Activity />} />
            </Route>
          </Routes>
        </div>
      </NotificationProvider>
    </AppProvider>
  )
}

export default App