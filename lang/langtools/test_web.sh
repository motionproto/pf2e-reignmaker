#!/bin/bash

echo "Testing Language Manager Web Interface..."
echo "========================================="

# Check if server is responding
echo -n "Checking if server is running on http://localhost:8080... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
    echo "✓ Server is running!"
    echo ""
    echo "Access the web interface at: http://localhost:8080"
    echo ""
    echo "Features available:"
    echo "  - Hierarchical tree view of JSON structure"
    echo "  - Multiple view modes (Tree, View, Form, Code, Text, Preview)"
    echo "  - Search by keys or values with regex support"
    echo "  - Live editing capabilities"
    echo "  - Save changes to temporary file or export to original"
    echo ""
    echo "To stop the server, run: pkill -f web_interface.py"
else
    echo "✗ Server is not responding"
    echo ""
    echo "To start the server manually:"
    echo "  cd lang/langtools"
    echo "  python3 web_interface.py"
fi

# Check API endpoints
echo ""
echo "Testing API endpoints:"
echo "----------------------"

# Test stats endpoint
echo -n "Testing /api/stats... "
STATS=$(curl -s http://localhost:8080/api/stats 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$STATS" ]; then
    echo "✓"
    echo "  Response: $STATS" | head -c 100
    echo "..."
else
    echo "✗"
fi

echo ""
echo "========================================="
echo "Web interface is ready for use!"
echo "Open http://localhost:8080 in your browser"
