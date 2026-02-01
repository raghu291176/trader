# Pre-Deployment Checklist ✅

## Before You Start

### Prerequisites
- ✅ Azure CLI installed
- ✅ Cloudflare access to samarp.net
- ✅ 30 minutes available
- ✅ Terminal ready

### Files Ready
- ✅ `.env.production` (secrets configured)
- ✅ `deploy-azure-waf-no-login.sh` (deployment script)
- ✅ Python files deleted (project clean)
- ✅ Frontend builds successfully

## Deployment Steps

### 1. Azure Login (2 minutes)
```bash
cd /Users/raghubalachandran/projects/trader

# Login (browser opens)
az login --tenant 53395443-a60c-4f5c-9462-f84ac5f29037

# Set subscription
az account set --subscription "Microsoft Azure Sponsorship"

# Verify
az account show
```

**Expected output:**
```
"name": "Microsoft Azure Sponsorship"
"state": "Enabled"
```

### 2. Start Deployment (1 minute)
```bash
./deploy-azure-waf-no-login.sh
```

**What happens:**
- Script validates Azure CLI
- Shows subscription info
- Starts resource creation

### 3. Watch Progress (10 minutes)
**Steps 1-12 run automatically:**
- ✅ Resource Group created
- ✅ Virtual Network + 3 subnets
- ✅ Network Security Groups
- ✅ Key Vault with Private Endpoint
- ✅ App Service Plan (P1V3)
- ✅ Web App with Managed Identity
- ✅ VNet Integration
- ✅ App Settings with Key Vault references
- ✅ Public IP for Application Gateway
- ✅ WAF Policy (OWASP 3.2)

### 4. Application Gateway (10-15 minutes)
**Step 15:** Creating Application Gateway with WAF
- This is the longest step
- No action needed
- Shows "⚠ This may take 10-15 minutes..."

☕ **Get coffee!**

### 5. DNS Configuration (5 minutes)
**Step 16:** Script PAUSES and shows:

```
==========================================
CLOUDFLARE DNS CONFIGURATION NEEDED
==========================================

1. A Record:
   Type: A
   Name: trader
   IPv4: <IP-ADDRESS-HERE>
   Proxy: Proxied (Orange Cloud)

2. TXT Record:
   Type: TXT
   Name: asuid.trader
   Content: <VERIFICATION-ID-HERE>
==========================================
```

**Your action:**
1. Open [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to samarp.net → DNS → Records
3. Add A record (copy IP from script)
4. Add TXT record (copy verification ID)
5. Configure SSL/TLS:
   - SSL/TLS → Overview → Full (strict)
   - Edge Certificates → Always Use HTTPS: ON
6. Press Enter in terminal

**Reference:** See [CLOUDFLARE_DNS_SETUP.md](CLOUDFLARE_DNS_SETUP.md)

### 6. Final Steps (5 minutes)
**Step 17:** Enable diagnostics
- Creates Log Analytics workspace
- Enables App Service logging
- Shows deployment summary

### 7. Deployment Complete! 🎉

**You'll see:**
```
==========================================
DEPLOYMENT COMPLETE!
==========================================

Architecture Summary:
  ✅ Virtual Network: trader-vnet
  ✅ App Service: trader-portfolio (VNet-integrated)
  ✅ Key Vault: trader-kv-XXXX (Private Endpoint)
  ✅ Application Gateway: trader-appgw (WAF enabled)
  ✅ Managed Identity: Enabled
  ✅ Public Access: Disabled (App Service)
  ✅ Diagnostics: Enabled

Resources:
  Application Gateway IP: XX.XX.XX.XX
  Key Vault URI: https://trader-kv-XXXX.vault.azure.net/
  Key Vault Name: trader-kv-XXXX
```

## Post-Deployment Verification

### Immediate Tests (2 minutes)

```bash
# 1. DNS resolution (wait 2-5 min if fails)
dig trader.samarp.net

# 2. Health check
curl https://trader.samarp.net/health
# Expected: {"status":"healthy","timestamp":"..."}

# 3. Open application
open https://trader.samarp.net
```

### What to Test

**Frontend:**
- ✅ Page loads without errors
- ✅ Clerk sign-in modal appears
- ✅ Can create account / sign in
- ✅ Dashboard loads after auth

**Backend:**
- ✅ Health endpoint responds
- ✅ API calls work after authentication
- ✅ Database queries execute

**Security:**
- ✅ HTTPS enforces (no HTTP access)
- ✅ SSL certificate valid
- ✅ WAF is active (check Azure Portal)

### Monitor Logs (first 30 minutes)

```bash
# Stream application logs
az webapp log tail \
  --name trader-portfolio \
  --resource-group trader-rg

# Check for errors
az webapp log download \
  --name trader-portfolio \
  --resource-group trader-rg \
  --log-file logs.zip
```

## Cost Tracking

### View Current Costs
```bash
# Today's cost
az consumption usage list \
  --resource-group trader-rg \
  --start-date $(date -v-1d +%Y-%m-%d) \
  --output table

# Set up budget alert
az consumption budget create \
  --budget-name trader-monthly \
  --amount 500 \
  --resource-group trader-rg \
  --time-grain Monthly
```

### Expected Monthly Costs
| Resource | Cost |
|----------|------|
| App Service P1V3 | $151 |
| Application Gateway WAF_v2 | $246 |
| Key Vault | $0.03 |
| Log Analytics | $2-5 |
| Public IP | $4 |
| **Total** | **~$410/month** |

## Troubleshooting

### Common Issues

**Issue 1: Deployment fails at Key Vault**
```bash
# Check RBAC permissions
az role assignment list --assignee <your-email> --output table

# Need "Owner" or "Key Vault Administrator"
```

**Issue 2: App Service won't start**
```bash
# Check logs
az webapp log tail --name trader-portfolio --resource-group trader-rg

# Common fix: restart
az webapp restart --name trader-portfolio --resource-group trader-rg
```

**Issue 3: DNS not resolving**
```bash
# Check Cloudflare record
dig trader.samarp.net

# Wait 5-10 minutes for propagation
# Flush local DNS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

**Issue 4: 502 Bad Gateway**
```bash
# Application Gateway might be warming up
# Wait 2-3 minutes

# Check App Service status
az webapp show \
  --name trader-portfolio \
  --resource-group trader-rg \
  --query state
```

## Emergency Rollback

If something goes wrong:

```bash
# Stop deployment (Ctrl+C in script)

# Delete all resources
az group delete --name trader-rg --yes --no-wait

# Review what went wrong
# Fix issue
# Restart deployment
./deploy-azure-waf-no-login.sh
```

## Success Criteria ✅

Deployment is successful when:

1. ✅ Script completes without errors
2. ✅ `curl https://trader.samarp.net/health` returns 200
3. ✅ Frontend loads in browser
4. ✅ Can sign in with Clerk
5. ✅ Dashboard shows portfolio data
6. ✅ No errors in application logs
7. ✅ SSL certificate valid (A+ rating)

---

## Ready to Deploy?

**Timeline:** 30 minutes total
- Azure login: 2 min
- Automated steps: 20-25 min
- DNS configuration: 3 min
- Verification: 2 min

**Required during deployment:**
- Terminal access (entire time)
- Cloudflare access (step 16 only)
- Attention (to respond to prompts)

**Start deployment:**
```bash
cd /Users/raghubalachandran/projects/trader
az login --tenant 53395443-a60c-4f5c-9462-f84ac5f29037
az account set --subscription "Microsoft Azure Sponsorship"
./deploy-azure-waf-no-login.sh
```

**Good luck! 🚀**
