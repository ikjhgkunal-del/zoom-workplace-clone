'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Mic, MicOff, Video, VideoOff, Image } from 'lucide-react';
import { getMeeting, joinMeeting } from '@/lib/api';

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillId = params.get('meetingId') || '';

  const [meetingId, setMeetingId] = useState(prefillId);
  const [name, setName] = useState('test one');
  const [rememberName, setRememberName] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefillId) setMeetingId(prefillId);
  }, [prefillId]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!meetingId.trim()) { setError('Please enter a Meeting ID'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    setError('');
    setLoading(true);
    try {
      await getMeeting(meetingId.trim());
      await joinMeeting(meetingId.trim(), name.trim(), false);
      if (rememberName) localStorage.setItem('zoom_display_name', name.trim());
      router.push(`/meeting/${meetingId.trim()}`);
    } catch (err) {
      setError(err.message || 'Meeting not found. Check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('zoom_display_name');
    if (saved) setName(saved);
  }, []);

  return (
    <div className="join-page">
      {/* Top bar */}
      <div className="join-topbar">
        <button className="join-back-btn" onClick={() => router.push('/')}>
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      {/* Body */}
      <div className="join-body">
        {/* Camera Preview */}
        <div className="join-preview">
          <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!videoOff ? (
              <div style={{ textAlign: 'center', color: '#555' }}>
                <Video size={40} />
                <div style={{ marginTop: 8, fontSize: 12 }}>Camera preview unavailable</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#555' }}>
                <VideoOff size={40} />
                <div style={{ marginTop: 8, fontSize: 12 }}>Camera is off</div>
              </div>
            )}
          </div>

          {/* Preview Controls */}
          <div className="join-preview-controls">
            <button
              className="join-control-btn"
              onClick={() => setMuted(m => !m)}
              id="join-toggle-mute"
            >
              <div className="join-control-icon">
                {muted ? <MicOff size={16} /> : <Mic size={16} />}
              </div>
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button
              className="join-control-btn"
              onClick={() => setVideoOff(v => !v)}
              id="join-toggle-video"
            >
              <div className="join-control-icon">
                {videoOff ? <VideoOff size={16} /> : <Video size={16} />}
              </div>
              <span>{videoOff ? 'Start Video' : 'Stop Video'}</span>
            </button>
          </div>

          <button className="join-bg-btn">
            <Image size={12} />
            <span>Backgrounds</span>
          </button>
        </div>

        {/* Form Panel */}
        <form className="join-form-panel" onSubmit={handleJoin}>
          <h1 className="join-form-title">Enter Meeting Info</h1>

          <label className="join-form-label" htmlFor="join-meeting-id">Meeting ID or Link</label>
          <input
            id="join-meeting-id"
            className="join-form-input"
            placeholder="Enter Meeting ID or Invite Link"
            value={meetingId}
            onChange={e => setMeetingId(e.target.value)}
            required
          />

          <label className="join-form-label" htmlFor="join-name">Your Name</label>
          <input
            id="join-name"
            className="join-form-input"
            placeholder="Your Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <div className="join-checkbox-row">
            <input
              type="checkbox"
              id="remember-name"
              checked={rememberName}
              onChange={e => setRememberName(e.target.checked)}
            />
            <label htmlFor="remember-name">Remember my name for future meetings</label>
          </div>

          {error && (
            <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            id="join-submit-btn"
            className="join-submit-btn"
            disabled={loading}
          >
            {loading ? 'Joining…' : 'Join'}
          </button>

          <p className="join-terms">
            By clicking &quot;Join&quot;, you agree to our{' '}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Statement</a>.<br /><br />
            Zoom is protected by reCAPTCHA and their{' '}
            <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a> apply.
          </p>
        </form>
      </div>

      {/* Footer */}
      <div className="join-footer">
        <span>© 2026 Zoom Communications, Inc. All rights reserved.</span>
        <a href="#">Privacy &amp; Legal Policies</a>
        <span>|</span>
        <a href="#">Send Report</a>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
