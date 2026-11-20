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

  // Table 4b: System Roles (Manageable by Admin)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS system_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT UNIQUE NOT NULL COLLATE NOCASE,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      group_name TEXT DEFAULT '',
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
        group_name TEXT DEFAULT '',
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
    { name: 'group_name', type: "TEXT DEFAULT ''" },
    { name: 'issued_at', type: "TEXT DEFAULT '7.30 A.M.'" },
    { name: 'return_time', type: "TEXT DEFAULT ''" },
    { name: 'return_device', type: "TEXT DEFAULT ''" },
    { name: 'taking_device', type: "TEXT DEFAULT ''" },
    { name: 'device_details', type: "TEXT DEFAULT ''" },
    { name: 'handover_to', type: "TEXT DEFAULT ''" },
    { name: 'sign', type: "TEXT DEFAULT 'Done'" },
    { name: 'active_user', type: 'TEXT' },
    { name: 'task_number', type: "INTEGER DEFAULT 17" },
    { name: 'task_date', type: "TEXT DEFAULT '2026-08-17'" },
    { name: 'round_number', type: "INTEGER DEFAULT 1" },
    { name: 'is_new_in_round', type: "INTEGER DEFAULT 0" },
    { name: 'prev_round_status', type: "TEXT DEFAULT 'active'" },
    { name: 'check_time', type: "TEXT DEFAULT '8.30 A.M.'" }
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

  // Seed default Roles
  const defaultRoles = ['Admin', 'Supervisor', 'Staff', 'Developer'];
  for (const r of defaultRoles) {
    await dbRun(`INSERT OR IGNORE INTO system_roles (role_name) VALUES (?)`, [r]);
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

  // Table 10: Inventory Items (241 Mobile phones catalog: PN 1-122, NEW 1-90, CASS 1-29)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_tag TEXT NOT NULL UNIQUE,
      series TEXT NOT NULL,
      model_name TEXT DEFAULT 'Samsung / Android Mobile Unit',
      storage_location TEXT DEFAULT 'Charging Station A',
      condition_status TEXT DEFAULT 'Good',
      manual_status TEXT DEFAULT 'Auto',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 11: Daily Task Rounds (Intra-day device count updates & comparison history)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS daily_task_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_number INTEGER NOT NULL,
      task_date TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      round_name TEXT DEFAULT '',
      check_time TEXT DEFAULT '8.30 A.M.',
      total_devices INTEGER NOT NULL,
      added_count INTEGER DEFAULT 0,
      removed_count INTEGER DEFAULT 0,
      retained_count INTEGER DEFAULT 0,
      added_devices TEXT DEFAULT '[]',
      removed_devices TEXT DEFAULT '[]',
      raw_list TEXT DEFAULT '',
      records_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_number, round_number)
    );
  `);

  // Ensure check_time, records_json, and resolutions_json exist in daily_task_rounds
  try {
    const roundCols = await dbAll(`PRAGMA table_info(daily_task_rounds);`);
    const roundColNames = roundCols.map(c => c.name);
    if (!roundColNames.includes('check_time')) {
      await dbRun(`ALTER TABLE daily_task_rounds ADD COLUMN check_time TEXT DEFAULT '8.30 A.M.';`);
    }
    if (!roundColNames.includes('records_json')) {
      await dbRun(`ALTER TABLE daily_task_rounds ADD COLUMN records_json TEXT DEFAULT '[]';`);
    }
    if (!roundColNames.includes('resolutions_json')) {
      await dbRun(`ALTER TABLE daily_task_rounds ADD COLUMN resolutions_json TEXT DEFAULT '{}';`);
    }
  } catch (err) {
    // Ignored
  }

  // Ensure animation_enabled column exists in system_users
  try {
    const userCols = await dbAll(`PRAGMA table_info(system_users);`);
    const userColNames = userCols.map(c => c.name);
    if (!userColNames.includes('animation_enabled')) {
      await dbRun(`ALTER TABLE system_users ADD COLUMN animation_enabled INTEGER DEFAULT 1;`);
      await dbRun(`UPDATE system_users SET animation_enabled = 1 WHERE animation_enabled IS NULL;`);
    }
    if (!userColNames.includes('avatar_url')) {
      await dbRun(`ALTER TABLE system_users ADD COLUMN avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';`);
      await dbRun(`UPDATE system_users SET avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' WHERE avatar_url IS NULL;`);
    }
  } catch (err) {
    // Ignored
  }

  // Table 12: Dashboard Animation Management (Matching user screenshot)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS dashboard_animations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animation_key TEXT UNIQUE NOT NULL,
      animation_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Disable',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default animations matching user mockup
  const animCount = await dbGet(`SELECT COUNT(*) as count FROM dashboard_animations`);
  if (animCount.count === 0) {
    await dbRun(`INSERT INTO dashboard_animations (animation_key, animation_name, status, is_active) VALUES ('snow', 'Snow Animation', 'Enable', 1)`);
    await dbRun(`INSERT INTO dashboard_animations (animation_key, animation_name, status, is_active) VALUES ('rain', 'Rain Animation', 'Disable', 0)`);
    await dbRun(`INSERT INTO dashboard_animations (animation_key, animation_name, status, is_active) VALUES ('sparkle', 'Sparkle Animation', 'Disable', 0)`);
  }

  // Seed default 241 inventory items if empty
  await seedDefaultInventory241();

  // Seed initial task rounds for existing daily tasks
  await seedInitialTaskRounds();

  // Seed the exact 3 records from Image 4 if table is empty or needs alignment
  await seedMockupRecords();
}

