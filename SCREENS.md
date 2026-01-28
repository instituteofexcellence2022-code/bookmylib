# Screen Planning & UI Specifications (Comprehensive)

> **🎯 Target**: 100+ Granular Screens/States for "Native Mobile" Experience.
> **🎨 Design System**: Shadcn/UI + Framer Motion + Lucide Icons.
> **🌗 Theme**: All screens support Light/Dark mode (Toggle in Header).

---

## 1. 🌐 Public, Auth & Global (15 Screens)

### 1.1. Landing & Onboarding
1.  **Unified Landing Page** (`/`)
    *   **UI**: Hero section with 3-tab toggle (Student/Staff/Owner). Dynamic illustration changes based on tab.
    *   **Action**: "Login" button (context-aware), "Install App" sticky bottom bar (mobile).
2.  **PWA Install Prompt (Mobile)** (Modal/Overlay)
    *   **UI**: Bottom sheet with app icon, benefits list, "Add to Home Screen" button.
3.  **App Splash Screen** (Client-side)
    *   **UI**: Logo animation, loading progress bar, version number.
4.  **Onboarding Step 1: Welcome** (`/intro/1`)
    *   **UI**: "Your Digital Library" illustration. Next button.
5.  **Onboarding Step 2: Features** (`/intro/2`)
    *   **UI**: "Book Seats, Track History" illustration. Next button.
6.  **Onboarding Step 3: Get Started** (`/intro/3`)
    *   **UI**: "Join [Library Name]" illustration. "Get Started" button -> Login.

### 1.2. Authentication
7.  **Login Selection** (`/auth/role`)
    *   **UI**: 3 Cards: Student, Staff, Owner. (If not deep-linked).
8.  **Login Screen** (`/auth/login`)
    *   **UI**: Mobile Number/Email Input, Password Input, "Remember Me".
9.  **Forgot Password: Input** (`/auth/forgot-password`)
    *   **UI**: Enter Email/Phone. "Send OTP" button.
10. **Forgot Password: OTP Verify** (`/auth/verify-otp`)
    *   **UI**: 6-digit OTP input, countdown timer, "Resend" link.
11. **Reset Password** (`/auth/reset-password`)
    *   **UI**: New Password, Confirm Password. Success animation on submit.
12. **Student Registration Interest** (`/auth/register-interest`)
    *   **UI**: Name, Phone, "Preferred Branch" dropdown. "Notify Me" button.

### 1.3. System States
13. **Offline Mode** (Global Overlay)
    *   **UI**: Fullscreen "No Internet" illustration. "Retry" button. Access to offline ID card.
14. **404 Not Found** (`*`)
    *   **UI**: "Lost in the stacks?" illustration. "Go Home" button.
15. **500 Server Error**
    *   **UI**: "System Maintenance" or error graphic. Support contact link.

---

## 2. 👑 Owner Console (50 Screens)

### 2.1. Dashboard & Analytics
16. **Executive Dashboard** (`/owner/dashboard`)
    *   **UI**: High-level KPIs (Revenue, Occupancy). "Actionable Alerts" widget (Low Stock, Staff Late).
17. **Notification Center** (`/owner/notifications`)
    *   **UI**: Central hub for all alerts. Filter by Urgency (Critical, Info). "Mark all read".
18. **Revenue Drill-down** (`/owner/analytics/revenue`)
    *   **UI**: Date range picker, Line charts (Daily/Monthly), Export to CSV.
19. **Occupancy Analytics** (`/owner/analytics/occupancy`)
    *   **UI**: Heatmap of peak hours, Seat utilization %.
20. **Live Activity Feed** (`/owner/activity`)
    *   **UI**: Real-time log: "Student X entered", "Payment Y received". Filter by branch.
21. **Global Issue Dashboard** (`/owner/issues`)
    *   **UI**: Kanban view of all escalated issues across branches.
22. **System Health Monitor** (`/owner/system/health`)
    *   **UI**: Server status, Database connection, Last backup timestamp.

