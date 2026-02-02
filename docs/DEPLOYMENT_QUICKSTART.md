# Deployment Quick Reference
## Choose Your Deployment Strategy

---

## Option 1: Basic Deployment (Simple)
**Cost:** ~$15-20/month | **Setup Time:** 15 minutes

### Features
- ✅ HTTPS with Cloudflare SSL
- ✅ Custom domain (trader.samarp.net)
- ✅ Clerk authentication
- ✅ Node.js 20 LTS runtime
- ❌ No VNet isolation
- ❌ No WAF
- ❌ Secrets in environment variables

### Deploy
```bash
chmod +x deploy-azure.sh
export $(cat .env.production | xargs)
./deploy-azure.sh
```

**Guide:** [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)

---

## Option 2: Enterprise Deployment (Secure)
**Cost:** ~$410/month | **Setup Time:** 30 minutes

### Features
- ✅ Virtual Network isolation
- ✅ Web Application Firewall (OWASP 3.2)
- ✅ Private Endpoints (Key Vault)
- ✅ Managed Identity (no credentials)
- ✅ Network Security Groups
- ✅ Azure Monitor + Log Analytics
- ✅ Defense in depth (5 layers)

### Deploy
```bash
chmod +x deploy-azure-waf.sh
export $(cat .env.production | xargs)
./deploy-azure-waf.sh
```

**Guide:** [AZURE_WAF_DEPLOYMENT.md](AZURE_WAF_DEPLOYMENT.md)

---

## Decision Matrix

| Factor | Basic | Enterprise |
|--------|-------|------------|
| **Cost** | $15-20/mo | $410/mo |
| **Security** | Good | Excellent |
| **Compliance** | Basic | Advanced |
| **Setup Time** | 15 min | 30 min |
| **WAF Protection** | ❌ | ✅ |
| **VNet Isolation** | ❌ | ✅ |
| **Private Endpoints** | ❌ | ✅ |
| **Managed Identity** | ❌ | ✅ |
| **Recommended For** | Dev/Test | Production |

---

## Cloudflare DNS Configuration

### Basic Deployment
```
Type: CNAME
Name: trader
Target: trader-portfolio.azurewebsites.net
Proxy: 🟠 Proxied
```

### Enterprise Deployment
```
Type: A
Name: trader
IPv4: <Application-Gateway-IP>
Proxy: 🟠 Proxied
```

### SSL Settings (Both)
- Mode: **Full (Strict)**
- Always Use HTTPS: ✅
- TLS Version: 1.3

---

## Quick Commands

### View Logs
```bash
az webapp log tail --name trader-portfolio --resource-group trader-rg
```

### Restart App
```bash
az webapp restart --name trader-portfolio --resource-group trader-rg
```

### Check Health
```bash
curl https://trader.samarp.net/health
```

### SSH Access
```bash
az webapp ssh --name trader-portfolio --resource-group trader-rg
```

---

## Support

**Issues:** [GitHub Issues](https://github.com/your-username/trader/issues)
**Docs:** [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) | [AZURE_WAF_DEPLOYMENT.md](AZURE_WAF_DEPLOYMENT.md)
