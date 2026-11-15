import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Plus,
  Search,
  Download,
  Edit2,
  X,
  ArrowRight,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  MapPin,
  History,
  Check,
  ArrowLeftRight
} from 'lucide-react';
import { api } from '../api';

export default function DevicesView({
  user,
  userPermissions,
  permissionDetails,
  onDataChange,
  onNavigateToReturns,
  externalSearch = ''
}) {
  const canEdit =
    user?.role === 'Developer' ||
    (user?.role === 'ITAdmin' && (userPermissions?.manage_mobile_phones ?? true)) ||
    (user?.role === 'Employee' &&
      Boolean(userPermissions?.manage_mobile_phones) &&
      Boolean(permissionDetails?.manage_mobile_phones?.employeeCanEdit));

  const [allDevices, setAllDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(externalSearch || '');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [categoryPrefix, setCategoryPrefix] = useState('ALL'); // ALL, Phone, New, Cass
  const [statusTab, setStatusTab] = useState('ALL'); // ALL, Available, Missing
  const [statusDropdown, setStatusDropdown] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(canEdit);
  const [editingDevice, setEditingDevice] = useState(null);
  const [customGroupMode, setCustomGroupMode] = useState(false);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const panelRef = useRef(null);

  const [formData, setFormData] = useState({
    mobileCode: '',
    groupId: '',
    customGroupName: '',
    deviceName: '',
    brand: '',
    imei: '',
    serialNumber: '',
    assignedTo: '',
    location: '',
    currentStatus: 'Available'
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const pageSize = 12;

  useEffect(() => {
    if (externalSearch) {
      setSearch(externalSearch);
    }
  }, [externalSearch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devList, grpList] = await Promise.all([
        api.getDevices({ isActive: true }),
        api.getGroups(true)
      ]);
      setAllDevices(Array.isArray(devList) ? devList : []);
      setGroups(Array.isArray(grpList) ? grpList : []);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadDeviceAuditHistory = async (mobileCode) => {
    if (!mobileCode) {
      setDeviceHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const hist = await api.getHistory({ mobileCode });
      setDeviceHistory(Array.isArray(hist) ? hist.slice(0, 8) : []);
    } catch {
      setDeviceHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openAddPanel = () => {
    setEditingDevice(null);
    setDeviceHistory([]);
    setFormError('');
    setCustomGroupMode(groups.length === 0);
    setFormData({
      mobileCode: '',
      groupId: '',
      customGroupName: '',
      deviceName: '',
      brand: '',
      imei: '',
      serialNumber: '',
      assignedTo: '',
      location: '',
      currentStatus: 'Available'
    });
    setPanelOpen(true);
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const openEditPanel = (device) => {
    setEditingDevice(device);
    setFormError('');
    setCustomGroupMode(false);
    setFormData({
      mobileCode: device.mobileCode || '',
      groupId: device.groupId ? String(device.groupId) : '',
      customGroupName: '',
      deviceName: device.mobileName || device.model || '',
      brand: device.brand || '',
      imei: device.imei || '',
      serialNumber: device.serialNumber || '',
      assignedTo: device.phoneNumber || '',
      location: device.description || '',
      currentStatus: device.currentStatus || 'Available'
    });
    setPanelOpen(true);
    loadDeviceAuditHistory(device.mobileCode);
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    const trimmedCode = formData.mobileCode.trim();
    if (!trimmedCode) {
      setFormError('Please enter a Unique Device ID (e.g. Phone 2, New 4, Cass 7).');
      return;
    }

    const trimmedCustomGroup = formData.customGroupName.trim();
    if (customGroupMode) {
      if (!trimmedCustomGroup) {
        setFormError('Please enter a Group name.');
        return;
      }
    } else if (!formData.groupId) {
      setFormError('Please select or enter a Group.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        mobileCode: trimmedCode,
        groupId: customGroupMode ? 0 : Number(formData.groupId),
        groupName: customGroupMode ? trimmedCustomGroup : null,
        mobileName: formData.deviceName.trim() || null,
        brand: formData.brand.trim() || null,
        model: formData.deviceName.trim() || null,
        imei: formData.imei.trim() || null,
        serialNumber: formData.serialNumber.trim() || formData.imei.trim() || null,
        phoneNumber: formData.assignedTo.trim() || null,
        description: formData.location.trim() || null,
        currentStatus: formData.currentStatus || 'Available'
      };

      if (editingDevice) {
        await api.updateDevice(editingDevice.deviceId, {
          ...payload,
          isActive: true
        });
      } else {
        await api.createDevice(payload);
      }

      await loadData();
      if (onDataChange) onDataChange();

      if (editingDevice) {
        await loadDeviceAuditHistory(trimmedCode);
      } else {
        setFormData({
          mobileCode: '',
          groupId: '',
          customGroupName: '',
          deviceName: '',
          brand: '',
          imei: '',
          serialNumber: '',
          assignedTo: '',
          location: ''
        });
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save mobile device');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (device) => {
    if (
      !window.confirm(
        `Delete ${device.mobileCode} (${device.phoneNumber || device.mobileName || 'Unnamed'})?`
      )
    ) {
      return;
    }

    try {
      await api.deleteDevice(device.deviceId);
      if (editingDevice?.deviceId === device.deviceId) {
        setEditingDevice(null);
        setDeviceHistory([]);
      }
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      alert(err.message || 'Failed to delete phone');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Category / Unique ID',
      'Assigned Employee (Name)',
      'Group',
      'Device Name / Model',
      'Brand',
      'IMEI',
      'Serial Number',
      'Status',
      'Last Known Location',
      'Last Physical Verification (Colombo)'
    ];
    const rows = filteredDevices.map((d) => [
      d.mobileCode,
      d.phoneNumber || '',
      d.groupName || '',
      d.mobileName || d.model || '',
      d.brand || '',
      d.imei || '',
      d.serialNumber || '',
      d.currentStatus === 'Available' ? 'FOUND (Available)' : 'MISSING',
      d.description || '',
      d.lastCheckedAtColombo || d.createdAtColombo || ''
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((e) =>
          e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'htsk_mobile_inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Counts for top filter tabs
  const totalCount = allDevices.length;
  const assignedCount = allDevices.filter(
    (d) =>
      d.currentStatus !== 'Missing' &&
      d.phoneNumber &&
      d.phoneNumber.trim().length > 0
  ).length;
  const availableStockCount = allDevices.filter(
    (d) =>
      d.currentStatus !== 'Missing' &&
      (!d.phoneNumber || d.phoneNumber.trim().length === 0)
  ).length;
  const missingCount = allDevices.filter(
    (d) => d.currentStatus === 'Missing'
  ).length;

  // Category counts matching the Excel sheet ("Phone *", "New *", "Cass *")
  const phoneCatCount = allDevices.filter((d) =>
    (d.mobileCode || '').toLowerCase().startsWith('phone')
  ).length;
  const newCatCount = allDevices.filter((d) =>
    (d.mobileCode || '').toLowerCase().startsWith('new')
  ).length;
  const cassCatCount = allDevices.filter((d) =>
    (d.mobileCode || '').toLowerCase().startsWith('cass')
  ).length;

  const effectiveStatusFilter =
    statusDropdown || (statusTab !== 'ALL' ? statusTab : '');

  const filteredDevices = allDevices.filter((d) => {
    if (selectedGroup && String(d.groupId) !== String(selectedGroup)) {
      return false;
    }
    if (categoryPrefix !== 'ALL') {
      const code = (d.mobileCode || '').toLowerCase();
      if (!code.startsWith(categoryPrefix.toLowerCase())) return false;
    }
    if (effectiveStatusFilter === 'Assigned') {
      if (
        d.currentStatus === 'Missing' ||
        !d.phoneNumber ||
        !d.phoneNumber.trim()
      ) {
        return false;
      }
    } else if (effectiveStatusFilter === 'Available') {
      if (
        d.currentStatus === 'Missing' ||
        (d.phoneNumber && d.phoneNumber.trim().length > 0)
      ) {
        return false;
      }
    } else if (
      effectiveStatusFilter &&
      d.currentStatus?.toLowerCase() !== effectiveStatusFilter.toLowerCase()
    ) {
      return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const rawNum = q.startsWith('#') ? q.slice(1) : q;
      const match =
        String(d.identificationNumber || d.deviceId) === rawNum ||
        (d.mobileCode || '').toLowerCase().includes(q) ||
        (d.phoneNumber || '').toLowerCase().includes(q) ||
        (d.mobileName || '').toLowerCase().includes(q) ||
        (d.model || '').toLowerCase().includes(q) ||
        (d.brand || '').toLowerCase().includes(q) ||
        (d.imei || '').toLowerCase().includes(q) ||
        (d.serialNumber || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.groupName || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedDevices = filteredDevices.slice(
    startIndex,
    startIndex + pageSize
  );

  const formatCheckTime = (colomboStr) => {
    if (!colomboStr) return { time: 'Not verified', date: 'Registered' };
    const parts = colomboStr.split(' ');
    if (parts.length >= 2) {
      const [hh, mm] = parts[1].split(':');
      const h = parseInt(hh, 10);
      if (!isNaN(h)) {
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return { time: `${h12}:${mm} ${suffix}`, date: parts[0] };
      }
    }
    return { time: colomboStr, date: 'Verified' };
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1a6e3c]">
            DEVICE REGISTRATION &amp; EMPLOYEE ASSIGNMENT
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Mobile Phones &amp; Employee Assignments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete company device registry ({totalCount} registered devices) with unique IDs, assigned employees, IMEI/serial numbers, and handover tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:space-x-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Export CSV</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openAddPanel}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-4 py-2 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Register Device</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs + Excel Category Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div
          role="tablist"
          aria-label="Filter phones by status"
          className="flex items-center space-x-5 text-xs overflow-x-auto"
        >
          {[
            { id: 'ALL', label: 'All Registered Devices', count: totalCount },
            { id: 'Assigned', label: 'Active / Assigned', count: assignedCount },
            { id: 'Available', label: 'Available (In Stock)', count: availableStockCount },
            { id: 'Missing', label: 'Missing / Unverified', count: missingCount }
          ].map((tab) => {
            const isSelected = statusTab === tab.id;
            return (
              <button
                type="button"
                role="tab"
                key={tab.id}
                aria-selected={isSelected}
                onClick={() => {
                  setStatusTab(tab.id);
                  setStatusDropdown('');
                  setCurrentPage(1);
                }}
                className={`pb-2 flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
                  isSelected
                    ? 'border-[#1a6e3c] text-slate-950 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isSelected
                      ? 'bg-[#c8f53b] text-slate-950'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Excel Category Quick Filter Pills (Phone / New / Cass) */}
        <div className="flex items-center space-x-1.5 text-xs">
          {[
            { id: 'ALL', label: 'All Sheet Rows', count: totalCount },
            { id: 'Phone', label: 'Phone #', count: phoneCatCount },
            { id: 'New', label: 'New #', count: newCatCount },
            { id: 'Cass', label: 'Cass #', count: cassCatCount }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategoryPrefix(cat.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                categoryPrefix === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid: Inventory Table + Register/Update & Handover Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Inventory Table Card */}
        <div
          className={`${
            panelOpen && canEdit
              ? 'lg:col-span-8 order-2 lg:order-1'
              : 'lg:col-span-12 order-1'
          } bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-2xs`}
        >
          {/* Search & Dropdown Filters */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 pb-4">
            <div className="flex-1 min-w-0 sm:min-w-[220px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search by Unique ID (e.g. Phone 2, New 4, Cass 7), Employee, or IMEI..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by group"
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="">All Groups</option>
                {groups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    Group {g.groupName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedGroup('');
                  setCategoryPrefix('ALL');
                  setStatusDropdown('');
                  setStatusTab('ALL');
                  setCurrentPage(1);
                }}
                title="Reset filters"
                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Responsive Table Region */}
          <div
            role="region"
            aria-label="Mobile phones inventory"
            tabIndex={0}
            className="overflow-x-auto focus:outline-none"
          >
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading mobile inventory...
              </div>
            ) : paginatedDevices.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No mobile phones match your filter criteria.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50/80 border-y border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">UNIQUE ID (CATEGORY)</th>
                    <th className="py-2.5 px-3">ASSIGNED EMPLOYEE</th>
                    <th className="py-2.5 px-3">GROUP</th>
                    <th className="py-2.5 px-3">DEVICE &amp; IMEI / SERIAL</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">LAST VERIFIED</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedDevices.map((d) => {
                    const isAvailable = d.currentStatus === 'Available';
                    const checkInfo = formatCheckTime(
                      d.lastCheckedAtColombo || d.createdAtColombo
                    );
                    const modelLabel =
                      d.mobileName ||
                      [d.brand, d.model].filter(Boolean).join(' ') ||
                      'iPhone 15';

                    return (
                      <tr
                        key={d.deviceId}
                        className="hover:bg-lime-50/40 transition"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#f6f9f4] border border-slate-200 flex items-center justify-center text-[#1a6e3c] shrink-0">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[#c8f53b] font-mono text-[10px] font-black tracking-tight" title="Permanent Sequential Identification Number (1 to Infinity)">
                                  #{d.identificationNumber || d.deviceId}
                                </span>
                                <span>{d.mobileCode}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                {d.description || 'HQ Station'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#1a6e3c] shrink-0" />
                            <span>{d.phoneNumber || 'Unassigned'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Updated {d.updatedAtColombo?.split(' ')[0] || 'Today'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                            {d.groupName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            {modelLabel}
                          </div>
                          <div className="text-[11px] font-mono text-slate-700">
                            <span className="font-semibold text-slate-500">IMEI:</span> <span className="font-bold text-slate-950 font-mono select-all">{d.imei || '—'}</span> · <span className="text-slate-500">{d.serialNumber || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {d.currentStatus === 'Missing' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              <span>MISSING</span>
                            </span>
                          ) : d.phoneNumber && d.phoneNumber.trim() ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#c4f5fc] text-slate-900 border border-cyan-300">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Active / Assigned</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Available</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            {checkInfo.time}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {checkInfo.date} · {d.lastCheckedByAdmin || 'System'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {canEdit && (
                            <div className="inline-flex items-center space-x-1">
                              {onNavigateToReturns && d.phoneNumber && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToReturns(d)}
                                  title="Return or Replace this device"
                                  className="px-2 py-1 text-[11px] font-semibold text-[#1a6e3c] hover:text-slate-950 bg-[#f6f9f4] hover:bg-[#c8f53b] border border-slate-200 rounded-lg transition inline-flex items-center space-x-1"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>Return / Replace</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditPanel(d)}
                                aria-label={`Edit ${d.mobileCode}`}
                                title="Update device or reassign employee"
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-[#c8f53b] rounded-lg transition inline-flex items-center space-x-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Update</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeactivate(d)}
                                aria-label={`Delete ${d.mobileCode}`}
                                title={`Delete ${d.mobileCode}`}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Showing{' '}
              {filteredDevices.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + pageSize, filteredDevices.length)} of{' '}
              {filteredDevices.length} devices
            </span>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold"
              >
                ‹ Prev
              </button>
              <span className="px-2 font-bold text-slate-700">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Register Device / Update Assignment & Handover History */}
        {panelOpen && canEdit && (
          <div
            ref={panelRef}
            className="lg:col-span-4 order-1 lg:order-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingDevice
                    ? `Update ${editingDevice.mobileCode}`
                    : 'Register Mobile Device'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingDevice
                    ? 'Update device details, record employee handover, or change location.'
                    : 'Assign a unique ID, group, employee, and IMEI/Serial.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close panel"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePhone} className="space-y-3.5">
              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700"
                >
                  {formError}
                </div>
              )}

              {/* Unique Device ID * */}
              <div>
                <label
                  htmlFor="panel-mobile-id"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Unique Device ID (Category){' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="panel-mobile-id"
                  type="text"
                  required
                  placeholder="e.g. Phone 2, New 4, Cass 7, PN 001"
                  value={formData.mobileCode}
                  onChange={(e) =>
                    setFormData({ ...formData, mobileCode: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
                />
              </div>

              {/* Assigned Employee * */}
              <div>
                <label
                  htmlFor="panel-assigned"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Assigned Employee (Current User)
                </label>
                <input
                  id="panel-assigned"
                  type="text"
                  placeholder="e.g. David joseph, Olivia Oimin"
                  value={formData.assignedTo}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedTo: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
                />
              </div>

              {/* Group * */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="panel-group"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Group <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomGroupMode((prev) => !prev);
                      setFormError('');
                    }}
                    className="text-[11px] font-semibold text-[#1a6e3c] hover:underline"
                  >
                    {customGroupMode
                      ? 'Choose existing group'
                      : '+ Type new group'}
                  </button>
                </div>

                {customGroupMode ? (
                  <input
                    id="panel-group"
                    type="text"
                    required
                    placeholder="Enter group code (e.g. D, E, AO, AH)"
                    value={formData.customGroupName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customGroupName: e.target.value
                      })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
                  />
                ) : (
                  <select
                    id="panel-group"
                    required
                    value={formData.groupId}
                    onChange={(e) =>
                      setFormData({ ...formData, groupId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
                  >
                    <option value="">Select a group...</option>
                    {groups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        Group {g.groupName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="panel-brand"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Brand
                  </label>
                  <input
                    id="panel-brand"
                    type="text"
                    placeholder="e.g. Apple"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label
                    htmlFor="panel-device-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Device Model
                  </label>
                  <input
                    id="panel-device-name"
                    type="text"
                    placeholder="e.g. iPhone 15"
                    value={formData.deviceName}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* IMEI & Serial Number */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="panel-imei"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    IMEI Number 1/2
                  </label>
                  <input
                    id="panel-imei"
                    type="text"
                    placeholder="15-digit IMEI"
                    value={formData.imei}
                    onChange={(e) =>
                      setFormData({ ...formData, imei: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label
                    htmlFor="panel-serial"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Serial Number
                  </label>
                  <input
                    id="panel-serial"
                    type="text"
                    placeholder="e.g. SN-HTSK-0001"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Last Known Location */}
              <div>
                <label
                  htmlFor="panel-location"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Last Known Location / Station
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="panel-location"
                    type="text"
                    placeholder="e.g. Main Floor · Group D Station"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Device Physical Verification / Stock Status */}
              <div>
                <label
                  htmlFor="panel-status"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Device Status / Physical Verification
                </label>
                <select
                  id="panel-status"
                  value={formData.currentStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, currentStatus: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
                >
                  <option value="Available">FOUND (Available / In Service)</option>
                  <option value="Missing">MISSING (Flagged during physical check)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDevice(null);
                    setDeviceHistory([]);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 rounded-lg text-xs font-extrabold shadow-xs transition disabled:opacity-50"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>
                    {saving
                      ? 'Saving...'
                      : editingDevice
                      ? 'Save Update & Log Handover'
                      : 'Register Device'}
                  </span>
                </button>
              </div>
            </form>

            {/* Previous Assignment & Verification History for Selected Device */}
            {editingDevice && (
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                  <History className="w-3.5 h-3.5 text-[#1a6e3c]" />
                  <span>
                    Assignment Handovers &amp; Verification Log ({editingDevice.mobileCode})
                  </span>
                </div>
                {loadingHistory ? (
                  <div className="text-[11px] text-slate-400">
                    Loading device history...
                  </div>
                ) : deviceHistory.length === 0 ? (
                  <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg">
                    Registered on {editingDevice.createdAtColombo} · Assigned to{' '}
                    <strong>{editingDevice.phoneNumber || 'Unassigned'}</strong>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {deviceHistory.map((h) => (
                      <div
                        key={h.checkRecordId}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>
                            {h.deviceStatus === 'Available'
                              ? '✓ Verified FOUND'
                              : '✕ Marked MISSING'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {h.checkedAtColombo}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          By: <strong>{h.checkedByAdmin}</strong> (Group {h.groupName})
                        </div>
                        {h.notes && (
                          <div className="text-slate-500 mt-0.5 italic">
                            {h.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
