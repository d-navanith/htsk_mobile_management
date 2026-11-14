# HTSK MOBILE MANAGEMENT

A full-stack web-based **Company Mobile Management System** designed to prevent company-owned mobile phones from being lost or misplaced during working hours through manual **2-hour checking sessions** operating in **Sri Lanka Standard Time (`Asia/Colombo`, UTC+05:30)**.

---

## 1. Technology Stack & Deployment

| Layer | Technology |
|---|---|
| **Frontend** | React / JS, HTML & CSS (Vite + Tailwind CSS + Lucide Icons) |
| **Backend** | C# — ASP.NET Core Web API (.NET) |
| **Database** | Microsoft SQL Server (`CompanyMobileManagementDB`) |
| **Authentication** | Role-Isolated JWT Authentication (`Developer`, `ITAdmin`, `Employee`) |
| **Timezone** | `Asia/Colombo` (Sri Lanka Standard Time — UTC+05:30) |
| **Deployment** | **MonsterASP.NET (Free)** (Single-site deployment serving `/api/*` + React SPA from `wwwroot`) |

---

## 2. Redesigned Workspace UI & Role Portals

### Dedicated Role Login Portals
Each role has its own isolated login portal and backend authentication endpoint:
- **Employee Read-Only Portal** (`#/login/employee` → `POST /api/auth/login/employee`): `employee` / `Emp@123`
- **IT Admin Operations Portal** (`#/login/itadmin` → `POST /api/auth/login/itadmin`): `itadmin` / `Admin@123`
- **Developer System Owner Portal** (`#/login/developer` → `POST /api/auth/login/developer`): `developer` / `Dev@123`

### Workspace Screens
1. **Left Sidebar & Top Workspace Header** ([Navbar.jsx](file:///d:/htsk_mobile_management/frontend/src/components/Navbar.jsx)):
   - Branded **HTSK Mobile Management** sidebar with workspace selector, live badge counts for **Missing incidents** and **Notifications**, `INSIGHTS` (`Reports`, `History`), `ADMINISTRATION` (`User management`, `Settings`), and `"Every device. Every 2 hours."` reminder card.
   - Top bar with `Workspace / ...` breadcrumbs, global search (`⌘K`), notification bell, and profile menu.
2. **Dashboard** ([DashboardView.jsx](file:///d:/htsk_mobile_management/frontend/src/components/DashboardView.jsx)):
   - 4 KPI cards (`Total phones`, `Available`, `Missing`, `Active groups`).
   - `Current checking session` progress card (with `Continue checking` / `Start checking session`) paired with `Needs your attention` high-priority consecutive-missing alerts.
   - `Checking progress by group` table with progress bars & status pills paired with a live `Recent activity` timeline.
3. **Active Checking** ([CheckingSessionView.jsx](file:///d:/htsk_mobile_management/frontend/src/components/CheckingSessionView.jsx)):
   - Full-width session progress banner (`checked / total`, `Available`, `Missing`, `Pending`, `%`, and `Next check` time).
   - 2-column master-detail view: left `Groups` selector with per-group progress bars and `"A quick reminder"` box; right group phone list with `Pending`, `Checked`, `All phones`, and `Last session` tabs, `Previously missing - Missing again triggers a high-priority alert` warnings, and one-click `✓ Available` / `✕ Missing` buttons.
4. **Mobile Phones Inventory** ([DevicesView.jsx](file:///d:/htsk_mobile_management/frontend/src/components/DevicesView.jsx)):
   - `All phones`, `Available`, and `Missing` underline tabs with live counts, `Export inventory` CSV download, and `+ Add phone` button.
   - 2-column layout: searchable/filterable inventory table on the left and a persistent `Add a new phone` / `Edit phone` side panel on the right with auto-generated locked `Mobile ID` preview (`MOB-XXXX`) and required `Group *` selector.

---

## 3. Deploying to MonsterASP.NET (Free)

MonsterASP.NET Free hosting includes both **ASP.NET Core hosting** and a **free MS SQL Server database**. The backend ([Program.cs](file:///d:/htsk_mobile_management/backend/Program.cs)) is pre-configured with `app.UseDefaultFiles()`, `app.UseStaticFiles()`, and `app.MapFallbackToFile("index.html")` so both the React frontend and Web API run on a single MonsterASP.NET website.

### Step 1: Build the Deployment Package
Run the included PowerShell publish script from `d:\htsk_mobile_management`:
```powershell
.\publish-monsterasp.ps1
```
This script:
1. Builds the React frontend (`frontend/dist`).
2. Copies the compiled static files into `backend/wwwroot`.
3. Publishes the ASP.NET Core project in `Release` mode to `./publish`.
4. Creates `htsk-monsterasp-deploy.zip` ready for upload.

### Step 2: Create Website & MSSQL Database on MonsterASP.NET
1. Log in to your **MonsterASP.NET Control Panel**.
2. Go to **Websites** → **Create Website** (e.g., `htsk-mobile.runasp.net`).
3. Go to **Databases (MSSQL)** → **Create Database**.
4. Copy the generated **Connection String** from MonsterASP.NET (e.g., `Server=dbXXXXX.public.databaseasp.net;Database=dbXXXXX;User Id=dbXXXXX;Password=...`).

### Step 3: Configure Connection String & Upload
1. Paste your MonsterASP.NET SQL Server connection string into [appsettings.Production.json](file:///d:/htsk_mobile_management/backend/appsettings.Production.json) under `ConnectionStrings:DefaultConnection` (and re-run `.\publish-monsterasp.ps1`), **or** set `ConnectionStrings__DefaultConnection` in MonsterASP.NET's **Website → Configuration / Environment Variables**.
2. In MonsterASP.NET Control Panel → **Websites** → **File Manager** (or **Web Deploy / FTP**), upload `htsk-monsterasp-deploy.zip` to `wwwroot` and extract it.
3. On first startup, Entity Framework Core (`DbInitializer.Initialize`) automatically creates all 9 tables and seeds default roles, users (`developer`, `itadmin`, `employee`), groups, and sample phones in your MonsterASP.NET SQL Server database.

# htsk-mobile-mgmt
