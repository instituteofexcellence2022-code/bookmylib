# 🏗️ Project Structure & Architecture Standards

> **Philosophy**: This project follows a **Feature-Sliced Design (FSD)** inspired architecture for the frontend and a **Single Server Monolith** architecture using Next.js App Router. The goal is native-like mobile experience, optimal performance, and zero CORS issues with single deployment.

---

## 📂 Global Root Directory
```
/library-management-system
├── /app                    # 🎨 Next.js App Router (Frontend + API)
├── /shared                 # 📦 Shared Types/DTOs
├── .gitignore              # Global git ignore
├── README.md               # Master documentation
└── package.json            # Single package.json for full stack
```

---

## 🎨 Next.js App Architecture (`/app`)

**Tech Stack**: Next.js 14, React 18, TypeScript, TailwindCSS 4, Shadcn/UI, Framer Motion, React Spring, TanStack Query, Zustand, XState, Socket.io.

### Directory Structure
```
/app
├── /api                    # 🚀 Next.js API Routes (Backend)
│   ├── /auth               # Authentication endpoints
│   ├── /seats              # Seat management APIs
│   ├── /payments           # Payment processing
│   ├── /notifications      # Real-time notifications
│   └── /...                # Other domain APIs
│
├── /assets                 # 🌐 Global static assets
│   ├── /fonts              # Custom fonts
│   ├── /icons              # Custom SVG icons
│   └── /images             # Global images (Logos, Placeholders)
│
├── /components             # 🧱 Shared UI Components (Atomic)
│   ├── /ui                 # Shadcn primitives (Button, Input, Card, Sheet)
│   ├── /layout             # Global Layouts (RootLayout, DashboardLayout)
│   └── /shared             # Reusable composite components
│
├── /config                 # ⚙️ App Configuration
│   ├── env.ts              # Environment variables validation (zod)
│   ├── constants.ts        # Global constants
│   └── theme.ts            # Theme configuration
│
├── /features               # 🧩 Domain Features (FSD Architecture)
│   ├── /auth               # Authentication flows
│   ├── /owner              # 👑 Owner Console (50+ screens)
│   │   ├── /dashboard      # Executive Dashboard & Analytics
│   │   ├── /branches       # Multi-Branch Management
│   │   ├── /staff          # Staff & HR Management
│   │   ├── /students       # Student Management & Admissions
│   │   ├── /subscriptions # Subscription & Fee Management
│   │   ├── /promotions     # Promotions & Offers
│   │   ├── /revenue        # Revenue & Collection Tracking
│   │   ├── /issues         # Issue Tracking & Resolution
│   │   ├── /marketing      # Marketing & CRM Tools
│   │   └── /settings       # Global Settings & Override
│   │
│   ├── /staff              # 👨‍💼 Staff Operations (40+ screens)
│   │   ├── /dashboard      # Staff Dashboard & Today's Tasks
│   │   ├── /checkin        # Student Check-in/Check-out
│   │   ├── /seats          # Real-time Seat Management
│   │   ├── /payments       # Payment Collection & Receipts
│   │   ├── /attendance     # Attendance Tracking & Reports
│   │   ├── /inventory      # Inventory & Asset Management
│   │   ├── /support        # Student Support & Issue Handling
│   │   ├── /notifications # Staff Notifications & Alerts
│   │   └── /profile        # Staff Profile & Performance
│   │
│   ├── /student            # 🎓 Student App (54+ screens)
│   │   ├── /dashboard      # Home Feed & Digital ID
│   │   ├── /productivity   # Study Tools & Focus Features
│   │   ├── /bookings       # Seat Bookings & Renewals
│   │   ├── /wallet         # Wallet & Payment Management
│   │   ├── /services       # Campus Services & Safety
│   │   ├── /referral       # Referral Program
│   │   ├── /support        # Support Center & Help
│   │   └── /profile        # Student Profile & Settings
│   │
│   └── /landing            # 🌐 Marketing pages
│
├── /hooks                  # 🎣 Global Custom Hooks
│   ├── useAuth.ts          # Authentication state
│   ├── useSocket.ts        # WebSocket connections
│   ├── useTheme.ts         # Dark mode toggle
│   └── useDebounce.ts      # Utility hooks
│
├── /lib                    # 🛠️ Infrastructure & Utilities
│   ├── /socket             # Socket.io client setup
│   ├── /query              # TanStack Query configuration
│   ├── /state-machines     # XState finite state machines
│   ├── utils.ts            # Utility functions
│   └── validators.ts       # Zod schemas
│
├── /providers              # 🛡️ React Context Providers
│   ├── AuthProvider.tsx
│   ├── ThemeProvider.tsx
│   ├── QueryProvider.tsx
│   └── SocketProvider.tsx
│
├── /store                  # 🏪 Global Client State (Zustand)
│   ├── useSidebarStore.ts
│   ├── useUIStore.ts      # Toasts, Modals state
│   └── useSeatStore.ts    # Real-time seat state
│
├── /types                  # 🏷️ Global TypeScript Definitions
│   ├── api.d.ts           # API Response types
│   ├── socket.d.ts        # Socket.io event types
│   └── user.d.ts          # User roles and interfaces
│
├── app.tsx                 # Root App Component
├── globals.css             # Global Styles (Tailwind directives)
├── layout.tsx              # Root Layout
└── page.tsx                # Home Page
│
├── next.config.js          # Next.js Configuration (PWA, Optimizations)
├── tailwind.config.js      # Tailwind Configuration
└── tsconfig.json           # TypeScript Configuration

---

## 👑 Owner Console - Feature Breakdown

### 📊 Executive Dashboard & Analytics
- **Multi-Branch Overview**: Real-time KPIs across all branches
- **Revenue Analytics**: Daily, weekly, monthly revenue tracking with trends
- **Occupancy Heatmaps**: Visual seat utilization across time and branches
- **Student Growth**: New admissions, retention rates, churn analysis
- **Staff Performance**: Productivity metrics and attendance tracking
- **Financial Reports**: P&L statements, expense tracking, profitability

### 🏢 Multi-Branch Management  
- **Branch CRUD**: Create, configure, and manage multiple library branches
- **Branch-specific Settings**: Operating hours, amenities, pricing tiers
- **Geographic Analytics**: Performance comparison by location
- **Resource Allocation**: Staff assignment, inventory distribution
- **Branch-level Overrides**: Custom rules and policies per branch
- **🔍 Multi-Branch Data Access**: Owners can toggle between:
  - **Collective View**: Aggregate data across all branches (default)
  - **Branch-Filtered View**: Data filtered to specific branch selection
  - **Comparative Analysis**: Side-by-side branch performance comparison
- **Data Isolation Enforcement**: All queries automatically scoped to selected branch context

### 👥 Staff & HR Management
- **Staff Onboarding**: Role-based access provisioning
- **Attendance Tracking**: Shift management and time tracking
- **Performance Reviews**: KPI-based staff evaluation
- **Payroll Integration**: Salary management and payment processing
- **Role Permissions**: Granular access control configuration

### 🎓 Student Management & Admissions
- **Admission Pipeline**: Lead to customer conversion workflow
- **Student Database**: Comprehensive student profiles and history
- **Subscription Management**: Plan upgrades, downgrades, pauses
- **Attendance Analytics**: Study pattern analysis and engagement
- **Communication Logs**: All student interactions and support tickets

### 💰 Subscription & Fee Management
- **Plan Catalog**: Multiple subscription tiers and pricing models
- **Automated Billing**: Recurring payments and invoice generation
- **Fee Collection**: One-time fees, late penalties, discounts
- **Revenue Recognition**: Accrual-based accounting integration
- **Payment Gateway**: Multiple payment method support

### 🎯 Promotions & Offers
- **Campaign Management**: Targeted marketing campaigns
- **Discount Codes**: Custom coupon creation and tracking
- **Referral Programs**: Student acquisition through referrals
- **Seasonal Offers**: Time-bound promotions and packages
- **ROI Analytics**: Campaign performance and conversion metrics

### 📈 Revenue & Collection Tracking
- **Real-time Revenue**: Live collection dashboards
- **Collection Efficiency**: Payment success rate monitoring
- **Outstanding Dues**: Automated reminder system
- **Tax Compliance**: GST and tax calculation integration
- **Financial Reconciliation**: Bank statement matching

### ⚠️ Issue Tracking & Resolution
- **Support Ticket System**: Categorized issue management
- **Escalation Matrix**: Priority-based ticket routing
- **Resolution SLA**: Time-bound issue resolution tracking
- **Root Cause Analysis**: Pattern identification and prevention
- **Customer Satisfaction**: Feedback and rating system

### 📣 Marketing & CRM Tools
- **Lead Management**: Prospect tracking and nurturing
- **Communication Tools**: Bulk SMS, email campaigns
- **Customer Segmentation**: Behavioral grouping for targeting
- **Retention Programs**: Win-back campaigns for churned users
- **Competitive Analysis**: Market positioning and benchmarking

### ⚙️ Global Settings & Override
- **System Configuration**: Global business rules and policies
- **Multi-tenant Isolation**: Data security and access boundaries
- **Audit Logs**: Comprehensive activity tracking
- **Backup & Recovery**: Data protection and disaster recovery
- **API Management**: Third-party integration configuration

### 🎯 Branch Filtering & Data Isolation Architecture

#### **Frontend Filter Implementation**
```typescript
// Branch selection state management
interface BranchFilterState {
  selectedBranches: string[]; // Empty array = "All Branches"
  viewMode: 'aggregate' | 'individual' | 'comparison';
  dateRange: { start: Date; end: Date };
}

