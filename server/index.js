const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

const {
  initDatabase,
  getAllRecords,
  getRecordById,
  insertDeviceRecord,
  updateDeviceRecord,
  deleteDeviceRecord,
  getDashboardKPIs,
  getDailyTaskKPIs,
  getActiveDevicesList,
  getAllGroups,
  addGroup,
  getAllShifts,
  addShift,
  getAllUsers,
  createSystemUser,
  toggleUserActive,
  deleteSystemUser,
  getAllPermissions,
  togglePermission,
  getHistoryLogs,
  getAuditLogins,
  recordAuditLogin,
  getShiftSettings,
  updateShiftSettings,
  createUploadBatch,
  getAllBatches,
  logHistoryEvent,
  dbRun,
  dbGet,
  dbAll
} = require('./database');

const app = express();
const PORT = process.env.PORT || 5100;

app.use(cors());
app.use(express.json());

// Setup file uploads folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Normalize sheet column keys
function normalizeKey(rawKey) {
  return String(rawKey || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-#.]+/g, '');
}

// Evaluate signature status (Done vs Pending)
function evaluateSignStatus(rawSign) {
  if (rawSign === null || rawSign === undefined) return 'Pending';
  if (typeof rawSign === 'boolean') return rawSign ? 'Done' : 'Pending';
  const val = String(rawSign).trim();
  if (!val) return 'Pending';
  const lower = val.toLowerCase();
  if ([
    'pending', 'no', 'false', '0', 'unassigned', 'waiting',
    '—', '-', 'none', 'n/a', 'null', 'undefined', 'not done',
    'unsigned', 'empty', 'blank'
  ].includes(lower)) {
    return 'Pending';
  }
  return 'Done';
}

// Map raw row object with flexible header naming
function mapRowToRecord(rawRow) {
  const normalized = {};
  for (const key of Object.keys(rawRow)) {
    normalized[normalizeKey(key)] = rawRow[key];
  }

  const name =
    normalized['name'] ||
    normalized['empname'] ||
    normalized['employeename'] ||
    normalized['fullname'] ||
    normalized['person'] ||
    normalized['user'] ||
    '';

  const shift =
    normalized['shift'] ||
    (String(rawRow['Issued At'] || rawRow['time'] || '').toUpperCase().includes('A.M.') ? 'Day' : 'Night');

  const group =
    normalized['group'] ||
    normalized['groupname'] ||
    normalized['department'] ||
    normalized['team'] ||
    'Group D';

  const issued_at =
    normalized['issuedat'] ||
    normalized['time'] ||
    normalized['issuetime'] ||
    normalized['checkouttime'] ||
    normalized['start'] ||
    '7.30 A.M.';

  const return_time =
    normalized['returntime'] ||
    normalized['checkintime'] ||
    normalized['expectedreturn'] ||
    normalized['expectedreturnat'] ||
    normalized['return'] ||
    '';

  const return_device =
    normalized['returndevice'] ||
    normalized['returnphone'] ||
    normalized['returneddevice'] ||
    '';

  const taking_device =
    normalized['takingdevice'] ||
    normalized['takingphone'] ||
    normalized['issueddevice'] ||
    normalized['deviceid'] ||
    normalized['device'] ||
    '';

  const handover_to =
    normalized['handoverto'] ||
    normalized['handover'] ||
    normalized['receiver'] ||
    normalized['nextcustodian'] ||
    '';

  const rawSign =
    normalized['sign'] ||
    normalized['signature'] ||
    normalized['status'] ||
    normalized['signed'] ||
    '';

  return {
    name: name.trim(),
    shift: shift.trim(),
    group: group.trim(),
    issued_at: issued_at.trim(),
    return_time: return_time.trim(),
    return_device: return_device.trim(),
    taking_device: taking_device.trim(),
    handover_to: handover_to.trim(),
    sign: evaluateSignStatus(rawSign)
  };
}

// Parse text lines to structured table records
function parseTextToRecords(fullText) {
  const lines = fullText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const parsedRecords = [];

  for (const line of lines) {
    if (/^\s*(#|rec|record|emp|name|shift|group|issued|return|device|sign|action)/i.test(line) && line.split(/[|,\t]/).length > 2) {
      continue;
    }

    let parts = [];
    if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim());
    } else if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim());
    } else if (line.includes(',') && line.split(',').length >= 4) {
      parts = line.split(',').map(p => p.trim());
    } else {
      parts = line.split(/\s{2,}/).map(p => p.trim());
    }

    if (parts.length > 0 && /^\d+\.?$/.test(parts[0])) {
      parts.shift();
    }

    if (parts.length >= 2) {
      const name = parts[0] || '';
      const shift = parts[1] || 'Day';
      const group = parts[2] || 'Group D';
      const issued_at = parts[3] || '7.30 A.M.';
      const return_time = parts[4] || '';
      const devDetails = parts[5] || '';
      const handover_to = parts[6] || '';
      const rawSign = parts[7] || '';

      // Parse return / taking from device details string if present
      let return_device = '';
      let taking_device = '';
      if (/return:\s*([^\s|]+)/i.test(devDetails)) {
        return_device = RegExp.$1.trim();
      }
      if (/taking:\s*([^\s|]+)/i.test(devDetails)) {
        taking_device = RegExp.$1.trim();
      }
      if (!taking_device && !return_device && devDetails) {
        taking_device = devDetails;
      }

      if (name && name.length >= 2 && !/^(total|summary|page|date|table)/i.test(name)) {
        parsedRecords.push({
          name,
          shift,
          group,
          issued_at,
          return_time,
          return_device,
          taking_device,
          handover_to,
          sign: evaluateSignStatus(rawSign)
        });
      }
    }
  }

  return parsedRecords;
}

