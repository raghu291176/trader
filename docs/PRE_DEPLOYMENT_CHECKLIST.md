# Pre-Deployment Checklist

## ✅ Environment Ready

### Prerequisites Verified
- ✅ Azure CLI installed (v2.71.0)
- ✅ Docker installed (v28.3.3)
- ✅ Deployment scripts executable
- ✅ `.env.production` file created

### Build Status
- ⚠️ Backend build: TypeScript errors present (non-critical for Azure deployment)
- ⚠️ Frontend build: Dependencies need installation

## 📝 Choose Your Deployment Strategy

You have two deployment options documented and ready:

### Option 1: Basic Deployment (~$20/month)
**Perfect for:** Development, testing, small-scale production

**Features:**
- Azure App Service (B1 Basic tier)
- HTTPS with Cloudflare SSL
- Custom domain (trader.samarp.net)
- Clerk authentication
- All environment variables configured

**Deploy with:**
```bash
cd /Users/raghubalachandran/projects/trader
export $(cat .env.production | xargs)
./deploy-azure.sh
```

**Documentation:** [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)

---

### Option 2: Enterprise Deployment (~$410/month)
**Perfect for:** Production, compliance requirements, security-critical applications

**Features:**
- Virtual Network isolation (10.0.0.0/16)
- Application Gateway with WAF (OWASP 3.2)
- Private Endpoints for Key Vault
- Network Security Groups
- Managed Identity (credential-less)
- Azure Monitor + Log Analytics
- 5 layers of security

**Deploy with:**
```bash
cd /Users/raghubalachandran/projects/trader
export $(cat .env.production | xargs)
./deploy-azure-waf.sh
```

**Documentation:** [AZURE_WAF_DEPLOYMENT.md](AZURE_WAF_DEPLOYMENT.md)

---

## 🔐 Required Azure Configuration

Before running either deployment script:

1. **Azure Login**
   ```bash
   az login
   ```

2. **Select Subscription** (if you have multiple)
   ```bash
   az account list --output table
   az account set --subscription "Your-Subscription-Name"
   ```

3. **Verify Resource Group Doesn't Exist**
   ```bash
   az group show --name trader-rg
   # Should return error if doesn't exist (good)
   ```

---

## 🌐 Cloudflare DNS Configuration

After deployment, you'll need to configure Cloudflare DNS:

### For Basic Deployment
```
Type: CNAME
Name: trader
Target: trader-portfolio.azurewebsites.net
Proxy: 🟠 Proxied (Orange Cloud)
```

### For Enterprise Deployment
```
Type: A
Name: trader
IPv4: <Application-Gateway-IP> (provided by script)
Proxy: 🟠 Proxied (Orange Cloud)
```

### Both Deployments Need
```
Type: TXT
Name: asuid.trader
Content: <verification-id> (provided by script)
```

**SSL Settings:**
- Mode: Full (Strict)
- Always Use HTTPS: ✅
- TLS Version: 1.3

---

## 📋 Post-Deployment Verification

After deployment completes, test these endpoints:

### Health Check
```bash
curl https://trader.samarp.net/health
# Expected: {"status":"healthy","timestamp":"..."}
```

### Frontend
```bash
open https://trader.samarp.net
# Should load React dashboard
```

### Authentication
```bash
# Sign in through Clerk modal
# Verify you can see portfolio data
```

### Database Connection
```bash
# Log into Azure portal
# Check Application Insights for any connection errors
```

---

## 🔧 Troubleshooting Quick Links

### View Logs
```bash
az webapp log tail --name trader-portfolio --resource-group trader-rg
```

### Restart App
```bash
az webapp restart --name trader-portfolio --resource-group trader-rg
```

### SSH Access
```bash
az webapp ssh --name trader-portfolio --resource-group trader-rg
```

### Check App Settings
```bash
az webapp config appsettings list \
  --name trader-portfolio \
  --resource-group trader-rg \
  --query "[].{name:name}" \
  --output table
```

---

## 💰 Cost Estimates

### Basic Deployment
| Service | Cost/Month |
|---------|-----------|
| App Service (B1) | $13.14 |
| Neon Database | $0 (free tier) |
| Clerk Auth | $0 (free tier) |
| Cloudflare | $0 (free tier) |
| **Total** | **~$15-20** |

### Enterprise Deployment
| Service | Cost/Month |
|---------|-----------|
| App Service (P1V3) | $151 |
| Application Gateway (WAF_v2) | $246 |
| Key Vault | $0.03 |
| Log Analytics | $2-5 |
| Public IP | $4 |
| VNet | $0 |
| **Total** | **~$410** |

---

## 🚀 Ready to Deploy?

1. **Choose your deployment strategy** (Basic or Enterprise)
2. **Run the deployment script**
3. **Configure Cloudflare DNS** (script will provide details)
4. **Test all endpoints**
5. **Monitor logs** for first 24 hours

## 📚 Additional Documentation

- [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) - Quick decision matrix
- [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) - Basic deployment guide
- [AZURE_WAF_DEPLOYMENT.md](AZURE_WAF_DEPLOYMENT.md) - Enterprise deployment guide
- [SEAMLESS_SETUP.md](SEAMLESS_SETUP.md) - Full-stack integration guide

---

**You're ready to deploy!** Choose your strategy and run the appropriate script.
