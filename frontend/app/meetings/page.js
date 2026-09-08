'use client';
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  RotateCw, Plus, Calendar, Copy, Edit3, Trash2,
  Clock, Search, Check, ExternalLink, MoreHorizontal,
  Filter, CalendarDays, List, ChevronDown, X, Video, ChevronRight
} from 'lucide-react';
import {
  getMeetings, getMeeting, createInstantMeeting,
  scheduleMeeting, updateMeeting, deleteMeeting
} from '@/lib/api';

const PMI_ID = '629-892-4224';

function formatMeetingId(id) {
  if (!id) return '';
  const digits = id.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return id.replace(/-/g, ' ');
}

function formatTimeOnly(dt) {
  if (!dt) return '10:00';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatFullDateTime(dt) {
  if (!dt) return 'Today';
  const d = new Date(dt);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const dateStr = isToday
    ? 'Today'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr}, ${timeStr}`;
}

function MeetingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingIdParam = searchParams.get('meetingId');

  // View Mode: 'details' (matching Screenshot 1: Zoom Browser) or 'agenda' (matching Screenshot 2: Zoom Desktop App)
  const [viewMode, setViewMode] = useState('details');

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(meetingIdParam || PMI_ID);
  const [showInviteText, setShowInviteText] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (meetingIdParam) {
      setSelectedMeetingId(meetingIdParam);
    }
  }, [meetingIdParam]);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    meeting_id: '',
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    passcode: '',
  });

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    title: "test one's Zoom Meeting",
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    duration: 60,
    passcode: '123456',
  });

  const [connectCalModalOpen, setConnectCalModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCalDay, setSelectedCalDay] = useState(8);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const loadMeetings = useCallback(async () => {
    try {
      const data = await getMeetings('all');
      setMeetings(data || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMeetings();
  };

  // Find currently selected meeting object or fallback to PMI defaults
  const currentMeeting = useMemo(() => {
    const found = meetings.find((m) => m.meeting_id === selectedMeetingId);
    if (found) return found;
    return {
      meeting_id: PMI_ID,
      title: 'My Personal Meeting ID (PMI)',
      description: 'Personal Meeting Room for test one',
      host_name: 'test one',
      passcode: '123456',
      duration: 60,
      start_time: new Date().toISOString(),
    };
  }, [meetings, selectedMeetingId]);

  const upcomingList = useMemo(() => {
    return meetings
      .filter((m) => m.meeting_id !== PMI_ID && m.status !== 'ended')
      .sort((a, b) => new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time));
  }, [meetings]);

  const handleStartMeeting = (id) => {
    router.push(`/meeting/${id}`);
  };

  const getInviteText = (meeting) => {
    const timeFormatted = formatFullDateTime(meeting.start_time);
    const idFormatted = formatMeetingId(meeting.meeting_id);
    const cleanId = meeting.meeting_id.replace(/\D/g, '');
    const passcode = meeting.passcode || '123456';
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return (
      `test one is inviting you to a scheduled Zoom meeting.\n\n` +
      `Topic: ${meeting.title}\n` +
      `Time: ${timeFormatted} India\n\n` +
      `Join Zoom Meeting\n` +
      `${baseOrigin}/join?meetingId=${cleanId}\n\n` +
      `Meeting ID: ${idFormatted}\n` +
      `Passcode: ${passcode}`
    );
  };

  const handleCopyInvitation = (e, meeting) => {
    if (e) e.stopPropagation();
    const text = getInviteText(meeting || currentMeeting);
    navigator.clipboard.writeText(text).then(() => {
      showToast('Invite link has been copied to the clipboard.');
    });
  };

  const handleOpenEdit = (e, meeting) => {
    if (e) e.stopPropagation();
    const target = meeting || currentMeeting;
    const d = target.start_time ? new Date(target.start_time) : new Date();
    setEditData({
      meeting_id: target.meeting_id,
      title: target.title,
      description: target.description || '',
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      duration: target.duration || 60,
      passcode: target.passcode || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const dt = new Date(`${editData.date}T${editData.time}:00`);
      await updateMeeting(editData.meeting_id, {
        title: editData.title,
        description: editData.description,
        start_time: isNaN(dt.getTime()) ? new Date() : dt,
        duration: parseInt(editData.duration) || 60,
        passcode: editData.passcode,
      });
      setEditModalOpen(false);
      showToast('Meeting updated successfully.');
      loadMeetings();
    } catch {
      alert('Could not update meeting.');
    }
  };

  const handleSaveSchedule = async () => {
    try {
      const dt = new Date(`${scheduleData.date}T${scheduleData.time}:00`);
      await scheduleMeeting({
        title: scheduleData.title || "test one's Zoom Meeting",
        description: scheduleData.description || '',
        start_time: isNaN(dt.getTime()) ? new Date() : dt,
        duration: parseInt(scheduleData.duration) || 60,
        passcode: scheduleData.passcode || '123456',
        host_name: 'test one',
      });
      setScheduleModalOpen(false);
      showToast('Meeting scheduled successfully.');
      loadMeetings();
    } catch {
      alert('Could not schedule meeting.');
    }
  };

  const handleDeleteMeeting = async (e, id) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await deleteMeeting(id);
      showToast('Meeting deleted.');
      if (selectedMeetingId === id) {
        setSelectedMeetingId(PMI_ID);
      }
      loadMeetings();
    } catch {
      alert('Could not delete meeting.');
    }
  };

  // Days for September 2026 mini-calendar
  // Sep 1, 2026 is a Tuesday -> Sunday 30, Monday 31
  const miniCalDays = [
    { day: 30, isOther: true },
    { day: 31, isOther: true },
    { day: 1, isOther: false },
    { day: 2, isOther: false },
    { day: 3, isOther: false },
    { day: 4, isOther: false },
    { day: 5, isOther: false },
    { day: 6, isOther: false },
    { day: 7, isOther: false },
    { day: 8, isOther: false, isToday: true },
    { day: 9, isOther: false },
    { day: 10, isOther: false },
    { day: 11, isOther: false },
    { day: 12, isOther: false },
    { day: 13, isOther: false },
    { day: 14, isOther: false },
    { day: 15, isOther: false },
    { day: 16, isOther: false },
    { day: 17, isOther: false },
    { day: 18, isOther: false },
    { day: 19, isOther: false },
    { day: 20, isOther: false },
    { day: 21, isOther: false },
    { day: 22, isOther: false },
    { day: 23, isOther: false },
    { day: 24, isOther: false },
    { day: 25, isOther: false },
    { day: 26, isOther: false },
    { day: 27, isOther: false },
    { day: 28, isOther: false },
    { day: 29, isOther: false },
    { day: 30, isOther: false },
    { day: 1, isOther: true },
    { day: 2, isOther: true },
    { day: 3, isOther: true },
    { day: 4, isOther: true },
    { day: 5, isOther: true },
    { day: 6, isOther: true },
    { day: 7, isOther: true },
    { day: 8, isOther: true },
    { day: 9, isOther: true },
    { day: 10, isOther: true },
  ];

  // Agenda list (matching Screenshot 2: Zoom Desktop App)
  const agendaItems = useMemo(() => {
    if (meetings.length > 0) {
      return meetings.filter(m => m.meeting_id !== PMI_ID);
    }
    return [
      { meeting_id: '123-456-7890', title: "test one's Zoom Meeting", host_name: 'test one', start_time: '2026-09-08T01:34:00', end_time: '2026-09-08T01:46:00' },
      { meeting_id: '987-654-3210', title: "test one's Zoom Meeting", host_name: 'test one', start_time: '2026-09-08T01:57:00', end_time: '2026-09-08T02:44:00' },
      { meeting_id: '555-123-9876', title: "test one's Zoom Meeting", host_name: 'test one', start_time: '2026-09-08T02:44:00', end_time: '2026-09-08T03:34:00' },
      { meeting_id: '111-222-3333', title: "test one's Zoom Meeting", host_name: 'test one', start_time: '2026-09-08T03:39:00', end_time: '2026-09-08T03:48:00' },
    ];
  }, [meetings]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="right-section">
        <TopBar />
        <main className="main-content" style={{ padding: 0, height: 'calc(100vh - 56px)' }}>
          {/* Toast Notification */}
          {toastMessage && (
            <div className="zm-toast">
              <Check size={16} color="#10B981" />
              <span>{toastMessage}</span>
            </div>
          )}

          <div className="zm-meetings-container">
            {/* VIEW MODE 1: MASTER-DETAIL VIEW (Matching Screenshot 1: Zoom Browser app.zoom.us/wc/meetings) */}
            {viewMode === 'details' && (
              <>
                {/* Left Master Column */}
                <aside className="zm-master-col">
                  <div className="zm-master-header">
                    <div className="zm-master-header-left">
                      <button
                        className={`zm-master-refresh-btn${refreshing ? ' spinning' : ''}`}
                        onClick={handleRefresh}
                        title="Refresh meetings"
                        id="zm-refresh-btn"
                      >
                        <RotateCw size={15} />
                      </button>
                      <span className="zm-master-title">Upcoming</span>
                    </div>
                    <button
                      className="zm-master-plus-btn"
                      onClick={() => setScheduleModalOpen(true)}
                      title="Schedule a new meeting"
                      id="zm-schedule-btn"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="zm-master-list">
                    {/* Personal Meeting ID (PMI) Card - Screenshot 1 Hero Element */}
                    <div
                      id="zm-pmi-card"
                      className={`zm-pmi-card${selectedMeetingId === PMI_ID ? ' active' : ''}`}
                      onClick={() => setSelectedMeetingId(PMI_ID)}
                    >
                      <div className="zm-pmi-number">629 892 4224</div>
                      <div className="zm-pmi-label">My Personal Meeting ID (PMI)</div>
                    </div>

                    {/* Upcoming Meetings List */}
                    {upcomingList.length > 0 ? (
                      upcomingList.map((m) => (
                        <div
                          key={m.meeting_id}
                          className={`zm-meeting-card${selectedMeetingId === m.meeting_id ? ' active' : ''}`}
                          onClick={() => setSelectedMeetingId(m.meeting_id)}
                          id={`zm-meeting-${m.meeting_id}`}
                        >
                          <div className="zm-card-time">{formatFullDateTime(m.start_time)}</div>
                          <div className="zm-card-title">{m.title}</div>
                          <div className="zm-card-id">ID: {formatMeetingId(m.meeting_id)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="zm-empty-upcoming">No upcoming meetings</div>
                    )}
                  </div>

                  <div className="zm-master-footer">
                    <button
                      className="zm-add-cal-btn"
                      onClick={() => setConnectCalModalOpen(true)}
                      id="zm-add-cal-btn"
                    >
                      <Calendar size={15} />
                      <span>Add a calendar</span>
                    </button>
                  </div>
                </aside>

                {/* Right Detail Column */}
                <section className="zm-detail-col">
                  {/* Top Right View Switcher */}
                  <div className="zm-detail-top-bar">
                    <div className="zm-view-switcher">
                      <button
                        className={`zm-view-tab${viewMode === 'details' ? ' active' : ''}`}
                        onClick={() => setViewMode('details')}
                      >
                        <List size={13} />
                        Details
                      </button>
                      <button
                        className={`zm-view-tab${viewMode === 'agenda' ? ' active' : ''}`}
                        onClick={() => setViewMode('agenda')}
                      >
                        <CalendarDays size={13} />
                        Agenda
                      </button>
                    </div>
                  </div>

                  {/* Meeting Details Content (Screenshot 1 Detail Area) */}
                  <h1 className="zm-detail-title">{currentMeeting.title}</h1>
                  <div className="zm-detail-id">{formatMeetingId(currentMeeting.meeting_id)}</div>

                  {/* Action Buttons Row */}
                  <div className="zm-detail-actions">
                    <button
                      id="zm-start-meeting-btn"
                      className="zm-btn-start"
                      onClick={() => handleStartMeeting(currentMeeting.meeting_id)}
                    >
                      Start
                    </button>
                    <button
                      id="zm-copy-invitation-btn"
                      className="zm-btn-secondary"
                      onClick={(e) => handleCopyInvitation(e, currentMeeting)}
                    >
                      <Copy size={14} />
                      Copy Invitation
                    </button>
                    <button
                      id="zm-edit-meeting-btn"
                      className="zm-btn-secondary"
                      onClick={(e) => handleOpenEdit(e, currentMeeting)}
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    {currentMeeting.meeting_id !== PMI_ID && (
                      <button
                        className="zm-btn-danger"
                        onClick={(e) => handleDeleteMeeting(e, currentMeeting.meeting_id)}
                        title="Delete meeting"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Show Meeting Invitation Link */}
                  <div>
                    <button
                      id="zm-toggle-invite-btn"
                      className="zm-invitation-link"
                      onClick={() => setShowInviteText(!showInviteText)}
                    >
                      {showInviteText ? 'Hide Meeting Invitation' : 'Show Meeting Invitation'}
                    </button>

                    {showInviteText && (
                      <div className="zm-invitation-box">
                        <div className="zm-invitation-text">
                          {getInviteText(currentMeeting)}
                        </div>
                        <button
                          className="zm-copy-invite-inner-btn"
                          onClick={(e) => handleCopyInvitation(e, currentMeeting)}
                        >
                          <Copy size={13} />
                          Copy Meeting Invitation
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* VIEW MODE 2: AGENDA & CALENDAR VIEW (Matching Screenshot 2: Zoom Desktop App) */}
            {viewMode === 'agenda' && (
              <>
                {/* Left Mini Calendar Column */}
                <aside className="zm-cal-sidebar">
                  <div className="zm-cal-top-bar">
                    <button
                      className="zm-connect-cal-pill"
                      onClick={() => setConnectCalModalOpen(true)}
                    >
                      <Calendar size={13} />
                      Connect calendar
                    </button>
                    <div className="zm-cal-top-right">
                      <button
                        className="zm-cal-plus-btn"
                        onClick={() => setScheduleModalOpen(true)}
                        title="Schedule Meeting"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Mini Month Calendar */}
                  <div className="zm-mini-cal">
                    <div className="zm-mini-cal-header">
                      <span>September 2026</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="zm-cal-nav-btn">&lt;</button>
                        <button className="zm-cal-nav-btn">&gt;</button>
                      </div>
                    </div>
                    <div className="zm-mini-cal-grid">
                      <div className="zm-mini-cal-dow">S</div>
                      <div className="zm-mini-cal-dow">M</div>
                      <div className="zm-mini-cal-dow">T</div>
                      <div className="zm-mini-cal-dow">W</div>
                      <div className="zm-mini-cal-dow">T</div>
                      <div className="zm-mini-cal-dow">F</div>
                      <div className="zm-mini-cal-dow">S</div>
                      {miniCalDays.map((item, i) => (
                        <div
                          key={i}
                          className={`zm-mini-cal-day${item.isOther ? ' other-month' : ''}${item.isToday ? ' today' : ''}${selectedCalDay === item.day && !item.isOther ? ' selected' : ''}`}
                          onClick={() => !item.isOther && setSelectedCalDay(item.day)}
                        >
                          {item.day}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User Badge at bottom of calendar panel */}
                  <div className="zm-cal-user-filter">
                    <div className="zm-radio-dot">
                      <div className="zm-radio-dot-inner" />
                    </div>
                    <div className="zm-cal-user-avatar">to</div>
                    <span className="zm-cal-user-name">test one</span>
                  </div>

                  <div className="zm-cal-pmi-footer">
                    Personal meeting ID <span onClick={() => { setSelectedMeetingId(PMI_ID); setViewMode('details'); }}>629 892 4224</span>
                  </div>
                </aside>

                {/* Right Agenda Timeline Column */}
                <section className="zm-agenda-col">
                  {/* Top Bar with Navigation and Switcher */}
                  <div className="zm-agenda-top">
                    <div className="zm-agenda-nav-left">
                      <button
                        className="zm-agenda-today-btn"
                        onClick={() => setSelectedCalDay(8)}
                      >
                        Today
                      </button>
                      <button className="zm-cal-nav-btn">&lt;</button>
                      <button className="zm-cal-nav-btn">&gt;</button>
                      <span className="zm-agenda-title">September 2026</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="zm-view-switcher">
                        <button
                          className={`zm-view-tab${viewMode === 'details' ? ' active' : ''}`}
                          onClick={() => setViewMode('details')}
                        >
                          <List size={13} />
                          Details
                        </button>
                        <button
                          className={`zm-view-tab${viewMode === 'agenda' ? ' active' : ''}`}
                          onClick={() => setViewMode('agenda')}
                        >
                          <CalendarDays size={13} />
                          Agenda
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="zm-agenda-section-title">Today</div>

                  {/* Agenda Meeting Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {agendaItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="zm-agenda-item">
                        <div className="zm-agenda-time-col">
                          <div>{formatTimeOnly(item.start_time)}</div>
                          <div style={{ color: '#8C939D', fontSize: 11 }}>{formatTimeOnly(item.end_time || item.start_time)}</div>
                        </div>
                        <div className="zm-agenda-bar" />
                        <div className="zm-agenda-body">
                          <div className="zm-agenda-meeting-title">
                            <Video size={14} color="#0E71EB" />
                            {item.title}
                          </div>
                          <div className="zm-agenda-host">Host: {item.host_name || 'test one'}</div>
                        </div>
                        <div className="zm-agenda-actions">
                          <button
                            className="zm-btn-start"
                            style={{ padding: '5px 16px', fontSize: 12 }}
                            onClick={() => handleStartMeeting(item.meeting_id)}
                          >
                            Start
                          </button>
                          <button
                            className="zm-btn-secondary"
                            style={{ padding: '5px 8px' }}
                            onClick={(e) => handleCopyInvitation(e, item)}
                            title="Copy Invitation"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Signature Zoom Orange Current-Time Indicator Line */}
                    <div className="zm-orange-timeline">
                      <div className="zm-orange-dot" />
                      <div className="zm-orange-line" />
                    </div>

                    {agendaItems.slice(3).map((item, idx) => (
                      <div key={`after-${idx}`} className="zm-agenda-item">
                        <div className="zm-agenda-time-col">
                          <div>{formatTimeOnly(item.start_time)}</div>
                          <div style={{ color: '#8C939D', fontSize: 11 }}>{formatTimeOnly(item.end_time || item.start_time)}</div>
                        </div>
                        <div className="zm-agenda-bar" />
                        <div className="zm-agenda-body">
                          <div className="zm-agenda-meeting-title">
                            <Video size={14} color="#0E71EB" />
                            {item.title}
                          </div>
                          <div className="zm-agenda-host">Host: {item.host_name || 'test one'}</div>
                        </div>
                        <div className="zm-agenda-actions">
                          <button
                            className="zm-btn-start"
                            style={{ padding: '5px 16px', fontSize: 12 }}
                            onClick={() => handleStartMeeting(item.meeting_id)}
                          >
                            Start
                          </button>
                          <button
                            className="zm-btn-secondary"
                            style={{ padding: '5px 8px' }}
                            onClick={(e) => handleCopyInvitation(e, item)}
                            title="Copy Invitation"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* EDIT MEETING MODAL */}
          {editModalOpen && (
            <div className="zm-modal-backdrop" onClick={() => setEditModalOpen(false)}>
              <div className="zm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="zm-modal-header">
                  <span className="zm-modal-title">Edit Meeting</span>
                  <button className="zm-modal-close-btn" onClick={() => setEditModalOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="zm-modal-body">
                  <div className="zm-form-group">
                    <label className="zm-form-label">Topic</label>
                    <input
                      className="zm-form-input"
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="Meeting Topic"
                    />
                  </div>
                  <div className="zm-form-group">
                    <label className="zm-form-label">Description (Optional)</label>
                    <textarea
                      className="zm-form-textarea"
                      rows={2}
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Meeting Description"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Date</label>
                      <input
                        type="date"
                        className="zm-form-input"
                        value={editData.date}
                        onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      />
                    </div>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Time</label>
                      <input
                        type="time"
                        className="zm-form-input"
                        value={editData.time}
                        onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Duration</label>
                      <select
                        className="zm-form-select"
                        value={editData.duration}
                        onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Passcode</label>
                      <input
                        className="zm-form-input"
                        value={editData.passcode}
                        onChange={(e) => setEditData({ ...editData, passcode: e.target.value })}
                        placeholder="123456"
                      />
                    </div>
                  </div>
                </div>
                <div className="zm-modal-footer">
                  <button className="zm-btn-secondary" onClick={() => setEditModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="zm-btn-start" onClick={handleSaveEdit}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCHEDULE MEETING MODAL */}
          {scheduleModalOpen && (
            <div className="zm-modal-backdrop" onClick={() => setScheduleModalOpen(false)}>
              <div className="zm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="zm-modal-header">
                  <span className="zm-modal-title">Schedule Meeting</span>
                  <button className="zm-modal-close-btn" onClick={() => setScheduleModalOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="zm-modal-body">
                  <div className="zm-form-group">
                    <label className="zm-form-label">Topic</label>
                    <input
                      className="zm-form-input"
                      value={scheduleData.title}
                      onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                      placeholder="Meeting Topic"
                    />
                  </div>
                  <div className="zm-form-group">
                    <label className="zm-form-label">Description (Optional)</label>
                    <textarea
                      className="zm-form-textarea"
                      rows={2}
                      value={scheduleData.description}
                      onChange={(e) => setScheduleData({ ...scheduleData, description: e.target.value })}
                      placeholder="Meeting Description"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Date</label>
                      <input
                        type="date"
                        className="zm-form-input"
                        value={scheduleData.date}
                        onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                      />
                    </div>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Time</label>
                      <input
                        type="time"
                        className="zm-form-input"
                        value={scheduleData.time}
                        onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Duration</label>
                      <select
                        className="zm-form-select"
                        value={scheduleData.duration}
                        onChange={(e) => setScheduleData({ ...scheduleData, duration: e.target.value })}
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                    <div className="zm-form-group">
                      <label className="zm-form-label">Passcode</label>
                      <input
                        className="zm-form-input"
                        value={scheduleData.passcode}
                        onChange={(e) => setScheduleData({ ...scheduleData, passcode: e.target.value })}
                        placeholder="123456"
                      />
                    </div>
                  </div>
                </div>
                <div className="zm-modal-footer">
                  <button className="zm-btn-secondary" onClick={() => setScheduleModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="zm-btn-start" onClick={handleSaveSchedule}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONNECT CALENDAR MODAL */}
          {connectCalModalOpen && (
            <div className="zm-modal-backdrop" onClick={() => setConnectCalModalOpen(false)}>
              <div className="zm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="zm-modal-header">
                  <span className="zm-modal-title">Connect a Calendar Service</span>
                  <button className="zm-modal-close-btn" onClick={() => setConnectCalModalOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="zm-modal-body">
                  <p style={{ fontSize: 13, color: '#555566', lineHeight: 1.5, margin: 0 }}>
                    Connect your calendar service to view upcoming meetings and automatically sync scheduled sessions with Zoom Workplace.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #D0D5DD', borderRadius: 8, cursor: 'pointer', background: '#F8F9FA' }}>
                      <input type="radio" name="cal_service" defaultChecked />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Google Calendar</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #D0D5DD', borderRadius: 8, cursor: 'pointer', background: '#F8F9FA' }}>
                      <input type="radio" name="cal_service" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Microsoft 365 / Outlook</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #D0D5DD', borderRadius: 8, cursor: 'pointer', background: '#F8F9FA' }}>
                      <input type="radio" name="cal_service" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Exchange</span>
                    </label>
                  </div>
                </div>
                <div className="zm-modal-footer">
                  <button className="zm-btn-secondary" onClick={() => setConnectCalModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="zm-btn-start"
                    onClick={() => {
                      setConnectCalModalOpen(false);
                      showToast('Calendar service connected successfully.');
                    }}
                  >
                    Authorize & Connect
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#888' }}>Loading meetings...</div>}>
      <MeetingsPageContent />
    </Suspense>
  );
}

