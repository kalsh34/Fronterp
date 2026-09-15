$base = "http://localhost:5000/api"
$headers = @{ "Content-Type" = "application/json" }

function Log($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function OK($msg) { Write-Host "  OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red }
function Info($msg) { Write-Host "  $msg" -ForegroundColor Gray }
function Val($label, $val) { Write-Host "  $label = $val" -ForegroundColor Yellow }

Log "STEP 1: Authenticate as SUPER_ADMIN"
$loginBody = @{ email = "admin@vitalpayroll.com"; password = "password123" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -Headers $headers
$token = $loginRes.data.token
$headers["Authorization"] = "Bearer $token"
OK "Logged in. Token acquired."
Val "User" "$($loginRes.data.user.firstName) $($loginRes.data.user.lastName) ($($loginRes.data.user.role))"

Log "STEP 2: Fetch seeded data"
# Salary Structures
$structsRes = Invoke-RestMethod -Uri "$base/salary-structures" -Headers $headers
$structs = $structsRes.data
$guardStruct = $structs | Where-Object { $_.employeeType -eq "GUARD" } | Select-Object -First 1
$staffStruct = $structs | Where-Object { $_.employeeType -eq "STAFF" } | Select-Object -First 1
OK "Salary structures loaded: $($structs.Count) total"
Val "Guard Structure" "$($guardStruct.name) (v$($guardStruct.version))"
Val "Staff Structure" "$($staffStruct.name) (v$($staffStruct.version))"
Val "Guard OT Multiplier" $guardStruct.otMultiplier
Val "Guard Holiday Multiplier" $guardStruct.holidayMultiplier

# Payroll Period
$periodsRes = Invoke-RestMethod -Uri "$base/finance/periods" -Headers $headers
$period = $periodsRes.data | Where-Object { $_.status -eq "OPEN" } | Select-Object -First 1
if (-not $period) { $period = $periodsRes.data | Select-Object -First 1 }
OK "Payroll period loaded"
Val "Period" "$($period.year)-$($period.month) ($($period.status))"
Val "Start" $period.startDate
Val "End" $period.endDate
$periodId = $period._id

# Employees
$empsRes = Invoke-RestMethod -Uri "$base/employees?limit=200" -Headers $headers
$emps = $empsRes.data
$guard = $emps | Where-Object { $_.category -eq "GUARD" } | Select-Object -First 1
$staffList = $emps | Where-Object { $_.category -eq "OFFICE_STAFF" }
OK "Employees loaded: $($emps.Count) total"
Val "Guard" "$($guard.firstName) $($guard.lastName) ($($guard.employeeCode)) - Status: $($guard.status)"
foreach ($s in $staffList) {
  Val "Staff" "$($s.firstName) $($s.lastName) ($($s.employeeCode)) - Status: $($s.status)"
}

Log "STEP 3: Create Contract for GUARD ($($guard.employeeCode))"
$guardWage = 12000
$guardContractBody = @{
  employeeId = $guard._id
  salaryStructureId = $guardStruct._id
  contractStartDate = "2024-01-01"
  contractType = "Full-Time"
  wage = $guardWage
  responsibilityAllowance = 0
  teleAllowance = 0
  taxableTransport = 0
  nonTaxableAllowance = 500
  transportAllowance = 800
  pensionEnrolled = $true
  notes = "E2E test contract for guard"
} | ConvertTo-Json

try {
  $existingGuardContract = Invoke-RestMethod -Uri "$base/contracts/employee/$($guard._id)" -Headers $headers -ErrorAction SilentlyContinue
  if ($existingGuardContract.data) {
    $guardContract = Invoke-RestMethod -Uri "$base/contracts/$($existingGuardContract.data._id)" -Method PUT -Body $guardContractBody -Headers $headers
    OK "Updated existing guard contract: $($guardContract.data._id)"
  } else {
    throw "no contract"
  }
} catch {
  $guardContract = Invoke-RestMethod -Uri "$base/contracts" -Method POST -Body $guardContractBody -Headers $headers
  OK "Created guard contract: $($guardContract.data._id)"
}
Val "Wage" "$guardWage ETB/month"
Val "Hourly Rate" "$([math]::Round($guardWage / 720, 2)) ETB/hr (wage / 720)"
Val "OT Rate" "$([math]::Round($guardWage / 720 * 1.5, 2)) ETB/hr (hourly * 1.5)"
Val "Holiday Rate" "$([math]::Round($guardWage / 720 * 2, 2)) ETB/hr (hourly * 2.0)"
Val "Salary Structure" $guardStruct.name
Val "Non-Taxable Allowance" "500 ETB"
Val "Transport Allowance" "800 ETB"

Log "STEP 4: Create Contracts for STAFF"
$staffContracts = @()
foreach ($s in $staffList) {
  $staffWage = 25000
  $staffBody = @{
    employeeId = $s._id
    salaryStructureId = $staffStruct._id
    contractStartDate = "2024-01-01"
    contractType = "Full-Time"
    wage = $staffWage
    responsibilityAllowance = 3000
    teleAllowance = 500
    taxableTransport = 1000
    nonTaxableAllowance = 1500
    pensionEnrolled = $true
    notes = "E2E test contract for staff"
  } | ConvertTo-Json

  try {
    $existingStaffContract = Invoke-RestMethod -Uri "$base/contracts/employee/$($s._id)" -Headers $headers -ErrorAction SilentlyContinue
    if ($existingStaffContract.data) {
      $sc = Invoke-RestMethod -Uri "$base/contracts/$($existingStaffContract.data._id)" -Method PUT -Body $staffBody -Headers $headers
      OK "Updated contract for $($s.employeeCode): $($sc.data._id)"
    } else {
      throw "no contract"
    }
  } catch {
    $sc = Invoke-RestMethod -Uri "$base/contracts" -Method POST -Body $staffBody -Headers $headers
    OK "Created contract for $($s.employeeCode): $($sc.data._id)"
  }
  $staffContracts += $sc.data
  Val "  $($s.employeeCode) Wage" "$staffWage ETB/month"
  Val "  $($s.employeeCode) Responsibility" "3000 ETB"
  Val "  $($s.employeeCode) Tele" "500 ETB"
  Val "  $($s.employeeCode) Taxable Transport" "1000 ETB"
  Val "  $($s.employeeCode) Non-Taxable" "1500 ETB"
}

Log "STEP 5: Generate GUARD Payroll"
$guardGenRes = Invoke-RestMethod -Uri "$base/guard-payroll/generate/$periodId" -Method POST -Headers $headers
$guardRecords = $guardGenRes.data
$skipped = $guardGenRes.skipped
OK "Guard payroll generated: $($guardRecords.Count) records created"
if ($skipped.Count -gt 0) {
  foreach ($sk in $skipped) { Info "  Skipped: $($sk.employeeCode) - $($sk.reason)" }
}
foreach ($r in $guardRecords) {
  Val "Record" "$($r._id) | Guard: $($r.guardId) | Status: $($r.status)"
  Val "  Normal Hours" $r.normalHours
  Val "  Holiday Hours" $r.holidayHours
  Val "  Normal Rate" "$($r.normalRate) ETB/hr"
  Val "  OT Rate" "$($r.otRate) ETB/hr"
  Val "  Holiday Rate" "$($r.holidayRate) ETB/hr"
  Val "  Standard Monthly Hours" $r.standardMonthlyHours
  Val "  Normal Salary" "$($r.standardMonthlyHours * $r.normalRate) ETB (standardHours * normalRate)"
}

Log "STEP 6: Submit GUARD Payroll Record"
$guardRecord = $guardRecords | Select-Object -First 1
$submitRes = Invoke-RestMethod -Uri "$base/guard-payroll/$($guardRecord._id)/submit" -Method POST -Headers $headers
OK "Guard record submitted: Status -> $($submitRes.data.status)"

Log "STEP 7: Calculate GUARD Payroll"
$calcRes = Invoke-RestMethod -Uri "$base/guard-payroll/$($guardRecord._id)/calculate" -Method POST -Headers $headers
$calc = $calcRes.data
OK "Guard payroll calculated: Status -> $($calc.status)"
Write-Host ""
Write-Host "  ============================================" -ForegroundColor White
Write-Host "  GUARD PAYROLL RESULT - $($guard.employeeCode)" -ForegroundColor White
Write-Host "  ============================================" -ForegroundColor White
Val "Guard" "$($guard.firstName) $($guard.lastName)"
Val "Period" "$($period.year)-$($period.month)"
Val "Normal Hours Worked" $calc.normalHours
Val "Holiday Hours" $calc.holidayHours
Val "OT Hours" $calc.otHours
Val "Standard Monthly Hours" $calc.standardMonthlyHours
Write-Host ""
Write-Host "  --- EARNINGS ---" -ForegroundColor Magenta
Val "Normal Salary (std)" "$($calc.standardMonthlyHours) * $($calc.normalRate) = $($calc.standardMonthlyHours * $calc.normalRate) ETB"
Val "Worked Salary" "$($calc.normalHours) * $($calc.normalRate) = $($calc.normalHours * $calc.normalRate) ETB"
Val "OT Pay" "$($calc.otHours) * $($calc.otRate) = $($calc.otHours * $calc.otRate) ETB"
Val "Holiday Pay" "$($calc.holidayHours) * $($calc.holidayRate) = $($calc.holidayHours * $calc.holidayRate) ETB"
Val "Secondary Shift Pay" "$($calc.secondaryShiftPay) ETB"
Val "GROSS PAY" "$($calc.grossPay) ETB"
Write-Host ""
Write-Host "  --- DEDUCTIONS ---" -ForegroundColor Magenta
Val "Income Tax" "$($calc.incomeTax) ETB"
Val "Employee Pension (7%)" "$($calc.employeePension) ETB"
Val "Employer Pension (11%)" "$($calc.employerPension) ETB"
Val "Loan Deduction" "$($calc.loanDeduction) ETB"
Val "Total Deductions" "$($calc.totalDeductions) ETB"
Write-Host ""
Write-Host "  --- NET PAY ---" -ForegroundColor Green
Val "NET PAY" "$($calc.netPay) ETB"
Write-Host "  ============================================" -ForegroundColor White

Log "STEP 8: Create STAFF Attendance for current period"
$today = Get-Date
$year = $today.Year
$month = $today.Month
$daysInMonth = [datetime]::DaysInMonth($year, $month)
foreach ($s in $staffList) {
  # Mark 20 days as PRESENT, 1 as ABSENT, 1 as HALF_DAY, rest as rest day (no record needed)
  for ($d = 1; $d -le [math]::Min($daysInMonth, 22); $d++) {
    $dateStr = "{0}-{1:D2}-{2:D2}" -f $year, $month, $d
    $status = "PRESENT"
    if ($d -eq 21) { $status = "ABSENT" }
    elseif ($d -eq 22) { $status = "HALF_DAY" }

    $attBody = @{
      employeeId = $s._id
      date = $dateStr
      status = $status
      notes = "E2E test attendance"
    } | ConvertTo-Json

    try {
      Invoke-RestMethod -Uri "$base/staff-attendance/day" -Method POST -Body $attBody -Headers $headers -ErrorAction Stop | Out-Null
    } catch {
      # Day may already exist, try update
    }
  }
  OK "Staff attendance created for $($s.employeeCode): 20 PRESENT, 1 ABSENT, 1 HALF_DAY"
}
Info "  Expected deductible days: 1 ABSENT + 0.5 HALF_DAY = 1.5 days"
Info "  Expected daily rate: 25000 / 22 = $([math]::Round(25000/22, 2)) ETB"
Info "  Expected attendance deduction: 1.5 * $([math]::Round(25000/22, 2)) = $([math]::Round(1.5 * 25000/22, 2)) ETB"

Log "STEP 9: Lock Staff Attendance Period"
$lockBody = @{
  year = $year
  month = $month
  reason = "E2E test - locking for payroll generation"
} | ConvertTo-Json
try {
  $lockRes = Invoke-RestMethod -Uri "$base/staff-attendance/lock" -Method POST -Body $lockBody -Headers $headers
  OK "Staff attendance period locked"
} catch {
  Info "Period may already be locked: $($_.Exception.Message)"
}

Log "STEP 10: Generate STAFF Payroll"
$staffGenRes = Invoke-RestMethod -Uri "$base/office-payroll/generate/$periodId" -Method POST -Headers $headers
$staffRecords = $staffGenRes.data
$staffSkipped = $staffGenRes.skipped
OK "Staff payroll generated: $($staffRecords.Count) records created"
if ($staffSkipped.Count -gt 0) {
  foreach ($sk in $staffSkipped) { Info "  Skipped: $($sk.employeeCode) - $($sk.reason)" }
}

Log "STEP 11: Calculate STAFF Payroll"
foreach ($sr in $staffRecords) {
  $empInfo = $staffList | Where-Object { $_._id -eq $sr.employeeId }
  $empCode = if ($empInfo) { $empInfo.employeeCode } else { $sr.employeeId }

  $sCalcRes = Invoke-RestMethod -Uri "$base/office-payroll/$($sr._id)/calculate" -Method POST -Headers $headers
  $sc = $sCalcRes.data

  Write-Host ""
  Write-Host "  ============================================" -ForegroundColor White
  Write-Host "  STAFF PAYROLL RESULT - $empCode" -ForegroundColor White
  Write-Host "  ============================================" -ForegroundColor White
  Val "Employee" $empCode
  Val "Period" "$($period.year)-$($period.month)"
  Write-Host ""
  Write-Host "  --- EARNINGS ---" -ForegroundColor Magenta
  Val "Basic Salary" "$($sc.basicSalary) ETB (after attendance deduction)"
  Val "Responsibility Allowance" "$($sc.responsibilityAllowance) ETB"
  Val "Tele Allowance" "$($sc.teleAllowance) ETB"
  Val "Taxable Transport" "$($sc.taxableTransport) ETB"
  Val "Non-Taxable Transport" "$($sc.nonTaxableTransport) ETB"
  Val "Overtime" "$($sc.overtime) ETB"
  Val "Bonus" "$($sc.bonus) ETB"
  Val "GROSS SALARY" "$($sc.grossSalary) ETB"
  Write-Host ""
  Write-Host "  --- TAX & PENSION ---" -ForegroundColor Magenta
  Val "Taxable Salary" "$($sc.taxableSalary) ETB"
  Val "Income Tax" "$($sc.incomeTax) ETB"
  Val "Employee Pension (7%)" "$($sc.employeePension) ETB"
  Val "Employer Pension (11%)" "$($sc.employerPension) ETB"
  Write-Host ""
  Write-Host "  --- DEDUCTIONS ---" -ForegroundColor Magenta
  Val "Loan Deduction" "$($sc.loanDeduction) ETB"
  Val "Other Deductions" "$($sc.otherDeductions) ETB"
  Val "Attendance Deduction" "$($sc.attendanceDeduction) ETB ($($sc.deductibleDays) days)"
  Val "Total Deductions" "$($sc.totalDeductions) ETB"
  Write-Host ""
  Write-Host "  --- NET PAY ---" -ForegroundColor Green
  Val "NET PAY" "$($sc.netPay) ETB"
  Write-Host "  ============================================" -ForegroundColor White
}

Log "TEST COMPLETE"
Write-Host ""
Write-Host "Summary of seeded data used:" -ForegroundColor White
Val "Guard" "$($guard.firstName) $($guard.employeeCode) - wage $guardWage ETB/month"
Val "Guard Structure" "$($guardStruct.name) - OT x$($guardStruct.otMultiplier), Holiday x$($guardStruct.holidayMultiplier)"
foreach ($s in $staffList) {
  Val "Staff" "$($s.firstName) $($s.employeeCode) - wage 25000 ETB/month"
}
Val "Staff Structure" "$($staffStruct.name)"
Val "Payroll Period" "$($period.year)-$($period.month) ($($period.status))"
