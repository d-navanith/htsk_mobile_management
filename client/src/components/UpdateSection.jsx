import React, { useState, useRef, useEffect } from 'react';
import UserProfileMenu from './UserProfileMenu';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Trash2,
  File,
  Smartphone,
  ListPlus,
  ArrowRight,
  Eye,
  RefreshCw,
  Copy,
  Plus,
  Sparkles
} from 'lucide-react';

const SAMPLE_DEVICE_LIST = `New 68
Pn 27
New 37
New 44
Pn 118
Pn 19
New 75
Pn 13
Pn 3
Pn 33
New 42
New 63
New 29
Cass 02
Pn 94
Pn 112
Pn 20
New 15
New 26
New 20
Pn 37
Pn 38
Pn 22
New 72
Pn 41
New 71
Pn 78
New 51
Pn 59
New 74
New 76
New 2
Pn 75
Pn 74
Pn 26
New 14
Pn 108
Pn 34
Pn 62
Pn 51
Cass 30
New 76
New 74
Pn 116
New 53
New 46
Cass 7
Pn 70
Pn 34
Pn 4
Pn 110
Pn 112
Pn 72
New 49
Pn 104
Pn 35
New 28
New 5
Cass 23
Pn 61
Pn 101
Pn 47
Pn 68
New 67
Pn 102
Cass 27
New 58
Pn 71
New 65`;

