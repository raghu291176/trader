#!/bin/bash
set -e

#########################################################
# Cloudflare DNS Configuration Script
# Automates DNS record creation for Azure deployment
#########################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DOMAIN="samarp.net"
SUBDOMAIN="trader"
APP_GATEWAY_IP="20.127.20.161"
VERIFICATION_ID="25B9F2CD85BF49E1CE69B34F094AF6CC6867B548B117F6102B605A45B9B410B6"

# Check if API token is provided
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo -e "${RED}Error: CLOUDFLARE_API_TOKEN environment variable not set${NC}"
  echo
  echo "Usage:"
  echo "  export CLOUDFLARE_API_TOKEN='your-api-token-here'"
  echo "  ./configure-cloudflare.sh"
  echo
  echo "To create an API token:"
  echo "  1. Go to https://dash.cloudflare.com/profile/api-tokens"
  echo "  2. Click 'Create Token'"
  echo "  3. Use 'Edit zone DNS' template"
  echo "  4. Select your zone: $DOMAIN"
  echo "  5. Copy the token"
  exit 1
fi

echo "==========================================="
echo "Cloudflare DNS Configuration"
echo "==========================================="
echo

# Step 1: Get Zone ID
echo "Step 1: Looking up Zone ID for $DOMAIN"
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ZONE_ID" ]; then
  echo -e "${RED}Error: Could not find zone for $DOMAIN${NC}"
  echo "Response: $ZONE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Zone ID: $ZONE_ID${NC}"

# Step 2: Check for existing A record
echo
echo "Step 2: Checking for existing A record"
EXISTING_A_RECORD=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=$SUBDOMAIN.$DOMAIN" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

EXISTING_A_ID=$(echo "$EXISTING_A_RECORD" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$EXISTING_A_ID" ]; then
  echo -e "${YELLOW}⚠ Found existing A record, updating...${NC}"
  # Update existing record
  UPDATE_A_RESPONSE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$EXISTING_A_ID" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$SUBDOMAIN\",\"content\":\"$APP_GATEWAY_IP\",\"ttl\":1,\"proxied\":true}")

  if echo "$UPDATE_A_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ A record updated${NC}"
  else
    echo -e "${RED}Error updating A record:${NC}"
    echo "$UPDATE_A_RESPONSE"
    exit 1
  fi
else
  echo "Creating new A record..."
  # Create new record
  CREATE_A_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$SUBDOMAIN\",\"content\":\"$APP_GATEWAY_IP\",\"ttl\":1,\"proxied\":true}")

  if echo "$CREATE_A_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ A record created${NC}"
  else
    echo -e "${RED}Error creating A record:${NC}"
    echo "$CREATE_A_RESPONSE"
    exit 1
  fi
fi

# Step 3: Check for existing TXT record
echo
echo "Step 3: Checking for existing TXT record"
EXISTING_TXT_RECORD=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=TXT&name=asuid.$SUBDOMAIN.$DOMAIN" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

EXISTING_TXT_ID=$(echo "$EXISTING_TXT_RECORD" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$EXISTING_TXT_ID" ]; then
  echo -e "${YELLOW}⚠ Found existing TXT record, updating...${NC}"
  # Update existing record
  UPDATE_TXT_RESPONSE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$EXISTING_TXT_ID" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"TXT\",\"name\":\"asuid.$SUBDOMAIN\",\"content\":\"$VERIFICATION_ID\",\"ttl\":1}")

  if echo "$UPDATE_TXT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ TXT record updated${NC}"
  else
    echo -e "${RED}Error updating TXT record:${NC}"
    echo "$UPDATE_TXT_RESPONSE"
    exit 1
  fi
else
  echo "Creating new TXT record..."
  # Create new record
  CREATE_TXT_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"TXT\",\"name\":\"asuid.$SUBDOMAIN\",\"content\":\"$VERIFICATION_ID\",\"ttl\":1}")

  if echo "$CREATE_TXT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ TXT record created${NC}"
  else
    echo -e "${RED}Error creating TXT record:${NC}"
    echo "$CREATE_TXT_RESPONSE"
    exit 1
  fi
fi

# Step 4: Verify SSL/TLS settings
echo
echo "Step 4: Checking SSL/TLS settings"
SSL_SETTINGS=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

CURRENT_SSL=$(echo "$SSL_SETTINGS" | grep -o '"value":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Current SSL mode: $CURRENT_SSL"

if [ "$CURRENT_SSL" != "full" ] && [ "$CURRENT_SSL" != "strict" ]; then
  echo -e "${YELLOW}⚠ Updating SSL mode to Full (Strict)...${NC}"
  SSL_UPDATE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"strict"}')

  if echo "$SSL_UPDATE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ SSL mode updated to Full (Strict)${NC}"
  else
    echo -e "${YELLOW}Warning: Could not update SSL mode${NC}"
  fi
else
  echo -e "${GREEN}✓ SSL mode is already set correctly${NC}"
fi

# Summary
echo
echo "==========================================="
echo "DNS CONFIGURATION COMPLETE!"
echo "==========================================="
echo
echo "Records configured:"
echo "  A Record: $SUBDOMAIN.$DOMAIN → $APP_GATEWAY_IP (Proxied)"
echo "  TXT Record: asuid.$SUBDOMAIN.$DOMAIN → $VERIFICATION_ID"
echo
echo "SSL/TLS Mode: Full (Strict)"
echo
echo -e "${YELLOW}⚠ DNS propagation takes 2-5 minutes${NC}"
echo
echo "Test your deployment:"
echo "  curl https://$SUBDOMAIN.$DOMAIN/health"
echo
