# 1. Add all changes
git add .

# 2. Commit with a timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Update: $timestamp"

# 3. Push to GitHub
Write-Host "🚀 Uploading to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "✅ Done! Your changes are live." -ForegroundColor Green
Write-Host "🌍 Visit: https://harryscons.github.io/greekmasterathletics/" -ForegroundColor Blue