### 2.2. Branch Management
23. **Branch List** (`/owner/branches`)
    *   **UI**: Grid of branch cards with status (Open/Closed) and active count.
24. **Branch Performance Report** (`/owner/branches/performance`)
    *   **UI**: Table comparing Profit/Loss, Student count, and Staff efficiency per branch.
25. **Create Branch: Basic Info** (`/owner/branches/new/1`)
    *   **UI**: Name, Address, City, Phone.
26. **Create Branch: Location** (`/owner/branches/new/2`)
    *   **UI**: Google Maps integration to pin exact location.
27. **Branch Details: Overview** (`/owner/branches/:id`)
    *   **UI**: Summary stats, "Edit" button, "Delete" (danger zone).
28. **Branch Amenities Config** (`/owner/branches/:id/amenities`)
    *   **UI**: Toggles for AC, WiFi, Water, Locker, Parking.
29. **Branch Shift Config** (`/owner/branches/:id/shifts`)
    *   **UI**: List of shifts. Add/Edit Shift Modal (Time Start/End).
30. **Seat Layout Editor: Canvas** (`/owner/branches/:id/layout`)
    *   **UI**: Draggable grid. Tools: Seat, Wall, Door, Desk.
31. **Seat Layout: Section Config** (Modal)
    *   **UI**: Name section (e.g., "Quiet Zone"), set color code.
32. **Seat Layout: Bulk Add** (Modal)
    *   **UI**: "Add 20 seats in 4 rows".
33. **QR Code Manager** (`/owner/branches/:id/qr`)
    *   **UI**: Display Branch QR (for attendance). "Rotate QR" button for security. Print preview.
34. **Asset & Inventory Log** (`/owner/branches/:id/assets`)
    *   **UI**: List of physical assets (e.g., "5 ACs", "50 Chairs"). Condition status.

### 2.3. Staff & HR
35. **Staff Directory** (`/owner/staff`)
    *   **UI**: Searchable table. Filters: Branch, Role.
36. **Staff Profile: Overview** (`/owner/staff/:id`)
    *   **UI**: Photo, Contact, Assigned Branch, Performance Score.
37. **Staff Profile: Activity Log** (`/owner/staff/:id/logs`)
    *   **UI**: Granular history: "Marked Student X present", "Deleted Receipt Y". Timestamped.
38. **Staff Attendance Report** (`/owner/staff/attendance`)
    *   **UI**: Calendar view of staff check-ins/outs. Late arrival highlighter.
39. **Add Staff: Personal Details** (`/owner/staff/new/1`)
    *   **UI**: Name, Email, Phone, Photo upload.
40. **Add Staff: Branch & Role** (`/owner/staff/new/2`)
    *   **UI**: Branch dropdown, Permissions checkboxes.
41. **Payroll Manager** (`/owner/finance/payroll`)
    *   **UI**: List of staff, Salary due, "Mark Paid" button.
42. **Payroll History** (`/owner/finance/payroll/history`)
    *   **UI**: Past payouts, downloadable receipts.

### 2.4. Student Management (Super View)
43. **Global Student Directory** (`/owner/students`)
    *   **UI**: Search across ALL branches. Advanced filters (Expired, Due Payment, Blocked).
44. **Student 360 Profile: Overview** (`/owner/students/:id`)
    *   **UI**: Personal info, Current Plan, Assigned Branch/Seat. "Block User" toggle.
45. **Student 360: Financials** (`/owner/students/:id/finance`)
    *   **UI**: Lifetime value, All receipts, Pending Dues. "Manual Plan Override" button.
46. **Student 360: Attendance History** (`/owner/students/:id/attendance`)
    *   **UI**: Heatmap of attendance. "Absent Streak" indicator.
47. **Student 360: Activity Logs** (`/owner/students/:id/logs`)
    *   **UI**: System logs: "Seat changed by Staff A", "Plan renewed by Staff B".

### 2.5. Subscription & Fee Management
48. **Subscription Plans List** (`/owner/plans`)
    *   **UI**: Active plans cards. Toggle Active/Inactive. Sort by Popularity.
