# SwarmOracle Deployment Guide

Complete deployment guide for the SwarmOracle Collective AI Intelligence Platform.

## 🏗️ Architecture Overview

- **Backend**: Node.js/Express API deployed on Railway
- **Frontend**: React/Vite SPA deployed on Vercel  
- **Database**: PostgreSQL on Railway
- **Caching**: Redis on Railway
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

### Required Accounts
- [GitHub](https://github.com) (source control & CI/CD)
- [Railway](https://railway.app) (backend & database hosting)
- [Vercel](https://vercel.com) (frontend hosting)

### Required Tools
- Node.js 18+ and npm
- Git
- Railway CLI: `npm install -g @railway/cli`
- Vercel CLI: `npm install -g vercel`

## 🔧 Environment Setup

### 1. Backend Environment Variables

Create these environment variables in Railway:

#### Required Variables
```bash
NODE_ENV=production
PORT=3000                    # Railway will override this
DATABASE_URL=postgresql://   # Railway PostgreSQL addon
REDIS_URL=redis://          # Railway Redis addon
JWT_SECRET=your-jwt-secret   # Generate with: openssl rand -base64 32
CORS_ORIGIN=https://swarm-oracle.vercel.app
```

#### Optional Variables
```bash
API_RATE_LIMIT=100          # Requests per 15 minutes
API_RATE_WINDOW_MS=900000   # 15 minutes in milliseconds
LOG_LEVEL=info              # debug, info, warn, error
SENTRY_DSN=                 # For error tracking (optional)
```

### 2. Frontend Environment Variables

Create these in Vercel:

```bash
VITE_API_URL=https://your-railway-domain.railway.app
VITE_APP_NAME=SwarmOracle
VITE_VERSION=2.0.0
```

### 3. GitHub Secrets

Add these secrets to your GitHub repository:

```bash
# Railway
RAILWAY_TOKEN=              # From Railway dashboard
RAILWAY_PROJECT_ID=         # Your Railway project ID
RAILWAY_SERVICE_NAME=       # Your Railway service name
RAILWAY_DOMAIN=             # Your Railway domain

# Railway Staging (optional)
RAILWAY_STAGING_TOKEN=
RAILWAY_STAGING_PROJECT_ID=
RAILWAY_STAGING_SERVICE_NAME=

# Vercel
VERCEL_TOKEN=               # From Vercel dashboard
VERCEL_ORG_ID=              # From .vercel/project.json
VERCEL_PROJECT_ID=          # From .vercel/project.json

# URLs
PRODUCTION_API_URL=         # Your Railway backend URL
STAGING_API_URL=           # Your staging backend URL
```

## 🚀 Deployment Steps

### 1. Initial Setup

#### Clone and Install
```bash
git clone https://github.com/yourusername/swarm-oracle.git
cd swarm-oracle
npm install
```

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your local development variables
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your local development variables
```

### 2. Railway Backend Deployment

#### Option A: CLI Deployment
```bash
# Login to Railway
railway login

# Create new project or link existing
railway init swarm-oracle-backend
cd backend

# Add PostgreSQL
railway add postgresql

# Add Redis  
railway add redis

# Deploy
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set CORS_ORIGIN=https://swarm-oracle.vercel.app

# Run migrations
railway run npx prisma migrate deploy
```

#### Option B: GitHub Integration
1. Connect Railway to your GitHub repository
2. Railway will automatically deploy from `railway.json` config
3. Set environment variables in Railway dashboard
4. Trigger deploy by pushing to main branch

### 3. Vercel Frontend Deployment

#### Option A: CLI Deployment
```bash
cd frontend
vercel login
vercel --prod
```

#### Option B: GitHub Integration
1. Import project in Vercel dashboard
2. Connect to GitHub repository
3. Set build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add environment variables
5. Deploy

### 4. Database Setup

```bash
# Generate Prisma client
cd backend
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (if you have seeds)
npx prisma db seed
```

## 🔍 Health Checks

### Backend Health Check
```bash
curl https://your-railway-domain.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "services": {
    "database": true,
    "redis": true
  }
}
```

### Frontend Health Check
```bash
curl -I https://swarm-oracle.vercel.app
```

Expected: `200 OK` status with proper headers.

## 🔧 Troubleshooting

### Common Issues

#### 1. Frontend White Page Issue
**Problem**: React app shows blank white page
**Solution**: Ensured proper `vercel.json` configuration:
- SPA routing with catch-all rewrites
- Proper MIME types for JS/CSS files
- Correct build output directory

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

#### 2. CORS Errors
**Problem**: Frontend can't connect to backend
**Solutions**:
- Check `CORS_ORIGIN` environment variable in Railway
- Verify frontend URL is correct
- Check browser network tab for exact error

```bash
# Debug CORS in Railway
railway run echo $CORS_ORIGIN
```

#### 3. Database Connection Issues
**Problem**: Backend can't connect to database
**Solutions**:
- Verify `DATABASE_URL` is set correctly
- Check Railway PostgreSQL addon status
- Run migrations if tables don't exist

```bash
# Check database connection
railway connect postgresql
# In Railway shell: \dt to list tables
```

#### 4. Build Failures

##### Backend Build Issues
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install
```

##### Frontend Build Issues
```bash
# Check for missing environment variables
npm run build

# Common fix: Clear Vite cache
cd frontend
rm -rf node_modules/.vite
npm run build
```

#### 5. Rate Limiting Issues
**Problem**: Getting 429 errors
**Solutions**:
- Adjust `API_RATE_LIMIT` in Railway
- Check if IP is being blocked
- Review rate limit configuration

### Debugging Commands

#### Check Railway Logs
```bash
cd backend
railway logs
railway logs --follow
```

#### Check Vercel Logs
```bash
cd frontend
vercel logs
vercel logs --follow
```

#### Test Local Development
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Performance Monitoring

#### Key Metrics to Monitor
- Response times (target: <200ms for API)
- Error rates (target: <1%)
- Memory usage
- Database connection pool usage

#### Logging
- All requests are logged with correlation IDs
- Errors include stack traces in development
- Security events are logged separately

## 🔐 Security Considerations

### Production Checklist
- [ ] JWT secret is strong and unique
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] Helmet security headers are active
- [ ] Database credentials are secure
- [ ] HTTPS is enforced
- [ ] Error messages don't leak sensitive info