export default function UpdateSection({
  onImportSuccess = () => {},
  onDownloadTemplate = () => {},
  setActiveTab = () => {},
  groups = [],
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  onLogout = () => {}
}) {
  // Tab mode: 'quick' (Daily Mobile List) vs 'sheet' (File Dropzone)
  const [activeMode, setActiveMode] = useState('quick');

  const getTodayDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper to format check time matching mockup: e.g. '8.30 A.M.', '02.00 P.M.'
  const formatCheckTime = (d = new Date()) => {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}.${minutes} ${ampm}`;
  };

  // Quick List Form State
  const [rawText, setRawText] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [padZero, setPadZero] = useState(true);
  const [targetTaskDate, setTargetTaskDate] = useState(() => getTodayDateStr());
  const [targetTaskNumber, setTargetTaskNumber] = useState(() => new Date().getDate());
  const [defaultShift, setDefaultShift] = useState('Day');
  const [defaultGroup, setDefaultGroup] = useState('');
  const [defaultIssuedAt, setDefaultIssuedAt] = useState('7.30 A.M.');
  const [replaceMode, setReplaceMode] = useState(true);
  const [checkTime, setCheckTime] = useState(() => formatCheckTime(new Date()));

  // Synchronize Task Date <-> Target Daily Task #
  const handleTaskDateChange = (newDateStr) => {
    setTargetTaskDate(newDateStr);
    if (newDateStr) {
      const parts = newDateStr.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          setTargetTaskNumber(dayNum);
        }
      }
    }
  };

  const handleTaskNumberChange = (newNum) => {
    const validNum = parseInt(newNum, 10);
    setTargetTaskNumber(validNum || 1);
    if (targetTaskDate && validNum >= 1 && validNum <= 31) {
      const parts = targetTaskDate.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = String(validNum).padStart(2, '0');
        setTargetTaskDate(`${year}-${month}-${day}`);
      }
    }
  };

  // File Upload State (Mode: sheet)
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const textFileInputRef = useRef(null);

  // Preview & Processing State
  const [previewRows, setPreviewRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState(null);

  // Intra-Day Rounds & Diff Comparison State
  const [taskRounds, setTaskRounds] = useState([]);
  const [latestRound, setLatestRound] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all', 'new', 'retained'

  // Fetch rounds whenever targetTaskNumber or targetTaskDate changes
  const fetchTaskRounds = async (num, dateStr) => {
    try {
      const res = await fetch(`/api/daily-task/rounds?task_number=${num || 19}&task_date=${dateStr || ''}`);
      const data = await res.json();
      if (data.success) {
        setTaskRounds(data.data || []);
        const latest = data.latestRound || (data.data && data.data[data.data.length - 1]) || null;
        setLatestRound(latest);
      }
    } catch (e) {
      console.error('Failed to fetch task rounds:', e);
    }
  };

  useEffect(() => {
    fetchTaskRounds(targetTaskNumber, targetTaskDate);
  }, [targetTaskNumber, targetTaskDate]);

  // Generate Preview from Quick Text List & Live Compare with Previous Round
  const handleGenerateQuickPreview = async () => {
    setErrorMessage('');
    setSuccessBanner(null);

    const trimmed = rawText.trim();
    if (!trimmed) {
      setErrorMessage('Please enter or paste at least one mobile device tag.');
      return;
    }

    const lines = trimmed
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const rows = [];
    let currentNum = parseInt(startNumber, 10) || 1;

    for (const line of lines) {
      const items = line.includes(',')
        ? line.split(',').map(s => s.trim()).filter(Boolean)
        : [line];

      for (const item of items) {
        if (!item) continue;
        if (/^(rec|emp|name|shift|group|device|phone|serial|model|list|taking)/i.test(item) && items.length === 1 && rows.length === 0) {
          continue;
        }

        const formattedEmpName = padZero && currentNum < 100
          ? String(currentNum).padStart(2, '0')
          : String(currentNum);

        rows.push({
          id: `preview-${rows.length + 1}`,
          emp_number: currentNum,
          name: formattedEmpName,
          shift: defaultShift || 'Day',
          group: defaultGroup || '',
          issued_at: defaultIssuedAt || '7.30 A.M.',
          return_time: '',
          return_device: '',
          taking_device: item,
          handover_to: '',
          sign: 'Done',
          isValid: true,
          isNewInRound: false,
          roundNumber: 1
        });

        currentNum++;
      }
    }

    if (rows.length === 0) {
      setErrorMessage('No valid device tags found in the provided text.');
      return;
    }

    // Call compare-rounds API to get real diff against previous round
    try {
      const compRes = await fetch('/api/daily-task/compare-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_number: targetTaskNumber,
          task_date: targetTaskDate,
          device_list: rows.map(r => r.taking_device)
        })
      });
      const compJson = await compRes.json();
      if (compJson.success && compJson.data) {
        const comp = compJson.data;
        setComparisonData(comp);

        const norm = s => {
          if (!s) return '';
          let str = String(s).trim().toLowerCase();
          const m = str.match(/^([a-z]+)\s*0*(\d+)$/i);
          if (m) return `${m[1]}${parseInt(m[2], 10)}`;
          return str.replace(/\s+/g, '');
        };

        const addedNormSet = new Set((comp.addedDevices || []).map(norm));
        rows.forEach(r => {
          const isNew = addedNormSet.has(norm(r.taking_device));
          r.isNewInRound = isNew;
          r.roundNumber = isNew ? comp.nextRoundNumber : (comp.previousRoundNumber || 1);
        });
      }
    } catch (e) {
      console.error('Error fetching comparison:', e);
    }

    setPreviewRows(rows);
  };

  // Quick edit of preview cell
  const handleUpdatePreviewRow = (idx, field, value) => {
    setPreviewRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Delete row from preview
  const handleDeletePreviewRow = idx => {
    setPreviewRows(prev => prev.filter((_, i) => i !== idx));
  };

  // Re-number EMP. Name in preview
  const handleRenumberPreview = (startFrom = 1) => {
    let num = parseInt(startFrom, 10) || 1;
    setPreviewRows(prev =>
      prev.map(r => {
        const formatted = padZero && num < 100 ? String(num).padStart(2, '0') : String(num);
        const updated = { ...r, emp_number: num, name: formatted };
        num++;
        return updated;
      })
    );
  };

  // Upload handler for sheet / text file
  const handleUploadFile = async file => {
    if (!file) return;
    setErrorMessage('');
    setSuccessBanner(null);
    setSelectedFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/parse', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse file');
      }

      setPreviewRows(result.rows || []);
    } catch (err) {
      console.error('File parse error:', err);
      setErrorMessage(err.message || 'Error processing uploaded file.');
      setPreviewRows([]);
    } finally {
      setUploading(false);
    }
  };

  // Read .txt or .csv directly into textarea
  const handleLoadTextFile = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target.result;
      setRawText(content);
    };
    reader.readAsText(file);
  };

  const handleDragOver = e => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = e => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (previewRows.length === 0) {
      setErrorMessage('Please generate or preview records first before confirming.');
      return;
    }

    setConfirming(true);
    setErrorMessage('');

    try {
      if (activeMode === 'quick') {
        const response = await fetch('/api/upload/quick-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: previewRows,
            task_number: targetTaskNumber,
            task_date: targetTaskDate,
            round_number: comparisonData ? comparisonData.nextRoundNumber : undefined,
            check_time: checkTime,
            raw_list: rawText,
            replaceMode
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to import quick list');
        }

        const roundInfo = result.roundResult;
        setSuccessBanner({
          title: `Successfully Saved ${roundInfo ? roundInfo.round_name : 'Daily Task'} (${result.insertedCount || previewRows.length} Active Mobiles)!`,
          message: roundInfo && roundInfo.added_count > 0
            ? `Recorded ${roundInfo.total_devices} active devices for Task ${targetTaskNumber}. Highlighted ${roundInfo.added_count} newly taken devices (${roundInfo.added_devices.slice(0, 5).join(', ')}${roundInfo.added_devices.length > 5 ? '...' : ''}).`
            : `All ${result.insertedCount} devices recorded for Task ${targetTaskNumber} (${targetTaskDate}).`,
          taskNumber: targetTaskNumber,
          count: result.insertedCount
        });
        setPreviewRows([]);
        setRawText('');
        setComparisonData(null);
        fetchTaskRounds(targetTaskNumber, targetTaskDate);
      } else {
        const response = await fetch('/api/upload/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: selectedFile ? selectedFile.name : 'uploaded_sheet.xlsx',
            rows: previewRows,
            task_number: targetTaskNumber,
            task_date: targetTaskDate,
            replaceMode
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to import records');
        }

        setSuccessBanner({
          title: `Successfully imported ${result.insertedCount || previewRows.length} records!`,
          message: `The records have been confirmed and added to your mobile management database for Task ${targetTaskNumber} (${targetTaskDate}).`,
          taskNumber: targetTaskNumber,
          count: result.insertedCount
        });
        setPreviewRows([]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      console.error('Confirm import error:', err);
      setErrorMessage(err.message || 'Failed to confirm and import.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="responsive-section-container">
      {/* Header matching system theme */}
      <div className="responsive-header">
        <div>
          <h1 className="system-h1">
            Mobile Management
          </h1>
          <p className="system-breadcrumb">
            <span>Workspace / Update</span>
            <span>•</span>
            <strong style={{ color: '#111827' }}>Bulk Active Devices &amp; Fast Sheet Upload</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Mode Switcher Tabs */}
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => { setActiveMode('quick'); setErrorMessage(''); }}
              style={{
                padding: '8px 18px',
                borderRadius: '9px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: activeMode === 'quick' ? '#ffffff' : 'transparent',
                color: activeMode === 'quick' ? '#111827' : '#6b7280',
                boxShadow: activeMode === 'quick' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Smartphone size={16} color={activeMode === 'quick' ? '#84cc16' : '#6b7280'} />
              <span>Quick Daily Mobile List</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMode('sheet'); setErrorMessage(''); }}
              style={{
                padding: '8px 18px',
                borderRadius: '9px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: activeMode === 'sheet' ? '#ffffff' : 'transparent',
                color: activeMode === 'sheet' ? '#111827' : '#6b7280',
                boxShadow: activeMode === 'sheet' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <FileSpreadsheet size={16} color={activeMode === 'sheet' ? '#2563eb' : '#6b7280'} />
              <span>Document / Sheet Upload</span>
            </button>
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
            onRefresh={() => window.location.reload()}
          />
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1.5px solid #84cc16',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(132, 204, 22, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <CheckCircle size={22} color="#15803d" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803d', marginBottom: '2px' }}>
                {successBanner.title}
              </div>
              <div style={{ fontSize: '13px', color: '#374151' }}>
                {successBanner.message}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('dailytask')}
              style={{
                backgroundColor: '#84cc16',
                color: '#000000',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>View in Daily Task</span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #d1d5db',
                color: '#1f2937',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              View Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '12px 18px',
          borderRadius: '12px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ==============================================================
          MODE A: QUICK DAILY ACTIVE MOBILES LIST (USER'S EXACT FEATURE)
          ============================================================== */}
      {activeMode === 'quick' && (
        <div style={{ marginBottom: '32px' }}>
          {/* Info Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 22px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Smartphone size={18} color="#84cc16" />
              <span>Daily Active Mobiles Entry</span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Paste your list of mobile devices (e.g. <code>New 68, Pn 27, New 37...</code>).
              Each phone is assigned as a <strong>Taking Device</strong>.
              The <strong>EMP. Name</strong> is automatically added as a sequential number (from <code>01</code>, <code>1</code> to infinity).
              You can review and edit every row in the <strong>Preview Section</strong> below before confirming.
            </p>
          </div>

          {/* Quick List Configuration Controls */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px'
          }}>
            {/* EMP. Name Start Number */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                EMP. Name Start Number
              </label>
              <input
                type="number"
                min="1"
                value={startNumber}
                onChange={e => setStartNumber(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Number added for first EMP</span>
            </div>

            {/* Number Format (01 vs 1) */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                EMP. Name Format
              </label>
              <select
                value={padZero ? 'padded' : 'plain'}
                onChange={e => setPadZero(e.target.value === 'padded')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="padded">Two Digits (01, 02, 03...)</option>
                <option value="plain">Plain Digits (1, 2, 3...)</option>
              </select>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Format shown in EMP. Name</span>
            </div>

            {/* Daily Task / Day Number */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Target Daily Task #
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={targetTaskNumber}
                onChange={e => handleTaskNumberChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#7c3aed',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Task Day (e.g. Task {targetTaskNumber})</span>
            </div>

            {/* Task Date */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Task Date
              </label>
              <input
                type="date"
                value={targetTaskDate}
                onChange={e => handleTaskDateChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8.5px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: '#84cc16', fontWeight: 600 }}>Syncs Task #{targetTaskNumber}</span>
            </div>

            {/* Shift */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Default Shift
              </label>
              <select
                value={defaultShift}
                onChange={e => setDefaultShift(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="Day">Day Shift</option>
                <option value="Night">Night Shift</option>
              </select>
            </div>

            {/* Group */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Default Group
              </label>
              <select
                value={defaultGroup}
                onChange={e => setDefaultGroup(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">(None / Empty)</option>
                {groups.map((g, idx) => {
                  const gName = typeof g === 'object' && g !== null ? (g.group_name || g.name || '') : String(g);
                  if (!gName) return null;
                  return <option key={idx} value={gName}>{gName}</option>;
                })}
              </select>
            </div>

            {/* Import Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Daily Task Action
              </label>
              <select
                value={replaceMode ? 'replace' : 'append'}
                onChange={e => setReplaceMode(e.target.value === 'replace')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: replaceMode ? '#0284c7' : '#15803d',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="replace">Set / Replace Task {targetTaskNumber} Active List</option>
                <option value="append">Append to Task {targetTaskNumber} List</option>
              </select>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                {replaceMode ? 'Clears previous day records and sets new' : 'Adds to current list'}
              </span>
            </div>

            {/* List Checked Time matching user mockup (e.g. 8.30 A.M., 02.00 P.M.) */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                List Checked Time
              </label>
              <input
                type="text"
                value={checkTime}
                onChange={e => setCheckTime(e.target.value)}
                placeholder="e.g. 8.30 A.M."
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
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Time checked (e.g. 8.30 A.M.)</span>
            </div>

            {/* Live Intra-day Round Tracking Status Indicator */}
            <div style={{
              gridColumn: '1 / -1',
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #84cc16',
              borderRadius: '12px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#166534' }}>
                  Intra-day Task #{targetTaskNumber} ({targetTaskDate}) Round Status
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                {taskRounds.length > 0 ? (
                  <>
                    <span style={{ color: '#4b5563' }}>
                      Current: <strong>Task {targetTaskNumber}.{latestRound?.round_number || 1} : Time {latestRound?.check_time || '8.30 A.M.'} ({latestRound?.total_devices || 0} Mobiles)</strong>
                    </span>
                    <span style={{ color: '#84cc16', fontWeight: 800 }}>➔</span>
                    <span style={{ backgroundColor: '#15803d', color: '#ffffff', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '11.5px' }}>
                      Next: Task {targetTaskNumber}.{(latestRound?.round_number || 1) + 1} : Time {checkTime}
                    </span>
                  </>
                ) : (
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                    Initial Round: Task {targetTaskNumber}.1 : Time {checkTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Textarea Input Section */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                Enter or Paste Mobile List (One tag per line):
              </label>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_DEVICE_LIST)}
                  style={{
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Loads your exact 69 mobile phones list"
                >
                  <Copy size={13} color="#84cc16" />
                  <span>Paste Sample List (69 Devices)</span>
                </button>

                <button
                  type="button"
                  onClick={() => textFileInputRef.current?.click()}
                  style={{
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UploadCloud size={13} />
                  <span>Load from .txt / .csv</span>
                </button>

                <input
                  ref={textFileInputRef}
                  type="file"
                  accept=".txt,.csv,.text"
                  onChange={handleLoadTextFile}
                  style={{ display: 'none' }}
                />

                {rawText && (
                  <button
                    type="button"
                    onClick={() => { setRawText(''); setPreviewRows([]); }}
                    style={{
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#b91c1c',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={10}
              placeholder="Paste mobile list here (e.g.):&#10;New 68&#10;Pn 27&#10;New 37&#10;New 44&#10;Pn 118&#10;Pn 19&#10;..."
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1.5px solid #d1d5db',
                fontSize: '14px',
                fontFamily: 'monospace',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'vertical',
                backgroundColor: '#fcfdfc'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {rawText ? `${rawText.split(/\r?\n/).filter(l => l.trim()).length} lines detected` : 'No items entered yet'}
              </div>

              <button
                type="button"
                onClick={handleGenerateQuickPreview}
                style={{
                  backgroundColor: '#84cc16',
                  color: '#000000',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '11px 26px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(132, 204, 22, 0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Eye size={17} />
                <span>Generate Preview Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODE B: DOCUMENT / SHEET UPLOAD (EXCEL, PDF, WORD, OCR)
          ============================================================== */}
      {activeMode === 'sheet' && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '14px' }}>
            Full Document / Spreadsheet Upload
          </h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: dragActive ? '#f0fdf4' : '#eef0f2',
              borderRadius: '18px',
              border: dragActive ? '2px dashed #84cc16' : '1px solid #e2e5e9',
              padding: '50px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '180px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, .txt, .docx, .pdf, .png, .jpg, .jpeg"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <UploadCloud size={36} color="#84cc16" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2563eb', marginBottom: '6px' }}>
              {uploading ? 'Processing and parsing file...' : 'Choose a file or drag & drop it here'}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              XLSX, CSV, TXT, PDF, DOCX, and PNG/JPEG images up to 10MB
            </div>

            {selectedFile && (
              <div style={{
                marginTop: '14px',
                backgroundColor: '#ffffff',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#111827',
                border: '1px solid #d1d5db',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <File size={14} color="#84cc16" />
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          PREVIEW TABLE SECTION (FOR BOTH MODES)
          ============================================================== */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Preview Section
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
              Review the parsed records before confirming. EMP. Name is set as sequential numbers and devices as Taking Device.
            </p>
          </div>

          {previewRows.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                backgroundColor: '#ecfccb',
                color: '#3f6212',
                fontWeight: 800,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid #d9f99d'
              }}>
                {previewRows.length} Active Mobiles Ready
              </span>
              <button
                type="button"
                onClick={() => { setPreviewRows([]); setSelectedFile(null); }}
                style={{
                  fontSize: '12.5px',
                  color: '#ef4444',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca'
                }}
              >
                Clear Preview
              </button>
            </div>
          )}
        </div>

        {/* Live Intra-Day Comparison & Diff Box */}
        {comparisonData && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #84cc16',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(132, 204, 22, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#65a30d" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#14532d' }}>
                  Intra-day Comparison: Round {comparisonData.previousRoundNumber} ({comparisonData.previousCount} Mobiles) ➔ Round {comparisonData.nextRoundNumber} ({comparisonData.newCount} Mobiles)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: previewFilter === 'all' ? '1.5px solid #84cc16' : '1px solid #d1d5db',
                    backgroundColor: previewFilter === 'all' ? '#ecfccb' : '#ffffff',
                    color: previewFilter === 'all' ? '#3f6212' : '#374151'
                  }}
                >
                  All ({previewRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('new')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: previewFilter === 'new' ? '1.5px solid #16a34a' : '1px solid #d1d5db',
                    backgroundColor: previewFilter === 'new' ? '#dcfce7' : '#ffffff',
                    color: previewFilter === 'new' ? '#15803d' : '#374151'
                  }}
                >
                  🟢 Newly Added (+{comparisonData.addedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('retained')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: previewFilter === 'retained' ? '1.5px solid #3b82f6' : '1px solid #d1d5db',
                    backgroundColor: previewFilter === 'retained' ? '#eff6ff' : '#ffffff',
                    color: previewFilter === 'retained' ? '#1d4ed8' : '#374151'
                  }}
                >
                  ⚪ Retained ({comparisonData.retainedCount})
                </button>
              </div>
            </div>

            {/* Stat breakdown tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {/* Tile 1: Newly Added Taking */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#166534' }}>🟢 Newly Added Taking Mobiles</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>+{comparisonData.addedCount}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px', maxHeight: '100px', overflowY: 'auto' }}>
                  {comparisonData.addedDevices.map((dev, i) => (
                    <span key={i} style={{ backgroundColor: '#15803d', color: '#ffffff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                      {dev}
                    </span>
                  ))}
                  {comparisonData.addedDevices.length === 0 && <span style={{ fontSize: '12px', color: '#6b7280' }}>None</span>}
                </div>
              </div>

              {/* Tile 2: Returned / Missing */}
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#991b1b' }}>🔴 Returned / Missing Mobiles</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#b91c1c' }}>{comparisonData.removedCount}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px', maxHeight: '100px', overflowY: 'auto' }}>
                  {comparisonData.removedDevices.map((dev, i) => (
                    <span key={i} style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                      {dev}
                    </span>
                  ))}
                  {comparisonData.removedDevices.length === 0 && <span style={{ fontSize: '12px', color: '#6b7280' }}>None (All previous active phones retained)</span>}
                </div>
              </div>

              {/* Tile 3: Retained Continuing */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155' }}>⚪ Continuing From Round {comparisonData.previousRoundNumber}</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#334155' }}>{comparisonData.retainedCount}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', lineHeight: 1.4 }}>
                  {comparisonData.retainedCount} mobile devices were already in Round {comparisonData.previousRoundNumber} and continue actively assigned.
                </div>
              </div>
            </div>
          </div>
        )}

        {previewRows.length === 0 ? (
          /* Empty Placeholder Box matching mockup */
          <div style={{
            backgroundColor: '#eef0f2',
            borderRadius: '18px',
            border: '1px solid #e2e5e9',
            minHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '14px',
            gap: '8px',
            padding: '40px'
          }}>
            <Smartphone size={32} color="#cbd5e1" />
            <div style={{ fontWeight: 600, color: '#64748b' }}>
              {uploading ? 'Parsing uploaded document...' : 'No preview records loaded yet'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#94a3b8', textAlign: 'center', maxWidth: '420px' }}>
              Paste your mobile phone list above and click <strong>Generate Preview Table</strong>, or drop a document to inspect records here.
            </div>
          </div>
        ) : (
          /* Populated Preview Table with Inline Editing */
          <div className="responsive-table-wrapper">
            <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1.5px solid #e5e7eb' }}>
                  <th style={{ padding: '14px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '60px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                    Rec. No.
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '150px', borderRight: '1px solid #e5e7eb' }}>
                    EMP. Name (Number)
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '200px', borderRight: '1px solid #e5e7eb' }}>
                    Taking Device
                  </th>
                  <th style={{ padding: '14px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '100px', borderRight: '1px solid #e5e7eb' }}>
                    Shift
                  </th>
                  <th style={{ padding: '14px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '120px', borderRight: '1px solid #e5e7eb' }}>
                    Group
                  </th>
                  <th style={{ padding: '14px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '110px', borderRight: '1px solid #e5e7eb' }}>
                    Issued At
                  </th>
                  <th style={{ padding: '14px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '100px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                    Sign
                  </th>
                  <th style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '70px', textAlign: 'center' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows
                  .filter(r => {
                    if (previewFilter === 'new') return r.isNewInRound;
                    if (previewFilter === 'retained') return !r.isNewInRound;
                    return true;
                  })
                  .map((row, idx) => {
                    const isNew = Boolean(row.isNewInRound);
                    return (
                      <tr
                        key={row.id || idx}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          backgroundColor: isNew ? '#f0fdf4' : (idx % 2 === 0 ? '#ffffff' : '#fcfdfc'),
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                          {idx + 1}.
                        </td>

                        {/* EMP. Name (Editable number or name) */}
                        <td style={{ padding: '8px 14px', borderRight: '1px solid #e5e7eb' }}>
                          <input
                            type="text"
                            value={row.name}
                            onChange={e => handleUpdatePreviewRow(idx, 'name', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: isNew ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: '#111827',
                              backgroundColor: '#ffffff'
                            }}
                            title="Edit EMP. Name / Number"
                          />
                        </td>

                        {/* Taking Device (Editable with + NEW TAKING badge) */}
                        <td style={{ padding: '8px 14px', borderRight: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="text"
                              value={row.taking_device}
                              onChange={e => handleUpdatePreviewRow(idx, 'taking_device', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: isNew ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                                fontSize: '13.5px',
                                fontWeight: 700,
                                color: isNew ? '#15803d' : '#0284c7',
                                backgroundColor: isNew ? '#ecfdf5' : '#f0f9ff'
                              }}
                              title="Edit Taking Device"
                            />
                            {isNew && (
                              <span style={{
                                backgroundColor: '#15803d',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                letterSpacing: '0.02em',
                                boxShadow: '0 1px 3px rgba(21, 128, 61, 0.25)'
                              }}>
                                + NEW TAKING (R{row.roundNumber || 2})
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>
                          {row.shift || 'Day'}
                        </td>

                        <td style={{ padding: '10px 14px', fontSize: '13px', color: row.group ? '#111827' : '#9ca3af', borderRight: '1px solid #e5e7eb' }}>
                          {row.group || '—'}
                        </td>

                        <td style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563', borderRight: '1px solid #e5e7eb' }}>
                          {row.issued_at || '7.30 A.M.'}
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                          <span style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontWeight: 700,
                            fontSize: '12px',
                            padding: '3px 10px',
                            borderRadius: '9999px'
                          }}>
                            {row.sign || 'Done'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeletePreviewRow(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            title="Remove row"
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==============================================================
          CONFIRM BUTTON
          ============================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          {previewRows.length > 0 ? (
            <span>
              Target: <strong>Task {targetTaskNumber}</strong> ({targetTaskDate}) &bull; Ready to save <strong>{previewRows.length}</strong> active devices
              {comparisonData && comparisonData.addedCount > 0 && (
                <span style={{ marginLeft: '6px', color: '#15803d', fontWeight: 700 }}>
                  (+{comparisonData.addedCount} newly taken in Round {comparisonData.nextRoundNumber})
                </span>
              )}
            </span>
          ) : (
            'Generate preview above to enable confirmation.'
          )}
        </div>

        <button
          onClick={handleConfirmImport}
          disabled={confirming || previewRows.length === 0}
          style={{
            backgroundColor: previewRows.length > 0 ? '#84cc16' : '#d1d5db',
            color: '#000000',
            fontWeight: 800,
            fontSize: '14px',
            padding: '12px 36px',
            borderRadius: '10px',
            border: 'none',
            cursor: previewRows.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: previewRows.length > 0 ? '0 3px 8px rgba(132, 204, 22, 0.3)' : 'none'
          }}
        >
          {confirming ? (
            <span>Confirming &amp; Saving Round...</span>
          ) : (
            <>
              <CheckCircle size={18} />
              <span>
                Confirm &amp; Save {comparisonData ? `Round ${comparisonData.nextRoundNumber}` : 'Daily Task'} ({previewRows.length} Mobiles)
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
