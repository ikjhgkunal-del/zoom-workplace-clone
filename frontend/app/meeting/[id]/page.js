'use client';
import { use, useEffect, useState } from 'react';
import { getMeeting } from '@/lib/api';
import MeetingRoom from '@/components/MeetingRoom';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';

/* Generate or retrieve a stable UUID for this browser session */
function getOrCreateUserId() {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('user_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('user_id', id);
  }
  return id;
}

/* Pre-join name-entry gate (shown when navigating directly to /meeting/[id]) */
function NameGate({ meetingId, onConfirm }) {
  const [name, setName] = useState(
    typeof window !== 'undefined'
      ? localStorage.getItem('zoom_display_name') || ''
      : ''
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    sessionStorage.setItem('display_name', name.trim());
    sessionStorage.setItem('is_host', 'false');
    localStorage.setItem('zoom_display_name', name.trim());
    onConfirm(name.trim());
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#1C1C1C',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Video size={28} color="#0E71EB" />
        <span style={{ color: 'white', fontSize: 22, fontWeight: 600 }}>Join Meeting</span>
      </div>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 4 }}>
        Meeting ID: <strong style={{ color: '#ddd' }}>{meetingId}</strong>
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 300 }}>
        <input
          id="gate-name-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your display name"
          required
          autoFocus
          style={{
            padding: '10px 14px', borderRadius: 8,
            background: '#2a2a2a', border: '1px solid #444',
            color: 'white', fontSize: 14, outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 0', borderRadius: 8,
            background: '#0E71EB', color: 'white',
            border: 'none', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Join Now
        </button>
      </form>
    </div>
  );
}

export default function MeetingPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [meeting, setMeeting]       = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId]         = useState('');
  const [nameReady, setNameReady]   = useState(false);

  /* Restore identity from sessionStorage */
  useEffect(() => {
    const uid  = getOrCreateUserId();
    const storedName = sessionStorage.getItem('display_name') ||
                       localStorage.getItem('zoom_display_name');
    const name = storedName && storedName.trim() ? storedName.trim() : 'test one';
    setUserId(uid);
    setDisplayName(name);
    setNameReady(true);
  }, []);

  /* Fetch meeting info */
  useEffect(() => {
    getMeeting(id)
      .then(data => setMeeting(data))
      .catch(err => setError(err.message || 'Meeting not found'))
      .finally(() => setLoading(false));
  }, [id]);

  /* Loading */
  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#1C1C1C',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 16, fontFamily: 'Inter, sans-serif',
      }}>
        Connecting…
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#1C1C1C',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'white', gap: 16, fontFamily: 'Inter, sans-serif',
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

  /* Name gate: ask for display name if not set */
  if (!nameReady || !displayName) {
    return (
      <NameGate
        meetingId={id}
        onConfirm={(name) => {
          setDisplayName(name);
          setNameReady(true);
        }}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="right-section">
        <TopBar />
        <main className="main-content meeting-main-content">
          <MeetingRoom
            meetingId={id}
            meeting={meeting}
            displayName={displayName}
            userId={userId}
          />
        </main>
      </div>
    </div>
  );
}
