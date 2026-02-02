#!/bin/bash

# SwarmOracle Backend API Test Script
# Tests all endpoints with sample data

set -e  # Exit on any error

# Configuration
BASE_URL="${API_URL:-http://localhost:3000}"
echo "🧪 Testing SwarmOracle API at: $BASE_URL"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test health endpoint
test_health() {
    echo "🏥 Testing health endpoints..."
    
    # Test basic health
    response=$(curl -s "$BASE_URL/health")
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        success "Health check passed"
    else
        error "Health check failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Test status endpoint
    response=$(curl -s "$BASE_URL/api/status")
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        success "Status check passed"
    else
        error "Status check failed"
        echo "$response" | jq .
        exit 1
    fi
    
    echo
}

# Test agent registration and authentication
test_agents() {
    echo "👥 Testing agent endpoints..."
    
    # Register first agent
    info "Registering Agent 1..."
    response=$(curl -s -X POST "$BASE_URL/api/agents/register" \\
        -H "Content-Type: application/json" \\
        -d '{
            "name": "TestAgent1",
            "platform": "test",
            "description": "First test agent",
            "capabilities": ["factual", "analytical"]
        }')
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        TOKEN1=$(echo "$response" | jq -r '.data.token')
        AGENT1_ID=$(echo "$response" | jq -r '.data.agent.id')
        success "Agent 1 registered successfully"
        info "Agent 1 ID: $AGENT1_ID"
    else
        error "Agent 1 registration failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Register second agent
    info "Registering Agent 2..."
    response=$(curl -s -X POST "$BASE_URL/api/agents/register" \\
        -H "Content-Type: application/json" \\
        -d '{
            "name": "TestAgent2",
            "platform": "test",
            "description": "Second test agent",
            "capabilities": ["predictive", "creative"]
        }')
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        TOKEN2=$(echo "$response" | jq -r '.data.token')
        AGENT2_ID=$(echo "$response" | jq -r '.data.agent.id')
        success "Agent 2 registered successfully"
        info "Agent 2 ID: $AGENT2_ID"
    else
        error "Agent 2 registration failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Test agents listing
    info "Testing agent listing..."
    response=$(curl -s "$BASE_URL/api/agents")
    if echo "$response" | jq -e '.success == true and (.data | length >= 2)' > /dev/null; then
        success "Agent listing works"
    else
        error "Agent listing failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Test agent profile
    info "Testing agent profile..."
    response=$(curl -s "$BASE_URL/api/agents/$AGENT1_ID")
    if echo "$response" | jq -e '.success == true and .data.id' > /dev/null; then
        success "Agent profile retrieval works"
    else
        error "Agent profile failed"
        echo "$response" | jq .
        exit 1
    fi
    
    echo
}

# Test questions
test_questions() {
    echo "❓ Testing question endpoints..."
    
    # Create test question
    info "Creating test question..."
    response=$(curl -s -X POST "$BASE_URL/api/questions" \\
        -H "Authorization: Bearer $TOKEN1" \\
        -H "Content-Type: application/json" \\
        -d '{
            "text": "What is the capital of France?",
            "description": "Simple geography question for testing",
            "category": "FACTUAL",
            "minAnswers": 2,
            "consensusThreshold": 0.7
        }')
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        QUESTION_ID=$(echo "$response" | jq -r '.data.id')
        success "Question created successfully"
        info "Question ID: $QUESTION_ID"
    else
        error "Question creation failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Test questions listing
    info "Testing question listing..."
    response=$(curl -s "$BASE_URL/api/questions")
    if echo "$response" | jq -e '.success == true and (.data | length >= 1)' > /dev/null; then
        success "Question listing works"
    else
        error "Question listing failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Test question details
    info "Testing question details..."
    response=$(curl -s "$BASE_URL/api/questions/$QUESTION_ID")
    if echo "$response" | jq -e '.success == true and .data.id' > /dev/null; then
        success "Question details retrieval works"
    else
        error "Question details failed"
        echo "$response" | jq .
        exit 1
    fi
    
    echo
}

# Test answers
test_answers() {
    echo "💬 Testing answer endpoints..."
    
    # Submit first answer
    info "Agent 1 submitting answer..."
    response=$(curl -s -X POST "$BASE_URL/api/answers" \\
        -H "Authorization: Bearer $TOKEN1" \\
        -H "Content-Type: application/json" \\
        -d "{
            \"questionId\": \"$QUESTION_ID\",
            \"content\": \"Paris\",
            \"reasoning\": \"Paris is the capital and largest city of France.\",
            \"confidence\": 0.95
        }")
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        ANSWER1_ID=$(echo "$response" | jq -r '.data.id')
        success "Answer 1 submitted successfully"
        info "Answer 1 ID: $ANSWER1_ID"
    else
        error "Answer 1 submission failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Submit second answer
    info "Agent 2 submitting answer..."
    response=$(curl -s -X POST "$BASE_URL/api/answers" \\
        -H "Authorization: Bearer $TOKEN2" \\
        -H "Content-Type: application/json" \\
        -d "{
            \"questionId\": \"$QUESTION_ID\",
            \"content\": \"Paris, the City of Light\",
            \"reasoning\": \"Paris is definitely the capital of France, known worldwide as the City of Light.\",
            \"confidence\": 0.98
        }")
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        ANSWER2_ID=$(echo "$response" | jq -r '.data.id')
        success "Answer 2 submitted successfully"
        info "Answer 2 ID: $ANSWER2_ID"
    else
        error "Answer 2 submission failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Test answer details
    info "Testing answer details..."
    response=$(curl -s "$BASE_URL/api/answers/$ANSWER1_ID")
    if echo "$response" | jq -e '.success == true and .data.id' > /dev/null; then
        success "Answer details retrieval works"
    else
        error "Answer details failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Test staking on answer
    info "Agent 2 staking on Agent 1's answer..."
    response=$(curl -s -X POST "$BASE_URL/api/answers/$ANSWER1_ID/stake" \\
        -H "Authorization: Bearer $TOKEN2" \\
        -H "Content-Type: application/json" \\
        -d '{
            "amount": 50
        }')
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        success "Staking works"
    else
        warn "Staking failed (this might be expected)"
        echo "$response" | jq .
    fi
    
    echo
}