49. **Create Plan: Basics** (`/owner/plans/new`)
    *   **UI**: Name (e.g., "Monthly Full Day"), Price, Duration, Description.
50. **Create Plan: Access Rules** (`/owner/plans/new/rules`)
    *   **UI**: Select allowed shifts, Select allowed branches.
51. **Create Plan: Dynamic Pricing** (`/owner/plans/new/pricing`)
    *   **UI**: Set "Peak Season" surcharge or "Long-term" discount rules.
52. **Fee Structure & Taxes** (`/owner/plans/taxes`)
    *   **UI**: Configure GST Slabs (0%, 5%, 18%). Invoice Series prefix.
53. **Late Fee Policy** (`/owner/plans/late-fee`)
    *   **UI**: Rules engine: "If overdue > 3 days, add ₹50/day".

### 2.6. Promotions & Offers Engine (New)
54. **Promotions Dashboard** (`/owner/promos`)
    *   **UI**: ROI Widgets (Total Discount vs Revenue Gained), Active Coupons count.
55. **Coupon Manager** (`/owner/promos/coupons`)
    *   **UI**: List view. Status toggle. "Clone Coupon" action.
56. **Create Coupon: Logic** (`/owner/promos/coupons/new`)
    *   **UI**: Code (e.g., WELCOME50), Type (Flat/%), Max Discount Amount.
57. **Create Coupon: Constraints** (`/owner/promos/coupons/rules`)
    *   **UI**: Min Order Value, Specific Plan (e.g., "Yearly Only"), Branch Restriction.
58. **Bulk Coupon Generator** (`/owner/promos/bulk`)
    *   **UI**: Generate 50 unique codes for corporate tie-up. Export to CSV.
59. **Referral Program Config** (`/owner/promos/referral`)
    *   **UI**: "Referrer gets ₹100 Wallet Credit", "Referee gets 10% Off".
60. **Auto-Apply Offers** (`/owner/promos/auto`)
    *   **UI**: Rules: "If Duration > 3 months, Apply 5% Off".
61. **Campaign Analytics** (`/owner/promos/analytics`)
    *   **UI**: Heatmap of coupon usage time. "Top Referring Students" leaderboard.

### 2.7. Revenue & Collection (Finance Center)
62. **Finance Overview** (`/owner/finance/overview`)
    *   **UI**: Net Profit, Total Revenue, Total Expense, Outstanding Dues widgets.
63. **Daily Collection Report** (`/owner/finance/daily`)
    *   **UI**: Aggregated view of Cash/UPI collected today across all branches. Verify & Approve button.
64. **Transaction Ledger** (`/owner/finance/ledger`)
    *   **UI**: Master list of ALL transactions. Search by Transaction ID, Student, or Staff.
65. **Pending Dues List** (`/owner/finance/dues`)
    *   **UI**: List of all students with expired plans. "Send Bulk Reminder" action.
66. **Expense Manager** (`/owner/finance/expenses`)
    *   **UI**: List of operational expenses. Filter by category. Approve/Reject staff expenses.
67. **Add Expense Form** (`/owner/finance/expenses/new`)
    *   **UI**: Amount, Date, Category, Attach Receipt image.
68. **Payouts & Salary** (`/owner/finance/payouts`)
    *   **UI**: Track staff salaries and vendor payments.
69. **Refund Request Manager** (`/owner/finance/refunds`)
    *   **UI**: Queue of refund requests. Action: "Approve (Credit Note)" or "Reject".

### 2.8. Issue Tracking & Resolution Center
70. **Global Issue Dashboard** (`/owner/issues`)
    *   **UI**: Kanban Board (New -> In Progress -> Escalated -> Resolved).
    *   **Filters**: By Branch, By Severity (Critical, High, Normal), By Category (WiFi, AC, Cleaning).
71. **Ticket Detail View** (`/owner/issues/:id`)
    *   **UI**: Thread view. "Internal Note" (Staff only) vs "Public Reply".
    *   **Actions**: "Assign to Staff", "Mark as Resolved", "Escalate to Vendor".
    *   **History**: Timeline of status changes.
