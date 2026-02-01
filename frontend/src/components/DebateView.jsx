/**
 * SwarmOracle Debate View - Phase 1
 * Multi-agent discussion visualization with consensus tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
    Bot, 
    Star, 
    ThumbsUp, 
    ThumbsDown, 
    MessageCircle, 
    ExternalLink, 
    Clock,
    TrendingUp,
    TrendingDown,
    Minus,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';

const DebateView = ({ question, isLoading, onBack }) => {
    const [agents, setAgents] = useState([]);
    const [consensus, setConsensus] = useState(null);
    const [phase, setPhase] = useState('analyzing'); // analyzing, debating, converging, complete
    const [timeElapsed, setTimeElapsed] = useState(0);
    const scrollRef = useRef(null);

    // Simulate real-time debate for Phase 1
    useEffect(() => {
        if (!question) return;

        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);

        // Simulate debate phases
        setTimeout(() => setPhase('debating'), 2000);
        setTimeout(() => setPhase('converging'), 8000);
        setTimeout(() => setPhase('complete'), 12000);

        // Simulate agent responses
        const mockAgents = [
            {
                id: 'agent_alpha',
                name: 'EconomicsBot Alpha',
                specialty: 'Macroeconomics',
                reputation: 94,
                avatar: '🏦',
                position: 'YES',
                confidence: 87,
                reasoning: "Based on historical precedent and current Fed policy trajectory, inflation is likely to exceed 3% due to continued stimulus effects and supply chain normalization lag.",
                sources: [
                    "Federal Reserve Economic Data (FRED) 2024",
                    "Congressional Budget Office Projections",
                    "Historical Inflation Cycles Analysis"
                ],
                timestamp: Date.now() - 10000
            },
            {
                id: 'agent_beta',
                name: 'DataSci Oracle Beta',
                specialty: 'Statistical Analysis',
                reputation: 92,
                avatar: '📊',
                position: 'NO',
                confidence: 83,
                reasoning: "Statistical models incorporating real-time indicators suggest deflationary pressures will dominate Q4 2026, with energy cost reductions and productivity gains outweighing stimulus effects.",
                sources: [
                    "Consumer Price Index Trends",
                    "Energy Futures Market Data",
                    "Labor Productivity Statistics"
                ],
                timestamp: Date.now() - 8000
            },
            {
                id: 'agent_gamma',
                name: 'PolicyAnalyzer Gamma',
                specialty: 'Economic Policy',
                reputation: 89,
                avatar: '🏛️',
                position: 'UNCERTAIN',
                confidence: 76,
                reasoning: "Policy implementation timing creates significant uncertainty. The outcome depends heavily on federal response to economic indicators in Q3 2026, which remains unpredictable.",
                sources: [
                    "Federal Policy Implementation Timeline",
                    "Economic Response Modeling",
                    "Uncertainty Analysis Framework"
                ],
                timestamp: Date.now() - 6000
            }
        ];

        setTimeout(() => setAgents(mockAgents), 3000);
        
        // Simulate consensus formation
        setTimeout(() => {
            setConsensus({
                result: 'LEAN_YES',
                confidence: 72,
                agreement: 68,
                reasoning: "Weighted analysis suggests 72% probability of inflation exceeding 3%, though significant uncertainty remains due to policy variables.",
                votingBreakdown: {
                    YES: 45,
                    NO: 32,
                    UNCERTAIN: 23
                },
                algorithmUsed: 'Hybrid Consensus',
                calculationTime: 11.2
            });
        }, 12000);

        return () => clearInterval(timer);
    }, [question]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPhaseColor = (currentPhase) => {
        const phases = {
            'analyzing': 'bg-yellow-100 text-yellow-800',
            'debating': 'bg-blue-100 text-blue-800',
            'converging': 'bg-purple-100 text-purple-800',
            'complete': 'bg-green-100 text-green-800'
        };
        return phases[currentPhase] || phases.analyzing;
    };

    const getPositionIcon = (position) => {
        switch (position) {
            case 'YES': return <TrendingUp className="w-4 h-4 text-green-500" />;
            case 'NO': return <TrendingDown className="w-4 h-4 text-red-500" />;
            case 'UNCERTAIN': return <Minus className="w-4 h-4 text-gray-500" />;
            default: return <MessageCircle className="w-4 h-4" />;
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 80) return 'text-green-500';
        if (confidence >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <button 
                    onClick={onBack}
                    className="text-blue-500 hover:text-blue-600 mb-4 flex items-center gap-2"
                >
                    ← Back to search
                </button>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">{question}</h1>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPhaseColor(phase)}`}>
                                {phase.charAt(0).toUpperCase() + phase.slice(1)}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                {formatTime(timeElapsed)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Agents Discussion */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-blue-500" />
                                Agent Deliberation
                                <span className="text-sm text-gray-500">({agents.length} participating)</span>
                            </h2>
                        </div>
                        
                        <div className="p-6 space-y-6" ref={scrollRef}>
                            {isLoading || agents.length === 0 ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                                <div className="flex-1">
                                                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                agents.map(agent => (
                                    <div key={agent.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        {/* Agent Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-xl">
                                                    {agent.avatar}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                                                        <div className="flex">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star 
                                                                    key={i} 
                                                                    className={`w-3 h-3 ${i < Math.floor(agent.reputation / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <span>{agent.specialty}</span>
                                                        <span>Reputation: {agent.reputation}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {getPositionIcon(agent.position)}
                                                <span className={`font-semibold ${getConfidenceColor(agent.confidence)}`}>
                                                    {agent.confidence}% confident
                                                </span>
                                            </div>
                                        </div>

                                        {/* Agent Reasoning */}
                                        <div className="mb-4">
                                            <p className="text-gray-800 leading-relaxed">{agent.reasoning}</p>
                                        </div>

                                        {/* Sources */}
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Evidence Sources:</h4>
                                            <div className="space-y-1">
                                                {agent.sources.map((source, index) => (
                                                    <div key={index} className="flex items-center gap-2 text-sm text-blue-600">
                                                        <ExternalLink className="w-3 h-3" />
                                                        <span>{source}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Engagement Actions */}
                                        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600">
                                                <ThumbsUp className="w-4 h-4" />
                                                <span>Agree</span>
                                            </button>
                                            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600">
                                                <ThumbsDown className="w-4 h-4" />
                                                <span>Disagree</span>
                                            </button>
                                            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
                                                <MessageCircle className="w-4 h-4" />
                                                <span>Discuss</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Consensus Sidebar */}
                <div className="space-y-6">
                    {/* Consensus Result */}
                    {consensus ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <h3 className="text-lg font-semibold text-gray-900">Consensus Reached</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div className={`text-3xl font-bold ${getConfidenceColor(consensus.confidence)}`}>
                                        {consensus.confidence}%
                                    </div>
                                    <div className="text-gray-600">Confidence Level</div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Final Assessment:</h4>
                                    <p className="text-sm text-gray-700">{consensus.reasoning}</p>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Vote Distribution:</h4>
                                    <div className="space-y-2">
                                        {Object.entries(consensus.votingBreakdown).map(([position, percentage]) => (
                                            <div key={position} className="flex items-center gap-3">
                                                <div className="w-16 text-sm text-gray-600">{position}:</div>
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                                <div className="w-12 text-sm text-gray-900 font-medium">{percentage}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
                                    <div>Algorithm: {consensus.algorithmUsed}</div>
                                    <div>Calculation time: {consensus.calculationTime}s</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />
                                <h3 className="text-lg font-semibold text-gray-900">Analyzing...</h3>
                            </div>
                            <div className="text-sm text-gray-600">
                                AI agents are debating and analyzing available evidence. 
                                Consensus formation typically takes 30-60 seconds.
                            </div>
                        </div>
                    )}

                    {/* Agent Performance Summary */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
                        <div className="space-y-3">
                            {agents.map(agent => (
                                <div key={agent.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{agent.avatar}</span>
                                        <span className="text-sm text-gray-700">{agent.name.split(' ')[0]}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`w-3 h-3 ${i < Math.floor(agent.reputation / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-gray-500">{agent.reputation}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebateView;