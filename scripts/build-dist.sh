#!/usr/bin/env bash
# Script to manually build and push to dist branch for local testing

set -e

echo "Building project..."
pnpm run build
chmod +x build/index.js

echo "Creating temporary package.json without lifecycle scripts..."
npx json -I -f package.json \
  -e 'delete this.scripts.build; delete this.scripts.prepare; delete this.scripts.prepack' \
  > package.json.tmp

mv package.json package.json.backup
mv package.json.tmp package.json

echo "Creating dist branch..."
git checkout -B dist
git add -f build/
git add package.json
git commit -m "Build dist branch from $(git rev-parse --short HEAD)"

echo "Pushing to dist branch..."
git push -f origin dist

echo "Restoring original package.json..."
git checkout main
mv package.json.backup package.json

echo "Done! Users can now install with:"
echo "  npm install -g github:nacyot/o3-search-mcp#dist"