'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronLeft, ChevronRight,
  ExternalLink, MoreHorizontal, Video, CalendarDays,
} from 'lucide-react';
import { getMeetings } from '@/lib/api';

function formatTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatDateShort(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isSameDay(dt, ref) {
  return new Date(dt).toDateString() === ref.toDateString();
}

// Beach umbrella empty-state SVG (matches Zoom's illustration style)
function UmbrellaIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sand mound */}
      <ellipse cx="45" cy="78" rx="32" ry="8" fill="#E8E4D9" />
      {/* Pole */}
      <line x1="45" y1="38" x2="53" y2="78" stroke="#B8A98A" strokeWidth="2.5" strokeLinecap="round" />
      {/* Umbrella canopy */}
      <path d="M18 38 Q45 10 72 38 Q58 30 45 32 Q32 30 18 38Z" fill="#A8C4E0" />
      <path d="M18 38 Q32 30 45 32 Q32 44 18 38Z" fill="#7FAFD4" />
      <path d="M45 32 Q58 30 72 38 Q58 44 45 32Z" fill="#7FAFD4" />
      {/* Small waves */}
      <path d="M12 68 Q18 64 24 68 Q30 72 36 68" stroke="#A8C4E0" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M54 65 Q60 61 66 65 Q72 69 78 65" stroke="#A8C4E0" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
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
  const goPrev = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const goNext = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();

  const dateLabel = isToday
    ? `Today, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const filtered = meetings.filter(m => m.start_time && isSameDay(m.start_time, selectedDate));

  return (
    <div className="meetings-card">
      {/* Header */}
      <div className="meetings-card-header">
        <div className="meetings-card-title">
          <span>{dateLabel}</span>
          <ChevronDown size={14} />
        </div>
        <div className="meetings-card-ext">
          <ExternalLink size={14} />
        </div>
      </div>

      {/* Date Nav */}
      <div className="meetings-date-nav">
        <button className="date-nav-today" onClick={goToday}>
          <CalendarDays size={12} />
          <span style={{ fontSize: 11 }}>Today</span>
        </button>
        <button className="date-nav-arrow" onClick={goPrev}><ChevronLeft size={13} /></button>
        <button className="date-nav-arrow" onClick={goNext}><ChevronRight size={13} /></button>
        <div style={{ marginLeft: 'auto', color: '#999', cursor: 'pointer' }}>
          <MoreHorizontal size={15} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="meetings-empty">
          <div style={{ fontSize: 13, color: '#999' }}>Loading…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="meetings-empty">
          <UmbrellaIllustration />
          <span className="meetings-empty-text">No meetings scheduled.</span>
        </div>
      ) : (
        filtered.map((m) => (
          <div key={m.meeting_id}>
            <div
              className="meeting-item"
              id={`meeting-${m.meeting_id}`}
              onClick={() => router.push(`/join?meetingId=${m.meeting_id}`)}
            >
              <div className="meeting-item-icon">
                <Video size={13} color="#0E71EB" />
              </div>
              <div className="meeting-item-info">
                <div className="meeting-item-title">{m.title}</div>
                <div className="meeting-item-time">
                  {formatTime(m.start_time)}–{formatTime(m.end_time)}
                </div>
                <div className="meeting-item-date">
                  {formatDateShort(m.start_time)}
                </div>
                <div className="meeting-item-host">Host: {m.host_name}</div>
              </div>
              <div className="meeting-item-dots">
                <MoreHorizontal size={15} />
              </div>
            </div>
          </div>
        ))
      )}

      {/* Open recordings */}
      <div className="recordings-link">
        Open recordings &rsaquo;
      </div>
    </div>
  );
}