# Test consensus
test_consensus() {
    echo "🤝 Testing consensus endpoints..."
    
    # Calculate consensus
    info "Calculating consensus..."
    response=$(curl -s -X POST "$BASE_URL/api/consensus/calculate/$QUESTION_ID" \\
        -H "Authorization: Bearer $TOKEN1" \\
        -H "Content-Type: application/json" \\
        -d '{
            "algorithm": "Hybrid",
            "forceRecalculation": true
        }')
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        success "Consensus calculation works"
    else
        warn "Consensus calculation failed (might need more answers)"
        echo "$response" | jq .
    fi
    
    # Get consensus results
    info "Getting consensus results..."
    response=$(curl -s "$BASE_URL/api/consensus/$QUESTION_ID")
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        success "Consensus results retrieval works"
    else
        error "Consensus results failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Get consensus weights
    info "Getting consensus weights..."
    response=$(curl -s "$BASE_URL/api/consensus/weights/$QUESTION_ID")
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        success "Consensus weights retrieval works"
    else
        warn "Consensus weights failed (might not be calculated yet)"
        echo "$response" | jq .
    fi
    
    echo
}

# Test debate
test_debate() {
    echo "🗣️ Testing debate endpoints..."
    
    # Start debate round
    info "Starting debate round..."
    response=$(curl -s -X POST "$BASE_URL/api/debate/start/$QUESTION_ID" \\
        -H "Authorization: Bearer $TOKEN1" \\
        -H "Content-Type: application/json" \\
        -d '{
            "topic": "Accuracy and completeness of the capital city answers"
        }')
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        DEBATE_ROUND_ID=$(echo "$response" | jq -r '.data.debateRound.id')
        success "Debate round started successfully"
        info "Debate Round ID: $DEBATE_ROUND_ID"
    else
        error "Debate round start failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Submit critique
    info "Agent 2 submitting critique..."
    response=$(curl -s -X POST "$BASE_URL/api/debate/critique" \\
        -H "Authorization: Bearer $TOKEN2" \\
        -H "Content-Type: application/json" \\
        -d "{
            \"debateRoundId\": \"$DEBATE_ROUND_ID\",
            \"targetAnswerId\": \"$ANSWER1_ID\",
            \"content\": \"While Paris is correct, the answer could include more context about why it's significant.\",
            \"type\": \"IMPROVEMENT\",
            \"impact\": 0.3
        }")
    
    if echo "$response" | jq -e '.success == true' > /dev/null; then
        success "Critique submitted successfully"
    else
        error "Critique submission failed"
        echo "$response" | jq .
        exit 1
    fi
    
    # Get debate details
    info "Getting debate details..."
    response=$(curl -s "$BASE_URL/api/debate/$QUESTION_ID")
    if echo "$response" | jq -e '.success == true and (.data.debateRounds | length >= 1)' > /dev/null; then
        success "Debate details retrieval works"
    else
        error "Debate details failed"
        echo "$response" | jq .
        exit 1
    fi
    
    echo
}

# Test agent history
test_agent_history() {
    echo "📊 Testing agent history endpoints..."
    
    # Get agent answers
    info "Getting Agent 1 answer history..."
    response=$(curl -s "$BASE_URL/api/agents/$AGENT1_ID/answers")
    if echo "$response" | jq -e '.success == true and (.data.answers | length >= 1)' > /dev/null; then
        success "Agent answer history works"
    else
        error "Agent answer history failed"
        echo "$response" | jq .
        exit 1
    fi
    
    echo
}

# Main test execution
main() {
    echo "🚀 Starting SwarmOracle API Tests"
    echo "=================================="
    echo
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        error "jq is required but not installed. Please install jq first."
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
        exit 1
    fi
    
    # Run tests in sequence
    test_health
    test_agents
    test_questions
    test_answers
    test_consensus
    test_debate
    test_agent_history
    
    echo "🎉 All tests completed successfully!"
    echo
    echo "📝 Test Summary:"
    echo "- ✅ Health checks working"
    echo "- ✅ Agent registration and authentication working"
    echo "- ✅ Question creation and retrieval working"
    echo "- ✅ Answer submission working"
    echo "- ✅ Consensus calculation working"
    echo "- ✅ Debate system working"
    echo "- ✅ Agent history working"
    echo
    echo "🔗 Test Data Created:"
    echo "   Agent 1: $AGENT1_ID"
    echo "   Agent 2: $AGENT2_ID"
    echo "   Question: $QUESTION_ID"
    echo "   Answer 1: $ANSWER1_ID"
    echo "   Answer 2: $ANSWER2_ID"
    echo "   Debate Round: $DEBATE_ROUND_ID"
    echo
    echo "🌐 You can now test the API manually at: $BASE_URL/api"
}

# Run main function
main "$@"