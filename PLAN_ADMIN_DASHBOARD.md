# Platform Administration Dashboard Plan (Enhanced for Library SaaS)

## 1. Overview
The **Platform Admin Dashboard** is the command center for the "BookMyLib" SaaS business. It provides Super Admins (Platform Owners) with complete control over the multi-tenant ecosystem, distinct from the Library Owner's dashboard.

## 2. Architecture & Isolation
- **Route Namespace:** `/admin/*`
- **Database Model:** `PlatformUser` (Isolated from tenant `Owner/Staff`).
- **Authentication:**
  - Dedicated Login: `/admin/login`
  - Session Cookie: `session_admin` (Strictly HTTP-only, Secure)
  - Middleware: Distinct protection logic, rejecting all non-admin tokens.

## 3. Database Schema Extensions

### 3.1 Platform User Model
```prisma
model PlatformUser {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String   // Hashed
  role      String   // 'super_admin', 'support', 'sales', 'developer'
  isActive  Boolean  @default(true)
  
  // Security & Auditing
  lastLogin   DateTime?
  loginIp     String?
  auditLogs   PlatformAuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("platform_users")
}
```

### 3.2 Audit Logging
```prisma
model PlatformAuditLog {
  id             String       @id @default(uuid())
  platformUserId String
  action         String       // 'SUSPEND_LIBRARY', 'VIEW_REVENUE', 'IMPERSONATE'
  targetId       String?      // ID of the Library/Owner affected
  details        String?      // JSON diff
  ipAddress      String?
  createdAt      DateTime     @default(now())

  performedBy    PlatformUser @relation(fields: [platformUserId], references: [id])

  @@index([platformUserId])
  @@map("platform_audit_logs")
}
```

### 3.3 SaaS Plans & Subscriptions (The "Product" Layer)
**Distinction:** `SaasPlan` is what YOU sell to Libraries. `Plan` is what Libraries sell to Students.

```prisma
model SaasPlan {
  id          String   @id @default(uuid())
  name        String   // 'Starter', 'Growth', 'Enterprise'
  slug        String   @unique // 'starter', 'growth'
  priceMonthly Float
  priceYearly  Float
  
  // Limits
  maxBranches   Int      @default(1)
  maxStudents   Int      @default(100)
  maxStorage    Int      @default(512) // MB
  maxStaff      Int      @default(2)
  
  // Feature Toggles (Global for this plan)
  features      Json?    // { "whatsapp": true, "biometric": false, "custom_domain": false }

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  subscriptions LibrarySubscription[]
  
  @@map("saas_plans")
}

model LibrarySubscription {
  id           String    @id @default(uuid())
  libraryId    String    @unique // One active sub per library
  planId       String
  status       String    // 'active', 'past_due', 'canceled', 'trialing'
  
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean @default(false)
  
  // Relations
  library      Library   @relation(fields: [libraryId], references: [id])
  plan         SaasPlan  @relation(fields: [planId], references: [id])
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@map("library_subscriptions")
}
```

### 3.4 Platform Support (Owner -> Admin)
```prisma
model PlatformSupportTicket {
  id        String   @id @default(uuid())
  libraryId String
  ownerId   String
  subject   String
  message   String
  status    String   // 'open', 'investigating', 'resolved'
  priority  String   // 'low', 'normal', 'critical' (e.g., Server Down)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  library   Library  @relation(fields: [libraryId], references: [id])
  owner     Owner    @relation(fields: [ownerId], references: [id])

  @@map("platform_support_tickets")
}
```

## 4. Enhanced Feature Set (SaaS Specifics)

### 4.1 📊 God-View Analytics (`/admin/dashboard`)
*   **SaaS Metrics:**
    *   **MRR (Monthly Recurring Revenue):** Total from `LibrarySubscription`.
    *   **Active Tenants:** Count of `Library` where `isActive: true`.
    *   **Trial Conversion Rate:** % of Free Trial -> Paid.
*   **System Health:**
    *   **Global Storage:** Total S3 usage across all tenants.
    *   **Error Rate:** 5xx errors from Vercel/Log logs.

### 4.2 🏢 Tenant Management (`/admin/libraries`)
*   **Library Health Card:**
    *   **Usage:** % of Max Students, % of Max Storage.
    *   **Engagement:** Last Login Date (Owner), Active Students (last 30 days).
*   **Actions:**
    *   **"Ghost Mode" (Impersonation):** Log in as this Library's Owner to debug.
    *   **Upgrade/Downgrade:** Manually change `SaasPlan` (e.g., complimentary upgrade).
    *   **Feature Overrides:** Enable "WhatsApp" for a specific library even if their plan doesn't have it.

### 4.3 💰 Billing & Invoicing (`/admin/billing`)
*   **Platform Revenue:** Track payments *from* Libraries.
*   **Manual Invoicing:** Generate PDF invoices for B2B/Offline payments.
*   **Payment Gateway Status:** Health of Stripe/Razorpay connection.

### 4.4 ⚙️ Global Configuration (`/admin/settings`)
*   **Maintenance Mode:** Global "System Under Maintenance" banner.
*   **Broadcasts:** Send in-app notification to ALL Owners (e.g., "New Feature Released!").

## 5. Technical Implementation Roadmap

### Phase 1: The Foundation (Day 1)
1.  **Schema Migration:** Add `PlatformUser`, `SaasPlan`, `LibrarySubscription`, `PlatformAuditLog`.
2.  **Seeding:** Create Super Admin & Default SaaS Plans (Free, Pro).
3.  **Auth Shell:** Admin Login & Session Management.

### Phase 2: Tenant & Plan Management (Day 2-3)
4.  **Library List:** Advanced filter (by Plan, Status, Revenue).
5.  **Plan Manager:** UI to create/edit SaaS tiers.
6.  **Subscription Logic:** Assign plans to libraries.

### Phase 3: Advanced Features (Day 4-5)
7.  **Impersonation:** Securely assume Owner identity.
8.  **Analytics Dashboard:** Visual charts (Recharts/Tremor).
9.  **Audit Logs:** Track every admin move.

## 6. Security Protocol
*   **Isolation:** Admin logic resides in `src/app/admin`, completely separate from `src/app/(main)`.
*   **Audit:** ALL sensitive actions (Impersonation, Plan Change) must be logged.
