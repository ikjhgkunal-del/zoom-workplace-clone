'use client';
import { useRouter } from 'next/navigation';
import { Video, Plus, Calendar, ChevronDown, Copy, Check } from 'lucide-react';
import { createInstantMeeting } from '@/lib/api';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { getStoredName } from '@/lib/useProfile';

// Schedule button — shows the exact original Zoom calendar icon
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
      <svg width="28" height="31" viewBox="0 0 30 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="cal-drop-shadow" x="0" y="2" width="30" height="31" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="1.2" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.12" />
          </filter>
        </defs>
        {/* Solid Pure White Calendar Card */}
        <rect x="1.5" y="4" width="27" height="26.5" rx="5" fill="#FFFFFF" filter="url(#cal-drop-shadow)" />

        {/* Punch Holes for the rings */}
        <ellipse cx="8.5" cy="8.5" rx="1.5" ry="1.8" fill="#D3D8DF" />
        <ellipse cx="21.5" cy="8.5" rx="1.5" ry="1.8" fill="#D3D8DF" />

        {/* Two Top Binder Wire Rings */}
        <rect x="7.5" y="1" width="2" height="7.5" rx="1" fill="#FFFFFF" stroke="#E2E5E9" strokeWidth="0.4" />
        <path d="M7.7 8.2C7.7 8.8 9.3 8.8 9.3 8.2" stroke="#8E97A4" strokeWidth="0.7" strokeLinecap="round" />

        <rect x="20.5" y="1" width="2" height="7.5" rx="1" fill="#FFFFFF" stroke="#E2E5E9" strokeWidth="0.4" />
        <path d="M20.7 8.2C20.7 8.8 22.3 8.8 22.3 8.2" stroke="#8E97A4" strokeWidth="0.7" strokeLinecap="round" />

        {/* Crisp Bold Blue 19 */}
        <text
          x="15"
          y="23.5"
          textAnchor="middle"
          fill="#0E71EB"
          fontSize="14"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"
          letterSpacing="-0.5px"
        >
          19
        </text>
      </svg>
    </div>
  );
}

export default function HomeActionButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleNewMeeting = async () => {
    setLoading(true);
    try {
      const hostName = getStoredName();
      const meeting = await createInstantMeeting(hostName);
      // Save identity for the meeting room (WebRTC uses these)
      sessionStorage.setItem('display_name', hostName);
      sessionStorage.setItem('is_host', 'true');

      // Show copy-link toast before navigating
      const inviteUrl = `${window.location.origin}/join?meetingId=${encodeURIComponent(meeting.meeting_id)}`;
      toast(
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Meeting created!{' '}
          <button
            style={{ background: 'none', border: '1px solid currentColor', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}
            onClick={() => {
              navigator.clipboard.writeText(inviteUrl);
              toast('Invite link copied!', 'success', 2000);
            }}
          >
            Copy Link
          </button>
        </span>,
        'success',
        4000
      );

      router.push(`/meeting/${meeting.meeting_id}`);
    } catch {
      toast('Could not create meeting. Is the backend running?', 'error');
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
