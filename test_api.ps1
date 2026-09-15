# Check if node processes are running
Write-Host "=== Checking node processes ==="
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime

# Check if port 5000 is listening
Write-Host "`n=== Checking port 5000 ==="
netstat -ano | findstr :5000

# Kill old node processes and restart
Write-Host "`n=== Killing old node processes ==="
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start backend
Write-Host "`n=== Starting backend ==="
$backendProc = Start-Process -FilePath "node" -ArgumentList "dev.js" -WorkingDirectory "C:\Users\dagmaros\Desktop\kal_erp\backend" -PassThru
Write-Host "Backend PID: $($backendProc.Id)"

# Wait for server to start
Write-Host "`n=== Waiting 12 seconds ==="
Start-Sleep -Seconds 12

# Check port
Write-Host "`n=== Port check ==="
netstat -ano | findstr :5000

# Test health
Write-Host "`n=== Testing health ==="
try {
    $result = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -TimeoutSec 10
    Write-Host "Health: $($result | ConvertTo-Json -Compress)"
} catch {
    Write-Host "Health error: $($_.Exception.Message)"
}

# Test auth login
Write-Host "`n=== Testing login ==="
$body = '{"email":"admin@vitalpayroll.com","password":"password123"}'
try {
    $loginResult = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "Login: $($loginResult | ConvertTo-Json -Compress -Depth 5)"
} catch {
    Write-Host "Login error: $($_.Exception.Message)"
}
