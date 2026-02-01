#!/bin/bash

#########################################################
# Azure Web App Deployment Script
# Portfolio Rotation Agent - Multi-User Edition
#########################################################

set -e

# Configuration
RESOURCE_GROUP="trader-rg"
LOCATION="eastus"
APP_NAME="trader-portfolio"
PLAN_NAME="trader-plan"
CUSTOM_DOMAIN="trader.samarp.net"
CONTAINER_REGISTRY="traderregistry"
IMAGE_NAME="portfolio-rotation-agent"

echo "=========================================="
echo "Azure Web App Deployment"
echo "=========================================="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Login to Azure
echo "Step 1: Azure Login"
echo "Running: az login"
az login
echo -e "${GREEN}✓ Logged in to Azure${NC}"
echo

# Step 2: Create Resource Group
echo "Step 2: Create Resource Group"
echo "Creating resource group: $RESOURCE_GROUP in $LOCATION"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"
echo -e "${GREEN}✓ Resource group created${NC}"
echo

# Step 3: Create App Service Plan
echo "Step 3: Create App Service Plan"
echo "Creating App Service Plan: $PLAN_NAME (B1 - Basic)"
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --is-linux \
  --sku B1
echo -e "${GREEN}✓ App Service Plan created${NC}"
echo

# Step 4: Create Web App
echo "Step 4: Create Web App"
echo "Creating Web App: $APP_NAME"
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "NODE:20-lts"
echo -e "${GREEN}✓ Web App created${NC}"
echo

# Step 5: Configure App Settings (Environment Variables)
echo "Step 5: Configure Environment Variables"
echo "Setting environment variables..."
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    PORT=3000 \
    NODE_ENV=production \
    DATABASE_URL="$DATABASE_URL" \
    CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
    AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
    AZURE_OPENAI_DEPLOYMENT_NAME="$AZURE_OPENAI_DEPLOYMENT_NAME" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME="$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME" \
    AZURE_OPENAI_API_VERSION="$AZURE_OPENAI_API_VERSION" \
    FINNHUB_API_KEY="$FINNHUB_API_KEY" \
    INITIAL_CAPITAL=10000 \
    ROTATION_THRESHOLD=0.02 \
    STOP_LOSS_PCT=-15 \
    MAX_DRAWDOWN_PCT=-30 \
    MIN_CASH=10 \
    AGENT_MODE=analyze \
    CACHE_HOURS=1 \
    LOG_LEVEL=INFO
echo -e "${GREEN}✓ Environment variables configured${NC}"
echo

# Step 6: Configure Deployment from GitHub
echo "Step 6: Configure GitHub Deployment"
echo -e "${YELLOW}⚠ Manual step required:${NC}"
echo "1. Go to Azure Portal → $APP_NAME → Deployment Center"
echo "2. Select 'GitHub' as source"
echo "3. Authorize GitHub access"
echo "4. Select repository: your-username/trader"
echo "5. Select branch: main"
echo "6. Azure will create GitHub Actions workflow automatically"
echo
read -p "Press Enter when GitHub deployment is configured..."
echo

# Step 7: Add Custom Domain
echo "Step 7: Add Custom Domain"
echo "Adding custom domain: $CUSTOM_DOMAIN"

# Get domain verification ID
VERIFICATION_ID=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "customDomainVerificationId" \
  --output tsv)

echo "Domain Verification ID: $VERIFICATION_ID"
echo
echo -e "${YELLOW}⚠ Configure Cloudflare DNS:${NC}"
echo "1. CNAME Record:"
echo "   Type: CNAME"
echo "   Name: trader"
echo "   Target: $APP_NAME.azurewebsites.net"
echo "   Proxy: Off (DNS only) - Important!"
echo
echo "2. TXT Record (for verification):"
echo "   Type: TXT"
echo "   Name: asuid.trader"
echo "   Content: $VERIFICATION_ID"
echo "   TTL: Auto"
echo
read -p "Press Enter after configuring Cloudflare DNS..."

# Map custom domain
az webapp config hostname add \
  --webapp-name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --hostname "$CUSTOM_DOMAIN"
echo -e "${GREEN}✓ Custom domain added${NC}"
echo

# Step 8: Enable HTTPS
echo "Step 8: Configure HTTPS"
echo "Configuring HTTPS redirect..."
az webapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --https-only true
echo -e "${GREEN}✓ HTTPS redirect enabled${NC}"
echo

# Step 9: Configure SSL (Cloudflare)
echo "Step 9: Configure Cloudflare SSL"
echo -e "${YELLOW}⚠ Manual Cloudflare configuration:${NC}"
echo "1. Go to Cloudflare → samarp.net → SSL/TLS"
echo "2. Set SSL mode: Full (Strict)"
echo "3. Enable 'Always Use HTTPS'"
echo "4. Enable 'Automatic HTTPS Rewrites'"
echo "5. Go to DNS settings"
echo "6. Enable Orange Cloud (Proxy) for trader CNAME record"
echo
read -p "Press Enter after configuring Cloudflare SSL..."

# Step 10: Configure CORS
echo "Step 10: Configure CORS"
az webapp cors add \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --allowed-origins "https://$CUSTOM_DOMAIN" "https://www.$CUSTOM_DOMAIN"
echo -e "${GREEN}✓ CORS configured${NC}"
echo

# Step 11: Verify Deployment
echo "Step 11: Verify Deployment"
echo "Testing endpoints..."

echo "Testing Azure default domain..."
curl -f "https://$APP_NAME.azurewebsites.net/health" || echo "Health check failed"

echo
echo "Testing custom domain..."
curl -f "https://$CUSTOM_DOMAIN/health" || echo "Custom domain not ready yet"

echo
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo
echo "Application URLs:"
echo "  Azure Default: https://$APP_NAME.azurewebsites.net"
echo "  Custom Domain: https://$CUSTOM_DOMAIN"
echo
echo "Next Steps:"
echo "1. Test the application: https://$CUSTOM_DOMAIN"
echo "2. Monitor logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "3. View metrics in Azure Portal"
echo
echo "Troubleshooting:"
echo "  - Check logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "  - Restart app: az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "  - SSH access: az webapp ssh --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo
