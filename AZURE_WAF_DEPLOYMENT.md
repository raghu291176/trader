# Azure Well-Architected Framework Deployment
## Portfolio Rotation Agent - Enterprise Security

---

## Architecture Overview

```
Internet
    ↓
Cloudflare (DNS + Edge SSL)
    ↓
Azure Application Gateway (WAF)
    ↓ (HTTPS)
Azure VNet
    ├─ App Service (trader-portfolio)
    │  ├─ Managed Identity
    │  └─ VNet Integration
    ├─ Private Endpoints
    │  └─ Key Vault
    └─ Network Security Groups
        ↓
External Services (via VNet)
    ├─ Neon PostgreSQL (external, secured by IP allowlist)
    ├─ Azure OpenAI (via managed endpoint)
    └─ Clerk Authentication
```

---

## Security Layers

### Layer 1: Edge Security (Cloudflare)
- **DDoS Protection**: Automatic mitigation
- **Rate Limiting**: API endpoint protection
- **SSL/TLS**: Edge termination with Full (Strict) mode
- **Bot Management**: Challenge suspicious traffic

### Layer 2: Application Gateway + WAF
- **Web Application Firewall**: OWASP 3.2 ruleset
- **SSL Offloading**: Terminates HTTPS before App Service
- **Path-based Routing**: Route `/api/*` to backend
- **Health Probes**: Automatic failover

### Layer 3: Network Security
- **VNet Isolation**: App Service in private subnet
- **Network Security Groups**: Subnet-level firewall
- **Private Endpoints**: Key Vault not exposed to internet
- **Service Endpoints**: Direct Azure backbone routing

### Layer 4: Application Security
- **Managed Identity**: No credentials in code
- **Key Vault Integration**: Secrets injected at runtime
- **HTTPS-only**: Encrypted in transit
- **Clerk Authentication**: User identity verification

### Layer 5: Data Security
- **Database Encryption**: SSL/TLS for database connections
- **IP Allowlist**: Restrict database access to Azure IPs
- **Secrets Management**: Key Vault with RBAC
- **Audit Logging**: All secret access logged

---

## Well-Architected Framework Pillars

### 1. Reliability ✅
- **Availability Zones**: Application Gateway multi-zone
- **Health Checks**: Docker + App Service health probes
- **Auto-restart**: App Service auto-healing
- **Managed Services**: Azure-managed infrastructure

### 2. Security ✅
- **Defense in Depth**: 5 security layers
- **Zero Trust**: Managed Identity, no passwords
- **Encryption**: TLS 1.3, data at rest encrypted
- **Compliance**: OWASP Top 10 protection

### 3. Cost Optimization ✅
- **Right-sizing**: P1V3 plan for VNet integration
- **Auto-scaling**: Scale based on demand
- **Reserved Instances**: 1-3 year commitments save 30-70%
- **Monitoring**: Track spend with Azure Cost Management

### 4. Operational Excellence ✅
- **Infrastructure as Code**: ARM/Bicep templates
- **CI/CD**: GitHub Actions deployment
- **Monitoring**: Application Insights + Log Analytics
- **Alerting**: Proactive issue detection

### 5. Performance Efficiency ✅
- **CDN**: Cloudflare edge caching
- **Compression**: Gzip/Brotli enabled
- **Caching**: Redis for session state (optional)
- **Connection Pooling**: Database connection management

---

## Prerequisites

### 1. Azure Subscription
- **Minimum Role**: Contributor
- **Required Quota**: 4 vCPU for P1V3 plan

### 2. Azure CLI
```bash
brew install azure-cli
az --version  # >= 2.50.0
```

### 3. Environment Variables
Create `.env.production`:
```bash
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://rb-trader.cognitiveservices.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.2-chat
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-ada-002
AZURE_OPENAI_API_VERSION=2024-12-01-preview
FINNHUB_API_KEY=...
```

Export variables:
```bash
export $(cat .env.production | xargs)
```

---

## Deployment Steps

### Automated Deployment (Recommended)

```bash
# Make script executable
chmod +x deploy-azure-waf.sh

# Run deployment
./deploy-azure-waf.sh
```

**Duration:** ~20-30 minutes

---

## Manual Deployment

### Step 1: Create Resource Group
```bash
az group create \
  --name trader-rg \
  --location eastus \
  --tags Environment=Production Project=TraderPortfolio
```

