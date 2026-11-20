# HTSK Mobile Management System

A production-grade, enterprise **Company Mobile Device Inventory, Shift Handover & Daily Task Management Platform** built for high-throughput daily device operations, real-time custody tracking, and multi-round shift accountability.

---

## 📑 Table of Contents
- [Key Features](#-key-features)
- [System Architecture & Modules](#-system-architecture--modules)
- [Operational Logic & Workflows](#-operational-logic--workflows)
- [Security, Roles & Permissions](#-security-roles--permissions)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Git Repositories](#-git-repositories)

---

## 🌟 Key Features

### 1. Dashboard & Real-Time KPIs
- **4 Interactive KPI Summary Cards:**
  - **Total Mobile Phones (241):** Full fleet catalog overview across all series.
  - **Active Mobile Phones:** Devices currently checked out and in use by shift workers.
  - **Available in Stock:** Devices currently docked in charging racks and ready for deployment.
  - **Need an Update:** Devices flagged with pending handovers or unreturned status.
- **Interactive Calendar Drawer:** Filter records and metrics by specific dates (e.g., Nov 17, 18, 19, 20) with active day indicators.
- **Ambient Visual Effects:** Configurable card animation engine (Snow, Rain, Sparkle) with admin toggle and per-user permission control.

### 2. Daily Task & Multi-Round Tracking
- **Intra-Day Round Auditing:** Track multiple device sweeps per day (e.g. `Task 19.1 : Time 8.30 A.M.`, `Task 19.2 : Time 02.00 P.M.`).
- **Separate Scroll Containers:** Each round has an independent scrollable table container for streamlined review without endless page scrolling.
- **Attention & Drop Highlights:** Missing or dropped devices between rounds are highlighted in red for immediate supervisor inspection.
- **1-Click Resolutions:** Quickly mark unverified devices as **Returned in Office** or **Missing**, automatically synchronizing historical records and previous rounds.
- **Accurate Return Accounting:** Accurately accounts for repeated device return events (e.g., PN 34 returned across multiple shifts/employees on the same day).

### 3. Comprehensive Inventory Management
- **241 Pre-Cataloged Devices:**
  - **PN Series (122 Units):** `PN 1` to `PN 122` (Charging Station A)
  - **NEW Series (90 Units):** `NEW 1` to `NEW 90` (Rack B-1)
  - **CASS Series (29 Units):** `CASS 1` to `CASS 29` (Station B)
- **Live Custodian Syncing:** Real-time linkage showing which employee currently holds each device.
- **Card & Table Views:** Switch between visual device cards and dense tabular data with search and status filtering.

### 4. Smart Ingestion & Data Update
- **Flexible File Support:** Ingest device lists from Excel (`.xlsx`, `.xls`), CSV, Word (`.docx`), PDF, and Images (`.png`, `.jpg`).
- **Automated Signature & OCR Recognition:** Automatically interprets marked/signed rows as `Done` and unsigned rows as `Pending`.
- **Quick Daily Active List Entry:** Fast-entry textarea for pasting daily device numbers with auto-numbered employee assignment and live preview.

### 5. Authentication & Sensitive Data Security
- **Mandatory First-Load Login:** In order to safeguard sensitive operational records and employee contact data, the application strictly requires authentication on first load before rendering any workspace data or making API calls.
- **Server-Side Authentication API (`/api/login`, `/api/auth/verify`):** Real-time credential validation against the SQLite `system_users` database, cryptographically random session tokens, and instant invalidation on account deactivation.
- **Audit Logging of All Login Events:** Successful and rejected login attempts are recorded into `audit_logins` with IP address and timestamp.
- **Anti-Brute Force Protection:** Automatic temporary security lockout after 5 consecutive failed attempts.
- **Protected Administrator Accounts:** Core administrative accounts (e.g., `Shanaka`, `Admin`) cannot be set to Inactive or deleted.
- **Dedicated View-Only Role (`Viewer`):**
  - Read-only visibility into current devices, stock catalog, KPI statistics, daily rounds, and activity history.
  - Restricted from mutating data: all add, edit, delete, custody handover, quick notes, and device resolution controls are automatically hidden from the UI and strictly protected with `403 Forbidden` response guards on the backend.
  - The `User manage` workspace navigation and administrative profile shortcuts are hidden from viewer accounts.
- **Admin Permission Management & Capability Matrix Grid (Shanaka Control):**
  - Shanaka (Admin) can view and toggle permissions for all roles directly in the interactive **Role Capability Matrix** grid table.
  - Multi-column table layout: `Capability Description` column alongside role columns (`Admin`, `Viewer`, `Developer`, `Supervisor`, `Staff`).
  - **Explicit View-Only Capabilities:**
    - `view_devices`: `View Mobile Devices (Only View)`
    - `view_daily_tasks`: `View Daily Tasks (Only View)`
    - `view_inventory`: `View Inventory Stock (Only View)`
  - **Granular Operational Capabilities:**
    - `manage_devices`: `Add & Edit Mobile Devices`
    - `manage_groups_shifts`: `Add & Edit Shifts`
    - `handover_devices`: `Perform Shift Handover`
    - `return_devices`: `Accept Inventory Returns`
    - `manage_users`: `Create & Manage User Accounts`
    - `view_audit_logs`: `View System Audit Logs`
    - `delete_records`: `Delete Records`
  - Real-time instant toggling with sleek lime-green toggle switches and immediate persistence to the SQLite database via `PUT /api/permissions/toggle`.
- **Dynamic Role Creation:** Admins can create custom roles (e.g., *Manager*, *Auditor*, *Technician*) directly from the user creation dropdown with auto-generated permission templates.
- **Role Filtering:** Filter user listings and permission matrix by specific roles.
- **Per-User Animation Visibility:** Granular toggle controlling which users see ambient animations on their dashboard.

### 6. Admin Profile Management & Interactive Dropdown Menu
- **Interactive Profile Capsule & Dropdown:** Clicking the top-right user profile pill in any workspace view opens a themed dropdown menu showcasing the user's avatar, full name, username handle, and active role badge.
- **Profile Customization (`ProfileModal.jsx`):**
  - **Avatar & Photo:** Live preview with one-click selection from curated presets, custom image file upload (`/api/profile/avatar`), or custom image URL input.
  - **Full Name, Username & Email:** Editable with real-time uniqueness validation against existing system accounts.
  - **Password & Security:** Self-service password change with existing password verification for protection of sensitive data.
- **Instant Synchronization:** Updates apply immediately to header avatars, local storage, session state, and SQLite database.

### 7. Audit Trail & History
- Complete chronological history log recording all device additions, edits, returns, shift handovers, and administrative logins.

---

## 🏛 System Architecture & Modules

```
htsk-mobile-mgmt/
├── client/                     # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx           # Main KPI & Calendar view
│   │   │   ├── DailyTaskSection.jsx    # Multi-round task management
│   │   │   ├── InventorySection.jsx    # 241 phone catalog & custody
│   │   │   ├── UpdateSection.jsx       # Document & list ingestion
│   │   │   ├── UserManageSection.jsx   # Users, roles, permissions & animations
│   │   │   ├── HistorySection.jsx      # Audit logs & login history
│   │   │   ├── SettingsSection.jsx     # Shift timings & group setups
│   │   │   ├── Sidebar.jsx             # Fixed responsive navigation
│   │   │   ├── AdminLogin.jsx          # Secure admin access
│   │   │   └── SnowEffect.jsx          # Ambient card particle effects
│   │   ├── App.jsx                     # Master state & route coordinator
│   │   └── index.css                   # Unified system design & tokens
├── server/                     # Node.js + Express Backend
│   ├── database.js             # SQLite 3NF database engine & business logic
│   ├── index.js                # REST API endpoints & file ingestion
│   └── mobile_management.sqlite # Persistent SQLite database
└── package.json                # Project dependencies & scripts
```

---

## ⚡ Operational Logic & Workflows

1. **Shift Handover / Issue Time (`Issued At`):**
   - The timestamp when an employee is issued a mobile unit for their shift (e.g., `7.30 A.M.`).
2. **Device Return (`Return Time`):**
   - Recorded when the device is handed back to the charging station (e.g., `5.51 P.M.`).
3. **Device Tagging:**
   - Normalizes tags across different formats (`PN 34`, `Pn34`, `New 25`, `Cass 12`) to ensure uniform inventory tracking.
4. **Sign Status:**
   - **Done (Green):** Employee signed or verified return.
   - **Pending (Amber):** Currently active or awaiting verification.
   - **Missing (Red):** Unaccounted during intra-day round check.

---

## 🔒 Security, Roles & Permissions

- **Default Roles:** `Admin`, `Supervisor`, `Staff`, `Developer`.
- **Dynamic Roles:** Admins can define custom roles with instant permission template seeding.
- **Admin Safeguard:** Root admin accounts cannot be deactivated via the UI or API.
- **Role-Based Access Control (RBAC):** Real-time permission evaluation for device management, user administration, and audit logs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/xyruslabs/htsk-mobile-mgmt.git
   cd htsk-mobile-mgmt
   ```

2. **Install dependencies:**
   ```bash
   # Install root and backend dependencies
   npm install

   # Install frontend dependencies
   cd client && npm install && cd ..
   ```

3. **Start the development servers:**
   ```bash
   # Start backend API (Port 5100)
   npm start

   # In a separate terminal, start frontend (Port 5173)
   cd client && npm run dev
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```
   *Static assets will be compiled into `client/dist/` and served directly by the Express server on `http://localhost:5100`.*

---

## 🔗 Git Repositories

This project is configured with dual-push remote synchronization:
- **Primary Organization:** [https://github.com/xyruslabs/htsk-mobile-mgmt.git](https://github.com/xyruslabs/htsk-mobile-mgmt.git)
- **Personal Repository:** [https://github.com/d-navanith/htsk_mobile_management.git](https://github.com/d-navanith/htsk_mobile_management.git)
