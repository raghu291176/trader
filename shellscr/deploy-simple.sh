#!/bin/bash

#########################################################
# Simple Azure Deployment Wrapper
# Handles login and runs deployment automatically
#########################################################

set -e

echo "=========================================="
echo "Azure Enterprise Deployment"
echo "Simple One-Command Setup"
echo "=========================================="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Login
echo "Step 1: Azure Login"
echo "A browser window will open for authentication..."
echo

az login \
  --tenant 53395443-a60c-4f5c-9462-f84ac5f29037 \
  --output table

echo
echo -e "${GREEN}✓ Login successful${NC}"
echo

# Step 2: Set subscription
echo "Step 2: Set Subscription"
az account set --subscription "Microsoft Azure Sponsorship"

SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo -e "${GREEN}✓ Using: $SUBSCRIPTION_NAME${NC}"
echo -e "  ID: $SUBSCRIPTION_ID"
echo

# Step 3: Run deployment
echo "Step 3: Starting Deployment"
echo -e "${YELLOW}This will take 25-30 minutes${NC}"
echo

# Run the main deployment script
./deploy-azure-waf-no-login.sh

echo
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
