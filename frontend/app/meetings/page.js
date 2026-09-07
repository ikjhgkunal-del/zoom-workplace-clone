'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getMeetings } from '@/lib/api';
import {
  ChevronLeft, ChevronRight, Search, RefreshCw,
  SlidersHorizontal, MoreHorizontal, Plus, CalendarDays,
  Video, ChevronDown, Settings,
} from 'lucide-react';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const rows = [];
  let day = 1;
  let nextDay = 1;
  let started = false;

  for (let r = 0; r < 6; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      if (r === 0 && c < firstDay) {
        row.push({ day: daysInPrev - firstDay + c + 1, type: 'prev' });
      } else if (day > daysInMonth) {
        row.push({ day: nextDay++, type: 'next' });
      } else {
        row.push({ day: day++, type: 'current' });
      }
    }
    rows.push(row);
    if (day > daysInMonth && r >= 4) break;
  }
  return rows;
}

function formatTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function MeetingsPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    getMeetings('all').then(setMeetings).catch(() => {});
  }, []);

  const grid = buildCalendarGrid(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const todayMeetings = meetings.filter(m => {
    if (!m.start_time) return false;
    const d = new Date(m.start_time);
    return d.toDateString() === today.toDateString();
  });

  const now = new Date();
  const currentHour = now.getHours();

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="right-section">
        {/* Meetings-specific top bar */}
        <header className="topbar">
          <button className="meetings-connect-btn">
            <CalendarDays size={14} />
            Connect calendar
          </button>
          <button className="meetings-add-btn" title="New meeting">
            <Plus size={14} color="white" />
          </button>

          <div className="meetings-month-nav" style={{ marginLeft: 16 }}>
            <button className="month-nav-arrow" onClick={prevMonth}><ChevronLeft size={14} /></button>
            <span className="meetings-month-title">{monthLabel}</span>
            <button className="month-nav-arrow" onClick={nextMonth}><ChevronRight size={14} /></button>
          </div>

          <div className="meetings-view-options">
            <button className="topbar-nav-btn"><Search size={14} /></button>
            <button className="topbar-nav-btn"><RefreshCw size={13} /></button>
            <button className="topbar-nav-btn"><SlidersHorizontal size={13} /></button>
            <button className="meetings-view-btn">
              Agenda <ChevronDown size={12} />
            </button>
            <button className="topbar-nav-btn"><Settings size={14} /></button>
          </div>
        </header>

        <div className="meetings-page-layout main-content">
          {/* Left Panel — Mini Calendar */}
          <div className="meetings-left-panel">
            <div className="mini-calendar">
              <div className="mini-cal-header">
                <span className="mini-cal-title">
                  {new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="mini-cal-nav">
                  <button onClick={prevMonth}><ChevronLeft size={12} /></button>
                  <button onClick={nextMonth}><ChevronRight size={12} /></button>
                </div>
              </div>

              <table className="mini-cal-grid">
                <thead>
                  <tr>
                    {DAYS.map((d, i) => <th key={i}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => {
                        const isToday =
                          cell.type === 'current' &&
                          cell.day === today.getDate() &&
                          viewMonth === today.getMonth() &&
                          viewYear === today.getFullYear();
                        return (
                          <td key={ci}>
                            <div className={`cal-day${isToday ? ' today' : ''}${cell.type !== 'current' ? ' other-month' : ''}`}>
                              {cell.day}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Personal meeting ID */}
            <div className="meetings-user-section">
              <div className="meetings-user-avatar">TO</div>
              <div>
                <div className="meetings-user-name">test one</div>
                <a className="meetings-personal-id" href="#">679 802 4224</a>
              </div>
            </div>
          </div>

          {/* Right — Agenda */}
          <div className="meetings-main">
            <div className="meetings-today-header">Today</div>

            {todayMeetings.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
                No meetings today.
              </div>
            ) : (
              todayMeetings.map((m, idx) => {
                const startHour = new Date(m.start_time).getHours();
                const showTimeLine = idx > 0 && startHour >= currentHour;
                return (
                  <div key={m.meeting_id}>
                    {showTimeLine && (
                      <div className="current-time-line">
                        <div className="current-time-dot" />
                        <div className="current-time-bar" />
                      </div>
                    )}
                    <div className="meeting-agenda-item" id={`agenda-${m.meeting_id}`}>
                      <div className="meeting-agenda-time">
                        {formatTime(m.start_time)}<br />
                        {formatTime(m.end_time)}
                      </div>
                      <div className="meeting-agenda-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Video size={12} color="#0E71EB" />
                          <div className="meeting-agenda-title">{m.title}</div>
                        </div>
                        <div className="meeting-agenda-host">Host: {m.host_name}</div>
                      </div>
                      <div className="meeting-agenda-dots">
                        <MoreHorizontal size={15} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Current time line at end */}
            <div className="current-time-line" style={{ marginTop: 16 }}>
              <div className="current-time-dot" />
              <div className="current-time-bar" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
