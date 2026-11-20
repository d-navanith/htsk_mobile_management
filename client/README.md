# HTSK Mobile Management - Frontend Client

The frontend interface for the HTSK Mobile Management Platform, built with **React 18**, **Vite**, and **Lucide Icons**.

---

## 🎨 UI Architecture & Design Standards

- **Unified System Theme:**
  - Standardized typography (`system-h1`, `system-breadcrumb`, card headers).
  - Consistent color palette: Primary Lime (`#84cc16`), Cyan (`#06b6d4`), Purple (`#8b5cf6`), Amber (`#eab308`), Red (`#ef4444`).
  - Fixed, non-scrolling sidebar navigation.
  - Independent scroll containers for heavy data tables.

## 📁 Key Components (`src/components/`)

| Component | Description |
|-----------|-------------|
| `Dashboard.jsx` | Executive KPI overview, interactive calendar drawer filter, and day-by-day records table. |
| `DailyTaskSection.jsx` | Multi-round task auditing, check time management, and attention highlight workflows. |
| `InventorySection.jsx` | 241 cataloged phones, live custodian synchronization, and rack storage locations. |
| `UpdateSection.jsx` | Ingestion center for Excel, CSV, PDF, Word, and OCR image documents, plus quick text list entry. |
| `UserManageSection.jsx` | User accounts, custom role creation, granular capability toggles, and dashboard animation management. |
| `HistorySection.jsx` | Chronological audit trail of all device handovers, updates, returns, and administrative logins. |
| `SettingsSection.jsx` | Operational shift configuration (Day/Night timings, duration, grace periods). |
| `Sidebar.jsx` | Fixed navigation bar with responsive mobile drawer support. |
| `SnowEffect.jsx` | 60fps CSS particle animation engine supporting Snow, Rain, and Sparkle ambient card effects. |
| `AdminLogin.jsx` | Administrative authentication portal. |

## 🛠 Available Scripts

```bash
# Start local Vite development server (Port 5173)
npm run dev

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```
