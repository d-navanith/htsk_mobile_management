import React, { useState, useEffect, useMemo } from 'react';
import UserProfileMenu from './UserProfileMenu';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Smartphone,
  ArrowRightLeft,
  X,
  AlertTriangle,
  RotateCcw,
  ArrowUpRight
} from 'lucide-react';

export default function DailyTaskSection({
  records = [],
  onOpenAddModal = () => {},
  onOpenEditModal = () => {},
  onDeleteRecord = () => {},
  groups = [],
  refreshRecords = () => {},
  setActiveTab = () => {},
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  onLogout = () => {},
  canEdit = true,
  canDelete = true,
  canManageUsers = true
}) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => today.getMonth()); // Current month (e.g. November)
  const [selectedDay, setSelectedDay] = useState(() => today.getDate()); // Current day (e.g. 18)

  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedShift, setSelectedShift] = useState('All Shift');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState('all'); // 'all', 'new', 'retained'

  const [editingRoundId, setEditingRoundId] = useState(null);
  const [editingCheckTime, setEditingCheckTime] = useState('');

  // '+ Add Next Task' Modal State (No demo data)
  const formatCurrentCheckTime = (d = new Date()) => {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}.${minutes} ${ampm}`;
  };

  const [isAddNextTaskOpen, setIsAddNextTaskOpen] = useState(false);
  const [nextCheckTime, setNextCheckTime] = useState(() => formatCurrentCheckTime());
  const [nextRawList, setNextRawList] = useState(''); // EMPTY BY DEFAULT - NO DEMO DATA
  const [addingNextTask, setAddingNextTask] = useState(false);

  const [taskRecords, setTaskRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [kpis, setKpis] = useState({
    todayActiveMobiles: 0,
    activeInShift: 0,
    returnedMobiles: 0,
    missingDevices: 0,
    rounds: [],
    latestRound: 1,
    newInRoundCount: 0
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('htsk_session_token');
    const role = currentUserRole || localStorage.getItem('htsk_user_role') || 'Admin';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-User-Role': role
    };
  };

  // Handle resolving dropped devices (Mark Returned or Mark Missing)
  const [resolvingDev, setResolvingDev] = useState(null);

  const handleResolveDevice = async (taskNumber, roundNumber, deviceTag, action) => {
    if (!canEdit) return;
    const key = `${roundNumber}-${deviceTag}`;
    if (resolvingDev === key) return; // Prevent double/spam clicking
    setResolvingDev(key);
    try {
      const res = await fetch('/api/daily-task/resolve-device', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          task_number: taskNumber,
          round_number: roundNumber,
          device_tag: deviceTag,
          action: action,
          admin_user: currentUserName || currentUser || 'Shanaka'
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTaskData();
        refreshRecords();
      }
    } catch (e) {
      console.error('Failed to resolve dropped device:', e);
    } finally {
      setResolvingDev(null);
    }
  };

  // Attention Required Minimize & Bulk Mark All Returned State per Round
  const [minimizedAttentionRounds, setMinimizedAttentionRounds] = useState({});
  const [bulkResolvingRound, setBulkResolvingRound] = useState(null);

  const toggleRoundAttentionMinimized = (roundKey) => {
    setMinimizedAttentionRounds(prev => ({
      ...prev,
      [roundKey]: !prev[roundKey]
    }));
  };

  const handleBulkMarkRoundReturned = async (taskNum, roundNum, deviceTags = [], roundKey) => {
    if (!canEdit || !Array.isArray(deviceTags) || deviceTags.length === 0) return;
    setBulkResolvingRound(roundKey);
    try {
      const res = await fetch('/api/daily-task/resolve-devices-bulk', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          task_number: taskNum,
          round_number: roundNum,
          device_tags: deviceTags,
          action: 'returned',
          admin_user: currentUserName || 'Shanaka'
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTaskData();
        refreshRecords();
      }
    } catch (e) {
      console.error('Failed to bulk mark devices returned:', e);
    } finally {
      setBulkResolvingRound(null);
    }
  };

  // Handle adding next task check (Intra-day Round)
  const handleConfirmNextTask = async () => {
    if (!canEdit) {
      alert('You do not have permission to add task rounds (View only).');
      return;
    }
    if (!nextRawList.trim()) {
      alert('Please enter or paste at least one device tag for this check.');
      return;
    }
    setAddingNextTask(true);
    try {
      const lines = nextRawList
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      const rows = lines.map((tag, idx) => {
        const num = idx + 1;
        const formatted = num < 100 ? String(num).padStart(2, '0') : String(num);
        return {
          emp_number: num,
          name: formatted,
          shift: 'Day',
          group_name: '',
          issued_at: nextCheckTime || '7.30 A.M.',
          return_time: '',
          return_device: '',
          taking_device: tag,
          handover_to: '',
          sign: 'Done',
          isValid: true
        };
      });

      const nextRoundNum = (kpis.rounds?.length || 1) + 1;
      const monthStr = String(currentMonthIndex + 1).padStart(2, '0');
      const dayStr = String(selectedDay).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

      const res = await fetch('/api/upload/quick-list', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rows,
          task_number: selectedDay,
          task_date: dateStr,
          round_number: nextRoundNum,
          check_time: nextCheckTime,
          raw_list: nextRawList,
          replaceMode: false
        })
      });

      const result = await res.json();
      if (result.success) {
        setIsAddNextTaskOpen(false);
        setNextRawList('');
        fetchTaskData();
        refreshRecords();
      } else {
        alert(result.error || 'Failed to save next check');
      }
    } catch (e) {
      console.error('Error adding next task:', e);
      alert('Error creating next task');
    } finally {
      setAddingNextTask(false);
    }
  };

  const handleSaveCheckTime = async (roundId) => {
    if (!canEdit) return;
    if (!editingCheckTime.trim()) return;
    try {
      await fetch(`/api/daily-task/rounds/${roundId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ check_time: editingCheckTime.trim() })
      });
      setEditingRoundId(null);
      fetchTaskData();
    } catch (e) {
      console.error('Failed to update round check time:', e);
    }
  };

  // Fetch records and KPIs for current selected daily task
  const fetchTaskData = async () => {
    setLoading(true);
    try {
      const monthStr = String(currentMonthIndex + 1).padStart(2, '0');
      const dayStr = String(selectedDay).padStart(2, '0');
      const selectedDateStr = `${currentYear}-${monthStr}-${dayStr}`;

      // 1. Fetch records for this day / task
      const recRes = await fetch(`/api/records?task_number=${selectedDay}&task_date=${selectedDateStr}`);
      const recData = await recRes.json();
      if (recData.success) {
        setTaskRecords(recData.data || []);
      }

      // 2. Fetch KPIs for this daily task
      const kpiRes = await fetch(`/api/daily-task/kpis?task_number=${selectedDay}&task_date=${selectedDateStr}`);
      const kpiData = await kpiRes.json();
      if (kpiData.success && kpiData.data) {
        setKpis(kpiData.data);
      }
    } catch (e) {
      console.error('Failed to load task data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskData();
  }, [selectedDay, currentMonthIndex, currentYear]);

  useEffect(() => {
    const handleRecordsChanged = () => {
      fetchTaskData();
    };
    window.addEventListener('htsk-records-changed', handleRecordsChanged);
    return () => window.removeEventListener('htsk-records-changed', handleRecordsChanged);
  }, [selectedDay, currentMonthIndex, currentYear]);

  // Handle inline shift change
  const handleInlineShiftChange = async (recordId, newShift) => {
    if (!canEdit) return;
    try {
      await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ shift: newShift })
      });
      fetchTaskData();
      refreshRecords();
    } catch (e) {
      console.error('Error updating shift:', e);
    }
  };

  // Handle inline group change
  const handleInlineGroupChange = async (recordId, newGroup) => {
    if (!canEdit) return;
    try {
      await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ group: newGroup })
      });
      fetchTaskData();
      refreshRecords();
    } catch (e) {
      console.error('Error updating group:', e);
    }
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonthIndex(prev => prev + 1);
    }
  };

  // Build accurate dynamic calendar grid based on real calendar math
  const calendarRows = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonthIndex, 1).getDay(); // 0 is Sunday
    const prevDaysInMonth = new Date(currentYear, currentMonthIndex, 0).getDate();

    const cells = [];
    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevDaysInMonth - i,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }
    // Next month padding to fill out complete 7-day rows (at least 35 cells, up to 42 cells)
    let nextDay = 1;
    while (cells.length % 7 !== 0 || cells.length < 35) {
      cells.push({
        day: nextDay++,
        isCurrentMonth: false,
        monthOffset: 1
      });
    }

    // Split into rows of 7
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [currentYear, currentMonthIndex]);

  // Handle cell selection
  const handleSelectCell = (cell) => {
    if (cell.monthOffset === -1) {
      handlePrevMonth();
      setSelectedDay(cell.day);
    } else if (cell.monthOffset === 1) {
      handleNextMonth();
      setSelectedDay(cell.day);
    } else {
      setSelectedDay(cell.day);
    }
  };

  // Format day string (e.g. 17 -> 17th August)
  const formatDayString = (day) => {
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${day}${suffix} ${monthNames[currentMonthIndex]}`;
  };

  // Helper to split multi-devices
  const parseDevices = (str) => {
    if (!str) return [];
    return str.split(/[,+&/]/).map(s => s.trim()).filter(Boolean);
  };

  // Normalizes device key for robust cross-matching
  const normalizeDeviceTag = (tag) => {
    if (!tag) return '';
    const clean = String(tag).replace(/[:;,]+$/g, '').trim().toLowerCase();
    const m = clean.match(/^([a-z]+)\s*0*(\d+)$/i);
    if (m) {
      return `${m[1]}${parseInt(m[2], 10)}`;
    }
    return clean.replace(/\s+/g, '');
  };

  // Delete a record/device from a round with instant optimistic UI update and backend synchronization
  const handleDeleteRoundRow = async (rnd, r, targetRecord, index) => {
    if (!canDelete) {
      alert('You do not have permission to delete records.');
      return;
    }

    const devLabel = (r.taking_device || r.return_device || r.name || `Row #${index + 1}`).replace(/[:;,]+$/g, '').trim();
    const roundTitle = `Task ${selectedDay}.${rnd.round_number}`;
    if (!window.confirm(`Are you sure you want to delete "${devLabel}" from ${roundTitle}?`)) {
      return;
    }

    const targetRecId = targetRecord?.id || r.id;
    const targetDevTag = r.taking_device || targetRecord?.taking_device || '';
    const cleanTargetDev = targetDevTag.replace(/[:;,]+$/g, '').trim().toLowerCase();
    const normTargetDev = normalizeDeviceTag(targetDevTag);
    const targetEmpName = (r.name || targetRecord?.name || '').trim();

    // 1. Optimistic UI update: Remove row immediately from local state
    setKpis(prevKpis => {
      if (!prevKpis || !prevKpis.rounds) return prevKpis;
      const updatedRounds = prevKpis.rounds.map(roundItem => {
        if (roundItem.round_number !== rnd.round_number && roundItem.id !== rnd.id) {
          return roundItem;
        }
        const updatedRecords = (roundItem.records || []).filter(item => {
          if (targetRecId && item.id === targetRecId) return false;
          const itemDevClean = (item.taking_device || '').replace(/[:;,]+$/g, '').trim().toLowerCase();
          const itemDevNorm = normalizeDeviceTag(item.taking_device);
          if (cleanTargetDev && (itemDevClean === cleanTargetDev || (normTargetDev && itemDevNorm === normTargetDev))) return false;
          if (targetEmpName && (item.name || '').trim() === targetEmpName && (!cleanTargetDev || itemDevClean === cleanTargetDev)) return false;
          return true;
        });
        const isNewTaking = r.is_new_in_round === 1;
        return {
          ...roundItem,
          records: updatedRecords,
          total_devices: Math.max(0, updatedRecords.length),
          added_count: isNewTaking ? Math.max(0, (roundItem.added_count || 1) - 1) : (roundItem.added_count || 0)
        };
      });

      return {
        ...prevKpis,
        rounds: updatedRounds,
        todayActiveMobiles: Math.max(0, (prevKpis.todayActiveMobiles || 1) - 1)
      };
    });

    setTaskRecords(prev => prev.filter(item => {
      if (targetRecId && item.id === targetRecId) return false;
      const itemDevClean = (item.taking_device || '').replace(/[:;,]+$/g, '').trim().toLowerCase();
      const itemDevNorm = normalizeDeviceTag(item.taking_device);
      if (cleanTargetDev && (itemDevClean === cleanTargetDev || (normTargetDev && itemDevNorm === normTargetDev))) return false;
      return true;
    }));

    // 2. Call backend deletion API
    try {
      const monthStr = String(currentMonthIndex + 1).padStart(2, '0');
      const dayStr = String(selectedDay).padStart(2, '0');
      const selectedDateStr = `${currentYear}-${monthStr}-${dayStr}`;

      const res = await fetch('/api/daily-task/delete-record', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: targetRecId,
          task_number: selectedDay,
          task_date: selectedDateStr,
          round_number: rnd.round_number,
          round_id: rnd.id,
          device_tag: targetDevTag,
          emp_name: targetEmpName,
          admin_user: currentUserName || 'Shanaka'
        })
      });

      const data = await res.json();
      if (data.success) {
        await fetchTaskData();
        refreshRecords();
      } else {
        alert(data.error || 'Failed to delete record.');
        await fetchTaskData();
      }
    } catch (err) {
      console.error('Error deleting round record:', err);
      alert('Error deleting record from task round.');
      await fetchTaskData();
    }
  };

  // Per-round independent filter state
  const [roundFilters, setRoundFilters] = useState({});

  // Full Task / Round Table Deletion Modal State
  const [roundToDelete, setRoundToDelete] = useState(null);
  const [deletingRound, setDeletingRound] = useState(false);

  const handleConfirmDeleteFullRound = async () => {
    if (!roundToDelete || !canDelete) return;
    setDeletingRound(true);
    try {
      const res = await fetch('/api/daily-task/delete-round', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          round_id: typeof roundToDelete.id === 'number' ? roundToDelete.id : null,
          task_number: selectedDay,
          round_number: roundToDelete.round_number,
          admin_user: currentUserName || 'Shanaka'
        })
      });
      const data = await res.json();
      if (data.success) {
        setRoundToDelete(null);
        await fetchTaskData();
        refreshRecords();
      } else {
        alert(data.error || 'Failed to delete task table.');
      }
    } catch (err) {
      console.error('Error deleting full task table:', err);
      alert('Error deleting full task table.');
    } finally {
      setDeletingRound(false);
    }
  };

  const getRoundFilter = (roundKey) => {
    return roundFilters[roundKey] || {
      search: '',
      group: selectedGroup || 'All Groups',
      shift: selectedShift || 'All Shift',
      status: selectedStatus || 'All Status'
    };
  };

  const setRoundFilterProp = (roundKey, prop, value) => {
    setRoundFilters(prev => ({
      ...prev,
      [roundKey]: {
        ...(prev[roundKey] || {
          search: '',
          group: selectedGroup || 'All Groups',
          shift: selectedShift || 'All Shift',
          status: selectedStatus || 'All Status'
        }),
        [prop]: value
      }
    }));
  };

  // Filter records helper (supports per-round independent search & filters)
  const filterRoundRecords = (records = [], roundKey = 'default') => {
    const curFilter = getRoundFilter(roundKey);
    const term = (curFilter.search || '').trim().toLowerCase();
    const normTerm = term.replace(/\s+/g, '');

    return records
      .map((r, idx) => ({ ...r, _originalIndex: idx }))
      .filter(r => {
        let searchMatch = true;
        if (term) {
          const nameStr = (r.name || '').toLowerCase();
          const takingStr = (r.taking_device || '').toLowerCase();
          const takingNorm = takingStr.replace(/\s+/g, '');
          const returnStr = (r.return_device || '').toLowerCase();
          const returnNorm = returnStr.replace(/\s+/g, '');
          const handoverStr = (r.handover_to || '').toLowerCase();
          const groupStr = (r.group_name || '').toLowerCase();
          const recNumStr = String(r._originalIndex + 1);

          searchMatch =
            nameStr.includes(term) ||
            takingStr.includes(term) ||
            (normTerm && takingNorm.includes(normTerm)) ||
            returnStr.includes(term) ||
            (normTerm && returnNorm.includes(normTerm)) ||
            handoverStr.includes(term) ||
            groupStr.includes(term) ||
            recNumStr === term;
        }

        const groupMatch = curFilter.group === 'All Groups' ||
          (curFilter.group === 'No Group' && (!r.group_name || r.group_name.trim() === '')) ||
          (r.group_name && r.group_name.trim().toLowerCase() === curFilter.group.trim().toLowerCase());
        const shiftMatch = curFilter.shift === 'All Shift' ||
          (r.shift && r.shift.toLowerCase() === curFilter.shift.toLowerCase());
        const statusMatch = curFilter.status === 'All Status' ||
          (curFilter.status === 'Done' && (r.sign || '').toLowerCase() === 'done') ||
          (curFilter.status === 'Pending' && (r.sign || '').toLowerCase() === 'pending') ||
          (curFilter.status === 'Missing' && (r.sign || '').toLowerCase() === 'missing');
        const roundMatch = selectedRoundFilter === 'all' ||
          (selectedRoundFilter === 'new' && r.is_new_in_round === 1) ||
          (selectedRoundFilter === 'retained' && r.is_new_in_round !== 1);
        return searchMatch && groupMatch && shiftMatch && statusMatch && roundMatch;
      });
  };

  // Stacked Rounds to Render matching user mockup: Task 19.1 : Time 8.30 A.M., Task 19.2 : Time 02.00 P.M.
  const roundsToDisplay = useMemo(() => {
    if (kpis.rounds && kpis.rounds.length > 0) {
      return kpis.rounds;
    }
    return [{
      id: 'default',
      round_number: 1,
      check_time: '8.30 A.M.',
      round_title: `Task ${selectedDay}.1 : Time 8.30 A.M.`,
      records: taskRecords
    }];
  }, [kpis.rounds, taskRecords, selectedDay]);

  const filteredRecords = filterRoundRecords(taskRecords);

  return (
    <div className="responsive-section-container">
      {/* Top Header Row matching system theme */}
      <div className="responsive-header">
        <div>
          <h1 className="system-h1">
            Mobile Management
          </h1>
          <p className="system-breadcrumb">
            <span>Workspace / Daily Task</span>
            <span>•</span>
            <strong style={{ color: '#111827' }}>Task #{selectedDay} ({formatDayString(selectedDay)})</strong>
          </p>
        </div>

        {/* Right side: Top task badge & Profile header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            backgroundColor: '#ede9fe',
            border: '1.5px solid #c4b5fd',
            color: '#6d28d9',
            fontWeight: 800,
            fontSize: '13px',
            padding: '7px 18px',
            borderRadius: '10px',
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>Task {String(selectedDay).padStart(2, '0')}</span>
          </div>

          <UserProfileMenu
            currentUser={currentUser}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            currentUserAvatar={currentUserAvatar}
            onOpenProfile={() => onOpenProfile('general')}
            onOpenSecurity={() => onOpenProfile('security')}
            onLogout={onLogout}
            setActiveTab={setActiveTab}
            onRefresh={refreshRecords}
            canManageUsers={canManageUsers}
          />
        </div>
      </div>

      {/* Main KPI Cards & Calendar Section matching Image 2 */}
      <div className="daily-task-top-layout">
        {/* Left: 4 Daily Task KPI Cards in 2x2 Grid */}
        <div className="daily-task-kpis-grid">
          {/* Card 1: Today Active Mobiles */}
          <div
            className="clickable-kpi-card"
            onClick={() => {
              document.querySelector('.daily-task-round-card')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #84cc16',
              padding: '18px 20px',
              boxShadow: '0 2px 6px rgba(132, 204, 22, 0.06)'
            }}
            title="Click to view today's active task table"
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
              Today Active Mobiles
            </div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: '#84cc16', lineHeight: 1.1, marginBottom: '8px' }}>
              {kpis.todayActiveMobiles ?? 0}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
                {kpis.todayActiveMobiles ?? 0} Mobile phones issued today
              </div>
              <div className="card-arrow-btn" title="View active mobiles">
                <ArrowUpRight size={16} strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {/* Card 2: Active In Shift */}
          <div
            className="clickable-kpi-card"
            onClick={() => {
              document.querySelector('.daily-task-round-card')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #06b6d4',
              padding: '18px 20px',
              boxShadow: '0 2px 6px rgba(6, 182, 212, 0.06)'
            }}
            title="Click to view mobiles active in shift"
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
              Active In Shift
            </div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: '#06b6d4', lineHeight: 1.1, marginBottom: '8px' }}>
              {kpis.activeInShift ?? 0}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
                {kpis.activeInShift ?? 0} currently active on shift
              </div>
              <div className="card-arrow-btn" title="View active shift">
                <ArrowUpRight size={16} strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {/* Card 3: Returned Mobiles */}
          <div
            className="clickable-kpi-card"
            onClick={() => {
              document.querySelector('.daily-task-round-card')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #8b5cf6',
              padding: '18px 20px',
              boxShadow: '0 2px 6px rgba(139, 92, 246, 0.06)'
            }}
            title="Click to view returned mobiles"
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
              Returned Mobiles
            </div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: '#8b5cf6', lineHeight: 1.1, marginBottom: '8px' }}>
              {kpis.returnedMobiles ?? 0}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
                {kpis.returnedMobiles ?? 0} mobiles returned today
              </div>
              <div className="card-arrow-btn" title="View returned mobiles">
                <ArrowUpRight size={16} strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {/* Card 4: Missing Devices */}
          <div
            className="clickable-kpi-card"
            onClick={() => {
              const banner = document.querySelector('[style*="Attention Required"]');
              if (banner) {
                banner.scrollIntoView({ behavior: 'smooth' });
              } else {
                document.querySelector('.daily-task-round-card')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #ef4444',
              padding: '18px 20px',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.06)'
            }}
            title="Click to view attention required / missing devices"
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
              Missing Devices
            </div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: '#ef4444', lineHeight: 1.1, marginBottom: '8px' }}>
              {kpis.missingDevices ?? 0}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
                {kpis.missingDevices ?? 0} unreturned or missing devices
              </div>
              <div className="card-arrow-btn" title="View missing devices">
                <ArrowUpRight size={16} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Mini Calendar Card matching Image 2 */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e5e7eb',
          padding: '18px 22px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          {/* Calendar Header with Month Navigation and Selected Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4b5563'
                }}
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '105px', textAlign: 'center' }}>
                {monthNames[currentMonthIndex]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4b5563'
                }}
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>
                {currentYear}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {formatDayString(selectedDay)}
              </div>
            </div>
          </div>

          {/* Weekday Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {weekDays.map(w => (
              <div key={w} style={{
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#9ca3af',
                padding: '2px 0'
              }}>
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {calendarRows.map((row, rIdx) => (
              <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {row.map((cell, cIdx) => {
                  const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => handleSelectCell(cell)}
                      style={{
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 700 : (cell.isCurrentMonth ? 500 : 400),
                        color: isSelected
                          ? '#ffffff'
                          : cell.isCurrentMonth
                          ? '#374151'
                          : '#cbd5e1',
                        backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      {String(cell.day).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Render Stacked Rounds matching user's uploaded mockup image (Task 19.1 : Time 8.30 A.M., Task 19.2 : Time 02.00 P.M.) */}
      {roundsToDisplay.map((rnd, rIdx) => {
        const rawRoundRecords = (rnd.records && rnd.records.length > 0) ? rnd.records : taskRecords;
        const roundKey = rnd.id || `rnd-${rnd.round_number}-${rIdx}`;
        const curFilter = getRoundFilter(roundKey);
        const rndFilteredRecords = filterRoundRecords(rawRoundRecords, roundKey);
        const roundExplicitNumericIds = new Set(
          rawRoundRecords
            .filter(item => item.id !== undefined && item.id !== null && (typeof item.id === 'number' || /^\d+$/.test(String(item.id))))
            .map(item => Number(item.id))
        );

        return (
          <div key={rnd.id || `round-${rnd.round_number}-${rIdx}`} style={{ marginBottom: '36px' }}>
            {/* Header: Task 19.1 : Time 8.30 A.M. matching image mockup */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: rIdx === 0 ? '22px' : '36px',
              marginBottom: '12px',
              padding: '0 2px'
            }}>
              {editingRoundId === rnd.id ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                    Task {selectedDay}.{rnd.round_number} : Time
                  </span>
                  <input
                    type="text"
                    value={editingCheckTime}
                    onChange={e => setEditingCheckTime(e.target.value)}
                    placeholder="e.g. 8.30 A.M."
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1.5px solid #84cc16',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#0f766e',
                      width: '110px'
                    }}
                  />
                  <button
                    onClick={() => handleSaveCheckTime(rnd.id)}
                    style={{
                      backgroundColor: '#84cc16',
                      border: 'none',
                      color: '#000000',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingRoundId(null)}
                    style={{
                      backgroundColor: '#e5e7eb',
                      border: 'none',
                      color: '#374151',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
                    Task {selectedDay}.{rnd.round_number} : Time {rnd.check_time || '8.30 A.M.'}
                  </span>
                  {canEdit && rnd.id && typeof rnd.id === 'number' && (
                    <button
                      onClick={() => {
                        setEditingRoundId(rnd.id);
                        setEditingCheckTime(rnd.check_time || '8.30 A.M.');
                      }}
                      title="Edit Check Time"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        color: '#9ca3af',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <Edit2 size={13} color="#9ca3af" />
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: rnd.round_number === kpis.latestRound ? '#dcfce7' : '#f1f5f9',
                  color: rnd.round_number === kpis.latestRound ? '#15803d' : '#4b5563',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  {rawRoundRecords.length} Mobiles
                  {rnd.added_count > 0 && rnd.round_number > 1 ? ` • +${rnd.added_count} Newly Taken` : ''}
                </span>

                {canDelete && (rawRoundRecords.length > 0 || typeof rnd.id === 'number') && (
                  <button
                    type="button"
                    onClick={() => setRoundToDelete({
                      ...rnd,
                      recordCount: rawRoundRecords.length
                    })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 11px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Delete entire Task ${selectedDay}.${rnd.round_number} table`}
                  >
                    <Trash2 size={13.5} color="#dc2626" />
                    <span>Delete Table</span>
                  </button>
                )}
              </div>
            </div>

            {/* Card Container wrapping Toolbar + Scrollable Table + Attention Banner matching uploaded image */}
            <div className="daily-task-round-card">
              {/* Control Toolbar: Date Pill & Unique Table Search Bar on Left, Filters & Add on Right */}
              <div className="daily-task-card-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                  <div style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#374151',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatDayString(selectedDay)}
                  </div>

                  {/* Unique Per-Table Search Bar for this Task / Round */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#f3f4f6',
                    border: curFilter.search ? '1.5px solid #84cc16' : '1px solid #e5e7eb',
                    borderRadius: '9999px',
                    padding: '7px 16px',
                    width: '100%',
                    maxWidth: '300px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease'
                  }}>
                    <Search size={15} color={curFilter.search ? '#65a30d' : '#9ca3af'} />
                    <input
                      type="text"
                      placeholder={`Search in Task ${selectedDay}.${rnd.round_number} (device, name...)`}
                      value={curFilter.search || ''}
                      onChange={e => setRoundFilterProp(roundKey, 'search', e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '12.5px',
                        color: '#111827',
                        width: '100%'
                      }}
                    />
                    {curFilter.search && (
                      <button
                        type="button"
                        onClick={() => setRoundFilterProp(roundKey, 'search', '')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#6b7280'
                        }}
                        title="Clear table search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={curFilter.group}
                      onChange={e => setRoundFilterProp(roundKey, 'group', e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 36px 9px 16px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="All Groups">All Groups</option>
                      <option value="No Group">No Group (Empty)</option>
                      {groups.map((g, idx) => {
                        const groupName = typeof g === 'object' && g !== null ? (g.group_name || g.name || '') : String(g);
                        if (!groupName) return null;
                        return (
                          <option key={g.id || groupName || idx} value={groupName}>
                            {groupName}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown
                      size={14}
                      color="#6b7280"
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <select
                      value={curFilter.shift}
                      onChange={e => setRoundFilterProp(roundKey, 'shift', e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 36px 9px 16px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="All Shift">All Shift</option>
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                    </select>
                    <ChevronDown
                      size={14}
                      color="#6b7280"
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <select
                      value={curFilter.status}
                      onChange={e => setRoundFilterProp(roundKey, 'status', e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 36px 9px 16px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="All Status">All Status</option>
                      <option value="Done">Done</option>
                      <option value="Pending">Pending</option>
                    </select>
                    <ChevronDown
                      size={14}
                      color="#6b7280"
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    />
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => onOpenAddModal({
                        task_number: selectedDay,
                        task_date: `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`,
                        round_number: rnd.round_number,
                        round_id: typeof rnd.id === 'number' ? rnd.id : undefined,
                        check_time: rnd.check_time || '7.30 A.M.'
                      })}
                      className="btn-primary-lime"
                    >
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dedicated Scrollable Table Container for this Task / Round */}
              <div className="daily-task-table-scroll">
                <table className="daily-task-table">
                  <thead>
                    <tr style={{ backgroundColor: '#ffffff' }}>
                      <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '70px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        Rec. No.
                      </th>
                      <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 700, color: '#111827', minWidth: '140px', borderRight: '1px solid #e5e7eb' }}>
                        EMP. Name
                      </th>
                      <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '100px', borderRight: '1px solid #e5e7eb' }}>
                        Shift
                      </th>
                      <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '120px', borderRight: '1px solid #e5e7eb' }}>
                        Group
                      </th>
                      <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '110px', borderRight: '1px solid #e5e7eb' }}>
                        Issued At
                      </th>
                      <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '115px', borderRight: '1px solid #e5e7eb' }}>
                        Return Time
                      </th>
                      <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 700, color: '#111827', minWidth: '200px', borderRight: '1px solid #e5e7eb' }}>
                        Device Details
                      </th>
                      <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '130px', borderRight: '1px solid #e5e7eb' }}>
                        Handover to
                      </th>
                      <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '90px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        Sign
                      </th>
                      <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '90px', textAlign: 'center' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {rndFilteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                        {loading
                          ? 'Loading task records...'
                          : curFilter.search
                          ? `No matching device or employee found for "${curFilter.search}" in Task ${selectedDay}.${rnd.round_number}.`
                          : `No records logged for Task ${selectedDay}.${rnd.round_number} (${formatDayString(selectedDay)}). Click '+ Add' to assign devices.`}
                      </td>
                    </tr>
                  ) : (
                    rndFilteredRecords.map((r, index) => {
                      const isDone = (r.sign || '').toLowerCase() === 'done';
                      // Round 1 devices are baseline, NEVER marked as new taking
                      const isNewInRound = rnd.round_number > 1 && r.is_new_in_round === 1;
                      const displayIndex = r._originalIndex !== undefined ? r._originalIndex : index;

                      // Map to actual DB record if present (match by numeric ID first; only fall back to device tag for preview/non-numeric IDs)
                      const cleanRDev = (r.taking_device || '').replace(/[:;,]+$/g, '').trim().toLowerCase();
                      const normRDev = normalizeDeviceTag(r.taking_device);
                      const rHasNumericId = r.id !== undefined && r.id !== null && (typeof r.id === 'number' || /^\d+$/.test(String(r.id)));
                      let actualRec = null;
                      if (rHasNumericId) {
                        actualRec = taskRecords.find(tr => String(tr.id) === String(r.id)) || null;
                      } else {
                        actualRec = taskRecords.find(tr => {
                          if (tr.id !== undefined && tr.id !== null && roundExplicitNumericIds.has(Number(tr.id))) {
                            return false;
                          }
                          if (!cleanRDev) return false;
                          const cleanTr = (tr.taking_device || '').replace(/[:;,]+$/g, '').trim().toLowerCase();
                          if (cleanTr === cleanRDev) return true;
                          if (normRDev && normalizeDeviceTag(tr.taking_device) === normRDev) return true;
                          return false;
                        }) || null;
                      }
                      const rNameTrim = (r.name || '').trim();
                      const rHasCustomName = rNameTrim !== '' && !/^\d+$/.test(rNameTrim);
                      const actualNameTrim = actualRec && actualRec.name ? actualRec.name.trim() : '';
                      const resolvedRowName = rHasCustomName
                        ? rNameTrim
                        : (actualNameTrim || rNameTrim);

                      const targetRecord = {
                        ...(actualRec || {}),
                        ...r,
                        id: rHasNumericId ? Number(r.id) : (actualRec?.id || r.id),
                        name: resolvedRowName,
                        task_number: selectedDay,
                        round_number: rnd.round_number
                      };

                      return (
                        <tr
                          key={r.id || `row-${displayIndex}`}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: isNewInRound ? '#f0fdf4' : '#ffffff',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '16px 14px', fontSize: '13.5px', fontWeight: 700, color: '#111827', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                            {displayIndex + 1}.
                          </td>
                          <td style={{ padding: '16px 16px', fontSize: '13.5px', fontWeight: 600, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                            {resolvedRowName}
                          </td>
                          <td style={{ padding: '16px 14px', fontSize: '13.5px', color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <span>{r.shift || 'Day'}</span>
                              <ChevronDown size={13} color="#6b7280" />
                            </div>
                          </td>
                          <td style={{ padding: '16px 14px', fontSize: '13.5px', color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                              <select
                                value={r.group_name || ''}
                                onChange={(e) => {
                                  if (targetRecord.id && typeof targetRecord.id === 'number') {
                                    handleInlineGroupChange(targetRecord.id, e.target.value);
                                  }
                                }}
                                style={{
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  fontSize: '13.5px',
                                  fontWeight: r.group_name ? 600 : 400,
                                  color: r.group_name ? '#111827' : '#9ca3af',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  paddingRight: '16px',
                                  minWidth: '40px'
                                }}
                              >
                                <option value=""> </option>
                                {groups.map((g, idx) => {
                                  const groupName = typeof g === 'object' && g !== null ? (g.group_name || g.name || '') : String(g);
                                  if (!groupName) return null;
                                  return (
                                    <option key={g.id || groupName || idx} value={groupName}>
                                      {groupName}
                                    </option>
                                  );
                                })}
                              </select>
                              <ChevronDown
                                size={13}
                                color="#9ca3af"
                                style={{ position: 'absolute', right: '0', pointerEvents: 'none' }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: '16px 14px', fontSize: '13px', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                            {r.issued_at || '7.30 A.M.'}
                          </td>
                          <td style={{ padding: '16px 14px', fontSize: '13px', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                            {r.return_time || ''}
                          </td>
                          <td style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {r.return_device ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                                  <span style={{ color: '#7c3aed', fontWeight: 700, width: '52px' }}>Return:</span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {parseDevices(r.return_device).map((dev, i) => (
                                      <span key={i} style={{
                                        backgroundColor: '#f3e8ff',
                                        color: '#7c3aed',
                                        fontWeight: 700,
                                        border: '1px solid #d8b4fe',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '12px'
                                      }}>
                                        {dev}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {r.taking_device ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                                  <span style={{ color: '#6b7280', width: '52px' }}>Taking:</span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                    {parseDevices(r.taking_device).map((dev, i) => (
                                      <span key={i} style={{
                                        backgroundColor: isNewInRound ? '#ecfdf5' : '#f8fafc',
                                        color: isNewInRound ? '#047857' : '#111827',
                                        border: isNewInRound ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                                        fontWeight: isNewInRound ? 700 : 500,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '12.5px'
                                      }}>
                                        {dev}
                                      </span>
                                    ))}
                                    {isNewInRound && (
                                      <span style={{
                                        backgroundColor: '#15803d',
                                        color: '#ffffff',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        + NEW TAKING (Round {rnd.round_number})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : null}

                              {r.sign === 'Missing' && (
                                <div style={{ marginTop: '2px' }}>
                                  <span style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fca5a5',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    display: 'inline-block'
                                  }}>
                                    ⚠ Missing Device
                                  </span>
                                </div>
                              )}

                              {!r.return_device && !r.taking_device && (
                                <span style={{ color: '#9ca3af', fontSize: '12.5px' }}>—</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '16px 16px', fontSize: '13.5px', fontWeight: 500, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                            {r.handover_to || ''}
                          </td>
                          <td style={{ padding: '16px 14px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: (r.sign || '').toLowerCase() === 'missing' ? '#dc2626' : (isDone ? '#16a34a' : '#ea580c')
                            }}>
                              {r.sign || 'Done'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              {canEdit && (
                                <button
                                  onClick={() => onOpenEditModal(targetRecord)}
                                  style={{
                                    color: '#eab308',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px',
                                    borderRadius: '6px'
                                  }}
                                  title="Edit Record"
                                >
                                  <Edit2 size={16} color="#eab308" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteRoundRow(rnd, r, targetRecord, index)}
                                  style={{
                                    color: '#ef4444',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px',
                                    borderRadius: '6px'
                                  }}
                                  title="Delete Record"
                                >
                                  <Trash2 size={16} color="#ef4444" />
                                </button>
                              )}
                              {!canEdit && !canDelete && (
                                <span style={{
                                  fontSize: '11.5px',
                                  color: '#9ca3af',
                                  fontWeight: 600,
                                  backgroundColor: '#f3f4f6',
                                  padding: '3px 8px',
                                  borderRadius: '6px'
                                }}>
                                  View only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {rndFilteredRecords.length > 0 && rndFilteredRecords.length < 5 && (
                    Array.from({ length: 5 - rndFilteredRecords.length }).map((_, i) => (
                      <tr key={`empty-${i}`} style={{ height: '54px', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                        <td></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Red Attention Banner for Dropped / Removed Devices in this Round (With Mark All Returned & Minimize) */}
            {rnd.removed_devices && rnd.removed_devices.length > 0 && (() => {
              const isMin = Boolean(minimizedAttentionRounds[roundKey]);
              const isBulkLoading = bulkResolvingRound === roundKey;
              const allReturned = rnd.removed_devices.every(devTag => {
                const norm = devTag.toLowerCase().replace(/\s+/g, '');
                const res = (rnd.resolutions && (rnd.resolutions[norm] || rnd.resolutions[devTag])) || null;
                return res?.status === 'returned';
              });
              const unreturnedTags = rnd.removed_devices.filter(devTag => {
                const norm = devTag.toLowerCase().replace(/\s+/g, '');
                const res = (rnd.resolutions && (rnd.resolutions[norm] || rnd.resolutions[devTag])) || null;
                return res?.status !== 'returned';
              });

              return (
                <div style={{
                  backgroundColor: '#fff5f5',
                  border: '1.5px solid #f87171',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginTop: '12px',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: isMin ? '0px' : '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <AlertTriangle size={16} color="#dc2626" />
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#991b1b' }}>
                        Attention Required: {rnd.removed_devices.length} Devices Not In List (Task {selectedDay}.{rnd.round_number})
                      </span>
                      <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 500 }}>
                        — Active in previous check but missing in this check:
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {canEdit && (
                        <button
                          type="button"
                          disabled={isBulkLoading || allReturned}
                          onClick={() => handleBulkMarkRoundReturned(selectedDay, rnd.round_number, unreturnedTags.length > 0 ? unreturnedTags : rnd.removed_devices, roundKey)}
                          style={{
                            backgroundColor: allReturned ? '#15803d' : '#f0fdf4',
                            color: allReturned ? '#ffffff' : '#15803d',
                            border: '1.5px solid #86efac',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '5px 12px',
                            borderRadius: '8px',
                            cursor: (isBulkLoading || allReturned) ? 'default' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="Mark all devices in this list as Returned to office"
                        >
                          <CheckCircle2 size={14} />
                          <span>
                            {isBulkLoading
                              ? 'Marking All...'
                              : allReturned
                              ? '✓ All Marked Returned'
                              : '✓ Mark All Returned'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleRoundAttentionMinimized(roundKey)}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#991b1b',
                          border: '1px solid #fca5a5',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '5px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title={isMin ? 'Expand device verification list' : 'Minimize device verification list'}
                      >
                        <span>{isMin ? `Expand (${rnd.removed_devices.length})` : 'Minimize'}</span>
                        <ChevronDown
                          size={14}
                          style={{
                            transform: isMin ? 'rotate(0deg)' : 'rotate(180deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {!isMin && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                      {rnd.removed_devices.map((devTag, dIdx) => {
                        const norm = devTag.toLowerCase().replace(/\s+/g, '');
                        const resolution = (rnd.resolutions && (rnd.resolutions[norm] || rnd.resolutions[devTag])) || null;

                        return (
                          <div
                            key={dIdx}
                            style={{
                              backgroundColor: '#ffffff',
                              border: resolution
                                ? (resolution.status === 'returned' ? '1.5px solid #86efac' : '1.5px solid #fca5a5')
                                : '1.5px solid #fecaca',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                                {devTag}
                              </div>
                              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                {resolution ? (
                                  resolution.status === 'returned' ? (
                                    <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Returned to Office</span>
                                  ) : (
                                    <span style={{ color: '#dc2626', fontWeight: 700 }}>✕ Marked as Missing</span>
                                  )
                                ) : (
                                  <span style={{ color: '#b91c1c', fontWeight: 600 }}>⚠️ Awaiting Verification</span>
                                )}
                              </div>
                            </div>

                            {canEdit ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleResolveDevice(selectedDay, rnd.round_number, devTag, 'returned')}
                                  style={{
                                    backgroundColor: resolution?.status === 'returned' ? '#15803d' : '#f0fdf4',
                                    color: resolution?.status === 'returned' ? '#ffffff' : '#15803d',
                                    border: '1px solid #86efac',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                  title="Mark this device as found / returned to office"
                                >
                                  ✓ Returned
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolveDevice(selectedDay, rnd.round_number, devTag, 'missing')}
                                  style={{
                                    backgroundColor: resolution?.status === 'missing' ? '#dc2626' : '#fef2f2',
                                    color: resolution?.status === 'missing' ? '#ffffff' : '#dc2626',
                                    border: '1px solid #fca5a5',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                  title="Mark this device as missing"
                                >
                                  ✕ Missing
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                                View only
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            </div>
          </div>
        );
      })}

      {/* Centered '+ Add Next Task' button matching Image 2 mockup (hidden for View only / non-editors) */}
      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', marginBottom: '40px' }}>
          <button
            onClick={() => {
              setNextCheckTime(formatCurrentCheckTime());
              setNextRawList(''); // NO DEMO DATA
              setIsAddNextTaskOpen(true);
            }}
            style={{
              backgroundColor: '#84cc16',
              color: '#000000',
              fontWeight: 800,
              fontSize: '14px',
              padding: '12px 36px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(132, 204, 22, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={18} strokeWidth={2.8} />
            <span>+ Add Next Task</span>
          </button>
        </div>
      )}

      {/* Add Next Task Modal (Clean - No Demo Data) */}
      {isAddNextTaskOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                  Add Next Task (Round {(kpis.rounds?.length || 1) + 1})
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                  Task {selectedDay}.{(kpis.rounds?.length || 1) + 1} • {formatDayString(selectedDay)}
                </p>
              </div>
              <button
                onClick={() => setIsAddNextTaskOpen(false)}
                style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px' }}>
              {/* Check Time */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  List Checked Time
                </label>
                <input
                  type="text"
                  value={nextCheckTime}
                  onChange={e => setNextCheckTime(e.target.value)}
                  placeholder="e.g. 05.00 P.M."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0f766e',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Device List Textarea (No demo data) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Enter or Paste Mobile Device List (One per line)
                </label>
                <textarea
                  rows={8}
                  value={nextRawList}
                  onChange={e => setNextRawList(e.target.value)}
                  placeholder="Paste devices found in this check (e.g.&#10;Pn 81&#10;New 25&#10;...)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
                <span style={{ fontSize: '11.5px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  {nextRawList.trim() ? `${nextRawList.split(/\r?\n/).filter(Boolean).length} device tags entered` : 'Ready for device tags input.'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#f9fafb'
            }}>
              <button
                type="button"
                onClick={() => setIsAddNextTaskOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!nextRawList.trim() || addingNextTask}
                onClick={handleConfirmNextTask}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: !nextRawList.trim() || addingNextTask ? '#d9f99d' : '#84cc16',
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: !nextRawList.trim() || addingNextTask ? 'not-allowed' : 'pointer'
                }}
              >
                {addingNextTask ? 'Saving Check...' : `Save & Run Task ${selectedDay}.${(kpis.rounds?.length || 1) + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE FULL TASK / ROUND TABLE CONFIRMATION POPUP MODAL               */}
      {/* ===================================================================== */}
      {roundToDelete && (
        <div
          className="modal-overlay"
          onClick={() => !deletingRound && setRoundToDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e5e7eb',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trash2 size={17} color="#dc2626" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#111827' }}>
                    Delete Task {selectedDay}.{roundToDelete.round_number} Table
                  </h3>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {formatDayString(selectedDay)} • Time {roundToDelete.check_time || '8.30 A.M.'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={deletingRound}
                onClick={() => setRoundToDelete(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete the entire{' '}
                <strong style={{ color: '#111827' }}>Task {selectedDay}.{roundToDelete.round_number}</strong> table ({roundToDelete.recordCount || 0} mobile records)?
              </p>

              <div style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '12.5px',
                color: '#4b5563',
                lineHeight: 1.5
              }}>
                {roundToDelete.round_number > 1 ? (
                  <span>
                    Deleting <strong>Task {selectedDay}.{roundToDelete.round_number}</strong> will remove this table and restore Task {selectedDay} back to its previous round (<strong>Task {selectedDay}.{roundToDelete.round_number - 1}</strong>).
                  </span>
                ) : (
                  <span>
                    Deleting <strong>Task {selectedDay}.1</strong> will clear all device records for this task table so you can re-enter or upload the device list to the correct task.
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                disabled={deletingRound}
                onClick={() => setRoundToDelete(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRound}
                onClick={handleConfirmDeleteFullRound}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: deletingRound ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} />
                <span>{deletingRound ? 'Deleting Table...' : `Delete Task ${selectedDay}.${roundToDelete.round_number}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
