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

  // Per-round independent filter state
  const [roundFilters, setRoundFilters] = useState({});

  const getRoundFilter = (roundKey) => {
    return roundFilters[roundKey] || {
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
          group: selectedGroup || 'All Groups',
          shift: selectedShift || 'All Shift',
          status: selectedStatus || 'All Status'
        }),
        [prop]: value
      }
    }));
  };

  // Filter records helper (supports per-round independent filters)
  const filterRoundRecords = (records = [], roundKey = 'default') => {
    const curFilter = getRoundFilter(roundKey);
    return records.filter(r => {
      const groupMatch = curFilter.group === 'All Groups' ||
        (curFilter.group === 'No Group' && (!r.group_name || r.group_name.trim() === '')) ||
        (r.group_name && r.group_name.trim().toLowerCase() === curFilter.group.trim().toLowerCase());
      const shiftMatch = curFilter.shift === 'All Shift' ||
        (r.shift && r.shift.toLowerCase() === curFilter.shift.toLowerCase());
      const statusMatch = curFilter.status === 'All Status' ||
        (curFilter.status === 'Done' && (r.sign || '').toLowerCase() === 'done') ||
        (curFilter.status === 'Pending' && (r.sign || '').toLowerCase() === 'pending');
      const roundMatch = selectedRoundFilter === 'all' ||
        (selectedRoundFilter === 'new' && r.is_new_in_round === 1) ||
        (selectedRoundFilter === 'retained' && r.is_new_in_round !== 1);
      return groupMatch && shiftMatch && statusMatch && roundMatch;
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: rnd.round_number === kpis.latestRound ? '#dcfce7' : '#f1f5f9',
                  color: rnd.round_number === kpis.latestRound ? '#15803d' : '#4b5563',
                  padding: '3px 10px',
                  borderRadius: '6px'
                }}>
                  {rawRoundRecords.length} Mobiles
                  {rnd.added_count > 0 && rnd.round_number > 1 ? ` • +${rnd.added_count} Newly Taken` : ''}
                </span>
              </div>
            </div>

            {/* Card Container wrapping Toolbar + Scrollable Table + Attention Banner matching uploaded image */}
            <div className="daily-task-round-card">
              {/* Control Toolbar: Date Pill on Left, Filters & Add on Right matching Image */}
              <div className="daily-task-card-toolbar">
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#374151',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}>
                  {formatDayString(selectedDay)}
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
                        task_date: `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
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
                        {loading ? 'Loading task records...' : `No records logged for Task ${selectedDay}.${rnd.round_number} (${formatDayString(selectedDay)}). Click '+ Add' to assign devices.`}
                      </td>
                    </tr>
                  ) : (
                    rndFilteredRecords.map((r, index) => {
                      const isDone = (r.sign || '').toLowerCase() === 'done';
                      // Round 1 devices are baseline, NEVER marked as new taking
                      const isNewInRound = rnd.round_number > 1 && r.is_new_in_round === 1;

                      // Map to actual DB record if present
                      const actualRec = taskRecords.find(tr => tr.id === r.id || (tr.taking_device && tr.taking_device.trim().toLowerCase() === (r.taking_device || '').trim().toLowerCase()));
                      const targetRecord = actualRec || r;

                      return (
                        <tr
                          key={r.id || `row-${index}`}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: isNewInRound ? '#f0fdf4' : '#ffffff',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '16px 14px', fontSize: '13.5px', fontWeight: 700, color: '#111827', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                            {index + 1}.
                          </td>
                          <td style={{ padding: '16px 16px', fontSize: '13.5px', fontWeight: 600, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                            {r.name}
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
                                  onClick={() => {
                                    if (targetRecord.id && typeof targetRecord.id === 'number') {
                                      onDeleteRecord(targetRecord.id);
                                    } else {
                                      onDeleteRecord(r.id);
                                    }
                                  }}
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

            {/* Red Attention Banner for Dropped / Removed Devices in this Round */}
            {rnd.removed_devices && rnd.removed_devices.length > 0 && (
              <div style={{
                backgroundColor: '#fff5f5',
                border: '1.5px solid #f87171',
                borderRadius: '12px',
                padding: '14px 18px',
                marginTop: '12px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#991b1b' }}>
                      Attention Required: {rnd.removed_devices.length} Devices Not In List (Task {selectedDay}.{rnd.round_number})
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>
                    Active in previous check but missing in this check. Check office return or mark missing:
                  </span>
                </div>

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
              </div>
            )}
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
    </div>
  );
}
