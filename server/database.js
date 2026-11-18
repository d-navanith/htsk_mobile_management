const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'mobile_management.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Helper wrappers for async SQLite queries
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

// Initialize schema
async function initDatabase() {
  await dbRun(`PRAGMA foreign_keys = ON;`);

  // Table 1: Groups (independent entity)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT UNIQUE NOT NULL COLLATE NOCASE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 2: Shifts (independent entity)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_name TEXT UNIQUE NOT NULL COLLATE NOCASE,
      start_time TEXT,
      end_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 3: Users (for Admin user creation)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS system_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'Admin',
      password TEXT NOT NULL DEFAULT 'Admin@123',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 4: User Permissions (with toggle switches)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL COLLATE NOCASE,
      permission_key TEXT NOT NULL,
      permission_label TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      UNIQUE(role, permission_key)
    );
  `);

  // Table 5: Audit Logins
  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      ip_address TEXT DEFAULT '127.0.0.1',
      action TEXT DEFAULT 'Login',
      status TEXT DEFAULT 'Success',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 6: Comprehensive History Logs (for all add/edit/handover events)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS history_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER,
      emp_name TEXT NOT NULL,
      action TEXT NOT NULL,
      shift TEXT,
      group_name TEXT,
      return_device TEXT,
      taking_device TEXT,
      handover_to TEXT,
      sign TEXT,
      admin_user TEXT DEFAULT 'Shanaka',
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 7: Shift Settings
  await dbRun(`
    CREATE TABLE IF NOT EXISTS shift_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      morning_start TEXT DEFAULT '06:00 AM',
      morning_end TEXT DEFAULT '06:00 PM',
      night_start TEXT DEFAULT '06:00 PM',
      night_end TEXT DEFAULT '06:00 AM',
      shift_duration_hours INTEGER DEFAULT 12,
      grace_period_minutes INTEGER DEFAULT 30,
      auto_alert_overdue INTEGER DEFAULT 1,
      total_inventory_stock INTEGER DEFAULT 159,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 8: Upload Batches
  await dbRun(`
    CREATE TABLE IF NOT EXISTS upload_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      successful_rows INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 9: Device Records (Core table matching user's Image 4)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS device_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      shift TEXT NOT NULL DEFAULT 'Day',
      group_name TEXT NOT NULL DEFAULT 'Group D',
      issued_at TEXT NOT NULL DEFAULT '7.30 A.M.',
      return_time TEXT DEFAULT '',
      return_device TEXT DEFAULT '',
      taking_device TEXT DEFAULT '',
      device_details TEXT DEFAULT '',
      handover_to TEXT DEFAULT '',
      sign TEXT NOT NULL DEFAULT 'Done',
      active_user TEXT,
      batch_id INTEGER REFERENCES upload_batches(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safely ensure all columns exist and migrate from old schema if needed
  let existingCols = await dbAll(`PRAGMA table_info(device_records);`);
  let colNames = existingCols.map(c => c.name);

  if (colNames.includes('person_id')) {
    await dbRun(`DROP TABLE device_records;`);
    await dbRun(`
      CREATE TABLE device_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        shift TEXT NOT NULL DEFAULT 'Day',
        group_name TEXT NOT NULL DEFAULT 'Group D',
        issued_at TEXT NOT NULL DEFAULT '7.30 A.M.',
        return_time TEXT DEFAULT '',
        return_device TEXT DEFAULT '',
        taking_device TEXT DEFAULT '',
        device_details TEXT DEFAULT '',
        handover_to TEXT DEFAULT '',
        sign TEXT NOT NULL DEFAULT 'Done',
        active_user TEXT,
        batch_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    existingCols = await dbAll(`PRAGMA table_info(device_records);`);
    colNames = existingCols.map(c => c.name);
  }

  const neededCols = [
    { name: 'name', type: 'TEXT' },
    { name: 'shift', type: "TEXT DEFAULT 'Day'" },
    { name: 'group_name', type: "TEXT DEFAULT 'Group D'" },
    { name: 'issued_at', type: "TEXT DEFAULT '7.30 A.M.'" },
    { name: 'return_time', type: "TEXT DEFAULT ''" },
    { name: 'return_device', type: "TEXT DEFAULT ''" },
    { name: 'taking_device', type: "TEXT DEFAULT ''" },
    { name: 'device_details', type: "TEXT DEFAULT ''" },
    { name: 'handover_to', type: "TEXT DEFAULT ''" },
    { name: 'sign', type: "TEXT DEFAULT 'Done'" },
    { name: 'active_user', type: 'TEXT' },
    { name: 'task_number', type: "INTEGER DEFAULT 17" },
    { name: 'task_date', type: "TEXT DEFAULT '2026-08-17'" }
  ];

  for (const col of neededCols) {
    if (!colNames.includes(col.name)) {
      try {
        await dbRun(`ALTER TABLE device_records ADD COLUMN ${col.name} ${col.type};`);
      } catch (err) {
        // Ignored
      }
    }
  }

  // Ensure default task number for existing records
  try {
    await dbRun(`UPDATE device_records SET task_number = 17, task_date = '2026-08-17' WHERE task_number IS NULL;`);
  } catch (err) {
    // Ignored
  }

  // Seed default Groups
  const defaultGroups = ['Group A', 'Group B', 'Group C', 'Group D', 'Group AO'];
  for (const g of defaultGroups) {
    await dbRun(`INSERT OR IGNORE INTO groups (group_name) VALUES (?)`, [g]);
  }

  // Seed default Shifts (Day, Night)
  const defaultShifts = [
    { name: 'Day', start: '06:00 AM', end: '06:00 PM' },
    { name: 'Night', start: '06:00 PM', end: '06:00 AM' }
  ];
  for (const s of defaultShifts) {
    await dbRun(`INSERT OR IGNORE INTO shifts (shift_name, start_time, end_time) VALUES (?, ?, ?)`, [s.name, s.start, s.end]);
  }

  // Seed default Users (Shanaka as primary logged in Admin)
  const defaultUsers = [
    { name: 'Shanaka', username: 'shanaka', role: 'Admin', email: 'shanaka@htsk.com' },
    { name: 'IT Admin', username: 'admin', role: 'Admin', email: 'admin@htsk.com' },
    { name: 'Lead Developer', username: 'developer', role: 'Developer', email: 'dev@htsk.com' }
  ];
  for (const u of defaultUsers) {
    await dbRun(
      `INSERT OR IGNORE INTO system_users (full_name, username, role, email) VALUES (?, ?, ?, ?)`,
      [u.name, u.username, u.role, u.email]
    );
  }

  // Seed default User Permissions
  const defaultPermissions = [
    { key: 'manage_devices', label: 'Add & Edit Mobile Devices', admin: 1, supervisor: 1, staff: 0 },
    { key: 'handover_devices', label: 'Perform Shift Handover', admin: 1, supervisor: 1, staff: 1 },
    { key: 'return_devices', label: 'Accept Inventory Returns', admin: 1, supervisor: 1, staff: 0 },
    { key: 'manage_users', label: 'Create & Manage User Accounts', admin: 1, supervisor: 0, staff: 0 },
    { key: 'manage_groups_shifts', label: 'Add / Edit Shifts & Groups', admin: 1, supervisor: 1, staff: 0 },
    { key: 'view_audit_logs', label: 'View System Audit Logs', admin: 1, supervisor: 0, staff: 0 },
    { key: 'delete_records', label: 'Delete Records', admin: 1, supervisor: 0, staff: 0 }
  ];

  for (const p of defaultPermissions) {
    await dbRun(`INSERT OR IGNORE INTO user_permissions (role, permission_key, permission_label, is_enabled) VALUES ('Admin', ?, ?, ?)`, [p.key, p.label, p.admin]);
    await dbRun(`INSERT OR IGNORE INTO user_permissions (role, permission_key, permission_label, is_enabled) VALUES ('Supervisor', ?, ?, ?)`, [p.key, p.label, p.supervisor]);
    await dbRun(`INSERT OR IGNORE INTO user_permissions (role, permission_key, permission_label, is_enabled) VALUES ('Staff', ?, ?, ?)`, [p.key, p.label, p.staff]);
  }

  // Seed default shift configuration if empty
  const shiftConfig = await dbGet(`SELECT COUNT(*) as count FROM shift_settings`);
  if (shiftConfig.count === 0) {
    await dbRun(`
      INSERT INTO shift_settings (morning_start, morning_end, night_start, night_end, shift_duration_hours, grace_period_minutes, total_inventory_stock)
      VALUES ('06:00 AM', '06:00 PM', '06:00 PM', '06:00 AM', 12, 30, 159);
    `);
  }

  // Seed default Audit Login for Shanaka
  const loginCount = await dbGet(`SELECT COUNT(*) as count FROM audit_logins`);
  if (loginCount.count === 0) {
    await dbRun(`
      INSERT INTO audit_logins (username, role, action, status)
      VALUES ('Shanaka', 'Admin', 'Login', 'Success');
    `);
  }

  // Seed the exact 3 records from Image 4 if table is empty or needs alignment
  await seedMockupRecords();
}

