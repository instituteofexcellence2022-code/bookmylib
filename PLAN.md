# Library Management System - Project Plan

> **📂 Documentation Links**
> *   [**🏗️ Folder Structure & Architecture**](./STRUCTURE.md) - Detailed Monorepo setup (Client/Server).
> *   [**📱 Screen & UI Flows**](./SCREENS.md) - Detailed breakdown of every screen for Owner, Staff, and Student.

## 1. Tech Stack Recommendation

### Full-Stack Architecture (Next.js 14 App Router)
**Single Server Monolith** - Built as a **Progressive Web App (PWA)** with native mobile experience.
*   **What this means**:
    *   **Zero CORS**: Frontend and API served from same origin
    *   **Native Mobile Feel**: App-like experience with 60fps animations and mobile gestures
    *   **PWA Capable**: Install on home screen, works offline, no browser chrome
    *   **Responsive**: Desktop for Owner/Staff, mobile-first for Students

- **Framework**: **Next.js 14** (App Router) - Full-stack React framework with built-in optimizations
- **UI Framework**: **TailwindCSS 4** + **Shadcn/UI** - Polished, accessible, native-like components
- **Icons**: **Lucide React** - Beautiful, consistent, crisp icons
- **Theming**: **Dark Mode & Light Mode** (Built-in)
    - Implemented via CSS variables + `next-themes`
    - Persisted in `localStorage` with system preference detection
- **Animations**: **Framer Motion** + **React Spring** - Physics-based 60fps animations and gestures
- **Notifications**: **Sonner** - Beautiful toast notifications
- **PWA**: Built-in Next.js PWA support - Offline capabilities + home screen install
- **State Management**: 
    - **Server State**: **TanStack Query v5** - Automatic caching, background updates
    - **Client State**: **Zustand** - Lightweight and fast
    - **Complex Workflows**: **XState** - Finite state machines for admission wizards
- **Real-time**: **Socket.io** - Live seat occupancy, notifications, payment confirmations
- **Forms**: **React Hook Form** + **Zod** - High-performance form validation
- **Database**: **PostgreSQL** - Robust relational database
- **ORM**: **Prisma** - Excellent type safety and developer experience
- **Authentication**: **NextAuth.js** - Built-in auth with JWT and role management

## 2. Hosting Options (Easy & Low Cost)

Since we are using a **Single Server Next.js** approach (serving both frontend and API), hosting is extremely flexible and simple.

### Option A: Vercel (Recommended - Best Performance)
- **Why**: Built by Next.js creators, zero-config deployment, automatic optimizations
- **Architecture**:
    - **Full Stack**: Next.js app deployed as serverless functions + edge runtime
    - **Database**: External (e.g., **Neon** or **Supabase** for Postgres)
    - **Built-in**: Automatic image optimization, CDN, analytics
- **Process**:
    - Connect GitHub repository
    - Vercel automatically detects Next.js and deploys
    - Environment variables configured in dashboard
    - **Result**: Global CDN, automatic SSL, perfect Next.js integration

### Option B: Railway / Render (Easiest - All-in-One)
- **Why**: Zero config, includes database, connects to GitHub
- **Database**: Managed PostgreSQL included (free tier available)
- **Cost**: Free tier, then ~$5-7/mo for app + database
- **Process**:
    1. Push code to GitHub
    2. Connect repository to Railway/Render
    3. Platform detects Next.js + Prisma, auto-deploys
    4. Database provisioned automatically
    5. **Result**: Complete full-stack deployment in minutes

### Option C: VPS + Coolify (Most Control - Cheapest)
- **Why**: Full control, fixed price ($4-5/mo VPS), can host multiple apps
- **Tool**: **Coolify** (Open source alternative to Vercel/Netlify)
- **Process**:
    1. Buy $5 VPS (DigitalOcean, Hetzner, etc.)
    2. Install Coolify (one-command setup)
    3. Connect GitHub repositories
    4. Coolify builds and deploys Next.js + manages PostgreSQL
    5. **Result**: Complete control with modern deployment workflow

## 3. Architecture & Data Isolation

### Multi-Tenant, Multi-Branch Architecture with Data Isolation

We will use **Row-Level Isolation (Discriminator Column)** to ensure complete data isolation between different libraries.

#### 🏢 **Library (Tenant) Level**
- Each library operates as an independent business entity
- Complete data isolation - no library can access another library's data
- Library owners can manage multiple branches under their library

