#!/bin/bash

# Update system packages
apt update
apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -y pm2 -g

# Create application directory
mkdir -p /var/www/map-app
cd /var/www/map-app

# Copy application files (you'll need to scp these files separately)
# mkdir -p front
# mkdir -p MapServer

# Install dependencies
npm install

# Set up PM2 for application management
pm2 start server.js --name "map-application"
pm2 startup
pm2 save

# Configure firewall
apt install -y ufw
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

echo "Deployment completed!" 