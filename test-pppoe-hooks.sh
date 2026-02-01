#!/bin/bash
# AJC PPPoE Real-time Expiration System Test Script
# This script tests the real-time expiration checking

echo "=== AJC PPPoE Real-time Expiration System Test ==="
echo ""

# Test the API endpoint
echo "1. Testing API endpoint..."
curl -s "http://localhost:80/api/pppoe/check-expiration?username=testuser&ip=192.168.1.100" || echo "API test failed"
echo ""

# Check if hooks are installed
echo "2. Checking if PPPoE hooks are installed..."
if [ -x "/etc/ppp/ip-up.local" ]; then
    echo "✓ ip-up.local is installed and executable"
else
    echo "✗ ip-up.local is missing or not executable"
fi

if [ -x "/etc/ppp/ip-down.local" ]; then
    echo "✓ ip-down.local is installed and executable"
else
    echo "✗ ip-down.local is missing or not executable"
fi
echo ""

# Check recent logs
echo "3. Recent PPPoE logs:"
if [ -f "/var/log/ajc-pppoe.log" ]; then
    echo "--- Last 10 log entries ---"
    tail -10 /var/log/ajc-pppoe.log 2>/dev/null || echo "No logs yet"
else
    echo "No log file found"
fi
echo ""

# Check iptables rules
echo "4. Current iptables rules for PPPoE redirection:"
sudo iptables -t nat -L PREROUTING -n --line-numbers | grep 8081 || echo "No redirect rules found"
echo ""

echo "5. Current iptables blocking rules:"
sudo iptables -L FORWARD -n --line-numbers | grep DROP || echo "No blocking rules found"
echo ""

echo "=== Test Complete ==="
echo ""
echo "To fully test the system:"
echo "1. Create a PPPoE user with expiration date in the past"
echo "2. Try to connect with that user"
echo "3. Monitor logs: tail -f /var/log/ajc-pppoe.log"
echo "4. Check if user gets redirected to payment portal"