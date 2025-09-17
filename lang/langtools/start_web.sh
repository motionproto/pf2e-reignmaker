#!/bin/bash

echo "Starting Language Manager Web Interface..."
echo "========================================="

# Kill any existing instance
pkill -f web_interface.py 2>/dev/null

# Start the server
cd "$(dirname "$0")"
python3 web_interface.py &

echo ""
echo "Server is starting on port 8080..."
echo ""
echo "Please wait a moment and then open:"
echo "  http://localhost:8080"
echo ""
echo "To stop the server, run:"
echo "  pkill -f web_interface.py"
echo ""
echo "========================================="
