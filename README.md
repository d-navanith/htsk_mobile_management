# HTSK Mobile Management System

A full-stack, enterprise-grade **Company Mobile Management & Handover System** built faithfully to the HTSK specifications and UI mockups.

---

## 📱 Operational Logic & Workflow

1. **Time (Item Given to User)**:
   - The exact time the replacement or temporary mobile unit is handed over to the employee (e.g. `06.48 P.M.`).
2. **Return Time (Returned to Us)**:
   - The time the user brings the mobile back to the desk (e.g. `07.55 P.M.`). If the mobile is still with the user, this remains empty or shows a 1-click **Return Mobile** button.
3. **Device Details (Issue & Reassigned Mobile)**:
   - Explains what the issue was with the previous device and which device was newly assigned (e.g. `Bank blocked, Reassigned "pn 34 mobile"`).
4. **Sign (Verification Status)**:
   - **Done (Green)**: The user has completed the handover/return process and signed.
   - **Pending (Amber)**: The process is in progress, the device is currently in use, or the signature section is empty.

---

## ⚡ Smart Sheet & Signed Document Ingestion

When you upload a file in the **Update** section (`.xlsx`, `.xls`, `.csv`, `.pdf`, `.docx`, `.png`, `.jpg`):
- **Signature Detection:**
  - If a row has a signature, checkmark, or is marked Done: the system automatically recognizes it as **Done**.
  - If the signature section is empty, blank, or unmarked: the system automatically recognizes it as **Pending**.
- **Automated Record Updating:**
  - If an employee already has an active record in the system with `Sign = 'Pending'` and a signed sheet or image is uploaded showing they signed / returned the mobile, the system **automatically updates their status to Done** and records the return time!
  - If it is a new handover record, it inserts it as a new entry.

---

## 🎨 UI & Clean Sidebar

- **Clean Sidebar:** Exactly matches Mockups 1 & 2 without internal technical clutter:
  - **HTSK** Brand Logo (lime green `#72bf12`)
  - **Dashboard**
  - **Update**
  - **History**
- **3NF Database Engine:** Operates quietly and strictly under the hood with 6 normalized tables (`persons`, `groups`, `devices`, `sign_statuses`, `upload_batches`, `device_records`) maintaining referential integrity.

---

## 🚀 Running the System

Server is running at: **[http://localhost:5100](http://localhost:5100)**

```bash
# Start server
npm start

# Build frontend
npm run build
```

---

## 📂 Pre-loaded Sample Files
- `sample_mobile_upload.xlsx` — A pre-formatted spreadsheet with both signed (`Done`) and unsigned (`Pending`) rows ready to test in the Update section.
