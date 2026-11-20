const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const crypto = require('crypto');

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
  getHistoryAvailableDays,
  getAllGroups,
  addGroup,
  getAllShifts,
  addShift,
  getAllUsers,
  createSystemUser,
  toggleUserActive,
  toggleUserAnimation,
  deleteSystemUser,
  authenticateUser,
  getUserProfile,
  updateUserProfile,
  getAllRoles,
  addRole,
  getAllDashboardAnimations,
  toggleDashboardAnimation,
  getActiveDashboardAnimation,
  checkUserAnimationStatus,
  getAllPermissions,
  getUserPermissionsByRole,
  togglePermission,
  togglePermissionByRoleAndKey,
  getHistoryLogs,
  getAuditLogins,
  recordAuditLogin,
  getShiftSettings,
  updateShiftSettings,
  createUploadBatch,
  getAllBatches,
  logHistoryEvent,
  getAllInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  normalizeDeviceTag,
  formatDeviceTag,
  compareDeviceLists,
  getTaskRounds,
  getLatestTaskRound,
  compareTaskRound,
  saveTaskRound,
  updateTaskRound,
  resolveDroppedDevice,
  dbRun,
  dbGet,
  dbAll
} = require('./database');

const app = express();
const PORT = process.env.PORT || 5100;

app.use(cors());
app.use(express.json());

// In-memory active authenticated sessions map
const activeSessions = new Map();

// Helper to resolve requester capabilities from session token, header, or context
async function getRequestPermissions(req) {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7)
      : (req.query.token || req.headers['x-session-token']);

    if (token && activeSessions.has(token)) {
      const session = activeSessions.get(token);
      return await getUserPermissionsByRole(session.role);
    }

    const explicitRole = req.headers['x-user-role'] || req.query.user_role;
    if (explicitRole) {
      return await getUserPermissionsByRole(explicitRole);
    }

    const user = req.body?.admin_user || req.query?.admin_user;
    if (user && String(user).toLowerCase() === 'viewer') {
      return await getUserPermissionsByRole('Viewer');
    }

    return await getUserPermissionsByRole('Admin');
  } catch (e) {
    return await getUserPermissionsByRole('Admin');
  }
}