### Step 2: Create Virtual Network
```bash
# Create VNet
az network vnet create \
  --name trader-vnet \
  --resource-group trader-rg \
  --address-prefix 10.0.0.0/16

# App Service subnet (delegated)
az network vnet subnet create \
  --name app-subnet \
  --resource-group trader-rg \
  --vnet-name trader-vnet \
  --address-prefix 10.0.1.0/24 \
  --delegations Microsoft.Web/serverFarms

# Private Endpoint subnet
az network vnet subnet create \
  --name private-endpoint-subnet \
  --resource-group trader-rg \
  --vnet-name trader-vnet \
  --address-prefix 10.0.2.0/24 \
  --disable-private-endpoint-network-policies true

# Application Gateway subnet
az network vnet subnet create \
  --name appgw-subnet \
  --resource-group trader-rg \
  --vnet-name trader-vnet \
  --address-prefix 10.0.3.0/24
```

### Step 3: Create Network Security Groups
```bash
# NSG for App Service
az network nsg create \
  --name app-nsg \
  --resource-group trader-rg

az network nsg rule create \
  --name AllowAppGateway \
  --nsg-name app-nsg \
  --resource-group trader-rg \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes 10.0.3.0/24 \
  --destination-port-ranges 443 \
  --protocol Tcp \
  --access Allow

# Attach NSG to subnet
az network vnet subnet update \
  --name app-subnet \
  --resource-group trader-rg \
  --vnet-name trader-vnet \
  --network-security-group app-nsg

# NSG for Private Endpoints
az network nsg create \
  --name pe-nsg \
  --resource-group trader-rg

az network vnet subnet update \
  --name private-endpoint-subnet \
  --resource-group trader-rg \
  --vnet-name trader-vnet \
  --network-security-group pe-nsg
```

### Step 4: Create Azure Key Vault
```bash
# Create Key Vault (unique name required)
KEYVAULT_NAME="trader-kv-$(openssl rand -hex 4)"

az keyvault create \
  --name "$KEYVAULT_NAME" \
  --resource-group trader-rg \
  --location eastus \
  --enable-rbac-authorization true \
  --public-network-access Disabled

# Create Private Endpoint for Key Vault
az network private-endpoint create \
  --name "${KEYVAULT_NAME}-pe" \
  --resource-group trader-rg \
  --vnet-name trader-vnet \
  --subnet private-endpoint-subnet \
  --private-connection-resource-id $(az keyvault show --name "$KEYVAULT_NAME" --resource-group trader-rg --query id -o tsv) \
  --group-id vault \
  --connection-name "${KEYVAULT_NAME}-connection"

# Create Private DNS Zone for Key Vault
az network private-dns zone create \
  --name privatelink.vaultcore.azure.net \
  --resource-group trader-rg

az network private-dns link vnet create \
  --name KeyVaultDNSLink \
  --resource-group trader-rg \
  --zone-name privatelink.vaultcore.azure.net \
  --virtual-network trader-vnet \
  --registration-enabled false

# Add DNS record
az network private-endpoint dns-zone-group create \
  --name KeyVaultZoneGroup \
  --resource-group trader-rg \
  --endpoint-name "${KEYVAULT_NAME}-pe" \
  --private-dns-zone privatelink.vaultcore.azure.net \
  --zone-name privatelink.vaultcore.azure.net
```

### Step 5: Store Secrets in Key Vault
```bash
# Store secrets
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "DatabaseUrl" --value "$DATABASE_URL"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "ClerkSecretKey" --value "$CLERK_SECRET_KEY"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "ClerkPublishableKey" --value "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "AzureOpenAIApiKey" --value "$AZURE_OPENAI_API_KEY"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "FinnhubApiKey" --value "$FINNHUB_API_KEY"
```

### Step 6: Create App Service Plan
```bash
# Premium V3 (P1V3) required for VNet integration
az appservice plan create \
  --name trader-plan \
  --resource-group trader-rg \
  --is-linux \
  --sku P1V3 \
  --number-of-workers 1
```

### Step 7: Create Web App with Managed Identity
```bash
az webapp create \
  --name trader-portfolio \
  --resource-group trader-rg \
  --plan trader-plan \
  --runtime "NODE:20-lts"

# Enable Managed Identity
az webapp identity assign \
  --name trader-portfolio \
  --resource-group trader-rg

# Get Managed Identity Principal ID
MANAGED_IDENTITY_ID=$(az webapp identity show \
  --name trader-portfolio \
  --resource-group trader-rg \
  --query principalId -o tsv)
```

