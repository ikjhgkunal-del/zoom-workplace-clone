'use client';
import { use, useEffect, useState } from 'react';
import { getMeeting } from '@/lib/api';
import MeetingRoom from '@/components/MeetingRoom';
import { useRouter } from 'next/navigation';

export default function MeetingPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMeeting(id)
      .then(data => setMeeting(data))
      .catch(err => setError(err.message || 'Meeting not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#1C1C1C',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 16,
      }}>
        Connecting to meeting…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#1C1C1C',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'white', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{error}</div>
        <button
          style={{ color: '#0E71EB', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
          onClick={() => router.push('/')}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return <MeetingRoom meetingId={id} meeting={meeting} />;
}
