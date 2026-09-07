'use client';
import { useRouter } from 'next/navigation';
import { Video, Plus, Calendar, ChevronDown } from 'lucide-react';
import { createInstantMeeting } from '@/lib/api';
import { useState } from 'react';

// Schedule button — shows the calendar date number like Zoom does
function ScheduleIcon() {
  const day = new Date().getDate();
  return (
    <div style={{
      width: 56, height: 56,
      borderRadius: '50%',
      background: '#1976D2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 0,
    }}>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.85)', fontWeight: 600, lineHeight: 1.2, letterSpacing: 1 }}>
        {new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
      </div>
      <div style={{ fontSize: 20, color: 'white', fontWeight: 700, lineHeight: 1 }}>{day}</div>
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
