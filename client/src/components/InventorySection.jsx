import React, { useState, useEffect, useMemo } from 'react';
import UserProfileMenu from './UserProfileMenu';
import {
  Search,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Smartphone,
  X,
  Filter,
  RefreshCw,
  Wrench,
  Battery,
  Grid,
  List,
  FileText,
  StickyNote,
  User,
  Building,
  Layers,
  Tag,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function InventorySection({
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  setActiveTab = () => {},
  onLogout = () => {},
  canEdit = true,
  canDelete = true,
  canManageUsers = true
}) {
  const [inventory, setInventory] = useState([]);
  const [kpis, setKpis] = useState({
    totalStock: 241,
    availableStock: 177,
    inUseStock: 64,
    maintenanceStock: 0,
    missingStock: 0,
    seriesStats: {
      pn: { total: 122, inUse: 35, available: 87, label: 'PN 1 - 122', name: 'PN Series' },
      new: { total: 90, inUse: 25, available: 65, label: 'NEW 1 - 90', name: 'NEW Series' },
      cass: { total: 29, inUse: 4, available: 25, label: 'CASS 1 - 29', name: 'CASS Series' }
    }
  });

  const [activeDay, setActiveDay] = useState({
    task_number: 18,
    task_date: '2026-11-18',
    isLatest: true,
    latestTaskNumber: 18,
    latestTaskDate: '2026-11-18'
  });
  const [availableDays, setAvailableDays] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState('cards'); // 'cards' (default card grid) or 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('All Series');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [quickNoteItem, setQuickNoteItem] = useState(null);
  const [quickNoteText, setQuickNoteText] = useState('');

  // Form states for Add / Edit
  const [formTag, setFormTag] = useState('');
  const [formSeries, setFormSeries] = useState('NEW Series');
  const [formModel, setFormModel] = useState('Samsung / Android Mobile Unit');
  const [formLocation, setFormLocation] = useState('Storage Rack B-1');
  const [formCondition, setFormCondition] = useState('Good');
  const [formStatus, setFormStatus] = useState('Auto');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Inventory from server (defaults to latest day unless specific day requested)
  const fetchInventory = async (taskNumber = null, taskDate = null) => {
    setLoading(true);
    try {
      let url = '/api/inventory';
      if (taskNumber) {
        url += `?task_number=${taskNumber}`;
        if (taskDate) url += `&task_date=${taskDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInventory(data.items || []);
        if (data.kpis) {
          setKpis(data.kpis);
        }
        if (data.activeDay) {
          setActiveDay(data.activeDay);
        }
        if (data.availableDays) {
          setAvailableDays(data.availableDays);
        }
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        (item.device_tag || '').toLowerCase().includes(term) ||
        (item.holder || '').toLowerCase().includes(term) ||
        (item.model_name || '').toLowerCase().includes(term) ||
        (item.storage_location || '').toLowerCase().includes(term) ||
        (item.notes || '').toLowerCase().includes(term);

      const matchesSeries =
        selectedSeries === 'All Series' ||
        item.series === selectedSeries ||
        (selectedSeries === 'PN Series' && (item.series || '').includes('PN')) ||
        (selectedSeries === 'NEW Series' && (item.series || '').includes('NEW')) ||
        (selectedSeries === 'CASS Series' && (item.series || '').includes('CASS'));

      const matchesStatus =
        selectedStatus === 'All Status' || item.status === selectedStatus;

      const matchesLocation =
        selectedLocation === 'All Locations' ||
        item.storage_location === selectedLocation;

      return matchesSearch && matchesSeries && matchesStatus && matchesLocation;
    });
  }, [inventory, searchTerm, selectedSeries, selectedStatus, selectedLocation]);

  // Handle phone type selection in Add modal
  const handleSelectPhoneType = (type) => {
    if (type === 'NEW') {
      setFormSeries('NEW Series');
      setFormLocation('Storage Rack B-1');
      // Auto suggest next NEW number if tag is empty or starting with other
      if (!formTag || formTag.startsWith('Pn') || formTag.startsWith('Cass')) {
        const nextNum = (kpis.seriesStats?.new?.total || 90) + 1;
        setFormTag(`New ${nextNum}`);
      }
    } else if (type === 'PN') {
      setFormSeries('PN Series');
      setFormLocation('Charging Station A');
      if (!formTag || formTag.startsWith('New') || formTag.startsWith('Cass')) {
        const nextNum = (kpis.seriesStats?.pn?.total || 122) + 1;
        setFormTag(`Pn ${nextNum}`);
      }
    } else if (type === 'CASS') {
      setFormSeries('CASS Series');
      setFormLocation('Charging Station B');
      if (!formTag || formTag.startsWith('New') || formTag.startsWith('Pn')) {
        const nextNum = (kpis.seriesStats?.cass?.total || 29) + 1;
        setFormTag(`Cass ${nextNum}`);
      }
    } else {
      setFormSeries('Other Series');
      setFormLocation('Charging Station A');
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('htsk_session_token');
    const role = currentUserRole || localStorage.getItem('htsk_user_role') || 'Admin';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-User-Role': role
    };
  };

  // Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMsg('You do not have permission to add devices (View only).');
      return;
    }
    if (!formTag.trim()) {
      setErrorMsg('Device Tag / Number is required (e.g. "New 91", "Pn 123", "Cass 30")');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          device_tag: formTag.trim(),
          series: formSeries,
          phone_type: formSeries,
          model_name: formModel.trim(),
          storage_location: formLocation.trim(),
          condition_status: formCondition,
          notes: formNotes.trim()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add device');
      setIsAddOpen(false);
      resetForm();
      fetchInventory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!canEdit) {
      setErrorMsg('You do not have permission to edit devices (View only).');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          device_tag: formTag.trim(),
          series: formSeries,
          model_name: formModel.trim(),
          storage_location: formLocation.trim(),
          condition_status: formCondition,
          manual_status: formStatus,
          notes: formNotes.trim()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update device');
      setEditingItem(null);
      resetForm();
      fetchInventory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Quick note update handler
  const handleSaveQuickNote = async (e) => {
    e.preventDefault();
    if (!quickNoteItem) return;
    if (!canEdit) return;
    try {
      const res = await fetch(`/api/inventory/${quickNoteItem.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          notes: quickNoteText.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setQuickNoteItem(null);
        setQuickNoteText('');
        fetchInventory();
      }
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  // Handle Delete
  const handleDelete = async (id, tag) => {
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to remove device "${tag}" from inventory?`)) return;
    try {
      await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchInventory();
    } catch (err) {
      console.error('Error deleting inventory item:', err);
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormTag(item.device_tag || '');
    setFormSeries(item.series || 'PN Series');
    setFormModel(item.model_name || 'Samsung / Android Mobile Unit');
    setFormLocation(item.storage_location || 'Charging Station A');
    setFormCondition(item.condition_status || 'Good');
    setFormStatus(item.manual_status || 'Auto');
    setFormNotes(item.notes || '');
    setErrorMsg('');
  };

  const openQuickNote = (item) => {
    setQuickNoteItem(item);
    setQuickNoteText(item.notes || '');
  };

  const resetForm = () => {
    setFormTag('');
    setFormSeries('NEW Series');
    setFormModel('Samsung / Android Mobile Unit');
    setFormLocation('Storage Rack B-1');
    setFormCondition('Good');
    setFormStatus('Auto');
    setFormNotes('');
    setErrorMsg('');
  };

  // Helper for series colors
  const getSeriesTheme = (series = '') => {
    const s = String(series).toUpperCase();
    if (s.includes('NEW')) {
      return {
        badgeBg: '#ecfdf5',
        badgeBorder: '#a7f3d0',
        badgeText: '#065f46',
        cardBorder: '#bbf7d0',
        primary: '#10b981',
        label: 'NEW Series (1-90)'
      };
    }
    if (s.includes('PN')) {
      return {
        badgeBg: '#eff6ff',
        badgeBorder: '#bfdbfe',
        badgeText: '#1e40af',
        cardBorder: '#bfdbfe',
        primary: '#3b82f6',
        label: 'PN Series (1-122)'
      };
    }
    if (s.includes('CASS')) {
      return {
        badgeBg: '#fdf4ff',
        badgeBorder: '#f5d0fe',
        badgeText: '#86198f',
        cardBorder: '#f5d0fe',
        primary: '#a855f7',
        label: 'CASS Series (1-29)'
      };
    }
    return {
      badgeBg: '#f8fafc',
      badgeBorder: '#e2e8f0',
      badgeText: '#334155',
      cardBorder: '#e2e8f0',
      primary: '#64748b',
      label: 'Other Series'
    };
  };

  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'In Use':
        return (
          <span style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            fontWeight: 800,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
            In Use
          </span>
        );
      case 'Available':
        return (
          <span style={{
            backgroundColor: '#f1f5f9',
            color: '#475569',
            fontWeight: 700,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            Available
          </span>
        );
      case 'Maintenance':
        return (
          <span style={{
            backgroundColor: '#ffedd5',
            color: '#c2410c',
            fontWeight: 700,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Wrench size={12} /> Maintenance
          </span>
        );
      case 'Missing':
        return (
          <span style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            fontWeight: 700,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <AlertTriangle size={12} /> Missing
          </span>
        );
      default:
        return (
          <span style={{
            backgroundColor: '#f3f4f6',
            color: '#374151',
            fontWeight: 600,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '9999px'
          }}>
            {status}
          </span>
        );
    }
  };

  const seriesStats = kpis.seriesStats || {
    pn: { total: 122, inUse: 35, available: 87, label: 'PN 1 - 122' },
    new: { total: 90, inUse: 25, available: 65, label: 'NEW 1 - 90' },
    cass: { total: 29, inUse: 4, available: 25, label: 'CASS 1 - 29' }
  };

  return (
    <div className="responsive-section-container">
      {/* Top Header Row matching system theme */}
      <div className="responsive-header">
        <div>
          <h1 className="system-h1">
            Mobile Management
          </h1>
          <p className="system-breadcrumb">
            <span>Workspace / Inventory</span>
            <span>•</span>
            <strong style={{ color: '#111827' }}>{kpis.totalStock} Total Mobile Phones (PN: 122, NEW: 90, CASS: 29)</strong>
          </p>
        </div>

        {/* Right side: Stock badge & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="stock-badge-pill">
            <Package size={17} color="#65a30d" />
            <span>Total Stock: {kpis.totalStock} Phones</span>
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
            canManageUsers={canManageUsers}
          />
        </div>
      </div>

      {/* Dynamic Live Update Status Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f0fdf4',
        border: '1.5px solid #84cc16',
        borderRadius: '16px',
        padding: '14px 20px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(132, 204, 22, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#16a34a',
            display: 'inline-block',
            boxShadow: '0 0 0 4px rgba(22, 163, 74, 0.25)'
          }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#14532d' }}>
                Inventory Live-Synced With: {activeDay.task_date || '2026-11-18'} (Task #{activeDay.task_number || 18})
              </span>
              {activeDay.isLatest && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0'
                }}>
                  LATEST DAY UPDATE
                </span>
              )}
            </div>
            <div style={{ fontSize: '12.5px', color: '#4d7c0f', marginTop: '2px' }}>
              <strong>{kpis.inUseStock} mobile phones</strong> actively assigned to employees on this date • <strong>{kpis.availableStock}</strong> ready in charging racks
            </div>
          </div>
        </div>

        {/* Day History Quick Filter Switcher */}
        {availableDays.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginRight: '4px' }}>
              Switch Day:
            </span>
            {availableDays.map(d => {
              const isSelected = activeDay.task_number === d.task_number;
              return (
                <button
                  key={d.task_number}
                  type="button"
                  onClick={() => fetchInventory(d.task_number, d.task_date)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: isSelected ? '1.5px solid #14532d' : '1px solid #d1d5db',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#15803d' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#374151',
                    boxShadow: isSelected ? '0 2px 4px rgba(21, 128, 61, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease'
                  }}
                  title={`View inventory state for Task ${d.task_number}`}
                >
                  {d.task_date ? d.task_date.split('-').slice(1).join('/') : `Task ${d.task_number}`} ({d.device_count || d.total_records} Mobiles)
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4 EXACT INVENTORY DETAILS SUMMARY CARDS */}
      <div className="responsive-kpi-grid-4" style={{ marginBottom: '22px' }}>
        {/* Card 1: Total Mobile Phones (241 Phones) */}
        <div
          className="clickable-kpi-card"
          onClick={() => setSelectedSeries('All Series')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: selectedSeries === 'All Series' ? '2.5px solid #84cc16' : '1.5px solid #e5e7eb',
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
          title="Click to view all series"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#4b5563' }}>
              Total Inventory Stock
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#3f6212', backgroundColor: '#f7fee7', padding: '3px 8px', borderRadius: '6px' }}>
              All Units
            </span>
          </div>
          <div style={{ fontSize: '42px', fontWeight: 900, color: '#84cc16', lineHeight: 1.1, marginBottom: '8px' }}>
            {kpis.totalStock}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
              <strong style={{ color: '#16a34a' }}>{kpis.inUseStock} In Use</strong> • {kpis.availableStock} Available
            </div>
            <div className="card-arrow-btn" title="View all stock">
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Card 2: PN Series (PN 1 to 122 -> 122 Devices) */}
        <div
          className="clickable-kpi-card"
          onClick={() => setSelectedSeries('PN Series')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: selectedSeries === 'PN Series' ? '2.5px solid #3b82f6' : '1.5px solid #e5e7eb',
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
          title="Click to filter by PN Series"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e40af' }}>
              PN Series Phones
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
              PN 1 - 122
            </span>
          </div>
          <div style={{ fontSize: '42px', fontWeight: 900, color: '#3b82f6', lineHeight: 1.1, marginBottom: '8px' }}>
            {seriesStats.pn.total}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
              <strong style={{ color: '#1d4ed8' }}>{seriesStats.pn.inUse} In Use</strong> • {seriesStats.pn.available} in Station A
            </div>
            <div className="card-arrow-btn" title="View PN series">
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Card 3: NEW Series (NEW 1 to 90 -> 90 Devices) */}
        <div
          className="clickable-kpi-card"
          onClick={() => setSelectedSeries('NEW Series')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: selectedSeries === 'NEW Series' ? '2.5px solid #10b981' : '1.5px solid #e5e7eb',
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
          title="Click to filter by NEW Series"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#065f46' }}>
              NEW Series Phones
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
              NEW 1 - 90
            </span>
          </div>
          <div style={{ fontSize: '42px', fontWeight: 900, color: '#10b981', lineHeight: 1.1, marginBottom: '8px' }}>
            {seriesStats.new.total}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
              <strong style={{ color: '#047857' }}>{seriesStats.new.inUse} In Use</strong> • {seriesStats.new.available} in Rack B-1
            </div>
            <div className="card-arrow-btn" title="View NEW series">
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Card 4: CASS Series (CASS 1 to 29 -> 29 Devices) */}
        <div
          className="clickable-kpi-card"
          onClick={() => setSelectedSeries('CASS Series')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: selectedSeries === 'CASS Series' ? '2.5px solid #a855f7' : '1.5px solid #e5e7eb',
            padding: '20px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
          title="Click to filter by CASS Series"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#86198f' }}>
              CASS Series Phones
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#7e22ce', backgroundColor: '#fdf4ff', padding: '3px 8px', borderRadius: '6px' }}>
              CASS 1 - 29
            </span>
          </div>
          <div style={{ fontSize: '42px', fontWeight: 900, color: '#a855f7', lineHeight: 1.1, marginBottom: '8px' }}>
            {seriesStats.cass.total}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
              <strong style={{ color: '#7e22ce' }}>{seriesStats.cass.inUse} In Use</strong> • {seriesStats.cass.available} in Station B
            </div>
            <div className="card-arrow-btn" title="View CASS series">
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Series Filter Pills, Search, View Mode & Add Device */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Left: Series Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: `All Phones (${kpis.totalStock})`, val: 'All Series' },
            { label: `PN Series (${seriesStats.pn.total})`, val: 'PN Series' },
            { label: `NEW Series (${seriesStats.new.total})`, val: 'NEW Series' },
            { label: `CASS Series (${seriesStats.cass.total})`, val: 'CASS Series' }
          ].map(tab => {
            const isActive = selectedSeries === tab.val;
            return (
              <button
                key={tab.val}
                onClick={() => setSelectedSeries(tab.val)}
                style={{
                  backgroundColor: isActive ? '#111827' : '#f3f4f6',
                  color: isActive ? '#ffffff' : '#374151',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Search, Status filter, View Switcher, Add Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '9999px',
            padding: '8px 16px',
            width: '240px'
          }}>
            <Search size={15} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search tag, note, user..."
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

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              style={{
                appearance: 'none',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 34px 9px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Status">All Status</option>
              <option value="In Use">In Use ({kpis.inUseStock})</option>
              <option value="Available">Available ({kpis.availableStock})</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Missing">Missing</option>
            </select>
            <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* View Mode Toggle: Card Grid vs Table */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
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
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
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

          {/* Refresh button */}
          <button
            onClick={() => fetchInventory()}
            style={{
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151'
            }}
            title="Refresh Inventory"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Lime Green Add Device Button matching system theme (hidden for View only / non-editors) */}
          {canEdit && (
            <button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              style={{
                backgroundColor: '#84cc16',
                color: '#000000',
                fontWeight: 800,
                fontSize: '13px',
                padding: '9px 20px',
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
              <Plus size={16} />
              <span>Add Device</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: INVENTORY CARDS GRID (PRIMARY VIEW) */}
      {viewMode === 'cards' && (
        <div>
          {filteredItems.length === 0 ? (
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
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Try switching the series pill or clearing the search query.</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '16px'
            }}>
              {filteredItems.map(item => {
                const theme = getSeriesTheme(item.series);
                const isInUse = item.status === 'In Use';

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: `1.5px solid ${theme.cardBorder}`,
                      padding: '18px 20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    <div>
                      {/* Card Header: Device Tag Badge & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: theme.badgeBg,
                          border: `1px solid ${theme.badgeBorder}`,
                          padding: '5px 12px',
                          borderRadius: '8px'
                        }}>
                          <Smartphone size={15} color={theme.primary} />
                          <span style={{ fontSize: '14px', fontWeight: 800, color: theme.badgeText }}>
                            {item.device_tag}
                          </span>
                        </div>

                        {renderStatusBadge(item.status)}
                      </div>

                      {/* Phone Series Label */}
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                        {item.series} • {item.model_name || 'Samsung / Android Mobile Unit'}
                      </div>

                      {/* Current Custodian or Location Details */}
                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        marginBottom: '10px'
                      }}>
                        {isInUse ? (
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                              Current Custodian
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <User size={14} />
                              <span>EMP {item.holder}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                              {item.shift} Shift • Task #{item.task_number || activeDay.task_number} ({item.task_date || activeDay.task_date})
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                              Storage Location
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Building size={14} color="#6b7280" />
                              <span>{item.storage_location || 'Charging Station'}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                              Ready for assignment
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Device Notes Box */}
                      {item.notes ? (
                        <div style={{
                          backgroundColor: '#fefce8',
                          border: '1px solid #fef08a',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#854d0e',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                          marginBottom: '8px'
                        }}>
                          <StickyNote size={14} color="#ca8a04" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>"{item.notes}"</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openQuickNote(item)}
                          style={{
                            background: 'transparent',
                            border: '1px dashed #d1d5db',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '8px'
                          }}
                        >
                          <Plus size={11} /> Add note
                        </button>
                      )}
                    </div>

                    {/* Card Footer: Condition & Actions */}
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
                        Condition: <strong style={{ color: item.condition_status === 'Good' ? '#16a34a' : '#d97706' }}>{item.condition_status || 'Good'}</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openQuickNote(item)}
                            style={{
                              background: '#f3f4f6',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#4b5563',
                              cursor: 'pointer'
                            }}
                            title="Add/Edit Note"
                          >
                            Note
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            style={{
                              background: '#f3f4f6',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#4b5563',
                              cursor: 'pointer'
                            }}
                            title="Edit Device Details"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.device_tag)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              color: '#b91c1c',
                              cursor: 'pointer'
                            }}
                            title="Remove Device"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '4px' }}>
                            View only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="responsive-table-wrapper">
          <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #e5e7eb' }}>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '60px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                  Rec. No.
                </th>
                <th style={{ padding: '16px 18px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '130px', borderRight: '1px solid #e5e7eb' }}>
                  Device Tag
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '130px', borderRight: '1px solid #e5e7eb' }}>
                  Series
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '140px', borderRight: '1px solid #e5e7eb' }}>
                  Status
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                  Current Holder / Location
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', minWidth: '180px', borderRight: '1px solid #e5e7eb' }}>
                  Device Note
                </th>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '110px', borderRight: '1px solid #e5e7eb' }}>
                  Condition
                </th>
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '100px', textAlign: 'center' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    No inventory devices matching your search/filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isInUse = item.status === 'In Use';
                  const theme = getSeriesTheme(item.series);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#fcfdfd',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ecfbfb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fcfdfd'}
                    >
                      <td style={{ padding: '14px', fontSize: '13px', fontWeight: 700, color: '#111827', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        {index + 1}.
                      </td>

                      <td style={{ padding: '14px 18px', borderRight: '1px solid #e5e7eb' }}>
                        <span style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                          border: `1px solid ${theme.badgeBorder}`,
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          display: 'inline-block'
                        }}>
                          {item.device_tag}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#4b5563', borderRight: '1px solid #e5e7eb' }}>
                        {item.series}
                      </td>

                      <td style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                        {renderStatusBadge(item.status)}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '13px', borderRight: '1px solid #e5e7eb' }}>
                        {isInUse ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={13} /> EMP {item.holder}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {item.shift} Shift • Task #{item.task_number || activeDay.task_number} ({item.task_date || activeDay.task_date})
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building size={13} /> {item.storage_location}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '12.5px', borderRight: '1px solid #e5e7eb' }}>
                        {item.notes ? (
                          <span style={{ color: '#854d0e', backgroundColor: '#fefce8', padding: '3px 8px', borderRadius: '4px', fontStyle: 'italic' }}>
                            "{item.notes}"
                          </span>
                        ) : canEdit ? (
                          <button
                            type="button"
                            onClick={() => openQuickNote(item)}
                            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '11.5px', cursor: 'pointer', padding: 0 }}
                          >
                            + Add note
                          </button>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '14px', fontSize: '12.5px', borderRight: '1px solid #e5e7eb' }}>
                        <span style={{
                          color: item.condition_status === 'Good' ? '#16a34a' : '#d97706',
                          fontWeight: 600
                        }}>
                          {item.condition_status}
                        </span>
                      </td>

                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {canEdit && (
                            <button
                              onClick={() => openEdit(item)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '4px' }}
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id, item.device_tag)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                          {!canEdit && !canDelete && (
                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                              View only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: ADD NEW DEVICE WITH PHONE TYPE SELECTOR & NOTES */}
      {isAddOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Add Device to Inventory
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Select phone type (NEW, PN, CASS) and add device details & notes
                </p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: '24px' }}>
              {errorMsg && (
                <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  {errorMsg}
                </div>
              )}

              {/* Step 1: Select Phone Type / Series */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                  1. Select Phone Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectPhoneType('NEW')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: formSeries === 'NEW Series' ? '2px solid #10b981' : '1px solid #d1d5db',
                      backgroundColor: formSeries === 'NEW Series' ? '#ecfdf5' : '#ffffff',
                      color: formSeries === 'NEW Series' ? '#065f46' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                  >
                    <Smartphone size={18} color={formSeries === 'NEW Series' ? '#10b981' : '#6b7280'} style={{ margin: '0 auto 4px', display: 'block' }} />
                    NEW Series
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginTop: '2px' }}>1 - 90</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPhoneType('PN')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: formSeries === 'PN Series' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      backgroundColor: formSeries === 'PN Series' ? '#eff6ff' : '#ffffff',
                      color: formSeries === 'PN Series' ? '#1e40af' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                  >
                    <Smartphone size={18} color={formSeries === 'PN Series' ? '#3b82f6' : '#6b7280'} style={{ margin: '0 auto 4px', display: 'block' }} />
                    PN Series
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginTop: '2px' }}>1 - 122</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPhoneType('CASS')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: formSeries === 'CASS Series' ? '2px solid #a855f7' : '1px solid #d1d5db',
                      backgroundColor: formSeries === 'CASS Series' ? '#fdf4ff' : '#ffffff',
                      color: formSeries === 'CASS Series' ? '#86198f' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                  >
                    <Smartphone size={18} color={formSeries === 'CASS Series' ? '#a855f7' : '#6b7280'} style={{ margin: '0 auto 4px', display: 'block' }} />
                    CASS Series
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginTop: '2px' }}>1 - 29</div>
                  </button>
                </div>
              </div>

              {/* Step 2: Device Number / Tag */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  2. Device Tag / Identifier *
                </label>
                <input
                  type="text"
                  placeholder='e.g. "New 91", "Pn 123", "Cass 30"'
                  value={formTag}
                  onChange={e => setFormTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Step 3: Device Note (Important Requirement) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  3. Device Note / Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder='Add any specific notes for this mobile device (e.g. "Screen protector installed", "Dedicated to backup rack", "Battery condition note")...'
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Storage Location & Condition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Storage Rack / Station
                  </label>
                  <select
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="Charging Station A">Charging Station A (PN Series)</option>
                    <option value="Storage Rack B-1">Storage Rack B-1 (NEW Series)</option>
                    <option value="Charging Station B">Charging Station B (CASS Series)</option>
                    <option value="Secure Vault C">Secure Vault C (High Security)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Condition Status
                  </label>
                  <select
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="Good">Good (Ready to Issue)</option>
                    <option value="Fair">Fair (Minor Scratches)</option>
                    <option value="Needs Maintenance">Needs Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#84cc16',
                    color: '#000000',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(132, 204, 22, 0.25)'
                  }}
                >
                  {saving ? 'Adding Device...' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DEVICE DETAILS & NOTE */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Edit Device #{editingItem.id} ({editingItem.device_tag})
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Update device notes, storage location, and status
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: '24px' }}>
              {errorMsg && (
                <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  {errorMsg}
                </div>
              )}

              {/* Tag & Series */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Device Tag
                  </label>
                  <input
                    type="text"
                    value={formTag}
                    onChange={e => setFormTag(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Series
                  </label>
                  <select
                    value={formSeries}
                    onChange={e => setFormSeries(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="PN Series">PN Series (PN 1 - 122)</option>
                    <option value="NEW Series">NEW Series (NEW 1 - 90)</option>
                    <option value="CASS Series">CASS Series (CASS 1 - 29)</option>
                    <option value="Other Series">Other Series</option>
                  </select>
                </div>
              </div>

              {/* Device Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Device Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter or update notes for this device..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Storage & Condition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Storage Rack
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Condition Status
                  </label>
                  <select
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Maintenance">Needs Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#84cc16',
                    color: '#000000',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK NOTE EDITING MODAL */}
      {quickNoteItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote size={18} color="#ca8a04" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Device Note: {quickNoteItem.device_tag}
                </h3>
              </div>
              <button
                onClick={() => setQuickNoteItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickNote} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Note for {quickNoteItem.device_tag} ({quickNoteItem.series})
                </label>
                <textarea
                  rows={4}
                  autoFocus
                  placeholder="Enter specific notes for this mobile device..."
                  value={quickNoteText}
                  onChange={e => setQuickNoteText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setQuickNoteItem(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#84cc16',
                    color: '#000000',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