// ----------------- ROUTES -----------------

// 1. Get all records with filter query params
app.get('/api/records', async (req, res) => {
  try {
    const { search, group, shift, sign, task_number } = req.query;
    const records = await getAllRecords({
      search,
      group,
      shift,
      sign,
      task_number: task_number !== undefined && task_number !== 'all' ? parseInt(task_number) : undefined
    });
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Error fetching records:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Add record manually (Dashboard Add Record popup)
app.post('/api/records', async (req, res) => {
  try {
    const {
      name,
      shift,
      group,
      issued_at,
      return_time,
      return_device,
      taking_device,
      handover_to,
      sign,
      admin_user,
      task_number,
      task_date
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Employee name is required' });
    }

    const cleanSign = evaluateSignStatus(sign);

    const record = await insertDeviceRecord({
      name: name.trim(),
      shift: shift || 'Day',
      group: group || 'Group D',
      issued_at: issued_at || '7.30 A.M.',
      return_time: return_time !== undefined && return_time !== null ? return_time.trim() : '',
      return_device: return_device || '',
      taking_device: taking_device || '',
      handover_to: handover_to || '',
      sign: cleanSign,
      admin_user: admin_user || 'Shanaka',
      task_number: task_number ? parseInt(task_number) : 17,
      task_date: task_date || '2026-08-17'
    });

    res.status(201).json({
      success: true,
      data: record,
      message: `Record #${record.id} for ${name} added successfully!`
    });
  } catch (err) {
    console.error('Error adding record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update existing record (Edit Record / Handover update / Sign Done)
app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      shift,
      group,
      issued_at,
      time,
      return_time,
      return_device,
      taking_device,
      handover_to,
      sign,
      replaceEmpName,
      admin_user,
      task_number,
      task_date
    } = req.body;

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (shift !== undefined) payload.shift = shift;
    if (group !== undefined) payload.group = group;
    if (issued_at !== undefined) payload.issued_at = issued_at;
    if (time !== undefined) payload.time = time;
    if (return_time !== undefined) payload.return_time = return_time;
    if (return_device !== undefined) payload.return_device = return_device;
    if (taking_device !== undefined) payload.taking_device = taking_device;
    if (handover_to !== undefined) payload.handover_to = handover_to;
    if (sign !== undefined) payload.sign = evaluateSignStatus(sign);
    if (replaceEmpName !== undefined) payload.replaceEmpName = replaceEmpName;
    if (task_number !== undefined) payload.task_number = parseInt(task_number);
    if (task_date !== undefined) payload.task_date = task_date;

    const updated = await updateDeviceRecord(id, payload, admin_user || 'Shanaka');
    res.json({
      success: true,
      data: updated,
      message: `Record #${id} updated successfully!`
    });
  } catch (err) {
    console.error('Error updating record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Delete record
app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDeviceRecord(id, req.query.admin_user || 'Shanaka');
    res.json({ success: true, message: `Record #${id} deleted successfully` });
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Dashboard KPIs metrics (159 stock, active count, available count, need an update count)
app.get('/api/kpis', async (req, res) => {
  try {
    const kpis = await getDashboardKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    console.error('Error fetching KPIs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5b. Daily Task KPIs metrics (Today Active Mobiles: 70, Active: 3, Need an update: 1)
app.get('/api/daily-task/kpis', async (req, res) => {
  try {
    const taskNumber = req.query.task_number ? parseInt(req.query.task_number) : 17;
    const kpis = await getDailyTaskKPIs(taskNumber);
    res.json({ success: true, data: kpis });
  } catch (err) {
    console.error('Error fetching Daily Task KPIs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Active Devices list (table-wise view of who is actively using each device)
app.get('/api/active-devices', async (req, res) => {
  try {
    const active = await getActiveDevicesList();
    res.json({ success: true, data: active });
  } catch (err) {
    console.error('Error fetching active devices:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Groups
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await getAllGroups();
    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { group_name, description } = req.body;
    if (!group_name || !group_name.trim()) {
      return res.status(400).json({ success: false, error: 'Group name is required' });
    }
    const newId = await addGroup(group_name, description || '');
    res.status(201).json({ success: true, id: newId, message: `Group ${group_name} added successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Shifts
app.get('/api/shifts', async (req, res) => {
  try {
    const shifts = await getAllShifts();
    res.json({ success: true, data: shifts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/shifts', async (req, res) => {
  try {
    const { shift_name, start_time, end_time } = req.body;
    if (!shift_name || !shift_name.trim()) {
      return res.status(400).json({ success: false, error: 'Shift name is required' });
    }
    const newId = await addShift(shift_name, start_time, end_time);
    res.status(201).json({ success: true, id: newId, message: `Shift ${shift_name} added successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Admin User Management (Create accounts by admin)
app.get('/api/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { full_name, username, email, role, password } = req.body;
    if (!full_name || !username) {
      return res.status(400).json({ success: false, error: 'Full name and username are required' });
    }
    const id = await createSystemUser({ full_name, username, email, role, password });
    res.status(201).json({ success: true, id, message: `User account created successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await toggleUserActive(id, is_active);
    res.json({ success: true, message: 'User status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteSystemUser(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. User Permission Management (with toggle switches)
app.get('/api/permissions', async (req, res) => {
  try {
    const permissions = await getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/permissions/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;
    await togglePermission(id, is_enabled);
    res.json({ success: true, message: 'Permission toggled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. History & Audit Logs
app.get('/api/history', async (req, res) => {
  try {
    const [activeDevices, historyLogs, auditLogins, batches] = await Promise.all([
      getActiveDevicesList(),
      getHistoryLogs(),
      getAuditLogins(),
      getAllBatches()
    ]);

    res.json({
      success: true,
      activeDevices,
      historyLogs,
      auditLogins,
      batches
    });
  } catch (err) {
    console.error('Error fetching history data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/audit/logs', async (req, res) => {
  try {
    const logs = await getHistoryLogs();
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/audit/logins', async (req, res) => {
  try {
    const logins = await getAuditLogins();
    res.json({ success: true, data: logins });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audit/login', async (req, res) => {
  try {
    const { username, role, status } = req.body;
    await recordAuditLogin(username || 'Admin', role || 'Admin', status || 'Success', req.ip);
    res.json({ success: true, message: 'Login recorded' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Shift Settings (Morning/Night timing configuration)
app.get('/api/shift-settings', async (req, res) => {
  try {
    const settings = await getShiftSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/shift-settings', async (req, res) => {
  try {
    const updated = await updateShiftSettings(req.body);
    res.json({ success: true, data: updated, message: 'Shift configuration saved successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. File Upload & Parser (Image 3: Sheet Update dropzone)
app.post('/api/upload/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();

    let rows = [];
    let detectedFormat = ext;

    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

      rows = rawData.map((row, idx) => {
        const mapped = mapRowToRecord(row);
        const isValid = Boolean(mapped.name);
        return {
          id: `preview-${idx + 1}`,
          ...mapped,
          isValid,
          validationError: isValid ? null : 'Name is required'
        };
      });
    } else if (['.docx'].includes(ext)) {
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;

      const tableMatch = html.match(/<tr[\s\S]*?<\/tr>/gi);
      if (tableMatch && tableMatch.length > 0) {
        let headers = [];
        tableMatch.forEach((tr, trIdx) => {
          const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [])
            .map(c => c.replace(/<[^>]*>/g, '').trim());
          if (trIdx === 0) {
            headers = cells.map(normalizeKey);
          } else if (cells.length > 0) {
            const raw = {};
            cells.forEach((val, cIdx) => {
              const h = headers[cIdx] || `col_${cIdx}`;
              raw[h] = val;
            });
            const mapped = mapRowToRecord(raw);
            if (mapped.name) {
              rows.push({
                id: `preview-${rows.length + 1}`,
                ...mapped,
                isValid: true
              });
            }
          }
        });
      }
    } else if (['.pdf'].includes(ext)) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      rows = parseTextToRecords(pdfData.text).map((r, idx) => ({
        id: `preview-${idx + 1}`,
        ...r,
        isValid: Boolean(r.name)
      }));
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(filePath);
      await worker.terminate();
      rows = parseTextToRecords(ret.data.text).map((r, idx) => ({
        id: `preview-${idx + 1}`,
        ...r,
        isValid: Boolean(r.name)
      }));
    }

    try {
      fs.unlinkSync(filePath);
    } catch (e) {}

    res.json({
      success: true,
      filename: originalName,
      fileFormat: detectedFormat,
      totalRows: rows.length,
      validRows: rows.filter(r => r.isValid).length,
      rows
    });
  } catch (err) {
    console.error('Error parsing file:', err);
    res.status(500).json({ success: false, error: 'Failed to parse file: ' + err.message });
  }
});

// 14. Confirm Upload (Import rows into database)
app.post('/api/upload/confirm', async (req, res) => {
  try {
    const { filename, rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No rows provided to import' });
    }

    const validRows = rows.filter(r => r.name && r.name.trim());
    if (validRows.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid rows found' });
    }

    const batchId = await createUploadBatch(
      filename || 'uploaded_sheet.xlsx',
      rows.length,
      validRows.length
    );

    let insertedCount = 0;
    for (const row of validRows) {
      await insertDeviceRecord({
        name: row.name.trim(),
        shift: row.shift || 'Day',
        group: row.group || 'Group D',
        issued_at: row.issued_at || '7.30 A.M.',
        return_time: row.return_time ? row.return_time.trim() : '',
        return_device: row.return_device || '',
        taking_device: row.taking_device || '',
        handover_to: row.handover_to || '',
        sign: evaluateSignStatus(row.sign),
        admin_user: 'Shanaka'
      });
      insertedCount++;
    }

    res.json({
      success: true,
      batchId,
      insertedCount,
      totalCount: validRows.length,
      message: `Successfully confirmed and imported ${insertedCount} records!`
    });
  } catch (err) {
    console.error('Error confirming upload:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Download Template (matching Image 4 columns)
app.get('/api/template', (req, res) => {
  try {
    const templateData = [
      {
        'Rec. No.': 1,
        'EMP. Name': 'Arjun Narayan',
        'Shift': 'Day',
        'Group': 'Group D',
        'Issued At': '7.30 A.M.',
        'Return Time': '09.55 P.M.',
        'Return Device': 'PN 56',
        'Taking Device': 'New 25',
        'Handover to': 'Meera Nair',
        'Sign': 'Done'
      },
      {
        'Rec. No.': 2,
        'EMP. Name': 'Nazir Kahn',
        'Shift': 'Night',
        'Group': 'Group B',
        'Issued At': '8.40 A.M.',
        'Return Time': '09.55 P.M.',
        'Return Device': '',
        'Taking Device': 'PN 105',
        'Handover to': '',
        'Sign': 'Pending'
      },
      {
        'Rec. No.': 3,
        'EMP. Name': 'Zaif Ali',
        'Shift': 'Day',
        'Group': 'Group D',
        'Issued At': '7.30 A.M.',
        'Return Time': '09.55 P.M.',
        'Return Device': 'Cass 12',
        'Taking Device': 'PN 56',
        'Handover to': 'Jaihind',
        'Sign': 'Done'
      }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);
    xlsx.utils.book_append_sheet(wb, ws, 'Mobile_Records');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="HTSK_Mobile_Management_Template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Export records to Excel
app.get('/api/export', async (req, res) => {
  try {
    const records = await getAllRecords();
    const exportData = records.map((r, i) => ({
      'Rec. No.': i + 1,
      'EMP. Name': r.name,
      'Shift': r.shift,
      'Group': r.group_name,
      'Issued At': r.issued_at,
      'Return Time': r.return_time,
      'Return Device': r.return_device || '',
      'Taking Device': r.taking_device || '',
      'Handover to': r.handover_to || '',
      'Active Custodian': r.active_user || r.name,
      'Sign': r.sign
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportData);
    xlsx.utils.book_append_sheet(wb, ws, 'Records');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="HTSK_Mobile_Records_Export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve static client build if it exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      // If any stale JS chunk is requested by a cached browser tab, serve the active JS bundle
      if (req.path.startsWith('/assets/') && req.path.endsWith('.js')) {
        const assetsDir = path.join(clientDist, 'assets');
        if (fs.existsSync(assetsDir)) {
          const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
          if (jsFiles.length > 0) {
            res.setHeader('Content-Type', 'application/javascript');
            return res.sendFile(path.join(assetsDir, jsFiles[0]));
          }
        }
      }

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Start Server and initialize DB
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`HTSK Mobile Management Server running on http://localhost:${PORT}`);
    });
    // Keep event loop active
    setInterval(() => {}, 60000);
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
