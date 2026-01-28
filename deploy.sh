#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --production

# Install and build frontend
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm ci
echo "🏗️ Building frontend..."
npm run build

echo "✅ Deployment complete!"