#### 🏬 **Branch Level**  
- Each library can have multiple physical branches
- Branches share the same library's data but operate independently
- Staff are assigned to specific branches within a library

#### 👥 **User Relationships with Data Isolation**
- **Students**: Independent users who can subscribe to ANY library (multi-tenant customers)
- **Owners**: Library owners who can ONLY access their own library's data (tenant isolation)
- **Staff**: Can ONLY access data for their specific branch within their library

#### 🔒 **Data Isolation Enforcement**
- **Database Level**: All tables include `library_id` column for row-level isolation
- **API Level**: Next.js API routes automatically inject `library_id` filter based on authenticated user
- **Middleware**: Automatic tenant context resolution ensures users only access their authorized data
- **Cross-Tenant Protection**: Students can access multiple libraries, but library data remains fully isolated

### Roles (RBAC) & Detailed Feature List

#### 👑 Owner - The "Control Center"
The Owner has full visibility and control over the entire organization (all branches).

*   **📊 Executive Dashboard**
    *   **Live Metrics**: Total Active Students, Seat Occupancy %, Today's Revenue, New Registrations.
    *   **Charts**: Revenue Trends (Daily/Monthly), Enrollment Growth.
    *   **Branch Comparison**: Compare performance across different branches.
*   **🏢 Branch Management**
    *   **Create/Edit Branches**: Set Name, Address, Google Maps Link.
    *   **Facilities Manager**: Toggle amenities (AC, WiFi, Locker, Parking, Water).
    *   **Shift Management**: Define shifts (Morning, Evening, Full Day) and timings.
    *   **Seat Layout**: Configure total seats and sections (e.g., "Quiet Zone").
*   **👥 Staff Management**
    *   **HR Portal**: Add/Remove Staff, Assign to specific Branch.
    *   **Roles & Permissions**: Define what staff can do (e.g., "Can Delete Payments?").
    *   **Payroll**: Track salaries and payouts.
*   **💰 Finance & Subscription Plans**
    *   **Plan Builder**: Create plans (e.g., "Monthly 8 Hours", "Yearly Premium").
    *   **Pricing Engine**: Set base price, taxes, and validity duration.
    *   **Revenue Reports**: Detailed breakdown by Branch, Plan, or Payment Method.
    *   **Expense Tracking**: Log operational expenses (Rent, Electricity, Repairs).
*   **📢 Marketing & Communication**
    *   **Announcements**: Broadcast notifications to All Students or Specific Branches.
    *   **Push Notifications**: Send real-time updates (via Firebase FCM) for Due Fees or Announcements.
    *   **Lead Management**: Track potential students ("Hot/Cold") and conversion status.
*   **🎁 Promotions & Offers Engine**
    *   **Coupon Manager**: Create and manage discount codes (Flat/Percentage) with usage limits.
    *   **Dynamic Rules**: Set constraints like "Min Order Value", "Specific Plan Only", or "New Users Only".
    *   **Referral System**: Configurable "Give X, Get Y" rewards for students who invite friends.
    *   **Bulk Generation**: Generate unique codes for corporate partners or events.
    *   **ROI Analytics**: Track which coupons drive revenue vs. just burning cash.
*   **⚡ Operational Override (Owner Mode)**
    *   **Switch Branch Context**: Owner can "View As" any branch and perform all Staff operations.
    *   **Full Access**: Can Admit Students, Collect Fees, and Mark Attendance for *any* branch.
    *   **Audit Log**: See which staff member performed which action.
*   **🛠️ Issue & Asset Command Center**
    *   **Global Issue Dashboard**: Kanban view of all maintenance issues across branches.
    *   **Vendor Management**: Directory of service providers (AC, Electrician) for quick dispatch.
    *   **Asset Lifecycle**: Track value and condition of assets (Chairs, Tables, ACs).

#### 👔 Staff (Branch Manager) - The "Operational Dashboard"
Staff members manage the day-to-day operations of a specific branch.

*   **⚡ Operational Dashboard**
    *   **Quick Actions**: One-click "New Admission", "Collect Fee", "Mark Attendance".
    *   **Live Status**: Who is currently in the library? (Checked-in count).
    *   **Shift Handover**: Track cash collected and tasks completed before signing off.
*   **👥 Lead & Enquiry Management**
    *   **Walk-in Register**: Digital log for visitors.
    *   **Follow-up System**: Track potential students and convert them to active members.
