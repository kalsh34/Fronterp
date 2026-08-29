Start-Transcript -Path "C:\Users\Kal\Desktop\junkie\Vitalpayroll\full_test_log.txt" -Force

# =====================================================
# STEP 1: Backend is already running (PID 1156)
# =====================================================
Write-Host "=========================================="
Write-Host "STEP 1: Backend Server Status"
Write-Host "=========================================="

Write-Host "`nChecking if backend PID 1156 is running..."
$proc = Get-Process -Id 1156 -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "SUCCESS: Backend process 1156 is running"
} else {
    Write-Host "FAILED: Backend process 1156 is not running"
    Write-Host "Restarting backend..."
    $proc = Start-Process -FilePath "node" -ArgumentList "dev.js" -WorkingDirectory "C:\Users\Kal\Desktop\junkie\Vitalpayroll\backend" -PassThru
    Write-Host "Waiting 25 seconds for startup..."
    Start-Sleep -Seconds 25
    Write-Host "New PID: $($proc.Id)"
}

Write-Host "`nTesting health endpoint..."
try {
    $healthResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "SUCCESS: Health check returned $($healthResp.StatusCode)"
    Write-Host "Response: $($healthResp.Content)"
} catch {
    Write-Host "FAILED: $($_.Exception.Message)"
}

# =====================================================
# STEP 2: Seed Data
# =====================================================
Write-Host "`n=========================================="
Write-Host "STEP 2: Seed Data"
Write-Host "=========================================="

# 2a: Tax brackets
Write-Host "`n--- Seeding Tax Brackets ---"
$taxBody = '{"label":"Ethiopian Income Tax - Current","brackets":[{"min":0,"max":2000,"rate":0,"deduction":0},{"min":2001,"max":4000,"rate":0.15,"deduction":300},{"min":4001,"max":7000,"rate":0.20,"deduction":500},{"min":7001,"max":10000,"rate":0.25,"deduction":850},{"min":10001,"max":14000,"rate":0.30,"deduction":1350},{"min":14001,"max":null,"rate":0.35,"deduction":2050}],"effectiveFrom":"2024-01-01","isCurrent":true}'
try {
    $taxResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/rules/tax-brackets" -Method POST -Body $taxBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "SUCCESS: Tax brackets seeded - Status $($taxResp.StatusCode)"
    Write-Host "Response: $($taxResp.Content)"
} catch {
    $errorBody = $_.ErrorDetails.Message
    if ($errorBody) {
        Write-Host "Response: $errorBody"
    }
    Write-Host "FAILED: $($_.Exception.Message)"
}

# 2b: Pension rules
Write-Host "`n--- Seeding Pension Rules ---"
$pensionBody = '{"label":"Ethiopian Pension - Current","employeeRate":0.07,"employerRate":0.11,"effectiveFrom":"2024-01-01","isCurrent":true}'
try {
    $pensionResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/rules/pension-rules" -Method POST -Body $pensionBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "SUCCESS: Pension rules seeded - Status $($pensionResp.StatusCode)"
    Write-Host "Response: $($pensionResp.Content)"
} catch {
    $errorBody = $_.ErrorDetails.Message
    if ($errorBody) {
        Write-Host "Response: $errorBody"
    }
    Write-Host "FAILED: $($_.Exception.Message)"
}

# 2c: Run seed.ts from the backend directory
Write-Host "`n--- Running seed.ts ---"
Set-Location "C:\Users\Kal\Desktop\junkie\Vitalpayroll\backend"
$seedResult = cmd /c "node -e `"require('ts-node').register({transpileOnly:true,project:'./tsconfig.json'});require('./src/seed.ts');`"" 2>&1
Write-Host "Seed output:"
$seedResult | ForEach-Object { Write-Host $_ }

# =====================================================
# STEP 3: Test Login
# =====================================================
Write-Host "`n=========================================="
Write-Host "STEP 3: Test Login"
Write-Host "=========================================="

$loginBody = '{"email":"admin@vitalpayroll.com","password":"password123"}'
try {
    $loginResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "SUCCESS: Login returned $($loginResp.StatusCode)"
    Write-Host "Response: $($loginResp.Content)"
    
    $loginData = $loginResp.Content | ConvertFrom-Json
    if ($loginData.token) {
        $token = $loginData.token
        Write-Host "TOKEN: $token"
    }
} catch {
    $errorBody = $_.ErrorDetails.Message
    if ($errorBody) {
        Write-Host "Response: $errorBody"
    }
    Write-Host "FAILED: $($_.Exception.Message)"
}

# =====================================================
# STEP 5: Test Authenticated API Call (do this before frontend)
# =====================================================
Write-Host "`n=========================================="
Write-Host "STEP 5: Test Authenticated API Call"
Write-Host "=========================================="

if ($token) {
    Write-Host "Using token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."
    $headers = @{ Authorization = "Bearer $token" }
    try {
        $meResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/me" -Headers $headers -UseBasicParsing -TimeoutSec 10
        Write-Host "SUCCESS: /api/auth/me returned $($meResp.StatusCode)"
        Write-Host "Response: $($meResp.Content)"
    } catch {
        $errorBody = $_.ErrorDetails.Message
        if ($errorBody) {
            Write-Host "Response: $errorBody"
        }
        Write-Host "FAILED: $($_.Exception.Message)"
    }
} else {
    Write-Host "SKIPPED: No token available from login"
}

Stop-Transcript