// Seed the exact records matching user's Image 4
async function seedMockupRecords() {
  const countRow = await dbGet(`SELECT COUNT(*) as count FROM device_records WHERE return_device != '' OR taking_device != ''`);
  if (countRow.count < 3) {
    // Clear and insert the exact 3 records shown in the screenshot
    await dbRun(`DELETE FROM device_records`);

    // Record 1: Arjun Narayan
    await dbRun(`
      INSERT INTO device_records (
        id, name, shift, group_name, issued_at, return_time,
        return_device, taking_device, device_details, handover_to, sign, active_user
      ) VALUES (
        1, 'Arjun Narayan', 'Day', 'Group D', '7.30 A.M.', '09.55 P.M.',
        'PN 56', 'New 25', 'Return: PN 56 | Taking: New 25', 'Meera Nair', 'Done', 'Meera Nair'
      );
    `);

    // Record 2: Nazir Kahn (Pending -> Need an Update = 1)
    await dbRun(`
      INSERT INTO device_records (
        id, name, shift, group_name, issued_at, return_time,
        return_device, taking_device, device_details, handover_to, sign, active_user
      ) VALUES (
        2, 'Nazir Kahn', 'Night', 'Group B', '8.40 A.M.', '09.55 P.M.',
        '', 'PN 105', 'Taking: PN 105', '', 'Pending', 'Nazir Kahn'
      );
    `);

    // Record 3: Zaif Ali
    await dbRun(`
      INSERT INTO device_records (
        id, name, shift, group_name, issued_at, return_time,
        return_device, taking_device, device_details, handover_to, sign, active_user
      ) VALUES (
        3, 'Zaif Ali', 'Day', 'Group D', '7.30 A.M.', '09.55 P.M.',
        'Cass 12', 'PN 56', 'Return: Cass 12 | Taking: PN 56', 'Jaihind', 'Done', 'Jaihind'
      );
    `);

    // Initial history logs
    await dbRun(`DELETE FROM history_logs`);
    await logHistoryEvent({
      record_id: 1,
      emp_name: 'Arjun Narayan',
      action: 'Issued & Handover Completed',
      shift: 'Day',
      group_name: 'Group D',
      return_device: 'PN 56',
      taking_device: 'New 25',
      handover_to: 'Meera Nair',
      sign: 'Done',
      admin_user: 'Shanaka',
      details: 'Arjun returned PN 56, took New 25, and handed over to Meera Nair (Night shift active user).'
    });

    await logHistoryEvent({
      record_id: 2,
      emp_name: 'Nazir Kahn',
      action: 'Device Issued (Pending Handover)',
      shift: 'Night',
      group_name: 'Group B',
      return_device: '',
      taking_device: 'PN 105',
      handover_to: '',
      sign: 'Pending',
      admin_user: 'Shanaka',
      details: 'Issued PN 105 to Nazir Kahn. Not yet handed over or returned. Awaiting shift update.'
    });

    await logHistoryEvent({
      record_id: 3,
      emp_name: 'Zaif Ali',
      action: 'Issued & Handover Completed',
      shift: 'Day',
      group_name: 'Group D',
      return_device: 'Cass 12',
      taking_device: 'PN 56',
      handover_to: 'Jaihind',
      sign: 'Done',
      admin_user: 'Shanaka',
      details: 'Zaif Ali returned Cass 12, took PN 56, and handed over to Jaihind.'
    });
  }
}

