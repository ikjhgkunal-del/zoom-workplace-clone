'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { scheduleMeeting } from '@/lib/api';
import {
  ChevronLeft, Check, Copy, AlertTriangle, Video,
  Calendar, Clock, Shield, Globe, Settings, ExternalLink
} from 'lucide-react';

function ZmToggle({ id, checked, onChange }) {
  return (
    <label className="zm-switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="zm-slider" />
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
    title: 'My Meeting',
    description: '',
    date: defaultDate,
    time: defaultTime,
    duration: 60,
    timeZone: '(GMT+5:30) India Standard Time',
    meetingIdType: 'auto', // 'auto' | 'pmi'
    passcode: 'GWzvz3',
    waitingRoom: false,
    hostVideo: 'off',
    participantVideo: 'off',
    muteOnEntry: false,
    allowScreenShare: true,
    joinAnytime: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const startTime = new Date(`${form.date}T${form.time}:00`);
      const meetingId = form.meetingIdType === 'pmi' ? '629-892-4224' : null;

      const data = await scheduleMeeting({
        title: form.title.trim(),
        description: form.description.trim(),
        start_time: startTime.toISOString(),
        duration: Number(form.duration),
        passcode: form.passcode.trim(),
        host_name: 'test one',
        meeting_id: meetingId,
        waiting_room: form.waitingRoom,
        mute_on_entry: form.muteOnEntry,
        allow_screen_share: form.allowScreenShare,
      });

      setSuccess(data);
    } catch (err) {
      alert('Failed to schedule meeting: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getInviteUrl = () => {
    if (!success?.meeting_id) return success?.invite_link || '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join?meetingId=${encodeURIComponent(success.meeting_id)}`;
    }
    return success.invite_link;
  };

  const handleCopyLink = () => {
    const url = getInviteUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="right-section">
        <TopBar />
        <main className="main-content">
          <div className="schedule-container">
            {/* Back Button matching real Zoom */}
            <button
              className="schedule-back-btn"
              onClick={() => router.push('/meetings')}
              id="sch-back-btn"
            >
              <ChevronLeft size={16} />
              <span>Back to Meetings</span>
            </button>

            {success ? (
              /* Success Confirmation Card */
              <div className="schedule-success-card">
                <div className="schedule-success-icon">
                  <Check size={28} />
                </div>
                <h2 className="schedule-success-title">Meeting Scheduled Successfully!</h2>
                <div className="schedule-success-topic">{success.title}</div>

                <div className="schedule-success-meta">
                  <div><strong>Meeting ID:</strong> {success.meeting_id}</div>
                  <div><strong>Time:</strong> {new Date(success.start_time).toLocaleString()} ({success.duration} min)</div>
                  {success.passcode && <div><strong>Passcode:</strong> {success.passcode}</div>}
                  <div style={{ marginTop: 8, wordBreak: 'break-all' }}>
                    <strong>Invite Link:</strong>{' '}
                    <a href={getInviteUrl()} target="_blank" rel="noreferrer" style={{ color: '#0E71EB', textDecoration: 'underline' }}>
                      {getInviteUrl()}
                    </a>
                  </div>
                </div>

                <div className="schedule-success-actions">
                  <button
                    className="schedule-cancel-btn"
                    onClick={handleCopyLink}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied Link!' : 'Copy Invite Link'}</span>
                  </button>
                  <button
                    className="schedule-cancel-btn"
                    onClick={() => router.push(`/meetings?meetingId=${success.meeting_id}`)}
                  >
                    View in Upcoming Meetings
                  </button>
                  <button
                    className="schedule-save-btn"
                    onClick={() => router.push(`/meeting/${success.meeting_id}`)}
                  >
                    Start Meeting Now
                  </button>
                </div>
              </div>
            ) : (
              /* Schedule Form */
              <div className="schedule-card">
                <h1 className="schedule-page-title">Schedule Meeting</h1>

                <form onSubmit={handleSubmit}>
                  {/* Topic */}
                  <div className="schedule-field">
                    <label className="schedule-label" htmlFor="sch-title">Topic *</label>
                    <input
                      id="sch-title"
                      className="schedule-input"
                      placeholder="My Meeting"
                      value={form.title}
                      onChange={e => set('title', e.target.value)}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="schedule-field">
                    <label className="schedule-label" htmlFor="sch-desc">Description (Optional)</label>
                    <textarea
                      id="sch-desc"
                      className="schedule-textarea"
                      placeholder="Describe your meeting"
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                    />
                  </div>

                  {/* When: Date & Time */}
                  <div className="schedule-row-split">
                    <div className="schedule-field">
                      <label className="schedule-label" htmlFor="sch-date">When</label>
                      <input
                        id="sch-date"
                        type="date"
                        className="schedule-input"
                        value={form.date}
                        onChange={e => set('date', e.target.value)}
                        required
                      />
                    </div>
                    <div className="schedule-field">
                      <label className="schedule-label" htmlFor="sch-time">Start Time</label>
                      <input
                        id="sch-time"
                        type="time"
                        className="schedule-input"
                        value={form.time}
                        onChange={e => set('time', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="schedule-field">
                    <label className="schedule-label" htmlFor="sch-duration">Duration</label>
                    <select
                      id="sch-duration"
                      className="schedule-select"
                      value={form.duration}
                      onChange={e => set('duration', e.target.value)}
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hr</option>
                      <option value={90}>1.5 hr</option>
                      <option value={120}>2 hr</option>
                      <option value={180}>3 hr</option>
                    </select>
                  </div>

                

                  {/* Time Zone */}
                  <div className="schedule-field">
                    <label className="schedule-label" htmlFor="sch-timezone">Time Zone</label>
                    <select
                      id="sch-timezone"
                      className="schedule-select"
                      value={form.timeZone}
                      onChange={e => set('timeZone', e.target.value)}
                    >
                      <option value="(GMT+5:30) India Standard Time">(GMT+5:30) India Standard Time</option>
                      <option value="(GMT-08:00) Pacific Time (US and Canada)">(GMT-08:00) Pacific Time (US and Canada)</option>
                      <option value="(GMT-05:00) Eastern Time (US and Canada)">(GMT-05:00) Eastern Time (US and Canada)</option>
                      <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                      <option value="(GMT+01:00) Central European Time">(GMT+01:00) Central European Time</option>
                    </select>
                  </div>

                  {/* Meeting ID Choice (from Real Zoom Screenshot 1) */}
                  <div className="schedule-field">
                    <label className="schedule-label">Meeting ID</label>
                    <div className="schedule-radio-group">
                      <label className="schedule-radio-label">
                        <input
                          type="radio"
                          name="meetingIdType"
                          value="auto"
                          checked={form.meetingIdType === 'auto'}
                          onChange={() => set('meetingIdType', 'auto')}
                        />
                        <span>Generate Automatically</span>
                      </label>
                      <label className="schedule-radio-label">
                        <input
                          type="radio"
                          name="meetingIdType"
                          value="pmi"
                          checked={form.meetingIdType === 'pmi'}
                          onChange={() => set('meetingIdType', 'pmi')}
                        />
                        <span>Personal Meeting ID 629 892 4224</span>
                      </label>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="schedule-section-header">Security</div>

                  <div className="schedule-field">
                    <div className="schedule-toggle-row">
                      <div className="schedule-toggle-info">
                        <div className="schedule-toggle-title">Passcode</div>
                        <div className="schedule-toggle-desc">Only users who have the invite link or passcode can join</div>
                      </div>
                      <input
                        id="sch-passcode"
                        className="schedule-input"
                        style={{ width: 140 }}
                        placeholder="Passcode"
                        value={form.passcode}
                        onChange={e => set('passcode', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="schedule-field">
                    <div className="schedule-toggle-row">
                      <div className="schedule-toggle-info">
                        <div className="schedule-toggle-title">Waiting Room</div>
                        <div className="schedule-toggle-desc">Participants join a waiting room before being admitted</div>
                      </div>
                      <ZmToggle
                        id="sch-waiting-room"
                        checked={form.waitingRoom}
                        onChange={e => set('waitingRoom', e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Video Section */}
                  <div className="schedule-section-header">Video</div>

                  <div className="schedule-field">
                    <div className="schedule-toggle-row">
                      <div className="schedule-toggle-info">
                        <div className="schedule-toggle-title">Host Video</div>
                      </div>
                      <div className="schedule-radio-group">
                        <label className="schedule-radio-label">
                          <input
                            type="radio"
                            name="hostVideo"
                            value="on"
                            checked={form.hostVideo === 'on'}
                            onChange={() => set('hostVideo', 'on')}
                          />
                          <span>On</span>
                        </label>
                        <label className="schedule-radio-label">
                          <input
                            type="radio"
                            name="hostVideo"
                            value="off"
                            checked={form.hostVideo === 'off'}
                            onChange={() => set('hostVideo', 'off')}
                          />
                          <span>Off</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="schedule-field">
                    <div className="schedule-toggle-row">
                      <div className="schedule-toggle-info">
                        <div className="schedule-toggle-title">Participant Video</div>
                      </div>
                      <div className="schedule-radio-group">
                        <label className="schedule-radio-label">
                          <input
                            type="radio"
                            name="partVideo"
                            value="on"
                            checked={form.participantVideo === 'on'}
                            onChange={() => set('participantVideo', 'on')}
                          />
                          <span>On</span>
                        </label>
                        <label className="schedule-radio-label">
                          <input
                            type="radio"
                            name="partVideo"
                            value="off"
                            checked={form.participantVideo === 'off'}
                            onChange={() => set('participantVideo', 'off')}
                          />
                          <span>Off</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Options */}
                  <div className="schedule-section-header">Meeting Options</div>

                  <div className="schedule-field">
                    <div className="schedule-toggle-row">
                      <div className="schedule-toggle-info">
                        <div className="schedule-toggle-title">Mute participants upon entry</div>
                        <div className="schedule-toggle-desc">Automatically mute all attendees when they join</div>
                      </div>
                      <ZmToggle
                        id="sch-mute-entry"
                        checked={form.muteOnEntry}
                        onChange={e => set('muteOnEntry', e.target.checked)}
                      />
                    </div>
                  </div>

                  <div className="schedule-field">
                    <div className="schedule-toggle-row">
                      <div className="schedule-toggle-info">
                        <div className="schedule-toggle-title">Allow participants to share screen</div>
                        <div className="schedule-toggle-desc">Attendees can share presentation materials</div>
                      </div>
                      <ZmToggle
                        id="sch-screen-share"
                        checked={form.allowScreenShare}
                        onChange={e => set('allowScreenShare', e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="schedule-actions-row">
                    <button
                      type="button"
                      className="schedule-cancel-btn"
                      onClick={() => router.push('/meetings')}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="sch-save-btn"
                      className="schedule-save-btn"
                      disabled={loading}
                    >
                      {loading ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
