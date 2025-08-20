#!/bin/bash
# PaperLens Quick Start Script
set -e  # Exit on error

echo "🔬 PaperLens - AI-Powered Arxiv Paper Reader"
echo "=============================================="
echo

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "   Please install Python 3 and try again."
    exit 1
fi

echo "🔧 Building PaperLens..."
npx tsc

# Start the server
echo "🚀 Starting development server..."
echo "   📁 Directory: $(pwd)"
echo "   🌐 URL: http://localhost:8000"
echo
echo "🛑 Press Ctrl+C to stop the server"
echo "=============================================="
echo

# Run the server
python3 -m http.server 8000