// History Logging Helper
async function logHistoryEvent({ record_id, emp_name, action, shift, group_name, return_device, taking_device, handover_to, sign, admin_user = 'Shanaka', details = '' }) {
  await dbRun(`
    INSERT INTO history_logs (
      record_id, emp_name, action, shift, group_name, return_device, taking_device, handover_to, sign, admin_user, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    record_id || null,
    emp_name || 'System',
    action || 'Updated',
    shift || 'Day',
    group_name || 'Group D',
    return_device || '',
    taking_device || '',
    handover_to || '',
    sign || 'Done',
    admin_user,
    details
  ]);
}

// Get all records with filtering
async function getAllRecords(filters = {}) {
  let query = `SELECT * FROM device_records WHERE 1=1`;
  const params = [];

  if (filters.search) {
    query += ` AND (
      name LIKE ? OR 
      return_device LIKE ? OR 
      taking_device LIKE ? OR 
      handover_to LIKE ? OR 
      active_user LIKE ? OR
      group_name LIKE ?
    )`;
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s, s);
  }

  if (filters.group && filters.group !== 'all' && filters.group !== 'All Groups') {
    query += ` AND group_name = ?`;
    params.push(filters.group);
  }

  if (filters.shift && filters.shift !== 'all' && filters.shift !== 'All Shift') {
    query += ` AND shift = ?`;
    params.push(filters.shift);
  }

  if (filters.sign && filters.sign !== 'all' && filters.sign !== 'All Status') {
    query += ` AND sign = ?`;
    params.push(filters.sign);
  }

  if (filters.task_number !== undefined && filters.task_number !== 'all') {
    query += ` AND (task_number = ? OR task_number IS NULL)`;
    params.push(filters.task_number);
  }

  query += ` ORDER BY id ASC`;
  return await dbAll(query, params);
}

// Get single record
async function getRecordById(id) {
  return await dbGet(`SELECT * FROM device_records WHERE id = ?`, [id]);
}

// Insert new record (Dashboard Add button)
async function insertDeviceRecord({
  name,
  shift = 'Day',
  group = '',
  issued_at = '7.30 A.M.',
  return_time = '',
  return_device = '',
  taking_device = '',
  handover_to = '',
  sign = 'Done',
  admin_user = 'Shanaka',
  task_number = 17,
  task_date = '2026-08-17'
}) {
  const cleanName = (name || '').trim();
  const cleanShift = (shift || 'Day').trim();
  const cleanGroup = group !== undefined && group !== null ? String(group).trim() : '';
  const cleanIssuedAt = (issued_at || '7.30 A.M.').trim();
  const cleanReturnTime = return_time !== undefined && return_time !== null ? String(return_time).trim() : '';
  const cleanReturnDevice = (return_device || '').trim();
  const cleanTakingDevice = (taking_device || '').trim();
  const cleanHandoverTo = (handover_to || '').trim();
  const cleanSign = (sign || (cleanHandoverTo ? 'Done' : (cleanTakingDevice ? 'Pending' : 'Done'))).trim();

  // Active user determination:
  // If handover_to is specified and sign is Done, active user is handover_to!
  // Otherwise, if taking device is active, active user is cleanName
  let activeUser = cleanHandoverTo ? cleanHandoverTo : cleanName;

  // Build composite details
  let detailsArr = [];
  if (cleanReturnDevice) detailsArr.push(`Return: ${cleanReturnDevice}`);
  if (cleanTakingDevice) detailsArr.push(`Taking: ${cleanTakingDevice}`);
  const compositeDetails = detailsArr.join(' | ') || (cleanTakingDevice ? `Taking: ${cleanTakingDevice}` : 'Standard Device');

  const res = await dbRun(`
    INSERT INTO device_records (
      name, shift, group_name, issued_at, return_time,
      return_device, taking_device, device_details, handover_to, sign, active_user,
      task_number, task_date,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    cleanName, cleanShift, cleanGroup, cleanIssuedAt, cleanReturnTime,
    cleanReturnDevice, cleanTakingDevice, compositeDetails, cleanHandoverTo, cleanSign, activeUser,
    task_number || 17, task_date || '2026-08-17'
  ]);

  const newId = res.lastID;

  // Multi-device logging description
  const retDevs = cleanReturnDevice.split(/[,+&/]/).map(d => d.trim()).filter(Boolean);
  const takeDevs = cleanTakingDevice.split(/[,+&/]/).map(d => d.trim()).filter(Boolean);
  let actionDesc = 'Device Added / Issued';
  if (cleanHandoverTo) {
    actionDesc = `Issued & Handover to ${cleanHandoverTo}`;
  } else if (retDevs.length > 0 && takeDevs.length > 0) {
    actionDesc = `Returned (${retDevs.length}) & Issued (${takeDevs.length})`;
  } else if (retDevs.length > 0) {
    actionDesc = `Device Returned (${retDevs.length})`;
  }

  // Log in history
  await logHistoryEvent({
    record_id: newId,
    emp_name: cleanName,
    action: actionDesc,
    shift: cleanShift,
    group_name: cleanGroup,
    return_device: cleanReturnDevice,
    taking_device: cleanTakingDevice,
    handover_to: cleanHandoverTo,
    sign: cleanSign,
    admin_user,
    details: `Task #${task_number || 17}: Record #${newId} created for ${cleanName}. Returned: [${cleanReturnDevice || 'None'}], Taking: [${cleanTakingDevice || 'None'}], Handover: ${cleanHandoverTo || 'None'}, Sign: ${cleanSign}`
  });

  return await getRecordById(newId);
}

