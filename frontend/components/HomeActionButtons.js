'use client';
import { useRouter } from 'next/navigation';
import { Video, Plus, Calendar, ChevronDown } from 'lucide-react';
import { createInstantMeeting } from '@/lib/api';
import { useState } from 'react';

// Schedule button — shows the calendar date badge matching Zoom exactly
function ScheduleIcon() {
  return (
    <div
      className="action-btn-icon blue-schedule"
      style={{
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        {/* Calendar Card White Body */}
        <rect x="3.5" y="5.5" width="21" height="19" rx="3.5" fill="white" />
        {/* Blue Top Header Bar */}
        <path d="M3.5 9C3.5 7.067 5.067 5.5 7 5.5H21C22.933 5.5 24.5 7.067 24.5 9V10H3.5V9Z" fill="#0E71EB" />
        {/* Two Top Binder Rings */}
        <rect x="7.5" y="3" width="2.2" height="4.5" rx="1.1" fill="white" />
        <rect x="18.3" y="3" width="2.2" height="4.5" rx="1.1" fill="white" />
        {/* Date Number inside */}
        <text x="14" y="20.5" textAnchor="middle" fill="#0E71EB" fontSize="10.5" fontWeight="700" fontFamily="Inter, -apple-system, sans-serif">19</text>
      </svg>
    </div>
  );
}

export default function HomeActionButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNewMeeting = async () => {
    setLoading(true);
    try {
      const meeting = await createInstantMeeting('test one');
      router.push(`/meeting/${meeting.meeting_id}`);
    } catch {
      alert('Could not create meeting. Is the backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="action-buttons">
      {/* New Meeting — Orange Circle */}
      <button
        id="action-btn-new-meeting"
        className="action-btn"
        onClick={handleNewMeeting}
        disabled={loading}
      >
        <div className="action-btn-icon orange">
          <Video size={24} color="white" strokeWidth={2} />
        </div>
        <span className="action-btn-label">
          {loading ? 'Starting…' : 'New meeting'}
          {!loading && <ChevronDown size={10} />}
        </span>
      </button>

      {/* Join — Blue Circle */}
      <button
        id="action-btn-join"
        className="action-btn"
        onClick={() => router.push('/join')}
      >
        <div className="action-btn-icon blue">
          <Plus size={26} color="white" strokeWidth={2.5} />
        </div>
        <span className="action-btn-label">Join</span>
      </button>

      {/* Schedule — Blue Calendar Circle */}
      <button
        id="action-btn-schedule"
        className="action-btn"
        onClick={() => router.push('/schedule')}
      >
        <ScheduleIcon />
        <span className="action-btn-label">Schedule</span>
      </button>
    </div>
  );
}