### Regular Maintenance
- Update dependencies monthly
- Review logs for suspicious activity
- Monitor rate limiting effectiveness
- Check SSL certificate expiration

## 📊 Monitoring & Observability

### Built-in Monitoring
- Health check endpoint: `/health`
- Structured logging with Pino
- Request correlation IDs
- Performance metrics logging

### Recommended External Tools
- **Error Tracking**: Sentry
- **Performance**: Railway Analytics + Vercel Analytics  
- **Uptime**: UptimeRobot or similar
- **Logs**: Railway built-in logs

## 🚧 Development Workflow

### Branch Strategy
- `main`: Production deployments
- `develop`: Staging deployments  
- Feature branches: `feature/description`

### Development Process
1. Create feature branch from `develop`
2. Make changes and test locally
3. Push branch - CI runs tests
4. Create PR to `develop` - runs full test suite
5. Merge to `develop` - deploys to staging
6. Create PR from `develop` to `main`
7. Merge to `main` - deploys to production

### Local Development
```bash
# Start backend (from project root)
npm run dev:backend

# Start frontend (from project root)  
npm run dev:frontend

# Or start both
npm run dev
```

## 📞 Support

### Getting Help
1. Check this troubleshooting guide
2. Review application logs
3. Check GitHub Issues
4. Contact development team

### Useful Links
- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

*Last updated: January 2024*
*For the latest version of this guide, check the GitHub repository.*