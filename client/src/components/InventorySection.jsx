import React, { useState, useEffect, useMemo } from 'react';
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
  Battery
} from 'lucide-react';

export default function InventorySection({ onLogout = () => {} }) {
  const [inventory, setInventory] = useState([]);
  const [kpis, setKpis] = useState({
    totalStock: 159,
    availableStock: 92,
    inUseStock: 67,
    maintenanceStock: 0,
    missingStock: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('All Series');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states for Add / Edit
  const [formTag, setFormTag] = useState('');
  const [formSeries, setFormSeries] = useState('PN Series');
  const [formModel, setFormModel] = useState('Samsung / Android Mobile Unit');
  const [formLocation, setFormLocation] = useState('Charging Station A');
  const [formCondition, setFormCondition] = useState('Good');
  const [formStatus, setFormStatus] = useState('Auto');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Inventory from server
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.success) {
        setInventory(data.items || []);
        if (data.kpis) {
          setKpis(data.kpis);
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
        (item.storage_location || '').toLowerCase().includes(term);

      const matchesSeries =
        selectedSeries === 'All Series' || item.series === selectedSeries;

      const matchesStatus =
        selectedStatus === 'All Status' || item.status === selectedStatus;

      const matchesLocation =
        selectedLocation === 'All Locations' ||
        item.storage_location === selectedLocation;

      return matchesSearch && matchesSeries && matchesStatus && matchesLocation;
    });
  }, [inventory, searchTerm, selectedSeries, selectedStatus, selectedLocation]);

  // Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formTag.trim()) {
      setErrorMsg('Device Tag is required (e.g. "New 80", "Pn 125")');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_tag: formTag.trim(),
          series: formSeries,
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
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  // Handle Delete
  const handleDelete = async (id, tag) => {
    if (!window.confirm(`Are you sure you want to remove device "${tag}" from inventory?`)) return;
    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
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

  const resetForm = () => {
    setFormTag('');
    setFormSeries('PN Series');
    setFormModel('Samsung / Android Mobile Unit');
    setFormLocation('Charging Station A');
    setFormCondition('Good');
    setFormStatus('Auto');
    setFormNotes('');
    setErrorMsg('');
  };

  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return (
          <span style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            fontWeight: 700,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle2 size={12} /> Available
          </span>
        );
      case 'In Use':
        return (
          <span style={{
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            fontWeight: 700,
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Smartphone size={12} /> In Use
          </span>
        );
      case 'Maintenance':
        return (
          <span style={{
            backgroundColor: '#fef3c7',
            color: '#b45309',
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

  return (
    <div className="responsive-section-container">
      {/* Top Header Row matching system theme */}
      <div className="responsive-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Mobile Management
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
            Workspace / Inventory
          </p>
        </div>

        {/* Right side: Stock badge & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #84cc16',
            color: '#3f6212',
            fontWeight: 700,
            fontSize: '13px',
            padding: '6px 16px',
            borderRadius: '8px',
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Package size={16} color="#65a30d" />
            <span>Total Stock: {kpis.totalStock}</span>
          </div>

          <div
            className="desktop-only-profile"
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

      {/* 4 Inventory KPI Summary Cards matching system theme */}
      <div className="responsive-kpi-grid-4">
        {/* Card 1: Total Inventory Stock */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '2px solid #84cc16',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(132, 204, 22, 0.06)'
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
            Total Mobile Phones
          </div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: '#84cc16', lineHeight: 1.1, marginBottom: '8px' }}>
            {kpis.totalStock}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
            {kpis.totalStock} Mobile phones registered in inventory
          </div>
        </div>

        {/* Card 2: Available in Stock */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '2px solid #eab308',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(234, 179, 8, 0.06)'
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
            Available in Stock
          </div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: '#eab308', lineHeight: 1.1, marginBottom: '8px' }}>
            {kpis.availableStock}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
            {kpis.availableStock} ready in storage & charging racks
          </div>
        </div>

        {/* Card 3: Active in Shift / In Use */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '2px solid #06b6d4',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(6, 182, 212, 0.06)'
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
            Active Mobile Phones
          </div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: '#06b6d4', lineHeight: 1.1, marginBottom: '8px' }}>
            {kpis.inUseStock}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
            {kpis.inUseStock} currently active in employees' hands
          </div>
        </div>

        {/* Card 4: Need an Update / Maintenance */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '2px solid #ef4444',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.06)'
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
            Need an Update / Issue
          </div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: '#ef4444', lineHeight: 1.1, marginBottom: '8px' }}>
            {(kpis.maintenanceStock || 0) + (kpis.missingStock || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
            {(kpis.maintenanceStock || 0) + (kpis.missingStock || 0)} under maintenance or missing
          </div>
        </div>
      </div>

      {/* Series Category Selector Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['All Series', 'NEW Series', 'PN Series', 'CASS Series'].map(series => {
          const isActive = selectedSeries === series;
          return (
            <button
              key={series}
              onClick={() => setSelectedSeries(series)}
              style={{
                backgroundColor: isActive ? '#111827' : '#f3f4f6',
                color: isActive ? '#ffffff' : '#374151',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {series}
            </button>
          );
        })}
      </div>

      {/* Control Toolbar: Search, Filters & Add Device */}
      <div className="responsive-toolbar">
        {/* Left: Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '8px 16px',
          width: '100%',
          maxWidth: '320px',
          boxSizing: 'border-box',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search by device tag, holder, model..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#1f2937',
              width: '100%'
            }}
          />
        </div>

        {/* Right: Filters & Add Device */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                padding: '9px 36px 9px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Status">All Status</option>
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Missing">Missing</option>
            </select>
            <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Location Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
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
              <option value="All Locations">All Locations</option>
              <option value="Charging Station A">Charging Station A</option>
              <option value="Storage Rack B-1">Storage Rack B-1</option>
              <option value="Secure Vault C">Secure Vault C</option>
            </select>
            <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchInventory}
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

          {/* Lime Green Add Device Button matching system theme */}
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
            <Plus size={16} />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Main Inventory Table matching system styling */}
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
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                  Model / Description
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', width: '140px', borderRight: '1px solid #e5e7eb' }}>
                  Status
                </th>
                <th style={{ padding: '16px 16px', fontSize: '13px', fontWeight: 800, color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                  Current Holder / Location
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
                      {/* Rec. No */}
                      <td style={{ padding: '14px', fontSize: '13px', fontWeight: 700, color: '#111827', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        {index + 1}.
                      </td>

                      {/* Device Tag */}
                      <td style={{ padding: '14px 18px', borderRight: '1px solid #e5e7eb' }}>
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          letterSpacing: '0.02em',
                          display: 'inline-block'
                        }}>
                          {item.device_tag}
                        </span>
                      </td>

                      {/* Series */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#4b5563', borderRight: '1px solid #e5e7eb' }}>
                        {item.series}
                      </td>

                      {/* Model */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', borderRight: '1px solid #e5e7eb' }}>
                        <div>{item.model_name}</div>
                        {item.notes ? <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{item.notes}</div> : null}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* Holder / Location */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', borderRight: '1px solid #e5e7eb' }}>
                        {isInUse ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: '#0369a1' }}>
                              EMP {item.holder}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {item.shift} Shift • Task {item.task_number || 17}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280' }}>
                            {item.storage_location}
                          </span>
                        )}
                      </td>

                      {/* Condition */}
                      <td style={{ padding: '14px', fontSize: '12.5px', borderRight: '1px solid #e5e7eb' }}>
                        <span style={{
                          color: item.condition_status === 'Good' ? '#16a34a' : '#d97706',
                          fontWeight: 600
                        }}>
                          {item.condition_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            title="Edit Device Details"
                          >
                            <Edit2 size={16} color="#d97706" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.device_tag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            title="Delete Device"
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Add Device Modal */}
      {isAddOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px 28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Add New Inventory Device
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Device Tag *
                </label>
                <input
                  type="text"
                  placeholder='e.g. "New 80", "Pn 125", "Cass 35"'
                  value={formTag}
                  onChange={e => setFormTag(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13.5px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Series
                  </label>
                  <select
                    value={formSeries}
                    onChange={e => setFormSeries(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="PN Series">PN Series</option>
                    <option value="NEW Series">NEW Series</option>
                    <option value="CASS Series">CASS Series</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Condition
                  </label>
                  <select
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="Good">Good</option>
                    <option value="Normal">Normal</option>
                    <option value="Needs Charge">Needs Charge</option>
                    <option value="Screen Issue">Screen Issue</option>
                    <option value="Faulty">Faulty</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Storage Location
                </label>
                <select
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                >
                  <option value="Charging Station A">Charging Station A</option>
                  <option value="Storage Rack B-1">Storage Rack B-1</option>
                  <option value="Secure Vault C">Secure Vault C</option>
                  <option value="General Storage">General Storage</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Model / Description
                </label>
                <input
                  type="text"
                  value={formModel}
                  onChange={e => setFormModel(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', backgroundColor: '#84cc16', color: '#000', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {saving ? 'Adding...' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px 28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Edit Device: {editingItem.device_tag}
              </h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Device Tag
                </label>
                <input
                  type="text"
                  value={formTag}
                  onChange={e => setFormTag(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13.5px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Series
                  </label>
                  <select
                    value={formSeries}
                    onChange={e => setFormSeries(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="PN Series">PN Series</option>
                    <option value="NEW Series">NEW Series</option>
                    <option value="CASS Series">CASS Series</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Status Mode
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="Auto">Auto (Tracks Floor Use)</option>
                    <option value="Available">Force Available</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Missing">Reported Missing</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Condition
                  </label>
                  <select
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="Good">Good</option>
                    <option value="Normal">Normal</option>
                    <option value="Needs Charge">Needs Charge</option>
                    <option value="Screen Issue">Screen Issue</option>
                    <option value="Faulty">Faulty</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Storage Location
                  </label>
                  <select
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="Charging Station A">Charging Station A</option>
                    <option value="Storage Rack B-1">Storage Rack B-1</option>
                    <option value="Secure Vault C">Secure Vault C</option>
                    <option value="General Storage">General Storage</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Model / Description
                </label>
                <input
                  type="text"
                  value={formModel}
                  onChange={e => setFormModel(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', backgroundColor: '#84cc16', color: '#000', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