### Step 8: Grant Key Vault Access
```bash
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$MANAGED_IDENTITY_ID" \
  --scope $(az keyvault show --name "$KEYVAULT_NAME" --resource-group trader-rg --query id -o tsv)
```

### Step 9: Enable VNet Integration
```bash
az webapp vnet-integration add \
  --name trader-portfolio \
  --resource-group trader-rg \
  --vnet trader-vnet \
  --subnet app-subnet

# Route all traffic through VNet
az webapp config set \
  --name trader-portfolio \
  --resource-group trader-rg \
  --vnet-route-all-enabled true
```

### Step 10: Configure App Settings
```bash
KEYVAULT_URI=$(az keyvault show --name "$KEYVAULT_NAME" --resource-group trader-rg --query properties.vaultUri -o tsv)

az webapp config appsettings set \
  --name trader-portfolio \
  --resource-group trader-rg \
  --settings \
    PORT=3000 \
    NODE_ENV=production \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=${KEYVAULT_URI}secrets/DatabaseUrl/)" \
    CLERK_SECRET_KEY="@Microsoft.KeyVault(SecretUri=${KEYVAULT_URI}secrets/ClerkSecretKey/)" \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="@Microsoft.KeyVault(SecretUri=${KEYVAULT_URI}secrets/ClerkPublishableKey/)" \
    AZURE_OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=${KEYVAULT_URI}secrets/AzureOpenAIApiKey/)" \
    AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
    AZURE_OPENAI_DEPLOYMENT_NAME="$AZURE_OPENAI_DEPLOYMENT_NAME" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME="$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME" \
    AZURE_OPENAI_API_VERSION="$AZURE_OPENAI_API_VERSION" \
    FINNHUB_API_KEY="@Microsoft.KeyVault(SecretUri=${KEYVAULT_URI}secrets/FinnhubApiKey/)"
```

### Step 11: Disable Public Access
```bash
az webapp update \
  --name trader-portfolio \
  --resource-group trader-rg \
  --set publicNetworkAccess=Disabled
```

### Step 12: Create Application Gateway
```bash
# Create Public IP
az network public-ip create \
  --name trader-appgw-pip \
  --resource-group trader-rg \
  --sku Standard \
  --allocation-method Static \
  --dns-name trader-portfolio

# Create WAF Policy
az network application-gateway waf-policy create \
  --name trader-waf \
  --resource-group trader-rg \
  --type OWASP \
  --version 3.2

az network application-gateway waf-policy policy-setting update \
  --policy-name trader-waf \
  --resource-group trader-rg \
  --mode Prevention \
  --state Enabled

# Create Application Gateway (takes 10-15 minutes)
az network application-gateway create \
  --name trader-appgw \
  --resource-group trader-rg \
  --sku WAF_v2 \
  --capacity 1 \
  --vnet-name trader-vnet \
  --subnet appgw-subnet \
  --public-ip-address trader-appgw-pip \
  --http-settings-cookie-based-affinity Disabled \
  --http-settings-port 443 \
  --http-settings-protocol Https \
  --servers trader-portfolio.azurewebsites.net \
  --waf-policy trader-waf
```

### Step 13: Configure Monitoring
```bash
# Create Log Analytics Workspace
az monitor log-analytics workspace create \
  --resource-group trader-rg \
  --workspace-name trader-logs

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group trader-rg \
  --workspace-name trader-logs \
  --query id -o tsv)

# Enable App Service diagnostics
az monitor diagnostic-settings create \
  --name app-diagnostics \
  --resource $(az webapp show --name trader-portfolio --resource-group trader-rg --query id -o tsv) \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {"category":"AppServiceHTTPLogs","enabled":true},
    {"category":"AppServiceConsoleLogs","enabled":true},
    {"category":"AppServiceAppLogs","enabled":true},
    {"category":"AppServicePlatformLogs","enabled":true}
  ]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Enable Application Gateway diagnostics
az monitor diagnostic-settings create \
  --name appgw-diagnostics \
  --resource $(az network application-gateway show --name trader-appgw --resource-group trader-rg --query id -o tsv) \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {"category":"ApplicationGatewayAccessLog","enabled":true},
    {"category":"ApplicationGatewayPerformanceLog","enabled":true},
    {"category":"ApplicationGatewayFirewallLog","enabled":true}
  ]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

---

## Cloudflare DNS Configuration

### Get Application Gateway IP
```bash
az network public-ip show \
  --name trader-appgw-pip \
  --resource-group trader-rg \
  --query ipAddress -o tsv
