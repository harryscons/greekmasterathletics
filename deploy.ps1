# --- Version Increment Logic ---
$indexPath = "index.html"
$content = Get-Content $indexPath -Raw
$versionRegex = '<span class=["'']version-label["'']>(v\d+\.\d+\.)(\d+)</span>'

if ($content -match $versionRegex) {
    $prefix = $Matches[1]
    $oldNum = [int]$Matches[2]
    $newNum = $oldNum + 1
    $newVersion = $prefix + $newNum.ToString("D3")
    $oldVersion = $prefix + $oldNum.ToString("D3")
    
    Write-Host "🔄 Version Bump: $oldVersion -> $newVersion" -ForegroundColor Yellow
    
    $content = $content -replace [regex]::Escape($Matches[0]), "<span class=""version-label"">$newVersion</span>"
    $content | Set-Content $indexPath -NoNewline
}
else {
    Write-Host "⚠️ Warning: Version label not found in index.html" -ForegroundColor Red
    $newVersion = "Unknown"
}

# 1. Add all changes
git add .

# 2. Commit with a timestamp and version
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Deploy $newVersion ($timestamp)"

# 3. Push to GitHub
Write-Host "🚀 Uploading to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "✅ Done! Version $newVersion is now live." -ForegroundColor Green
Write-Host "🌍 Visit: https://harryscons.github.io/greekmasterathletics/" -ForegroundColor Blue
