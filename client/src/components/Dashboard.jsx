import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export default function Dashboard({
  records = [],
  loading = false,
  onOpenAddModal = () => {},
  onOpenEditModal = () => {},
  onDeleteRecord = () => {},
  onDownloadTemplate = () => {},
  onExportExcel = () => {},
  groups = [],
  refreshRecords = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedShift, setSelectedShift] = useState('All Shift');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const [kpis, setKpis] = useState({
    totalMobilePhones: 159,
    activeMobilePhones: 3,
    availableInStock: 156,
    needAnUpdate: 1
  });

  const fetchKpis = async () => {
    try {
      const res = await fetch('/api/kpis');
      const data = await res.json();
      if (data.success && data.data) {
        setKpis(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch KPIs:', e);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, [records]);

  // Handle inline shift change
  const handleInlineShiftChange = async (recordId, newShift) => {
    try {
      await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift: newShift })
      });
      refreshRecords();
      fetchKpis();
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
      refreshRecords();
      fetchKpis();
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

    const matchesGroup = selectedGroup === 'All Groups' || selectedGroup === 'all' || r.group_name === selectedGroup;
    const matchesShift = selectedShift === 'All Shift' || selectedShift === 'all' || r.shift === selectedShift;
    const matchesStatus =
      selectedStatus === 'All Status' ||
      selectedStatus === 'all' ||
      (r.sign || '').toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesGroup && matchesShift && matchesStatus;
  });

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Header matching Image 4 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Mobile Management
          </h1>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', fontWeight: 500 }}>
            Workspace / Dashboard
          </div>
        </div>

        {/* Top-Right Profile Pill matching Image 4 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 14px 6px 18px',
          borderRadius: '9999px',
          border: '1.5px solid #e5e7eb',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
            Shanaka
          </span>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Shanaka"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              objectFit: 'cover'
            }}
          />
        </div>
      </div>

      {/* 4 KPI Summary Cards matching Image 4 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Card 1: Total Mobile Phones */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '2px solid #84cc16',
          padding: '22px 24px',
          boxShadow: '0 2px 6px rgba(132, 204, 22, 0.06)'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
            Total Mobile Phones
          </div>
          <div style={{ fontSize: '42px', fontWeight: 800, color: '#84cc16', lineHeight: 1.1, marginBottom: '10px' }}>
            {kpis.totalMobilePhones || 159}
          </div>
          <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
            {kpis.totalMobilePhones || 159} Mobile phones available in stock
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
            {kpis.activeMobilePhones !== undefined ? kpis.activeMobilePhones : 4}
          </div>
          <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
            {String(kpis.activeMobilePhones !== undefined ? kpis.activeMobilePhones : 4).padStart(2, '0')} under active mobile phones
          </div>
        </div>

        {/* Card 3: Available in Stock */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '2px solid #eab308',
          padding: '22px 24px',
          boxShadow: '0 2px 6px rgba(234, 179, 8, 0.06)'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
            Available in Stock
          </div>
          <div style={{ fontSize: '42px', fontWeight: 800, color: '#eab308', lineHeight: 1.1, marginBottom: '10px' }}>
            {kpis.availableInStock !== undefined ? kpis.availableInStock : 155}
          </div>
          <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
            {kpis.availableInStock !== undefined ? kpis.availableInStock : 155} under available in stock
          </div>
        </div>

        {/* Card 4: Need an Update */}
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
            {kpis.needAnUpdate !== undefined ? kpis.needAnUpdate : 1}
          </div>
          <div style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 400 }}>
            {kpis.needAnUpdate !== undefined ? kpis.needAnUpdate : 1} under need an update
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar matching Image 4 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search bar pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#f3f4f6',
          borderRadius: '9999px',
          padding: '10px 20px',
          width: '380px',
          maxWidth: '100%'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

          {/* Green Add button matching Image 4 */}
          <button
            onClick={onOpenAddModal}
            style={{
              backgroundColor: '#a3e635',
              color: '#000000',
              fontWeight: 700,
              fontSize: '14px',
              padding: '9px 24px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#84cc16'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#a3e635'}
          >
            Add
          </button>
        </div>
      </div>

      {/* Main Table matching Image 4 */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                <th style={{ padding: '16px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', width: '70px', textAlign: 'center' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    {loading ? 'Loading records...' : 'No records found matching your filters.'}
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

                      {/* Device Details (Stacked Return & Taking pills matching Image 4) */}
                      <td style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Return row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                            <span style={{ color: '#6b7280', width: '52px' }}>Return:</span>
                            {r.return_device ? (
                              <span style={{
                                backgroundColor: '#f1f5f9',
                                color: '#1f2937',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}>
                                {r.return_device}
                              </span>
                            ) : null}
                          </div>

                          {/* Taking row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                            <span style={{ color: '#6b7280', width: '52px' }}>Taking:</span>
                            {r.taking_device ? (
                              <span style={{
                                backgroundColor: '#f1f5f9',
                                color: '#1f2937',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}>
                                {r.taking_device}
                              </span>
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

                      {/* Action (Yellow pencil edit icon matching Image 4) */}
                      <td style={{ padding: '16px 14px', textAlign: 'center' }}>
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
    </div>
  );
}
