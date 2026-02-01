#!/bin/bash
# Test script to verify captive portal redirection is working correctly

echo "=== Testing Captive Portal Redirection ==="
echo ""

# Test IP that should be redirected (use the correct IP from your logs)
TEST_IP="185.15.0.11"

echo "Testing with IP: $TEST_IP"
echo ""

# Check if iptables rules are in place
echo "1. Checking iptables rules for $TEST_IP:"
echo "   NAT redirection rules:"
iptables -t nat -L PREROUTING -n | grep "$TEST_IP" || echo "   No NAT rules found"
echo ""
echo "   FORWARD rules:"
iptables -L FORWARD -n | grep "$TEST_IP" || echo "   No FORWARD rules found"
echo ""

# Test HTTP redirection
echo "2. Testing HTTP redirection:"
echo "   This would normally redirect to http://localhost:8081"
echo "   Try accessing any HTTP site from the client to test"
echo ""

# Check if portal is running
echo "3. Checking if captive portal is accessible:"
curl -s -I http://localhost:8081 | head -1
echo ""

# Test portal content
echo "4. Testing portal content:"
curl -s http://localhost:8081 | grep -o '<title>.*</title>' || echo "Portal not responding"
echo ""

echo "=== Manual Testing Instructions ==="
echo "1. Connect a PPPoE client that should be expired"
echo "2. Try to access any HTTP website (e.g., http://example.com)"
echo "3. You should see the 'Service Suspended' page instead"
echo "4. Check /var/log/ajc-pppoe.log for IP detection messages"
echo ""
echo "Expected behavior:"
echo "- Client connects to PPPoE (no immediate disconnection)"
echo "- HTTP requests redirect to captive portal on port 8081"
echo "- Portal shows 'Service Suspended' message"
echo "- DNS still works (for portal resolution)"
echo "- HTTPS is blocked (to prevent bypass)"