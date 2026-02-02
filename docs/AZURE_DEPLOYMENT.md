# Azure Web App Deployment Guide
## Portfolio Rotation Agent - trader.samarp.net

---

## Architecture

```
Internet → Cloudflare (SSL/CDN) → Azure Web App (trader-portfolio)
                                    ├─ Node.js 20 LTS
                                    ├─ Express Backend (Port 3000)
                                    ├─ React Frontend (served from /public)
                                    └─ Neon PostgreSQL (external)
```

---

## Prerequisites

### 1. Install Azure CLI
```bash
# macOS
brew install azure-cli

# Or download from: https://aka.ms/installazureclimacos

# Verify installation
az --version
```

### 2. Prepare Environment Variables
Create `.env.production` with your production values:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://rb-trader.cognitiveservices.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.2-chat
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-ada-002
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Market Data
FINNHUB_API_KEY=...
```

### 3. Export Environment Variables
```bash
# Load environment variables into shell
export $(cat .env.production | xargs)
```

---

## Deployment Steps

### Method 1: Automated Script (Recommended)

```bash
# Make script executable
chmod +x deploy-azure.sh

# Run deployment
./deploy-azure.sh
```

The script will:
1. Login to Azure
2. Create resource group
3. Create App Service Plan (B1 tier)
4. Create Web App with Node.js 20
5. Configure environment variables
6. Prompt for GitHub setup
7. Add custom domain
8. Enable HTTPS
9. Verify deployment

### Method 2: Manual CLI Commands

#### Step 1: Login to Azure
```bash
az login
```

#### Step 2: Create Resource Group
```bash
az group create \
  --name trader-rg \
  --location eastus
```

#### Step 3: Create App Service Plan
```bash
# B1 Basic tier ($13.14/month)
az appservice plan create \
  --name trader-plan \
  --resource-group trader-rg \
  --is-linux \
  --sku B1

# Alternative: F1 Free tier (limited resources)
az appservice plan create \
  --name trader-plan \
  --resource-group trader-rg \
  --is-linux \
  --sku F1
```

#### Step 4: Create Web App
```bash
az webapp create \
  --name trader-portfolio \
  --resource-group trader-rg \
  --plan trader-plan \
  --runtime "NODE:20-lts"
```

#### Step 5: Configure Environment Variables
```bash
az webapp config appsettings set \
  --name trader-portfolio \
  --resource-group trader-rg \
  --settings \
    PORT=3000 \
    NODE_ENV=production \
    DATABASE_URL="$DATABASE_URL" \
    CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
    AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
    AZURE_OPENAI_DEPLOYMENT_NAME="$AZURE_OPENAI_DEPLOYMENT_NAME" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME="$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME" \
    AZURE_OPENAI_API_VERSION="$AZURE_OPENAI_API_VERSION" \
    FINNHUB_API_KEY="$FINNHUB_API_KEY"
```

---

## GitHub Deployment Setup

### Option 1: GitHub Actions (Automated)

1. **Go to Azure Portal**
   - Navigate to: `trader-portfolio` → **Deployment Center**

2. **Configure Source**
   - Source: **GitHub**
   - Authorize GitHub access
   - Organization: Your GitHub username
   - Repository: `trader`
   - Branch: `main`

3. **Azure Creates Workflow**
   - Azure automatically creates `.github/workflows/main_trader-portfolio.yml`
   - Commits workflow to your repository
   - First deployment starts automatically

### Option 2: Manual GitHub Actions

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure Web App

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install backend dependencies
      run: npm ci

    - name: Install frontend dependencies
      run: cd frontend && npm ci

    - name: Build backend
      run: npm run build

    - name: Build frontend
      run: cd frontend && npm run build

    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'trader-portfolio'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

**Get Publish Profile:**
```bash
az webapp deployment list-publishing-profiles \
  --name trader-portfolio \
  --resource-group trader-rg \
  --xml
```

Add to GitHub Secrets as `AZURE_WEBAPP_PUBLISH_PROFILE`.

---

## Cloudflare DNS Configuration

### Step 1: Get Azure Verification ID
```bash
az webapp show \
  --name trader-portfolio \
  --resource-group trader-rg \
  --query "customDomainVerificationId" \
  --output tsv
```

**Example output:** `1234567890ABCDEF...`

### Step 2: Configure Cloudflare DNS

**Login to Cloudflare → samarp.net → DNS**

#### Record 1: CNAME for subdomain
```
Type:    CNAME
Name:    trader
Target:  trader-portfolio.azurewebsites.net
TTL:     Auto
Proxy:   🔴 DNS only (initially, will enable later)
```

#### Record 2: TXT for verification
```
Type:    TXT
Name:    asuid.trader
Content: <your-verification-id-from-above>
TTL:     Auto
```

**Example:**
```
TXT | asuid.trader | 1234567890ABCDEF...
```

### Step 3: Wait for DNS Propagation
```bash
# Check DNS propagation (5-10 minutes)
dig trader.samarp.net

