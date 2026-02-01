# Deploy Enterprise Infrastructure Now

## Quick Deploy Commands

Open your terminal and run these commands:

```bash
# 1. Navigate to project
cd /Users/raghubalachandran/projects/trader

# 2. Login to Azure (browser will open)
az login --tenant 53395443-a60c-4f5c-9462-f84ac5f29037

# 3. Set subscription
az account set --subscription "Microsoft Azure Sponsorship"

# 4. Verify login
az account show

# 5. Run deployment (20-30 minutes)
./deploy-azure-waf-no-login.sh
```

## What the Script Will Create

### Infrastructure (Cost: ~$410/month)
- **Virtual Network** (10.0.0.0/16) with 3 subnets
- **Application Gateway** with WAF v2 (OWASP 3.2)
- **App Service** P1V3 with VNet integration
- **Key Vault** with Private Endpoints
- **Network Security Groups**
- **Managed Identity** for credential-less access
- **Log Analytics** workspace

### Timeline
- Steps 1-12: ~10 minutes (VNet, NSG, Key Vault, App Service)
- Step 13: ~10-15 minutes (Application Gateway creation)
- Steps 14-17: ~5 minutes (DNS, diagnostics)

### After Deployment

You'll receive:
1. **Application Gateway IP** - for Cloudflare A record
2. **Domain Verification ID** - for Cloudflare TXT record
3. **Key Vault name** - for secrets management

### Cloudflare DNS Configuration

When the script shows DNS instructions, configure:

**A Record:**
```
Type: A
Name: trader
IPv4: <app-gateway-ip-from-script>
Proxy: ON (Orange Cloud)
```

**TXT Record:**
```
Type: TXT
Name: asuid.trader
Content: <verification-id-from-script>
```

**SSL Settings:**
- Mode: Full (Strict)
- Always Use HTTPS: ON
- Min TLS: 1.3

## Troubleshooting

### If deployment fails:
```bash
# Check what resources were created
az resource list --resource-group trader-rg --output table

# Delete and retry
az group delete --name trader-rg --yes
./deploy-azure-waf-no-login.sh
```

### View deployment logs:
```bash
# After deployment completes
az webapp log tail --name trader-portfolio --resource-group trader-rg
```

## Next Steps After Deployment

1. Configure Cloudflare DNS (provided by script)
2. Test health endpoint: `curl https://trader.samarp.net/health`
3. Open app: `open https://trader.samarp.net`
4. Monitor logs for first 30 minutes
5. Set up Azure alerts (optional)

## Cost Breakdown

| Resource | Monthly Cost |
|----------|--------------|
| App Service P1V3 | $151 |
| Application Gateway WAF_v2 | $246 |
| Key Vault | $0.03 |
| Log Analytics | $2-5 |
| Public IP | $4 |
| VNet | $0 |
| **Total** | **~$410** |

## Emergency Stop

If you need to stop and delete everything:
```bash
az group delete --name trader-rg --yes --no-wait
```

---

**Ready?** Run the commands above in your terminal to start deployment!
