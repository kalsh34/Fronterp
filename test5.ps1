Start-Transcript -Path "C:\Users\Kal\Desktop\junkie\Vitalpayroll\test5_log.txt" -Force

# Try logging in with HR user (was freshly created)
Write-Host "=== Try login with hr@vitalpayroll.com ==="
$loginBody = '{"email":"hr@vitalpayroll.com","password":"password123"}'
try {
    $loginResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "SUCCESS: Login returned $($loginResp.StatusCode)"
    Write-Host "Response: $($loginResp.Content)"
    
    $loginData = $loginResp.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "Token: $token"
} catch {
    $errorBody = $_.ErrorDetails.Message
    if ($errorBody) {
        Write-Host "Response: $errorBody"
    }
    Write-Host "FAILED: $($_.Exception.Message)"
}

# Also try admin
Write-Host "`n=== Try login with admin ==="
$loginBody2 = '{"email":"admin@vitalpayroll.com","password":"password123"}'
try {
    $loginResp2 = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body $loginBody2 -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "SUCCESS: Login returned $($loginResp2.StatusCode)"
    Write-Host "Response: $($loginResp2.Content)"
} catch {
    $errorBody = $_.ErrorDetails.Message
    if ($errorBody) {
        Write-Host "Response: $errorBody"
    }
    Write-Host "FAILED: $($_.Exception.Message)"
}

# Try login with site user
Write-Host "`n=== Try login with site@vitalpayroll.com ==="
$loginBody3 = '{"email":"site@vitalpayroll.com","password":"password123"}'
try {
    $loginResp3 = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/login" -Method POST -Body $loginBody3 -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "SUCCESS: Login returned $($loginResp3.StatusCode)"
    Write-Host "Response: $($loginResp3.Content)"
    
    $loginData3 = $loginResp3.Content | ConvertFrom-Json
    $token3 = $loginData3.data.token
    Write-Host "Token from site user: $token3"
} catch {
    $errorBody = $_.ErrorDetails.Message
    if ($errorBody) {
        Write-Host "Response: $errorBody"
    }
    Write-Host "FAILED: $($_.Exception.Message)"
}

# Test authenticated call with whatever token we got
Write-Host "`n=== Test authenticated API call ==="
$useToken = $token
if (-not $useToken -and $token3) { $useToken = $token3 }
if ($useToken) {
    $headers = @{ Authorization = "Bearer $useToken" }
    try {
        $meResp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/auth/me" -Headers $headers -UseBasicParsing -TimeoutSec 10
        Write-Host "SUCCESS: /api/auth/me returned $($meResp.StatusCode)"
        Write-Host "Response: $($meResp.Content)"
    } catch {
        $errorBody = $_.ErrorDetails.Message
        if ($errorBody) { Write-Host "Response: $errorBody" }
        Write-Host "FAILED: $($_.Exception.Message)"
    }
} else {
    Write-Host "No token available"
}

Stop-Transcript