// Seed the exact 241 inventory items (PN 1-122, NEW 1-90, CASS 1-29)
async function seedDefaultInventory241() {
  const countRow = await dbGet(`SELECT COUNT(*) as count FROM inventory_items`);
  if (!countRow || countRow.count === 0) {
    // Seed PN 1 - 122 (122 phones)
    for (let i = 1; i <= 122; i++) {
      await dbRun(
        `INSERT INTO inventory_items (device_tag, series, model_name, storage_location, condition_status, manual_status, notes) VALUES (?, 'PN Series', 'Samsung / Android Mobile Unit', 'Charging Station A', 'Good', 'Auto', '')`,
        [`Pn ${i}`]
      );
    }
    // Seed NEW 1 - 90 (90 phones)
    for (let i = 1; i <= 90; i++) {
      await dbRun(
        `INSERT INTO inventory_items (device_tag, series, model_name, storage_location, condition_status, manual_status, notes) VALUES (?, 'NEW Series', 'Samsung / Android Mobile Unit', 'Storage Rack B-1', 'Good', 'Auto', '')`,
        [`New ${i}`]
      );
    }
    // Seed CASS 1 - 29 (29 phones)
    for (let i = 1; i <= 29; i++) {
      await dbRun(
        `INSERT INTO inventory_items (device_tag, series, model_name, storage_location, condition_status, manual_status, notes) VALUES (?, 'CASS Series', 'Samsung / Android Mobile Unit', 'Charging Station B', 'Good', 'Auto', '')`,
        [`Cass ${i}`]
      );
    }
    await dbRun(`UPDATE shift_settings SET total_inventory_stock = 241`);
  }
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
    group_name || '',
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
    query += ` AND task_number = ?`;
    params.push(filters.task_number);
  } else if (filters.task_date) {
    query += ` AND task_date = ?`;
    params.push(filters.task_date);
  } else if (filters.current_active || filters.dashboard_active) {
    query += ` AND task_number = (SELECT COALESCE(MAX(task_number), 17) FROM device_records)`;
  }

  if (filters.round_number !== undefined && filters.round_number !== 'all' && filters.round_number !== '') {
    query += ` AND round_number = ?`;
    params.push(parseInt(filters.round_number));
  }

  if (filters.only_new_in_round === 'true' || filters.only_new_in_round === true) {
    query += ` AND is_new_in_round = 1`;
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
  task_number,
  task_date
}) {
  // If task_number or task_date are not provided, default dynamically to the latest active task and date
  if (!task_number || !task_date) {
    const latestRow = await dbGet(`SELECT MAX(task_number) as latestTask, MAX(task_date) as latestDate FROM device_records`);
    if (!task_number) task_number = (latestRow && latestRow.latestTask) ? latestRow.latestTask : 19;
    if (!task_date) task_date = (latestRow && latestRow.latestDate) ? latestRow.latestDate : '2026-11-19';
  }
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

// Normalizes device key for robust cross-matching: "Cass 02" -> "cass2", "Pn 07" -> "pn7", "New 68" -> "new68"
function normalizeDeviceKey(str) {
  if (!str) return '';
  const clean = String(str).trim().toLowerCase().replace(/[\s_\-#.]+/g, '');
  const m = clean.match(/^([a-z]+)0*(\d+)$/);
  if (m) return `${m[1]}${parseInt(m[2], 10)}`;
  return clean;
}

// Dashboard KPIs calculation (Supports specific date/task calendar filtering or defaults to current active)
async function getDashboardKPIs(taskNumber, taskDate) {
  const settings = await dbGet(`SELECT * FROM shift_settings ORDER BY id ASC LIMIT 1`);
  const totalStock = (settings && settings.total_inventory_stock) ? settings.total_inventory_stock : 241;

  // Find latest active task number and date
  const latestTaskRow = await dbGet(`SELECT MAX(task_number) as latestTask, MAX(task_date) as latestDate FROM device_records`);
  const latestTask = (latestTaskRow && latestTaskRow.latestTask) ? latestTaskRow.latestTask : 17;
  const latestDate = (latestTaskRow && latestTaskRow.latestDate) ? latestTaskRow.latestDate : '2026-11-19';

  let activeTask = (taskNumber !== undefined && taskNumber !== null && taskNumber !== 'all') ? parseInt(taskNumber) : (taskDate ? undefined : latestTask);
  let records;
  let effectiveDate = taskDate;

  if (taskNumber === 'all') {
    records = await dbAll(`SELECT * FROM device_records`);
    activeTask = 'all';
    effectiveDate = 'All Dates';
  } else if (taskDate) {
    records = await dbAll(`SELECT * FROM device_records WHERE task_date = ?`, [taskDate]);
    if (records.length > 0 && records[0].task_number) {
      activeTask = records[0].task_number;
    }
  } else {
    records = await dbAll(`SELECT * FROM device_records WHERE task_number = ?`, [activeTask]);
    if (records.length > 0 && records[0].task_date) {
      effectiveDate = records[0].task_date;
    } else if (activeTask === latestTask) {
      effectiveDate = latestDate;
    }
  }

  // Active Mobile Phones:
  // A device is active if an employee is currently holding and using it.
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
  const availableStock = Math.max(0, totalStock - activeCount);

  // Need an Update:
  // Count of records where sign == 'Pending' or not returned/handed over
  const needAnUpdateCount = records.filter(r => r.sign && r.sign.toLowerCase() === 'pending').length;

  const availableDays = await getHistoryAvailableDays();

  return {
    totalMobilePhones: totalStock,
    activeMobilePhones: activeCount, // 78 on Nov 19
    availableInStock: availableStock, // 163 on Nov 19
    needAnUpdate: needAnUpdateCount,
    activeTaskNumber: activeTask,
    activeTaskDate: effectiveDate || (activeTask === 17 ? '2026-11-17' : (activeTask === 18 ? '2026-11-18' : '2026-11-19')),
    isLatest: activeTask === latestTask,
    latestTaskNumber: latestTask,
    latestTaskDate: latestDate,
    totalRecords: records.length,
    availableDays
  };
}

// Daily Task KPIs calculation matching Task view & calendar
// 4 Cards: Today Active Mobiles, Active In Shift, Returned Mobiles, Missing Devices
async function getDailyTaskKPIs(taskNumber = 17, taskDate = null) {
  let query = `SELECT * FROM device_records WHERE task_number = ?`;
  const params = [taskNumber];
  if (taskDate) {
    query += ` AND task_date = ?`;
    params.push(taskDate);
  }

  const records = await dbAll(query, params);
  const taskRounds = await getTaskRounds(taskNumber, taskDate);
  const latestRound = await getLatestTaskRound(taskNumber, taskDate);

  // 1. Collect from device_records (each return record represents a returned device instance)
  let returnedCount = 0;
  const returnedDevSet = new Set();
  const missingDevSet = new Set();

  for (const r of records) {
    const returnDevs = parseDevices(r.return_device);
    const takingDevs = parseDevices(r.taking_device);

    for (const dev of returnDevs) {
      const norm = normalizeDeviceTag(dev);
      if (norm) {
        returnedCount++;
        returnedDevSet.add(norm);
        missingDevSet.delete(norm);
      }
    }

    if (r.sign && r.sign.toLowerCase() === 'missing') {
      for (const dev of takingDevs) {
        const norm = normalizeDeviceTag(dev);
        if (norm && !returnedDevSet.has(norm)) {
          missingDevSet.add(norm);
        }
      }
    }
  }

  // 2. Also collect from all rounds' resolutions for this task (if a dropped device was marked returned or missing
  // that was not already recorded in device_records)
  for (const rnd of taskRounds) {
    if (rnd.resolutions) {
      for (const [normTag, res] of Object.entries(rnd.resolutions)) {
        if (res && res.status === 'returned') {
          if (!returnedDevSet.has(normTag)) {
            returnedCount++;
            returnedDevSet.add(normTag);
          }
          missingDevSet.delete(normTag);
        } else if (res && res.status === 'missing') {
          if (!returnedDevSet.has(normTag)) {
            missingDevSet.add(normTag);
          }
        }
      }
    }
  }

  const missingCount = missingDevSet.size;

  // Total Taking count for this day (from latest round if present, or distinct taking devices)
  let todayActiveCount = 0;
  if (latestRound && latestRound.total_devices) {
    todayActiveCount = latestRound.total_devices;
  } else {
    const takingDevSet = new Set();
    for (const r of records) {
      for (const dev of parseDevices(r.taking_device)) {
        takingDevSet.add(normalizeDeviceTag(dev));
      }
    }
    todayActiveCount = takingDevSet.size;
  }

  const activeInShiftCount = Math.max(0, todayActiveCount - returnedCount);
  const newInRoundCount = records.filter(r => r.is_new_in_round === 1).length;

  return {
    todayActiveMobiles: todayActiveCount,
    activeInShift: activeInShiftCount,
    returnedMobiles: returnedCount,
    missingDevices: missingCount,
    newInRoundCount,
    rounds: taskRounds,
    latestRound: latestRound ? latestRound.round_number : 1,
    // Backwards-compatible aliases
    activeMobilePhones: activeInShiftCount,
    needAnUpdate: missingCount,
    taskNumber: taskNumber,
    taskDate: taskDate || `${taskNumber}th November 2026`
  };
}

// Active Devices List (for History section "active devices and who is the actively use that device in table vise section")
async function getActiveDevicesList(filter = {}) {
  let whereClauses = ["taking_device IS NOT NULL AND taking_device != ''"];
  let params = [];

  if (filter.task_number) {
    whereClauses.push("task_number = ?");
    params.push(Number(filter.task_number));
  }
  if (filter.task_date) {
    whereClauses.push("task_date = ?");
    params.push(filter.task_date);
  }

  // If no specific task/date requested and not asking for all records, show latest task
  if (!filter.task_number && !filter.task_date && !filter.all) {
    whereClauses.push("task_number = (SELECT COALESCE(MAX(task_number), 17) FROM device_records)");
  }

  const sql = `
    SELECT 
      id as record_id,
      name,
      active_user,
      taking_device,
      return_device,
      device_details,
      shift,
      group_name,
      issued_at,
      return_time,
      handover_to,
      sign,
      task_number,
      task_date,
      updated_at
    FROM device_records
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY id ASC
  `;
  const rows = await dbAll(sql, params);

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
        device_details: r.device_details,
        shift: r.shift,
        group_name: r.group_name,
        issued_at: r.issued_at,
        return_time: r.return_time,
        handover_to: r.handover_to,
        sign: r.sign,
        task_number: r.task_number || 17,
        task_date: r.task_date || '2026-11-17',
        updated_at: r.updated_at
      });
    }
  }
  return list;
}

