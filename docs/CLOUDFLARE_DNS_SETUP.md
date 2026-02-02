# Cloudflare DNS Setup for trader.samarp.net

## When to Configure

The deployment script will pause at **Step 16** and display:
- **Application Gateway IP address**
- **Domain Verification ID**

## Cloudflare DNS Records to Create

### 1. A Record (Points to Application Gateway)

```
Login: cloudflare.com → samarp.net → DNS → Records

Click "Add record"

Type:     A
Name:     trader
IPv4:     <paste IP from deployment script>
Proxy:    ON (Orange Cloud) ✅
TTL:      Auto
```

**Example:**
```
A | trader | 20.121.45.67 | Proxied | Auto
```

### 2. TXT Record (Domain Verification)

```
Click "Add record"

Type:     TXT
Name:     asuid.trader
Content:  <paste verification ID from script>
Proxy:    DNS only (Gray Cloud)
TTL:      Auto
```

**Example:**
```
TXT | asuid.trader | 1234567890ABCDEF1234567890ABCDEF | DNS only | Auto
```

## SSL/TLS Configuration

After adding DNS records, configure SSL:

```
Cloudflare → samarp.net → SSL/TLS
```

### Overview Tab
- **SSL/TLS encryption mode:** Full (strict)
  - NOT "Flexible" or "Full" - MUST be "Full (strict)"

### Edge Certificates Tab
- ✅ Always Use HTTPS (ON)
- ✅ Automatic HTTPS Rewrites (ON)
- ✅ Minimum TLS Version: 1.2
- ✅ Opportunistic Encryption (ON)
- ✅ TLS 1.3 (ON)

## DNS Propagation Check

After creating records, verify propagation:

```bash
# Check A record
dig trader.samarp.net

# Check TXT record
dig TXT asuid.trader.samarp.net

# Wait 2-5 minutes for propagation
```

## Timeline

1. **Deployment pauses** → shows IP and verification ID
2. **Add DNS records** → takes 2-3 minutes
3. **Press Enter** in deployment script → continues
4. **DNS propagates** → 2-5 minutes
5. **Deployment completes** → application is live

## Verification

After deployment completes:

```bash
# Test DNS resolution
nslookup trader.samarp.net

# Test SSL
curl -I https://trader.samarp.net

# Test application
curl https://trader.samarp.net/health
# Expected: {"status":"healthy","timestamp":"..."}

# Open in browser
open https://trader.samarp.net
```

## Security Features Enabled

Once configured, Cloudflare provides:
- ✅ DDoS protection (automatic)
- ✅ SSL/TLS 1.3 encryption
- ✅ HTTP/2 & HTTP/3 (automatic)
- ✅ Edge caching (for static assets)
- ✅ Web Application Firewall (basic)
- ✅ Bot management (basic)

## Troubleshooting

### "DNS not resolving"
- Wait 5-10 minutes for propagation
- Verify A record shows correct IP
- Check Proxy is ON (Orange Cloud)

### "SSL certificate error"
- Verify SSL mode is "Full (strict)"
- Ensure "Always Use HTTPS" is ON
- Wait 5 minutes for SSL cert generation

### "502 Bad Gateway"
- Application Gateway may still be initializing
- Wait 2-3 minutes after deployment
- Check Azure App Service is running:
  ```bash
  az webapp show --name trader-portfolio --resource-group trader-rg --query state
  ```

## Quick Reference

**What you need from deployment script:**
1. Application Gateway IP → for A record
2. Verification ID → for TXT record

**What you configure in Cloudflare:**
1. A record (trader → IP, Proxied)
2. TXT record (asuid.trader → verification ID)
3. SSL mode (Full strict)
4. Always Use HTTPS (ON)

---

**Keep this tab open during deployment!** You'll need it when the script pauses.
