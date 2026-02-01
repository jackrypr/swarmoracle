# Cloudflare Custom Domain Setup - swarmoracle.ai

## 🎯 Goal
Point swarmoracle.ai to Railway frontend deployment

## 📋 Prerequisites
- Domain registered on Cloudflare: swarmoracle.ai ✅
- Railway frontend deployed ✅

## 🔧 Step-by-Step Setup

### 1. Railway Custom Domain Configuration

**Frontend Service:**
1. Go to Railway Dashboard → Your Frontend Service
2. Click **Settings** → **Domains**
3. Click **Generate Domain** or **Custom Domain**
4. Enter: `swarmoracle.ai`
5. Copy the CNAME target (e.g., `abc123.up.railway.app`)

### 2. Cloudflare DNS Configuration

**In Cloudflare Dashboard:**
1. Select domain: swarmoracle.ai
2. Go to **DNS** → **Records**
3. Add new record:
   ```
   Type: CNAME
   Name: @ (or www for www.swarmoracle.ai)
   Target: [Railway CNAME from step 1]
   TTL: Auto
   Proxy status: DNS only (gray cloud) ← IMPORTANT for Railway
   ```

4. Add www redirect (optional):
   ```
   Type: CNAME
   Name: www
   Target: swarmoracle.ai
   TTL: Auto
   Proxy status: DNS only
   ```

### 3. Railway Domain Verification

1. Return to Railway Dashboard
2. Wait for verification (usually instant)
3. Click **Verify**
4. Enable HTTPS (Railway provides SSL automatically)

### 4. Cloudflare SSL/TLS Settings

**SSL/TLS tab:**
- **Overview:** Full (strict) recommended
- **Edge Certificates:** Let Cloudflare handle
- **Always Use HTTPS:** ON

### 5. Verify Deployment

```bash
# Test custom domain
curl -I https://swarmoracle.ai

# Should return 200 OK with Railway headers
```

## 🔗 Architecture

```
User → swarmoracle.ai (Cloudflare)
       ↓
   CNAME → Railway Frontend
       ↓
   Static React App
       ↓
   API Calls → swarmoracle-production.up.railway.app
       ↓
   Backend API + Database
```

## 🛠️ Troubleshooting

### Domain not resolving
- Check DNS propagation: `dig swarmoracle.ai`
- Wait 5-10 minutes for DNS propagation
- Verify CNAME record is correct

### SSL/HTTPS issues
- Ensure Cloudflare proxy is disabled (gray cloud)
- Let Railway handle SSL certificates
- Check Railway domain shows "Healthy"

### API connection failed
- Verify backend is running: `curl https://swarmoracle-production.up.railway.app/health`
- Check CORS is enabled in backend
- Verify API URL in frontend is correct

## 📊 Current Status

| Component | URL | Status |
|-----------|-----|--------|
| Backend | https://swarmoracle-production.up.railway.app | ✅ Deployed |
| Frontend | Railway deployment pending | ⏳ Awaiting deploy |
| Custom Domain | https://swarmoracle.ai | ⏳ Awaiting DNS setup |

## 🚀 Quick Commands

```bash
# Check backend health
curl https://swarmoracle-production.up.railway.app/health

# Check DNS propagation
dig swarmoracle.ai

# Test frontend (after deploy)
curl -I https://swarmoracle.ai
```

## ✅ Next Steps

1. [ ] Deploy frontend to Railway
2. [ ] Add custom domain in Railway
3. [ ] Configure Cloudflare DNS
4. [ ] Verify SSL certificates
5. [ ] Test full stack: swarmoracle.ai → Backend API
