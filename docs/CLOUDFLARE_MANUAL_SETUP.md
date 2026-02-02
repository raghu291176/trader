# Cloudflare DNS Manual Setup Guide

## Overview
You need to add 2 DNS records to make `trader.samarp.net` point to your Azure Application Gateway.

**Time required**: 2-3 minutes
**DNS propagation**: 2-5 minutes after adding records

---

## Step 1: Login to Cloudflare

1. Go to: https://dash.cloudflare.com/login
2. Login with your credentials
3. Click on your **samarp.net** domain

---

## Step 2: Navigate to DNS Settings

1. In the left sidebar, click **DNS**
2. Click **Records** tab
3. You should see a list of existing DNS records

---

## Step 3: Add A Record (Points to Azure)

Click **Add record** button and enter:

| Field | Value |
|-------|-------|
| **Type** | A |
| **Name** | trader |
| **IPv4 address** | `20.127.20.161` |
| **Proxy status** | ✅ Proxied (Orange cloud icon should be ON) |
| **TTL** | Auto |

Click **Save**

---

## Step 4: Add TXT Record (Azure Verification)

Click **Add record** button again and enter:

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | asuid.trader |
| **Content** | `25B9F2CD85BF49E1CE69B34F094AF6CC6867B548B117F6102B605A45B9B410B6` |
| **TTL** | Auto |

Click **Save**

---

## Step 5: Verify SSL/TLS Settings

1. In the left sidebar, click **SSL/TLS**
2. Check that **SSL/TLS encryption mode** is set to:
   - ✅ **Full (strict)** - Recommended
   - OR **Full** - Also works

3. If it's set to "Flexible" or "Off", change it to **Full (strict)**

---

## Step 6: Optional - Enable Always Use HTTPS

1. In the left sidebar, click **SSL/TLS**
2. Click **Edge Certificates** tab
3. Scroll down to **Always Use HTTPS**
4. Toggle it to **On**

---

## Step 7: Wait for DNS Propagation

DNS changes take 2-5 minutes to propagate.

### Check DNS:
```bash
nslookup trader.samarp.net
```

You should see: `20.127.20.161`

### Test Your Application:
```bash
curl https://trader.samarp.net/health
```

---

## Summary

**What you added:**

✅ A Record: `trader.samarp.net` → `20.127.20.161` (Proxied)
✅ TXT Record: `asuid.trader.samarp.net` → Verification ID
✅ SSL/TLS: Full (Strict) mode

**Your application will be live at:**
🌐 https://trader.samarp.net

---

## Troubleshooting

### "Page not found" or "Cannot connect"
- Wait 2-5 minutes for DNS propagation
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Try from incognito/private window

### SSL Certificate Error
- Ensure SSL/TLS mode is set to "Full (strict)" or "Full"
- Wait a few minutes for Cloudflare to provision the certificate

### Still not working after 10 minutes?
Run these commands and share the output:

```bash
nslookup trader.samarp.net
curl -I https://trader.samarp.net/health
```

---

## What Happens Behind the Scenes

```
User Browser
    ↓
Cloudflare Edge (DDoS Protection, CDN)
    ↓
Azure Application Gateway (IP: 20.127.20.161)
    ↓
Web Application Firewall (OWASP Protection)
    ↓
Azure VNet (Private Network)
    ↓
App Service: trader-portfolio
```

You're protected by 5 layers of security! 🛡️
