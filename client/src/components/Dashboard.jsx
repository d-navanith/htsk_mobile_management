import React, { useState, useEffect, useMemo } from 'react';
import UserProfileMenu from './UserProfileMenu';
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
  ArrowUpRight,
  X,
  AlertTriangle,
  ArrowRightLeft
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
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  onLogout = () => {},
  canEdit = true,
  canDelete = true,
  canManageUsers = true
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

  // Cross-Task Comparison State (Task A = Task B Compare on Dashboard)
  const [taskOptions, setTaskOptions] = useState([]);
  const [compareFromKey, setCompareFromKey] = useState('20.1');
  const [compareToKey, setCompareToKey] = useState('21.1');
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [compareCategoryFilter, setCompareCategoryFilter] = useState('all'); // 'all' | 'newly_added' | 'previously_available' | 'not_available' | 'returned' | 'missing' | 'not_in_system'
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);
  const [popupActiveTab, setPopupActiveTab] = useState('overview');

  // Full Task Table Deletion Modal State on Dashboard
  const [showDeleteTableModal, setShowDeleteTableModal] = useState(false);
  const [deletingTable, setDeletingTable] = useState(false);

  // Attention Required Minimize & Bulk Mark All Returned State
  const [isAttentionMinimized, setIsAttentionMinimized] = useState(false);
  const [bulkResolving, setBulkResolving] = useState(false);

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

  // Run Cross-Task Comparison (Task A = Task B)
  const runTaskComparison = async (fromKey = compareFromKey, toKey = compareToKey, openPopup = false) => {
    setComparisonLoading(true);
    try {
      const res = await fetch(`/api/tasks/compare?from=${encodeURIComponent(fromKey)}&to=${encodeURIComponent(toKey)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setComparisonData(json.data);
        setIsComparing(true);

        if (openPopup) {
          // Sync dashboard date header to the compared target task
          const targetTask = json.data.toTask;
          if (targetTask && targetTask.task_date) {
            const parts = targetTask.task_date.split('-');
            if (parts.length === 3) {
              setSelectedYear(parseInt(parts[0], 10));
              setCurrentMonthIndex(parseInt(parts[1], 10) - 1);
              setSelectedDay(parseInt(parts[2], 10));
              setSelectedDateStr(targetTask.task_date);
              setSelectedTaskNumber(targetTask.task_number);
              setIsViewAllDays(false);
            }
          }
          setPopupActiveTab('overview');
          setShowComparisonPopup(true);
        }
      }
    } catch (err) {
      console.error('Failed to compare tasks:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  const setSelectedYear = (yr) => {
    if (!isNaN(yr)) setCurrentYear(yr);
  };

  // Load available tasks/rounds for comparison dropdowns
  const fetchComparisonOptions = async (autoRun = true) => {
    try {
      const res = await fetch('/api/tasks/comparison-list');
      const json = await res.json();
      if (json.success && json.data) {
        const opts = json.data.options || [];
        setTaskOptions(opts);
        const defFrom = json.data.defaultFromKey || '20.1';
        const defTo = json.data.defaultToKey || '21.1';
        setCompareFromKey(defFrom);
        setCompareToKey(defTo);
        if (autoRun && opts.length >= 1) {
          await runTaskComparison(defFrom, defTo, false);
        }
      }
    } catch (err) {
      console.error('Error loading task comparison list:', err);
    }
  };

  useEffect(() => {
    fetchComparisonOptions(true);
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
  }, [selectedTaskNumber, selectedDateStr, isViewAllDays]);

  // Resolve dropped device (Mark Returned or Missing) from Dashboard Attention Required banner or Comparison Popup
  const handleResolveComparedDevice = async (deviceTag, action) => {
    if (!canEdit) return;
    const targetTaskNum = comparisonData?.toTask?.task_number || selectedTaskNumber || kpis.activeTaskNumber || 21;
    const targetRoundNum = comparisonData?.toTask?.round_number || 1;
    try {
      const token = localStorage.getItem('htsk_session_token');
      const res = await fetch('/api/daily-task/resolve-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Role': currentUserRole
        },
        body: JSON.stringify({
          task_number: targetTaskNum,
          round_number: targetRoundNum,
          device_tag: deviceTag,
          action,
          admin_user: currentUserName || 'Shanaka'
        })
      });
      const data = await res.json();
      if (data.success) {
        await runTaskComparison(compareFromKey, compareToKey, false);
        fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
        refreshRecords();
      }
    } catch (err) {
      console.error('Error resolving device:', err);
    }
  };

  // Bulk Mark All Dropped Devices as Returned
  const handleMarkAllReturned = async () => {
    if (!canEdit || !comparisonData || !comparisonData.notAvailable || comparisonData.notAvailable.length === 0) return;
    const tagsToMark = comparisonData.notAvailable
      .filter(item => item.resolution?.status !== 'returned')
      .map(item => item.device_tag);

    if (tagsToMark.length === 0) return;

    const targetTaskNum = comparisonData?.toTask?.task_number || selectedTaskNumber || kpis.activeTaskNumber || 21;
    const targetRoundNum = comparisonData?.toTask?.round_number || 1;

    setBulkResolving(true);
    try {
      const token = localStorage.getItem('htsk_session_token');
      const res = await fetch('/api/daily-task/resolve-devices-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Role': currentUserRole
        },
        body: JSON.stringify({
          task_number: targetTaskNum,
          round_number: targetRoundNum,
          device_tags: tagsToMark,
          action: 'returned',
          admin_user: currentUserName || 'Shanaka'
        })
      });
      const data = await res.json();
      if (data.success) {
        await runTaskComparison(compareFromKey, compareToKey, false);
        fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
        refreshRecords();
      }
    } catch (err) {
      console.error('Error bulk marking devices returned:', err);
    } finally {
      setBulkResolving(false);
    }
  };

  // Delete record directly from Dashboard table (syncs both device_records and daily_task_rounds)
  const handleDeleteDashboardRow = async (r, index) => {
    if (!canDelete) return;
    const devLabel = (r.taking_device || r.return_device || r.name || `Row #${index + 1}`).replace(/[:;,]+$/g, '').trim();
    const taskNum = r.task_number || comparisonData?.toTask?.task_number || selectedTaskNumber || kpis.activeTaskNumber || 21;
    const roundNum = r.round_number || comparisonData?.toTask?.round_number || 1;

    if (!window.confirm(`Are you sure you want to delete "${devLabel}" from Task ${taskNum}.${roundNum}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('htsk_session_token');
      const res = await fetch('/api/daily-task/delete-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Role': currentUserRole
        },
        body: JSON.stringify({
          id: r.id,
          task_number: taskNum,
          task_date: r.task_date || selectedDateStr,
          round_number: roundNum,
          device_tag: r.taking_device || '',
          emp_name: r.name || '',
          admin_user: currentUserName || 'Shanaka'
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
        await runTaskComparison(compareFromKey, compareToKey, false);
        refreshRecords();
      }
    } catch (err) {
      console.error('Error deleting dashboard record:', err);
    }
  };

  // Delete entire active Task / Round table from Dashboard
  const handleConfirmDeleteDashboardTable = async () => {
    if (!canDelete) return;
    const targetTaskNum = comparisonData?.toTask?.task_number || selectedTaskNumber || kpis.activeTaskNumber || 21;
    const targetRoundNum = comparisonData?.toTask?.round_number || 1;

    setDeletingTable(true);
    try {
      const token = localStorage.getItem('htsk_session_token');
      const res = await fetch('/api/daily-task/delete-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Role': currentUserRole
        },
        body: JSON.stringify({
          task_number: targetTaskNum,
          round_number: targetRoundNum,
          admin_user: currentUserName || 'Shanaka'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowDeleteTableModal(false);
        await fetchComparisonOptions(true);
        await fetchDashboardData(null, '', false);
        refreshRecords();
      } else {
        alert(data.error || 'Failed to delete task table.');
      }
    } catch (err) {
      console.error('Error deleting full task table from dashboard:', err);
    } finally {
      setDeletingTable(false);
    }
  };

  // When parent triggers refresh (after modal save/edit), re-fetch
  useEffect(() => {
    if (parentRecords && parentRecords.length > 0 && selectedTaskNumber === null && !isViewAllDays) {
      setRecords(parentRecords);
    }
  }, [parentRecords]);

  useEffect(() => {
    const handleRecordsChanged = () => {
      fetchDashboardData(selectedTaskNumber, selectedDateStr, isViewAllDays);
      runTaskComparison(compareFromKey, compareToKey, false);
    };
    window.addEventListener('htsk-records-changed', handleRecordsChanged);
    return () => window.removeEventListener('htsk-records-changed', handleRecordsChanged);
  }, [selectedTaskNumber, selectedDateStr, isViewAllDays, compareFromKey, compareToKey]);

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
    window.addEventListener('htsk-animation-updated', fetchAnimationStatus);
    return () => window.removeEventListener('htsk-animation-updated', fetchAnimationStatus);
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

  // Helper to sync comparison dropdowns when user selects a task day on the calendar
  const syncComparisonForTaskNumber = (taskNum) => {
    if (!taskNum || taskNum === 'all' || taskOptions.length === 0) return;
    // Find latest round for this taskNum
    const matchingOpts = taskOptions.filter(o => o.task_number === Number(taskNum));
    if (matchingOpts.length > 0) {
      const targetOpt = matchingOpts[matchingOpts.length - 1];
      const targetIdx = taskOptions.findIndex(o => o.key === targetOpt.key);
      const prevOpt = targetIdx > 0 ? taskOptions[targetIdx - 1] : targetOpt;
      setCompareFromKey(prevOpt.key);
      setCompareToKey(targetOpt.key);
      runTaskComparison(prevOpt.key, targetOpt.key, false);
    }
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
    syncComparisonForTaskNumber(taskNum);
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
    syncComparisonForTaskNumber(task.task_number);
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

  // Determine source records for table (use annotated comparison records when active)
  const sourceRecordsForTable = useMemo(() => {
    if (isComparing && comparisonData && !isViewAllDays) {
      if (compareCategoryFilter === 'not_available') {
        return comparisonData.droppedRecords || [];
      }
      return comparisonData.records || records;
    }
    return records;
  }, [isComparing, comparisonData, compareCategoryFilter, records, isViewAllDays]);

  // Filter records
  const filteredRecords = sourceRecordsForTable
    .map((r, idx) => ({ ...r, _originalIndex: idx }))
    .filter(r => {
      const term = searchTerm.trim().toLowerCase();
      const normTerm = term.replace(/\s+/g, '');
      const nameStr = (r.name || '').toLowerCase();
      const returnDevStr = (r.return_device || '').toLowerCase();
      const returnDevNorm = returnDevStr.replace(/\s+/g, '');
      const takingDevStr = (r.taking_device || '').toLowerCase();
      const takingDevNorm = takingDevStr.replace(/\s+/g, '');
      const handoverStr = (r.handover_to || '').toLowerCase();
      const groupStr = (r.group_name || '').toLowerCase();
      const recNumStr = String(r._originalIndex + 1);

      const matchesSearch =
        term === '' ||
        nameStr.includes(term) ||
        returnDevStr.includes(term) ||
        (normTerm && returnDevNorm.includes(normTerm)) ||
        takingDevStr.includes(term) ||
        (normTerm && takingDevNorm.includes(normTerm)) ||
        handoverStr.includes(term) ||
        groupStr.includes(term) ||
        recNumStr === term;

      const matchesGroup = selectedGroup === 'All Groups' || selectedGroup === 'all' ||
        (selectedGroup === 'No Group' && (!r.group_name || r.group_name.trim() === '')) ||
        r.group_name === selectedGroup;
      const matchesShift = selectedShift === 'All Shift' || selectedShift === 'all' || r.shift === selectedShift;
      const matchesStatus =
        selectedStatus === 'All Status' ||
        selectedStatus === 'all' ||
        (r.sign || '').toLowerCase() === selectedStatus.toLowerCase();

      // Comparison category filter
      let matchesCompareCategory = true;
      if (isComparing && comparisonData && compareCategoryFilter !== 'all') {
        if (compareCategoryFilter === 'newly_added') {
          matchesCompareCategory = Boolean(r.is_newly_added);
        } else if (compareCategoryFilter === 'previously_available') {
          matchesCompareCategory = Boolean(r.is_previously_available);
        } else if (compareCategoryFilter === 'not_available') {
          matchesCompareCategory = Boolean(r.is_dropped_from_prev);
        } else if (compareCategoryFilter === 'returned') {
          matchesCompareCategory = Boolean(r.return_device) || r.comparison_status === 'returned';
        } else if (compareCategoryFilter === 'missing') {
          matchesCompareCategory = (r.sign || '').toLowerCase() === 'missing' || r.comparison_status === 'missing';
        } else if (compareCategoryFilter === 'not_in_system') {
          matchesCompareCategory = Boolean(r.is_not_in_system);
        }
      }

      return matchesSearch && matchesGroup && matchesShift && matchesStatus && matchesCompareCategory;
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
          className={canEdit ? 'clickable-kpi-card' : ''}
          onClick={() => canEdit && setActiveTab && setActiveTab('update')}
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '2px solid #ef4444',
            padding: '22px 24px',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.06)',
            cursor: canEdit ? 'pointer' : 'default'
          }}
          title={canEdit ? 'Click to open update section' : 'Need an Update count'}
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

      {/* ===================================================================== */}
      {/* SELECT TASK COMPARISON BAR (Matching User Image 1: Clean & Minimal)   */}
      {/* ===================================================================== */}
      <div style={{
        marginTop: '22px',
        marginBottom: '16px',
        padding: '2px'
      }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '10px'
        }}>
          Select task
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Previous / Base Task Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={compareFromKey}
              onChange={e => setCompareFromKey(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundColor: '#e5e7eb',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '9px 42px 9px 18px',
                fontSize: '14.5px',
                fontWeight: 600,
                color: '#111827',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '160px'
              }}
            >
              {taskOptions.map(opt => (
                <option key={`from-${opt.key}`} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              color="#374151"
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          <span style={{ fontSize: '17px', fontWeight: 700, color: '#374151', padding: '0 2px' }}>
            =
          </span>

          {/* Target / Current Task Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={compareToKey}
              onChange={e => setCompareToKey(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundColor: '#e5e7eb',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '9px 42px 9px 18px',
                fontSize: '14.5px',
                fontWeight: 600,
                color: '#111827',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '160px'
              }}
            >
              {taskOptions.map(opt => (
                <option key={`to-${opt.key}`} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              color="#374151"
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Lime Green Compare Button matching Image 1 */}
          <button
            type="button"
            onClick={() => runTaskComparison(compareFromKey, compareToKey, true)}
            disabled={comparisonLoading}
            className="btn-primary-lime"
            style={{
              marginLeft: '10px',
              padding: '9px 22px',
              fontSize: '13px',
              fontWeight: 800,
              borderRadius: '8px'
            }}
          >
            {comparisonLoading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN TABLE CARD CONTAINER (Clean HTSK Theme matching Image 1 & 2)     */}
      {/* ===================================================================== */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '20px',
        padding: '22px 24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Card Toolbar: Date Pill & Search on Left, Filters & Add on Right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '18px'
        }}>
          {/* Left: Date Pill + Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            <div style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#4b5563',
              whiteSpace: 'nowrap'
            }}>
              {isViewAllDays ? 'All Dates' : (formatDayString(selectedDay) || '21st November')}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f3f4f6',
              border: searchTerm ? '1.5px solid #84cc16' : '1px solid #e5e7eb',
              borderRadius: '9999px',
              padding: '7px 16px',
              width: '100%',
              maxWidth: '300px',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease'
            }}>
              <Search size={15} color={searchTerm ? '#65a30d' : '#9ca3af'} />
              <input
                type="text"
                placeholder="Search in table (device, name...)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#111827',
                  width: '100%'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
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

          {/* Right: Filters and Add button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Groups dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 34px 8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
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
              <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Shift dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 34px 8px 16px',
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
              <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Status dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 34px 8px 16px',
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
                <option value="Missing">Missing</option>
              </select>
              <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Green Add button */}
            {canEdit && (
              <button
                onClick={() => onOpenAddModal({
                  task_number: comparisonData?.toTask?.task_number || selectedTaskNumber || kpis.activeTaskNumber,
                  task_date: comparisonData?.toTask?.task_date || selectedDateStr || kpis.activeTaskDate,
                  round_number: comparisonData?.toTask?.round_number || 1,
                  check_time: comparisonData?.toTask?.check_time || '7.30 A.M.'
                })}
                className="btn-primary-lime"
              >
                Add
              </button>
            )}

            {/* Delete Full Task Table button */}
            {canDelete && !isViewAllDays && sourceRecordsForTable.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteTableModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                title="Delete entire active task table"
              >
                <Trash2 size={14} color="#dc2626" />
                <span>Delete Table</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="responsive-table-wrapper" style={{ maxHeight: '540px', overflowY: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
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
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 700, color: '#111827', minWidth: '200px', borderRight: '1px solid #e5e7eb' }}>
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
                    {loading || comparisonLoading
                      ? 'Loading records...'
                      : searchTerm
                      ? `No matching device or employee found for "${searchTerm}" in this table.`
                      : `No records found.`}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, index) => {
                  const isDone = (r.sign || '').toLowerCase() === 'done';
                  const isMissing = (r.sign || '').toLowerCase() === 'missing';
                  const isNewInRound = r.is_new_in_round === 1 || r.is_newly_added;
                  const displayIndex = r._originalIndex !== undefined ? r._originalIndex : index;

                  return (
                    <tr
                      key={r.id || `row-${displayIndex}`}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? '#ecfbfb' : '#ffffff',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Rec. No. */}
                      <td style={{ padding: '16px 14px', fontSize: '13.5px', fontWeight: 700, color: '#111827', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        {displayIndex + 1}.
                      </td>

                      {/* EMP. Name */}
                      <td style={{ padding: '16px 16px', fontSize: '13.5px', fontWeight: 600, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                        {r.name}
                      </td>

                      {/* Shift */}
                      <td style={{ padding: '16px 14px', fontSize: '13.5px', color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <span>{r.shift || 'Day'}</span>
                          <ChevronDown size={13} color="#6b7280" />
                        </div>
                      </td>

                      {/* Group */}
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

                      {/* Device Details (Clean Return & Taking pills matching Image 1) */}
                      <td style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {r.return_device ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                              <span style={{ color: '#6b7280', width: '52px' }}>Return:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {r.return_device.split(/[,+&/]/).map(d => d.trim()).filter(Boolean).map((dev, i) => (
                                  <span key={i} style={{
                                    backgroundColor: '#ffffff',
                                    color: '#374151',
                                    fontWeight: 600,
                                    border: '1px solid #e5e7eb',
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
                                {r.taking_device.split(/[,+&/]/).map(d => d.trim()).filter(Boolean).map((dev, i) => (
                                  <span key={i} style={{
                                    backgroundColor: '#ffffff',
                                    color: '#1f2937',
                                    border: '1px solid #e5e7eb',
                                    fontWeight: 600,
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
                                    + NEW TAKING
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
                          color: isMissing ? '#dc2626' : (isDone ? '#16a34a' : '#ea580c')
                        }}>
                          {r.sign || 'Done'}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {canEdit && (
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
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteDashboardRow(r, index)}
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

        {/* ===================================================================== */}
        {/* RED ATTENTION REQUIRED BANNER BELOW TABLE (With Mark All & Minimize)  */}
        {/* ===================================================================== */}
        {isComparing && comparisonData && comparisonData.notAvailable && comparisonData.notAvailable.length > 0 && (
          <div style={{
            backgroundColor: '#fff5f5',
            border: '1.5px solid #f87171',
            borderRadius: '14px',
            padding: '14px 20px',
            marginTop: '18px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: isAttentionMinimized ? '0px' : '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#991b1b' }}>
                  Attention Required: {comparisonData.notAvailable.length} Devices Not In List ({comparisonData.toTask.label})
                </span>
                <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 500 }}>
                  — Active in previous check but missing in this check:
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {canEdit && (
                  <button
                    type="button"
                    disabled={bulkResolving || comparisonData.notAvailable.every(d => d.resolution?.status === 'returned')}
                    onClick={handleMarkAllReturned}
                    style={{
                      backgroundColor: comparisonData.notAvailable.every(d => d.resolution?.status === 'returned') ? '#15803d' : '#f0fdf4',
                      color: comparisonData.notAvailable.every(d => d.resolution?.status === 'returned') ? '#ffffff' : '#15803d',
                      border: '1.5px solid #86efac',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '6px 14px',
                      borderRadius: '8px',
                      cursor: (bulkResolving || comparisonData.notAvailable.every(d => d.resolution?.status === 'returned')) ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Mark all devices in this list as Returned to office"
                  >
                    <CheckCircle2 size={14} />
                    <span>
                      {bulkResolving
                        ? 'Marking All Returned...'
                        : comparisonData.notAvailable.every(d => d.resolution?.status === 'returned')
                        ? '✓ All Marked Returned'
                        : '✓ Mark All Returned'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAttentionMinimized(prev => !prev)}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title={isAttentionMinimized ? 'Expand device verification list' : 'Minimize device verification list'}
                >
                  <span>{isAttentionMinimized ? `Expand (${comparisonData.notAvailable.length})` : 'Minimize'}</span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: isAttentionMinimized ? 'rotate(0deg)' : 'rotate(180deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </button>
              </div>
            </div>

            {!isAttentionMinimized && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
                gap: '10px'
              }}>
                {comparisonData.notAvailable.map((item, dIdx) => {
                  const resolution = item.resolution || null;
                  return (
                    <div
                      key={dIdx}
                      style={{
                        backgroundColor: '#ffffff',
                        border: resolution
                          ? (resolution.status === 'returned' ? '1.5px solid #86efac' : '1.5px solid #fca5a5')
                          : '1.5px solid #fecaca',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#111827' }}>
                          {item.device_tag}
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                          {resolution ? (
                            resolution.status === 'returned' ? (
                              <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Returned</span>
                            ) : (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>✕ Missing</span>
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
                            onClick={() => handleResolveComparedDevice(item.device_tag, 'returned')}
                            style={{
                              backgroundColor: resolution?.status === 'returned' ? '#15803d' : '#f0fdf4',
                              color: resolution?.status === 'returned' ? '#ffffff' : '#15803d',
                              border: '1px solid #86efac',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            ✓ Returned
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveComparedDevice(item.device_tag, 'missing')}
                            style={{
                              backgroundColor: resolution?.status === 'missing' ? '#dc2626' : '#fef2f2',
                              color: resolution?.status === 'missing' ? '#ffffff' : '#dc2626',
                              border: '1px solid #fca5a5',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            ✕ Missing
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>View Only</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* PROFESSIONAL THEME-MATCHED TASK COMPARISON POPUP MODAL                */}
      {/* ===================================================================== */}
      {showComparisonPopup && comparisonData && (
        <div
          className="modal-overlay"
          onClick={() => setShowComparisonPopup(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              maxWidth: '860px',
              maxHeight: '86vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header matching EditRecordModal & System Theme */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f9fafb'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ArrowRightLeft size={18} color="#65a30d" />
                  <span>Task Comparison: {comparisonData.fromTask.label} vs {comparisonData.toTask.label}</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                  Comparing {comparisonData.summary.fromTotal} active mobile phones in {comparisonData.fromTask.label} with {comparisonData.summary.toTotal} mobile phones in {comparisonData.toTask.label}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowComparisonPopup(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* 4 Theme-Matched Summary Cards inside Popup (Matching Dashboard 4-Card Palette) */}
            <div style={{
              padding: '18px 24px 12px 24px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '12px' }}>
                {/* Card 1: Previously Available */}
                <div
                  onClick={() => setPopupActiveTab('previously_available')}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: popupActiveTab === 'previously_available' ? '2px solid #06b6d4' : '1.5px solid #e5e7eb',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563' }}>Previously Available</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#06b6d4', lineHeight: 1.2, margin: '4px 0' }}>
                    {comparisonData.summary.previouslyAvailableCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Active in both tasks
                  </div>
                </div>

                {/* Card 2: Newly Added */}
                <div
                  onClick={() => setPopupActiveTab('newly_added')}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: popupActiveTab === 'newly_added' ? '2px solid #84cc16' : '1.5px solid #e5e7eb',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563' }}>Newly Added</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#84cc16', lineHeight: 1.2, margin: '4px 0' }}>
                    +{comparisonData.summary.newlyAddedCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    New in {comparisonData.toTask.label}
                  </div>
                </div>

                {/* Card 3: Not Available / Missing from List */}
                <div
                  onClick={() => setPopupActiveTab('not_available')}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: popupActiveTab === 'not_available' ? '2px solid #ef4444' : '1.5px solid #e5e7eb',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563' }}>Not Available</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', lineHeight: 1.2, margin: '4px 0' }}>
                    {comparisonData.summary.notAvailableCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Not in {comparisonData.toTask.label} list
                  </div>
                </div>

                {/* Card 4: Names Not in System */}
                <div
                  onClick={() => setPopupActiveTab('not_in_system')}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: popupActiveTab === 'not_in_system' ? '2px solid #eab308' : '1.5px solid #e5e7eb',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563' }}>Not in System</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#eab308', lineHeight: 1.2, margin: '4px 0' }}>
                    {comparisonData.summary.notInSystemCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Unregistered device names
                  </div>
                </div>
              </div>

              {/* Clean Filter Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                {[
                  { id: 'overview', label: 'All Summary' },
                  { id: 'not_available', label: `Not Available (${comparisonData.summary.notAvailableCount})` },
                  { id: 'newly_added', label: `Newly Added (${comparisonData.summary.newlyAddedCount})` },
                  { id: 'previously_available', label: `Previously Available (${comparisonData.summary.previouslyAvailableCount})` },
                  { id: 'not_in_system', label: `Not in System (${comparisonData.summary.notInSystemCount})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPopupActiveTab(tab.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: popupActiveTab === tab.id ? '1.5px solid #84cc16' : '1px solid #e5e7eb',
                      backgroundColor: popupActiveTab === tab.id ? '#f7fee7' : '#f9fafb',
                      color: popupActiveTab === tab.id ? '#365314' : '#4b5563'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Not Available (Attention Required) */}
              {(popupActiveTab === 'overview' || popupActiveTab === 'not_available') && (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827', display: 'block' }}>
                        Not Available in {comparisonData.toTask.label} ({comparisonData.notAvailable.length})
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Were active in {comparisonData.fromTask.label} — verify return or mark missing
                      </span>
                    </div>
                    {canEdit && comparisonData.notAvailable.length > 0 && (
                      <button
                        type="button"
                        disabled={bulkResolving || comparisonData.notAvailable.every(d => d.resolution?.status === 'returned')}
                        onClick={handleMarkAllReturned}
                        style={{
                          backgroundColor: comparisonData.notAvailable.every(d => d.resolution?.status === 'returned') ? '#15803d' : '#f0fdf4',
                          color: comparisonData.notAvailable.every(d => d.resolution?.status === 'returned') ? '#ffffff' : '#15803d',
                          border: '1.5px solid #86efac',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '6px 14px',
                          borderRadius: '8px',
                          cursor: (bulkResolving || comparisonData.notAvailable.every(d => d.resolution?.status === 'returned')) ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>
                          {bulkResolving
                            ? 'Marking All...'
                            : comparisonData.notAvailable.every(d => d.resolution?.status === 'returned')
                            ? '✓ All Marked Returned'
                            : '✓ Mark All Returned'}
                        </span>
                      </button>
                    )}
                  </div>
                  {comparisonData.notAvailable.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>No missing devices from {comparisonData.fromTask.label}.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))', gap: '8px' }}>
                      {comparisonData.notAvailable.map((item, idx) => {
                        const res = item.resolution;
                        return (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{item.device_tag}</div>
                              <div style={{ fontSize: '11px', color: res?.status === 'returned' ? '#15803d' : (res?.status === 'missing' ? '#dc2626' : '#6b7280'), fontWeight: 600 }}>
                                {res?.status === 'returned' ? 'Returned' : (res?.status === 'missing' ? 'Missing' : `EMP: ${item.previous_emp_name}`)}
                              </div>
                            </div>
                            {canEdit && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleResolveComparedDevice(item.device_tag, 'returned')}
                                  style={{
                                    backgroundColor: res?.status === 'returned' ? '#15803d' : '#ffffff',
                                    color: res?.status === 'returned' ? '#ffffff' : '#15803d',
                                    border: '1px solid #86efac',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Returned
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolveComparedDevice(item.device_tag, 'missing')}
                                  style={{
                                    backgroundColor: res?.status === 'missing' ? '#dc2626' : '#ffffff',
                                    color: res?.status === 'missing' ? '#ffffff' : '#dc2626',
                                    border: '1px solid #fca5a5',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Missing
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Newly Added */}
              {(popupActiveTab === 'overview' || popupActiveTab === 'newly_added') && (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                      Newly Added in {comparisonData.toTask.label} ({comparisonData.newlyAdded.length})
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Newly taken devices not present in {comparisonData.fromTask.label}
                    </span>
                  </div>
                  {comparisonData.newlyAdded.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>No newly added devices.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {comparisonData.newlyAdded.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: '#f7fee7',
                            border: '1px solid #bef264',
                            color: '#365314',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            padding: '5px 12px',
                            borderRadius: '8px'
                          }}
                        >
                          {item.device_tag} <span style={{ color: '#6b7280', fontWeight: 500, fontSize: '11.5px' }}>({item.emp_name})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Previously Available */}
              {(popupActiveTab === 'overview' || popupActiveTab === 'previously_available') && (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                      Previously Available ({comparisonData.previouslyAvailable.length})
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Devices active in both {comparisonData.fromTask.label} and {comparisonData.toTask.label}
                    </span>
                  </div>
                  {comparisonData.previouslyAvailable.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>No retained devices.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {comparisonData.previouslyAvailable.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            color: '#111827',
                            fontWeight: 600,
                            fontSize: '12.5px',
                            padding: '5px 12px',
                            borderRadius: '8px'
                          }}
                        >
                          {item.device_tag} <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '11.5px' }}>({item.emp_name})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Names Not Available in System */}
              {(popupActiveTab === 'overview' || popupActiveTab === 'not_in_system') && (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                      Names Not Available in System ({comparisonData.notInSystem.length})
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Device names not found in the 241 master inventory list
                    </span>
                  </div>
                  {comparisonData.notInSystem.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                      All device names are registered in our system inventory.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {comparisonData.notInSystem.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: '#fefce8',
                            border: '1px solid #fde047',
                            color: '#854d0e',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            padding: '5px 12px',
                            borderRadius: '8px'
                          }}
                        >
                          {item.device_tag} <span style={{ color: '#6b7280', fontWeight: 500, fontSize: '11.5px' }}>(EMP: {item.emp_name} • {item.task_label})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <button
                type="button"
                onClick={() => setShowComparisonPopup(false)}
                className="btn-primary-lime"
                style={{
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 800,
                  borderRadius: '10px'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE FULL TASK TABLE CONFIRMATION POPUP MODAL ON DASHBOARD          */}
      {/* ===================================================================== */}
      {showDeleteTableModal && (
        <div
          className="modal-overlay"
          onClick={() => !deletingTable && setShowDeleteTableModal(false)}
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
                    Delete {comparisonData?.toTask?.label || `Task ${selectedTaskNumber || kpis.activeTaskNumber}.1`} Table
                  </h3>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {formatDayString(selectedDay) || 'Active Task Table'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={deletingTable}
                onClick={() => setShowDeleteTableModal(false)}
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
                <strong style={{ color: '#111827' }}>
                  {comparisonData?.toTask?.label || `Task ${selectedTaskNumber || kpis.activeTaskNumber}.1`}
                </strong>{' '}
                table ({sourceRecordsForTable.length} mobile records)?
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
                {(comparisonData?.toTask?.round_number || 1) > 1 ? (
                  <span>
                    Deleting <strong>{comparisonData?.toTask?.label}</strong> will remove this round table and restore Task {comparisonData?.toTask?.task_number} back to its previous round.
                  </span>
                ) : (
                  <span>
                    Deleting this task table will clear all records for this table so you can re-enter or upload the device list to the correct task.
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
                disabled={deletingTable}
                onClick={() => setShowDeleteTableModal(false)}
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
                disabled={deletingTable}
                onClick={handleConfirmDeleteDashboardTable}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: deletingTable ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} />
                <span>{deletingTable ? 'Deleting Table...' : `Delete ${comparisonData?.toTask?.label || 'Task Table'}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
