#!/bin/bash

# SwarmOracle Deployment Verification Script
# Verifies both Railway backend and Vercel frontend deployment

echo "🚀 SwarmOracle Deployment Verification"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://swarmoracle-production.up.railway.app"
HEALTH_ENDPOINT="/health"
TIMEOUT=10

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "1. Checking Railway Backend Status..."
echo "   URL: $BACKEND_URL"

# Check if backend is reachable
response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$BACKEND_URL$HEALTH_ENDPOINT" 2>/dev/null)
http_code="${response: -3}"
response_body="${response%???}"

if [ "$http_code" = "200" ]; then
    print_status 0 "Backend is healthy and responding"
    echo "   Response: $response_body" | jq '.'
    
    # Extract service info
    status=$(echo "$response_body" | jq -r '.status' 2>/dev/null)
    version=$(echo "$response_body" | jq -r '.version' 2>/dev/null)
    
    echo "   Service Status: $status"
    echo "   Version: $version"
    
    # Check component health
    echo "   Component Health:"
    db_health=$(echo "$response_body" | jq -r '.components.database' 2>/dev/null)
    redis_health=$(echo "$response_body" | jq -r '.components.redis' 2>/dev/null)
    consensus_health=$(echo "$response_body" | jq -r '.components.consensus' 2>/dev/null)
    
    [ "$db_health" = "healthy" ] && print_status 0 "Database: $db_health" || print_status 1 "Database: $db_health"
    [ "$redis_health" = "healthy" ] && print_status 0 "Redis: $redis_health" || print_status 1 "Redis: $redis_health"
    [ "$consensus_health" = "healthy" ] && print_status 0 "Consensus: $consensus_health" || print_status 1 "Consensus: $consensus_health"
    
elif [ "$http_code" = "404" ]; then
    print_status 1 "Backend deployment not found (404)"
    print_warning "This usually means the deployment is still building or failed"
elif [ "$http_code" = "503" ]; then
    print_status 1 "Backend is unhealthy (503)"
    echo "   Response: $response_body"
else
    print_status 1 "Backend unreachable (HTTP $http_code)"
    [ -n "$response_body" ] && echo "   Response: $response_body"
fi

echo ""
echo "2. Checking Railway Deployment Status..."

if command -v railway &> /dev/null; then
    echo "   Getting latest deployment info..."
    railway_status=$(railway deployment list 2>/dev/null | head -2 | tail -1)
    if [ $? -eq 0 ] && [ -n "$railway_status" ]; then
        echo "   $railway_status"
        
        # Extract deployment status
        deployment_status=$(echo "$railway_status" | awk '{print $3}')
        case $deployment_status in
            "SUCCESS")
                print_status 0 "Latest deployment successful"
                ;;
            "FAILED")
                print_status 1 "Latest deployment failed"
                ;;
            "BUILDING")
                print_warning "Deployment currently building"
                ;;
            "DEPLOYING")
                print_warning "Deployment currently deploying"
                ;;
            *)
                print_warning "Unknown deployment status: $deployment_status"
                ;;
        esac
    else
        print_warning "Could not get Railway deployment status"
    fi
else
    print_warning "Railway CLI not installed - cannot check deployment status"
fi

echo ""
echo "3. Checking Frontend Build Configuration..."

# Check if vercel.json exists and is properly configured
if [ -f "vercel.json" ]; then
    print_status 0 "vercel.json exists"
    
    # Verify Vite framework setting
    framework=$(jq -r '.framework' vercel.json 2>/dev/null)
    [ "$framework" = "vite" ] && print_status 0 "Framework set to Vite" || print_status 1 "Framework not set to Vite"
    
    # Verify build command
    build_command=$(jq -r '.buildCommand' vercel.json 2>/dev/null)
    if echo "$build_command" | grep -q "cd frontend"; then
        print_status 0 "Build command includes frontend directory"
    else
        print_status 1 "Build command missing frontend directory"
    fi
    
    # Verify output directory
    output_dir=$(jq -r '.outputDirectory' vercel.json 2>/dev/null)
    [ "$output_dir" = "frontend/dist" ] && print_status 0 "Output directory set correctly" || print_status 1 "Output directory incorrect"
    
else
    print_status 1 "vercel.json not found"
fi

echo ""
echo "4. Testing Frontend Build..."

