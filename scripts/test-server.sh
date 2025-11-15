#!/bin/bash
# Test server startup (without actually starting it)
# This verifies the code compiles and basic checks pass

echo "🧪 Testing Slack VA server setup..."
echo ""

cd "$(dirname "$0")/.." || exit 1

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env file not found!"
  echo "   Run: cp .env.example .env"
  echo "   Then fill in with op:// references"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "❌ Dependencies not installed!"
  echo "   Run: npm install"
  exit 1
fi

# Test TypeScript compilation
echo "📦 Testing TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
  echo "✅ TypeScript compiles successfully"
else
  echo "❌ TypeScript compilation failed"
  echo "   Run: npm run build"
  exit 1
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ Build output not found!"
  exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "🚀 To start the server:"
echo "   npm run dev"
echo ""
echo "🔍 To verify environment variables:"
echo "   ./scripts/verify-env.sh"