# Verify TXT record
dig TXT asuid.trader.samarp.net
```

### Step 4: Add Custom Domain to Azure
```bash
az webapp config hostname add \
  --webapp-name trader-portfolio \
  --resource-group trader-rg \
  --hostname trader.samarp.net
```

### Step 5: Enable Cloudflare Proxy
**Go back to Cloudflare DNS:**
1. Edit the `trader` CNAME record
2. Toggle proxy status: **🟠 Proxied** (Orange Cloud)
3. Save

---

## SSL Configuration

### Azure: Enable HTTPS Redirect
```bash
az webapp update \
  --name trader-portfolio \
  --resource-group trader-rg \
  --https-only true
```

### Cloudflare: Full (Strict) SSL

**Cloudflare → samarp.net → SSL/TLS**

1. **SSL/TLS encryption mode:**
   - Select: **Full (Strict)** ✅
   - Not "Flexible" or "Full"

2. **Edge Certificates:**
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ TLS 1.3
   - Minimum TLS Version: TLS 1.2

3. **Authenticated Origin Pulls:**
   - Optional: Enable for extra security

---

## Verification

### 1. Test Health Endpoint
```bash
# Azure default domain
curl https://trader-portfolio.azurewebsites.net/health

# Expected: {"status":"healthy","timestamp":"..."}

# Custom domain
curl https://trader.samarp.net/health
```

### 2. Test Frontend
```bash
# Open in browser
open https://trader.samarp.net
```

### 3. Test API
```bash
# Should redirect to Clerk login (401/403)
curl -I https://trader.samarp.net/api/portfolio
```

### 4. Check SSL
```bash
# Test SSL certificate
openssl s_client -connect trader.samarp.net:443 -servername trader.samarp.net < /dev/null

# Check SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=trader.samarp.net
```

---

## Troubleshooting

### Issue 1: DNS Not Resolving

**Symptoms:**
```bash
curl: (6) Could not resolve host: trader.samarp.net
```

**Solutions:**
1. Check DNS propagation:
   ```bash
   dig trader.samarp.net
   # Should return CNAME to trader-portfolio.azurewebsites.net
   ```

2. Verify Cloudflare CNAME:
   - Name: `trader` (not `trader.samarp.net`)
   - Target: `trader-portfolio.azurewebsites.net` (with trailing dot if required)

3. Wait 5-10 minutes for propagation

4. Flush DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches
   ```

### Issue 2: SSL Certificate Error