72. **Vendor Management** (`/owner/issues/vendors`)
    *   **UI**: List of service providers (e.g., "AC Technician", "ISP Support").
    *   **Action**: "Call Now", "WhatsApp Work Order".
73. **Maintenance Schedule** (`/owner/issues/maintenance`)
    *   **UI**: Calendar view of recurring maintenance tasks (e.g., "Monthly AC Service").
74. **Issue Analytics** (`/owner/issues/analytics`)
    *   **UI**: Charts: "Average Resolution Time", "Issues by Category", "Most Active Branch".

### 2.9. Marketing & CRM
75. **Announcement Center** (`/owner/marketing/announcements`)
    *   **UI**: List of past broadcasts. "New Announcement" button.
76. **Compose Announcement** (`/owner/marketing/compose`)
    *   **UI**: Title, Body, Image upload, Target Audience selector.
77. **Push Notification Preview** (Modal)
    *   **UI**: Mobile phone mockup showing how notification looks.
78. **Lead Management** (`/owner/marketing/leads`)
    *   **UI**: List of "Registered Interest" users who haven't paid. "Call" action.

### 2.10. Settings & Override
79. **Organization Settings** (`/owner/settings/org`)
    *   **UI**: Logo upload, Brand color picker, Legal name.
80. **Owner Profile** (`/owner/settings/profile`)
    *   **UI**: Change Password, Two-Factor Auth toggle.
81. **Data Export Center** (`/owner/settings/export`)
    *   **UI**: Download full DB dump, Student CSV, Financial Reports.
82. **System Audit Logs** (`/owner/settings/logs`)
    *   **UI**: Immutable security log: "Admin X deleted Branch Y". IP Address tracking.
83. **Operational Override Mode** (`/owner/override`)
    *   **UI**: "Select Branch to Manage". Redirects to Staff Dashboard.

---

## 3. 👔 Staff Operations (40 Screens)

### 3.1. Dashboard & Shift Management
84. **Staff Dashboard** (`/staff/dashboard`)
    *   **UI**: Quick Stats (Occupancy %, Due Renewals Today, Pending Inquiries).
    *   **Widgets**: "My Shift Timer" (Clock In/Out), "Urgent Tasks".
85. **Shift Status & Handover** (`/staff/shift`)
    *   **UI**: Current shift duration, Break timer. "End Shift" triggers Handover flow.
86. **Shift History** (`/staff/shift/history`)
    *   **UI**: Log of my past shifts. "View Handover Notes" from previous days.
87. **Notifications Hub** (`/staff/notifications`)
    *   **UI**: Real-time alerts: "Seat 5 reported broken", "Payment received online".
88. **Quick Actions Sheet** (FAB Menu)
    *   **UI**: Floating menu: "New Admission", "Collect Fee", "Scan QR", "Report Issue".

### 3.2. Enquiry & Lead Management
89. **Walk-in Register** (`/staff/leads/new`)
    *   **UI**: Quick form: Name, Phone, Purpose (Visit/Enquiry).
90. **Lead Dashboard** (`/staff/leads`)
    *   **UI**: List of open enquiries. Status tags: "Hot", "Cold", "Follow-up".
91. **Lead Interaction Log** (`/staff/leads/:id`)
    *   **UI**: Call history, Notes ("Promised to join next week"), "Convert to Student" button.

### 3.3. Student Operations
92. **Student Directory** (`/staff/students`)
    *   **UI**: Searchable list. Filters: Active, Expired, Blocked. "WhatsApp" quick action.
93. **Student Profile 360** (`/staff/students/:id`)
    *   **UI**: Read-only view of Owner's 360. Tabs: Info, Plan, History.
    *   **Actions**: "Edit Contact Info", "Reset Password".
94. **KYC Verification Center** (`/staff/students/kyc`)
    *   **UI**: Queue of pending ID proofs. Split view (Doc vs Data). Actions: "Approve", "Reject (with reason)".
