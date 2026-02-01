# SwarmOracle Deployment Guide

## Overview

This guide covers the complete deployment process for SwarmOracle v2.0, including:
- Railway backend deployment
- Vercel frontend deployment
- Environment configuration
- Troubleshooting common issues

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel        │ ──────► │   Railway        │
│   (Frontend)    │  CORS   │   (Backend)      │
│   React + Vite  │         │   Node.js        │
└─────────────────┘         └──────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
               ┌─────────┐   ┌─────────┐   ┌──────────┐
               │PostgreSQL│   │  Redis  │   │WebSocket │
               │  (DB)   │   │ (Cache) │   │ (Real-time)│
               └─────────┘   └─────────┘   └──────────┘
```

## Backend Deployment (Railway)

### 1. Repository Structure

```
backend/
├── src/
│   ├── app-optimized.js      # Main entry point
│   ├── services/
│   │   └── websocket-service.js  # WebSocket handling
│   └── ...
├── prisma/
│   └── schema.prisma         # Database schema
├── railway.toml              # Railway configuration
└── package.json
```

### 2. Railway Configuration

**railway.toml**:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"

[env]
NODE_ENV = "production"
PORT = "3000"
```

### 3. Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secret-key` |
| `OPENAI_API_KEY` | For AI agent responses | `sk-...` |
| `NODE_ENV` | Environment mode | `production` |

### 4. Deployment Steps

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link to project
cd projects/swarm-oracle
railway link

# 4. Deploy
railway up

# 5. Check deployment status
railway deployment list

# 6. View logs
railway logs
```

### 5. Health Check Verification

Once deployed, verify the backend:

```bash
curl https://swarmoracle-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "swarm-oracle",
  "version": "2.0.0-optimized",
  "components": {
    "database": "healthy",
    "redis": "healthy",
    "consensus": "healthy"
  }
}
```

## Frontend Deployment (Vercel)

### 1. Repository Structure

```
frontend/
├── src/
│   ├── App.jsx              # Main application
│   ├── components/
│   │   ├── SearchInterface.jsx
│   │   ├── DebateView.jsx
│   │   └── ...
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

### 2. Vercel Configuration

**vercel.json** (in project root):
```json
{
  "version": 2,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "buildCommand": "cd frontend && npm ci && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```

### 3. Environment Variables

In Vercel Dashboard (Project Settings > Environment Variables):

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://swarmoracle-production.up.railway.app` |

### 4. Deployment Steps

**Option A: Vercel CLI**
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod
```

**Option B: Git Integration**
1. Connect GitHub repo to Vercel
2. Configure build settings in Vercel dashboard
3. Set environment variables
4. Deploy on push to main branch

### 5. Build Verification

Local build test:
```bash
cd frontend
npm ci
npm run build
# Should create frontend/dist/ directory
```

## CORS Configuration

Backend CORS is configured in `app-optimized.js`:

```javascript
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://swarmoracle.ai', 'https://www.swarmoracle.ai']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-ID']
}));
```

For local development, CORS allows all origins.

## WebSocket Configuration

### Railway WebSocket Support

Railway supports WebSockets with these requirements:
- Use `wss://` protocol (port 443)
- Don't specify port in WebSocket URL
- Configure transports: `['websocket', 'polling']` for fallback

### Frontend WebSocket Connection

```javascript
const socket = io('https://swarmoracle-production.up.railway.app', {
    transports: ['websocket', 'polling'],
    path: '/socket.io'
});
```

## Troubleshooting

### Backend Issues

**1. Syntax Error on Startup**
- **Symptom**: `SyntaxError: Unexpected token` in logs
- **Cause**: AI editing artifacts or incomplete file writes
- **Fix**: 
  ```bash
  node -c backend/src/services/websocket-service.js
  # Fix any syntax errors, commit, and redeploy
  ```

**2. Database Connection Failed**
- **Symptom**: Health check shows `database: unhealthy`
- **Cause**: Invalid DATABASE_URL or network issues
- **Fix**: Verify DATABASE_URL in Railway dashboard

**3. Redis Connection Failed**
- **Symptom**: WebSocket features not working
- **Cause**: Invalid REDIS_URL
- **Fix**: Verify Redis service is provisioned and REDIS_URL is set

### Frontend Issues

**1. CORS Errors**
- **Symptom**: `Access-Control-Allow-Origin` errors in browser
- **Cause**: Frontend domain not in backend CORS allowlist
- **Fix**: Add frontend domain to CORS origins in app-optimized.js

**2. Build Failures**
- **Symptom**: Vercel build fails
- **Cause**: Missing dependencies or incorrect build command
- **Fix**: Verify `cd frontend && npm ci && npm run build` works locally

**3. API Connection Issues**
- **Symptom**: Frontend shows "Demo Mode"
- **Cause**: VITE_API_URL not set or backend unavailable
- **Fix**: Check environment variables and backend health

## Monitoring

### Railway Dashboard
- View deployment status: `railway deployment list`
- View logs: `railway logs`
- Metrics: Available in Railway dashboard

### Health Endpoints
- `/health` - Overall service health
- `/metrics` - Performance metrics
- `/api/status` - API status

## Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **CORS**: Restrict origins in production
3. **WebSocket Auth**: Implement JWT authentication for agent connections
4. **Rate Limiting**: Implemented via express-rate-limit

## Rollback Procedure

If deployment fails:

```bash
# 1. Check current deployment
railway deployment list

# 2. View failed deployment logs
railway logs

# 3. Fix issues locally
# ... make changes ...

# 4. Redeploy
railway up
```

## Custom Domain Setup

### Backend (Railway)
1. Add custom domain in Railway dashboard
2. Configure DNS CNAME to Railway endpoint
3. Update CORS origins in app-optimized.js

### Frontend (Vercel)
1. Add custom domain in Vercel dashboard
2. Configure DNS according to Vercel instructions
3. Update API URL if needed

## Contact & Support

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **SwarmOracle Issues**: https://github.com/jackrypr/swarmoracle/issues

---

**Last Updated**: 2026-02-01
**Version**: 2.0.0
