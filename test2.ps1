# Test 1: Check MongoDB
Write-Host "=== Testing MongoDB connection ==="
$mongoService = Get-Service *mongo* -ErrorAction SilentlyContinue
Write-Host "MongoDB Service Status: $($mongoService.Status)"

# Check port 27017
Write-Host "`n=== MongoDB port check ==="
netstat -ano | findstr :27017

# Test 2: Start backend and capture output
Write-Host "`n=== Killing old node processes ==="
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "`n=== Starting backend with output capture ==="
$output = & node "C:\Users\Kal\Desktop\junkie\Vitalpayroll\backend\dev.js" 2>&1 | Out-String -Timeout 15
Write-Host $output

# Check if port is now listening
Write-Host "`n=== Port check ==="
netstat -ano | findstr :5000
