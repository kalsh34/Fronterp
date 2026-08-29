Start-Transcript -Path "C:\Users\Kal\Desktop\junkie\Vitalpayroll\backend_log.txt" -Force

Write-Host "=== Starting backend ==="
$proc = Start-Process -FilePath "node" -ArgumentList "dev.js" -WorkingDirectory "C:\Users\Kal\Desktop\junkie\Vitalpayroll\backend" -PassThru
Write-Host "PID: $($proc.Id)"

Write-Host "`n=== Waiting 15 seconds ==="
Start-Sleep -Seconds 15

Write-Host "`n=== Port 5000 check ==="
netstat -ano | findstr :5000

Write-Host "`n=== Testing health ==="
try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Body: $($resp.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host "`n=== Seeding tax brackets ==="
$taxBody = '{"label":"Ethiopian Income Tax - Current","brackets":[{"min":0,"max":2000,"rate":0,"deduction":0},{"min":2001,"max":4000,"rate":0.15,"deduction":300},{"min":4001,"max":7000,"rate":0.20,"deduction":500},{"min":7001,"max":10000,"rate":0.25,"deduction":850},{"min":10001,"max":14000,"rate":0.30,"deduction":1350},{"min":14001,"max":null,"rate":0.35,"deduction":2050}],"effectiveFrom":"2024-01-01","isCurrent":true}'
try {
    $taxResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/rules/tax-brackets" -Method POST -Body $taxBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "Tax Status: $($taxResp.StatusCode)"
    Write-Host "Tax Body: $($taxResp.Content)"
} catch {
    Write-Host "Tax Error: $($_.Exception.Message)"
}

Write-Host "`n=== Seeding pension rules ==="
$pensionBody = '{"label":"Ethiopian Pension - Current","employeeRate":0.07,"employerRate":0.11,"effectiveFrom":"2024-01-01","isCurrent":true}'
try {
    $pensionResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/rules/pension-rules" -Method POST -Body $pensionBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "Pension Status: $($pensionResp.StatusCode)"
    Write-Host "Pension Body: $($pensionResp.Content)"
} catch {
    Write-Host "Pension Error: $($_.Exception.Message)"
}

Write-Host "`n=== Running seed.ts ==="
try {
    $seedOutput = & node -e "require('ts-node').register({transpileOnly:true,project:'./tsconfig.json'});require('./src/seed.ts');" 2>&1
    Write-Host "Seed output:"
    $seedOutput | ForEach-Object { Write-Host $_ }
} catch {
    Write-Host "Seed Error: $($_.Exception.Message)"
}

Write-Host "`n=== Testing login ==="
$loginBody = '{"email":"admin@vitalpayroll.com","password":"password123"}'
try {
    $loginResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "Login Status: $($loginResp.StatusCode)"
    Write-Host "Login Body: $($loginResp.Content)"
} catch {
    Write-Host "Login Error: $($_.Exception.Message)"
}

Stop-Transcript
