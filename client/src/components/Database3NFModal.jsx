import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle, Table, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Database3NFModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/3nf-stats')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStats(data);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} style={{ color: '#65a30d' }} />
            <h3>Third Normal Form (3NF) Database Architecture</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '80vh' }}>
          {/* Normalization Proof summary */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#16a34a' }} />
              <h4 style={{ color: '#166534', fontSize: '15px', fontWeight: 700 }}>
                Relational Schema Strictly Normalized to 3NF
              </h4>
            </div>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>1NF (Atomic Attributes):</strong> Every column holds scalar values (e.g. checkout_time, return_time); tables have primary keys; no multivalued fields.</li>
              <li><strong>2NF (No Partial Key Dependencies):</strong> All non-key attributes fully depend on their relation's primary key without composite-key anomalies.</li>
              <li><strong>3NF (No Transitive Dependencies):</strong> Non-key attributes depend solely on candidate keys. Redundant entity attributes (Person names, Groups, Devices, Sign Statuses) are decomposed into their own normalized tables with foreign key constraints.</li>
            </ul>
          </div>

          {/* Table Breakdown Cards */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Table size={16} />
              <span>3NF Normalized Relational Tables</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {stats?.tables &&
                Object.entries(stats.tables).map(([tableName, info]) => (
                  <div
                    key={tableName}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '12px',
                      backgroundColor: tableName === 'device_records' ? '#faf5ff' : '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', fontFamily: 'monospace' }}>
                        {tableName}
                      </span>
                      <span className="badge badge-green" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {info.count} rows
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                      {info.columns.map((col, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            color: col.includes('PK') ? '#b45309' : col.includes('FK') ? '#2563eb' : '#4b5563',
                            fontFamily: 'monospace'
                          }}
                        >
                          • {col}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* SQL Relational JOIN snippet */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Live 3NF Relational Query
            </h4>
            <pre
              style={{
                backgroundColor: '#1f2937',
                color: '#f9fafb',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                lineHeight: 1.5,
                fontFamily: 'Consolas, monospace'
              }}
            >
{`SELECT 
  dr.id,
  p.name AS "Name",
  dr.checkout_time AS "Time",
  g.group_name AS "Group",
  dr.return_time AS "Return Time",
  d.device_info AS "Device Details",
  s.status_name AS "Sign"
FROM device_records dr
JOIN persons p       ON dr.person_id = p.id
JOIN groups g        ON dr.group_id = g.id
JOIN devices d       ON dr.device_id = d.id
JOIN sign_statuses s ON dr.sign_status_id = s.id
ORDER BY dr.id ASC;`}
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