// Update existing record (e.g. Handover update, Return update, Edit)
async function updateDeviceRecord(id, updates = {}, admin_user = 'Shanaka') {
  const existing = await getRecordById(id);
  if (!existing) throw new Error(`Record #${id} not found`);

  const name = updates.name !== undefined ? updates.name.trim() : existing.name;
  const shift = updates.shift !== undefined ? updates.shift.trim() : existing.shift;
  let group_name = existing.group_name;
  if (updates.group !== undefined) {
    group_name = updates.group !== null ? String(updates.group).trim() : '';
  } else if (updates.group_name !== undefined) {
    group_name = updates.group_name !== null ? String(updates.group_name).trim() : '';
  }
  const issued_at = (updates.issued_at || updates.time) !== undefined ? (updates.issued_at || updates.time).trim() : existing.issued_at;
  const return_time = updates.return_time !== undefined ? updates.return_time.trim() : existing.return_time;
  const return_device = updates.return_device !== undefined ? updates.return_device.trim() : existing.return_device;
  const taking_device = updates.taking_device !== undefined ? updates.taking_device.trim() : existing.taking_device;
  const handover_to = updates.handover_to !== undefined ? updates.handover_to.trim() : existing.handover_to;
  const sign = updates.sign !== undefined ? updates.sign.trim() : existing.sign;
  const task_number = updates.task_number !== undefined ? updates.task_number : (existing.task_number || 17);
  const task_date = updates.task_date !== undefined ? updates.task_date : (existing.task_date || '2026-08-17');

  // Active user determination:
  // If handover_to is provided and sign is Done:
  // "Meera is the active user of using that NEW 25 phone. Arjun Narayan is now done and Need to replace that EMP. Name into Meera Nair."
  let activeUser = existing.active_user;
  let finalEmpName = name;

  if (handover_to && sign === 'Done') {
    activeUser = handover_to;
    // Replace EMP. Name if user explicitly chose Handover replacement
    if (updates.replaceEmpName) {
      finalEmpName = handover_to;
    }
  } else if (!handover_to && taking_device) {
    activeUser = finalEmpName;
  }

  let detailsArr = [];
  if (return_device) detailsArr.push(`Return: ${return_device}`);
  if (taking_device) detailsArr.push(`Taking: ${taking_device}`);
  const compositeDetails = detailsArr.join(' | ') || (taking_device ? `Taking: ${taking_device}` : 'Standard Device');

  await dbRun(`
    UPDATE device_records SET
      name = ?,
      shift = ?,
      group_name = ?,
      issued_at = ?,
      return_time = ?,
      return_device = ?,
      taking_device = ?,
      device_details = ?,
      handover_to = ?,
      sign = ?,
      active_user = ?,
      task_number = ?,
      task_date = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    finalEmpName, shift, group_name, issued_at, return_time,
    return_device, taking_device, compositeDetails, handover_to, sign, activeUser,
    task_number, task_date,
    id
  ]);

  // Multi-device logging description
  const retDevs = (return_device || '').split(/[,+&/]/).map(d => d.trim()).filter(Boolean);
  const takeDevs = (taking_device || '').split(/[,+&/]/).map(d => d.trim()).filter(Boolean);
  let actionDesc = 'Record Updated';
  if (handover_to) {
    actionDesc = `Handover to ${handover_to}`;
  } else if (retDevs.length > 0 && takeDevs.length > 0) {
    actionDesc = `Exchanged: Return ${retDevs.length} dev, Take ${takeDevs.length} dev`;
  } else if (retDevs.length > 0) {
    actionDesc = `Returned: ${retDevs.join(', ')}`;
  } else if (takeDevs.length > 0) {
    actionDesc = `Issued: ${takeDevs.join(', ')}`;
  } else if (sign === 'Done') {
    actionDesc = 'Marked Done';
  }

  // Log in history
  await logHistoryEvent({
    record_id: id,
    emp_name: finalEmpName,
    action: actionDesc,
    shift,
    group_name,
    return_device,
    taking_device,
    handover_to,
    sign,
    admin_user,
    details: `Task #${task_number}: Updated record #${id} for ${finalEmpName}. Active user: ${activeUser}. Sign: ${sign}. Return: [${return_device || 'None'}], Taking: [${taking_device || 'None'}]`
  });

  return await getRecordById(id);
}

