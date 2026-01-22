#!/bin/bash
# Simple script to start a local web server for the frontend

echo "Starting local web server..."
echo "Frontend will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first
if command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    python3 -m http.server 8000
# Fall back to Python 2
elif command -v python &> /dev/null; then
    echo "Using Python 2..."
    python -m SimpleHTTPServer 8000
# Try Node.js http-server
elif command -v http-server &> /dev/null; then
    echo "Using Node.js http-server..."
    http-server -p 8000
else
    echo "Error: No suitable web server found!"
    echo "Please install one of the following:"
    echo "  - Python 3: apt-get install python3"
    echo "  - Node.js http-server: npm install -g http-server"
    exit 1
fi
