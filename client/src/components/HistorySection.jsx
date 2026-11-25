import React, { useState, useEffect, useMemo } from 'react';
import UserProfileMenu from './UserProfileMenu';
import {
  History,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  User,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid,
  List,
  Sparkles,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  X
} from 'lucide-react';

export default function HistorySection({
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  setAppTab = () => {},
  onLogout = () => {},
  canManageUsers = true
}) {
  const [activeTab, setActiveTab] = useState('activeDevices'); // 'activeDevices', 'activityHistory', 'auditLogins'
  const [activeDevices, setActiveDevices] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [auditLogins, setAuditLogins] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTableSearch, setActiveTableSearch] = useState('');
  const [activityTableSearch, setActivityTableSearch] = useState('');
  const [loginTableSearch, setLoginTableSearch] = useState('');

  // Calendar filtering states (Default to 17th November 2026 / Task 17)
  const [selectedDay, setSelectedDay] = useState(17);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November (0-indexed: 10)
  const [currentYear, setCurrentYear] = useState(2026);
  const [showCalendar, setShowCalendar] = useState(true);

  // View & Category filters
  const [viewMode, setViewMode] = useState('cards'); // 'cards' (card grid), 'grouped' (series grouped list), 'table'
  const [selectedSeries, setSelectedSeries] = useState('ALL'); // 'ALL', 'New', 'Pn', 'Cass'
  const [selectedShift, setSelectedShift] = useState('ALL'); // 'ALL', 'Day', 'Night'
  const [selectedDeviceStatus, setSelectedDeviceStatus] = useState('ALL'); // 'ALL', 'Taking', 'Returned', 'Missing'

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch history data for a specific day or date
  const fetchHistoryData = async (day = selectedDay, monthIdx = currentMonthIndex, year = currentYear) => {
    setLoading(true);
    try {
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const res = await fetch(`/api/history?task_number=${day}&task_date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setActiveDevices(data.activeDevices || []);
        setHistoryLogs(data.historyLogs || []);
        setAuditLogins(data.auditLogins || []);
        if (data.availableDays) {
          setAvailableDays(data.availableDays);
        }
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(selectedDay, currentMonthIndex, currentYear);
  }, []);

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

  const handleSelectCell = (cell) => {
    let targetMonth = currentMonthIndex;
    let targetYear = currentYear;

    if (cell.monthOffset === -1) {
      if (currentMonthIndex === 0) {
        targetMonth = 11;
        targetYear = currentYear - 1;
      } else {
        targetMonth = currentMonthIndex - 1;
      }
      setCurrentMonthIndex(targetMonth);
      setCurrentYear(targetYear);
    } else if (cell.monthOffset === 1) {
      if (currentMonthIndex === 11) {
        targetMonth = 0;
        targetYear = currentYear + 1;
      } else {
        targetMonth = currentMonthIndex + 1;
      }
      setCurrentMonthIndex(targetMonth);
      setCurrentYear(targetYear);
    }

    setSelectedDay(cell.day);
    fetchHistoryData(cell.day, targetMonth, targetYear);
  };

  const formatDayString = (day, mIdx = currentMonthIndex, yr = currentYear) => {
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${day}${suffix} ${monthNames[mIdx]} ${yr}`;
  };

  // Helper to determine if a date has mobile records in history
  const getDayRecordInfo = (day, mIdx = currentMonthIndex, yr = currentYear) => {
    const dateStr = `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availableDays.find(d => d.task_date === dateStr || d.task_number === day);
  };

  // Detect series of device (e.g. 'New 68' -> 'New', 'Pn 27' -> 'Pn', 'Cass 8' -> 'Cass')
  const getDeviceSeries = (deviceId = '') => {
    const clean = String(deviceId).trim().toLowerCase();
    if (clean.startsWith('new')) return 'New';
    if (clean.startsWith('pn')) return 'Pn';
    if (clean.startsWith('cass')) return 'Cass';
    return 'Other';
  };

  // Styling helpers for device badges
  const getSeriesColorTheme = (series) => {
    switch (series) {
      case 'New':
        return {
          bg: '#ecfdf5',
          border: '#a7f3d0',
          text: '#065f46',
          badgeBg: '#10b981',
          accent: '#059669'
        };
      case 'Pn':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1e40af',
          badgeBg: '#3b82f6',
          accent: '#2563eb'
        };
      case 'Cass':
        return {
          bg: '#fdf4ff',
          border: '#f5d0fe',
          text: '#86198f',
          badgeBg: '#a855f7',
          accent: '#9333ea'
        };
      default:
        return {
          bg: '#f8fafc',
          border: '#e2e8f0',
          text: '#334155',
          badgeBg: '#64748b',
          accent: '#475569'
        };
    }
  };

  // Filtered devices list
  const filteredActiveDevices = useMemo(() => {
    return activeDevices.filter(d => {
      const term = (activeTableSearch || searchTerm).trim().toLowerCase();
      const normTerm = term.replace(/\s+/g, '');
      const devIdStr = (d.device_id || '').toLowerCase();
      const devIdNorm = devIdStr.replace(/\s+/g, '');
      const matchesSearch =
        !term ||
        devIdStr.includes(term) ||
        (normTerm && devIdNorm.includes(normTerm)) ||
        (d.name || '').toLowerCase().includes(term) ||
        (d.active_user || '').toLowerCase().includes(term) ||
        (d.group_name || '').toLowerCase().includes(term) ||
        (d.shift || '').toLowerCase().includes(term) ||
        (d.return_device || '').toLowerCase().includes(term);

      const series = getDeviceSeries(d.device_id);
      const matchesSeries = selectedSeries === 'ALL' || series === selectedSeries;
      const matchesShift = selectedShift === 'ALL' || (d.shift || 'Day').toLowerCase() === selectedShift.toLowerCase();

      let matchesDeviceStatus = true;
      if (selectedDeviceStatus === 'Taking') {
        const isMissing = (d.sign || '').toLowerCase() === 'missing';
        matchesDeviceStatus = Boolean(d.device_id || d.taking_device) && !isMissing;
      } else if (selectedDeviceStatus === 'Returned') {
        matchesDeviceStatus = Boolean((d.return_device || '').trim()) || Boolean((d.return_time || '').trim());
      } else if (selectedDeviceStatus === 'Missing') {
        matchesDeviceStatus = (d.sign || '').toLowerCase() === 'missing';
      }

      return matchesSearch && matchesSeries && matchesShift && matchesDeviceStatus;
    });
  }, [activeDevices, searchTerm, activeTableSearch, selectedSeries, selectedShift, selectedDeviceStatus]);

  // Statistics for selected day
  const dayStats = useMemo(() => {
    let newCount = 0;
    let pnCount = 0;
    let cassCount = 0;
    let otherCount = 0;
    let doneCount = 0;
    let pendingCount = 0;

    activeDevices.forEach(d => {
      const s = getDeviceSeries(d.device_id);
      if (s === 'New') newCount++;
      else if (s === 'Pn') pnCount++;
      else if (s === 'Cass') cassCount++;
      else otherCount++;

      if ((d.sign || '').toLowerCase() === 'done') doneCount++;
      else pendingCount++;
    });

    return {
      total: activeDevices.length,
      newCount,
      pnCount,
      cassCount,
      otherCount,
      doneCount,
      pendingCount
    };
  }, [activeDevices]);

  // Grouped devices by series for the Grouped view
  const groupedBySeries = useMemo(() => {
    const groups = {
      'New': [],
      'Pn': [],
      'Cass': [],
      'Other': []
    };
    filteredActiveDevices.forEach(d => {
      const s = getDeviceSeries(d.device_id);
      if (groups[s]) {
        groups[s].push(d);
      } else {
        groups['Other'].push(d);
      }
    });
    return groups;
  }, [filteredActiveDevices]);

  // Filtered Audit logs
  const filteredHistoryLogs = historyLogs.filter(l => {
    const term = (activityTableSearch || searchTerm).trim().toLowerCase();
    if (!term) return true;
    const normTerm = term.replace(/\s+/g, '');
    const takingStr = (l.taking_device || '').toLowerCase();
    const returnStr = (l.return_device || '').toLowerCase();
    return (
      (l.emp_name || '').toLowerCase().includes(term) ||
      (l.action || '').toLowerCase().includes(term) ||
      (l.details || '').toLowerCase().includes(term) ||
      (l.admin_user || '').toLowerCase().includes(term) ||
      takingStr.includes(term) ||
      (normTerm && takingStr.replace(/\s+/g, '').includes(normTerm)) ||
      returnStr.includes(term) ||
      (normTerm && returnStr.replace(/\s+/g, '').includes(normTerm))
    );
  });

  const filteredAuditLogins = auditLogins.filter(log => {
    const term = (loginTableSearch || searchTerm).trim().toLowerCase();
    if (!term) return true;
    return (
      (log.username || '').toLowerCase().includes(term) ||
      (log.role || '').toLowerCase().includes(term) ||
      (log.status || '').toLowerCase().includes(term) ||
      (log.ip_address || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="responsive-section-container">
      {/* Top Header matching system theme */}
      <div className="responsive-header">
        <div>
          <h1 className="system-h1">
            Mobile Management
          </h1>
          <p className="system-breadcrumb">
            <span>Workspace / History</span>
            <span>•</span>
            <strong style={{ color: '#111827' }}>
              {formatDayString(selectedDay)} (Task #{selectedDay})
            </strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCalendar(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              border: showCalendar ? '1.5px solid #a3e635' : '1px solid #d1d5db',
              backgroundColor: showCalendar ? '#f7fee7' : '#ffffff',
              color: showCalendar ? '#3f6212' : '#374151',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <CalendarIcon size={16} color={showCalendar ? '#65a30d' : '#4b5563'} />
            <span>{showCalendar ? 'Hide Calendar' : 'Calendar Filter'}</span>
            <ChevronDown size={14} style={{ transform: showCalendar ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>

          <button
            onClick={() => fetchHistoryData(selectedDay, currentMonthIndex, currentYear)}
            className="btn-secondary-white"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <UserProfileMenu
            currentUser={currentUser}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            currentUserAvatar={currentUserAvatar}
            onOpenProfile={() => onOpenProfile('general')}
            onOpenSecurity={() => onOpenProfile('security')}
            onLogout={onLogout}
            setActiveTab={setAppTab}
            onRefresh={() => window.location.reload()}
            canManageUsers={canManageUsers}
          />
        </div>
      </div>

      {/* TOP CALENDAR & DAY SELECTOR DRAWER */}
      {showCalendar && (
        <div
          className="history-calendar-grid"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e5e7eb',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}
        >
          {/* Left Column: Interactive Mini Calendar */}
          <div className="history-calendar-left">
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

              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#65a30d', backgroundColor: '#f7fee7', padding: '3px 8px', borderRadius: '6px' }}>
                Select Day
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
                    const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
                    const dayInfo = cell.isCurrentMonth ? getDayRecordInfo(cell.day, currentMonthIndex, currentYear) : null;
                    const hasData = Boolean(dayInfo);

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleSelectCell(cell)}
                        style={{
                          height: '32px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          fontSize: '12px',
                          fontWeight: isSelected ? 800 : (cell.isCurrentMonth ? (hasData ? 700 : 500) : 400),
                          color: isSelected
                            ? '#000000'
                            : (cell.isCurrentMonth
                                ? (hasData ? '#0f172a' : '#4b5563')
                                : '#cbd5e1'),
                          backgroundColor: isSelected
                            ? '#a3e635'
                            : (hasData ? '#ecfdf5' : 'transparent'),
                          border: isSelected
                            ? '1px solid #84cc16'
                            : (hasData ? '1px dashed #6ee7b7' : 'none'),
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={hasData ? `${cell.day}th: ${dayInfo.total_records} Active Mobiles` : `${cell.day}`}
                      >
                        <span>{cell.day}</span>
                        {hasData && !isSelected && (
                          <span style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: '#059669',
                            position: 'absolute',
                            bottom: '3px'
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Date Highlights & Quick Task Jump */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                backgroundColor: '#a3e635',
                color: '#000000',
                fontWeight: 900,
                fontSize: '22px',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedDay}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                  {formatDayString(selectedDay)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Task #{selectedDay} History • <strong>{dayStats.total} Mobile Phones</strong> actively documented
                </div>
              </div>
            </div>

            {/* Quick date switch buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(17);
                  setCurrentMonthIndex(10);
                  setCurrentYear(2026);
                  fetchHistoryData(17, 10, 2026);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: selectedDay === 17 && currentMonthIndex === 10 ? '#111827' : '#f3f4f6',
                  color: selectedDay === 17 && currentMonthIndex === 10 ? '#ffffff' : '#374151',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                17th Nov (71 Mobiles)
              </button>
            </div>

            {/* Day Metrics Quick Strip (Responsive) */}
            <div
              className="history-metrics-grid"
              style={{
                backgroundColor: '#f8fafc',
                padding: '14px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Active</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{dayStats.total}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>New Series</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{dayStats.newCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase' }}>Pn Series</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>{dayStats.pnCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#9333ea', fontWeight: 600, textTransform: 'uppercase' }}>Cass Series</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#9333ea' }}>{dayStats.cassCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation (Responsive Toolbar) */}
      <div className="history-nav-toolbar">
        <div className="history-tab-buttons">
          <button
            onClick={() => setActiveTab('activeDevices')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'activeDevices' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: activeTab === 'activeDevices' ? '#a3e635' : '#ffffff',
              color: activeTab === 'activeDevices' ? '#000000' : '#4b5563'
            }}
          >
            <Smartphone size={16} />
            <span>Active Mobile Phones ({activeDevices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activityHistory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'activityHistory' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: activeTab === 'activityHistory' ? '#a3e635' : '#ffffff',
              color: activeTab === 'activityHistory' ? '#000000' : '#4b5563'
            }}
          >
            <History size={16} />
            <span>Audit Activity History ({historyLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('auditLogins')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'auditLogins' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: activeTab === 'auditLogins' ? '#a3e635' : '#ffffff',
              color: activeTab === 'auditLogins' ? '#000000' : '#4b5563'
            }}
          >
            <ShieldCheck size={16} />
            <span>Audit Logins ({auditLogins.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div
          className="history-search-wrap"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '9999px',
            padding: '8px 18px',
            boxSizing: 'border-box'
          }}
        >
          <Search size={15} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search device (e.g. New 68, Pn 27)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#374151',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* TAB 1: ACTIVE MOBILES LIST / CARDS FOR THE DAY */}
      {activeTab === 'activeDevices' && (
        <div>
          {/* Subheader Toolbar: Category Pills & View Mode Switcher */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Series Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginRight: '4px' }}>
                Series:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSeries('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: selectedSeries === 'ALL' ? '#111827' : '#f3f4f6',
                  color: selectedSeries === 'ALL' ? '#ffffff' : '#4b5563'
                }}
              >
                All ({activeDevices.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeries('New')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: selectedSeries === 'New' ? '#059669' : '#ecfdf5',
                  color: selectedSeries === 'New' ? '#ffffff' : '#047857'
                }}
              >
                New Series ({dayStats.newCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeries('Pn')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: selectedSeries === 'Pn' ? '#2563eb' : '#eff6ff',
                  color: selectedSeries === 'Pn' ? '#ffffff' : '#1d4ed8'
                }}
              >
                Pn Series ({dayStats.pnCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeries('Cass')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: selectedSeries === 'Cass' ? '#9333ea' : '#fdf4ff',
                  color: selectedSeries === 'Cass' ? '#ffffff' : '#7e22ce'
                }}
              >
                Cass Series ({dayStats.cassCount})
              </button>
            </div>

            {/* View Mode Selector: Grid Cards / Grouped List / Table */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'cards' ? '#ffffff' : 'transparent',
                  color: viewMode === 'cards' ? '#111827' : '#6b7280',
                  boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <Grid size={14} />
                <span>Card Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'grouped' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grouped' ? '#111827' : '#6b7280',
                  boxShadow: viewMode === 'grouped' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <Layers size={14} />
                <span>Grouped by Series</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#111827' : '#6b7280',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <List size={14} />
                <span>Table</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: INTERACTIVE CARDS GRID (DEFAULT) */}
          {viewMode === 'cards' && (
            <div>
              {filteredActiveDevices.length === 0 ? (
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '50px 20px',
                  textAlign: 'center',
                  border: '1px dashed #d1d5db',
                  color: '#9ca3af'
                }}>
                  <Smartphone size={36} color="#d1d5db" style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563' }}>No mobile devices match your filters</div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>Try switching the date on the calendar or clearing the search query.</div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: '16px'
                }}>
                  {filteredActiveDevices.map((d, idx) => {
                    const series = getDeviceSeries(d.device_id);
                    const theme = getSeriesColorTheme(series);

                    return (
                      <div
                        key={`${d.record_id}-${d.device_id}-${idx}`}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '16px',
                          border: `1.5px solid ${theme.border}`,
                          padding: '18px 20px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                        }}
                      >
                        <div>
                          {/* Card Top: Device Badge & Sign Status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: theme.bg,
                              border: `1px solid ${theme.border}`,
                              padding: '5px 12px',
                              borderRadius: '8px'
                            }}>
                              <Smartphone size={15} color={theme.accent} />
                              <span style={{ fontSize: '13.5px', fontWeight: 800, color: theme.text }}>
                                {d.device_id}
                              </span>
                            </div>

                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: (d.sign || '').toLowerCase() === 'done' ? '#15803d' : '#ea580c',
                              backgroundColor: (d.sign || '').toLowerCase() === 'done' ? '#dcfce7' : '#ffedd5',
                              padding: '3px 9px',
                              borderRadius: '6px'
                            }}>
                              <CheckCircle2 size={13} />
                              <span>{d.sign || 'Done'}</span>
                            </span>
                          </div>

                          {/* Card Body: Custodian Info */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                              Custodian / Assignee
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User size={15} color="#6b7280" />
                              <span>{d.active_user || d.name}</span>
                            </div>
                          </div>

                          {/* Details Row: Shift, Group, Times */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            backgroundColor: '#f9fafb',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            fontSize: '12px'
                          }}>
                            <div>
                              <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px' }}>Shift</span>
                              <strong style={{ color: '#374151' }}>{d.shift || 'Day'}</strong>
                            </div>
                            <div>
                              <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px' }}>Group</span>
                              <strong style={{ color: d.group_name ? '#111827' : '#9ca3af' }}>
                                {d.group_name || '—'}
                              </strong>
                            </div>
                            <div>
                              <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px' }}>Issued At</span>
                              <strong style={{ color: '#4b5563' }}>{d.issued_at || '7.30 A.M.'}</strong>
                            </div>
                            <div>
                              <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px' }}>Return Time</span>
                              <strong style={{ color: '#4b5563' }}>{d.return_time || '09.55 P.M.'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom / Footer */}
                        <div style={{
                          marginTop: '14px',
                          paddingTop: '10px',
                          borderTop: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11.5px',
                          color: '#9ca3af'
                        }}>
                          <span>Record #{idx + 1} of {filteredActiveDevices.length}</span>
                          <span style={{ fontWeight: 600, color: '#6b7280' }}>Task #{d.task_number || selectedDay}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: GROUPED BY SERIES LIST */}
          {viewMode === 'grouped' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {['New', 'Pn', 'Cass', 'Other'].map(seriesKey => {
                const items = groupedBySeries[seriesKey] || [];
                if (items.length === 0) return null;
                const theme = getSeriesColorTheme(seriesKey);

                return (
                  <div
                    key={seriesKey}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '18px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Series Header */}
                    <div style={{
                      padding: '16px 20px',
                      backgroundColor: theme.bg,
                      borderBottom: `1.5px solid ${theme.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          backgroundColor: theme.badgeBg,
                          color: '#ffffff',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800
                        }}>
                          {seriesKey} Series
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: theme.text }}>
                          {seriesKey === 'New' && 'New Generation Mobile Units'}
                          {seriesKey === 'Pn' && 'PN Handheld Terminals'}
                          {seriesKey === 'Cass' && 'Cassette Dedicated Units'}
                          {seriesKey === 'Other' && 'Other Assigned Devices'}
                        </span>
                      </div>

                      <span style={{ fontSize: '13px', fontWeight: 700, color: theme.accent, backgroundColor: '#ffffff', padding: '3px 10px', borderRadius: '9999px', border: `1px solid ${theme.border}` }}>
                        {items.length} Active Mobiles
                      </span>
                    </div>

                    {/* Devices list inside this series */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', padding: '16px 20px' }}>
                      {items.map((d, i) => (
                        <div
                          key={`${d.record_id}-${i}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#9ca3af',
                              minWidth: '22px'
                            }}>
                              {i + 1}.
                            </span>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                                {d.device_id}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={12} />
                                <span>{d.active_user || d.name}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#15803d',
                              backgroundColor: '#dcfce7',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              {d.sign || 'Done'}
                            </span>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>
                              {d.shift || 'Day'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: STRUCTURED TABLE (OPTIONAL TOGGLE) */}
          {viewMode === 'table' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Active Mobiles Table • {formatDayString(selectedDay)}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>
                    Documented mobile phones and custodians for Task #{selectedDay}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#ffffff',
                    border: activeTableSearch ? '1.5px solid #84cc16' : '1px solid #d1d5db',
                    borderRadius: '9999px',
                    padding: '6px 14px',
                    width: '260px',
                    boxSizing: 'border-box'
                  }}>
                    <Search size={14} color={activeTableSearch ? '#65a30d' : '#9ca3af'} />
                    <input
                      type="text"
                      placeholder="Search in table (device, name...)"
                      value={activeTableSearch}
                      onChange={e => setActiveTableSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: '#111827', width: '100%' }}
                    />
                    {activeTableSearch && (
                      <button
                        type="button"
                        onClick={() => setActiveTableSearch('')}
                        style={{ background: 'transparent', border: 'none', padding: '1px', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedDeviceStatus}
                      onChange={e => setSelectedDeviceStatus(e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundColor: selectedDeviceStatus !== 'ALL' ? '#f0fdf4' : '#ffffff',
                        border: selectedDeviceStatus !== 'ALL' ? '1.5px solid #84cc16' : '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '6px 30px 6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: selectedDeviceStatus !== 'ALL' ? '#166534' : '#374151',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="ALL">All Devices</option>
                      <option value="Taking">Taking Devices</option>
                      <option value="Returned">Returned Devices</option>
                      <option value="Missing">Missing Devices</option>
                    </select>
                    <ChevronDown size={13} color={selectedDeviceStatus !== 'ALL' ? '#16a34a' : '#6b7280'} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>

                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '4px 12px', borderRadius: '9999px' }}>
                    {filteredActiveDevices.length} Mobiles
                  </span>
                </div>
              </div>

              <div className="responsive-table-wrapper">
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', width: '60px' }}>Rec. #</th>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Device ID (Taking)</th>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Current Custodian</th>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Shift</th>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Group</th>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Issued At</th>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Return Time</th>
                      <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', textAlign: 'center' }}>Sign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActiveDevices.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                          No active devices recorded for this selection.
                        </td>
                      </tr>
                    ) : (
                      filteredActiveDevices.map((d, idx) => {
                        const series = getDeviceSeries(d.device_id);
                        const theme = getSeriesColorTheme(series);

                        return (
                          <tr key={`${d.record_id}-${d.device_id}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                              {idx + 1}.
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                backgroundColor: theme.bg,
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '12.5px'
                              }}>
                                {d.device_id}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13.5px', fontWeight: 700, color: '#16a34a' }}>
                              {d.active_user || d.name}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
                              {d.shift || 'Day'}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
                              {d.group_name || '—'}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4b5563' }}>
                              {d.issued_at || '7.30 A.M.'}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4b5563' }}>
                              {d.return_time || '09.55 P.M.'}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: (d.sign || '').toLowerCase() === 'done' ? '#16a34a' : '#ea580c'
                              }}>
                                {d.sign || 'Done'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT ACTIVITY HISTORY */}
      {activeTab === 'activityHistory' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Audit Activity History
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>
                Full chronological log of device handovers, swaps, updates, and shift transitions
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: activityTableSearch ? '1.5px solid #84cc16' : '1px solid #d1d5db',
              borderRadius: '9999px',
              padding: '6px 14px',
              width: '280px',
              boxSizing: 'border-box'
            }}>
              <Search size={14} color={activityTableSearch ? '#65a30d' : '#9ca3af'} />
              <input
                type="text"
                placeholder="Search activity table (device, action...)"
                value={activityTableSearch}
                onChange={e => setActivityTableSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: '#111827', width: '100%' }}
              />
              {activityTableSearch && (
                <button
                  type="button"
                  onClick={() => setActivityTableSearch('')}
                  style={{ background: 'transparent', border: 'none', padding: '1px', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="responsive-table-wrapper">
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', width: '160px' }}>Timestamp</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Employee</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Action Taken</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Devices</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Handover To</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Admin</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Details / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                      No audit logs available.
                    </td>
                  </tr>
                ) : (
                  filteredHistoryLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {log.timestamp}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                        {log.emp_name}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: '#f0fdf4',
                          color: '#166534',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#374151' }}>
                        {log.taking_device ? <span>Taking: <strong>{log.taking_device}</strong></span> : ''}
                        {log.return_device ? <span style={{ marginLeft: '6px' }}>Return: {log.return_device}</span> : ''}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#111827' }}>
                        {log.handover_to || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#4b5563' }}>
                        {log.admin_user || 'Shanaka'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#6b7280' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGIN LOGS */}
      {activeTab === 'auditLogins' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
                System Login Audit History
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>
                Tracks administrator and user system authentication events
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: loginTableSearch ? '1.5px solid #84cc16' : '1px solid #d1d5db',
              borderRadius: '9999px',
              padding: '6px 14px',
              width: '260px',
              boxSizing: 'border-box'
            }}>
              <Search size={14} color={loginTableSearch ? '#65a30d' : '#9ca3af'} />
              <input
                type="text"
                placeholder="Search login table (user, role...)"
                value={loginTableSearch}
                onChange={e => setLoginTableSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: '#111827', width: '100%' }}
              />
              {loginTableSearch && (
                <button
                  type="button"
                  onClick={() => setLoginTableSearch('')}
                  style={{ background: 'transparent', border: 'none', padding: '1px', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="responsive-table-wrapper">
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Timestamp</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Username</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Role</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Action</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>IP Address</th>
                  <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogins.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                      No login records.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogins.map(login => (
                    <tr key={login.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#6b7280' }}>
                        {login.timestamp}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                        {login.username}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#374151' }}>
                        {login.role}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#374151' }}>
                        {login.action || 'Login'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#6b7280' }}>
                        {login.ip_address || '127.0.0.1'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          {login.status || 'Success'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