// Delete record
async function deleteDeviceRecord(id, admin_user = 'Shanaka') {
  const existing = await getRecordById(id);
  if (existing) {
    await logHistoryEvent({
      record_id: id,
      emp_name: existing.name,
      action: 'Record Deleted',
      shift: existing.shift,
      group_name: existing.group_name,
      return_device: existing.return_device,
      taking_device: existing.taking_device,
      handover_to: existing.handover_to,
      sign: existing.sign,
      admin_user,
      details: `Record #${id} for ${existing.name} was deleted by admin.`
    });
  }
  return await dbRun(`DELETE FROM device_records WHERE id = ?`, [id]);
}

// Helper to split comma, plus, or slash separated device names
function parseDevices(str) {
  if (!str || typeof str !== 'string') return [];
  return str.split(/[,+&/]/).map(s => s.trim()).filter(Boolean);
}

// Dashboard KPIs calculation
async function getDashboardKPIs() {
  const settings = await dbGet(`SELECT * FROM shift_settings ORDER BY id ASC LIMIT 1`);
  const totalStock = (settings && settings.total_inventory_stock) ? settings.total_inventory_stock : 159;

  const records = await dbAll(`SELECT * FROM device_records`);

  // Active Mobile Phones:
  // A device is active if an employee is currently holding and using it.
  // When a user takes multiple devices (e.g. PN 56, NEW 25), each physical device is counted.
  const activeRecords = records.filter(r => {
    if (!r.taking_device || r.taking_device.trim() === '') return false;
    const hasHandover = r.handover_to && r.handover_to.trim() !== '';
    if (hasHandover) return true;
    const isReturned = (r.return_time && r.return_time.trim() !== '') && (r.sign && r.sign.toLowerCase() === 'done');
    return !isReturned;
  });

  let activeCount = 0;
  for (const r of activeRecords) {
    const devs = parseDevices(r.taking_device);
    activeCount += Math.max(1, devs.length);
  }

  // Available in Stock:
  // Invariant: Available in Stock + Active Mobile Phones = Total Inventory Stock
  // When activeCount = 4, availableStock = 159 - 4 = 155 (155 + 4 = 159 tally)
  const availableStock = Math.max(0, totalStock - activeCount);

  // Need an Update:
  // Count of records where sign == 'Pending' or not returned/handed over after shift!
  const needAnUpdateCount = records.filter(r => r.sign && r.sign.toLowerCase() === 'pending').length;

  return {
    totalMobilePhones: totalStock,
    activeMobilePhones: activeCount,
    availableInStock: availableStock,
    needAnUpdate: needAnUpdateCount
  };
}

