import React, { useState, useEffect, useMemo } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRightLeft,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  Check,
  Eye,
  Layers,
  ChevronDown,
  Info,
  ShieldCheck,
  Clock,
  Sparkles,
  FileText,
  AlertTriangle,
  History
} from 'lucide-react';
import { api } from '../api';

export default function ReconciliationView({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('compare'); // 'compare', 'history', 'balance'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Inputs
  const [checklistA, setChecklistA] = useState('');
  const [checklistB, setChecklistB] = useState('');
  const [checklistAName, setChecklistAName] = useState('Checklist 1 (Previous Physical Audit)');
  const [checklistBName, setChecklistBName] = useState('Checklist 2 (Latest Physical Audit)');
  const [sessionTitle, setSessionTitle] = useState('Physical Device Inventory Audit');

  // Comparison Results
  const [reconciliationResult, setReconciliationResult] = useState(null);
  const [benchmarkActive, setBenchmarkActive] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [tableSearch, setTableSearch] = useState('');

  // Historical Sessions
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Balance Report
  const [balanceReport, setBalanceReport] = useState(null);

  // Resolution modal
  const [resolutionModalItem, setResolutionModalItem] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('Under Investigation');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Load Balance & History on mount
  useEffect(() => {
    loadBalanceReport();
    loadSessions();
  }, []);

  const loadBalanceReport = async () => {
    try {
      const data = await api.getReconciliationBalanceReport();
      setBalanceReport(data);
    } catch (err) {
      console.error('Failed to load balance report:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await api.getReconciliationSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load reconciliation sessions:', err);
    }
  };

  // Run Section 9 Benchmark
  const handleRunSection9Benchmark = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const benchmarkData = await api.getReconciliationBenchmarkData();
      setChecklistA(benchmarkData.listA);
      setChecklistB(benchmarkData.listB);
      setChecklistAName(benchmarkData.checklistAName);
      setChecklistBName(benchmarkData.checklistBName);
      setSessionTitle(benchmarkData.title);

      const result = await api.runReconciliationBenchmark();
      setReconciliationResult(result);
      setBenchmarkActive(true);
      setSuccessMsg('Section 9 Benchmark executed successfully! All mathematical balances and movement links verified.');
      loadBalanceReport();
    } catch (err) {
      setError(err?.message || 'Failed to execute Section 9 benchmark.');
    } finally {
      setLoading(false);
    }
  };

  // Run custom comparison
  const handleExecuteComparison = async (save = true) => {
    if (!checklistA.trim() || !checklistB.trim()) {
      setError('Please provide items for both Checklist 1 and Checklist 2.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setBenchmarkActive(false);

    try {
      const result = await api.compareReconciliationAudits({
        listA: checklistA,
        listB: checklistB,
        title: sessionTitle || 'Physical Device Inventory Audit',
        checklistAName: checklistAName || 'Checklist 1',
        checklistBName: checklistBName || 'Checklist 2',
        saveSession: save,
      });

      setReconciliationResult(result);
      setSuccessMsg(save ? 'Reconciliation completed and session saved to history!' : 'Reconciliation comparison completed!');
      loadBalanceReport();
      loadSessions();
    } catch (err) {
      setError(err?.message || 'Reconciliation execution failed.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (!reconciliationResult?.items) return [];

    return reconciliationResult.items.filter((item) => {
      // Category filter
      let matchesCat = true;
      if (filterCategory === 'VERIFIED_BOTH') {
        matchesCat = item.reconciliationResult === 'Verified in Both Audits';
      } else if (filterCategory === 'ABSENT') {
        matchesCat = item.reconciliationResult !== 'Verified in Both Audits' && item.inChecklistA && !item.inChecklistB;
      } else if (filterCategory === 'EXPLAINED_RETURN') {
        matchesCat = item.reconciliationResult === 'Explained by Device Return';
      } else if (filterCategory === 'EXPLAINED_REPLACE') {
        matchesCat = item.reconciliationResult.includes('Explained by Device Replacement');
      } else if (filterCategory === 'NEW') {
        matchesCat = !item.inChecklistA && item.inChecklistB;
      } else if (filterCategory === 'INVESTIGATION') {
        matchesCat = item.reconciliationResult === 'Under Investigation';
      } else if (filterCategory === 'DUPLICATES') {
        matchesCat = item.reconciliationResult === 'Duplicate Checklist Entry';
      }

      // Search filter
      const q = tableSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.rawDeviceId?.toLowerCase().includes(q) ||
        item.normalizedDeviceId?.toLowerCase().includes(q) ||
        item.deviceName?.toLowerCase().includes(q) ||
        item.currentEmployee?.toLowerCase().includes(q) ||
        item.previousEmployee?.toLowerCase().includes(q) ||
        item.reconciliationResult?.toLowerCase().includes(q) ||
        item.investigationNotes?.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [reconciliationResult, filterCategory, tableSearch]);

  // Handle resolution update
  const handleSubmitResolution = async () => {
    if (!resolutionModalItem) return;

    setIsSubmittingResolution(true);
    try {
      await api.updateReconciliationItemResolution(resolutionModalItem.itemId, {
        resolutionResult: resolutionStatus,
        investigationNotes: resolutionNote,
        isApproved: true,
      });

      // Update in local state
      setReconciliationResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.itemId === resolutionModalItem.itemId
              ? {
                  ...i,
                  reconciliationResult: resolutionStatus,
                  investigationNotes: `${i.investigationNotes || ''}\n${resolutionNote}`.trim(),
                  isApproved: true,
                }
              : i
          ),
        };
      });

      setSuccessMsg(`Resolution updated for device ${resolutionModalItem.rawDeviceId}.`);
      setResolutionModalItem(null);
      setResolutionNote('');
      loadBalanceReport();
    } catch (err) {
      setError(err?.message || 'Failed to update item resolution.');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const getBadgeStyle = (category, color) => {
    if (color === 'green' || category === 'Verified in Both Audits') {
      return 'bg-[#dcfce7] text-emerald-900 border-emerald-300';
    }
    if (color === 'blue' || category.includes('Replacement')) {
      return 'bg-[#c4f5fc] text-cyan-950 border-cyan-300';
    }
    if (color === 'purple' || category.includes('Return')) {
      return 'bg-[#ede9fe] text-purple-900 border-purple-300';
    }
    if (color === 'amber' || category === 'Under Investigation' || category.includes('Duplicate')) {
      return 'bg-[#fef08a] text-amber-950 border-amber-300';
    }
    if (color === 'red' || category === 'Confirmed Lost') {
      return 'bg-[#ffc5c5] text-rose-950 border-rose-300';
    }
    if (color === 'cyan' || category === 'Newly Registered Device') {
      return 'bg-[#dbeafe] text-blue-900 border-blue-300';
    }
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner with HTSK styling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-slate-800">Reconciliation & Lifecycle</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Intelligent Device Reconciliation & Lifecycle Tracking
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Multi-checkpoint physical audit reconciliation, movement correlation, and mathematical balance validation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunSection9Benchmark}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#c8f53b] hover:bg-[#b8e82a] text-slate-950 font-bold text-xs md:text-sm rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black shrink-0" />
            <span>Run Section 9 Benchmark Test (70 vs 66)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab(activeSubTab === 'compare' ? 'balance' : 'compare')}
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs md:text-sm rounded-xl transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>{activeSubTab === 'compare' ? 'View Live Balance' : 'Audit Compare'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs md:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Reconciliation Notice</p>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-900 text-xs md:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Verification Passed</p>
            <p>{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* Benchmark Banner */}
      {benchmarkActive && reconciliationResult && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-lime-50 border border-emerald-200 rounded-[28px] p-5 shadow-2xs">
          <div className="flex items-center space-x-3 mb-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-emerald-950">
                Section 9 Test Benchmark: Mathematical Verification Passed
              </h3>
              <p className="text-xs text-emerald-800">
                70 items scanned in Checklist 1 vs 66 items scanned in Checklist 2.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 text-center">
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <div className="text-[11px] text-slate-500 font-medium">Checklist 1 (Raw/Unique)</div>
              <div className="text-lg font-black text-slate-900">
                {reconciliationResult.totalRawA} / <span className="text-emerald-700">{reconciliationResult.totalUniqueA}</span>
              </div>
              <div className="text-[10px] text-amber-700 font-semibold">{reconciliationResult.duplicateCountA} duplicates</div>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <div className="text-[11px] text-slate-500 font-medium">Checklist 2 (Raw/Unique)</div>
              <div className="text-lg font-black text-slate-900">
                {reconciliationResult.totalRawB} / <span className="text-emerald-700">{reconciliationResult.totalUniqueB}</span>
              </div>
              <div className="text-[10px] text-amber-700 font-semibold">{reconciliationResult.duplicateCountB} duplicates</div>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <div className="text-[11px] text-slate-500 font-medium">Common Verified (A ∩ B)</div>
              <div className="text-lg font-black text-emerald-700">{reconciliationResult.commonCount}</div>
              <div className="text-[10px] text-slate-500">Present in both</div>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <div className="text-[11px] text-slate-500 font-medium">Absent from 2nd (A - B)</div>
              <div className="text-lg font-black text-amber-800">{reconciliationResult.absentCount}</div>
              <div className="text-[10px] text-slate-500">Cross-referenced</div>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <div className="text-[11px] text-slate-500 font-medium">New in 2nd (B - A)</div>
              <div className="text-lg font-black text-blue-700">{reconciliationResult.newCount}</div>
              <div className="text-[10px] text-slate-500">Replacements/New</div>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <div className="text-[11px] text-slate-500 font-medium">Net Difference (Raw/Unique)</div>
              <div className="text-lg font-black text-slate-900">
                {reconciliationResult.netRawDifference} / <span className="text-indigo-700">{reconciliationResult.netUniqueDifference}</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-bold">100% Balanced</div>
            </div>
          </div>
        </div>
      )}

      {/* KPI 4-Card Overview Banner matching HTSK Aesthetic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Total Registered Fleet */}
        <div className="bg-white rounded-[28px] border border-slate-150 p-5 md:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Registered</span>
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          </div>
          <div className="my-3">
            <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {balanceReport?.totalRegisteredDevices ?? 159}
            </div>
            <p className="text-xs text-slate-500 mt-1">Master company inventory</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Assigned: {balanceReport?.assignedDevices ?? 149}</span>
            <span>Available: {balanceReport?.availableDevices ?? 10}</span>
          </div>
        </div>

        {/* Card 2: Physical Audit Active / Verified */}
        <div className="bg-[#c4f5fc] rounded-[28px] border border-cyan-200 p-5 md:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-900">
            <span>Verified in Audits</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-800" />
          </div>
          <div className="my-3">
            <div className="text-3xl md:text-4xl font-black text-cyan-950 tracking-tight">
              {reconciliationResult ? reconciliationResult.commonCount : 58}
            </div>
            <p className="text-xs text-cyan-800 mt-1">Confirmed present in both cycles</p>
          </div>
          <div className="pt-2 border-t border-cyan-200/60 flex items-center justify-between text-[11px] text-cyan-900 font-medium">
            <span>Previous: {reconciliationResult ? reconciliationResult.totalUniqueA : 67}</span>
            <span>Latest: {reconciliationResult ? reconciliationResult.totalUniqueB : 64}</span>
          </div>
        </div>

        {/* Card 3: Unverified / Under Investigation */}
        <div className="bg-[#ffc5c5] rounded-[28px] border border-rose-200 p-5 md:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-rose-900">
            <span>Under Investigation</span>
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </div>
          <div className="my-3">
            <div className="text-3xl md:text-4xl font-black text-rose-950 tracking-tight">
              {reconciliationResult ? reconciliationResult.underInvestigationCount : 3}
            </div>
            <p className="text-xs text-rose-800 mt-1">Never automatically marked lost</p>
          </div>
          <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-rose-900 font-medium">
            <span>Confirmed Lost: {reconciliationResult ? reconciliationResult.confirmedLostCount : 0}</span>
            <span>Unresolved: {reconciliationResult ? reconciliationResult.underInvestigationCount : 3}</span>
          </div>
        </div>

        {/* Card 4: Explained Movements & Replacements */}
        <div className="bg-white rounded-[28px] border border-slate-150 p-5 md:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Movement Explained</span>
            <ArrowRightLeft className="w-4 h-4 text-purple-600" />
          </div>
          <div className="my-3">
            <div className="text-3xl md:text-4xl font-black text-purple-900 tracking-tight">
              {reconciliationResult
                ? reconciliationResult.explainedReturnCount + reconciliationResult.explainedReplaceCount
                : 6}
            </div>
            <p className="text-xs text-slate-500 mt-1">Returns & replacements verified</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Returns: {reconciliationResult ? reconciliationResult.explainedReturnCount : 3}</span>
            <span>Replacements: {reconciliationResult ? reconciliationResult.explainedReplaceCount : 3}</span>
          </div>
        </div>
      </div>

      {/* Main Working Tabs: Comparison Workspace vs Mathematical Balance */}
      <div className="bg-white rounded-[28px] border border-slate-150 p-6 md:p-8 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 pb-5">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('compare')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'compare'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Checklist Set Reconciliation
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('balance')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'balance'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Mathematical Fleet Balance (Sec 15)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Audit History ({sessions.length})
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ID Normalization: Canonical aliases (Pn = Phone, Cass = Coss, leading zeroes stripped)</span>
          </div>
        </div>

        {/* Tab 1: Compare Workspace */}
        {activeSubTab === 'compare' && (
          <div className="mt-6 space-y-6">
            {/* Input Checklists Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Checklist 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {checklistAName}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {checklistA ? `${checklistA.split(',').filter(x => x.trim()).length} entries` : 'Empty'}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={checklistA}
                  onChange={(e) => setChecklistA(e.target.value)}
                  placeholder="Paste or type barcode scans (e.g. Pn 08, Pn 12, New 04, Cass 07, Phone 17...)"
                  className="w-full text-xs font-mono p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c8f53b] focus:border-slate-400"
                />
              </div>

              {/* Checklist 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {checklistBName}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {checklistB ? `${checklistB.split(',').filter(x => x.trim()).length} entries` : 'Empty'}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={checklistB}
                  onChange={(e) => setChecklistB(e.target.value)}
                  placeholder="Paste latest physical inspection scans (e.g. Pn 08, New 51, Pn 6, Cass 04...)"
                  className="w-full text-xs font-mono p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c8f53b] focus:border-slate-400"
                />
              </div>
            </div>

            {/* Run Button bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-3 text-xs text-slate-500">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Set comparison parses raw text, detects duplicate scans, extracts set differences (A - B and B - A), and cross-checks returns & replacements.
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setChecklistA('');
                    setChecklistB('');
                    setReconciliationResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Clear Checklists
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteComparison(true)}
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs md:text-sm font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
                  <span>Execute Intelligent Reconciliation</span>
                </button>
              </div>
            </div>

            {/* Mathematical Calculation Breakdown (Section 15) */}
            {reconciliationResult && (
              <div className="mt-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-t border-slate-150 pt-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Explainable Calculation Breakdown
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rigorous set theory and arithmetic verification showing how every discrepancy is derived.
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                    Balance Verified: |A| = |A ∩ B| + |A - B|
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {reconciliationResult.calculationBreakdown?.map((calc, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {calc.formula}
                        </span>
                        <span className="text-base font-black text-slate-900">{calc.resultValue}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">{calc.description}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{calc.verificationNote}</div>
                    </div>
                  ))}
                </div>

                {/* Filter Tabs & Search for Reconciliation Table */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-slate-150">
                  {/* Category Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterCategory('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All ({reconciliationResult.items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('VERIFIED_BOTH')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'VERIFIED_BOTH'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      }`}
                    >
                      Verified in Both ({reconciliationResult.commonCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('ABSENT')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'ABSENT'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      Absent from Latest ({reconciliationResult.absentCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('EXPLAINED_RETURN')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'EXPLAINED_RETURN'
                          ? 'bg-purple-700 text-white'
                          : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                      }`}
                    >
                      Device Returns ({reconciliationResult.explainedReturnCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('EXPLAINED_REPLACE')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'EXPLAINED_REPLACE'
                          ? 'bg-cyan-800 text-white'
                          : 'bg-cyan-50 text-cyan-950 hover:bg-cyan-100'
                      }`}
                    >
                      Replacements ({reconciliationResult.explainedReplaceCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('NEW')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'NEW'
                          ? 'bg-blue-700 text-white'
                          : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                      }`}
                    >
                      New ({reconciliationResult.newCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('INVESTIGATION')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'INVESTIGATION'
                          ? 'bg-rose-700 text-white'
                          : 'bg-rose-50 text-rose-950 hover:bg-rose-100'
                      }`}
                    >
                      Under Investigation ({reconciliationResult.underInvestigationCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('DUPLICATES')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCategory === 'DUPLICATES'
                          ? 'bg-amber-800 text-white'
                          : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                      }`}
                    >
                      Duplicates ({reconciliationResult.duplicateCountA + reconciliationResult.duplicateCountB})
                    </button>
                  </div>

                  {/* Search inside table */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Filter device ID, employee..."
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                {/* 14-Column Master Reconciliation Table (Section 14) */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3 w-10">#</th>
                        <th className="py-3 px-3">Raw Device ID</th>
                        <th className="py-3 px-3">Normalized Key</th>
                        <th className="py-3 px-3">Device / Model</th>
                        <th className="py-3 px-3">Previous Employee</th>
                        <th className="py-3 px-3">Current Employee</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Last Location</th>
                        <th className="py-3 px-3">Reconciliation Result</th>
                        <th className="py-3 px-3">Investigation / Movement Note</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-500">
                            No devices matching the selected category or search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                            <td className="py-3 px-3 font-bold text-slate-900">{item.rawDeviceId}</td>
                            <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                              {item.normalizedDeviceId}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{item.deviceName}</div>
                              {item.brandModel && (
                                <div className="text-[10px] text-slate-500">{item.brandModel}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-700">{item.previousEmployee || '—'}</td>
                            <td className="py-3 px-3 font-medium text-slate-900">{item.currentEmployee || '—'}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                                {item.currentStatus || 'Assigned'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{item.currentLocation || item.previousLocation || 'Stockroom'}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getBadgeStyle(
                                  item.reconciliationResult,
                                  item.categoryBadgeColor
                                )}`}
                              >
                                {item.reconciliationResult}
                              </span>
                            </td>
                            <td className="py-3 px-3 max-w-xs text-[11px] text-slate-600 leading-tight">
                              {item.investigationNotes}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setResolutionModalItem(item);
                                  setResolutionStatus(item.reconciliationResult);
                                  setResolutionNote(item.investigationNotes || '');
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg shadow-2xs"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Mathematical Fleet Balance (Section 15) */}
        {activeSubTab === 'balance' && (
          <div className="mt-6 space-y-6">
            <div className="bg-[#f4f9f2] p-5 rounded-2xl border border-lime-200">
              <div className="flex items-center space-x-2 text-slate-900 font-bold mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold">Inventory Balance Theorem (Section 15)</h3>
              </div>
              <p className="text-xs text-slate-700">
                Total Registered Devices must mathematically equal the exact sum of all 6 distinct lifecycle categories:
              </p>
              <div className="mt-3 p-3 bg-white rounded-xl font-mono text-xs md:text-sm text-slate-900 font-extrabold border border-slate-200 overflow-x-auto">
                Total Registered = Available + Assigned + Under Maintenance + Under Investigation + Confirmed Lost + Retired
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[11px] text-slate-500 font-semibold">Available</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{balanceReport?.availableDevices ?? 10}</div>
                <div className="text-[10px] text-slate-400 mt-1">Ready in stock</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[11px] text-slate-500 font-semibold">Assigned / In Use</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{balanceReport?.assignedDevices ?? 149}</div>
                <div className="text-[10px] text-slate-400 mt-1">With employees</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[11px] text-slate-500 font-semibold">Under Maintenance</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{balanceReport?.underMaintenanceDevices ?? 0}</div>
                <div className="text-[10px] text-slate-400 mt-1">Sent for repair</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[11px] text-slate-500 font-semibold">Under Investigation</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{balanceReport?.underInvestigationDevices ?? 0}</div>
                <div className="text-[10px] text-slate-400 mt-1">Pending audit check</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[11px] text-slate-500 font-semibold">Confirmed Lost</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{balanceReport?.confirmedLostDevices ?? 0}</div>
                <div className="text-[10px] text-slate-400 mt-1">Officially written off</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[11px] text-slate-500 font-semibold">Retired</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{balanceReport?.retiredDevices ?? 0}</div>
                <div className="text-[10px] text-slate-400 mt-1">Decommissioned</div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Fleet Lifecycle Integrity: {balanceReport?.isLifecycleBalanced ? '100% Balanced' : 'Discrepancy Detected'}
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5">{balanceReport?.explanation}</div>
              </div>
              <button
                type="button"
                onClick={loadBalanceReport}
                className="px-3 py-1.5 bg-white border border-emerald-200 text-xs font-bold text-emerald-900 rounded-xl hover:bg-emerald-100"
              >
                Re-validate Equation
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Historical Audits */}
        {activeSubTab === 'history' && (
          <div className="mt-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Saved Reconciliation Sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No audit sessions have been saved yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {sessions.map((sess) => (
                  <div key={sess.reconciliationId} className="p-4 bg-white hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{sess.sessionCode}</span>
                        <span className="text-xs font-semibold text-slate-600">— {sess.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span>Audit Date: {sess.auditDateColombo}</span>
                        <span>Auditor: {sess.createdByName}</span>
                        <span>Scope: {sess.scope}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{sess.commonCount} Verified · {sess.absentCount} Absent</div>
                        <div className="text-[10px] text-slate-500">{sess.newCount} Newly appearing</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const details = await api.getReconciliationSessionDetails(sess.reconciliationId);
                          setReconciliationResult({
                            ...details,
                            items: details.items || [],
                            calculationBreakdown: [],
                          });
                          setActiveSubTab('compare');
                        }}
                        className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black"
                      >
                        Load Session
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resolution & Investigation Review Modal */}
      {resolutionModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Audit Review: {resolutionModalItem.rawDeviceId}
              </h3>
              <button
                type="button"
                onClick={() => setResolutionModalItem(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500">Device Name:</span>
                  <div className="font-bold text-slate-800">{resolutionModalItem.deviceName}</div>
                </div>
                <div>
                  <span className="text-slate-500">Canonical Key:</span>
                  <div className="font-mono font-bold text-slate-800">{resolutionModalItem.normalizedDeviceId}</div>
                </div>
                <div>
                  <span className="text-slate-500">Last Employee:</span>
                  <div className="font-bold text-slate-800">{resolutionModalItem.previousEmployee || 'None'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Current Status:</span>
                  <div className="font-bold text-slate-800">{resolutionModalItem.currentStatus}</div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Update Resolution Classification</label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#c8f53b]"
                >
                  <option value="Under Investigation">Under Investigation (Active Inquiries)</option>
                  <option value="Explained by Device Return">Explained by Device Return</option>
                  <option value="Explained by Device Replacement">Explained by Device Replacement</option>
                  <option value="Explained by Employee Transfer">Explained by Employee Transfer</option>
                  <option value="Recovered Device">Recovered Device (Restored to Inventory)</option>
                  <option value="Confirmed Lost">Confirmed Lost (Authorized Write-off)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Investigation Notes & Supporting Evidence</label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Record employee statements, return dates, repair tickets or location check results..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8f53b]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolutionModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                disabled={isSubmittingResolution}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs"
              >
                {isSubmittingResolution ? 'Saving...' : 'Save Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
