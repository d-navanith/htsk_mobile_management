import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  Package,
  ArrowUpRight
} from 'lucide-react';
import SnowEffect from './SnowEffect';

export default function Dashboard({
  records: parentRecords = [],
  loading: parentLoading = false,
  onOpenAddModal = () => {},
  onOpenEditModal = () => {},
  onDeleteRecord = () => {},
  onDownloadTemplate = () => {},
  onExportExcel = () => {},
  groups = [],
  refreshRecords = () => {},
  setActiveTab = () => {},
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  onLogout = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedShift, setSelectedShift] = useState('All Shift');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  // Animation Status (Controllable per user and globally in User Manage)
  const [animationStatus, setAnimationStatus] = useState({ allowed: true, activeAnimation: 'snow' });

  // Calendar filtering state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // null means default to latest
  const [selectedTaskNumber, setSelectedTaskNumber] = useState(null); // null means default to latest
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [isViewAllDays, setIsViewAllDays] = useState(false);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November (0-indexed: 10)
  const [currentYear, setCurrentYear] = useState(2026);
  const [availableDays, setAvailableDays] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [kpis, setKpis] = useState({
    totalMobilePhones: 241,
    activeMobilePhones: 78,
    availableInStock: 163,
    needAnUpdate: 0,
    activeTaskNumber: 19,
    activeTaskDate: '2026-11-19',
    isLatest: true,
    latestTaskNumber: 19,
    latestTaskDate: '2026-11-19'
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch KPIs and records for selected day/task
  const fetchDashboardData = async (taskNum = selectedTaskNumber, dateStr = selectedDateStr, viewAll = isViewAllDays) => {
    setLoading(true);
    try {
      let kpisUrl = '/api/kpis';
      let recordsUrl = '/api/records';

      if (viewAll) {
        kpisUrl += '?task_number=all';
        recordsUrl += '?all=true';
      } else if (taskNum !== null && taskNum !== undefined) {
        kpisUrl += `?task_number=${taskNum}`;
        recordsUrl += `?task_number=${taskNum}`;
        if (dateStr) {
          kpisUrl += `&task_date=${dateStr}`;
          recordsUrl += `&task_date=${dateStr}`;
        }
      } else if (dateStr) {
        kpisUrl += `?task_date=${dateStr}`;
        recordsUrl += `?task_date=${dateStr}`;
      }

      const [kpiRes, recRes] = await Promise.all([
        fetch(kpisUrl),
        fetch(recordsUrl)
      ]);

      const kpiData = await kpiRes.json();
      const recData = await recRes.json();

      if (kpiData.success && kpiData.data) {
        setKpis(kpiData.data);
        if (kpiData.data.availableDays) {
          setAvailableDays(kpiData.data.availableDays);
        }

        // Initialize default selected day and month if not set
        if (selectedDay === null && !viewAll) {
          const activeDate = kpiData.data.activeTaskDate || kpiData.data.latestTaskDate;
          if (activeDate) {
            const parts = activeDate.split('-');
            if (parts.length === 3) {
              const yr = parseInt(parts[0], 10);
              const mIdx = parseInt(parts[1], 10) - 1;
              const d = parseInt(parts[2], 10);
              setSelectedDay(d);
              setCurrentMonthIndex(mIdx);
              setCurrentYear(yr);
              setSelectedDateStr(activeDate);
              setSelectedTaskNumber(kpiData.data.activeTaskNumber);
            }
          }
        }
      }

      if (recData.success && recData.data) {
        setRecords(recData.data);
      }
    } catch (e) {
      console.error('Failed to fetch Dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
  }, [selectedTaskNumber, selectedDateStr, isViewAllDays]);

  // When parent triggers refresh (after modal save/edit), re-fetch
  useEffect(() => {
    if (parentRecords && parentRecords.length > 0 && selectedTaskNumber === null && !isViewAllDays) {
      setRecords(parentRecords);
    }
  }, [parentRecords]);

  // Fetch Dashboard Animation visibility status for current user
  useEffect(() => {
    const fetchAnimationStatus = async () => {
      try {
        const username = currentUser || localStorage.getItem('htsk_current_user') || 'shanaka';
        const res = await fetch(`/api/user-animation-status?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.success) {
          setAnimationStatus({
            allowed: Boolean(data.allowed),
            activeAnimation: data.activeAnimation
          });
        }
      } catch (err) {
        console.error('Failed to fetch animation status:', err);
      }
    };
    fetchAnimationStatus();
  }, [currentUser]);

  // Calendar math
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
    // Next month padding
    let nextDay = 1;
    while (cells.length % 7 !== 0 || cells.length < 35) {
      cells.push({
        day: nextDay++,
        isCurrentMonth: false,
        monthOffset: 1
      });
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [currentYear, currentMonthIndex]);

  // Calendar navigation
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

  // Check if a date has records in availableDays
  const getDayRecordInfo = (day, mIdx = currentMonthIndex, yr = currentYear) => {
    const dateStr = `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availableDays.find(d => d.task_date === dateStr || d.task_number === day);
  };

  // Select day from calendar
  const handleSelectDay = (day, mIdx = currentMonthIndex, yr = currentYear) => {
    const dateStr = `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayInfo = getDayRecordInfo(day, mIdx, yr);
    const taskNum = dayInfo ? dayInfo.task_number : day;

    setSelectedDay(day);
    setCurrentMonthIndex(mIdx);
    setCurrentYear(yr);
    setSelectedDateStr(dateStr);
    setSelectedTaskNumber(taskNum);
    setIsViewAllDays(false);
    fetchDashboardData(taskNum, dateStr, false);
  };

  // Quick switch to specific task
  const handleQuickTaskSelect = (task) => {
    if (task === 'all') {
      setIsViewAllDays(true);
      setSelectedTaskNumber('all');
      setSelectedDateStr('All Dates');
      setSelectedDay(null);
      fetchDashboardData('all', 'All Dates', true);
      return;
    }

    const parts = task.task_date.split('-');
    const yr = parseInt(parts[0], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    setSelectedDay(d);
    setCurrentMonthIndex(mIdx);
    setCurrentYear(yr);
    setSelectedDateStr(task.task_date);
    setSelectedTaskNumber(task.task_number);
    setIsViewAllDays(false);
    fetchDashboardData(task.task_number, task.task_date, false);
  };

  // Reset to latest day
  const handleResetToLatest = () => {
    const latest = availableDays.length > 0 ? availableDays[0] : null;
    if (latest) {
      handleQuickTaskSelect(latest);
    } else {
      setSelectedDay(null);
      setSelectedTaskNumber(null);
      setSelectedDateStr('');
      setIsViewAllDays(false);
      fetchDashboardData(null, '', false);
    }
  };

  // Step prev / next available day
  const handleStepDay = (direction) => {
    if (availableDays.length === 0) return;
    const currentIndex = availableDays.findIndex(d =>
      d.task_number === selectedTaskNumber || d.task_date === selectedDateStr
    );
    if (currentIndex === -1) {
      handleQuickTaskSelect(availableDays[0]);
      return;
    }
    const nextIndex = currentIndex - direction; // availableDays is sorted DESC (0 is latest)
    if (nextIndex >= 0 && nextIndex < availableDays.length) {
      handleQuickTaskSelect(availableDays[nextIndex]);
    }
  };

  const formatDayString = (day, mIdx = currentMonthIndex, yr = currentYear) => {
    if (!day) return '';
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${day}${suffix} ${monthNames[mIdx]} ${yr}`;
  };

  // Handle inline shift change
  const handleInlineShiftChange = async (recordId, newShift) => {
    try {
      await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift: newShift })
      });
      fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
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
      fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
      refreshRecords();
    } catch (e) {
      console.error('Error updating group:', e);
    }
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (r.name || '').toLowerCase().includes(term);
    const returnDevMatch = (r.return_device || '').toLowerCase().includes(term);
    const takingDevMatch = (r.taking_device || '').toLowerCase().includes(term);
    const handoverMatch = (r.handover_to || '').toLowerCase().includes(term);
    const groupMatch = (r.group_name || '').toLowerCase().includes(term);
    const matchesSearch = searchTerm === '' || nameMatch || returnDevMatch || takingDevMatch || handoverMatch || groupMatch;

    const matchesGroup = selectedGroup === 'All Groups' || selectedGroup === 'all' ||
      (selectedGroup === 'No Group' && (!r.group_name || r.group_name.trim() === '')) ||
      r.group_name === selectedGroup;
    const matchesShift = selectedShift === 'All Shift' || selectedShift === 'all' || r.shift === selectedShift;
    const matchesStatus =
      selectedStatus === 'All Status' ||
      selectedStatus === 'all' ||
      (r.sign || '').toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesGroup && matchesShift && matchesStatus;
  });

  const isCurrentFilterLatest = kpis.isLatest || (availableDays[0] && availableDays[0].task_number === selectedTaskNumber);

  return (
    <div className="responsive-section-container">
      {/* Top Header matching System Theme */}
      <div className="responsive-header">
        <div>
          <h1 className="system-h1">
            Mobile Management
          </h1>
          <p className="system-breadcrumb">
            <span>Workspace / Dashboard</span>
            <span>•</span>
            <strong style={{ color: '#111827' }}>
              {isViewAllDays ? 'All Tasks Combined' : `${formatDayString(selectedDay)} (Task #${selectedTaskNumber || kpis.activeTaskNumber})`}
            </strong>
            {isCurrentFilterLatest && !isViewAllDays && (
              <span style={{ fontSize: '11px', backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                Latest Day
              </span>
            )}
          </p>
        </div>

        {/* Right side: Stock badge & Profile capsule matching system theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="stock-badge-pill">
            <Package size={17} color="#65a30d" />
            <span>Total Stock: {kpis.totalMobilePhones || 241} Phones</span>
          </div>

          <div
            className="desktop-only-profile user-profile-capsule"
            onClick={refreshRecords}
            title="Refresh Data / User Profile"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Shanaka"
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1f2937' }}>
              {currentUserName || (currentUser ? currentUser.charAt(0).toUpperCase() + currentUser.slice(1) : 'Shanaka')}
            </span>
          </div>
        </div>
      </div>

      {/* CALENDAR FILTERING BAR */}
      <div style={{
        marginTop: '18px',
        marginBottom: '18px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        {/* Left: Calendar toggle and quick day pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Calendar Picker Toggle Button */}
          <button
            onClick={() => setShowCalendar(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: showCalendar ? '1.5px solid #84cc16' : '1px solid #d1d5db',
              backgroundColor: showCalendar ? '#f7fee7' : '#ffffff',
              color: showCalendar ? '#365314' : '#374151',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <CalendarIcon size={15} color={showCalendar ? '#65a30d' : '#6b7280'} />
            <span>
              {isViewAllDays
                ? 'All Dates'
                : selectedDay
                ? `${formatDayString(selectedDay)} (Task #${selectedTaskNumber || kpis.activeTaskNumber})`
                : 'Select Date'}
            </span>
            <ChevronDown size={14} style={{ transform: showCalendar ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Right: Reset & Refresh Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isCurrentFilterLatest && !isViewAllDays && (
            <button
              onClick={handleResetToLatest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                color: '#374151',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Back to Latest Active Day"
            >
              <RotateCcw size={13} />
              <span>Back to Latest</span>
            </button>
          )}

          <button
            onClick={() => fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              color: '#374151',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Refresh Data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE FULL CALENDAR DRAWER (With Snow Animation strictly inside) */}
      {showCalendar && (
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1.5px solid #84cc16',
          padding: '20px 24px',
          marginBottom: '22px',
          boxShadow: '0 10px 25px -5px rgba(132, 204, 22, 0.1)',
          display: 'grid',
          gridTemplateColumns: 'minmax(310px, 360px) 1fr',
          gap: '28px',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Ambient Animation strictly inside Calendar Card (Controllable via User Manage) */}
          {animationStatus.allowed && animationStatus.activeAnimation && (
            <SnowEffect count={22} color="#0284c7" secondaryColor="#84cc16" type={animationStatus.activeAnimation} />
          )}

          {/* Left Column: Interactive Mini Calendar Grid */}
          <div style={{ position: 'relative', zIndex: 1, borderRight: '1px solid #f1f5f9', paddingRight: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#4b5563'
                  }}
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', minWidth: '120px', textAlign: 'center' }}>
                  {monthNames[currentMonthIndex]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#4b5563'
                  }}
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <span style={{ fontSize: '11px', fontWeight: 700, color: '#65a30d', backgroundColor: '#f7fee7', padding: '3px 8px', borderRadius: '6px' }}>
                Pick Dashboard Day
              </span>
            </div>

            {/* Weekday labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
              {weekDays.map(w => (
                <div key={w} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#9ca3af', padding: '2px 0' }}>
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid cells */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {calendarRows.map((row, rIdx) => (
                <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {row.map((cell, cIdx) => {
                    const isSelected = !isViewAllDays && cell.isCurrentMonth && cell.day === selectedDay;
                    const dayInfo = cell.isCurrentMonth ? getDayRecordInfo(cell.day, currentMonthIndex, currentYear) : null;
                    const hasRecords = Boolean(dayInfo);

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => {
                          if (cell.isCurrentMonth) {
                            handleSelectDay(cell.day, currentMonthIndex, currentYear);
                          }
                        }}
                        style={{
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          border: isSelected
                            ? '2px solid #84cc16'
                            : hasRecords
                            ? '1.5px solid #a3e635'
                            : '1px solid transparent',
                          backgroundColor: isSelected
                            ? '#84cc16'
                            : hasRecords
                            ? '#f7fee7'
                            : cell.isCurrentMonth
                            ? '#ffffff'
                            : '#f9fafb',
                          color: isSelected
                            ? '#000000'
                            : hasRecords
                            ? '#365314'
                            : cell.isCurrentMonth
                            ? '#1f2937'
                            : '#d1d5db',
                          fontWeight: isSelected || hasRecords ? 800 : 500,
                          fontSize: '12px',
                          cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                          position: 'relative',
                          transition: 'all 0.1s ease',
                          padding: '2px'
                        }}
                      >
                        <span>{cell.day}</span>
                        {hasRecords && (
                          <div style={{
                            fontSize: '8.5px',
                            fontWeight: 800,
                            lineHeight: 1,
                            marginTop: '2px',
                            color: isSelected ? '#000000' : '#65a30d'
                          }}>
                            {dayInfo.total_records}p
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Date Details & Confirmation */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#65a30d', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              <Sparkles size={16} />
              <span>Calendar Filter Mode Active</span>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 8px 0' }}>
              {isViewAllDays ? 'Viewing All Tasks' : `${formatDayString(selectedDay)} (Task #${selectedTaskNumber || kpis.activeTaskNumber})`}
            </h3>

            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              The Dashboard KPIs and records table below are synced to this date. You can review and manage mobile devices issued on this specific day.
            </p>

            {/* Quick stats snapshot for the day */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '10px 14px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Active Phones</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#06b6d4', marginTop: '2px' }}>
                  {kpis.activeMobilePhones || 0}
                </div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '10px 14px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Available Stock</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#84cc16', marginTop: '2px' }}>
                  {kpis.availableInStock || 0}
                </div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '10px 14px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Total Records</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                  {records.length}
                </div>
              </div>
            </div>

            {/* Close calendar button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                style={{
                  backgroundColor: '#84cc16',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Apply & Close Calendar
              </button>
              <button
                type="button"
                onClick={handleResetToLatest}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer'
                }}
              >
                Reset to Today
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 KPI Summary Cards matching Image 4 (With Snow Animation strictly inside each card) */}
      <div className="responsive-kpi-grid-4">
        {/* Card 1: Total Mobile Phones */}
        <div
          className="clickable-kpi-card"
          onClick={() => setActiveTab && setActiveTab('inventory')}
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #84cc16',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(132, 204, 22, 0.06)'
          }}
          title="Click to view full inventory"
        >
          {/* Ambient Animation strictly inside this card */}
          {animationStatus.allowed && animationStatus.activeAnimation && (
            <SnowEffect count={12} color="#84cc16" secondaryColor="#38bdf8" type={animationStatus.activeAnimation} />
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
              Total Mobile Phones
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#84cc16', lineHeight: 1.1, marginBottom: '10px' }}>
              {kpis.totalMobilePhones || 241}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
                {kpis.totalMobilePhones || 241} Mobile phones available in stock
              </div>
              <div className="card-arrow-btn" title="View Inventory">
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Mobile Phones */}
        <div
          className="clickable-kpi-card"
          onClick={() => setActiveTab && setActiveTab('dailytask')}
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #06b6d4',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(6, 182, 212, 0.06)'
          }}
          title="Click to view daily task activity"
        >
          {/* Ambient Animation strictly inside this card */}
          {animationStatus.allowed && animationStatus.activeAnimation && (
            <SnowEffect count={12} color="#06b6d4" secondaryColor="#93c5fd" type={animationStatus.activeAnimation} />
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
              Active Mobile Phones
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#06b6d4', lineHeight: 1.1, marginBottom: '10px' }}>
              {kpis.activeMobilePhones !== undefined ? kpis.activeMobilePhones : 78}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
                {String(kpis.activeMobilePhones !== undefined ? kpis.activeMobilePhones : 78).padStart(2, '0')} under active mobile phones
              </div>
              <div className="card-arrow-btn" title="View Daily Tasks">
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Available in Stock (Matching User Attachment 3) */}
        <div
          className="clickable-kpi-card"
          onClick={() => setActiveTab && setActiveTab('inventory')}
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #eab308',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(234, 179, 8, 0.06)'
          }}
          title="Click to view available devices in stock"
        >
          {/* Ambient Animation strictly inside this card */}
          {animationStatus.allowed && animationStatus.activeAnimation && (
            <SnowEffect count={12} color="#eab308" secondaryColor="#38bdf8" type={animationStatus.activeAnimation} />
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
              Available in Stock
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#eab308', lineHeight: 1.1, marginBottom: '10px' }}>
              {kpis.availableInStock !== undefined ? kpis.availableInStock : 163}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
                {kpis.availableInStock !== undefined ? kpis.availableInStock : 163} under available in stock
              </div>
              <div className="card-arrow-btn" title="View in Inventory">
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Need an Update */}
        <div
          className="clickable-kpi-card"
          onClick={() => setActiveTab && setActiveTab('update')}
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #ef4444',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.06)'
          }}
          title="Click to open update section"
        >
          {/* Ambient Animation strictly inside this card */}
          {animationStatus.allowed && animationStatus.activeAnimation && (
            <SnowEffect count={12} color="#ef4444" secondaryColor="#fda4af" type={animationStatus.activeAnimation} />
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
              Need an Update
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#ef4444', lineHeight: 1.1, marginBottom: '10px' }}>
              {kpis.needAnUpdate !== undefined ? kpis.needAnUpdate : 0}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
                {kpis.needAnUpdate !== undefined ? kpis.needAnUpdate : 0} under need an update
              </div>
              <div className="card-arrow-btn" title="Go to Update">
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar matching Image 4 */}
      <div className="responsive-toolbar">
        {/* Search bar pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#f3f4f6',
          borderRadius: '9999px',
          padding: '10px 20px',
          width: '100%',
          maxWidth: '380px',
          boxSizing: 'border-box'
        }}>
          <Search size={17} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search by name, device..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13.5px',
              color: '#374151',
              width: '100%'
            }}
          />
        </div>

        {/* Filters and Add button */}
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
                borderRadius: '9999px',
                padding: '9px 34px 9px 18px',
                fontSize: '13.5px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Groups">All Groups</option>
              <option value="No Group">No Group (Empty)</option>
              <option value="Group A">Group A</option>
              <option value="Group B">Group B</option>
              <option value="Group C">Group C</option>
              <option value="Group D">Group D</option>
              <option value="Group AO">Group AO</option>
            </select>
            <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Shift dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
              style={{
                appearance: 'none',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '9999px',
                padding: '9px 34px 9px 18px',
                fontSize: '13.5px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Shift">All Shift</option>
              <option value="Day">Day</option>
              <option value="Night">Night</option>
            </select>
            <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
                borderRadius: '9999px',
                padding: '9px 34px 9px 18px',
                fontSize: '13.5px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Status">All Status</option>
              <option value="Done">Done</option>
              <option value="Pending">Pending</option>
            </select>
            <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Green Add button matching system theme */}
          <button
            onClick={() => onOpenAddModal({ task_number: selectedTaskNumber, task_date: selectedDateStr })}
            className="btn-primary-lime"
          >
            Add
          </button>
        </div>
      </div>

      {/* Main Table matching Image 4 */}
      <div className="responsive-table-wrapper">
        <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '70px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                  Rec. No.
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 700, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                  EMP. Name
                </th>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '90px', borderRight: '1px solid #e5e7eb' }}>
                  Shift
                </th>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '110px', borderRight: '1px solid #e5e7eb' }}>
                  Group
                </th>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '100px', borderRight: '1px solid #e5e7eb' }}>
                  Issued At
                </th>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '110px', borderRight: '1px solid #e5e7eb' }}>
                  Return Time
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 700, color: '#111827', minWidth: '180px', borderRight: '1px solid #e5e7eb' }}>
                  Device Details
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 700, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
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
                    {loading ? 'Loading records...' : `No records found for ${isViewAllDays ? 'selected filters' : formatDayString(selectedDay)}.`}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, index) => {
                  const isDone = (r.sign || '').toLowerCase() === 'done';
                  const isNewInRound = r.is_new_in_round === 1;

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: isNewInRound ? '#f0fdf4' : '#ecfbfb',
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
                          <span>{r.group_name || ''}</span>
                          {r.group_name ? <ChevronDown size={13} color="#6b7280" /> : null}
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

                      {/* Device Details (Stacked Return & Taking pills matching Image 4 & multi-device support) */}
                      <td style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Return row if device exists */}
                          {r.return_device ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                              <span style={{ color: '#7c3aed', fontWeight: 700, width: '52px' }}>Return:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {r.return_device.split(/[,+&/]/).map(d => d.trim()).filter(Boolean).map((dev, i) => (
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

                          {/* Taking row if device exists */}
                          {r.taking_device ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                              <span style={{ color: '#6b7280', width: '52px' }}>Taking:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                {r.taking_device.split(/[,+&/]/).map(d => d.trim()).filter(Boolean).map((dev, i) => (
                                  <span key={i} style={{
                                    backgroundColor: isNewInRound ? '#ecfdf5' : '#f1f5f9',
                                    color: isNewInRound ? '#047857' : '#1f2937',
                                    border: isNewInRound ? '1px solid #86efac' : 'none',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px'
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
                                    + NEW TAKING {r.round_number ? `(Round ${r.round_number})` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {!r.return_device && !r.taking_device && (
                            <span style={{ color: '#9ca3af', fontSize: '12.5px' }}>—</span>
                          )}
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

                      {/* Action (Edit and Delete buttons) */}
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

              {/* Extra visual padding empty rows matching Image 4 mockup if less than 6 rows */}
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
  );
}
