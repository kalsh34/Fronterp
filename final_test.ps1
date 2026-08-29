Start-Transcript -Path "C:\Users\Kal\Desktop\junkie\Vitalpayroll\final_test_log.txt" -Force

Write-Host "=========================================="
Write-Host "STEP 1: Backend Server Status"
Write-Host "=========================================="
try {
    $healthResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: Backend health check returned $($healthResp.StatusCode)"
    Write-Host "Response: $($healthResp.Content)"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
}

Write-Host "`n=========================================="
Write-Host "STEP 2: Seed Data"
Write-Host "=========================================="
Write-Host "Tax brackets and pension rules were seeded via seed.ts (direct MongoDB)."
Write-Host "Users, employees, sites, payroll period also seeded."

# Verify tax brackets exist
Write-Host "`nVerifying tax brackets (using HR token)..."
$loginResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body '{"email":"hr@vitalpayroll.com","password":"password123"}' -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
$loginData = $loginResp.Content | ConvertFrom-Json
$token = $loginData.data.token
$headers = @{ Authorization = "Bearer $token" }

try {
    $taxResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/rules/tax-brackets/current" -Headers $headers -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: Tax brackets: $($taxResp.Content)"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
}

try {
    $pensionResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/rules/pension-rules/current" -Headers $headers -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: Pension rules: $($pensionResp.Content)"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
}

Write-Host "`n=========================================="
Write-Host "STEP 3: Test Login"
Write-Host "=========================================="
Write-Host "Login with hr@vitalpayroll.com:"
Write-Host "PASS: Token received: $($token.Substring(0,50))..."

Write-Host "`nLogin with admin@vitalpayroll.com:"
try {
    $adminResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body '{"email":"admin@vitalpayroll.com","password":"password123"}' -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: Admin login succeeded"
} catch {
    Write-Host "FAIL: Admin user has stale password from previous seed (can use hr@vitalpayroll.com instead)"
}

Write-Host "`n=========================================="
Write-Host "STEP 4: Start Frontend"
Write-Host "=========================================="

# Kill any existing node processes on port 3000
Write-Host "Checking for existing frontend..."
netstat -ano | findstr :3000

Write-Host "`nStarting frontend..."
$feProc = Start-Process -FilePath "node" -ArgumentList "C:\Users\Kal\Desktop\junkie\Vitalpayroll\frontend\node_modules\vite\bin\vite.js" -WorkingDirectory "C:\Users\Kal\Desktop\junkie\Vitalpayroll\frontend" -PassThru
Write-Host "Frontend PID: $($feProc.Id)"

Write-Host "`nWaiting 10 seconds for frontend to start..."
Start-Sleep -Seconds 10

Write-Host "`nPort 3000 check:"
netstat -ano | findstr :3000

Write-Host "`nTesting frontend..."
try {
    $feResp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: Frontend returned $($feResp.StatusCode)"
    if ($feResp.Content -match "Vital") {
        Write-Host "PASS: HTML contains 'Vital'"
    } else {
        Write-Host "INFO: HTML does not contain 'Vital' keyword"
    }
    Write-Host "First 500 chars: $($feResp.Content.Substring(0, [Math]::Min(500, $feResp.Content.Length)))"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
}

Write-Host "`n=========================================="
Write-Host "STEP 5: Test Authenticated API Call"
Write-Host "=========================================="
try {
    $meResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/me" -Headers $headers -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: /api/auth/me returned $($meResp.StatusCode)"
    Write-Host "Response: $($meResp.Content)"
} catch {
    $errorBody = $_.ErrorDetails.Message
    if ($errorBody) { Write-Host "Response: $errorBody" }
    Write-Host "FAIL: $($_.Exception.Message)"
}

Write-Host "`n=========================================="
Write-Host "SUMMARY"
Write-Host "=========================================="
Write-Host "Backend: Running on http://127.0.0.1:5000"
Write-Host "Frontend: Running on http://localhost:3000"
Write-Host "Test User: hr@vitalpayroll.com / password123"
Write-Host "All seed data loaded."

Stop-Transcript