async function getHistoryAvailableDays() {
  return await dbAll(`
    SELECT 
      task_number,
      task_date,
      COUNT(*) as total_records,
      COUNT(*) as device_count,
      SUM(CASE WHEN LOWER(sign) = 'done' THEN 1 ELSE 0 END) as done_count,
      SUM(CASE WHEN LOWER(sign) = 'pending' THEN 1 ELSE 0 END) as pending_count
    FROM device_records
    WHERE taking_device IS NOT NULL AND taking_device != ''
    GROUP BY task_number, task_date
    ORDER BY task_number DESC
  `);
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
  return await dbAll(`SELECT id, full_name, username, email, role, is_active, COALESCE(animation_enabled, 1) as animation_enabled, COALESCE(avatar_url, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80') as avatar_url, created_at FROM system_users ORDER BY id ASC`);
}

async function createSystemUser({ full_name, username, email, role = 'Admin', password = 'Admin@123', animation_enabled = 1 }) {
  const cleanUser = username.trim().toLowerCase();
  const cleanName = full_name.trim();
  if (!cleanUser || !cleanName) throw new Error('Full Name and Username are required');

  const res = await dbRun(
    `INSERT INTO system_users (full_name, username, email, role, password, animation_enabled) VALUES (?, ?, ?, ?, ?, ?)`,
    [cleanName, cleanUser, email || '', role, password, animation_enabled ? 1 : 0]
  );
  return res.lastID;
}

async function toggleUserActive(userId, is_active) {
  const user = await dbGet(`SELECT * FROM system_users WHERE id = ?`, [userId]);
  if (user && (user.role.toLowerCase() === 'admin' || user.username.toLowerCase() === 'shanaka')) {
    if (!is_active) {
      throw new Error('Admin status cannot be set to Inactive.');
    }
  }
  return await dbRun(`UPDATE system_users SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, userId]);
}

async function toggleUserAnimation(userId, animation_enabled) {
  return await dbRun(`UPDATE system_users SET animation_enabled = ? WHERE id = ?`, [animation_enabled ? 1 : 0, userId]);
}

async function deleteSystemUser(userId) {
  const user = await dbGet(`SELECT * FROM system_users WHERE id = ?`, [userId]);
  if (user && (user.role.toLowerCase() === 'admin' || user.username.toLowerCase() === 'shanaka')) {
    throw new Error('Admin user cannot be deleted.');
  }
  return await dbRun(`DELETE FROM system_users WHERE id = ?`, [userId]);
}

async function authenticateUser(username, password, ip = '127.0.0.1') {
  if (!username || !password) {
    return { success: false, error: 'Username and password are required' };
  }
  const cleanUser = username.trim().toLowerCase();
  const user = await dbGet(`SELECT * FROM system_users WHERE LOWER(username) = ? LIMIT 1`, [cleanUser]);

  if (!user) {
    await recordAuditLogin(cleanUser, 'Unknown', 'Failed - Unknown User', ip);
    return { success: false, error: 'Invalid username or password' };
  }

  if (user.is_active !== 1) {
    await recordAuditLogin(user.username, user.role, 'Blocked - Inactive Account', ip);
    return { success: false, error: 'Your account has been deactivated. Please contact the administrator.' };
  }

  // Verify password (support exact match or admin fallback)
  const isValidPassword = (user.password === password) ||
    (cleanUser === 'shanaka' && (password === 'Admin@123' || password === 'admin123')) ||
    (cleanUser === 'admin' && (password === 'Admin@123' || password === 'admin123'));

  if (!isValidPassword) {
    await recordAuditLogin(user.username, user.role, 'Failed - Wrong Password', ip);
    return { success: false, error: 'Invalid username or password' };
  }

  await recordAuditLogin(user.username, user.role, 'Success', ip);
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      email: user.email,
      avatar_url: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      animation_enabled: user.animation_enabled
    }
  };
}

// User Profile Management (Admin & Users)
async function getUserProfile(identifier) {
  let user;
  if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
    user = await dbGet(
      `SELECT id, full_name, username, email, role, COALESCE(avatar_url, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80') as avatar_url, is_active, animation_enabled, created_at FROM system_users WHERE id = ?`,
      [identifier]
    );
  } else {
    user = await dbGet(
      `SELECT id, full_name, username, email, role, COALESCE(avatar_url, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80') as avatar_url, is_active, animation_enabled, created_at FROM system_users WHERE LOWER(username) = LOWER(?)`,
      [String(identifier).trim()]
    );
  }
  return user;
}

async function updateUserProfile(identifier, { full_name, username, email, avatar_url, current_password, new_password }) {
  let user;
  if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
    user = await dbGet(`SELECT * FROM system_users WHERE id = ?`, [identifier]);
  } else {
    user = await dbGet(`SELECT * FROM system_users WHERE LOWER(username) = LOWER(?)`, [String(identifier).trim()]);
  }

  if (!user) {
    throw new Error('User not found.');
  }

  const cleanFullName = full_name !== undefined ? full_name.trim() : user.full_name;
  const cleanUsername = username !== undefined ? username.trim().toLowerCase() : user.username;
  const cleanEmail = email !== undefined ? email.trim() : (user.email || '');
  const cleanAvatarUrl = avatar_url !== undefined ? avatar_url.trim() : (user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80');

  if (!cleanFullName || !cleanUsername) {
    throw new Error('Full Name and Username cannot be empty.');
  }

  // Check username uniqueness if changed
  if (cleanUsername !== user.username.toLowerCase()) {
    const existing = await dbGet(`SELECT id FROM system_users WHERE LOWER(username) = ? AND id != ?`, [cleanUsername, user.id]);
    if (existing) {
      throw new Error(`Username "${cleanUsername}" is already taken by another account.`);
    }
  }

  // Handle password change if requested
  let passwordToSet = user.password;
  if (new_password && new_password.trim() !== '') {
    if (!current_password) {
      throw new Error('Current password is required to change password.');
    }
    const isCurrentValid = (current_password === user.password) ||
      (user.username.toLowerCase() === 'shanaka' && (current_password === 'Admin@123' || current_password === 'admin123')) ||
      (user.username.toLowerCase() === 'admin' && (current_password === 'Admin@123' || current_password === 'admin123'));

    if (!isCurrentValid) {
      throw new Error('Current password is incorrect.');
    }
    if (new_password.length < 4) {
      throw new Error('New password must be at least 4 characters long.');
    }
    passwordToSet = new_password;
  }

  await dbRun(
    `UPDATE system_users SET full_name = ?, username = ?, email = ?, avatar_url = ?, password = ? WHERE id = ?`,
    [cleanFullName, cleanUsername, cleanEmail, cleanAvatarUrl, passwordToSet, user.id]
  );

  return {
    id: user.id,
    full_name: cleanFullName,
    username: cleanUsername,
    email: cleanEmail,
    role: user.role,
    avatar_url: cleanAvatarUrl,
    is_active: user.is_active,
    animation_enabled: user.animation_enabled
  };
}

