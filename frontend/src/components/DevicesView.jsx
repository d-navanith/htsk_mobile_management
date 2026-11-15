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
  Trash2
} from 'lucide-react';
import { api } from '../api';

export default function DevicesView({
  user,
  userPermissions,
  permissionDetails,
  onDataChange,
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
  const [statusTab, setStatusTab] = useState('ALL'); // ALL, Available, Missing
  const [statusDropdown, setStatusDropdown] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(canEdit);
  const [editingDevice, setEditingDevice] = useState(null);
  const [customGroupMode, setCustomGroupMode] = useState(false);
  const panelRef = useRef(null);

  // Side Panel Form State — user decides both Mobile ID and Group (never pre-filled on our own)
  const [formData, setFormData] = useState({
    mobileCode: '',
    groupId: '',
    customGroupName: '',
    deviceName: '',
    imeiOrSerial: '',
    assignedTo: '',
    location: ''
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const pageSize = 8;

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
      setAllDevices(devList);
      setGroups(grpList);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddPanel = () => {
    setEditingDevice(null);
    setFormError('');
    setCustomGroupMode(groups.length === 0);
    setFormData({
      mobileCode: '',
      groupId: '',
      customGroupName: '',
      deviceName: '',
      imeiOrSerial: '',
      assignedTo: '',
      location: ''
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
      imeiOrSerial: device.imei || device.serialNumber || '',
      assignedTo: device.phoneNumber || device.brand || '',
      location: device.description || ''
    });
    setPanelOpen(true);
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    const trimmedCode = formData.mobileCode.trim();
    if (!trimmedCode) {
      setFormError('Please enter a Mobile ID.');
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
        model: formData.deviceName.trim() || null,
        imei: formData.imeiOrSerial.trim() || null,
        serialNumber: formData.imeiOrSerial.trim() || null,
        phoneNumber: formData.assignedTo.trim() || null,
        description: formData.location.trim() || null
      };

      if (editingDevice) {
        await api.updateDevice(editingDevice.deviceId, {
          ...payload,
          brand: editingDevice.brand || null,
          isActive: true
        });
      } else {
        await api.createDevice(payload);
      }

      await loadData();
      if (onDataChange) onDataChange();

      // Reset form cleanly for next entry without auto-filling Mobile ID or Group
      setEditingDevice(null);
      setCustomGroupMode(false);
      setFormData({
        mobileCode: '',
        groupId: '',
        customGroupName: '',
        deviceName: '',
        imeiOrSerial: '',
        assignedTo: '',
        location: ''
      });
    } catch (err) {
      setFormError(err.message || 'Failed to save mobile phone');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (device) => {
    if (
      !window.confirm(
        `Delete ${device.mobileCode} (${device.mobileName || 'Unnamed'})?`
      )
    ) {
      return;
    }

    try {
      await api.deleteDevice(device.deviceId);
      if (editingDevice?.deviceId === device.deviceId) {
        setEditingDevice(null);
      }
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      alert(err.message || 'Failed to delete phone');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Mobile ID',
      'Device Name',
      'Group',
      'Status',
      'IMEI / Serial',
      'Assigned To',
      'Location',
      'Last Checked (Colombo)'
    ];
    const rows = filteredDevices.map((d) => [
      d.mobileCode,
      d.mobileName || d.model || '',
      d.groupName || '',
      d.currentStatus || '',
      d.imei || d.serialNumber || '',
      d.phoneNumber || '',
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
  const availableCount = allDevices.filter(
    (d) => d.currentStatus === 'Available'
  ).length;
  const missingCount = allDevices.filter(
    (d) => d.currentStatus === 'Missing'
  ).length;

  // Filtered list
  const effectiveStatusFilter =
    statusDropdown || (statusTab !== 'ALL' ? statusTab : '');

  const filteredDevices = allDevices.filter((d) => {
    if (selectedGroup && String(d.groupId) !== String(selectedGroup)) {
      return false;
    }
    if (
      effectiveStatusFilter &&
      d.currentStatus?.toLowerCase() !== effectiveStatusFilter.toLowerCase()
    ) {
      return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        (d.mobileCode || '').toLowerCase().includes(q) ||
        (d.mobileName || '').toLowerCase().includes(q) ||
        (d.model || '').toLowerCase().includes(q) ||
        (d.brand || '').toLowerCase().includes(q) ||
        (d.imei || '').toLowerCase().includes(q) ||
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
    if (!colomboStr) return { time: 'Not checked', date: 'Registered' };
    const parts = colomboStr.split(' ');
    if (parts.length >= 2) {
      const [hh, mm] = parts[1].split(':');
      const h = parseInt(hh, 10);
      if (!isNaN(h)) {
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return { time: `${h12}:${mm} ${suffix}`, date: 'Today' };
      }
    }
    return { time: colomboStr, date: 'Today' };
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1d4ed8]">
            DEVICE INVENTORY
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Mobile phones
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register, organize and keep track of every device.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:space-x-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Export inventory</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openAddPanel}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Add phone</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Row (All phones, Available, Missing) */}
      <div
        role="tablist"
        aria-label="Filter phones by status"
        className="flex items-center space-x-5 sm:space-x-6 border-b border-slate-200 text-xs overflow-x-auto"
      >
        {[
          { id: 'ALL', label: 'All phones', count: totalCount },
          { id: 'Available', label: 'Available', count: availableCount },
          { id: 'Missing', label: 'Missing', count: missingCount }
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
              className={`pb-2.5 flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
                isSelected
                  ? 'border-[#1e4e8c] text-[#1e4e8c] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isSelected
                    ? 'bg-[#edf4ff] text-[#1d4ed8]'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split Grid: Inventory Table + Add/Edit Phone Side Panel */}
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
            <div className="flex-1 min-w-0 sm:min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search by ID, device or IMEI..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
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
                className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
              >
                <option value="">All groups</option>
                {groups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by status"
                value={statusDropdown}
                onChange={(e) => {
                  setStatusDropdown(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
              >
                <option value="">Status</option>
                <option value="Available">Available</option>
                <option value="Missing">Missing</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedGroup('');
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
              <table className="w-full text-left border-collapse min-w-[520px]">
                <thead>
                  <tr className="bg-slate-50/70 border-y border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pl-3 pr-2 w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all phones on page"
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="py-2.5 px-3">DEVICE / MOBILE ID</th>
                    <th className="py-2.5 px-3">GROUP</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">LAST CHECKED</th>
                    <th className="py-2.5 px-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedDevices.map((d) => {
                    const isAvailable = d.currentStatus === 'Available';
                    const checkInfo = formatCheckTime(
                      d.lastCheckedAtColombo || d.createdAtColombo
                    );
                    const displayTitle =
                      d.mobileName ||
                      [d.brand, d.model].filter(Boolean).join(' ') ||
                      d.mobileCode;

                    return (
                      <tr
                        key={d.deviceId}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-3.5 pl-3 pr-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${d.mobileCode}`}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-[#f4f7fb] border border-slate-200/80 flex items-center justify-center text-[#1e4e8c] shrink-0">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {displayTitle}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {d.mobileCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                          {d.groupName}
                        </td>
                        <td className="py-3.5 px-3">
                          {isAvailable ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>Available</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              <span>Missing</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-800">
                            {checkInfo.time}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {checkInfo.date} · {d.lastCheckedByAdmin || 'System'}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          {canEdit && (
                            <div className="inline-flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => openEditPanel(d)}
                                aria-label={`Edit ${d.mobileCode}`}
                                title={`Edit ${d.mobileCode}`}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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
              {filteredDevices.length} phones
            </span>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    type="button"
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-6 h-6 rounded text-xs font-bold ${
                      safePage === pageNum
                        ? 'bg-[#edf4ff] text-[#1d4ed8]'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Add a new phone / Edit phone */}
        {panelOpen && canEdit && (
          <div
            ref={panelRef}
            className="lg:col-span-4 order-1 lg:order-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingDevice
                    ? `Edit ${editingDevice.mobileCode}`
                    : 'Add a new phone'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter your Mobile ID and Group to get started.
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

            <form onSubmit={handleSavePhone} className="mt-5 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700"
                >
                  {formError}
                </div>
              )}

              {/* Mobile ID * — User-decided editable input (no auto-lock) */}
              <div>
                <label
                  htmlFor="panel-mobile-id"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Mobile ID <span className="text-rose-500">*</span>
                </label>
                <input
                  id="panel-mobile-id"
                  type="text"
                  required
                  placeholder="Enter Mobile ID (e.g. MOB-0001)"
                  value={formData.mobileCode}
                  onChange={(e) =>
                    setFormData({ ...formData, mobileCode: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                />
              </div>

              {/* Group * — User-decided (select existing or type a new group name, never auto-selected) */}
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
                    className="text-[11px] font-semibold text-[#1d4ed8] hover:underline"
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
                    placeholder="Enter group name (e.g. Engineering)"
                    value={formData.customGroupName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customGroupName: e.target.value
                      })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                  />
                ) : (
                  <select
                    id="panel-group"
                    required
                    value={formData.groupId}
                    onChange={(e) =>
                      setFormData({ ...formData, groupId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                  >
                    <option value="">Select a group...</option>
                    {groups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {g.groupName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Device name · Optional */}
              <div>
                <label
                  htmlFor="panel-device-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Device name{' '}
                  <span className="text-slate-400 font-normal">· Optional</span>
                </label>
                <input
                  id="panel-device-name"
                  type="text"
                  placeholder="e.g. iPhone 15"
                  value={formData.deviceName}
                  onChange={(e) =>
                    setFormData({ ...formData, deviceName: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                />
              </div>

              {/* IMEI / Serial number · Optional */}
              <div>
                <label
                  htmlFor="panel-imei"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  IMEI / Serial number{' '}
                  <span className="text-slate-400 font-normal">· Optional</span>
                </label>
                <input
                  id="panel-imei"
                  type="text"
                  placeholder="Enter IMEI or serial number"
                  value={formData.imeiOrSerial}
                  onChange={(e) =>
                    setFormData({ ...formData, imeiOrSerial: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                />
              </div>

              {/* Assigned to · Optional */}
              <div>
                <label
                  htmlFor="panel-assigned"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Assigned to{' '}
                  <span className="text-slate-400 font-normal">· Optional</span>
                </label>
                <input
                  id="panel-assigned"
                  type="text"
                  placeholder="Employee name or phone number"
                  value={formData.assignedTo}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedTo: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                />
              </div>

              {/* Location · Optional */}
              <div>
                <label
                  htmlFor="panel-location"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Location{' '}
                  <span className="text-slate-400 font-normal">· Optional</span>
                </label>
                <input
                  id="panel-location"
                  type="text"
                  placeholder="e.g. HQ · Floor 3"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                />
              </div>

              {/* Info Box */}
              <div className="bg-[#f4f7fb] rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
                You decide the Mobile ID and Group. New phones join the next checking session.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDevice(null);
                      setPanelOpen(false);
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                  >
                    Cancel
                  </button>

                  {editingDevice && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(editingDevice)}
                      title="Deactivate phone"
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save phone'}</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-400">* Required field</div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
