/**
 * SwarmOracle Elite Agent Monitor - Real-time Agent Visualization
 * Shows agents working, communicating, and thinking in real-time
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
    Bot, 
    Brain, 
    MessageCircle, 
    Activity, 
    Eye, 
    Zap,
    Network,
    Clock,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Cpu,
    Database,
    Globe,
    Users,
    BarChart3,
    Settings,
    Play,
    Pause,
    RotateCcw
} from 'lucide-react';

const AgentMonitor = ({ question, onBack }) => {
    const [agents, setAgents] = useState([]);
    const [messages, setMessages] = useState([]);
    const [networkActivity, setNetworkActivity] = useState([]);
    const [isPlaying, setIsPlaying] = useState(true);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const messagesRef = useRef(null);

    // Initialize elite agents
    useEffect(() => {
        const eliteAgents = [
            {
                id: 'alpha-reasoning',
                name: 'Alpha Reasoning Engine',
                type: 'Logical Analysis',
                status: 'analyzing',
                confidence: 0,
                avatar: '🧠',
                color: 'blue',
                position: { x: 20, y: 20 },
                specialty: 'Causal Reasoning, Logic Trees',
                currentTask: 'Building argument structure...',
                progress: 15,
                connections: ['beta-data', 'gamma-synthesis']
            },
            {
                id: 'beta-data',
                name: 'Beta Data Oracle',
                type: 'Information Retrieval',
                status: 'searching',
                confidence: 0,
                avatar: '📊',
                color: 'green',
                position: { x: 60, y: 30 },
                specialty: 'Statistical Analysis, Pattern Recognition',
                currentTask: 'Analyzing market data patterns...',
                progress: 45,
                connections: ['alpha-reasoning', 'delta-validator']
            },
            {
                id: 'gamma-synthesis',
                name: 'Gamma Synthesis Agent',
                type: 'Knowledge Integration',
                status: 'thinking',
                confidence: 0,
                avatar: '🔮',
                color: 'purple',
                position: { x: 40, y: 60 },
                specialty: 'Cross-Domain Synthesis, Emergent Insights',
                currentTask: 'Synthesizing diverse perspectives...',
                progress: 25,
                connections: ['alpha-reasoning', 'epsilon-critic']
            },
            {
                id: 'delta-validator',
                name: 'Delta Validation Engine',
                type: 'Fact Checking',
                status: 'validating',
                confidence: 0,
                avatar: '✅',
                color: 'orange',
                position: { x: 80, y: 50 },
                specialty: 'Source Verification, Accuracy Assessment',
                currentTask: 'Cross-referencing claims...',
                progress: 60,
                connections: ['beta-data', 'epsilon-critic']
            },
            {
                id: 'epsilon-critic',
                name: 'Epsilon Critical Reviewer',
                type: 'Bias Detection',
                status: 'reviewing',
                confidence: 0,
                avatar: '🔍',
                color: 'red',
                position: { x: 70, y: 80 },
                specialty: 'Bias Analysis, Counterargument Generation',
                currentTask: 'Identifying potential biases...',
                progress: 35,
                connections: ['gamma-synthesis', 'delta-validator']
            }
        ];
        
        setAgents(eliteAgents);
    }, [question]);

    // Simulate real-time agent communication
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
            
            // Simulate agent messages
            if (Math.random() > 0.7) {
                const agent = agents[Math.floor(Math.random() * agents.length)];
                const messageTypes = [
                    'analysis', 'discovery', 'question', 'hypothesis', 'validation', 'concern'
                ];
                const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
                
                const messageSamples = {
                    analysis: [
                        "Initial analysis suggests strong correlation with historical patterns",
                        "Breaking down the problem into 3 key components",
                        "Causal chain appears to have 4 primary variables"
                    ],
                    discovery: [
                        "Found contradictory evidence in dataset B",
                        "Discovered unexpected pattern in recent data",
                        "Identified potential confounding variable"
                    ],
                    question: [
                        "Need clarification on temporal boundaries",
                        "Should we weight recent data more heavily?",
                        "What confidence threshold should we use?"
                    ],
                    hypothesis: [
                        "Proposing alternative explanation for observed trend",
                        "Testing hypothesis: external factors dominate",
                        "Counter-hypothesis: internal dynamics are primary"
                    ],
                    validation: [
                        "Cross-referenced with 3 independent sources - confirmed",
                        "Statistical significance achieved (p < 0.01)",
                        "Validation complete - high reliability score"
                    ],
                    concern: [
                        "Potential bias detected in data source",
                        "Sample size may be insufficient for this conclusion",
                        "Outliers could be skewing results"
                    ]
                };
                
                const newMessage = {
                    id: `msg_${Date.now()}`,
                    agentId: agent?.id || 'alpha-reasoning',
                    agentName: agent?.name || 'Alpha Reasoning Engine',
                    agentAvatar: agent?.avatar || '🧠',
                    type: messageType,
                    content: messageSamples[messageType][Math.floor(Math.random() * messageSamples[messageType].length)],
                    timestamp: Date.now(),
                    confidence: Math.floor(Math.random() * 40) + 60,
                    connections: Math.floor(Math.random() * 3) + 1
                };
                
                setMessages(prev => [...prev.slice(-20), newMessage]);
                
                // Update agent progress and status
                setAgents(prev => prev.map(a => {
                    if (a.id === agent?.id) {
                        return {
                            ...a,
                            progress: Math.min(100, a.progress + Math.floor(Math.random() * 10) + 5),
                            confidence: Math.min(100, a.confidence + Math.floor(Math.random() * 5) + 2),
                            status: a.progress > 80 ? 'completing' : a.status
                        };
                    }
                    return a;
                }));
            }
            
            // Simulate network activity
            if (Math.random() > 0.8) {
                const activity = {
                    id: `net_${Date.now()}`,
                    type: Math.random() > 0.5 ? 'data_exchange' : 'consensus_sync',
                    source: agents[Math.floor(Math.random() * agents.length)]?.id,
                    target: agents[Math.floor(Math.random() * agents.length)]?.id,
                    timestamp: Date.now(),
                    strength: Math.random()
                };
                
                setNetworkActivity(prev => [...prev.slice(-10), activity]);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [agents, isPlaying]);

    // Auto-scroll messages
    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'analyzing': return <Brain className="w-4 h-4 text-blue-500" />;
            case 'searching': return <Globe className="w-4 h-4 text-green-500" />;
            case 'thinking': return <Cpu className="w-4 h-4 text-purple-500" />;
            case 'validating': return <CheckCircle className="w-4 h-4 text-orange-500" />;
            case 'reviewing': return <Eye className="w-4 h-4 text-red-500" />;
            case 'completing': return <Zap className="w-4 h-4 text-yellow-500" />;
            default: return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    const getMessageTypeColor = (type) => {
        const colors = {
            analysis: 'bg-blue-50 border-blue-200',
            discovery: 'bg-green-50 border-green-200',
            question: 'bg-yellow-50 border-yellow-200',
            hypothesis: 'bg-purple-50 border-purple-200',
            validation: 'bg-emerald-50 border-emerald-200',
            concern: 'bg-red-50 border-red-200'
        };
        return colors[type] || 'bg-gray-50 border-gray-200';
    };

    return (
        <div className="h-screen bg-gray-900 text-white overflow-hidden">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            ← Back
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Network className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Elite Agent Monitor</h1>
                                <p className="text-gray-400 text-sm">Real-time collective intelligence</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-4 h-4" />
                            {formatTime(timeElapsed)}
                        </div>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`p-2 rounded-lg transition-colors ${
                                isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => {
                                setMessages([]);
                                setNetworkActivity([]);
                                setTimeElapsed(0);
                            }}
                            className="p-2 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex h-full">
                {/* Agent Network Visualization */}
                <div className="w-1/2 p-6 border-r border-gray-700">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-400" />
                        Agent Network
                    </h2>
                    
                    <div className="relative bg-gray-800 rounded-lg p-6 h-96 overflow-hidden">
                        {/* Network connections */}
                        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                            {agents.map(agent => 
                                agent.connections?.map(targetId => {
                                    const target = agents.find(a => a.id === targetId);
                                    if (!target) return null;
                                    
                                    return (
                                        <line
                                            key={`${agent.id}-${targetId}`}
                                            x1={`${agent.position.x}%`}
                                            y1={`${agent.position.y}%`}
                                            x2={`${target.position.x}%`}
                                            y2={`${target.position.y}%`}
                                            stroke="rgba(59, 130, 246, 0.3)"
                                            strokeWidth="2"
                                            className="animate-pulse"
                                        />
                                    );
                                })
                            ).flat()}
                        </svg>
                        
                        {/* Agent nodes */}
                        {agents.map(agent => (
                            <div
                                key={agent.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                style={{ 
                                    left: `${agent.position.x}%`, 
                                    top: `${agent.position.y}%`,
                                    zIndex: 2
                                }}
                                onClick={() => setSelectedAgent(agent)}
                            >
                                <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-${agent.color}-400 to-${agent.color}-600 flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform`}>
                                    {agent.avatar}
                                    <div className="absolute -top-1 -right-1">
                                        {getStatusIcon(agent.status)}
                                    </div>
                                    
                                    {/* Progress ring */}
                                    <svg className="absolute inset-0 w-16 h-16 transform -rotate-90">
                                        <circle
                                            cx="32"
                                            cy="32"
                                            r="28"
                                            stroke="rgba(255,255,255,0.2)"
                                            strokeWidth="2"
                                            fill="none"
                                        />
                                        <circle
                                            cx="32"
                                            cy="32"
                                            r="28"
                                            stroke="rgba(255,255,255,0.8)"
                                            strokeWidth="2"
                                            fill="none"
                                            strokeDasharray={`${2 * Math.PI * 28}`}
                                            strokeDashoffset={`${2 * Math.PI * 28 * (1 - agent.progress / 100)}`}
                                            className="transition-all duration-500"
                                        />
                                    </svg>
                                </div>
                                
                                <div className="mt-2 text-center">
                                    <div className="text-xs font-medium">{agent.name.split(' ')[0]}</div>
                                    <div className="text-xs text-gray-400">{agent.progress}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Selected Agent Details */}
                    {selectedAgent && (
                        <div className="mt-4 bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{selectedAgent.avatar}</span>
                                <div>
                                    <h3 className="font-semibold">{selectedAgent.name}</h3>
                                    <p className="text-sm text-gray-400">{selectedAgent.type}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Specialty:</span>
                                    <span>{selectedAgent.specialty}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Progress:</span>
                                    <span>{selectedAgent.progress}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Confidence:</span>
                                    <span>{selectedAgent.confidence}%</span>
                                </div>
                                <div className="text-gray-300 mt-2">
                                    <span className="text-gray-400">Current Task:</span>
                                    <br />
                                    {selectedAgent.currentTask}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Communication Stream */}
                <div className="w-1/2 flex flex-col">
                    {/* Stats Panel */}
                    <div className="p-4 bg-gray-800 border-b border-gray-700">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">{agents.length}</div>
                                <div className="text-xs text-gray-400">Active Agents</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-400">{messages.length}</div>
                                <div className="text-xs text-gray-400">Messages</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-400">
                                    {Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length)}%
                                </div>
                                <div className="text-xs text-gray-400">Avg Progress</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-400">
                                    {Math.round(agents.reduce((sum, a) => sum + a.confidence, 0) / agents.length)}%
                                </div>
                                <div className="text-xs text-gray-400">Avg Confidence</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Message Stream */}
                    <div className="flex-1 p-4">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-green-400" />
                            Real-time Communication
                        </h2>
                        
                        <div 
                            ref={messagesRef}
                            className="space-y-3 h-96 overflow-y-auto custom-scrollbar"
                        >
                            {messages.map(message => (
                                <div
                                    key={message.id}
                                    className={`p-3 rounded-lg border ${getMessageTypeColor(message.type)} animate-slide-in-up`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">{message.agentAvatar}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900">{message.agentName}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full bg-${message.type === 'analysis' ? 'blue' : message.type === 'discovery' ? 'green' : 'gray'}-100 text-${message.type === 'analysis' ? 'blue' : message.type === 'discovery' ? 'green' : 'gray'}-800`}>
                                                    {message.type}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-800 text-sm">{message.content}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                                <span>Confidence: {message.confidence}%</span>
                                                <span>Connections: {message.connections}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 py-12">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Waiting for agent communication...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentMonitor;