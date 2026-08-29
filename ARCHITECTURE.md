# Vital Security PLC — Payroll Management System Architecture

## 1. Analysis of Existing Excel/HR Documents

### 1.1 Office Staff Payroll Structure (from payroll.xlsx)

The Excel payroll sheets (2013-2014 Ethiopian calendar) reveal:

**Payroll Columns:**
| Column | Description |
|--------|-------------|
| No | Sequential number |
| Employee's name | Full name |
| Account number | Bank account (added later) |
| Basic salary | Fixed monthly salary |
| Tele allowance | Telephone allowance |
| Transport allowance | Transport allowance |
| Gross salary | Basic + Tele + Transport |
| Taxable salary | Salary subject to tax (later sheets) |
| Pension from PLC 11% | Employer pension contribution |
| Income Tax | Progressive income tax |
| Pension from employee 7% | Employee pension contribution |
| Total deduction | Tax + Employee pension |
| Total Pension 18% | PLC 11% + Employee 7% |
| Net pay | Gross - Total deduction |

**Key Observations:**
- Maker/checker separation: "Prepared By" and "Approved By" signature lines
- Ethiopian calendar months used (Tir, Yeka, Megabit, Miyat, etc.)
- Pension rates: PLC contributes 11%, Employee contributes 7% (total 18%)
- Some employees have zero pension (below threshold?)
- Tax calculation appears progressive based on taxable salary
- Bank account numbers added in later months

**Employees from Excel (Office Staff):**
1. Berhanu W/Giyorgis (Account: 18652714)
2. Terefe Yadeta (Account: 22371878)
3. Rahel Tadesse (Account: 59603833)
4. Tseyon Yohanis (Account: 73659639)
5. Abi Getachew (Account: 70092767)
6. Yordanos Chala (Account: 68793831)
7. Abebe Lema (Account: 76439419)
8. Frehiwot Admasu (Account: 44475197)
9. Ietalme Degene (Account: 75429185)
10. Tsige Bekele (Account: 84859915)

### 1.2 Employee Lists

- **empl.xlsx**: 227 employees (Ground Floor category)
- **Employee_Atendance.xlsx**: 49 employees in attendance tracking
- **attendBook1.xlsx**: 176+ employees in attendance book

### 1.3 Guard Payroll (NEW - Not in Excel)

The Excel does NOT contain guard payroll data. Guards are paid based on hours worked, not fixed salaries. This is a completely new workflow to build.

---

## 2. Proposed Database Models

### 2.1 User (Authentication & RBAC)

```typescript
{
  _id: ObjectId,
  employeeId: ObjectId (ref: Employee),
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  role: Enum[SUPER_ADMIN, HR_ADMIN, HR_OPERATOR, SITE_OPERATOR, 
             FINANCE_OFFICER, PAYROLL_APPROVER, PAYMENT_OFFICER, 
             MANAGEMENT, AUDITOR],
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 Employee (Master Employee Record)

```typescript
{
  _id: ObjectId,
  employeeCode: String (unique, required), // e.g., "VSP-001"
  firstName: String (required),
  middleName: String,
  lastName: String (required),
  fullName: String (virtual),
  category: Enum[GUARD, OFFICE_STAFF],
  status: Enum[ACTIVE, INACTIVE, TERMINATED, ON_LEAVE],
  
  // Personal Info
  dateOfBirth: Date,
  gender: Enum[MALE, FEMALE],
  phone: String,
  email: String,
  address: String,
  
  // Employment Info
  hireDate: Date,
  department: String,
  position: String,
  
  // Bank Info
  bankName: String,
  bankBranch: String,
  accountNumber: String,
  
  // Guard-specific (null for office staff)
  guardInfo: {
    employmentType: Enum[PERMANENT, CONTRACT, TEMPORARY],
    idCardNumber: String,
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### 2.3 Site

```typescript
{
  _id: ObjectId,
  siteName: String (required),
  siteCode: String (unique, required), // e.g., "ABC-01"
  client: String,
  location: String,
  siteType: Enum[COMMERCIAL, RESIDENTIAL, INDUSTRIAL, GOVERNMENT],
  status: Enum[ACTIVE, INACTIVE, SUSPENDED],
  latitude: Number,
  longitude: Number,
  radiusMeters: Number (default: 100),
  agreedManpower: Number,
  actualManpower: Number,
  contactPerson: String,
  contactPhone: String,
  address: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.4 PayrollPeriod

```typescript
{
  _id: ObjectId,
  year: Number (required),
  month: Number (required), // 1-12
  monthName: String, // "January", "February", etc.
  startDate: Date (required),
  endDate: Date (required),
  status: Enum[DRAFT, OPEN, CLOSED, LOCKED],
  lockedAt: Date,
  lockedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### 2.5 GuardHourEntry

```typescript
{
  _id: ObjectId,
  payrollPeriodId: ObjectId (ref: PayrollPeriod, required),
  guardId: ObjectId (ref: Employee, required),
  entries: [{
    siteId: ObjectId (ref: Site, required),
    siteCode: String,
    normalHours: Number (required, min: 0),
    holidayHours: Number (required, min: 0, default: 0),
    notes: String,
  }],
  status: Enum[DRAFT, SUBMITTED, RETURNED],
  submittedBy: ObjectId (ref: User),
  submittedAt: Date,
  returnedBy: ObjectId (ref: User),
  returnedAt: Date,
  returnReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.6 GuardPayrollRecord

```typescript
{
  _id: ObjectId,
  payrollPeriodId: ObjectId (ref: PayrollPeriod, required),
  guardId: ObjectId (ref: Employee, required),
  hourEntryId: ObjectId (ref: GuardHourEntry, required),
  
  // Rate inputs (set by Finance)
  normalRate: Number, // ETB per hour
  holidayRate: Number, // ETB per hour
  
  // Calculated values
  totalNormalHours: Number,
  totalHolidayHours: Number,
  normalPay: Number, // normalHours × normalRate
  holidayPay: Number, // holidayHours × holidayRate
  grossPay: Number, // normalPay + holidayPay
  
  // Status
  status: Enum[DRAFT, SUBMITTED, UNDER_REVIEW, CALCULATED, 
               CHECKED, APPROVED, READY_FOR_PAYMENT, PAID, 
               RETURNED_FOR_CORRECTION],
  
  // Workflow timestamps
  submittedBy: ObjectId (ref: User),
  submittedAt: Date,
  reviewedBy: ObjectId (ref: User),
  reviewedAt: Date,
  checkedBy: ObjectId (ref: User),
  checkedAt: Date,
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  paidBy: ObjectId (ref: User),
  paidAt: Date,
  returnedBy: ObjectId (ref: User),
  returnedAt: Date,
  returnReason: String,
  
  // Payment info
  paymentDate: Date,
  paymentMethod: Enum[BANK_TRANSFER, CASH],
  bankReference: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 2.7 OfficePayrollRecord

```typescript
{
  _id: ObjectId,
  payrollPeriodId: ObjectId (ref: PayrollPeriod, required),
  employeeId: ObjectId (ref: Employee, required),
  
  // Earnings
  basicSalary: Number,
  teleAllowance: Number,
  transportAllowance: Number,
  overtime: Number,
  bonus: Number,
  grossSalary: Number,
  
  // Deductions
  taxableSalary: Number,
  incomeTax: Number,
  pensionEmployee: Number, // 7%
  pensionPLC: Number, // 11%
  totalDeduction: Number,
  totalPension: Number, // 18%
  loanDeduction: Number,
  otherDeductions: Number,
  
  // Net
  netPay: Number,
  
  // Status (same workflow as guard)
  status: Enum[DRAFT, SUBMITTED, UNDER_REVIEW, CALCULATED, 
               CHECKED, APPROVED, READY_FOR_PAYMENT, PAID, 
               RETURNED_FOR_CORRECTION],
  
  // Workflow
  submittedBy: ObjectId (ref: User),
  submittedAt: Date,
  reviewedBy: ObjectId (ref: User),
  reviewedAt: Date,
  checkedBy: ObjectId (ref: User),
  checkedAt: Date,
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  paidBy: ObjectId (ref: User),
  paidAt: Date,
  returnedBy: ObjectId (ref: User),
  returnedAt: Date,
  returnReason: String,
  
  // Payment
  paymentDate: Date,
  paymentMethod: Enum[BANK_TRANSFER, CASH],
  bankReference: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 2.8 AuditLog

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  action: String (required), // "CREATE", "UPDATE", "DELETE", "APPROVE", etc.
  entity: String (required), // "Employee", "GuardPayrollRecord", etc.
  entityId: ObjectId,
  oldValues: Object,
  newValues: Object,
  reason: String,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

### 2.9 Settings

```typescript
{
  _id: ObjectId,
  key: String (unique, required),
  value: Mixed,
  category: String, // "TAX", "PENSION", "WORKFLOW", "SYSTEM"
  description: String,
  updatedBy: ObjectId (ref: User),
  updatedAt: Date
}
```

---

## 3. API Structure

### 3.1 Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
PUT    /api/auth/change-password
```

### 3.2 Users (Admin only)
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
PUT    /api/users/:id/activate
PUT    /api/users/:id/deactivate
```

### 3.3 Employees
```
GET    /api/employees
GET    /api/employees/:id
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id
GET    /api/employees/guards
GET    /api/employees/office-staff
```

### 3.4 Sites
```
GET    /api/sites
GET    /api/sites/:id
POST   /api/sites
PUT    /api/sites/:id
DELETE /api/sites/:id
```

### 3.5 Payroll Periods
```
GET    /api/payroll-periods
GET    /api/payroll-periods/:id
POST   /api/payroll-periods
PUT    /api/payroll-periods/:id
PUT    /api/payroll-periods/:id/lock
```

### 3.6 Guard Payroll (Hours Entry)
```
GET    /api/guard-hours
GET    /api/guard-hours/:id
POST   /api/guard-hours
PUT    /api/guard-hours/:id
POST   /api/guard-hours/:id/submit
POST   /api/guard-hours/:id/return
```

### 3.7 Guard Payroll (Finance & Payment)
```
GET    /api/guard-payroll
GET    /api/guard-payroll/:id
PUT    /api/guard-payroll/:id/rates     // Finance enters rates
POST   /api/guard-payroll/:id/calculate  // System calculates
POST   /api/guard-payroll/:id/check      // Checker verifies
POST   /api/guard-payroll/:id/approve    // Approver approves
POST   /api/guard-payroll/:id/ready      // Mark ready for payment
POST   /api/guard-payroll/:id/pay        // Mark as paid
POST   /api/guard-payroll/:id/return     // Return for correction
```

### 3.8 Office Payroll
```
GET    /api/office-payroll
GET    /api/office-payroll/:id
POST   /api/office-payroll
PUT    /api/office-payroll/:id
POST   /api/office-payroll/:id/submit
POST   /api/office-payroll/:id/calculate
POST   /api/office-payroll/:id/check
POST   /api/office-payroll/:id/approve
POST   /api/office-payroll/:id/pay
POST   /api/office-payroll/:id/return
```

### 3.9 Reports
```
GET    /api/reports/payroll-summary
GET    /api/reports/guard-hours
GET    /api/reports/employee-payroll
GET    /api/reports/site-labor-cost
GET    /api/reports/payment-history
```

### 3.10 Audit Logs
```
GET    /api/audit-logs
GET    /api/audit-logs/:id
```

### 3.11 Settings
```
GET    /api/settings
PUT    /api/settings/:key
```

---

## 4. RBAC Permission Matrix

| Permission | SUPER_ADMIN | HR_ADMIN | HR_OPERATOR | SITE_OPERATOR | FINANCE_OFFICER | PAYROLL_APPROVER | PAYMENT_OFFICER | MANAGEMENT | AUDITOR |
|------------|:-----------:|:--------:|:-----------:|:-------------:|:---------------:|:----------------:|:---------------:|:----------:|:-------:|
| user.create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| user.read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| user.update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| user.delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| employee.create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| employee.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| employee.update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| site.create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| site.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| site.update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| guard-hours.create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| guard-hours.submit | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| guard-hours.return | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| guard-payroll.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| guard-payroll.rates | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| guard-payroll.calculate | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| guard-payroll.check | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| guard-payroll.approve | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| guard-payroll.pay | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| guard-payroll.return | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| office-payroll.create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| office-payroll.rates | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| office-payroll.approve | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| office-payroll.pay | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| report.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| audit.read | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| settings.read | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| settings.update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Guard Payroll Workflow

### 5.1 Hours Entry (SITE_OPERATOR / HR_OPERATOR)

```
1. Select Payroll Period (must be OPEN)
2. Select Guard (from employee list)
3. Enter first site entry:
   - Select Site (dropdown)
   - Site Code (auto-filled from site)
   - Normal Hours
   - Holiday Hours
4. Click "+ Add Site" for additional sites
5. Save as DRAFT or SUBMIT
```

### 5.2 Finance Review (FINANCE_OFFICER)

```
1. View submitted hour entries
2. Select entry to review
3. Enter Normal Rate (ETB/hour)
4. Enter Holiday Rate (ETB/hour)
5. Click "Calculate"
6. System calculates:
   - Normal Pay = Normal Hours × Normal Rate
   - Holiday Pay = Holiday Hours × Holiday Rate
   - Gross Pay = Normal Pay + Holiday Pay
7. Status → CALCULATED
```

### 5.3 Checker Review (PAYROLL_APPROVER)

```
1. View calculated payrolls
2. Verify calculations
3. Mark as CHECKED or RETURN for correction
```

### 5.4 Approval (PAYROLL_APPROVER)

```
1. Final approval
2. Status → APPROVED
3. Payroll is now locked (cannot be edited)
```

### 5.5 Payment (PAYMENT_OFFICER)

```
1. View approved payrolls
2. Process payment (bank transfer)
3. Enter payment reference
4. Status → PAID
```

---

## 6. Unknown Business Rules (Require Confirmation)

### 6.1 Guard Payroll
- [ ] What is the normal hourly rate for guards?
- [ ] What is the holiday hourly rate for guards?
- [ ] Are rates the same across all sites or different per site?
- [ ] Is there a maximum number of hours per guard per month?
- [ ] What constitutes a "holiday" (Ethiopian holidays, company holidays)?
- [ ] Are there night shift differentials?
- [ ] Is there overtime for guards?

### 6.2 Office Staff Payroll
- [ ] What are the exact tax brackets and rates?
- [ ] Is pension calculated on gross or basic salary?
- [ ] Are there non-taxable allowances? Which ones?
- [ ] What is the minimum pension threshold?
- [ ] Are there loan deduction rules?
- [ ] What bonuses are applicable?

### 6.3 General
- [ ] Ethiopian calendar or Gregorian calendar for payroll periods?
- [ ] What is the payroll cycle (monthly, bi-weekly)?
- [ ] Is there a cut-off date for hours entry?
- [ ] How many levels of approval are required?
- [ ] Can a payroll period be reopened after locking?
- [ ] What reports are required?

---

## 7. Project Structure

```
Vitalpayroll/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   └── cors.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rbac.ts
│   │   │   ├── validate.ts
│   │   │   ├── audit.ts
│   │   │   └── errorHandler.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.validation.ts
│   │   │   ├── users/
│   │   │   ├── employees/
│   │   │   ├── guards/
│   │   │   ├── sites/
│   │   │   ├── payroll/
│   │   │   ├── guardPayroll/
│   │   │   ├── officePayroll/
│   │   │   ├── finance/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Employee.ts
│   │   │   ├── Site.ts
│   │   │   ├── PayrollPeriod.ts
│   │   │   ├── GuardHourEntry.ts
│   │   │   ├── GuardPayrollRecord.ts
│   │   │   ├── OfficePayrollRecord.ts
│   │   │   ├── AuditLog.ts
│   │   │   └── Settings.ts
│   │   ├── services/
│   │   │   ├── payrollCalculation.service.ts
│   │   │   └── audit.service.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── app.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── employees/
│   │   │   ├── guards/
│   │   │   ├── sites/
│   │   │   ├── guard-payroll/
│   │   │   ├── office-payroll/
│   │   │   ├── finance/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   └── settings/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```
