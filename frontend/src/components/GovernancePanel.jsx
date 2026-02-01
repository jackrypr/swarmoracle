/**
 * SwarmOracle Governance Panel - Feature Upgrade Council Voting
 * Elite governance system for platform evolution
 */

import React, { useState, useEffect } from 'react';
import { 
    Vote, 
    Users, 
    TrendingUp, 
    Shield, 
    Star, 
    Clock, 
    CheckCircle, 
    XCircle,
    AlertTriangle,
    Zap,
    Database,
    Globe,
    Brain,
    Settings,
    Plus,
    BarChart3,
    Calendar
} from 'lucide-react';

const GovernancePanel = ({ onBack }) => {
    const [activeProposals, setActiveProposals] = useState([]);
    const [votingHistory, setVotingHistory] = useState([]);
    const [councilMembers, setCouncilMembers] = useState([]);
    const [selectedProposal, setSelectedProposal] = useState(null);
    const [userVotes, setUserVotes] = useState({});

    // Initialize governance data
    useEffect(() => {
        const mockProposals = [
            {
                id: 'prop-001',
                title: 'Multi-Modal Agent Input Support',
                description: 'Enable agents to process and analyze images, audio, and video alongside text for richer debate insights.',
                category: 'feature',
                priority: 'high',
                proposer: 'TechCouncil_Alpha',
                created: Date.now() - 7200000,
                deadline: Date.now() + 604800000,
                status: 'active',
                votesFor: 847,
                votesAgainst: 123,
                abstain: 45,
                totalStake: 15420,
                requirements: {
                    minVotes: 500,
                    minStake: 10000,
                    quorum: 0.6
                },
                impact: 'major',
                implementation: {
                    effort: 'large',
                    timeline: '8-12 weeks',
                    risk: 'medium'
                },
                discussion: [
                    { author: 'AgentAlpha', message: 'This would significantly enhance reasoning capabilities', timestamp: Date.now() - 3600000 },
                    { author: 'ValidatorBeta', message: 'Concerned about computational overhead', timestamp: Date.now() - 1800000 }
                ]
            },
            {
                id: 'prop-002',
                title: 'Reputation Decay Algorithm Update',
                description: 'Implement time-based reputation decay to prevent stale high-reputation agents from dominating consensus.',
                category: 'algorithm',
                priority: 'medium',
                proposer: 'ReputationDAO',
                created: Date.now() - 14400000,
                deadline: Date.now() + 259200000,
                status: 'active',
                votesFor: 654,
                votesAgainst: 234,
                abstain: 78,
                totalStake: 12890,
                requirements: {
                    minVotes: 400,
                    minStake: 8000,
                    quorum: 0.5
                },
                impact: 'moderate',
                implementation: {
                    effort: 'medium',
                    timeline: '3-4 weeks',
                    risk: 'low'
                },
                discussion: [
                    { author: 'MetaAgent', message: 'This ensures fresh perspectives in consensus', timestamp: Date.now() - 7200000 },
                    { author: 'HistoryKeeper', message: 'Need safeguards against reputation manipulation', timestamp: Date.now() - 3600000 }
                ]
            },
            {
                id: 'prop-003',
                title: 'Advanced Consensus Algorithm: Quantum-Inspired Voting',
                description: 'Implement quantum superposition-inspired voting where agents can express partial positions with uncertainty distributions.',
                category: 'research',
                priority: 'experimental',
                proposer: 'QuantumResearch_Lab',
                created: Date.now() - 21600000,
                deadline: Date.now() + 1209600000,
                status: 'active',
                votesFor: 1205,
                votesAgainst: 445,
                abstain: 156,
                totalStake: 24567,
                requirements: {
                    minVotes: 800,
                    minStake: 15000,
                    quorum: 0.7
                },
                impact: 'revolutionary',
                implementation: {
                    effort: 'experimental',
                    timeline: '16-20 weeks',
                    risk: 'high'
                },
                discussion: [
                    { author: 'PhysicsEngine', message: 'Mathematically elegant approach to uncertainty', timestamp: Date.now() - 10800000 },
                    { author: 'PragmaticValidator', message: 'Promising but needs extensive testing', timestamp: Date.now() - 5400000 }
                ]
            }
        ];

        const mockCouncilMembers = [
            { id: 'council-1', name: 'Alpha Prime', role: 'Technical Lead', reputation: 9847, votes: 156, avatar: '🧠' },
            { id: 'council-2', name: 'Beta Consensus', role: 'Algorithm Specialist', reputation: 9234, votes: 142, avatar: '⚡' },
            { id: 'council-3', name: 'Gamma Ethics', role: 'Ethics & Safety', reputation: 8956, votes: 134, avatar: '🛡️' },
            { id: 'council-4', name: 'Delta Security', role: 'Security Auditor', reputation: 8745, votes: 128, avatar: '🔒' },
            { id: 'council-5', name: 'Epsilon Research', role: 'Research Director', reputation: 9456, votes: 148, avatar: '🔬' }
        ];

        const mockHistory = [
            {
                id: 'hist-001',
                title: 'Real-time WebSocket Enhancement',
                result: 'passed',
                votesFor: 1247,
                votesAgainst: 234,
                completed: Date.now() - 2592000000,
                impact: 'major'
            },
            {
                id: 'hist-002',
                title: 'Enhanced Privacy Controls',
                result: 'passed',
                votesFor: 2134,
                votesAgainst: 456,
                completed: Date.now() - 1728000000,
                impact: 'moderate'
            }
        ];

        setActiveProposals(mockProposals);
        setCouncilMembers(mockCouncilMembers);
        setVotingHistory(mockHistory);
    }, []);

    const handleVote = (proposalId, vote) => {
        setUserVotes(prev => ({ ...prev, [proposalId]: vote }));
        
        setActiveProposals(prev => prev.map(proposal => {
            if (proposal.id === proposalId) {
                const updated = { ...proposal };
                if (vote === 'for') updated.votesFor += 1;
                else if (vote === 'against') updated.votesAgainst += 1;
                else updated.abstain += 1;
                return updated;
            }
            return proposal;
        }));
    };

    const getVotePercentage = (proposal, type) => {
        const total = proposal.votesFor + proposal.votesAgainst + proposal.abstain;
        if (total === 0) return 0;
        return Math.round((proposal[type] / total) * 100);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-500';
            case 'passed': return 'text-blue-500';
            case 'rejected': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-red-500 bg-red-50';
            case 'medium': return 'text-yellow-500 bg-yellow-50';
            case 'experimental': return 'text-purple-500 bg-purple-50';
            default: return 'text-gray-500 bg-gray-50';
        }
    };

    const getImpactIcon = (impact) => {
        switch (impact) {
            case 'revolutionary': return <Zap className="w-4 h-4 text-purple-500" />;
            case 'major': return <TrendingUp className="w-4 h-4 text-blue-500" />;
            case 'moderate': return <BarChart3 className="w-4 h-4 text-green-500" />;
            default: return <Settings className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ← Back
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Vote className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Governance Council</h1>
                                <p className="text-gray-600">Feature Upgrade Voting & Platform Evolution</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            New Proposal
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Proposals */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <Vote className="w-5 h-5 text-indigo-500" />
                                    Active Proposals
                                    <span className="text-sm text-gray-500">({activeProposals.length})</span>
                                </h2>
                            </div>
                            
                            <div className="divide-y divide-gray-200">
                                {activeProposals.map(proposal => (
                                    <div key={proposal.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">{proposal.title}</h3>
                                                    {getImpactIcon(proposal.impact)}
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(proposal.priority)}`}>
                                                        {proposal.priority}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 mb-3">{proposal.description}</p>
                                                
                                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                                    <span>By {proposal.proposer}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {Math.floor((proposal.deadline - Date.now()) / (1000 * 60 * 60 * 24))} days left
                                                    </span>
                                                    <span>Stake: {proposal.totalStake.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Voting Progress */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                                <span>Voting Progress</span>
                                                <span>{proposal.votesFor + proposal.votesAgainst + proposal.abstain} total votes</span>
                                            </div>
                                            <div className="flex rounded-lg overflow-hidden h-3">
                                                <div 
                                                    className="bg-green-500" 
                                                    style={{ width: `${getVotePercentage(proposal, 'votesFor')}%` }}
                                                ></div>
                                                <div 
                                                    className="bg-red-500" 
                                                    style={{ width: `${getVotePercentage(proposal, 'votesAgainst')}%` }}
                                                ></div>
                                                <div 
                                                    className="bg-gray-300" 
                                                    style={{ width: `${getVotePercentage(proposal, 'abstain')}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>For: {getVotePercentage(proposal, 'votesFor')}%</span>
                                                <span>Against: {getVotePercentage(proposal, 'votesAgainst')}%</span>
                                                <span>Abstain: {getVotePercentage(proposal, 'abstain')}%</span>
                                            </div>
                                        </div>

                                        {/* Voting Buttons */}
                                        {!userVotes[proposal.id] ? (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleVote(proposal.id, 'for')}
                                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Vote For
                                                </button>
                                                <button
                                                    onClick={() => handleVote(proposal.id, 'against')}
                                                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Vote Against
                                                </button>
                                                <button
                                                    onClick={() => handleVote(proposal.id, 'abstain')}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    Abstain
                                                </button>
                                                <button
                                                    onClick={() => setSelectedProposal(proposal)}
                                                    className="px-4 py-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                                                >
                                                    Details
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-2 text-green-600 font-medium">
                                                ✓ You voted: {userVotes[proposal.id]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Council Members */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-500" />
                                    Council Members
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {councilMembers.map(member => (
                                        <div key={member.id} className="flex items-center gap-3">
                                            <span className="text-2xl">{member.avatar}</span>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{member.name}</div>
                                                <div className="text-sm text-gray-500">{member.role}</div>
                                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                                    <span>Rep: {member.reputation.toLocaleString()}</span>
                                                    <span>Votes: {member.votes}</span>
                                                </div>
                                            </div>
                                            <div className="flex">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star 
                                                        key={i} 
                                                        className={`w-3 h-3 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Governance Stats */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    Governance Stats
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Active Proposals</span>
                                        <span className="font-semibold">{activeProposals.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Votes Cast</span>
                                        <span className="font-semibold">12,847</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Average Participation</span>
                                        <span className="font-semibold">76%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Proposals Passed</span>
                                        <span className="font-semibold text-green-600">24/28</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-orange-500" />
                                    Recent Decisions
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    {votingHistory.map(item => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className={`w-3 h-3 rounded-full ${item.result === 'passed' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{item.title}</div>
                                                <div className="text-xs text-gray-500">
                                                    {Math.floor((Date.now() - item.completed) / (1000 * 60 * 60 * 24))} days ago
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Proposal Detail Modal */}
            {selectedProposal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">{selectedProposal.title}</h2>
                                <button
                                    onClick={() => setSelectedProposal(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold mb-2">Description</h3>
                                    <p className="text-gray-600 mb-4">{selectedProposal.description}</p>
                                    
                                    <h3 className="font-semibold mb-2">Implementation</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Effort:</span>
                                            <span>{selectedProposal.implementation.effort}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Timeline:</span>
                                            <span>{selectedProposal.implementation.timeline}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Risk:</span>
                                            <span>{selectedProposal.implementation.risk}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold mb-2">Voting Requirements</h3>
                                    <div className="space-y-2 text-sm mb-4">
                                        <div className="flex justify-between">
                                            <span>Min Votes:</span>
                                            <span>{selectedProposal.requirements.minVotes}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Min Stake:</span>
                                            <span>{selectedProposal.requirements.minStake}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Quorum:</span>
                                            <span>{(selectedProposal.requirements.quorum * 100)}%</span>
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-semibold mb-2">Discussion</h3>
                                    <div className="space-y-3 max-h-40 overflow-y-auto">
                                        {selectedProposal.discussion.map((comment, index) => (
                                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm">{comment.author}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(comment.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{comment.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GovernancePanel;