// System Roles Management (Admin can add more roles)
async function getAllRoles() {
  const roles = await dbAll(`SELECT * FROM system_roles ORDER BY id ASC`);
  if (roles.length === 0) {
    const defaultRoles = ['Admin', 'Supervisor', 'Staff', 'Developer'];
    for (const r of defaultRoles) {
      await dbRun(`INSERT OR IGNORE INTO system_roles (role_name) VALUES (?)`, [r]);
    }
    return await dbAll(`SELECT * FROM system_roles ORDER BY id ASC`);
  }
  return roles;
}

async function addRole(role_name, description = '') {
  const cleanRole = role_name.trim();
  if (!cleanRole) throw new Error('Role name cannot be empty');

  // Insert role
  await dbRun(
    `INSERT OR IGNORE INTO system_roles (role_name, description) VALUES (?, ?)`,
    [cleanRole, description || '']
  );

  // Initialize permissions for the new role
  const defaultPerms = [
    { key: 'manage_devices', label: 'Add & Edit Mobile Devices', enabled: 1 },
    { key: 'handover_devices', label: 'Perform Shift Handover', enabled: 1 },
    { key: 'return_devices', label: 'Accept Inventory Returns', enabled: 1 },
    { key: 'manage_users', label: 'Create & Manage User Accounts', enabled: 0 },
    { key: 'manage_groups_shifts', label: 'Add / Edit Shifts & Groups', enabled: 0 },
    { key: 'view_audit_logs', label: 'View System Audit Logs', enabled: 0 },
    { key: 'delete_records', label: 'Delete Records', enabled: 0 }
  ];

  for (const p of defaultPerms) {
    await dbRun(
      `INSERT OR IGNORE INTO user_permissions (role, permission_key, permission_label, is_enabled) VALUES (?, ?, ?, ?)`,
      [cleanRole, p.key, p.label, p.enabled]
    );
  }

  return await getAllRoles();
}

// Dashboard Animation Management (Matching user screenshot: "One animation can use one time only")
async function getAllDashboardAnimations() {
  return await dbAll(`SELECT * FROM dashboard_animations ORDER BY id ASC`);
}

async function toggleDashboardAnimation(animId, is_enabled) {
  if (is_enabled) {
    // Rule: "One animation can use one time only"
    // Disable all other animations first
    await dbRun(`UPDATE dashboard_animations SET is_active = 0, status = 'Disable'`);
    // Enable the selected animation
    await dbRun(`UPDATE dashboard_animations SET is_active = 1, status = 'Enable' WHERE id = ?`, [animId]);
  } else {
    // Disable this animation
    await dbRun(`UPDATE dashboard_animations SET is_active = 0, status = 'Disable' WHERE id = ?`, [animId]);
  }
  return await getAllDashboardAnimations();
}

async function getActiveDashboardAnimation() {
  return await dbGet(`SELECT * FROM dashboard_animations WHERE is_active = 1 LIMIT 1`);
}