// Example filter component props
interface BranchFilterProps {
  availableBranches: Branch[];
  onSelectionChange: (branchIds: string[]) => void;
  defaultView?: 'all' | 'current';
}
```

#### **Backend Query Scoping**
```typescript
// API middleware for branch filtering with proper relationship hierarchy
const branchScopeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as AuthenticatedUser;
  const selectedBranches = req.query.branches as string[] | undefined;
  
  if (user.role === 'owner') {
    // Owners can access all their branches or filter to specific ones
    const ownerBranches = await branchService.getBranchesByOwnerId(user.id);
    const accessibleBranchIds = ownerBranches.map(b => b.id);
    
    const finalBranchIds = selectedBranches && selectedBranches.length > 0
      ? selectedBranches.filter(id => accessibleBranchIds.includes(id))
      : accessibleBranchIds; // Default to all owner's branches
    
    req.branchScope = finalBranchIds;
  } else if (user.role === 'staff') {
    // Staff can only access data from their associated branch
    const staffProfile = await staffService.getStaffById(user.id);
    req.branchScope = [staffProfile.branchId]; // Single branch access
  }
  
  next();
};

// Usage in API routes
app.get('/api/analytics/dashboard', branchScopeMiddleware, async (req, res) => {
  const branchIds = req.branchScope;
  const data = await analyticsService.getDashboardData(branchIds);
  res.json(data);
});
```

#### **Database Query Patterns**
```sql
-- Multi-branch aggregate query
SELECT 
  branch_id,
  COUNT(*) as total_students,
  SUM(revenue) as total_revenue,
  AVG(occupancy_rate) as avg_occupancy
