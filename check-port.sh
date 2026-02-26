#!/bin/bash

PORT=${1:-5000}

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Port $PORT is in use by:"
    lsof -i :$PORT
    echo ""
    echo "Kill the process with: kill -9 $(lsof -ti:$PORT)"
    echo "Or use a different port: PORT=$((PORT+1)) npm run dev"
    exit 1
else
    echo "✅ Port $PORT is available"
    exit 0
fi