if [ -d "frontend" ]; then
    cd frontend
    if [ -f "package.json" ]; then
        print_status 0 "Frontend directory and package.json found"
        
        echo "   Running build test..."
        npm run build > /tmp/frontend-build.log 2>&1
        build_exit_code=$?
        
        if [ $build_exit_code -eq 0 ]; then
            print_status 0 "Frontend build successful"
            
            # Check if dist directory was created
            [ -d "dist" ] && print_status 0 "Build artifacts created in dist/" || print_status 1 "Build artifacts missing"
            
            # Check build output size
            if [ -f "dist/index.html" ]; then
                print_status 0 "index.html generated"
                
                # Check for main JS bundle
                js_files=$(find dist/assets -name "*.js" 2>/dev/null | wc -l)
                [ $js_files -gt 0 ] && print_status 0 "JavaScript bundles generated ($js_files files)" || print_status 1 "No JavaScript bundles found"
                
                # Check for CSS files
                css_files=$(find dist/assets -name "*.css" 2>/dev/null | wc -l)
                [ $css_files -gt 0 ] && print_status 0 "CSS bundles generated ($css_files files)" || print_status 1 "No CSS bundles found"
            fi
        else
            print_status 1 "Frontend build failed"
            echo "   Build log (last 10 lines):"
            tail -10 /tmp/frontend-build.log | sed 's/^/   /'
        fi
    else
        print_status 1 "Frontend package.json not found"
    fi
    cd ..
else
    print_status 1 "Frontend directory not found"
fi

echo ""
echo "5. Checking API Configuration..."

if [ -f "frontend/src/App.jsx" ]; then
    # Check if API URL is correctly configured
    api_url=$(grep -o 'https://swarmoracle-production.up.railway.app' frontend/src/App.jsx)
    if [ -n "$api_url" ]; then
        print_status 0 "API URL configured correctly in App.jsx"
        echo "   API URL: $api_url"
    else
        print_status 1 "API URL not found or incorrect in App.jsx"
    fi
else
    print_status 1 "Frontend App.jsx not found"
fi

echo ""
echo "6. Testing End-to-End Connection..."

if [ "$http_code" = "200" ]; then
    echo "   Testing CORS from frontend domain..."
    # Simulate a frontend request with CORS headers
    cors_response=$(curl -s -X OPTIONS \
        -H "Origin: https://swarm-oracle.vercel.app" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -w "%{http_code}" \
        --max-time $TIMEOUT \
        "$BACKEND_URL$HEALTH_ENDPOINT" 2>/dev/null)
    
    cors_code="${cors_response: -3}"
    
    if [ "$cors_code" = "200" ] || [ "$cors_code" = "204" ]; then
        print_status 0 "CORS configuration working"
    else
        print_status 1 "CORS configuration issue (HTTP $cors_code)"
    fi
else
    print_warning "Cannot test CORS - backend not responding"
fi

echo ""
echo "📋 Deployment Summary"
echo "===================="

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}🎯 Backend Status: HEALTHY${NC}"
else
    echo -e "${RED}🎯 Backend Status: UNHEALTHY${NC}"
fi

if [ $build_exit_code -eq 0 ] 2>/dev/null; then
    echo -e "${GREEN}🎯 Frontend Build: PASSING${NC}"
else
    echo -e "${RED}🎯 Frontend Build: FAILING${NC}"
fi

echo ""
echo "Next Steps:"

if [ "$http_code" != "200" ]; then
    echo "1. Check Railway deployment status: railway deployment list"
    echo "2. View deployment logs: railway logs"
    echo "3. Verify environment variables are set in Railway dashboard"
fi

if [ $build_exit_code -ne 0 ] 2>/dev/null; then
    echo "1. Fix frontend build issues"
    echo "2. Verify all dependencies are installed: npm ci"
fi

if [ "$http_code" = "200" ] && [ $build_exit_code -eq 0 ] 2>/dev/null; then
    echo "✅ Ready for Vercel deployment!"
    echo "1. Set VITE_API_URL=$BACKEND_URL in Vercel dashboard"
    echo "2. Deploy to Vercel: vercel --prod"
fi

echo ""
echo "🔗 Useful URLs:"
echo "   Backend: $BACKEND_URL"
echo "   Health Check: $BACKEND_URL$HEALTH_ENDPOINT"
echo "   Railway Dashboard: https://railway.app/dashboard"
echo "   Vercel Dashboard: https://vercel.com/dashboard"