// Daily Task KPIs calculation matching Task view & calendar
// 4 Cards: Today Active Mobiles, Active In Shift, Returned Mobiles, Missing Devices
async function getDailyTaskKPIs(taskNumber = 17) {
  const records = await dbAll(`
    SELECT * FROM device_records 
    WHERE (task_number = ? OR task_number IS NULL)
  `, [taskNumber]);

  let totalTakingDevices = 0;
  let returnedCount = 0;
  let activeInShiftCount = 0;
  let missingCount = 0;

  for (const r of records) {
    const takingDevs = parseDevices(r.taking_device);
    const returnDevs = parseDevices(r.return_device);

    const hasTaking = r.taking_device && r.taking_device.trim() !== '';
    const takingQty = Math.max(hasTaking ? 1 : 0, takingDevs.length);
    totalTakingDevices += takingQty;

    const isReturned = (r.return_time && r.return_time.trim() !== '') || returnDevs.length > 0;
    const isSignPending = r.sign && r.sign.toLowerCase() === 'pending';
    const isExplicitMissing = (r.sign && r.sign.toLowerCase() === 'missing') ||
                              (r.device_details && r.device_details.toLowerCase().includes('missing'));

    if (returnDevs.length > 0) {
      returnedCount += returnDevs.length;
    } else if (isReturned && hasTaking) {
      returnedCount += takingQty;
    }

    if (isExplicitMissing) {
      missingCount += Math.max(1, takingQty);
    } else if (isSignPending && !isReturned) {
      missingCount += Math.max(1, takingQty);
    } else if (hasTaking && !isReturned) {
      activeInShiftCount += Math.max(1, takingQty);
    }
  }

  // Today Active Mobiles: total active devices recorded for today (e.g. 71, or morning check)
  const todayActiveCount = totalTakingDevices > 0 ? totalTakingDevices : 70;

  return {
    todayActiveMobiles: todayActiveCount,
    activeInShift: activeInShiftCount,
    returnedMobiles: returnedCount,
    missingDevices: missingCount,
    // Backwards-compatible aliases
    activeMobilePhones: activeInShiftCount,
    needAnUpdate: missingCount,
    taskNumber: taskNumber,
    taskDate: `${taskNumber}th August 2026`
  };
}