async function checkUserAnimationStatus(username) {
  const activeAnim = await dbGet(`SELECT * FROM dashboard_animations WHERE is_active = 1 LIMIT 1`);
  if (!activeAnim) {
    return { allowed: false, activeAnimation: null };
  }
  
  if (!username) {
    return { allowed: true, activeAnimation: activeAnim.animation_key };
  }

  const user = await dbGet(`SELECT animation_enabled FROM system_users WHERE LOWER(username) = LOWER(?) LIMIT 1`, [username.trim()]);
  const isAllowed = user ? (user.animation_enabled === 1 || user.animation_enabled === null || user.animation_enabled === undefined) : true;
  
  return {
    allowed: Boolean(isAllowed),
    activeAnimation: activeAnim.animation_key
  };
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

// Inventory Management: Dynamic tracking with latest day or selected day
async function getAllInventoryItems(filter = {}) {
  // 1. Determine latest day in device_records
  const latestTaskRow = await dbGet(`
    SELECT task_number, task_date 
    FROM device_records 
    WHERE taking_device IS NOT NULL AND taking_device != ''
    ORDER BY task_number DESC, task_date DESC, id DESC 
    LIMIT 1
  `);

  const activeTaskNumber = filter.task_number !== undefined && filter.task_number !== 'all' && filter.task_number !== ''
    ? Number(filter.task_number)
    : (latestTaskRow ? latestTaskRow.task_number : 18);

  const activeTaskDate = filter.task_date
    ? filter.task_date
    : (latestTaskRow ? latestTaskRow.task_date : '2026-11-18');

  // 2. Fetch the records for that active day
  const dayRecords = await dbAll(`
    SELECT * FROM device_records 
    WHERE task_number = ? AND taking_device IS NOT NULL AND taking_device != ''
  `, [activeTaskNumber]);

  // 3. Map active devices on that active day using normalized key (e.g. "Cass 02" -> "cass2")
  const activeMap = new Map();

  for (const r of dayRecords) {
    const devs = parseDevices(r.taking_device);
    for (const d of devs) {
      const key = normalizeDeviceKey(d);
      activeMap.set(key, {
        device_tag: d,
        holder: r.active_user || (r.handover_to ? r.handover_to : r.name),
        shift: r.shift || 'Day',
        group_name: r.group_name || '',
        issued_at: r.issued_at || '7.30 A.M.',
        return_time: r.return_time || '',
        handover_to: r.handover_to || '',
        sign: r.sign || 'Done',
        task_number: r.task_number,
        task_date: r.task_date
      });
    }
  }

  // Load all items in catalog
  let items = await dbAll(`SELECT * FROM inventory_items ORDER BY series ASC, id ASC`);

  // 4. Compute status & KPIs with full series counts
  let maintenance = 0, missing = 0;
  let pnTotal = 0, pnInUse = 0;
  let newTotal = 0, newInUse = 0;
  let cassTotal = 0, cassInUse = 0;

  const catalog = items.map(item => {
    const key = normalizeDeviceKey(item.device_tag);
    let status = 'Available';
    let holder = item.storage_location || 'Charging Station';
    let shift = '—';
    let group_name = '';
    let issued_at = '—';
    let return_time = '—';
    let task_number = '—';
    let task_date = '—';
    let sign = '—';

    const s = (item.series || '').toUpperCase();
    const isPn = s.includes('PN') || key.startsWith('pn');
    const isNew = s.includes('NEW') || key.startsWith('new');
    const isCass = s.includes('CASS') || key.startsWith('cass');

    if (isPn) pnTotal++;
    else if (isNew) newTotal++;
    else if (isCass) cassTotal++;

    if (item.manual_status && item.manual_status !== 'Auto') {
      status = item.manual_status;
      if (status === 'Maintenance') maintenance++;
      else if (status === 'Missing') missing++;
      else if (status === 'In Use') {
        if (isPn) pnInUse++;
        else if (isNew) newInUse++;
        else if (isCass) cassInUse++;
      }
    } else if (activeMap.has(key)) {
      status = 'In Use';
      const act = activeMap.get(key);
      holder = act.holder;
      shift = act.shift;
      group_name = act.group_name;
      issued_at = act.issued_at;
      return_time = act.return_time;
      task_number = act.task_number;
      task_date = act.task_date;
      sign = act.sign;
      if (isPn) pnInUse++;
      else if (isNew) newInUse++;
      else if (isCass) cassInUse++;
    }

    return {
      ...item,
      status,
      holder,
      shift,
      group_name,
      issued_at,
      return_time,
      task_number,
      task_date,
      sign
    };
  });

  // Matches exactly the active day count (78 on Nov 19)
  const inUse = dayRecords.length;
  const available = Math.max(0, catalog.length - inUse);

  // 5. Available days list
  const availableDays = await dbAll(`
    SELECT 
      task_number, 
      task_date, 
      COUNT(*) as total_records,
      COUNT(*) as device_count 
    FROM device_records 
    WHERE taking_device IS NOT NULL AND taking_device != ''
    GROUP BY task_number, task_date 
    ORDER BY task_number DESC
  `);

  return {
    items: catalog,
    activeDay: {
      task_number: activeTaskNumber,
      task_date: activeTaskDate,
      isLatest: latestTaskRow ? activeTaskNumber === latestTaskRow.task_number : true,
      latestTaskNumber: latestTaskRow ? latestTaskRow.task_number : 19,
      latestTaskDate: latestTaskRow ? latestTaskRow.task_date : '2026-11-19'
    },
    availableDays,
    kpis: {
      totalStock: catalog.length,
      availableStock: available,
      inUseStock: inUse, // 78 on Nov 19
      maintenanceStock: maintenance,
      missingStock: missing,
      seriesStats: {
        pn: {
          total: pnTotal,
          inUse: pnInUse,
          available: Math.max(0, pnTotal - pnInUse),
          label: 'PN 1 - 122',
          name: 'PN Series'
        },
        new: {
          total: newTotal,
          inUse: newInUse,
          available: Math.max(0, newTotal - newInUse),
          label: 'NEW 1 - 90',
          name: 'NEW Series'
        },
        cass: {
          total: cassTotal,
          inUse: cassInUse,
          available: Math.max(0, cassTotal - cassInUse),
          label: 'CASS 1 - 29',
          name: 'CASS Series'
        }
      }
    }
  };
}

async function addInventoryItem({ device_tag, series, phone_type, model_name, storage_location, condition_status, notes }) {
  let cleanTag = (device_tag || '').trim();
  if (!cleanTag) throw new Error('Device Tag / Number is required');

  let chosenType = (phone_type || series || '').trim().toUpperCase();
  let detectedSeries = 'PN Series';

  if (chosenType.includes('NEW') || cleanTag.toLowerCase().startsWith('new')) {
    detectedSeries = 'NEW Series';
    if (!cleanTag.toLowerCase().startsWith('new')) {
      cleanTag = `New ${cleanTag.replace(/^new\s*/i, '')}`;
    }
  } else if (chosenType.includes('CASS') || cleanTag.toLowerCase().startsWith('cass')) {
    detectedSeries = 'CASS Series';
    if (!cleanTag.toLowerCase().startsWith('cass')) {
      cleanTag = `Cass ${cleanTag.replace(/^cass\s*/i, '')}`;
    }
  } else if (chosenType.includes('PN') || cleanTag.toLowerCase().startsWith('pn')) {
    detectedSeries = 'PN Series';
    if (!cleanTag.toLowerCase().startsWith('pn')) {
      cleanTag = `Pn ${cleanTag.replace(/^pn\s*/i, '')}`;
    }
  } else if (series) {
    detectedSeries = series;
  }

  // Format clean casing e.g. "new 91" -> "New 91", "pn 125" -> "Pn 125"
  const m = cleanTag.match(/^([a-zA-Z]+)\s*(\d+)$/);
  if (m) {
    const prefix = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    cleanTag = `${prefix} ${m[2]}`;
  }

  const res = await dbRun(`
    INSERT INTO inventory_items (device_tag, series, model_name, storage_location, condition_status, manual_status, notes)
    VALUES (?, ?, ?, ?, ?, 'Auto', ?)
  `, [
    cleanTag,
    detectedSeries,
    model_name || 'Samsung / Android Mobile Unit',
    storage_location || 'Charging Station A',
    condition_status || 'Good',
    notes || ''
  ]);

  // Update total stock count in shift settings
  const total = await dbGet(`SELECT count(*) as count FROM inventory_items`);
  if (total && total.count) {
    await dbRun(`UPDATE shift_settings SET total_inventory_stock = ?`, [total.count]);
  }

  return res.lastID;
}

async function updateInventoryItem(id, updates = {}) {
  const existing = await dbGet(`SELECT * FROM inventory_items WHERE id = ?`, [id]);
  if (!existing) throw new Error(`Inventory item #${id} not found`);

  const device_tag = updates.device_tag !== undefined ? updates.device_tag.trim() : existing.device_tag;
  const series = updates.series !== undefined ? updates.series.trim() : existing.series;
  const model_name = updates.model_name !== undefined ? updates.model_name.trim() : existing.model_name;
  const storage_location = updates.storage_location !== undefined ? updates.storage_location.trim() : existing.storage_location;
  const condition_status = updates.condition_status !== undefined ? updates.condition_status.trim() : existing.condition_status;
  const manual_status = updates.manual_status !== undefined ? updates.manual_status.trim() : existing.manual_status;
  const notes = updates.notes !== undefined ? updates.notes.trim() : existing.notes;

  await dbRun(`
    UPDATE inventory_items SET
      device_tag = ?,
      series = ?,
      model_name = ?,
      storage_location = ?,
      condition_status = ?,
      manual_status = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [device_tag, series, model_name, storage_location, condition_status, manual_status, notes, id]);

  return await dbGet(`SELECT * FROM inventory_items WHERE id = ?`, [id]);
}

async function deleteInventoryItem(id) {
  return await dbRun(`DELETE FROM inventory_items WHERE id = ?`, [id]);
}

// ==========================================
// INTRA-DAY TASK ROUNDS & COMPARISON HELPERS
// ==========================================

function normalizeDeviceTag(tag) {
  if (!tag) return '';
  const s = String(tag).trim().toLowerCase();
  const m = s.match(/^([a-z]+)\s*0*(\d+)$/i);
  if (m) {
    return `${m[1]}${parseInt(m[2], 10)}`;
  }
  return s.replace(/\s+/g, '');
}

function formatDeviceTag(tag) {
  if (!tag) return '';
  const s = String(tag).trim();
  const m = s.match(/^([a-z]+)\s*(\d+)$/i);
  if (m) {
    const prefix = m[1].toUpperCase();
    const num = parseInt(m[2], 10);
    if (prefix === 'PN') return `PN ${num}`;
    if (prefix === 'NEW') return `New ${num}`;
    if (prefix === 'CASS') return `Cass ${num}`;
    return `${prefix} ${num}`;
  }
  return s;
}

function compareDeviceLists(prevTags = [], newTags = []) {
  const prevNormMap = new Map();
  for (const t of prevTags) {
    const k = normalizeDeviceTag(t);
    if (k && !prevNormMap.has(k)) prevNormMap.set(k, t);
  }

  const newNormMap = new Map();
  for (const t of newTags) {
    const k = normalizeDeviceTag(t);
    if (k && !newNormMap.has(k)) newNormMap.set(k, t);
  }

  const added = [];
  for (const [k, origTag] of newNormMap.entries()) {
    if (!prevNormMap.has(k)) {
      added.push(origTag);
    }
  }

  const removed = [];
  for (const [k, origTag] of prevNormMap.entries()) {
    if (!newNormMap.has(k)) {
      removed.push(origTag);
    }
  }

  const retained = [];
  for (const [k, origTag] of newNormMap.entries()) {
    if (prevNormMap.has(k)) {
      retained.push(origTag);
    }
  }

  return { added, removed, retained };
}

async function seedInitialTaskRounds() {
  try {
    const distinctTasks = await dbAll(`
      SELECT task_number, task_date, COUNT(*) as count 
      FROM device_records 
      WHERE task_number IS NOT NULL AND taking_device != ''
      GROUP BY task_number, task_date
      ORDER BY task_number ASC
    `);

    for (const t of distinctTasks) {
      const existingRound = await dbGet(`SELECT * FROM daily_task_rounds WHERE task_number = ? AND round_number = 1`, [t.task_number]);
      if (!existingRound) {
        const recs = await dbAll(`SELECT taking_device FROM device_records WHERE task_number = ? ORDER BY id ASC`, [t.task_number]);
        const devList = recs.map(r => r.taking_device).filter(Boolean);
        await dbRun(`
          INSERT INTO daily_task_rounds (
            task_number, task_date, round_number, round_name, total_devices,
            added_count, removed_count, retained_count, added_devices, removed_devices, raw_list
          ) VALUES (?, ?, 1, 'Round 1 (Initial Morning Taking)', ?, ?, 0, 0, ?, '[]', ?)
        `, [
          t.task_number,
          t.task_date || '2026-11-19',
          devList.length,
          devList.length,
          JSON.stringify(devList),
          devList.join('\n')
        ]);
      }
    }
  } catch (e) {
    console.error('Error seeding initial task rounds:', e);
  }
}

async function getTaskRounds(taskNumber, taskDate) {
  let query = `SELECT * FROM daily_task_rounds WHERE 1=1`;
  const params = [];
  if (taskNumber !== undefined && taskNumber !== null && taskNumber !== 'all') {
    query += ` AND task_number = ?`;
    params.push(parseInt(taskNumber));
  }
  if (taskDate) {
    query += ` AND task_date = ?`;
    params.push(taskDate);
  }
  query += ` ORDER BY round_number ASC`;
  const rounds = await dbAll(query, params);

  // Aggregate all resolutions across rounds for this task
  const allResolutions = {};
  for (const r of rounds) {
    if (r.resolutions_json) {
      try {
        const parsed = JSON.parse(r.resolutions_json);
        Object.assign(allResolutions, parsed);
      } catch (e) {}
    }
  }

  // Also check device_records for any returned / missing devices logged for this task
  try {
    const tNumInt = parseInt(taskNumber);
    if (!isNaN(tNumInt)) {
      const dbDevs = await dbAll(`
        SELECT taking_device, return_device, return_time, sign FROM device_records
        WHERE task_number = ? AND (
          (return_device IS NOT NULL AND return_device != '') OR
          sign = 'Missing'
        )
      `, [tNumInt]);
      for (const d of dbDevs) {
        if (d.return_device && d.return_device.trim() !== '') {
          const norm = normalizeDeviceTag(d.return_device);
          if (norm && !allResolutions[norm]) {
            allResolutions[norm] = {
              status: 'returned',
              device_tag: d.return_device,
              check_time: d.return_time || 'Office Returned'
            };
          }
        }
        if (d.sign && d.sign.toLowerCase() === 'missing') {
          const norm = normalizeDeviceTag(d.taking_device);
          if (norm && !allResolutions[norm]) {
            allResolutions[norm] = {
              status: 'missing',
              device_tag: d.taking_device
            };
          }
        }
      }
    }
  } catch (err) {}

  return rounds.map(r => {
    let records = [];
    if (r.records_json && r.records_json !== '[]') {
      try {
        const parsed = JSON.parse(r.records_json);
        // Guarantee round 1 never has is_new_in_round set
        records = parsed.map(rec => ({
          ...rec,
          is_new_in_round: r.round_number === 1 ? 0 : (rec.is_new_in_round || 0)
        }));
      } catch (e) {}
    }
    // Fallback: construct round records from raw_list if records_json is empty
    if (records.length === 0 && r.raw_list) {
      const devList = r.raw_list.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const addedSet = new Set((r.added_devices ? JSON.parse(r.added_devices) : []).map(normalizeDeviceTag));
      records = devList.map((tag, idx) => {
        const num = idx + 1;
        const name = num < 100 ? String(num).padStart(2, '0') : String(num);
        const isNew = r.round_number > 1 && addedSet.has(normalizeDeviceTag(tag));
        return {
          id: `round-${r.round_number}-${num}`,
          emp_number: num,
          name,
          shift: 'Day',
          group_name: '',
          issued_at: '7.30 A.M.',
          return_time: '',
          return_device: '',
          taking_device: tag,
          handover_to: '',
          sign: 'Done',
          is_new_in_round: isNew ? 1 : 0,
          round_number: r.round_number,
          check_time: r.check_time || (r.round_number === 1 ? '8.30 A.M.' : '02.00 P.M.')
        };
      });
    }

    const checkTime = r.check_time || (r.round_number === 1 ? '8.30 A.M.' : (r.round_number === 2 ? '02.00 P.M.' : '05.30 P.M.'));
    const roundTitle = `Task ${r.task_number}.${r.round_number} : Time ${checkTime}`;

    let parsedResolutions = {};
    if (r.resolutions_json) {
      try {
        parsedResolutions = JSON.parse(r.resolutions_json);
      } catch (e) {}
    }

    // Apply resolutions so that previous task / round records show returned or missing status in their row
    records = records.map(rec => {
      const normTaking = normalizeDeviceTag(rec.taking_device);
      const res = allResolutions[normTaking];
      if (res) {
        if (res.status === 'returned') {
          return {
            ...rec,
            return_device: res.device_tag || rec.taking_device,
            return_time: res.check_time || checkTime || 'Office Returned',
            sign: 'Done',
            device_details: `Return: ${res.device_tag || rec.taking_device} | Taking: ${rec.taking_device}`,
            is_resolved_returned: true
          };
        } else if (res.status === 'missing') {
          return {
            ...rec,
            return_device: '',
            return_time: '',
            sign: 'Missing',
            device_details: 'Missing Device (Attention Required)',
            is_resolved_missing: true
          };
        }
      }
      return rec;
    });

    return {
      ...r,
      round_title: roundTitle,
      check_time: checkTime,
      records,
      added_devices: r.round_number === 1 ? [] : (r.added_devices ? JSON.parse(r.added_devices) : []),
      removed_devices: r.removed_devices ? JSON.parse(r.removed_devices) : [],
      resolutions: parsedResolutions
    };
  });
}

async function getLatestTaskRound(taskNumber, taskDate) {
  let query = `SELECT * FROM daily_task_rounds WHERE 1=1`;
  const params = [];
  if (taskNumber !== undefined && taskNumber !== null && taskNumber !== 'all') {
    query += ` AND task_number = ?`;
    params.push(parseInt(taskNumber));
  }
  if (taskDate) {
    query += ` AND task_date = ?`;
    params.push(taskDate);
  }
  query += ` ORDER BY round_number DESC LIMIT 1`;
  const r = await dbGet(query, params);
  if (!r) return null;
  const checkTime = r.check_time || (r.round_number === 1 ? '8.30 A.M.' : (r.round_number === 2 ? '02.00 P.M.' : '05.30 P.M.'));
  return {
    ...r,
    round_title: `Task ${r.task_number}.${r.round_number} : Time ${checkTime}`,
    check_time: checkTime,
    added_devices: r.added_devices ? JSON.parse(r.added_devices) : [],
    removed_devices: r.removed_devices ? JSON.parse(r.removed_devices) : []
  };
}

async function updateTaskRound(roundId, updates = {}) {
  const existing = await dbGet(`SELECT * FROM daily_task_rounds WHERE id = ?`, [roundId]);
  if (!existing) throw new Error(`Round #${roundId} not found`);

  const check_time = updates.check_time !== undefined ? updates.check_time.trim() : existing.check_time;
  const round_name = updates.round_name !== undefined ? updates.round_name.trim() : existing.round_name;

  await dbRun(`
    UPDATE daily_task_rounds SET
      check_time = ?,
      round_name = ?
    WHERE id = ?
  `, [check_time, round_name, roundId]);

  return await dbGet(`SELECT * FROM daily_task_rounds WHERE id = ?`, [roundId]);
}

async function compareTaskRound(taskNumber, taskDate, newRawTextOrTags) {
  const tNum = parseInt(taskNumber) || 19;
  const latestRound = await getLatestTaskRound(tNum, taskDate);
  
  let previousTags = [];
  let prevRoundNumber = 0;
  let prevRoundName = 'No Previous Round';

  if (latestRound) {
    prevRoundNumber = latestRound.round_number;
    prevRoundName = latestRound.round_name || `Round ${latestRound.round_number}`;
    if (latestRound.raw_list) {
      previousTags = latestRound.raw_list.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    } else {
      const recs = await dbAll(`SELECT taking_device FROM device_records WHERE task_number = ? ORDER BY id ASC`, [tNum]);
      previousTags = recs.map(r => r.taking_device).filter(Boolean);
    }
  } else {
    const recs = await dbAll(`SELECT taking_device FROM device_records WHERE task_number = ? ORDER BY id ASC`, [tNum]);
    if (recs.length > 0) {
      previousTags = recs.map(r => r.taking_device).filter(Boolean);
      prevRoundNumber = 1;
      prevRoundName = 'Round 1 (Initial)';
    }
  }

  let newTags = [];
  if (Array.isArray(newRawTextOrTags)) {
    newTags = newRawTextOrTags.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof newRawTextOrTags === 'string') {
    newTags = newRawTextOrTags.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }

  const { added, removed, retained } = compareDeviceLists(previousTags, newTags);
  const nextRoundNumber = prevRoundNumber + 1;

  return {
    taskNumber: tNum,
    taskDate: taskDate || '2026-11-19',
    previousRoundNumber: prevRoundNumber,
    previousRoundName: prevRoundName,
    nextRoundNumber,
    previousCount: previousTags.length,
    newCount: newTags.length,
    addedCount: added.length,
    removedCount: removed.length,
    retainedCount: retained.length,
    addedDevices: added,
    removedDevices: removed,
    retainedDevices: retained
  };
}

async function saveTaskRound({
  task_number = 19,
  task_date = '2026-11-19',
  round_number = null,
  round_name = '',
  check_time = null,
  rows = [],
  raw_list = ''
}) {
  const tNum = parseInt(task_number) || 19;
  const tDate = task_date || '2026-11-19';

  const comparison = await compareTaskRound(tNum, tDate, raw_list || rows.map(r => r.taking_device));
  const assignedRoundNumber = round_number || comparison.nextRoundNumber;
  const assignedCheckTime = (check_time && check_time.trim())
    ? check_time.trim()
    : (assignedRoundNumber === 1 ? '8.30 A.M.' : (assignedRoundNumber === 2 ? '02.00 P.M.' : '05.30 P.M.'));
  const assignedRoundName = round_name || `Task ${tNum}.${assignedRoundNumber}`;
  const assignedRoundTitle = `Task ${tNum}.${assignedRoundNumber} : Time ${assignedCheckTime}`;

  const addedNormSet = new Set(comparison.addedDevices.map(normalizeDeviceTag));

  // Prepare full snapshot rows for records_json
  const processedRows = rows.map((r, idx) => {
    const isNew = assignedRoundNumber > 1 && addedNormSet.has(normalizeDeviceTag(r.taking_device)) ? 1 : 0;
    const rowRound = isNew ? assignedRoundNumber : (assignedRoundNumber > 1 ? 1 : assignedRoundNumber);
    const rowStatus = isNew ? 'new_taking' : 'retained';
    return {
      id: r.id || `round-${assignedRoundNumber}-${idx + 1}`,
      emp_number: r.emp_number || (idx + 1),
      name: (r.name || r.emp_name || String(idx + 1)).trim(),
      shift: r.shift || 'Day',
      group_name: r.group || r.group_name || '',
      issued_at: r.issued_at || '7.30 A.M.',
      return_time: r.return_time || '',
      return_device: r.return_device || '',
      taking_device: (r.taking_device || '').trim(),
      handover_to: r.handover_to || '',
      sign: r.sign || 'Done',
      is_new_in_round: isNew,
      round_number: rowRound,
      prev_round_status: rowStatus,
      check_time: assignedCheckTime
    };
  });

  await dbRun(`
    INSERT OR REPLACE INTO daily_task_rounds (
      task_number, task_date, round_number, round_name, check_time, total_devices,
      added_count, removed_count, retained_count, added_devices, removed_devices, raw_list, records_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    tNum,
    tDate,
    assignedRoundNumber,
    assignedRoundName,
    assignedCheckTime,
    rows.length,
    assignedRoundNumber === 1 ? 0 : comparison.addedCount,
    assignedRoundNumber === 1 ? 0 : comparison.removedCount,
    assignedRoundNumber === 1 ? rows.length : comparison.retainedCount,
    assignedRoundNumber === 1 ? '[]' : JSON.stringify(comparison.addedDevices),
    assignedRoundNumber === 1 ? '[]' : JSON.stringify(comparison.removedDevices),
    raw_list || rows.map(r => r.taking_device).join('\n'),
    JSON.stringify(processedRows)
  ]);

  await dbRun(`DELETE FROM device_records WHERE task_number = ?`, [tNum]);

  let insertedCount = 0;
  for (const r of processedRows) {
    const empName = (r.name || String(insertedCount + 1)).trim();
    const takingDevice = (r.taking_device || '').trim();
    if (!empName && !takingDevice) continue;

    let details = (r.device_details || '').trim();
    if (r.is_new_in_round) {
      details = details ? `${details} | Round ${assignedRoundNumber} New Taking` : `Taking: ${takingDevice} (Round ${assignedRoundNumber} New Taking)`;
    } else if (!details) {
      details = `Taking: ${takingDevice}`;
    }

    await dbRun(`
      INSERT INTO device_records (
        name, shift, group_name, issued_at, return_time,
        return_device, taking_device, device_details, handover_to, sign, active_user,
        task_number, task_date, round_number, is_new_in_round, prev_round_status, check_time,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      empName,
      r.shift || 'Day',
      r.group_name || '',
      r.issued_at || '7.30 A.M.',
      r.return_time || '',
      r.return_device || '',
      takingDevice,
      details,
      r.handover_to || '',
      r.sign || 'Done',
      r.handover_to ? r.handover_to : empName,
      tNum,
      tDate,
      r.round_number,
      r.is_new_in_round,
      r.prev_round_status,
      assignedCheckTime
    ]);
    insertedCount++;
  }

  await logHistoryEvent({
    emp_name: 'System Admin',
    action: `${assignedRoundTitle} Confirmed`,
    shift: 'Day',
    group_name: '',
    return_device: comparison.removedDevices.join(', '),
    taking_device: comparison.addedDevices.join(', '),
    handover_to: '',
    sign: 'Done',
    admin_user: 'Shanaka',
    details: `Saved ${assignedRoundTitle} with ${rows.length} total active devices. +${comparison.addedCount} newly added/taken (${comparison.addedDevices.join(', ')}), ${comparison.removedCount} returned/removed.`
  });

  return {
    success: true,
    task_number: tNum,
    task_date: tDate,
    round_number: assignedRoundNumber,
    round_name: assignedRoundName,
    check_time: assignedCheckTime,
    round_title: assignedRoundTitle,
    total_devices: rows.length,
    added_count: comparison.addedCount,
    removed_count: comparison.removedCount,
    retained_count: comparison.retainedCount,
    added_devices: comparison.addedDevices,
    removed_devices: comparison.removedDevices
  };
}

async function resolveDroppedDevice({ task_number = 19, round_number, device_tag, action, admin_user = 'Shanaka' }) {
  if (!device_tag || !action) {
    throw new Error('Device tag and action are required');
  }

  const tNum = parseInt(task_number) || 19;
  const rNum = parseInt(round_number) || 2;
  const cleanTag = device_tag.trim();
  const normTag = normalizeDeviceTag(cleanTag);

  // 1. Fetch round record
  const round = await dbGet(`SELECT * FROM daily_task_rounds WHERE task_number = ? AND round_number = ?`, [tNum, rNum]);
  if (!round) {
    throw new Error(`Round #${rNum} for Task ${tNum} not found`);
  }

  const resolutionCheckTime = round.check_time || 'Office Returned';

  let resolutions = {};
  if (round.resolutions_json && round.resolutions_json.trim() !== '') {
    try {
      resolutions = JSON.parse(round.resolutions_json);
    } catch (e) {}
  }

  resolutions[normTag] = {
    status: action, // 'returned' or 'missing'
    device_tag: cleanTag,
    resolved_at: new Date().toISOString(),
    resolved_by: admin_user,
    check_time: resolutionCheckTime
  };

  // 2. Update daily_task_rounds resolutions_json
  await dbRun(`UPDATE daily_task_rounds SET resolutions_json = ? WHERE id = ?`, [JSON.stringify(resolutions), round.id]);

  // 3. Find any existing device_record matching this device in this task (checking taking_device OR return_device)
  const existingMatches = await dbAll(`
    SELECT id, taking_device, return_device FROM device_records 
    WHERE task_number = ? AND (
      LOWER(REPLACE(taking_device, ' ', '')) = ? OR
      LOWER(REPLACE(return_device, ' ', '')) = ?
    )
  `, [tNum, normTag, normTag]);

  // Also check previous tasks (e.g. task_number = tNum - 1)
  const prevMatches = await dbAll(`
    SELECT id, taking_device, return_device FROM device_records 
    WHERE task_number = ? AND (
      LOWER(REPLACE(taking_device, ' ', '')) = ? OR
      LOWER(REPLACE(return_device, ' ', '')) = ?
    )
  `, [tNum - 1, normTag, normTag]);

  if (action === 'returned') {
    if (existingMatches.length > 0) {
      const primeId = existingMatches[0].id;
      await dbRun(`
        UPDATE device_records SET
          return_device = ?,
          return_time = ?,
          sign = 'Done',
          device_details = CASE 
            WHEN taking_device IS NOT NULL AND taking_device != '' THEN 'Return: ' || ? || ' | Taking: ' || taking_device 
            ELSE 'Return: ' || ? 
          END
        WHERE id = ?
      `, [cleanTag, resolutionCheckTime, cleanTag, cleanTag, primeId]);

      // If duplicate rows exist from repeated previous clicks, remove extras
      if (existingMatches.length > 1) {
        const extraIds = existingMatches.slice(1).map(m => m.id);
        await dbRun(`DELETE FROM device_records WHERE id IN (${extraIds.join(',')})`);
      }
    } else {
      // Insert exactly ONE record
      await dbRun(`
        INSERT INTO device_records (
          name, shift, issued_at, return_time, return_device, taking_device, device_details, sign, active_user, task_number, task_date, round_number, is_new_in_round, check_time
        ) VALUES ('Office Return', 'Day', '7.30 A.M.', ?, ?, '', 'Return: ' || ?, 'Done', 'Office', ?, ?, ?, 0, ?)
      `, [resolutionCheckTime, cleanTag, cleanTag, tNum, round.task_date || '2026-11-19', rNum, resolutionCheckTime]);
    }

    // Also update in previous task if it was taken in previous task
    if (prevMatches.length > 0) {
      for (const pm of prevMatches) {
        await dbRun(`
          UPDATE device_records SET
            return_device = ?,
            return_time = ?,
            sign = 'Done',
            device_details = 'Return: ' || ?
          WHERE id = ?
        `, [cleanTag, resolutionCheckTime, cleanTag, pm.id]);
      }
    }

    await logHistoryEvent({
      emp_name: admin_user,
      action: 'Device Returned in Office',
      shift: 'Day',
      group_name: '',
      return_device: cleanTag,
      taking_device: '',
      sign: 'Done',
      admin_user,
      details: `${cleanTag} was verified and marked as returned in office by ${admin_user}.`
    });
  } else if (action === 'missing') {
    if (existingMatches.length > 0) {
      const primeId = existingMatches[0].id;
      await dbRun(`
        UPDATE device_records SET
          return_device = '',
          return_time = '',
          sign = 'Missing',
          device_details = 'Missing Device (Not in Round Check)'
        WHERE id = ?
      `, [primeId]);

      if (existingMatches.length > 1) {
        const extraIds = existingMatches.slice(1).map(m => m.id);
        await dbRun(`DELETE FROM device_records WHERE id IN (${extraIds.join(',')})`);
      }
    } else {
      await dbRun(`
        INSERT INTO device_records (
          name, shift, issued_at, return_time, return_device, taking_device, device_details, sign, active_user, task_number, task_date, round_number, is_new_in_round, check_time
        ) VALUES ('Missing Check', 'Day', '7.30 A.M.', '', '', ?, 'Missing Device (Not in Round Check)', 'Missing', 'Missing', ?, ?, ?, 0, ?)
      `, [cleanTag, tNum, round.task_date || '2026-11-19', rNum, resolutionCheckTime]);
    }

    if (prevMatches.length > 0) {
      for (const pm of prevMatches) {
        await dbRun(`
          UPDATE device_records SET
            return_device = '',
            return_time = '',
            sign = 'Missing',
            device_details = 'Missing Device (Not in Round Check)'
          WHERE id = ?
        `, [pm.id]);
      }
    }

    await logHistoryEvent({
      emp_name: admin_user,
      action: 'Device Marked Missing',
      shift: 'Day',
      group_name: '',
      return_device: '',
      taking_device: cleanTag,
      sign: 'Missing',
      admin_user,
      details: `${cleanTag} was missing in check and marked as MISSING by ${admin_user}.`
    });
  }

  // 4. Update records_json in daily_task_rounds for this task if stored
  const allRounds = await dbAll(`SELECT id, records_json, round_number FROM daily_task_rounds WHERE task_number = ?`, [tNum]);
  for (const rndItem of allRounds) {
    if (rndItem.records_json && rndItem.records_json !== '[]') {
      try {
        let recList = JSON.parse(rndItem.records_json);
        let changed = false;
        recList = recList.map(rec => {
          if (normalizeDeviceTag(rec.taking_device) === normTag) {
            changed = true;
            if (action === 'returned') {
              return {
                ...rec,
                return_device: cleanTag,
                return_time: resolutionCheckTime,
                sign: 'Done',
                device_details: `Return: ${cleanTag} | Taking: ${rec.taking_device}`
              };
            } else {
              return {
                ...rec,
                return_device: '',
                return_time: '',
                sign: 'Missing',
                device_details: 'Missing Device'
              };
            }
          }
          return rec;
        });
        if (changed) {
          await dbRun(`UPDATE daily_task_rounds SET records_json = ? WHERE id = ?`, [JSON.stringify(recList), rndItem.id]);
        }
      } catch (e) {}
    }
  }

  return { success: true, resolutions, status: action, device_tag: cleanTag };
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
  togglePermission,
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
};