// Middleware to enforce role capability
function requireCapability(capabilityKey) {
  return async (req, res, next) => {
    try {
      const perms = await getRequestPermissions(req);
      if (!perms[capabilityKey]) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Your account role does not have permission to perform this action (${capabilityKey}).`
        });
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

// Setup file uploads folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Dedicated avatar upload storage
const avatarDir = path.join(uploadDir, 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

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

  const rawName =
    normalized['name'] !== undefined ? normalized['name'] :
    normalized['empname'] !== undefined ? normalized['empname'] :
    normalized['employeename'] !== undefined ? normalized['employeename'] :
    normalized['fullname'] !== undefined ? normalized['fullname'] :
    normalized['person'] !== undefined ? normalized['person'] :
    normalized['user'] !== undefined ? normalized['user'] :
    normalized['empno'] !== undefined ? normalized['empno'] :
    normalized['recno'] !== undefined ? normalized['recno'] :
    '';

  const name = String(rawName !== null && rawName !== undefined ? rawName : '').trim();

  const rawTaking =
    normalized['taking'] !== undefined ? normalized['taking'] :
    normalized['takingdevice'] !== undefined ? normalized['takingdevice'] :
    normalized['takingphone'] !== undefined ? normalized['takingphone'] :
    normalized['issueddevice'] !== undefined ? normalized['issueddevice'] :
    normalized['deviceid'] !== undefined ? normalized['deviceid'] :
    normalized['device'] !== undefined ? normalized['device'] :
    normalized['phone'] !== undefined ? normalized['phone'] :
    normalized['mobile'] !== undefined ? normalized['mobile'] :
    '';

  const taking_device = String(rawTaking !== null && rawTaking !== undefined ? rawTaking : '').trim();

  const rawShift = normalized['shift'] !== undefined ? normalized['shift'] : '';
  const shift = String(rawShift || 'Day').trim();

  const rawGroup =
    normalized['group'] !== undefined ? normalized['group'] :
    normalized['groupname'] !== undefined ? normalized['groupname'] :
    normalized['department'] !== undefined ? normalized['department'] :
    normalized['team'] !== undefined ? normalized['team'] :
    '';
  const group = String(rawGroup || '').trim();

  const rawIssued =
    normalized['issuedat'] !== undefined ? normalized['issuedat'] :
    normalized['time'] !== undefined ? normalized['time'] :
    normalized['issuetime'] !== undefined ? normalized['issuetime'] :
    '7.30 A.M.';
  const issued_at = String(rawIssued || '7.30 A.M.').trim();

  const rawReturnTime =
    normalized['returntime'] !== undefined ? normalized['returntime'] :
    normalized['checkintime'] !== undefined ? normalized['checkintime'] :
    '';
  const return_time = String(rawReturnTime || '').trim();

  const rawReturnDevice =
    normalized['returndevice'] !== undefined ? normalized['returndevice'] :
    normalized['returnphone'] !== undefined ? normalized['returnphone'] :
    '';
  const return_device = String(rawReturnDevice || '').trim();

  const rawHandover =
    normalized['handoverto'] !== undefined ? normalized['handoverto'] :
    normalized['handover'] !== undefined ? normalized['handover'] :
    '';
  const handover_to = String(rawHandover || '').trim();

  const rawSign =
    normalized['sign'] !== undefined ? normalized['sign'] :
    normalized['signature'] !== undefined ? normalized['signature'] :
    normalized['status'] !== undefined ? normalized['status'] :
    'Done';

  return {
    name,
    shift: shift || 'Day',
    group,
    issued_at: issued_at || '7.30 A.M.',
    return_time,
    return_device,
    taking_device,
    handover_to,
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
      const group = parts[2] || '';
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

  // Fallback: If no multi-column records were parsed, handle single-column list of device tags
  if (parsedRecords.length === 0 && lines.length > 0) {
    let count = 1;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^\s*(#|rec|record|emp|name|shift|group|issued|return|device|sign|action)/i.test(line)) continue;

      parsedRecords.push({
        name: String(count).padStart(2, '0'),
        shift: 'Day',
        group: '',
        issued_at: '7.30 A.M.',
        return_time: '',
        return_device: '',
        taking_device: line,
        handover_to: '',
        sign: 'Done'
      });
      count++;
    }
  }

  return parsedRecords;
}

// ----------------- ROUTES -----------------

// 1. Get all records with filter query params
app.get('/api/records', async (req, res) => {
  try {
    const { search, group, shift, sign, task_number, task_date, all, current_active, round_number, only_new_in_round } = req.query;
    
    // If all === 'true', fetch across all tasks.
    // If task_number or task_date is specified, fetch for that specific task/date.
    // Otherwise (e.g. Dashboard default or current_active), default to the latest/current active task!
    const isCurrentActive = current_active === 'true' || (task_number === undefined && task_date === undefined && all !== 'true');

    const records = await getAllRecords({
      search,
      group,
      shift,
      sign,
      task_number: task_number !== undefined && task_number !== 'all' ? parseInt(task_number) : undefined,
      task_date,
      current_active: isCurrentActive,
      round_number,
      only_new_in_round
    });
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Error fetching records:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Add record manually (Dashboard Add Record popup)
app.post('/api/records', requireCapability('manage_devices'), async (req, res) => {
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
      group: group || '',
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
app.put('/api/records/:id', requireCapability('manage_devices'), async (req, res) => {
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
app.delete('/api/records/:id', requireCapability('delete_records'), async (req, res) => {
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
    const { task_number, task_date } = req.query;
    const kpis = await getDashboardKPIs(task_number, task_date);
    res.json({ success: true, data: kpis });
  } catch (err) {
    console.error('Error fetching KPIs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5b. Daily Task KPIs metrics (Today Active Mobiles, Active in Shift, Returned Mobiles, Missing Devices)
app.get('/api/daily-task/kpis', async (req, res) => {
  try {
    const taskNumber = req.query.task_number ? parseInt(req.query.task_number) : 17;
    const taskDate = req.query.task_date || null;
    const kpis = await getDailyTaskKPIs(taskNumber, taskDate);
    res.json({ success: true, data: kpis });
  } catch (err) {
    console.error('Error fetching Daily Task KPIs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5c. Daily Task Rounds (Get intra-day calculation rounds and history)
app.get('/api/daily-task/rounds', async (req, res) => {
  try {
    const taskNumber = req.query.task_number ? parseInt(req.query.task_number) : 19;
    const taskDate = req.query.task_date || null;
    const rounds = await getTaskRounds(taskNumber, taskDate);
    const latestRound = await getLatestTaskRound(taskNumber, taskDate);
    res.json({ success: true, data: rounds, latestRound });
  } catch (err) {
    console.error('Error fetching Daily Task rounds:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5d. Compare Daily Task Round (Diff incoming list with previous round)
app.post('/api/daily-task/compare-rounds', async (req, res) => {
  try {
    const { task_number = 19, task_date = '2026-11-19', raw_text = '', device_list = [] } = req.body;
    const comparison = await compareTaskRound(task_number, task_date, device_list && device_list.length > 0 ? device_list : raw_text);
    res.json({ success: true, data: comparison });
  } catch (err) {
    console.error('Error comparing Daily Task rounds:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5e. Save Daily Task Round (Confirm new intra-day round)
app.post('/api/daily-task/save-round', requireCapability('manage_devices'), async (req, res) => {
  try {
    const {
      task_number = 19,
      task_date = '2026-11-19',
      round_number,
      round_name,
      check_time,
      rows = [],
      raw_list = ''
    } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No device rows provided to save round.' });
    }

    const result = await saveTaskRound({
      task_number,
      task_date,
      round_number,
      round_name,
      check_time,
      rows,
      raw_list
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error saving Daily Task round:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5f. Update Daily Task Round (e.g. edit check_time or round_name)
app.put('/api/daily-task/rounds/:id', requireCapability('manage_devices'), async (req, res) => {
  try {
    const roundId = parseInt(req.params.id);
    const { check_time, round_name } = req.body;
    const updated = await updateTaskRound(roundId, { check_time, round_name });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating task round:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5g. Resolve Dropped / Missing Device in Round Check (Mark as Returned or Missing)
app.post('/api/daily-task/resolve-device', requireCapability('manage_devices'), async (req, res) => {
  try {
    const { task_number, round_number, device_tag, action, admin_user } = req.body;
    if (!device_tag || !action) {
      return res.status(400).json({ success: false, error: 'device_tag and action (returned/missing) are required' });
    }
    const result = await resolveDroppedDevice({
      task_number: task_number ? parseInt(task_number) : 19,
      round_number: round_number ? parseInt(round_number) : 2,
      device_tag,
      action,
      admin_user: admin_user || 'Shanaka'
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error resolving device:', err);
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

// 6b. Inventory Management API
app.get('/api/inventory', async (req, res) => {
  try {
    const { task_number, task_date } = req.query;
    const data = await getAllInventoryItems({ task_number, task_date });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory', requireCapability('manage_devices'), async (req, res) => {
  try {
    const { device_tag, series, model_name, storage_location, condition_status, notes } = req.body;
    if (!device_tag || !device_tag.trim()) {
      return res.status(400).json({ success: false, error: 'Device tag is required' });
    }
    const newId = await addInventoryItem({ device_tag, series, model_name, storage_location, condition_status, notes });
    res.status(201).json({ success: true, id: newId, message: `Device ${device_tag} added to inventory successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/inventory/:id', requireCapability('manage_devices'), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateInventoryItem(id, req.body);
    res.json({ success: true, data: updated, message: `Device #${id} updated successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/inventory/:id', requireCapability('delete_records'), async (req, res) => {
  try {
    const { id } = req.params;
    await deleteInventoryItem(id);
    res.json({ success: true, message: `Device #${id} removed from inventory` });
  } catch (err) {
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

app.post('/api/users', requireCapability('manage_users'), async (req, res) => {
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

app.put('/api/users/:id/toggle', requireCapability('manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await toggleUserActive(id, is_active);
    res.json({ success: true, message: 'User status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id/toggle-animation', requireCapability('manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { animation_enabled } = req.body;
    await toggleUserAnimation(id, animation_enabled);
    res.json({ success: true, message: 'User animation permission updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', requireCapability('manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    await deleteSystemUser(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Roles Management (Admin can add custom roles)
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/roles', requireCapability('manage_users'), async (req, res) => {
  try {
    const { role_name, description } = req.body;
    if (!role_name || !role_name.trim()) {
      return res.status(400).json({ success: false, error: 'Role name is required' });
    }
    const updatedRoles = await addRole(role_name, description);
    res.status(201).json({ success: true, message: `Role "${role_name.trim()}" created successfully`, data: updatedRoles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dashboard Animation Management (Matching user screenshot: "One animation can use one time only")
app.get('/api/dashboard-animations', async (req, res) => {
  try {
    const animations = await getAllDashboardAnimations();
    res.json({ success: true, data: animations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/dashboard-animations/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;
    const updated = await toggleDashboardAnimation(id, is_enabled);
    res.json({ success: true, message: 'Animation status updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/user-animation-status', async (req, res) => {
  try {
    const { username } = req.query;
    const status = await checkUserAnimationStatus(username);
    res.json({ success: true, ...status });
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

app.put('/api/permissions/:id/toggle', requireCapability('manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;
    await togglePermission(id, is_enabled);
    res.json({ success: true, message: 'Permission toggled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle permission by role and permission_key (supporting matrix grid toggles)
app.put('/api/permissions/toggle', requireCapability('manage_users'), async (req, res) => {
  try {
    const { role, permission_key, is_enabled } = req.body;
    if (!role || !permission_key) {
      return res.status(400).json({ success: false, error: 'role and permission_key are required' });
    }
    const updated = await togglePermissionByRoleAndKey(role, permission_key, is_enabled);
    res.json({ success: true, message: `Permission toggled for ${role}`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get computed permissions for a specific role
app.get('/api/user-permissions', async (req, res) => {
  try {
    const role = req.query.role || 'Admin';
    const permissions = await getUserPermissionsByRole(role);
    res.json({ success: true, role, permissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. History & Audit Logs
app.get('/api/history', async (req, res) => {
  try {
    const { task_number, task_date, all } = req.query;
    const [activeDevices, historyLogs, auditLogins, batches, availableDays] = await Promise.all([
      getActiveDevicesList({ task_number, task_date, all }),
      getHistoryLogs(),
      getAuditLogins(),
      getAllBatches(),
      getHistoryAvailableDays()
    ]);

    res.json({
      success: true,
      activeDevices,
      historyLogs,
      auditLogins,
      batches,
      availableDays
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

// Secure System Authentication Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const authResult = await authenticateUser(username, password, clientIp);
    if (!authResult.success) {
      return res.status(401).json(authResult);
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      userId: authResult.user.id,
      username: authResult.user.username,
      full_name: authResult.user.full_name,
      role: authResult.user.role,
      loginAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24-hour validity
    });

    const permissions = await getUserPermissionsByRole(authResult.user.role);

    res.json({
      success: true,
      token,
      user: {
        ...authResult.user,
        permissions
      },
      permissions,
      message: 'Authentication successful.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Session Verification Endpoint
app.get('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7)
      : req.query.token;

    if (!token || !activeSessions.has(token)) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }

    const session = activeSessions.get(token);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return res.status(401).json({ success: false, error: 'Session expired.' });
    }

    // Check user is still active in database
    const user = await dbGet(
      `SELECT id, full_name, username, email, role, is_active, animation_enabled FROM system_users WHERE id = ?`,
      [session.userId]
    );

    if (!user || user.is_active !== 1) {
      activeSessions.delete(token);
      return res.status(403).json({ success: false, error: 'Account has been deactivated.' });
    }

    const permissions = await getUserPermissionsByRole(user.role);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email,
        avatar_url: user.avatar_url,
        animation_enabled: user.animation_enabled,
        permissions
      },
      permissions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7)
      : req.body.token;

    if (token && activeSessions.has(token)) {
      activeSessions.delete(token);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Profile Management Endpoints
app.get('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : null;
    const session = token ? activeSessions.get(token) : null;
    const identifier = req.query.username || (session ? session.username : 'shanaka');

    const user = await getUserProfile(identifier);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : null;
    const session = token ? activeSessions.get(token) : null;
    const targetUser = req.body.username_orig || (session ? session.username : req.body.username) || 'shanaka';

    const updated = await updateUserProfile(targetUser, req.body);

    // Synchronize active session if user updated username or name
    if (session) {
      session.username = updated.username;
      session.full_name = updated.full_name;
    }

    res.json({
      success: true,
      user: updated,
      message: 'Profile updated successfully!'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/profile/avatar', uploadAvatar.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({
      success: true,
      avatarUrl,
      message: 'Avatar image uploaded successfully!'
    });
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
    } else if (['.txt', '.text', '.log'].includes(ext)) {
      const text = fs.readFileSync(filePath, 'utf8');
      rows = parseTextToRecords(text).map((r, idx) => ({
        id: `preview-${idx + 1}`,
        ...r,
        isValid: Boolean(r.name)
      }));
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
    const { filename, rows, task_number, task_date, replaceMode } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No rows provided to import' });
    }

    const validRows = rows.filter(r => r.name && r.name.trim());
    if (validRows.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid rows found' });
    }

    const tNum = task_number ? parseInt(task_number) : 17;
    const tDate = task_date || '2026-08-17';

    if (replaceMode) {
      const dbRunLocal = require('./database').dbRun || null;
      if (dbRunLocal) {
        await dbRunLocal(`DELETE FROM device_records WHERE task_number = ?`, [tNum]);
      }
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
        group: row.group || '',
        issued_at: row.issued_at || '7.30 A.M.',
        return_time: row.return_time ? row.return_time.trim() : '',
        return_device: row.return_device || '',
        taking_device: row.taking_device || '',
        handover_to: row.handover_to || '',
        sign: evaluateSignStatus(row.sign),
        admin_user: 'Shanaka',
        task_number: tNum,
        task_date: tDate
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

// 14b. Quick Device List Parser (Parse raw list of mobile devices)
app.post('/api/upload/parse-quick-list', (req, res) => {
  try {
    const {
      rawText = '',
      startNumber = 1,
      padZero = true,
      shift = 'Day',
      group = '',
      issued_at = '7.30 A.M.'
    } = req.body;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ success: false, error: 'No device list text provided' });
    }

    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const rows = [];
    let currentNum = parseInt(startNumber) || 1;

    for (const line of lines) {
      const items = line.includes(',') ? line.split(',').map(s => s.trim()).filter(Boolean) : [line];

      for (const item of items) {
        if (!item) continue;
        if (/^(rec|emp|name|shift|group|device|phone|serial|model|list|taking)/i.test(item) && items.length === 1 && rows.length === 0) {
          continue;
        }

        const formattedEmpName = padZero && currentNum < 100
          ? String(currentNum).padStart(2, '0')
          : String(currentNum);

        rows.push({
          id: `quick-${rows.length + 1}`,
          emp_number: currentNum,
          name: formattedEmpName,
          shift: shift || 'Day',
          group: group || '',
          issued_at: issued_at || '7.30 A.M.',
          return_time: '',
          return_device: '',
          taking_device: item,
          handover_to: '',
          sign: 'Done',
          isValid: true
        });

        currentNum++;
      }
    }

    res.json({
      success: true,
      totalRows: rows.length,
      validRows: rows.length,
      rows
    });
  } catch (err) {
    console.error('Error parsing quick list:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14c. Quick Device List Confirm & Import (Supports Multi-Round Tracking & Comparison)
app.post('/api/upload/quick-list', async (req, res) => {
  try {
    const {
      rows,
      task_number = 19,
      task_date = '2026-11-19',
      round_number,
      round_name,
      check_time,
      raw_list = '',
      replaceMode = false
    } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No rows provided to import' });
    }

    const tNum = parseInt(task_number) || 19;
    const tDate = task_date || '2026-11-19';

    const roundResult = await saveTaskRound({
      task_number: tNum,
      task_date: tDate,
      round_number,
      round_name,
      check_time,
      rows,
      raw_list: raw_list || rows.map(r => r.taking_device).join('\n')
    });

    await createUploadBatch(
      `quick_daily_task_${tNum}_round_${roundResult.round_number}.txt`,
      rows.length,
      roundResult.total_devices
    );

    res.json({
      success: true,
      task_number: tNum,
      task_date: tDate,
      insertedCount: roundResult.total_devices,
      roundResult,
      message: `Successfully imported ${roundResult.total_devices} Today Active Mobiles for Task ${tNum} (${roundResult.round_name})! (+${roundResult.added_count} newly taken)`
    });
  } catch (err) {
    console.error('Error importing quick list:', err);
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
const possibleDistPaths = [
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'client', 'dist'),
  path.join(__dirname, 'public')
];

// Clean up stale hashed bundles in all static folders so old cached chunks can never be served
for (const distPath of possibleDistPaths) {
  try {
    const indexHtmlPath = path.join(distPath, 'index.html');
    const assetsDir = path.join(distPath, 'assets');
    if (fs.existsSync(indexHtmlPath) && fs.existsSync(assetsDir)) {
      const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
      const allAssets = fs.readdirSync(assetsDir);
      for (const file of allAssets) {
        if ((file.startsWith('index-') && (file.endsWith('.js') || file.endsWith('.css'))) || file === 'index.js') {
          if (!htmlContent.includes(file)) {
            try {
              fs.unlinkSync(path.join(assetsDir, file));
            } catch (_) {}
          }
        }
      }
    }
  } catch (_) {}
}

let clientDist = null;
for (const p of possibleDistPaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    clientDist = p;
    break;
  }
}

if (clientDist) {
  // Helper to resolve the active JS or CSS bundle referenced by index.html
  const getActiveAssetFile = (ext) => {
    try {
      const assetsDir = path.join(clientDist, 'assets');
      if (!fs.existsSync(assetsDir)) return null;
      const indexHtmlPath = path.join(clientDist, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        const html = fs.readFileSync(indexHtmlPath, 'utf8');
        const files = fs.readdirSync(assetsDir).filter(f => f.endsWith(ext));
        const match = files.find(f => html.includes(f));
        if (match) return path.join(assetsDir, match);
      }
      const files = fs.readdirSync(assetsDir)
        .filter(f => f.endsWith(ext))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(assetsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      return files.length > 0 ? path.join(assetsDir, files[0].name) : null;
    } catch (_) {
      return null;
    }
  };

  // Intercept /assets/*.js and /assets/*.css before express.static so even stale cached HTML always loads the latest bundle
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path.startsWith('/assets/')) {
      if (req.path.endsWith('.js')) {
        const activeJs = getActiveAssetFile('.js');
        if (activeJs && fs.existsSync(activeJs)) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          return res.sendFile(activeJs);
        }
      } else if (req.path.endsWith('.css')) {
        const activeCss = getActiveAssetFile('.css');
        if (activeCss && fs.existsSync(activeCss)) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          return res.sendFile(activeCss);
        }
      }
    }
    next();
  });

  app.use(express.static(clientDist, {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
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
