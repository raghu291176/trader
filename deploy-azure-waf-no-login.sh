#!/bin/bash

#########################################################
# Azure Deployment - Well-Architected Framework
# Portfolio Rotation Agent - Enterprise Security
# (Modified to skip az login)
#########################################################

set -e

# Load environment variables manually to handle special characters
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  # Export the variable
  export "$key=$value"
done < .env.production

# Configuration
RESOURCE_GROUP="trader-rg"
LOCATION="eastus"
APP_NAME="trader-portfolio"
PLAN_NAME="trader-plan"
VNET_NAME="trader-vnet"
KEYVAULT_NAME="trader-kv-$(openssl rand -hex 4)"
APP_GATEWAY_NAME="trader-appgw"
WAF_POLICY_NAME="trader-waf"
CUSTOM_DOMAIN="trader.samarp.net"

echo "=========================================="
echo "Azure Deployment - Well-Architected"
echo "=========================================="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verify prerequisites
echo "Checking prerequisites..."
command -v az >/dev/null 2>&1 || { echo -e "${RED}✗ Azure CLI not installed${NC}"; exit 1; }
echo -e "${GREEN}✓ Azure CLI installed${NC}"

# Step 1: Verify Azure Login (skip actual login)
echo
echo "Step 1: Verify Azure Login"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo -e "${GREEN}✓ Using subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)${NC}"
echo

# Step 2: Create Resource Group
echo "Step 2: Create Resource Group"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags Environment=Production Project=TraderPortfolio
echo -e "${GREEN}✓ Resource group created${NC}"

# Step 3: Create Virtual Network
echo
echo "Step 3: Create Virtual Network & Subnets"
az network vnet create \
  --name "$VNET_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --address-prefix 10.0.0.0/16

# Subnet for App Service VNet Integration
az network vnet subnet create \
  --name "app-subnet" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --address-prefix 10.0.1.0/24 \
  --delegations Microsoft.Web/serverFarms

# Subnet for Private Endpoints
az network vnet subnet create \
  --name "private-endpoint-subnet" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --address-prefix 10.0.2.0/24 \
  --disable-private-endpoint-network-policies true

# Subnet for Application Gateway
az network vnet subnet create \
  --name "appgw-subnet" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --address-prefix 10.0.3.0/24

echo -e "${GREEN}✓ Virtual Network created with 3 subnets${NC}"

# Step 4: Create Network Security Groups
echo
echo "Step 4: Create Network Security Groups"

# NSG for App Service subnet
az network nsg create \
  --name "app-nsg" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

az network nsg rule create \
  --name "AllowAppGateway" \
  --nsg-name "app-nsg" \
  --resource-group "$RESOURCE_GROUP" \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes "10.0.3.0/24" \
  --destination-port-ranges 443 \
  --protocol Tcp \
  --access Allow

az network vnet subnet update \
  --name "app-subnet" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --network-security-group "app-nsg"

# NSG for Private Endpoint subnet
az network nsg create \
  --name "pe-nsg" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

az network vnet subnet update \
  --name "private-endpoint-subnet" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --network-security-group "pe-nsg"

echo -e "${GREEN}✓ Network Security Groups created${NC}"

# Step 5: Create Key Vault
echo
echo "Step 5: Create Azure Key Vault"
az keyvault create \
  --name "$KEYVAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --enable-rbac-authorization true \
  --public-network-access Disabled

# Create Private Endpoint for Key Vault
az network private-endpoint create \
  --name "${KEYVAULT_NAME}-pe" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --subnet "private-endpoint-subnet" \
  --private-connection-resource-id $(az keyvault show --name "$KEYVAULT_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv) \
  --group-id vault \
  --connection-name "${KEYVAULT_NAME}-connection"

echo -e "${GREEN}✓ Key Vault created with Private Endpoint${NC}"

# Step 6: Store Secrets in Key Vault
echo
echo "Step 6: Store Secrets in Key Vault"
echo -e "${YELLOW}⚠ Importing secrets from environment variables${NC}"

# Store secrets with proper quoting
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "DatabaseUrl" --value "${DATABASE_URL}" 2>&1 || echo "Warning: DATABASE_URL may be empty"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "ClerkSecretKey" --value "${CLERK_SECRET_KEY}"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "ClerkPublishableKey" --value "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "AzureOpenAIApiKey" --value "${AZURE_OPENAI_API_KEY}"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "FinnhubApiKey" --value "${FINNHUB_API_KEY}"

echo -e "${GREEN}✓ Secrets stored in Key Vault${NC}"

# Step 7: Create App Service Plan (Premium V3 for VNet integration)
echo
echo "Step 7: Create App Service Plan"
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --is-linux \
  --sku P1V3 \
  --number-of-workers 1

echo -e "${GREEN}✓ App Service Plan created (P1V3)${NC}"

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

# Step 16: Configure Custom Domain
echo
echo "Step 16: Configure Custom Domain"

# Get domain verification ID
VERIFICATION_ID=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "customDomainVerificationId" \
  --output tsv)

APP_GATEWAY_IP=$(az network public-ip show --name ${APP_GATEWAY_NAME}-pip --resource-group $RESOURCE_GROUP --query ipAddress -o tsv)

echo "=========================================="
echo "CLOUDFLARE DNS CONFIGURATION NEEDED"
echo "=========================================="
echo
echo "1. A Record:"
echo "   Type: A"
echo "   Name: trader"
echo "   IPv4: $APP_GATEWAY_IP"
echo "   Proxy: Proxied (Orange Cloud)"
echo
echo "2. TXT Record (verification):"
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
echo "Architecture Summary:"
echo "  ✅ Virtual Network: $VNET_NAME"
echo "  ✅ App Service: $APP_NAME (VNet-integrated)"
echo "  ✅ Key Vault: $KEYVAULT_NAME (Private Endpoint)"
echo "  ✅ Application Gateway: $APP_GATEWAY_NAME (WAF enabled)"
echo "  ✅ Managed Identity: Enabled"
echo "  ✅ Public Access: Disabled (App Service)"
echo "  ✅ Diagnostics: Enabled"
echo
echo "Security Features:"
echo "  🔒 All secrets in Key Vault"
echo "  🔒 Private Endpoints for Key Vault"
echo "  🔒 VNet Integration for App Service"
echo "  🔒 WAF (OWASP 3.2) in Prevention mode"
echo "  🔒 Network Security Groups"
echo "  🔒 Managed Identity (no credentials in code)"
echo "  🔒 Public access disabled"
echo
echo "Next Steps:"
echo "1. Configure Cloudflare DNS (details above)"
echo "2. Upload SSL certificate to Application Gateway"
echo "3. Configure health probes"
echo "4. Test application: https://trader.samarp.net"
echo "5. Review WAF logs for false positives"
echo "6. Set up monitoring alerts"
echo
echo "Resources:"
echo "  Application Gateway IP: $APP_GATEWAY_IP"
echo "  Key Vault URI: $(az keyvault show --name $KEYVAULT_NAME --resource-group $RESOURCE_GROUP --query properties.vaultUri -o tsv)"
echo "  Key Vault Name: $KEYVAULT_NAME"
echo