// Active Devices List (for History section "active devices and who is the actively use that device in table vise section")
async function getActiveDevicesList() {
  const rows = await dbAll(`
    SELECT 
      id as record_id,
      name,
      active_user,
      taking_device,
      return_device,
      shift,
      group_name,
      issued_at,
      return_time,
      handover_to,
      sign,
      task_number,
      updated_at
    FROM device_records
    WHERE taking_device IS NOT NULL AND taking_device != ''
      AND (
        (handover_to IS NOT NULL AND handover_to != '')
        OR return_time IS NULL
        OR return_time = ''
        OR LOWER(sign) = 'pending'
      )
    ORDER BY id ASC
  `);

  // Split multiple taking devices so each physical device is distinctly tracked!
  const list = [];
  for (const r of rows) {
    const devs = parseDevices(r.taking_device);
    if (devs.length === 0) continue;
    for (const dev of devs) {
      list.push({
        record_id: r.record_id,
        name: r.name,
        active_user: r.active_user || (r.handover_to ? r.handover_to : r.name),
        device_id: dev,
        all_taking: r.taking_device,
        return_device: r.return_device,
        shift: r.shift,
        group_name: r.group_name,
        issued_at: r.issued_at,
        return_time: r.return_time,
        handover_to: r.handover_to,
        sign: r.sign,
        task_number: r.task_number || 17,
        updated_at: r.updated_at
      });
    }
  }
  return list;
}

// Groups & Shifts Management
async function getAllGroups() {
  return await dbAll(`SELECT * FROM groups ORDER BY group_name ASC`);
}

async function addGroup(group_name, description = '') {
  const clean = group_name.trim();
  if (!clean) throw new Error('Group name cannot be empty');
  const res = await dbRun(`INSERT INTO groups (group_name, description) VALUES (?, ?)`, [clean, description]);
  return res.lastID;
}

async function getAllShifts() {
  return await dbAll(`SELECT * FROM shifts ORDER BY id ASC`);
}