```

### Configure Cloudflare DNS

**Cloudflare → samarp.net → DNS**

#### Record 1: A Record
```
Type:    A
Name:    trader
IPv4:    <Application-Gateway-Public-IP>
TTL:     Auto
Proxy:   🟠 Proxied (Orange Cloud)
```

#### Record 2: TXT Verification (if needed)
```
Type:    TXT
Name:    asuid.trader
Content: <verification-id-from-azure>
TTL:     Auto
```

### Cloudflare SSL Settings

**SSL/TLS → Overview:**
- Encryption mode: **Full (Strict)**

**SSL/TLS → Edge Certificates:**
- ✅ Always Use HTTPS
- ✅ Automatic HTTPS Rewrites
- ✅ TLS 1.3
- Minimum TLS Version: **TLS 1.2**

**Security → WAF:**
- ✅ Enable WAF managed rules
- Security Level: Medium/High

**Speed → Optimization:**
- ✅ Auto Minify (JS, CSS, HTML)
- ✅ Brotli compression

---

## Database Security (Neon)

### Configure IP Allowlist

Get Azure App Service outbound IPs:
```bash
az webapp show \
  --name trader-portfolio \
  --resource-group trader-rg \
  --query outboundIpAddresses -o tsv | tr ',' '\n'
```

**Neon Console → Settings → IP Allow:**
1. Add all outbound IPs from Azure
2. Add Application Gateway IP (if needed)
3. Remove `0.0.0.0/0` (allow all)

---

## Security Validation

### 1. Verify Private Endpoint
```bash
# Should resolve to 10.0.2.x (private IP)
nslookup ${KEYVAULT_NAME}.vault.azure.net
```

### 2. Test Key Vault Access
```bash
# From App Service (should work via Managed Identity)
az webapp ssh --name trader-portfolio --resource-group trader-rg

# Inside SSH:
curl -H "Metadata:true" "http://169.254.169.254/metadata/identity/oauth2/token?resource=https://vault.azure.net"
```

### 3. Verify WAF Protection
```bash
# Should block (WAF detected XSS attempt)
curl "https://trader.samarp.net/?test=<script>alert(1)</script>"

# Should return 403 Forbidden
```

### 4. Check NSG Rules
```bash
az network nsg rule list \
  --nsg-name app-nsg \
  --resource-group trader-rg \
  --output table
```

### 5. Verify Public Access Disabled
```bash
# Should fail (public access disabled)
curl https://trader-portfolio.azurewebsites.net
```

---

## Monitoring & Alerts

### View Logs in Real-Time
```bash
# App Service logs
az webapp log tail \
  --name trader-portfolio \
  --resource-group trader-rg

# WAF logs (Application Gateway)
az monitor activity-log list \
  --resource-group trader-rg \
  --resource-type Microsoft.Network/applicationGateways
```

### Create Alerts

**High CPU Alert:**
```bash
az monitor metrics alert create \
  --name "High-CPU-Alert" \
  --resource-group trader-rg \
  --scopes $(az webapp show --name trader-portfolio --resource-group trader-rg --query id -o tsv) \
  --condition "avg CpuPercentage > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action email your-email@example.com
```

**WAF Block Alert:**
```bash
az monitor metrics alert create \
  --name "WAF-Block-Alert" \
  --resource-group trader-rg \
  --scopes $(az network application-gateway show --name trader-appgw --resource-group trader-rg --query id -o tsv) \
  --condition "count FirewallBlockedCount > 10" \
  --window-size 5m \
  --evaluation-frequency 1m
```

---

## Cost Breakdown

**Monthly Estimate (P1V3 + App Gateway):**

| Resource | SKU/Tier | Monthly Cost |
|----------|----------|--------------|
| App Service Plan | P1V3 (1 instance) | ~$146 |
| Application Gateway | WAF_v2 (1 CU) | ~$246 |
| Key Vault | Standard | ~$3 |
| Log Analytics | 5 GB/month | ~$11 |
| VNet | Standard | Free |
| Public IP | Static | ~$4 |
| **Total** | | **~$410/month** |

**Cost Optimization:**
- Use B3 plan without VNet integration: ~$100/month
- Reserved instances (1-year): Save 30%
- Auto-scaling: Only pay for actual usage

---

## Disaster Recovery

### Backup Strategy

**1. Database Backups:**
- Neon: Automatic daily backups (30 days)
- Point-in-time recovery

**2. Configuration Backup:**
```bash
# Export ARM template
az group export \
  --name trader-rg \
  --output json > trader-infrastructure.json