95. **Communication Log** (`/staff/students/:id/comms`)
    *   **UI**: Add note: "Called parent regarding fee". View past SMS/Emails sent.
96. **ID Card Center** (`/staff/students/:id/id-card`)
    *   **UI**: Digital ID preview. "Print" button (sends to connected printer), "Share Link".

### 3.4. Admission & Renewal (The Core Flow)
97. **New Admission: Wizard Step 1** (`/staff/admission/1`)
    *   **UI**: Personal Details. Auto-fill if converted from Lead.
98. **New Admission: Wizard Step 2** (`/staff/admission/2`)
    *   **UI**: Plan Selection. Show available discounts.
99. **New Admission: Wizard Step 3** (`/staff/admission/3`)
    *   **UI**: Seat Selection (Interactive Map). Filter by "Vacant".
100. **New Admission: Wizard Step 4** (`/staff/admission/4`)
    *   **UI**: Payment & Checkout. Calculate Taxes.
101. **Renewal Wizard** (`/staff/renew/:studentId`)
    *   **UI**: Simplified flow. "Repeat Last Plan" or "Upgrade".
    *   **Action**: "Adjust Start Date" (if renewing late).

### 3.5. Seat & Facility Management
102. **Live Floor Map** (`/staff/seats`)
    *   **UI**: Visual representation of library. Color coded: Green (Free), Red (Occupied), Grey (Maintenance).
103. **Seat Details Action Sheet** (Bottom Sheet)
    *   **UI**: Click on seat -> Show Student Name, Plan Expiry. Actions: "Swap", "Release".
104. **Seat Swap Wizard** (`/staff/seats/swap`)
    *   **UI**: "Move [Student] from [Seat A] to [Seat B]". Confirm Plan compatibility.
105. **Maintenance Marker** (`/staff/seats/maintenance`)
    *   **UI**: Mark seat/asset as broken. "Block Booking" toggle.

### 3.6. Financials & Cash Ops
106. **Collect Fee (Point of Sale)** (`/staff/finance/collect`)
    *   **UI**: Enter Amount/Select Pending Invoice. Modes: Cash, UPI (QR), POS Terminal.
107. **Payment Success & Receipt** (`/staff/finance/success`)
    *   **UI**: Green tick. "Print Receipt", "Email Receipt", "Share WhatsApp".
108. **Daily Collection Report** (`/staff/finance/daily`)
    *   **UI**: Ledger of all money collected by *me* today. Total Cash in Hand.
109. **Cash Handover Form** (`/staff/finance/handover`)
    *   **UI**: End of shift protocol. Enter denomination count (100x5, 500x2). "Submit to Owner".
110. **Petty Cash Expense** (`/staff/finance/expense`)
    *   **UI**: Log small operational costs (Tea, Stationery). Upload bill photo.
111. **Void Transaction Request** (`/staff/finance/void`)
    *   **UI**: Select transaction -> Request Refund/Cancellation. Reason required. (Triggers Owner Alert).

### 3.7. Attendance & Access Control
112. **QR Entry Scanner** (`/staff/scan`)
    *   **UI**: Continuous scanning mode. Green screen for "Allowed", Red for "Denied/Expired".
113. **Manual Attendance Register** (`/staff/attendance/manual`)
    *   **UI**: List view of active students. Toggle "Present/Absent". Search by name.
114. **Late Entry/Exit Log** (`/staff/attendance/late`)
    *   **UI**: List of students entering after cutoff time. Add remark.

### 3.8. Housekeeping & Issues
115. **Daily Task Checklist** (`/staff/tasks`)
    *   **UI**: List of assigned duties (e.g., "Check AC Temp", "Clean Water Cooler"). Checkbox to complete.
116. **Report Incident** (`/staff/issues/new`)
    *   **UI**: Create ticket for Maintenance/IT. Priority selector.
117. **My Tickets** (`/staff/issues/mine`)
    *   **UI**: Track status of issues I reported. Reply to Owner/Vendor.

### 3.9. My HR (Staff Personal)
118. **My Profile & Settings** (`/staff/profile`)
    *   **UI**: Personal details, Change Password.
