#!/bin/bash
# AJC PPPoE Real-time Expiration System Installer
# Run this script on your Raspberry Pi to enable real-time expiration checking

set -e

echo "=== AJC PPPoE Real-time Expiration System Installer ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Create the ip-up.local script
cat > /etc/ppp/ip-up.local << 'EOF'
#!/bin/bash
# AJC PPPoE Real-time Expiration Check Hook
# This script is called by pppd when a PPPoE connection is established

USERNAME="$PEERNAME"
IFNAME="$1"
LOCAL_IP="$4"
REMOTE_IP="$5"

# Log the connection
echo "[$(date)] PPPoE Connect: $USERNAME on $IFNAME (Client IP: $REMOTE_IP)" >> /var/log/ajc-pppoe.log

# Call our API to check expiration (fail silently if server not running)
RESPONSE=$(curl -s --max-time 5 "http://localhost:80/api/pppoe/check-expiration?username=$USERNAME&ip=$REMOTE_IP" || echo '{"action":"allow"}')
echo "[$(date)] PPPoE Hook Response: $RESPONSE" >> /var/log/ajc-pppoe.log

# Extract action from JSON response (simple grep method)
ACTION=$(echo "$RESPONSE" | grep -o '"action":"[^"]*"' | cut -d'"' -f4)

# Default to allow if parsing fails
if [ -z "$ACTION" ]; then
    ACTION="allow"
fi

# Log the action
echo "[$(date)] PPPoE Hook Action for $USERNAME: $ACTION" >> /var/log/ajc-pppoe.log

# Return the action to pppd (exit code determines if connection continues)
if [ "$ACTION" = "restrict" ]; then
    echo "[$(date)] PPPoE Hook: Restricting $USERNAME" >> /var/log/ajc-pppoe.log
    exit 1  # This will cause pppd to disconnect
else
    echo "[$(date)] PPPoE Hook: Allowing $USERNAME" >> /var/log/ajc-pppoe.log
    exit 0  # This will allow the connection to continue
fi
EOF

# Create the ip-down.local script
cat > /etc/ppp/ip-down.local << 'EOF'
#!/bin/bash
# AJC PPPoE Cleanup Hook
# This script is called by pppd when a PPPoE connection is terminated

USERNAME="$PEERNAME"
IFNAME="$1"
REMOTE_IP="$5"

# Log the disconnection
echo "[$(date)] PPPoE Disconnect: $USERNAME on $IFNAME (Client IP: $REMOTE_IP)" >> /var/log/ajc-pppoe.log

# Remove iptables rules for this user
if [ -n "$REMOTE_IP" ] && [ "$REMOTE_IP" != "N/A" ]; then
    # Remove all rules that might have been added for this IP
    iptables -t nat -D PREROUTING -s "$REMOTE_IP" -p tcp --dport 80 -j REDIRECT --to-port 8081 2>/dev/null || true
    iptables -D FORWARD -s "$REMOTE_IP" -p tcp --dport 80 -d ! 0.0.0.0/0 -j DROP 2>/dev/null || true
    iptables -D FORWARD -s "$REMOTE_IP" -p tcp --dport 443 -j DROP 2>/dev/null || true
    iptables -D FORWARD -s "$REMOTE_IP" -p udp --dport 53 -j ACCEPT 2>/dev/null || true
    iptables -D FORWARD -s "$REMOTE_IP" -p tcp --dport 53 -j ACCEPT 2>/dev/null || true
    iptables -D FORWARD -s "$REMOTE_IP" -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
    iptables -D FORWARD -s "$REMOTE_IP" -m state --state NEW -j DROP 2>/dev/null || true
    iptables -D INPUT -s "$REMOTE_IP" -p tcp --dport 8081 -j ACCEPT 2>/dev/null || true
fi
EOF

# Make scripts executable
chmod +x /etc/ppp/ip-up.local
chmod +x /etc/ppp/ip-down.local

# Create log file and setup log rotation
touch /var/log/ajc-pppoe.log
chmod 644 /var/log/ajc-pppoe.log

# Setup log rotation (optional)
cat > /etc/logrotate.d/ajc-pppoe << 'EOF'
/var/log/ajc-pppoe.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

echo "✓ PPPoE hooks installed successfully"
echo "✓ Scripts are now executable"
echo "✓ Log file created with rotation setup"
echo ""
echo "=== Installation Complete ==="
echo ""
echo "The system will now:"
echo "1. Check PPPoE user expiration in REAL-TIME when they connect"
echo "2. Apply iptables rules immediately for expired users"
echo "3. Redirect expired users to port 8081 (payment portal)"
echo "4. Block internet access for expired users"
echo "5. Clean up rules when users disconnect"
echo ""
echo "To test the system:"
echo "1. Create a PPPoE user with expiration date in the past"
echo "2. Try to connect with that user"
echo "3. Check /var/log/ajc-pppoe.log for connection logs"
echo "4. Verify the user is redirected to payment portal"
echo ""
echo "Monitor logs with: tail -f /var/log/ajc-pppoe.log"