FROM library_metrics
WHERE branch_id IN (:branchIds)
AND date BETWEEN :startDate AND :endDate
GROUP BY branch_id;

-- Branch-filtered individual query  
SELECT * FROM students
WHERE branch_id IN (:branchIds)
AND subscription_status = 'active';
```

#### **UI/UX Patterns for Branch Selection**
- **Global Branch Selector**: Persistent dropdown in navigation header
- **Quick Filters**: "All Branches", "This Branch", custom selection
- **Branch Comparison View**: Side-by-side metrics cards
- **Save Filter Sets**: Preserve frequently used branch combinations
- **Visual Indicators**: Clear labeling of currently selected branches

### 🗃️ Database Schema & Relationship Modeling

#### **Core Entity Relationships**
```sql
-- Library Owners (Multi-tenant)
CREATE TABLE owners (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Library Branches (Owned by Library Owners)
CREATE TABLE branches (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  contact_phone VARCHAR(20),
  operating_hours JSONB,
  amenities JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_owner FOREIGN KEY(owner_id) REFERENCES owners(id)
);

-- Staff Members (Associated with specific Branch)
CREATE TABLE staff (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL, -- 'manager', 'assistant', 'support'
  permissions JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_branch FOREIGN KEY(branch_id) REFERENCES branches(id)
);

-- Students (Independent - can subscribe to multiple branches)
CREATE TABLE students (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Student Subscriptions (Links Students to Branches)
CREATE TABLE student_subscriptions (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, branch_id) -- Prevent duplicate subscriptions
);
```

#### **Relationship Hierarchy Enforcement**
```typescript
// Data access patterns with proper relationship validation
class BranchService {
  async getBranchesByOwnerId(ownerId: string): Promise<Branch[]> {
    return db.branches.findMany({
      where: { owner_id: ownerId },
      include: { staff: true, subscriptions: true }
    });
  }
}

class StaffService {
  async getStaffByBranchId(branchId: string): Promise<Staff[]> {
    return db.staff.findMany({
      where: { branch_id: branchId },
      include: { branch: true }
    });
  }
  
  async createStaff(staffData: CreateStaffDto, branchId: string): Promise<Staff> {
    // Validate that branch exists and belongs to current owner
    const branch = await db.branches.findFirst({
      where: { id: branchId, owner_id: currentUser.id }
    });
    
    if (!branch) {
      throw new Error('Branch not found or access denied');
    }
    
    return db.staff.create({
      data: { ...staffData, branch_id: branchId }
    });
  }
}

class StudentService {
  async getStudentsByBranchId(branchId: string): Promise<Student[]> {
    return db.students.findMany({
      where: {
        subscriptions: {
          some: { branch_id: branchId, status: 'active' }
        }
      },
      include: { subscriptions: true }
    });
  }
}
```

#### **Access Control Rules**
1. **Owners** → Can access ALL their branches and associated data
2. **Staff** → Can only access THEIR branch and its data
3. **Students** → Can access THEIR subscriptions across multiple branches
4. **Data Isolation** → All queries automatically filter by branch_id/owner_id

---

## 👨‍💼 Staff Operations - Feature Breakdown

### 📋 Staff Dashboard & Today's Tasks
- **Daily Overview**: Assigned tasks and priority items
- **Shift Management**: Current shift details and handover
- **Performance Metrics**: Individual KPIs and targets
- **Quick Actions**: Frequent operations shortcuts
- **Notification Center**: Real-time alerts and updates

### 🎫 Student Check-in/Check-out
- **QR Code Scanner**: Fast student identification
- **Attendance Logging**: Real-time presence tracking
- **Plan Validation**: Subscription status verification
- **Overstay Alerts**: Automatic notifications for exceeded time
- **Visit History**: Complete student movement records

### 💺 Real-time Seat Management
- **Seat Allocation**: Manual and automated seat assignment
- **Occupancy Monitoring**: Live seat status dashboard
- **Seat Transfers**: Student relocation between seats
- **Maintenance Mode**: Temporarily block seats for cleaning
- **Seat Analytics**: Utilization patterns and hotspots

### 💵 Payment Collection & Receipts
- **Cash Handling**: Secure cash transaction processing
- **Digital Payments**: UPI, card, and wallet payment acceptance
- **Receipt Generation**: Instant digital and print receipts
- **Payment Reconciliation**: End-of-day settlement
- **Discount Application**: Staff-authorized discounts

### 📊 Attendance Tracking & Reports
- **Real-time Monitoring**: Live student presence tracking
- **Pattern Analysis**: Study habit identification
- **Absence Alerts**: Automated notifications for irregular attendance
- **Export Reports**: Daily, weekly, monthly attendance exports
- **Compliance Reporting**: Regulatory requirement fulfillment

### 📦 Inventory & Asset Management
- **Stock Management**: Library assets and consumables tracking
- **Issue/Return**: Equipment lending and return processing
- **Maintenance Logs**: Asset servicing and repair history
- **Replenishment Alerts**: Low stock notifications
- **Asset Valuation**: Depreciation and book value tracking

### 🆘 Student Support & Issue Handling
- **First-line Support**: Immediate issue resolution
- **Ticket Creation**: Formal support request logging
- **Escalation Procedures**: Priority-based issue routing
- **Knowledge Base**: Quick reference for common problems
- **Satisfaction Tracking**: Student feedback collection

### 🔔 Staff Notifications & Alerts
- **Shift Reminders**: Upcoming shift notifications
- **Task Assignments**: New task alerts and updates
- **System Alerts**: Critical system notifications
- **Performance Updates**: KPI achievement notifications
- **Announcements**: Management communications

### 👤 Staff Profile & Performance
- **Personal Dashboard**: Individual performance metrics
- **Achievement Tracking**: Goals and targets progress
- **Training Materials**: Role-specific learning resources
- **Feedback System**: Performance reviews and improvement plans
- **Schedule Management**: Shift planning and time-off requests

---

## 🎓 Student App - Feature Breakdown

### � **Student Onboarding Flows - Multiple Pathways**

#### **Pathway 1: Student Self-Onboarding** (Detailed Process Above)
- **Flow**: Discovery → Trial → Plan Selection → Payment → Document Upload → Activation
- **Audience**: Tech-savvy students who prefer DIY approach
- **Automation**: Fully automated with minimal staff intervention

#### **Pathway 2: Staff/Owner Assisted Onboarding**
- **Flow**: Staff interface → Branch selection → Student details → Discounts → Document handling → Plan selection → Additional fees → Payment processing → Instant receipt → Auto account creation
- **Audience**: Walk-in students, phone inquiries, staff-assisted registrations
- **Automation**: Staff-driven with backend automation

#### **Pathway 3: Quick Public Onboarding**  
- **Flow**: Public page → Branch selection → Plan choice → Basic info (name/email/phone) → Payment → Instant receipt → Backend account creation → Dashboard completion
- **Audience**: Quick sign-ups, mobile users, impulse registrations
- **Automation**: Minimal friction, maximum speed

### 🛠️ **Onboarding Implementation Details**

#### **Pathway 2: Staff/Owner Assisted Onboarding - Implementation**

```typescript
// Staff onboarding interface components
interface StaffOnboardingForm {
  branchId: string;           // Selected branch
  student: {
    name: string;
    email: string;
    phone: string;
    emergencyContact?: string;
  };
  planId: string;            // Selected subscription plan
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    reason: string;          // Staff must provide reason
  };
  additionalFees?: {
    registrationFee: number;
    securityDeposit?: number;
    otherCharges?: number;
  };
  documents?: {
    idProof: File | string;  // File upload or document ID
    studentProof?: File | string;
    photo?: File | string;
  };
  payment: {
    method: 'cash' | 'card' | 'upi' | 'wallet';
    amount: number;
    transactionId?: string;   // For digital payments
  };
}