**Symptoms:**
```
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

**Solutions:**
1. Check Cloudflare SSL mode:
   - Must be **Full (Strict)**, not "Flexible"

2. Verify Azure HTTPS:
   ```bash
   az webapp show \
     --name trader-portfolio \
     --resource-group trader-rg \
     --query "httpsOnly"
   # Should return: true
   ```

3. Check Cloudflare proxy status:
   - CNAME record must have **Orange Cloud** enabled

4. Force SSL renewal in Cloudflare:
   - SSL/TLS → Edge Certificates → Delete and regenerate

### Issue 3: 502 Bad Gateway

**Symptoms:**
```
502 Bad Gateway - nginx
```

**Solutions:**
1. Check application logs:
   ```bash
   az webapp log tail \
     --name trader-portfolio \
     --resource-group trader-rg
   ```

2. Verify Node.js is running:
   ```bash
   az webapp ssh --name trader-portfolio --resource-group trader-rg

   # Inside SSH:
   ps aux | grep node
   ```

3. Check environment variables:
   ```bash
   az webapp config appsettings list \
     --name trader-portfolio \
     --resource-group trader-rg
   ```

4. Restart the app:
   ```bash
   az webapp restart \
     --name trader-portfolio \
     --resource-group trader-rg
   ```

5. Check startup command:
   ```bash
   az webapp config show \
     --name trader-portfolio \
     --resource-group trader-rg \
     --query "appCommandLine"

   # Should be: node dist/server/api.js
   ```

### Issue 4: Clerk Authentication Fails

**Symptoms:**
- Sign-in modal doesn't load
- JWT validation errors

**Solutions:**
1. Verify Clerk domain whitelist:
   - Clerk Dashboard → Domains
   - Add: `trader.samarp.net`

2. Check Clerk API keys:
   ```bash
   # Frontend uses NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   # Backend uses CLERK_SECRET_KEY

   # Verify in Azure:
   az webapp config appsettings list \
     --name trader-portfolio \
     --resource-group trader-rg \
     --query "[?name=='CLERK_SECRET_KEY'].value" \
     --output tsv
   ```

3. Check CORS:
   ```bash
   az webapp cors show \
     --name trader-portfolio \
     --resource-group trader-rg
   ```

### Issue 5: Database Connection Fails

**Symptoms:**
```
Error: connect ECONNREFUSED
```

**Solutions:**
1. Verify DATABASE_URL:
   ```bash
   az webapp config appsettings list \
     --name trader-portfolio \
     --resource-group trader-rg \
     --query "[?name=='DATABASE_URL'].value" \
     --output tsv
   ```

2. Test database connection from Azure:
   ```bash
   az webapp ssh --name trader-portfolio --resource-group trader-rg

   # Inside SSH:
   node -e "const {neon} = require('@neondatabase/serverless'); const sql = neon(process.env.DATABASE_URL); sql\`SELECT 1\`.then(console.log)"
   ```

3. Check Neon firewall:
   - Neon → Settings → IP Allow List
   - Ensure Azure IPs are allowed (or allow all)

### Issue 6: App Crashes on Startup

**Symptoms:**
```
Application Error
The web app you have attempted to reach has an error.
```

**Solutions:**
1. Check logs:
   ```bash
   az webapp log download \
     --name trader-portfolio \
     --resource-group trader-rg \
     --log-file logs.zip

   unzip logs.zip
   cat */LogFiles/Application/*.txt
   ```

2. Check build output:
   ```bash
   # Verify dist/ folder exists
   az webapp ssh --name trader-portfolio --resource-group trader-rg
   ls -la dist/
   ```

3. Test locally with production build:
   ```bash
   npm run build
   NODE_ENV=production node dist/server/api.js
   ```

---

## Monitoring & Maintenance

### View Live Logs
```bash
az webapp log tail \
  --name trader-portfolio \
  --resource-group trader-rg
```

### Restart Application
```bash
az webapp restart \
  --name trader-portfolio \
  --resource-group trader-rg
```

### Scale Up
```bash
# Upgrade to S1 Standard tier
az appservice plan update \
  --name trader-plan \
  --resource-group trader-rg \
  --sku S1
```

### View Metrics
```bash
# CPU usage
az monitor metrics list \
  --resource "/subscriptions/{subscription-id}/resourceGroups/trader-rg/providers/Microsoft.Web/sites/trader-portfolio" \
  --metric "CpuPercentage" \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z

# Memory usage
az monitor metrics list \
  --resource "/subscriptions/{subscription-id}/resourceGroups/trader-rg/providers/Microsoft.Web/sites/trader-portfolio" \
  --metric "MemoryPercentage"
```

### SSH into Container
```bash
az webapp ssh \
  --name trader-portfolio \
  --resource-group trader-rg
```

---

## Cost Estimation

**B1 Basic Tier:**
- Compute: ~$13.14/month
- Storage: Included (10 GB)
- Bandwidth: 165 GB included

**Additional Costs:**
- Neon Database: Free tier (0.5 GB storage)
- Clerk: Free up to 10,000 MAU
- Cloudflare: Free (SSL + CDN)
- Azure OpenAI: Pay per token

**Total Estimated:** ~$15-20/month

---

## Security Checklist

- ✅ HTTPS-only enforced
- ✅ Cloudflare WAF enabled
- ✅ Environment variables in Azure (not in code)
- ✅ Non-root user in Docker container
- ✅ CORS configured for custom domain only
- ✅ Clerk authentication on all API endpoints
- ✅ Database connection string uses SSL
- ✅ Neon IP allowlist configured

---

## Success Criteria

**Your deployment is successful when:**

1. ✅ `https://trader.samarp.net` loads the React app
2. ✅ SSL certificate is valid (Cloudflare)
3. ✅ Health check returns 200: `https://trader.samarp.net/health`
4. ✅ Clerk sign-in modal works
5. ✅ Authenticated users can see their portfolio
6. ✅ Database queries execute successfully
7. ✅ No console errors in browser
8. ✅ API responses are fast (<500ms)

---

## Next Steps

1. **Set up monitoring:**
   - Azure Application Insights
   - Cloudflare Analytics

2. **Configure alerts:**
   - App down notifications
   - High memory usage

3. **Set up backups:**
   - Database: Neon automatic backups
   - Code: GitHub repository

4. **Performance optimization:**
   - Enable Cloudflare caching
   - Compress static assets
   - Add CDN for frontend assets

5. **Documentation:**
   - Document deployment process for team
   - Create runbook for common issues

---

**Your Portfolio Rotation Agent is now live at:**
# 🚀 https://trader.samarp.net

**Enjoy your production-ready multi-user trading platform!** 📈
