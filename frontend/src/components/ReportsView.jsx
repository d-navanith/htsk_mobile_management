import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';

function getColomboTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const colombo = new Date(utc + 3600000 * 5.5);
  const yyyy = colombo.getFullYear();
  const mm = String(colombo.getMonth() + 1).padStart(2, '0');
  const dd = String(colombo.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportsView() {
  const todayStr = getColomboTodayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  const [dateReport, setDateReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState('ALL');

  const loadByDate = async (dateToLoad = selectedDate) => {
    setLoading(true);
    try {
      const data = await api.getReportByDate(dateToLoad);
      setDateReport(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedSessionId('ALL');
    loadByDate(selectedDate);
  }, [selectedDate]);

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setCalendarMonth({ year: parts[0], month: parts[1] - 1 });
    }
  };

  const changeMonth = (delta) => {
    setCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      const newY = d.getFullYear();
      const newM = d.getMonth();
      setSelectedDate(`${newY}-${String(newM + 1).padStart(2, '0')}-01`);
      return { year: newY, month: newM };
    });
  };

  const { year, month } = calendarMonth;
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });

  const formattedSelectedDate = new Date(
    `${selectedDate}T00:00:00`
  ).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const activityMap = {};
  if (Array.isArray(dateReport?.monthActivity)) {
    dateReport.monthActivity.forEach((item) => {
      activityMap[item.dateColombo] = item;
    });
  }

  const sessions = Array.isArray(dateReport?.sessions) ? dateReport.sessions : [];
  const missingItems = Array.isArray(dateReport?.missingItems)
    ? dateReport.missingItems
    : [];

  const activeSelectedSession =
    selectedSessionId === 'ALL'
      ? null
      : sessions.find((s) => String(s.sessionId) === String(selectedSessionId));

  const visibleMissing =
    selectedSessionId === 'ALL'
      ? missingItems
      : missingItems.filter(
          (m) => String(m.sessionId) === String(selectedSessionId)
        );

  const rawSummary = dateReport?.summary || {
    sessionsRun: 0,
    availableCount: 0,
    missingCount: 0
  };

  // When a specific session is clicked in "Checking Times", show its exact Available & Missing counts;
  // when "ALL" is selected, show the real latest session Available count & active Missing count for that date
  const displaySessionsCount = rawSummary.sessionsRun;
  const displayAvailableCount = activeSelectedSession
    ? activeSelectedSession.availableCount
    : rawSummary.availableCount;
  const displayMissingCount = activeSelectedSession
    ? activeSelectedSession.missingCount
    : visibleMissing.length;

  const formatTime = (colomboStr) => {
    if (!colomboStr || colomboStr === '-') return '—';
    const parts = colomboStr.split(' ');
    if (parts.length >= 2) {
      const [hh, mm] = parts[1].split(':');
      const h = parseInt(hh, 10);
      if (!isNaN(h)) {
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${mm} ${suffix}`;
      }
    }
    return colomboStr;
  };

  return (
    <div className="space-y-5">
      {/* Simple Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-[#1d4ed8]">
            REPORTS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Daily Check Report
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadByDate(selectedDate)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-2xs transition"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>
          <input
            type="date"
            aria-label="Select date"
            value={selectedDate}
            onChange={(e) => e.target.value && handleSelectDate(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
          />
          <button
            type="button"
            onClick={() => handleSelectDate(todayStr)}
            className="px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-xl text-sm font-semibold transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Layout: Left Calendar + Right At-a-Glance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 1. Left: Clean Calendar Picker (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-[#1e4e8c]" />
              <span className="text-base font-bold text-slate-900">
                {monthLabel}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-bold uppercase text-slate-500 mb-1.5">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-sm">
            {Array.from({ length: firstDayOfWeek }, (_, idx) => (
              <div key={`empty-${idx}`} className="h-10" />
            ))}

            {Array.from({ length: daysInMonth }, (_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const act = activityMap[dateStr];
              const hasMissing = act?.missingCount > 0;
              const hasSessions = act?.sessionsCount > 0;

              return (
                <button
                  type="button"
                  key={dateStr}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`h-10 rounded-xl flex flex-col items-center justify-center transition font-bold ${
                    isSelected
                      ? 'bg-[#1e4e8c] text-white shadow-xs'
                      : isToday
                      ? 'bg-[#edf4ff] text-[#1d4ed8] border border-[#bfdbfe]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{dayNum}</span>
                  {(hasSessions || hasMissing) && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        hasMissing
                          ? isSelected
                            ? 'bg-rose-300'
                            : 'bg-rose-500'
                          : isSelected
                          ? 'bg-emerald-300'
                          : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-5 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>All available</span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Has missing</span>
            </span>
          </div>
        </div>

        {/* 2. Right: At-a-Glance Results for Selected Date (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Date Title + 3 Big Numbers */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold uppercase tracking-wider text-slate-500">
                {formattedSelectedDate}
                {activeSelectedSession && (
                  <span className="ml-2 text-[#1d4ed8]">
                    · {formatTime(activeSelectedSession.startedAtColombo)} Session
                  </span>
                )}
              </div>
              {activeSelectedSession && (
                <button
                  type="button"
                  onClick={() => setSelectedSessionId('ALL')}
                  className="text-xs font-bold text-[#1d4ed8] hover:underline"
                >
                  Show full day
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-3xl font-extrabold text-slate-900">
                  {displaySessionsCount}
                </div>
                <div className="text-sm font-semibold text-slate-600 mt-1">
                  Checking Sessions
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="text-3xl font-extrabold text-emerald-600">
                  {displayAvailableCount}
                </div>
                <div className="text-sm font-semibold text-emerald-700 mt-1">
                  Available
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100">
                <div className="text-3xl font-extrabold text-rose-600">
                  {displayMissingCount}
                </div>
                <div className="text-sm font-semibold text-rose-700 mt-1">
                  Missing
                </div>
              </div>
            </div>
          </div>

          {/* Two Clean Side-by-Side Cards: Checking Times + Missing Phones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card A: Checking Sessions & Times */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#1e4e8c]" />
                  <span>Checking Times</span>
                </h2>
                {selectedSessionId !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSessionId('ALL')}
                    className="text-xs font-bold text-[#1d4ed8] hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Loading...
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">
                  No checks recorded on this date.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sessions.map((s) => {
                    const isSelected =
                      String(selectedSessionId) === String(s.sessionId);
                    return (
                      <button
                        type="button"
                        key={s.sessionId}
                        onClick={() =>
                          setSelectedSessionId(isSelected ? 'ALL' : s.sessionId)
                        }
                        className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-[#edf4ff] border-[#1d4ed8] ring-1 ring-[#1d4ed8]'
                            : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
                        }`}
                      >
                        <div>
                          <div className="text-base font-extrabold text-slate-900">
                            {formatTime(s.startedAtColombo)}
                          </div>
                          <div className="text-xs font-medium text-slate-600">
                            By {s.startedByAdmin}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-sm font-bold">
                          <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                            ✓ {s.availableCount}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-lg ${
                              s.missingCount > 0
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            ✕ {s.missingCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card B: Missing Items */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Missing Phones</span>
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-sm font-bold ${
                    visibleMissing.length > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {visibleMissing.length}
                </span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Loading...
                </div>
              ) : visibleMissing.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col items-center justify-center space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  <div className="text-base font-bold text-emerald-800">
                    No Missing Phones
                  </div>
                  <div className="text-xs font-medium text-emerald-700">
                    All checked phones are available.
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleMissing.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {m.mobileCode}{' '}
                            <span className="font-medium text-slate-600">
                              {m.mobileName ? `· ${m.mobileName}` : ''}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-600 truncate">
                            {m.groupName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-rose-700">
                          {formatTime(m.checkedAtColombo)}
                        </div>
                        <div className="text-xs font-bold text-rose-600">
                          {m.IncidentStatus || m.incidentStatus}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
