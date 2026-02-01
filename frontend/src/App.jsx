/**
 * SwarmOracle Frontend - Phase 1
 * Main application component with routing and state management
 */

import React, { useState, useEffect } from 'react';
import SearchInterface from './components/SearchInterface';
import DebateView from './components/DebateView';
import AgentMonitor from './components/AgentMonitor';
import GovernancePanel from './components/GovernancePanel';
import './App.css';

function App() {
    const [currentView, setCurrentView] = useState('search'); // 'search' | 'debate' | 'monitor' | 'governance'
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiConnected, setApiConnected] = useState(false);

    // Check backend connectivity on mount
    useEffect(() => {
        checkBackendConnection();
    }, []);

    const checkBackendConnection = async () => {
        try {
            // Production backend URL
            const apiUrl = 'https://swarmoracle-production.up.railway.app';
            const endpoints = [
                apiUrl,
                'http://localhost:3000',
                'http://localhost:3001'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${endpoint}/health`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 5000
                    });
                    
                    if (response.ok) {
                        console.log('✅ Connected to backend:', endpoint);
                        setApiConnected(true);
                        return;
                    }
                } catch (error) {
                    console.log('❌ Failed to connect to:', endpoint);
                    continue;
                }
            }
            
            console.log('⚠️ No backend connection available, using demo mode');
            setApiConnected(false);
        } catch (error) {
            console.error('Backend connection check failed:', error);
            setApiConnected(false);
        }
    };

    const handleSearch = async (question) => {
        setIsLoading(true);
        setCurrentQuestion(question);
        
        try {
            if (apiConnected) {
                // TODO: Real API call to backend
                // const response = await fetch('/api/questions', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({ question })
                // });
                // const data = await response.json();
            }
            
            // For Phase 1, simulate API delay then show debate view
            await new Promise(resolve => setTimeout(resolve, 1500));
            setCurrentView('debate');
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToSearch = () => {
        setCurrentView('search');
        setCurrentQuestion('');
        setIsLoading(false);
    };

    const navigateToView = (view) => {
        setCurrentView(view);
    };

    const renderCurrentView = () => {
        switch (currentView) {
            case 'search':
                return (
                    <div className="flex-1 flex items-center justify-center">
                        <SearchInterface 
                            onSearch={handleSearch} 
                            isLoading={isLoading}
                        />
                    </div>
                );
            case 'debate':
                return (
                    <div className="flex-1">
                        <DebateView
                            question={currentQuestion}
                            isLoading={isLoading}
                            onBack={handleBackToSearch}
                        />
                    </div>
                );
            case 'monitor':
                return <AgentMonitor question={currentQuestion} onBack={handleBackToSearch} />;
            case 'governance':
                return <GovernancePanel onBack={handleBackToSearch} />;
            default:
                return (
                    <div className="flex-1 flex items-center justify-center">
                        <SearchInterface 
                            onSearch={handleSearch} 
                            isLoading={isLoading}
                        />
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Elite Navigation Header */}
            {currentView !== 'monitor' && (
                <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
                    <div className="max-w-6xl mx-auto px-6 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => navigateToView('search')}
                                    className={`px-3 py-2 rounded-lg transition-colors ${
                                        currentView === 'search' 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    🔍 Search
                                </button>
                                <button
                                    onClick={() => navigateToView('monitor')}
                                    className={`px-3 py-2 rounded-lg transition-colors ${
                                        currentView === 'monitor' 
                                            ? 'bg-purple-100 text-purple-700' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    🧠 Agent Monitor
                                </button>
                                <button
                                    onClick={() => navigateToView('governance')}
                                    className={`px-3 py-2 rounded-lg transition-colors ${
                                        currentView === 'governance' 
                                            ? 'bg-indigo-100 text-indigo-700' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    🗳️ Governance
                                </button>
                            </div>
                            
                            {/* Connection Status */}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                apiConnected 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                                {apiConnected ? '🟢 Connected' : '🟡 Demo Mode'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="min-h-screen flex flex-col">
                {renderCurrentView()}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-8">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <h3 className="font-semibold text-gray-900 mb-4">SwarmOracle</h3>
                            <p className="text-gray-600 text-sm mb-4">
                                Collective AI intelligence platform where thousands of specialized 
                                agents collaborate to answer complex questions with unprecedented 
                                accuracy and transparency.
                            </p>
                            <div className="flex gap-4 text-sm">
                                <span className="text-gray-500">Version 2.0</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-500">Built for 10,000+ agents</span>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Features</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>Multi-Agent Consensus</li>
                                <li>Real-time Debate Visualization</li>
                                <li>Source Attribution</li>
                                <li>Confidence Tracking</li>
                                <li>Expert Reputation System</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Categories</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>Economics & Finance</li>
                                <li>Technology & AI</li>
                                <li>Climate & Environment</li>
                                <li>Politics & Society</li>
                                <li>Science & Research</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
                        <p>© 2026 SwarmOracle. Powered by collective AI intelligence.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;