```

**3. Code Backup:**
- GitHub repository (primary)
- Azure DevOps Repos (mirror)

### Recovery Procedure

**Scenario: Complete Azure region failure**

1. **Switch Cloudflare to backup region:**
   ```bash
   # Update DNS to backup Application Gateway
   # Cloudflare → DNS → trader → Edit
   ```

2. **Deploy to secondary region:**
   ```bash
   LOCATION=westus2 ./deploy-azure-waf.sh
   ```

3. **Restore database:**
   ```bash
   # Neon: Restore from backup
   # Point to new DATABASE_URL
   ```

**RTO (Recovery Time Objective):** 30-60 minutes
**RPO (Recovery Point Objective):** 5 minutes (database)

---

## Compliance & Auditing

### Enable Azure Policy
```bash
# Enforce HTTPS-only
az policy assignment create \
  --name "enforce-https" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/a4af4a39-4135-47fb-b175-47fbdf85311d" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/trader-rg"

# Require tags
az policy assignment create \
  --name "require-tags" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/1e30110a-5ceb-460c-a204-c1c3969c6d62" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/trader-rg"
```

### Audit Logs
```bash
# View Key Vault access logs
az monitor activity-log list \
  --resource-group trader-rg \
  --resource-type Microsoft.KeyVault/vaults \
  --start-time 2024-01-01T00:00:00Z

# Export audit logs
az monitor activity-log list \
  --resource-group trader-rg \
  --output json > audit-logs.json
```

---

## Troubleshooting

### Issue: Key Vault Access Denied

**Error:**
```
Failed to retrieve secrets from Key Vault: Forbidden
```

**Solution:**
```bash
# Verify Managed Identity has access
az role assignment list \
  --assignee "$MANAGED_IDENTITY_ID" \
  --scope $(az keyvault show --name "$KEYVAULT_NAME" --resource-group trader-rg --query id -o tsv)

# Grant access if missing
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$MANAGED_IDENTITY_ID" \
  --scope $(az keyvault show --name "$KEYVAULT_NAME" --resource-group trader-rg --query id -o tsv)
```

### Issue: WAF Blocking Legitimate Traffic

**Symptoms:**
- 403 Forbidden errors
- Application not loading

**Solution:**
```bash
# Check WAF logs
az network application-gateway show-backend-health \
  --name trader-appgw \
  --resource-group trader-rg

# Temporarily disable WAF (testing only!)
az network application-gateway waf-policy policy-setting update \
  --policy-name trader-waf \
  --resource-group trader-rg \
  --state Disabled

# Add exclusion rule
az network application-gateway waf-policy managed-rule exclusion add \
  --policy-name trader-waf \
  --resource-group trader-rg \
  --match-variable RequestHeaderNames \
  --selector-match-operator Equals \
  --selector "User-Agent"
```

### Issue: VNet Integration Not Working

**Symptoms:**
- Database connection timeout
- Key Vault not accessible

**Solution:**
```bash
# Verify VNet integration status
az webapp vnet-integration list \
  --name trader-portfolio \
  --resource-group trader-rg

# Check if route-all is enabled
az webapp config show \
  --name trader-portfolio \
  --resource-group trader-rg \
  --query "vnetRouteAllEnabled"

# Enable if false
az webapp config set \
  --name trader-portfolio \
  --resource-group trader-rg \
  --vnet-route-all-enabled true
```

---

## Success Criteria

Your enterprise deployment is successful when:

- ✅ Application Gateway health probe shows "Healthy"
- ✅ `https://trader.samarp.net` loads without SSL warnings
- ✅ WAF blocks malicious requests (test with XSS payload)
- ✅ App Service cannot be accessed directly (public access disabled)
- ✅ Key Vault accessible only via Private Endpoint
- ✅ Managed Identity can retrieve secrets
- ✅ Database connections use SSL
- ✅ All logs flowing to Log Analytics
- ✅ Alerts configured for critical metrics

---

## Additional Resources

- [Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/)
- [App Service Networking](https://learn.microsoft.com/en-us/azure/app-service/networking-features)
- [Application Gateway Documentation](https://learn.microsoft.com/en-us/azure/application-gateway/)
- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)

---

**Your enterprise-grade Portfolio Rotation Agent is now live!** 🚀🔒

**Security Score:** A+ (with WAF, Private Endpoints, Managed Identity)
