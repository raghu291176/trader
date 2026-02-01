# Quick Start - Deploy in 3 Commands

## Fastest Way to Deploy

Azure cache has been cleared. Fresh start!

```bash
cd /Users/raghubalachandran/projects/trader

# One command does everything:
./deploy-simple.sh
```

That's it! The script will:
1. ✅ Open browser for Azure login
2. ✅ Set the correct subscription
3. ✅ Run the full deployment
4. ⏸️ Pause when you need to add DNS records

---

## What Happens

### Automatic Steps (25 minutes)
- Creates VNet, NSG, Key Vault
- Creates App Service with Managed Identity
- Creates Application Gateway with WAF
- Configures all security settings

### Your Action Required (1 time, 3 minutes)
When the script pauses, it will show:
```
Application Gateway IP: XX.XX.XX.XX
Verification ID: XXXXXXXXXX
```

Go to Cloudflare → samarp.net → DNS:
1. Add A record: `trader` → `XX.XX.XX.XX` (Proxied ON)
2. Add TXT record: `asuid.trader` → `XXXXXXXXXX`
3. Press Enter in terminal

---

## If Something Goes Wrong

### Clear everything and retry:
```bash
# Delete all resources
az group delete --name trader-rg --yes --no-wait

# Wait 2 minutes, then retry
./deploy-simple.sh
```

### Can't login to Azure?
```bash
# Clear Azure completely
rm -rf ~/.azure

# Retry
./deploy-simple.sh
```

### Script stops with error?
Paste the error here and I'll help fix it!

---

## After Deployment

Test:
```bash
curl https://trader.samarp.net/health
open https://trader.samarp.net
```

Monitor:
```bash
az webapp log tail --name trader-portfolio --resource-group trader-rg
```

---

**Ready?** Just run:
```bash
./deploy-simple.sh
```

Everything is automated! 🚀