119. **Emergency Contacts** (`/staff/emergency`)
    *   **UI**: Quick access buttons: "Call Owner", "Call Police", "Fire Dept".
120. **My Attendance History** (`/staff/profile/attendance`)
    *   **UI**: Calendar view of my shifts.
121. **Leave Application** (`/staff/profile/leave`)
    *   **UI**: Date picker, Reason, "Apply".
122. **Salary Slips** (`/staff/profile/salary`)
    *   **UI**: List of generated payslips. Download PDF.

---

## 4. 🎓 Student Mobile App (54 Screens)

### 4.1. Onboarding & Authentication
123. **Splash Screen** (`/student/splash`)
    *   **UI**: Animated Logo, Tagline "Your Space to Succeed".
124. **Login / OTP** (`/student/auth/login`)
    *   **UI**: Phone Number input, "Send OTP", "Login with WhatsApp".
125. **OTP Verification** (`/student/auth/verify`)
    *   **UI**: 4-digit input, Auto-read SMS.
126. **Welcome Slides** (`/student/onboarding/intro`)
    *   **UI**: Carousel: "Book Seat", "Track Progress", "Join Community".
127. **Study Profile Setup** (`/student/onboarding/profile`)
    *   **UI**: "What are you preparing for?" (UPSC, CA, NEET, Remote Work). Used for community matching. Select Avatar.

### 4.2. Home & Dashboard
128. **Home Feed** (`/student/home`)
    *   **UI**: "Good Morning, [Name]", Daily Quote.
    *   **Widgets**: Live Occupancy, "My Seat" Status, Streak Counter.
129. **Check-in Action Sheet** (`/student/check-in`)
    *   **UI**: "Scan QR to Enter" or "Manual Check-in" (if GPS verified).
130. **Announcements Feed** (`/student/announcements`)
    *   **UI**: List of admin updates (e.g., "Holiday Notice").
131. **Announcement Detail** (`/student/announcements/:id`)
    *   **UI**: Full text, Image, "Mark as Read".
132. **Notification Center** (`/student/notifications`)
    *   **UI**: "Your seat expires in 2 days", "New Reply on Ticket". Filter by Urgency.

### 4.3. Booking & Subscriptions
133. **Explore Branches** (`/student/book/explore`)
    *   **UI**: Map view / List view of nearby libraries. Distance sorting.
134. **Branch Details** (`/student/book/branch/:id`)
    *   **UI**: Photos, Amenities Icons (AC, WiFi, Locker), Reviews, "Book Now". Amenities Map.
135. **Plan Selection** (`/student/book/plan`)
    *   **UI**: Card view of plans (Daily, Monthly). "Best Value" tag.
136. **Shift Selection** (`/student/book/shift`)
    *   **UI**: Morning (8-2), Evening (2-8), Full Day.
137. **Seat Selection (Map)** (`/student/book/seat`)
    *   **UI**: Pan & Zoom map. Filters: "Window Seat", "Near AC", "Quiet Zone".
138. **Seat Preview** (Bottom Sheet)
    *   **UI**: Selected Seat #45. "Power Socket: Yes". Price breakdown.
139. **Add-ons Selection** (`/student/book/addons`)
    *   **UI**: "Add Locker (+₹200)", "Add Reserved Parking".
140. **Order Summary** (`/student/book/summary`)
    *   **UI**: Itemized bill. Apply Coupon Code input.
141. **Payment Gateway** (`/student/book/pay`)
    *   **UI**: Razorpay/Cashfree wrapper. UPI/Card/Wallet.
142. **Booking Success** (`/student/book/success`)
    *   **UI**: Confetti animation. "Seat #45 is yours!". "View ID Card".

### 4.4. My Zone (Active Student)
143. **My Plan Dashboard** (`/student/my-plan`)
    *   **UI**: Visual progress bar of validity. "Days Left: 12".
144. **Digital ID Card** (`/student/id-card`)
    *   **UI**: Flip animation. Dynamic QR Code (rotates every 30s).
