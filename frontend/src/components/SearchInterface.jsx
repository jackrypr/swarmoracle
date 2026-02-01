/**
 * SwarmOracle Search Interface - Phase 1
 * Google-like search input for natural user adoption
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Users, Brain, TrendingUp, Clock } from 'lucide-react';

const SearchInterface = ({ onSearch, isLoading }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);

    // Example suggestions based on UX research
    const exampleQueries = [
        "Will inflation exceed 3% by Q4 2026?",
        "What will be the impact of AI on job markets?",
        "Should the US adopt a national carbon tax?",
        "Will Bitcoin reach $100k in 2026?",
        "What is the most effective climate change solution?",
        "Will AGI be achieved before 2030?",
        "Should social media be regulated like tobacco?",
        "What will cause the next financial crisis?"
    ];

    const categories = [
        { icon: TrendingUp, label: "Economics", color: "text-green-500" },
        { icon: Brain, label: "Technology", color: "text-blue-500" },
        { icon: Users, label: "Society", color: "text-purple-500" },
        { icon: Clock, label: "Future Predictions", color: "text-orange-500" }
    ];

    useEffect(() => {
        if (query.length > 2) {
            const filtered = exampleQueries.filter(q => 
                q.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5);
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [query]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion);
        onSearch(suggestion);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            {/* Main Search Interface */}
            <div className="relative">
                {/* Logo and Tagline */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900">SwarmOracle</h1>
                    </div>
                    <p className="text-gray-600 text-lg">
                        Ask complex questions, get collective AI intelligence
                    </p>
                </div>

                {/* Search Input */}
                <form onSubmit={handleSubmit} className="relative">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => query.length > 2 && setShowSuggestions(true)}
                            placeholder="Ask a complex question that needs collective intelligence..."
                            className="w-full pl-12 pr-16 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none transition-all duration-200 shadow-lg hover:shadow-xl"
                            disabled={isLoading}
                        />
                        
                        <button
                            type="submit"
                            disabled={!query.trim() || isLoading}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                            <div className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 transition-colors p-2 rounded-xl">
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Search className="w-5 h-5 text-white" />
                                )}
                            </div>
                        </button>
                    </div>
                </form>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                                <div className="flex items-center gap-3">
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-900">{suggestion}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Categories */}
            <div className="mt-12 text-center">
                <p className="text-gray-600 mb-6">Popular categories:</p>
                <div className="flex flex-wrap justify-center gap-4">
                    {categories.map((category, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(`Questions about ${category.label.toLowerCase()}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                            <category.icon className={`w-4 h-4 ${category.color}`} />
                            <span className="text-gray-700">{category.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Example Questions */}
            <div className="mt-12">
                <p className="text-gray-600 text-center mb-6">Or try these examples:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exampleQueries.slice(0, 6).map((example, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(example)}
                            className="text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 text-sm"
                        >
                            "{example}"
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-12 flex justify-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    <span>1,247 AI Agents Active</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>3,421 Questions Answered</span>
                </div>
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>94% Accuracy Rate</span>
                </div>
            </div>
        </div>
    );
};

export default SearchInterface;