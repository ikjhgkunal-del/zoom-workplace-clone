'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { scheduleMeeting } from '@/lib/api';
import { ChevronLeft } from 'lucide-react';

function Toggle({ id, checked, onChange }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function SchedulePage() {
  const router = useRouter();
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: defaultDate,
    time: defaultTime,
    duration: 60,
    passcode: '',
    waitingRoom: false,
    muteOnEntry: false,
    allowScreenShare: true,
    video: 'off',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const startTime = new Date(`${form.date}T${form.time}`);
      const data = await scheduleMeeting({
        title: form.title,
        description: form.description,
        start_time: startTime.toISOString(),
        duration: Number(form.duration),
        passcode: form.passcode,
        host_name: 'test one',
      });
      setSuccess(data);
    } catch (err) {
      alert('Failed to schedule meeting: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="schedule-page">
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Meeting Scheduled!</h2>
              <p style={{ color: '#6b6b6b', marginBottom: 8 }}>{success.title}</p>
              <p style={{ color: '#6b6b6b', marginBottom: 4, fontSize: 13 }}>
                Meeting ID: <strong>{success.meeting_id}</strong>
              </p>
              <p style={{ color: '#6b6b6b', marginBottom: 24, fontSize: 13 }}>
                Invite Link: <a href={success.invite_link} style={{ color: '#0E71EB' }}>{success.invite_link}</a>
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn-primary" onClick={() => router.push('/')}>
                  Back to Home
                </button>
                <button className="btn-cancel" onClick={() => setSuccess(null)}>
                  Schedule Another
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="schedule-page">
          {/* Back */}
          <button
            className="join-back-btn"
            style={{ marginBottom: 16, color: '#0E71EB' }}
            onClick={() => router.push('/')}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <h1 className="schedule-title">Schedule a Meeting</h1>

          <form onSubmit={handleSubmit}>
            {/* Topic */}
            <div className="form-group">
              <label className="form-label" htmlFor="sch-title">Topic *</label>
              <input
                id="sch-title"
                className="form-input"
                placeholder="Enter meeting topic"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="sch-desc">Description (optional)</label>
              <textarea
                id="sch-desc"
                className="form-input form-textarea"
                placeholder="Describe your meeting"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Date & Time */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="sch-date">Date</label>
                <input
                  id="sch-date"
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sch-time">Time</label>
                <input
                  id="sch-time"
                  type="time"
                  className="form-input"
                  value={form.time}
                  onChange={e => set('time', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label className="form-label" htmlFor="sch-duration">Duration</label>
              <div className="form-row">
                <select
                  id="sch-duration"
                  className="form-select"
                  value={form.duration}
                  onChange={e => set('duration', e.target.value)}
                >
                  {[15, 30, 45, 60, 90, 120, 150, 180].map(d => (
                    <option key={d} value={d}>
                      {d >= 60 ? `${Math.floor(d / 60)} hr${d > 60 ? ` ${d % 60} min` : ''}` : `${d} min`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Security Section */}
            <div className="schedule-section-title">Security</div>

            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Passcode</div>
                <div className="toggle-desc">Only users who have the invite link or passcode can join</div>
              </div>
              <input
                id="sch-passcode"
                className="form-input"
                style={{ width: 140, marginLeft: 12 }}
                placeholder="Passcode"
                value={form.passcode}
                onChange={e => set('passcode', e.target.value)}
              />
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Waiting Room</div>
                <div className="toggle-desc">Participants join a waiting room before being admitted</div>
              </div>
              <Toggle
                id="sch-waiting-room"
                checked={form.waitingRoom}
                onChange={e => set('waitingRoom', e.target.checked)}
              />
            </div>

            {/* Video Section */}
            <div className="schedule-section-title">Video</div>

            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Host Video</div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="radio" name="video" value="on" checked={form.video === 'on'} onChange={() => set('video', 'on')} />
                  On
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="radio" name="video" value="off" checked={form.video === 'off'} onChange={() => set('video', 'off')} />
                  Off
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="schedule-section-title">Meeting Options</div>

            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Mute participants upon entry</div>
              </div>
              <Toggle
                id="sch-mute-entry"
                checked={form.muteOnEntry}
                onChange={e => set('muteOnEntry', e.target.checked)}
              />
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Allow participants to share screen</div>
              </div>
              <Toggle
                id="sch-screen-share"
                checked={form.allowScreenShare}
                onChange={e => set('allowScreenShare', e.target.checked)}
              />
            </div>

            {/* Actions */}
            <div className="schedule-actions">
              <button type="button" className="btn-cancel" onClick={() => router.push('/')}>
                Cancel
              </button>
              <button type="submit" id="sch-save-btn" className="btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