145. **Upgrade Plan** (`/student/my-plan/upgrade`)
    *   **UI**: "Switch to Full Day". Prorated cost calculation.
146. **Renew Plan** (`/student/my-plan/renew`)
    *   **UI**: "Repeat Last Order". Quick checkout.
147. **Pause Membership** (`/student/my-plan/pause`)
    *   **UI**: Date picker for pause start/end. Shows "Pause Fees" if any.

### 4.5. Productivity & Tools
148. **Productivity Hub** (`/student/tools`)
    *   **UI**: Menu of tools: Timer, Goals, White Noise, Print, Coffee.
149. **Focus Timer (Pomodoro)** (`/student/tools/timer`)
    *   **UI**: Circular timer (25:00). "Deep Work" mode (blocks notifications). "Group Sync" toggle.
150. **Daily Goals** (`/student/tools/goals`)
    *   **UI**: "Study 6 Hours today". Progress ring.
151. **Todo List** (`/student/tools/todo`)
    *   **UI**: Simple checklist. "Finish Chapter 4".
152. **Focus Stats** (`/student/tools/stats`)
    *   **UI**: Charts: "Focus Hours this week". "Most productive time".
153. **Print Station** (`/student/tools/print`)
    *   **UI**: Upload PDF. Settings (B/W, Color, Copies). "Pay & Print" (Deducts from Wallet).
154. **Cafeteria / Coffee Run** (`/student/tools/food`)
    *   **UI**: Simple Menu (Tea, Coffee, Snacks). "Deliver to Seat #45". Pay via Wallet.

### 4.6. Referral Program
155. **Refer & Earn Dashboard** (`/student/refer`)
    *   **UI**: "Invite Friend, Get ₹100". Share via WhatsApp.
156. **Referral History** (`/student/refer/history`)
    *   **UI**: List of successful referrals and rewards earned.

### 4.7. Wallet & Payments
161. **My Wallet** (`/student/wallet`)
    *   **UI**: Current Balance. "Add Money" button.
162. **Top-up Wallet** (`/student/wallet/add`)
    *   **UI**: Enter Amount. Pre-set chips (₹100, ₹500).
163. **Transaction History** (`/student/wallet/history`)
    *   **UI**: All debits/credits. Filter by "Fees", "Canteen", "Print".
164. **Invoice Viewer** (`/student/wallet/invoice/:id`)
    *   **UI**: PDF Render. Share/Download.

### 4.8. Support & Safety
165. **Help Center** (`/student/support`)
    *   **UI**: FAQ Categories. "Chat with Staff".
166. **Report Issue** (`/student/support/new`)
    *   **UI**: "AC not working". Upload photo. Select Priority.
167. **Safety Center (SOS)** (`/student/support/safety`)
    *   **UI**: Big Red Button "Emergency Alert" (Notifies Staff/Owner). Police/Ambulance speed dial.
168. **My Tickets** (`/student/support/tickets`)
    *   **UI**: Status of reported issues (Open/Resolved).
169. **Ticket Detail** (`/student/support/tickets/:id`)
    *   **UI**: Chat thread with Admin/Staff.
170. **App Feedback** (`/student/feedback`)
    *   **UI**: Star rating. Text area for suggestions.

### 4.9. Settings & Profile
171. **Student Profile** (`/student/profile`)
    *   **UI**: Avatar, Personal Info, "Preparing for UPSC".
172. **Edit Profile** (`/student/profile/edit`)
    *   **UI**: Update Phone, Email, Emergency Contact.
173. **KYC Status** (`/student/profile/kyc`)
    *   **UI**: "Verified" badge. Or upload docs if pending.
174. **App Settings** (`/student/settings`)
    *   **UI**: Dark Mode, Notification Preferences, Language.
175. **Security Settings** (`/student/settings/security`)
    *   **UI**: Change Password, Biometric Login (FaceID/TouchID) toggle.
176. **Legal & About** (`/student/about`)
    *   **UI**: Terms of Service, Privacy Policy, App Version.
