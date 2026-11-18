import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRightLeft
} from 'lucide-react';

export default function DailyTaskSection({
  onOpenAddModal = () => {},
  onOpenEditModal = () => {},
  onDeleteRecord = () => {},
  groups = [],
  refreshRecords = () => {},
  onLogout = () => {}
}) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(7); // August (0-indexed: 7)
  const [selectedDay, setSelectedDay] = useState(17);

  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedShift, setSelectedShift] = useState('All Shift');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const [taskRecords, setTaskRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [kpis, setKpis] = useState({
    todayActiveMobiles: 70,
    activeMobilePhones: 3,
    needAnUpdate: 1
  });

  // Fetch records and KPIs for current selected daily task
  const fetchTaskData = async () => {
    setLoading(true);
    try {
      // 1. Fetch records for this day / task
      const recRes = await fetch(`/api/records?task_number=${selectedDay}`);
      const recData = await recRes.json();
      if (recData.success) {
        setTaskRecords(recData.data || []);
      }

      // 2. Fetch KPIs for this daily task
      const kpiRes = await fetch(`/api/daily-task/kpis?task_number=${selectedDay}`);
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
  }, [selectedDay]);

  // Handle inline shift change
  const handleInlineShiftChange = async (recordId, newShift) => {
    try {
      await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    try {
      await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  // Filter records
  const filteredRecords = taskRecords.filter(r => {
    const groupMatch = selectedGroup === 'All Groups' || r.group_name === selectedGroup;
    const shiftMatch = selectedShift === 'All Shift' || r.shift === selectedShift;
    const statusMatch = selectedStatus === 'All Status' ||
      (selectedStatus === 'Done' && (r.sign || '').toLowerCase() === 'done') ||
      (selectedStatus === 'Pending' && (r.sign || '').toLowerCase() === 'pending');
    return groupMatch && shiftMatch && statusMatch;
  });

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header Row matching screenshots */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Mobile Management
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
            Workspace / Dashboard
          </p>
        </div>

        {/* Right side: Top task badge & Profile header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            backgroundColor: '#ede9fe',
            color: '#7c3aed',
            fontWeight: 700,
            fontSize: '14.5px',
            padding: '6px 16px',
            borderRadius: '8px',
            letterSpacing: '0.01em'
          }}>
            Task {String(selectedDay).padStart(2, '0')}
          </div>

          <div
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '9999px',
              padding: '4px 14px 4px 6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer'
            }}
            title="Click to Logout"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Shanaka"
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1f2937' }}>
              Shanaka
            </span>
          </div>
        </div>
      </div>

      {/* Main KPI Cards & Calendar Section matching Image 2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.8fr 1.2fr',
        gap: '24px',
        marginBottom: '28px',
        alignItems: 'start'
      }}>
        {/* Left: 3 KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          {/* Card 1: Today Active Mobiles */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #84cc16',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(132, 204, 22, 0.06)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
              Today Active Mobiles
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#84cc16', lineHeight: 1.1, marginBottom: '10px' }}>
              {kpis.todayActiveMobiles ?? 70}
            </div>
            <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
              {kpis.todayActiveMobiles ?? 70} Mobile phones issued in today
            </div>
          </div>

          {/* Card 2: Active Mobile Phones */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #06b6d4',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(6, 182, 212, 0.06)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
              Active Mobile Phones
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#06b6d4', lineHeight: 1.1, marginBottom: '10px' }}>
              {kpis.activeMobilePhones ?? 3}
            </div>
            <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
              {String(kpis.activeMobilePhones ?? 3).padStart(2, '0')} under active mobile phones
            </div>
          </div>

          {/* Card 3: Need an Update */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #ef4444',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.06)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
              Need an Update
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#ef4444', lineHeight: 1.1, marginBottom: '10px' }}>
              {kpis.needAnUpdate ?? 1}
            </div>
            <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
              {kpis.needAnUpdate ?? 1} under need an update
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

      {/* Control Toolbar: Date Pill on Left, Filters & Add on Right matching Image 2 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Date indicator pill badge matching Image 2 */}
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

        {/* Right: Filters & Add Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Groups dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
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

          {/* Shifts dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
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

          {/* Status dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
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

          {/* Lime Green Add Button matching Image 2 */}
          <button
            onClick={() => onOpenAddModal({
              task_number: selectedDay,
              task_date: `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
            })}
            style={{
              backgroundColor: '#84cc16',
              color: '#000000',
              fontWeight: 800,
              fontSize: '13px',
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(132, 204, 22, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Task Table matching user's Image 2 */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #e5e7eb' }}>
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    {loading ? 'Loading task records...' : `No records logged for Task ${selectedDay} (${formatDayString(selectedDay)}). Click '+ Add' to assign devices.`}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, index) => {
                  const isDone = (r.sign || '').toLowerCase() === 'done';

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: '#ecfbfb',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Rec. No. */}
                      <td style={{ padding: '16px 14px', fontSize: '13.5px', fontWeight: 700, color: '#111827', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        {index + 1}.
                      </td>

                      {/* EMP. Name */}
                      <td style={{ padding: '16px 16px', fontSize: '13.5px', fontWeight: 600, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                        {r.name}
                      </td>

                      {/* Shift with dropdown caret */}
                      <td style={{ padding: '16px 14px', fontSize: '13.5px', color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <span>{r.shift || 'Day'}</span>
                          <ChevronDown size={13} color="#6b7280" />
                        </div>
                      </td>

                      {/* Group with dropdown caret */}
                      <td style={{ padding: '16px 14px', fontSize: '13.5px', color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <span>{r.group_name || 'Group D'}</span>
                          <ChevronDown size={13} color="#6b7280" />
                        </div>
                      </td>

                      {/* Issued At */}
                      <td style={{ padding: '16px 14px', fontSize: '13px', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                        {r.issued_at || '7.30 A.M.'}
                      </td>

                      {/* Return Time */}
                      <td style={{ padding: '16px 14px', fontSize: '13px', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                        {r.return_time || ''}
                      </td>

                      {/* Device Details with multi-device support matching user's scenario */}
                      <td style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Return row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                            <span style={{ color: '#6b7280', width: '52px' }}>Return:</span>
                            {r.return_device ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {parseDevices(r.return_device).map((dev, i) => (
                                  <span key={i} style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#1f2937',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                  }}>
                                    {dev}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {/* Taking row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                            <span style={{ color: '#6b7280', width: '52px' }}>Taking:</span>
                            {r.taking_device ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {parseDevices(r.taking_device).map((dev, i) => (
                                  <span key={i} style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#1f2937',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                  }}>
                                    {dev}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Handover to */}
                      <td style={{ padding: '16px 16px', fontSize: '13.5px', fontWeight: 500, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                        {r.handover_to || ''}
                      </td>

                      {/* Sign */}
                      <td style={{ padding: '16px 14px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: isDone ? '#16a34a' : '#ea580c'
                        }}>
                          {r.sign || 'Done'}
                        </span>
                      </td>

                      {/* Action buttons (Yellow edit pencil & Red delete trash can) */}
                      <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => onOpenEditModal(r)}
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
                          <button
                            onClick={() => onDeleteRecord(r.id)}
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
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Extra visual padding empty rows matching Image 2 mockup if less than 6 rows */}
              {filteredRecords.length > 0 && filteredRecords.length < 6 && (
                Array.from({ length: 6 - filteredRecords.length }).map((_, i) => (
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
      </div>
    </div>
  );
}