*   **🎓 Student Management**
    *   **Onboarding Wizard**: Fast registration flow (Personal Details -> Select Plan -> Assign Seat -> Payment).
    *   **KYC Verification**: Verify uploaded ID proofs (Aadhar/Student ID).
    *   **Profile View**: 360-degree view of a student (History, Payments, Attendance).
*   **💺 Seat & Queue Management**
    *   **Visual Seat Map**: See which seats are Occupied, Available, or Maintenance.
    *   **Seat Assignment**: Drag-and-drop or click to assign a seat.
    *   **Waiting List**: Manage queue for fully booked shifts.
*   **💸 POS (Point of Sale)**
    *   **Fee Collection**: Accept Cash/UPI, Record Transaction.
    *   **Receipts**: Auto-generate and WhatsApp/Email receipts.
    *   **Petty Cash**: Log small operational expenses (e.g., Tea/Coffee).
*   **📅 Attendance**
    *   **Manual Entry**: Mark check-in/out if biometric fails.
    *   **QR Scanner**: Built-in camera scanner for student entry.
*   **🛠️ Maintenance & Housekeeping**
    *   **Daily Checklist**: "Open/Close" tasks (e.g., Turn on AC, Check Water).
    *   **Report Issue**: Log broken items directly to the Owner's dashboard.

#### 🎓 Student (Mobile App) - The "Native Experience"
A mobile-first, app-like interface for the end users.

*   **🏠 Home Feed**
    *   **Digital ID Card**: Dynamic QR Code for entry/exit (Rotates every 30s).
    *   **My Seat**: Shows current assigned seat number and shift.
    *   **Live Occupancy**: Real-time view of how busy the library is.
    *   **Announcements**: Important updates from the library.
*   **🧠 Productivity Tools**
    *   **Focus Timer**: Built-in Pomodoro timer to track deep work sessions.
    *   **Daily Goals**: Set study targets (e.g., "Study 6 hours") and track progress.
    *   **Stats**: Weekly insights on study habits and peak productivity times.

*   **📅 Bookings & Renewals**
    *   **Browse Plans**: View available plans and amenities.
    *   **Select Seat**: Interactive map to pick a preferred seat (Window, AC, Quiet Zone).
    *   **Add-ons**: Book Lockers or Reserved Parking.
    *   **Auto-Renewal**: Reminder and easy one-tap renewal.
*   **💳 Wallet & Finance**
    *   **Prepaid Wallet**: Load money for Canteen, Printing, or Fine payments.
    *   **Payment History**: View past transactions and download invoices.
    *   **Refer & Earn**: Invite friends and earn wallet credits.
*   **🛠️ Campus Services & Safety**
    *   **Print Station**: Upload documents and pay for printing directly from app.
    *   **Cafeteria**: View menu and order coffee/snacks to seat.
    *   **Safety Center (SOS)**: Emergency panic button and quick dial for help.
    *   **Lost & Found**: Community board for lost items.
*   **🆘 Support Center**
    *   **Report Issue**: Form to report problems (Category: AC, WiFi, Cleaning).
    *   **Track Status**: See if the staff is working on the reported issue.
    *   **Profile & KYC**: Edit personal info and upload ID documents.

## 4. Advanced Integrations & Workflows

### 💳 Payments & Finance
*   **Payment Gateways**:
    *   **Razorpay** & **Cashfree**: Integrated for seamless online payments.
    *   **Deep Linking**: Support for UPI Apps (GPay, PhonePe, Paytm) directly from the mobile web app.
*   **Offline Payment Flow**:
    *   Staff can mark payments as "Received via Cash" or "Received via UPI (Personal QR)".
    *   Receipts are generated for both Online and Offline modes.
    *   **PDF Generator**: Auto-generate professional PDF Invoices/Receipts.

### 🆔 KYC & Verification
*   **Aadhar KYC**: Integration with **Cashfree Verification API** for OTP-based Aadhar verification.
*   **Document Upload**: Students upload Gov ID (Aadhar/Pan).
*   **Manual Verification**: Owner/Staff reviews uploaded docs -> Approves/Rejects -> Student gets notified.

### 📱 QR Attendance System (Bi-Directional)
*   **Scenario A: Student Scans (Self-Service)**
    *   Library displays a dynamic "Daily QR Code" on a screen/printout.
    *   Student opens App -> Scans QR -> Attendance Marked.
    *   *Geo-fencing check can be added later.*
