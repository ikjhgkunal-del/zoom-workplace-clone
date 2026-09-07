'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, CalendarDays, ChevronLeft, ChevronRight,
  MoreHorizontal, Video, ChevronDown,
} from 'lucide-react';
import { getMeetings } from '@/lib/api';

function formatTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateLabel(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isSameDay(dt, dateObj) {
  const d = new Date(dt);
  return d.toDateString() === dateObj.toDateString();
}

export default function UpcomingMeetings() {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    getMeetings('all')
      .then(setMeetings)
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, []);

  const goToday = () => setSelectedDate(new Date());
  const goPrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const filtered = meetings.filter(m => isSameDay(m.start_time, selectedDate));
  const upcoming = meetings.filter(m => m.status !== 'ended' && new Date(m.start_time) >= new Date());

  const dateLabel = selectedDate.toDateString() === new Date().toDateString()
    ? `Today, ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const displayMeetings = filtered.length > 0 ? filtered : upcoming.slice(0, 5);

  return (
    <div className="meetings-card">
      {/* Header */}
      <div className="meetings-card-header">
        <div className="meetings-card-date">
          <Plus size={16} color="#888" />
          <span style={{ fontWeight: 500 }}>{dateLabel}</span>
          <ChevronDown size={14} color="#888" />
        </div>
        <div className="meetings-card-add">
          <MoreHorizontal size={16} />
        </div>
      </div>

      {/* Date Navigation */}
      <div className="meetings-date-nav">
        <button className="date-nav-today" onClick={goToday}>
          <CalendarDays size={13} />
          <span>today</span>
        </button>
        <button className="date-nav-arrow" onClick={goPrev}>
          <ChevronLeft size={14} />
        </button>
        <button className="date-nav-arrow" onClick={goNext}>
          <ChevronRight size={14} />
        </button>
        <div className="date-nav-dots" style={{ marginLeft: 'auto' }}>
          <MoreHorizontal size={16} />
        </div>
      </div>

      {/* Meeting List */}
      {loading ? (
        <div className="no-meetings">Loading meetings…</div>
      ) : displayMeetings.length === 0 ? (
        <div className="no-meetings">No meetings scheduled for this day.</div>
      ) : (
        displayMeetings.map((m) => (
          <div
            key={m.meeting_id}
            className="meeting-item"
            id={`meeting-item-${m.meeting_id}`}
            onClick={() => router.push(`/join?meetingId=${m.meeting_id}`)}
          >
            <div className="meeting-item-icon">
              <Video size={16} color="#0E71EB" />
            </div>
            <div className="meeting-item-info">
              <div className="meeting-item-title">{m.title}</div>
              <div className="meeting-item-meta">
                <span>{formatDateLabel(m.start_time)}, {m.start_time?.slice(0, 10)?.replace(/-/g, '/')?.split('/').slice(1).join('/')}</span>
                <span>{formatTime(m.start_time)} – {formatTime(m.end_time)}</span>
              </div>
              <div className="meeting-item-host">Host: {m.host_name}</div>
            </div>
            <div className="meeting-item-actions">
              <MoreHorizontal size={16} />
            </div>
          </div>
        ))
      )}

      {/* Recordings Link */}
      <div className="recordings-link" role="button">
        Open recordings &rsaquo;
      </div>
    </div>
  );
}
