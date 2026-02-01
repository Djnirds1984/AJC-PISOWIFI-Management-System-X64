#!/bin/bash
# Test script to verify PPPoE hook fix for expired users

echo "=== Testing PPPoE Hook Fix ==="
echo ""

# Test the API endpoint directly
echo "1. Testing API endpoint for expired user..."
curl -s "http://localhost:80/api/pppoe/check-expiration?username=aldrin&ip=192.168.1.100"
echo ""
echo ""

# Test with non-existent user
echo "2. Testing API endpoint for non-existent user..."
curl -s "http://localhost:80/api/pppoe/check-expiration?username=nonexistent&ip=192.168.1.101"
echo ""
echo ""

# Test without username
echo "3. Testing API endpoint without username..."
curl -s "http://localhost:80/api/pppoe/check-expiration?ip=192.168.1.102"
echo ""
echo ""

# Check if server is running
echo "4. Checking if server is running..."
if curl -s --max-time 2 "http://localhost:80/api/pppoe/check-expiration" > /dev/null; then
    echo "✓ Server is responding"
else
    echo "✗ Server is not responding"
fi
echo ""

echo "=== Test Complete ==="
echo ""
echo "Expected results:"
echo "- Expired user (aldrin): Should return {\"action\":\"allow\"}"
echo "- Non-existent user: Should return {\"action\":\"allow\"}"
echo "- No username: Should return {\"action\":\"allow\"}"
echo ""
echo "The fix ensures that expired users can connect to PPPoE"
echo "but will be redirected to the captive portal (port 8081)"
echo "and have restricted internet access."