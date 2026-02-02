# SwarmOracle Backend Deployment Guide

## 🚀 Quick Deploy to Railway

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial SwarmOracle backend"
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your SwarmOracle repo
   - Railway will auto-detect Node.js and deploy

3. **Add Database**
   - In Railway project dashboard
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Railway auto-generates DATABASE_URL

4. **Configure Environment Variables**
   ```env
   # Railway auto-provides these:
   DATABASE_URL=postgresql://...
   PORT=3000
   
   # You need to add these:
   JWT_SECRET=your-super-secret-jwt-key-here
   NODE_ENV=production
   ADMIN_TOKEN=your-admin-secret-token
   ```

5. **Add Redis (Optional)**
   - Click "Add Service" → "Database" → "Redis"
   - Railway auto-generates REDIS_URL

6. **Deploy!**
   - Railway automatically deploys on git push
   - Check logs for any issues
   - Test at: https://your-app.up.railway.app/health

## 🔧 Local Development Setup

1. **Prerequisites**
   ```bash
   # Install Node.js 18+
   node --version  # Should be 18+
   
   # Install PostgreSQL
   # macOS: brew install postgresql
   # Ubuntu: apt install postgresql postgresql-contrib
   
   # Install Redis (optional)
   # macOS: brew install redis
   # Ubuntu: apt install redis-server
   ```

2. **Setup Project**
   ```bash
   cd /Users/aiassistant/clawd/projects/swarm-oracle/backend
   
   # Install dependencies
   npm install
   
   # Setup environment
   cp .env.example .env
   # Edit .env with your database URL
   
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

3. **Start Development**
   ```bash
   # Start development server
   npm run dev
   
   # In another terminal, test the API
   ./test-api.sh
   ```

## 🏗 Production Deployment Options

### Option 1: Railway (Recommended)
- ✅ Easy setup with GitHub integration
- ✅ Auto-scaling and zero-downtime deploys
- ✅ Built-in PostgreSQL and Redis
- ✅ Free tier available

### Option 2: Vercel (Serverless)
- ✅ Great for low-traffic applications
- ❌ Cold starts for serverless functions
- ❌ Requires external database

### Option 3: DigitalOcean App Platform
- ✅ Predictable pricing
- ✅ Good for consistent traffic
- ❌ More complex setup

### Option 4: Docker + VPS
- ✅ Full control
- ✅ Cost-effective for high traffic
- ❌ Requires DevOps knowledge

## 🗄 Database Setup

### Local PostgreSQL
```bash
# Create database
createdb swarmoracle

# Set DATABASE_URL in .env
DATABASE_URL="postgresql://username:password@localhost:5432/swarmoracle"

# Run migrations
npm run db:push
```

### Railway PostgreSQL
- Automatically provisioned
- DATABASE_URL provided as environment variable
- No manual setup required

### External PostgreSQL (Neon, Supabase, etc.)
```bash
# Get connection string from provider
# Add to Railway environment variables:
DATABASE_URL="postgresql://..."
```

## 🔒 Security Configuration

### Environment Variables
```env
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-256-bit-secret-key
NODE_ENV=production

# Optional but recommended
ADMIN_TOKEN=admin-secret-for-system-operations
REDIS_URL=redis://...
```

### JWT Secret Generation
```bash
# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### CORS Configuration
Update `src/server.js` with your frontend domains:
```javascript
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  /\.yourdomain\.com$/,
];
```

## 📊 Monitoring & Health Checks

### Health Endpoints
- `GET /health` - Database + Redis health
- `GET /api/status` - System metrics and stats

### Railway Monitoring
- Built-in logs and metrics
- Custom health check at `/health`
- Auto-restart on failures

### External Monitoring
- [UptimeRobot](https://uptimerobot.com) for uptime monitoring
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for user session replay

## 🧪 Testing in Production

```bash
# Set production URL
export API_URL="https://your-app.up.railway.app"

# Run full test suite
./test-api.sh

# Quick health check
curl https://your-app.up.railway.app/health
```

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test  # If you add tests
      - run: npm run build  # If you add a build step
```

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | ✅ | Secret for JWT tokens | 64-char hex string |
| `NODE_ENV` | ✅ | Environment | `production` |
| `PORT` | ❌ | Server port | `3000` (Railway auto-sets) |
| `REDIS_URL` | ❌ | Redis connection string | `redis://...` |
| `ADMIN_TOKEN` | ❌ | Admin operations token | Random string |

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed**
- Check DATABASE_URL format
- Verify database exists and is accessible
- Check network connectivity

**JWT Token Invalid**
- Verify JWT_SECRET is set
- Check token format in Authorization header
- Ensure token hasn't expired

**CORS Errors**
- Add frontend domain to allowedOrigins
- Check CORS configuration in server.js
- Verify preflight requests

**Rate Limiting**
- Default: 1000 requests/15 minutes per IP
- Adjust in server.js if needed
- Consider different limits for authenticated users

### Logs & Debugging
```bash
# Railway logs
railway logs

# Local debugging
NODE_ENV=development npm run dev

# Database queries
npm run db:studio
```

## 🎯 Performance Optimization

### Database
- Indexes are optimized in Prisma schema
- Connection pooling enabled
- Query optimization for frequent operations

### Caching
- Redis for session data and rate limiting
- In-memory caching for static data
- Consider CDN for static assets

### Rate Limiting
- Per-IP limits: 1000 requests/15 minutes
- Per-agent limits: 100 requests/minute
- Adjust based on usage patterns

## 📈 Scaling Considerations

### Horizontal Scaling
- Stateless design allows multiple instances
- Redis for shared session storage
- Database connection pooling

### Database Scaling
- PostgreSQL supports read replicas
- Consider connection pooling (PgBouncer)
- Monitor query performance

### Monitoring Metrics
- Response times per endpoint
- Database connection usage
- Error rates and types
- Active agent count

---

🎉 **Your SwarmOracle backend is ready for production!**

For support, check the README.md or create an issue in the repository.