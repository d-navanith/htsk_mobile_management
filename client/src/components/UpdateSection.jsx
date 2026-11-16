import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Trash2,
  File
} from 'lucide-react';

export default function UpdateSection({ onImportSuccess = () => {}, onDownloadTemplate = () => {} }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState(null);
  const fileInputRef = useRef(null);

  // Upload handler
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

  // Confirm import
  const handleConfirmImport = async () => {
    if (previewRows.length === 0) {
      setErrorMessage('Please upload a sheet first to preview and confirm.');
      return;
    }

    setConfirming(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile ? selectedFile.name : 'uploaded_sheet.xlsx',
          rows: previewRows
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to import records');
      }

      setSuccessBanner(result.message || `Successfully imported ${result.insertedCount || previewRows.length} records!`);
      setPreviewRows([]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onImportSuccess) {
        onImportSuccess(result.insertedCount);
      }
    } catch (err) {
      console.error('Confirm import error:', err);
      setErrorMessage(err.message || 'Failed to confirm and import.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header matching Image 3 */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
          Mobile Management
        </h1>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', fontWeight: 500 }}>
          Workspace / Update
        </div>
      </div>

      {successBanner && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          padding: '12px 18px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <CheckCircle size={18} />
          <span>{successBanner}</span>
        </div>
      )}

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

      {/* 1. Sheet Update Section matching Image 3 */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '14px' }}>
          Sheet Update
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
            accept=".xlsx, .xls, .csv, .docx, .pdf, .png, .jpg, .jpeg"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2563eb', marginBottom: '6px' }}>
            {uploading ? 'Processing and parsing file...' : 'Choose a file or drag & drop it here'}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            JPEG, PNG, PDF, XLSX and DOCX formats, up to 10MB
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

      {/* 2. Preview Table Section matching Image 3 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '14px' }}>
          Preview Table
        </h2>

        {previewRows.length === 0 ? (
          /* Empty gray placeholder box matching Image 3 */
          <div style={{
            backgroundColor: '#eef0f2',
            borderRadius: '18px',
            border: '1px solid #e2e5e9',
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            {uploading ? 'Parsing uploaded document...' : 'Upload a sheet above to preview records here'}
          </div>
        ) : (
          /* Populated preview table */
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ padding: '14px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>
                Found {previewRows.length} rows ready for import
              </span>
              <button
                onClick={() => { setPreviewRows([]); setSelectedFile(null); }}
                style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear Preview
              </button>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '380px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>#</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>EMP. Name</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Shift</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Group</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Issued At</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Return Time</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Return Device</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Taking Device</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Handover To</th>
                    <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', textAlign: 'center' }}>Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>{row.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px' }}>{row.shift || 'Day'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px' }}>{row.group || 'Group D'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px' }}>{row.issued_at || '7.30 A.M.'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px' }}>{row.return_time || '09.55 P.M.'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px' }}>{row.return_device || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px' }}>{row.taking_device || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px' }}>{row.handover_to || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12.5px', fontWeight: 700, color: row.sign === 'Done' ? '#16a34a' : '#ea580c' }}>
                        {row.sign || 'Done'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Confirm Button matching Image 3 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleConfirmImport}
          disabled={confirming}
          style={{
            backgroundColor: '#a3e635',
            color: '#000000',
            fontWeight: 800,
            fontSize: '14px',
            padding: '11px 32px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#84cc16'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#a3e635'}
        >
          {confirming ? 'Confirming...' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}