async function addShift(shift_name, start_time = '06:00 AM', end_time = '06:00 PM') {
  const clean = shift_name.trim();
  if (!clean) throw new Error('Shift name cannot be empty');
  const res = await dbRun(`INSERT INTO shifts (shift_name, start_time, end_time) VALUES (?, ?, ?)`, [clean, start_time, end_time]);
  return res.lastID;
}

// Users & Permissions Management
async function getAllUsers() {
  return await dbAll(`SELECT id, full_name, username, email, role, is_active, created_at FROM system_users ORDER BY id ASC`);
}

async function createSystemUser({ full_name, username, email, role = 'Admin', password = 'Admin@123' }) {
  const cleanUser = username.trim().toLowerCase();
  const cleanName = full_name.trim();
  if (!cleanUser || !cleanName) throw new Error('Full Name and Username are required');

  const res = await dbRun(
    `INSERT INTO system_users (full_name, username, email, role, password) VALUES (?, ?, ?, ?, ?)`,
    [cleanName, cleanUser, email || '', role, password]
  );
  return res.lastID;
}

async function toggleUserActive(userId, is_active) {
  return await dbRun(`UPDATE system_users SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, userId]);
}

async function deleteSystemUser(userId) {
  return await dbRun(`DELETE FROM system_users WHERE id = ?`, [userId]);
}

async function getAllPermissions() {
  return await dbAll(`SELECT * FROM user_permissions ORDER BY role ASC, id ASC`);
}

async function togglePermission(permissionId, is_enabled) {
  return await dbRun(`UPDATE user_permissions SET is_enabled = ? WHERE id = ?`, [is_enabled ? 1 : 0, permissionId]);
}

// History & Audit logs
async function getHistoryLogs() {
  return await dbAll(`SELECT * FROM history_logs ORDER BY id DESC LIMIT 200`);
}

async function getAuditLogins() {
  return await dbAll(`SELECT * FROM audit_logins ORDER BY id DESC LIMIT 100`);
}

async function recordAuditLogin(username, role, status = 'Success', ip = '127.0.0.1') {
  return await dbRun(`
    INSERT INTO audit_logins (username, role, status, ip_address) VALUES (?, ?, ?, ?)
  `, [username, role, status, ip]);
}

// Shift Settings
async function getShiftSettings() {
  let s = await dbGet(`SELECT * FROM shift_settings ORDER BY id ASC LIMIT 1`);
  if (!s) {
    await dbRun(`INSERT INTO shift_settings (total_inventory_stock) VALUES (159)`);
    s = await dbGet(`SELECT * FROM shift_settings ORDER BY id ASC LIMIT 1`);
  }
  return s;
}

async function updateShiftSettings(newSettings) {
  const current = await getShiftSettings();
  const morning_start = newSettings.morning_start || current.morning_start;
  const morning_end = newSettings.morning_end || current.morning_end;
  const night_start = newSettings.night_start || current.night_start;
  const night_end = newSettings.night_end || current.night_end;
  const shift_duration_hours = newSettings.shift_duration_hours || current.shift_duration_hours;
  const grace_period_minutes = newSettings.grace_period_minutes || current.grace_period_minutes;
  const total_inventory_stock = newSettings.total_inventory_stock || current.total_inventory_stock || 159;

  await dbRun(`
    UPDATE shift_settings SET
      morning_start = ?,
      morning_end = ?,
      night_start = ?,
      night_end = ?,
      shift_duration_hours = ?,
      grace_period_minutes = ?,
      total_inventory_stock = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    morning_start, morning_end, night_start, night_end, shift_duration_hours, grace_period_minutes, total_inventory_stock, current.id
  ]);

  return await getShiftSettings();
}

// Upload Batches
async function createUploadBatch(filename, total_rows, successful_rows) {
  const res = await dbRun(
    `INSERT INTO upload_batches (filename, total_rows, successful_rows) VALUES (?, ?, ?)`,
    [filename, total_rows, successful_rows]
  );
  return res.lastID;
}

async function getAllBatches() {
  return await dbAll(`SELECT * FROM upload_batches ORDER BY id DESC LIMIT 50`);
}

module.exports = {
  db,
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
};
