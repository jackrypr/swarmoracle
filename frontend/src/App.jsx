/**
 * SwarmOracle Frontend - Phase 1
 * Main application component with routing and state management
 */

import React, { useState, useEffect } from 'react';
import SearchInterface from './components/SearchInterface';
import DebateView from './components/DebateView';
import './App.css';

function App() {
    const [currentView, setCurrentView] = useState('search'); // 'search' | 'debate'
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiConnected, setApiConnected] = useState(false);

    // Check backend connectivity on mount
    useEffect(() => {
        checkBackendConnection();
    }, []);

    const checkBackendConnection = async () => {
        try {
            // Try connecting to Railway deployment first, then fallback to localhost
            const endpoints = [
                'https://postgres-production-d944.up.railway.app',
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Connection Status */}
            <div className="fixed top-4 right-4 z-50">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apiConnected 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}>
                    {apiConnected ? '🟢 Connected' : '🟡 Demo Mode'}
                </div>
            </div>

            {/* Main Content */}
            <div className="min-h-screen flex flex-col">
                {currentView === 'search' ? (
                    <div className="flex-1 flex items-center justify-center">
                        <SearchInterface 
                            onSearch={handleSearch} 
                            isLoading={isLoading}
                        />
                    </div>
                ) : (
                    <div className="flex-1">
                        <DebateView
                            question={currentQuestion}
                            isLoading={isLoading}
                            onBack={handleBackToSearch}
                        />
                    </div>
                )}
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