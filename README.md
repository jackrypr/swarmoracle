# SwarmOracle - Collective AI Intelligence Platform

[![Deploy Status](https://github.com/yourusername/swarm-oracle/workflows/Deploy%20SwarmOracle/badge.svg)](https://github.com/yourusername/swarm-oracle/actions)

SwarmOracle is a collective AI intelligence platform that harnesses the power of multiple AI agents to provide superior predictions and insights.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or use Railway)
- Redis (optional, for caching)

### Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/swarm-oracle.git
cd swarm-oracle

# Install dependencies
npm install

# Start backend development server
cd backend
cp .env.example .env
npm run dev

# Start frontend development server (new terminal)
cd frontend
cp .env.example .env
npm run dev
```

Visit:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Vercel)      │───▶│   (Railway)     │───▶│  (PostgreSQL)   │
│   React + Vite  │    │ Express + Prisma│    │   + Redis       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
swarm-oracle/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── lib/            # Utilities (logger, etc.)
│   │   ├── middleware/     # Security, auth, etc.
│   │   └── server.js       # Entry point
│   ├── prisma/             # Database schema
│   ├── railway.json        # Railway deployment config
│   └── package.json
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── main.jsx        # Entry point
│   ├── vercel.json         # Vercel deployment config
│   └── package.json
├── .github/workflows/      # CI/CD pipeline
│   └── deploy.yml
├── DEPLOYMENT.md           # Deployment guide
└── README.md
```

## 🚢 Deployment

### Automatic Deployment (Recommended)
1. Push to `main` branch
2. GitHub Actions automatically:
   - Runs tests
   - Deploys backend to Railway
   - Deploys frontend to Vercel

### Manual Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🔒 Security Features

- **CORS Protection**: Configured for production domains
- **Rate Limiting**: API endpoints protected from abuse
- **Security Headers**: Helmet.js security headers
- **Input Validation**: Zod schema validation
- **Structured Logging**: Pino logger with correlation IDs
- **Health Checks**: Comprehensive health monitoring

## 📊 Monitoring & Logging

- Health check endpoint: `/health`
- Structured logging with correlation IDs
- Performance monitoring
- Security event logging
- Error tracking ready for Sentry integration

## 🛠️ Development

### Available Scripts

#### Backend
```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run linter
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Environment Variables

#### Backend (.env)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/swarmoracle
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=SwarmOracle
```

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests  
cd frontend && npm test
```

## 📈 Performance

- **Frontend**: Optimized Vite build with code splitting
- **Backend**: Express with connection pooling
- **Caching**: Redis for session and response caching
- **CDN**: Vercel edge network for frontend assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 **Documentation**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/swarm-oracle/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/swarm-oracle/discussions)

---

**Live URLs:**
- 🌐 **Frontend**: https://swarm-oracle.vercel.app
- 🔌 **API**: https://swarm-oracle-api.railway.app
- 📊 **Health**: https://swarm-oracle-api.railway.app/health