*   **Scenario B: Staff Scans (Control)**
    *   Student shows their **Digital ID Card** (in-app QR).
    *   Staff opens App -> Scans Student QR -> Profile opens (Check-in/Check-out/View Details).

## 5. User Journey Flows (Visualizing the Experience)

### 🚀 Flow 1: New Student Admission (In-Branch)
1.  **Walk-in**: Student walks into the library.
2.  **Staff Dashboard**: Staff clicks "New Admission".
3.  **Details**: Enters Name, Phone (Auto-create User).
4.  **KYC**: Uploads Aadhar Photo (or sends link to student to upload).
5.  **Plan**: Selects "Monthly Plan" -> "Morning Shift".
6.  **Seat**: Shows Visual Map -> Clicks empty Seat #12.
7.  **Payment**: Student pays Cash ₹1000.
8.  **Complete**: Staff clicks "Mark Paid". System generates PDF Receipt + sends WhatsApp Welcome Message with Login Creds.

### 💳 Flow 2: Monthly Renewal (Remote)
1.  **Notification**: Student gets Push Notification: "Plan expires in 2 days".
2.  **Action**: Clicks notification -> Opens App.
3.  **Review**: Sees "Renew Monthly Plan - ₹1000".
4.  **Pay**: Clicks "Pay via UPI" -> Opens GPay -> Pays.
5.  **Success**: App shows "Plan Active until next month". Receipt downloaded.
6.  **Owner**: Dashboard revenue updates instantly.

### 📍 Flow 3: Daily Attendance
1.  **Arrival**: Student arrives at library door.
2.  **Scan**: Sees "Today's QR" printed on the desk.
3.  **App**: Opens App -> Scans QR.
4.  **Feedback**: App vibrates "Welcome, John! Seat #12 is ready".
5.  **Log**: Attendance marked as "Present" in backend.

## 6. Core Data Models (The Backbone)

To support all the features above, we will implement this robust schema:

*   **Global**: `User`, `Library` (Tenant), `Branch`.
*   **People**: `StaffProfile` (linked to Branch), `StudentProfile` (linked to Branch).
*   **Inventory**: `Seat` (with x,y coords for map), `Plan` (Subscription types).
*   **Operations**: `Enrollment` (Active Subscriptions), `Attendance` (Daily Logs), `Payment` (Financials).
*   **Support & Marketing**: `Issue` (Tickets), `Announcement`, `PromoCode`.

This schema ensures every feature from **Seat Booking** to **Revenue Reports** has a solid data foundation.

## 7. Implementation Roadmap

### Phase 1: Next.js Foundation & Data Layer
1.  **Project Setup**: Next.js 14 App Router with TypeScript and TailwindCSS
2.  **Landing Page**: Unified entry point with Role Toggle + PWA configuration
3.  **Database Schema**: Prisma schema for `Library`, `Branch`, `User`, `StudentProfile`, `StaffProfile`
4.  **Authentication**: NextAuth.js with JWT, role-based access, and tenant context

### Phase 2: Owner Dashboard (The "Control Center")
1.  **Branch & Plan Management**: CRUD operations with XState workflows
2.  **Staff Management**: Role-based user administration
3.  **Live Dashboard**: Real-time metrics with TanStack Query + Socket.io
4.  **Operational Override**: Context switching between branches

### Phase 3: Staff Operations (The "Workhorse")
1.  **Admission Wizard**: Multi-step form with XState state machine
2.  **POS System**: Payment collection with offline/online modes
3.  **Seat Management**: Interactive seat map with real-time occupancy
4.  **PDF Generation**: Server-side receipt generation

### Phase 4: Student App (Native Mobile Experience)
1.  **Mobile UI**: Bottom navigation, gesture interactions, 60fps animations
2.  **Digital ID**: Dynamic QR codes with Socket.io real-time updates
3.  **Profile Management**: Document upload with drag-and-drop
4.  **Payment Integration**: Razorpay/Cashfree with deep linking

### Phase 5: Advanced Features & Polish
1.  **QR Scanner**: In-app camera integration for attendance
2.  **Real-time Features**: Socket.io for live occupancy and notifications
3.  **PWA Optimization**: Offline capabilities, background sync
4.  **Performance**: Code splitting, image optimization, bundle analysis
5.  **Analytics**: User behavior tracking and performance monitoring
