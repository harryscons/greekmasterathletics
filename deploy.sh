#!/bin/bash

# 1. Add all changes
git add .

# 2. Commit with a timestamp
timestamp=$(date "+%Y-%m-%d %H:%M:%S")
git commit -m "Update: $timestamp"

# 3. Push to GitHub
echo "🚀 Uploading to GitHub..."
git push origin main

echo "✅ Done! Your changes are live."
echo "🌍 Visit: https://harryscons.github.io/greekmasterathletics/"
