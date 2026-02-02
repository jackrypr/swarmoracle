# Learnings Log - SwarmOracle Deployment

Format: `LRN-YYYYMMDD-XXX` | Categories: correction, knowledge_gap, best_practice

---

## [LRN-20260201-005] best_practice

**Logged**: 2026-02-01T23:58:00Z
**Priority**: high
**Status**: resolved
**Area**: deployment

### Summary
Railway requires separate service deployment for backend applications, not just database services

### Details
The Railway project initially only had a Postgres service. The backend application needed to be deployed using `railway up` to create a separate "swarm-oracle-backend" service. The railway.json configuration in the root directory defines the build and deployment settings.

### Resolution
- **Command**: `railway up --detach --message "Deploy SwarmOracle backend"`
- **Result**: Created separate backend service with deployment ID f2b6a1f0-7aee-4c39-a08c-9fdb1bc4fdb1
- **Status**: Building/Deploying

### Metadata
- Source: deployment_issue
- Related Files: railway.json, backend/railway.toml
- Tags: railway, backend, service-deployment

---

## [LRN-20260201-006] best_practice

**Logged**: 2026-02-01T23:59:00Z
**Priority**: medium
**Status**: resolved
**Area**: cors

### Summary
CORS configuration must include all frontend domains for production deployment

### Details
Backend CORS was configured only for swarmoracle.ai domains. Vercel deployment requires adding vercel.app domains to the allowed origins list to prevent cross-origin issues.

### Resolution
- **Added domains**: swarm-oracle.vercel.app, swarm-oracle-frontend.vercel.app
- **File**: backend/src/app-optimized.js
- **Commit**: 6e64cbd

### Metadata
- Source: frontend_integration
- Related Files: backend/src/app-optimized.js
- Tags: cors, vercel, frontend

---

## [LRN-20260201-007] best_practice

**Logged**: 2026-02-01T23:59:30Z
**Priority**: high
**Status**: verified
**Area**: build

### Summary
Vercel frontend build configuration verified working correctly

### Details
- Build command: `cd frontend && npm ci && npm run build`
- Output directory: `frontend/dist`
- Framework: Vite
- Environment: VITE_API_URL pointing to Railway backend

### Build Results
```
dist/index.html                       1.90 kB │ gzip:  0.81 kB
dist/assets/css/index-BeK5nL5-.css    4.88 kB │ gzip:  1.79 kB
dist/assets/js/index-C_CH4QYM.js    199.92 kB │ gzip: 59.65 kB
✓ built in 494ms
```

### Metadata
- Source: build_verification
- Related Files: vercel.json, frontend/package.json
- Tags: vercel, build, vite, frontend

---