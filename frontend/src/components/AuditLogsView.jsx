import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  ArrowRight,
  Database,
  Layers,
  ChevronLeft,
  ChevronRight,
  Lock
} from 'lucide-react';
import { api } from '../api';

export default function AuditLogsView({ user }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const isDeveloper = user?.role === 'Developer';

  useEffect(() => {
    if (isDeveloper) {
      loadStats();
    }
  }, [isDeveloper]);

  useEffect(() => {
    if (isDeveloper) {
      loadLogs();
    }
  }, [search, actionFilter, entityFilter, page, isDeveloper]);

  const loadStats = async () => {
    try {
      const data = await api.getAuditLogStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load audit log stats:', err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditLogs({
        search,
        actionType: actionFilter,
        entityName: entityFilter,
        page,
        pageSize: 15,
      });
      setLogs(res.logs || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      setError(err?.message || 'Failed to retrieve system audit logs.');
    } finally {
      setLoading(false);
    }
  };

  if (!isDeveloper) {
    return (
      <div className="bg-white rounded-[28px] border border-rose-200 p-8 text-center max-w-lg mx-auto shadow-sm my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Developer Access Required</h2>
        <p className="text-xs text-slate-600 mt-2">
          System Audit Logs are restricted exclusively to Developer accounts. Administrators and staff cannot inspect internal system transaction journals.
        </p>
      </div>
    );
  }

  const getActionBadge = (action) => {
    switch (action) {
      case 'CreateDevice':
        return 'bg-emerald-100 text-emerald-950 border-emerald-300';
      case 'UpdateDevice':
        return 'bg-blue-100 text-blue-950 border-blue-300';
      case 'DeleteDevice':
        return 'bg-rose-100 text-rose-950 border-rose-300';
      case 'DeviceReturn':
        return 'bg-purple-100 text-purple-950 border-purple-300';
      case 'DeviceReplacement':
      case 'ReturnAndReplacement':
        return 'bg-cyan-100 text-cyan-950 border-cyan-300';
      case 'SystemConfig':
      case 'PermissionChange':
        return 'bg-amber-100 text-amber-950 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const filteredLogs = logs.filter(
    (l) => !l.action?.includes('BCNF') && !l.action?.includes('Migration')
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Developer Console</span>
            <span>/</span>
            <span className="text-slate-800">Security & Integrity</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
            <span>Developer System Audit Logs</span>
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#c8f53b] text-slate-950 border border-lime-400">
              Developer Exclusive
            </span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Immutable system audit trail tracking device lifecycles, returns, replacements, permissions, and operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadStats();
            loadLogs();
          }}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs md:text-sm font-bold rounded-xl shadow-2xs transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Journal</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[28px] border border-slate-150 p-5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Total Audit Logs</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{stats?.totalAuditLogs ?? totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Historical system events recorded</p>
        </div>

        <div className="bg-[#c4f5fc] rounded-[28px] border border-cyan-200 p-5 shadow-2xs">
          <div className="text-xs font-bold text-cyan-900">Today's Transactions</div>
          <div className="text-3xl font-black text-cyan-950 mt-1">{stats?.logsToday ?? 0}</div>
          <p className="text-[11px] text-cyan-800 mt-1">Logged within current UTC day</p>
        </div>

        <div className="bg-white rounded-[28px] border border-slate-150 p-5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Inventory Protection</div>
          <div className="text-3xl font-black text-slate-900 mt-1">Active</div>
          <p className="text-[11px] text-slate-400 mt-1">Real-time lifecycle & return tracking</p>
        </div>

        <div className="bg-white rounded-[28px] border border-slate-150 p-5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Access Boundary</div>
          <div className="text-lg font-black text-slate-900 mt-1 flex items-center space-x-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Developer Privileged</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Isolated from Admin & Staff nav</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-150 p-6 md:p-8 shadow-2xs space-y-5">
        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search action, user, device ID..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Action Types</option>
              <option value="CreateDevice">Create Device</option>
              <option value="UpdateDevice">Update Device</option>
              <option value="DeleteDevice">Delete Device</option>
              <option value="DeviceReturn">Device Return</option>
              <option value="DeviceReplacement">Device Replacement</option>
              <option value="ReturnAndReplacement">Return & Replace</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              <option value="MobileDevice">MobileDevice</option>
              <option value="CheckSession">CheckSession</option>
              <option value="Database">Database</option>
              <option value="User">User</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {logs.length} of {totalCount} log entries
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Audit Logs Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-12">#</th>
                <th className="py-3 px-3">Timestamp (Colombo)</th>
                <th className="py-3 px-3">Operator & Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity & Target</th>
                <th className="py-3 px-3">Audit Details & Changes</th>
                <th className="py-3 px-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading system audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.logId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">
                      {(page - 1) * 15 + idx + 1}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {log.timestampColombo}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{log.entityName}</span>
                      {log.entityId && (
                        <span className="ml-1 text-[11px] font-mono text-slate-500">#{log.entityId}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-md text-slate-700 leading-relaxed">
                      {log.details || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