// Staff onboarding service
class StaffOnboardingService {
  async onboardStudent(staffId: string, formData: StaffOnboardingForm) {
    // 1. Validate staff permissions for the branch
    await this.validateStaffBranchAccess(staffId, formData.branchId);
    
    // 2. Create student account
    const student = await this.createStudentAccount(formData.student);
    
    // 3. Calculate final amount with discounts and fees
    const finalAmount = this.calculateFinalAmount(
      formData.planId, 
      formData.discount,
      formData.additionalFees
    );
    
    // 4. Process payment
    const payment = await this.processPayment({
      studentId: student.id,
      amount: finalAmount,
      method: formData.payment.method,
      transactionId: formData.payment.transactionId
    });
    
    // 5. Create subscription
    const subscription = await this.createSubscription({
      studentId: student.id,
      branchId: formData.branchId,
      planId: formData.planId,
      startDate: new Date(),
      paymentId: payment.id
    });
    
    // 6. Handle documents (upload to cloud storage)
    if (formData.documents) {
      await this.handleDocumentUpload(student.id, formData.documents);
    }
    
    // 7. Generate digital ID and access credentials
    const credentials = await this.generateDigitalAccess(student, subscription);
    
    // 8. Generate instant receipt
    const receipt = await this.generateReceipt({
      student,
      subscription,
      payment,
      discount: formData.discount,
      additionalFees: formData.additionalFees
    });
    
    // 9. Send welcome communication
    await this.sendWelcomeCommunication(student, credentials, receipt);
    
    return { student, subscription, receipt, credentials };
  }
}
```

#### **Pathway 3: Quick Public Onboarding - Implementation**

```typescript
// Quick public onboarding API endpoint
app.post('/api/public/onboard/quick', async (req, res) => {
  try {
    const {
      branchId,
      planId,
      name,
      email,
      phone,
      paymentMethod,
      paymentDetails
    } = req.body;
    
    // 1. Validate branch and plan availability
    const branch = await validateBranchAvailability(branchId);
    const plan = await validatePlanAvailability(planId, branchId);
    
    // 2. Create minimal student account
    const student = await prisma.student.create({
      data: {
        name,
        email,
        phone,
        onboardingStatus: 'PENDING_DOCUMENTS',
        signupSource: 'QUICK_PUBLIC'
      }
    });
    
    // 3. Process payment
    const payment = await paymentService.process({
      amount: plan.price,
      currency: 'INR',
      customer: { name, email, phone },
      method: paymentMethod,
      metadata: { branchId, planId }
    });
    
    // 4. Create subscription
    const subscription = await prisma.studentSubscription.create({
      data: {
        studentId: student.id,
        branchId,
        planId,
        startDate: new Date(),
        endDate: calculateEndDate(plan.duration),
        status: 'ACTIVE',
        paymentId: payment.id
      }
    });
    
    // 5. Generate temporary access
    const tempAccess = generateTemporaryAccessToken(student.id);
    
    // 6. Generate instant receipt
    const receipt = generateReceipt({
      student,
      subscription,
      payment,
      plan
    });
    
    // 7. Send login credentials
    await sendTemporaryCredentials(email, tempAccess);
    
    res.json({
      success: true,
      receipt,
      tempAccessToken: tempAccess.token,
      message: 'Account created successfully. Complete your profile in dashboard.'
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Dashboard completion flow for quick sign-ups
app.post('/api/students/:id/complete-profile', authMiddleware, async (req, res) => {
  const studentId = req.params.id;
  const profileData = req.body;
  
  // Complete remaining profile information
  await prisma.student.update({
    where: { id: studentId },
    data: {
      ...profileData,
      onboardingStatus: 'COMPLETED',
      profileCompletedAt: new Date()
    }
  });
  
  // Handle document upload if provided
  if (profileData.documents) {
    await documentService.processStudentDocuments(studentId, profileData.documents);
  }
  
  res.json({ success: true, message: 'Profile completed successfully' });
});
```

#### **Unified Receipt Generation System**

```typescript
// Receipt service handling all onboarding pathways
class ReceiptService {
  async generateOnboardingReceipt(params: {
    student: Student;
    subscription: Subscription;
    payment: Payment;
    discount?: Discount;
    additionalFees?: AdditionalFees[];
    staffMember?: Staff; // For staff-assisted onboarding
  }) {
    const {
      student,
      subscription,
      payment,
      discount,
      additionalFees,
      staffMember
    } = params;
    
    // Calculate breakdown
    const breakdown = this.calculateBreakdown({
      planPrice: subscription.plan.price,
      discount,
      additionalFees,
      taxRate: 0.18 // 18% GST
    });
    
    // Generate receipt number
    const receiptNumber = this.generateReceiptNumber();
    
    // Create receipt object
    const receipt = {
      id: receiptNumber,
      date: new Date(),
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone
      },
      subscription: {
        plan: subscription.plan.name,
        duration: subscription.plan.duration,
        branch: subscription.branch.name
      },
      payment: {
        method: payment.method,
        amount: payment.amount,
        transactionId: payment.transactionId,
        status: payment.status
      },
      breakdown: {
        baseAmount: breakdown.baseAmount,
        discount: breakdown.discountAmount,
        additionalFees: breakdown.additionalFees,
        tax: breakdown.taxAmount,
        total: breakdown.totalAmount
      },
      staff: staffMember ? {
        id: staffMember.id,
        name: staffMember.name
      } : undefined,
      terms: `Receipt valid for accounting purposes. GSTIN: ${config.gstin}`
    };
    
    // Store receipt in database
    await prisma.receipt.create({
      data: {
        receiptNumber,
        studentId: student.id,
        amount: breakdown.totalAmount,
        type: 'ONBOARDING',
        data: receipt,
        pdfUrl: await this.generatePDF(receipt)
      }
    });
    
    return receipt;
  }
}
```

#### **Auto Account Creation Backend Logic**

```typescript
// Account creation service for all onboarding pathways
class AccountCreationService {
  async createStudentAccount(data: StudentCreateData, source: OnboardingSource) {
    // 1. Validate email/phone uniqueness
    await this.validateUniqueCredentials(data.email, data.phone);
    
    // 2. Create student record
    const student = await prisma.student.create({
      data: {
        ...data,
        signupSource: source,
        onboardingStatus: source === 'QUICK_PUBLIC' ? 'PENDING_DOCUMENTS' : 'IN_PROGRESS',
        referralCode: this.generateReferralCode(data.name)
      }
    });
    
    // 3. Create auth credentials
    const auth = await this.createAuthCredentials(student.id, data.email);
    
    // 4. Initialize student wallet
    const wallet = await walletService.createWallet(student.id);
    
    // 5. Set default preferences
    await this.setDefaultPreferences(student.id);
    
    // 6. Trigger welcome workflow
    await this.triggerWelcomeWorkflow(student, source);
    
    return { student, auth, wallet };
  }
  
  private async createAuthCredentials(studentId: string, email: string) {
    // For quick public onboarding: generate temp password
    // For staff onboarding: generate random password and share with staff
    // For self-onboarding: use provided password
    
    const password = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    return prisma.auth.create({
      data: {
        studentId,
        email,
        password: hashedPassword,
        temporaryPassword: true,
        mustChangePassword: true
      }
    });
  }
}
```

#### **Frontend Components for Multi-Path Onboarding**

```typescript
// Staff onboarding React component
const StaffOnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StaffOnboardingForm>({
    branchId: '',
    student: { name: '', email: '', phone: '' },
    planId: '',
    payment: { method: 'cash', amount: 0 }
  });
  
  const steps = [
    { title: 'Select Branch', component: BranchSelectionStep },
    { title: 'Student Details', component: StudentDetailsStep },
    { title: 'Plan & Discounts', component: PlanSelectionStep },
    { title: 'Additional Fees', component: AdditionalFeesStep },
    { title: 'Document Upload', component: DocumentUploadStep },
    { title: 'Payment', component: PaymentStep },
    { title: 'Review & Confirm', component: ReviewStep }
  ];
  
  return (
    <Wizard>
      {steps.map((step, index) => (
        <Wizard.Step key={index}>
          <step.component 
            data={formData}
            onChange={(updates) => setFormData({ ...formData, ...updates })}
            onNext={() => setCurrentStep(index + 1)}
            onBack={() => setCurrentStep(index - 1)}
          />
        </Wizard.Step>
      ))}
    </Wizard>
  );
};

// Quick public onboarding component
const QuickPublicOnboarding: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Container>
        <Stepper steps={['Branch', 'Plan', 'Details', 'Payment']} />
        
        <BranchSelection onSelect={(branchId) => {/* ... */}} />
        <PlanGrid plans={availablePlans} onSelect={(planId) => {/* ... */}} />
        
        <SimpleForm
          fields={[
            { name: 'name', label: 'Full Name', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Phone', type: 'tel', required: true }
          ]}
          onSubmit={async (data) => {
            const result = await onboardQuick(data);
            if (result.success) {
              showReceipt(result.receipt);
              redirectToDashboard(result.tempAccessToken);
            }
          }}
        />
        
        <PaymentGateway 
          amount={selectedPlan.price}
          onSuccess={(paymentData) => {/* ... */}}
        />
      </Container>
    </div>
  );
};
```

---

### �� Home Feed & Digital ID
- **Personalized Dashboard**: Role-based content and quick actions
- **Digital Library Card**: QR-based identification and access
- **Announcements**: Library updates and important notices
- **Quick Stats**: Subscription status, wallet balance, attendance
- **Navigation Hub**: Smart shortcuts based on usage patterns

### ⚡ Study Tools & Focus Features
- **Focus Timer**: Pomodoro-style study sessions with analytics
- **Goal Tracking**: Daily study targets and achievement tracking
- **Productivity Analytics**: Study pattern insights and recommendations
- **Distraction Block**: Website and app blocking during sessions
- **Achievement System**: Badges and rewards for consistency

### 🎫 Seat Bookings & Renewals
- **Real-time Availability**: Live seat map with occupancy status
- **Smart Booking**: AI-powered seat recommendations
- **Auto-renewal**: Subscription continuation preferences
- **Booking History**: Past sessions and usage patterns
- **Waitlist Management**: Queue position for popular time slots

### 💳 Wallet & Payment Management
- **Balance Overview**: Current wallet amount and transaction history
- **Secure Top-ups**: Multiple payment method integration
- **Subscription Payments**: Automated recurring billing
- **Receipt Management**: Digital invoice storage and access
- **Spending Analytics**: Category-wise expense breakdown

### 🛡️ Campus Services & Safety
- **Emergency Features**: Quick access to security and support
- **Service Requests**: Maintenance, cleaning, and assistance
- **Campus Navigation**: Indoor maps and wayfinding
- **Safety Guidelines**: Library rules and safety protocols
- **Lost & Found**: Item reporting and retrieval system

### 🤝 Referral Program
- **Invite Friends**: Share referral codes via social media
- **Reward Tracking**: Earned credits and pending rewards
- **Leaderboard**: Top referrers and performance ranking
- **Campaign Participation**: Special referral challenges
- **Payment Processing**: Reward redemption and withdrawal

### 🆘 Support Center & Help
- **Knowledge Base**: Frequently asked questions and guides
- **Live Chat**: Real-time support with library staff
- **Ticket System**: Formal issue reporting and tracking
- **Feedback Mechanism**: Suggestions and improvement ideas
- **Status Updates**: Real-time ticket progress notifications

### 👤 Student Profile & Settings
- **Personal Information**: Contact details and preferences
- **Subscription Management**: Plan details and upgrade options
- **Privacy Controls**: Data sharing and visibility settings
- **Notification Preferences**: Custom alert configuration
- **Account Security**: Password management and 2FA setup

---

### Feature Module Pattern (`/features/*`)
Every feature folder is a self-contained mini-application with API routes.
```
/features/student
├── /components             # Components used ONLY by Student feature
│   ├── StudentCard.tsx
│   └── AttendanceChart.tsx
├── /hooks                  # Hooks specific to Student
│   └── useStudentStats.ts
├── /api                    # API Routes for Student feature
│   └── route.ts            # Next.js App Router API endpoint
├── /services               # Server-side services
│   └── student.service.ts  # Business logic functions
├── /types                  # Local Types
│   └── student.types.ts
└── index.ts                # Public API (Barrel file)
```

---

## 🧠 Next.js API Architecture (`/app/api`)

**Tech Stack**: Next.js 14 API Routes, TypeScript, Prisma ORM, PostgreSQL, NextAuth.js, Zod.

### API Route Structure
```
/app/api
├── /auth                   # 🔐 Authentication & Authorization
│   ├── [...nextauth]/route.ts  # NextAuth.js configuration
│   ├── /login/route.ts     # Custom login endpoint
│   └── /register/route.ts  # Registration endpoint
│
├── /students               # 🎓 Student Management
│   ├── route.ts            # GET/POST students
│   ├── [id]/route.ts       # GET/PUT/DELETE specific student
│   └── [id]/attendance/route.ts  # Attendance endpoints
│
├── /seats                  # 💺 Seat Management
│   ├── route.ts            # GET available seats
│   ├── [id]/route.ts       # Seat operations
│   └── /occupancy/route.ts # Real-time occupancy updates
│
├── /payments               # 💰 Payment Processing
│   ├── route.ts            # Payment creation
│   ├── /verify/route.ts    # Payment verification
│   └── /webhook/route.ts   # Payment gateway webhooks
│
├── /notifications          # 🔔 Real-time Notifications
│   ├── route.ts            # Notification management
│   └── /socket/route.ts    # Socket.io handshake endpoint
│
├── /library                # 🏢 Library & Branch Management
│   ├── /branches/route.ts  # Branch operations
│   └── /config/route.ts    # Library configuration
│
└── /health/route.ts        # 🩺 Health check endpoint
```

### Database & ORM Integration
```
/lib
├── /db
│   └── index.ts            # Prisma client singleton
├── /prisma
│   ├── schema.prisma       # Database Schema
│   └── /migrations         # SQL Migrations
└── /validations            # Zod validation schemas
```

### Next.js API Route Pattern
Standard Next.js App Router API route structure.
```
// app/api/students/route.ts
export async function GET(request: Request) {
  // Handle GET request
}

export async function POST(request: Request) {
  // Handle POST request
}

export async function PUT(request: Request) {
  // Handle PUT request
}

export async function DELETE(request: Request) {
  // Handle DELETE request
}
```

---

## 📏 Standards & Conventions

### 1. Naming Conventions

| Entity | Convention | Example |
| :--- | :--- | :--- |
| **Folders** | `kebab-case` | `/user-profile` |
| **Files** | `kebab-case` | `auth.service.ts`, `button.tsx` |
| **React Components** | `PascalCase` | `UserProfile.tsx` |
| **React Hooks** | `camelCase` (prefix `use`) | `useAuth.ts` |
| **API Routes** | `route.ts` | `app/api/students/route.ts` |
| **Methods/Functions** | `camelCase` | `getUserById` |
| **Variables** | `camelCase` | `isActive` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| **Interfaces** | `PascalCase` (No `I` prefix) | `UserProps` |
| **Validation Schemas** | `PascalCase` (Suffix `Schema`) | `CreateUserSchema` |
| **Database Tables** | `PascalCase` (Prisma default) | `StudentProfile` |

### 2. State Management Strategy

*   **Server State**: Use **TanStack Query v5** for all API data.
    *   *Rule*: Never store API data in client state unless absolutely necessary.
*   **Client Global State**: Use **Zustand** for UI state.
    *   *Use Cases*: Sidebar state, Theme preference, Modal states.
*   **Complex Workflows**: Use **XState** for finite state machines.
    *   *Use Cases*: Multi-step forms, Payment flows, Booking wizards.
*   **Form State**: Use **React Hook Form** + **Zod** validation.
    *   *Rule*: Use uncontrolled forms with `register` for performance.
*   **URL State**: Use **Next.js searchParams** for filter states.
    *   *Use Cases*: Table filters, Pagination, Search queries.
*   **Real-time State**: Use **Socket.io** + **Zustand** for live updates.
    *   *Use Cases*: Seat occupancy, Notifications, Live activity.

### 3. API Response Standard
All API responses must follow this strict envelope format:

**Success Response (200/201)**
```json
{
  "success": true,
  "data": { ... }, // Object or Array
  "message": "Operation successful",
  "meta": { ... }  // Optional: Pagination info
}
```

**Error Response (4xx/5xx)**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid credentials", 
  "statusCode": 401
}
```

### 4. Git Workflow
*   **Main Branch**: `main` (Production-ready code).
*   **Feature Branches**: `feat/feature-name` (e.g., `feat/auth-login`).
*   **Bug Fixes**: `fix/bug-description` (e.g., `fix/login-error`).
*   **Commits**: Follow **Conventional Commits**:
    *   `feat: add login page`
    *   `fix: resolve cors issue`
    *   `docs: update readme`
    *   `style: format code`
    *   `refactor: simplify auth logic`

---

## 🧪 Testing Strategy

### Client
1.  **Unit Tests**: `Vitest` for utility functions and complex hooks.
2.  **Component Tests**: `React Testing Library` for shared components (Buttons, Inputs).
3.  **Integration Tests**: Test critical flows (e.g., "Login Flow") mocking the API.

### Server
1.  **Unit Tests**: `Jest` (`.spec.ts`) for Services (mocking Repository/Prisma).
2.  **E2E Tests**: `Jest` (`.e2e-spec.ts`) for Controllers (hitting the full request pipeline).
