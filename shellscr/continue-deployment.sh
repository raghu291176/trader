#!/bin/bash
set -e

# Configuration
RESOURCE_GROUP="trader-rg"
LOCATION="eastus"
APP_NAME="trader-portfolio"
PLAN_NAME="trader-plan"
VNET_NAME="trader-vnet"
KEYVAULT_NAME="trader-kv-645ca8cf"
APP_GATEWAY_NAME="trader-appgw"
WAF_POLICY_NAME="trader-waf"
CUSTOM_DOMAIN="trader.samarp.net"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
while IFS="=" read -r key value; do
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  export "$key=$value"
done < .env.production

echo "Continuing deployment from Step 8..."

# Step 8: Create Web App
echo
echo "Step 8: Create Web App"
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "NODE:20-lts"

# Enable Managed Identity
az webapp identity assign \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP"

MANAGED_IDENTITY_ID=$(az webapp identity show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId -o tsv)

echo -e "${GREEN}✓ Web App created with Managed Identity${NC}"

# Step 9: Grant Key Vault Access to Managed Identity
echo
echo "Step 9: Configure Key Vault Access"
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$MANAGED_IDENTITY_ID" \
  --scope $(az keyvault show --name "$KEYVAULT_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)

echo -e "${GREEN}✓ Managed Identity granted Key Vault access${NC}"

# Step 10: Configure VNet Integration
echo
echo "Step 10: Enable VNet Integration"
az webapp vnet-integration add \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet "$VNET_NAME" \
  --subnet "app-subnet"

# Route all traffic through VNet
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-route-all-enabled true

echo -e "${GREEN}✓ VNet Integration enabled${NC}"

# Step 11: Configure App Settings with Key Vault References
echo
echo "Step 11: Configure App Settings"
KEYVAULT_URI=$(az keyvault show --name "$KEYVAULT_NAME" --resource-group "$RESOURCE_GROUP" --query properties.vaultUri -o tsv)

az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
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

echo -e "${GREEN}✓ App Settings configured with Key Vault references${NC}"

# Step 12: Disable Public Access to App Service
echo
echo "Step 12: Disable Public Access to App Service"
az webapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --set publicNetworkAccess=Disabled

echo -e "${GREEN}✓ Public access disabled (App Service only accessible via App Gateway)${NC}"

# Step 13: Create Public IP for Application Gateway
echo
echo "Step 13: Create Public IP for Application Gateway"
az network public-ip create \
  --name "${APP_GATEWAY_NAME}-pip" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard \
  --allocation-method Static \
  --dns-name "$APP_NAME"

echo -e "${GREEN}✓ Public IP created${NC}"

# Step 14: Create WAF Policy
echo
echo "Step 14: Create Web Application Firewall Policy"
az network application-gateway waf-policy create \
  --name "$WAF_POLICY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --type OWASP \
  --version 3.2

# Configure WAF rules
az network application-gateway waf-policy policy-setting update \
  --policy-name "$WAF_POLICY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --mode Prevention \
  --state Enabled

echo -e "${GREEN}✓ WAF Policy created${NC}"

# Step 15: Create Application Gateway
echo
echo "Step 15: Create Application Gateway with WAF"
echo -e "${YELLOW}⚠ This may take 10-15 minutes...${NC}"

az network application-gateway create \
  --name "$APP_GATEWAY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku WAF_v2 \
  --capacity 1 \
  --vnet-name "$VNET_NAME" \
  --subnet "appgw-subnet" \
  --public-ip-address "${APP_GATEWAY_NAME}-pip" \
  --http-settings-cookie-based-affinity Disabled \
  --http-settings-port 443 \
  --http-settings-protocol Https \
  --servers "$APP_NAME.azurewebsites.net" \
  --waf-policy "$WAF_POLICY_NAME"

echo -e "${GREEN}✓ Application Gateway created with WAF${NC}"

# Step 16: Get DNS info
echo
echo "Step 16: DNS Configuration"

VERIFICATION_ID=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "customDomainVerificationId" \
  --output tsv)

APP_GATEWAY_IP=$(az network public-ip show \
  --name "${APP_GATEWAY_NAME}-pip" \
  --resource-group "$RESOURCE_GROUP" \
  --query ipAddress \
  -o tsv)

echo "=========================================="
echo "CLOUDFLARE DNS CONFIGURATION"
echo "=========================================="
echo
echo "1. A Record:"
echo "   Type: A"
echo "   Name: trader"
echo "   IPv4: $APP_GATEWAY_IP"
echo "   Proxy: ON (Orange Cloud)"
echo
echo "2. TXT Record:"
echo "   Type: TXT"
echo "   Name: asuid.trader"
echo "   Content: $VERIFICATION_ID"
echo
echo "=========================================="

# Step 17: Enable Diagnostics
echo
echo "Step 17: Enable Diagnostic Logging"

# Create Log Analytics Workspace
az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "trader-logs" \
  --location "$LOCATION"

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "trader-logs" \
  --query id -o tsv)

# Enable App Service diagnostics
az monitor diagnostic-settings create \
  --name "app-diagnostics" \
  --resource $(az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv) \
  --workspace "$WORKSPACE_ID" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true},{"category":"AppServiceAppLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

echo -e "${GREEN}✓ Diagnostic logging enabled${NC}"

# Summary
echo
echo "=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "=========================================="
echo
echo "Application Gateway IP: $APP_GATEWAY_IP"
echo "Verification ID: $VERIFICATION_ID"
echo "Key Vault: $KEYVAULT_NAME"
echo
echo "Next: Configure Cloudflare DNS (see above)"
echo "Then test: https://trader.samarp.net/health"
