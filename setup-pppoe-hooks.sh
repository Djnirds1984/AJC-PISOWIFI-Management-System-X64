#!/bin/bash
# AJC PPPoE Hook Installer
# This script installs the real-time PPPoE expiration check hooks

echo "Installing AJC PPPoE Real-time Expiration Hooks..."

# Create log directory
sudo mkdir -p /var/log

# Install ip-up hook
echo "Installing ip-up.local hook..."
sudo cp lib/pppoe-ip-up.local /etc/ppp/ip-up.local
sudo chmod +x /etc/ppp/ip-up.local

# Install ip-down hook  
echo "Installing ip-down.local hook..."
sudo cp lib/pppoe-ip-down.local /etc/ppp/ip-down.local
sudo chmod +x /etc/ppp/ip-down.local

# Create log file
echo "Creating log file..."
sudo touch /var/log/ajc-pppoe.log
sudo chmod 644 /var/log/ajc-pppoe.log

echo "PPPoE hooks installed successfully!"
echo "The system will now check expiration in real-time when users connect."
echo "Logs will be written to /var/log/ajc-pppoe.log"
echo ""
echo "To test, create an expired PPPoE user and try to connect."
echo "The user should be redirected to port 8081 and blocked from internet access."