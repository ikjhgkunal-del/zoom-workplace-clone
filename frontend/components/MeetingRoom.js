'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic, MicOff, Video, VideoOff, Users, MessageSquare,
  Smile, MonitorUp, MoreHorizontal, PhoneOff, X, Send,
  Settings, Sliders, ChevronUp,
} from 'lucide-react';
import { getParticipants, updateMeetingStatus } from '@/lib/api';

const AVATAR_COLORS = [
  '#0E71EB', '#E86B2E', '#1DB954', '#9C27B0',
  '#FF5722', '#009688', '#607D8B', '#795548',
];

function getColor(name) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, '0');
  return mins > 0 ? `Meeting ${mins} Minute${mins !== 1 ? 's' : ''}` : `Meeting 0:${secs}`;
}

const SEED_PARTICIPANTS = [
  { id: 1, display_name: 'test one', is_host: true,  is_muted: false, video_on: true },
  { id: 2, display_name: 'Alice Johnson', is_host: false, is_muted: false, video_on: false },
  { id: 3, display_name: 'Bob Smith',    is_host: false, is_muted: true,  video_on: false },
];

const SEED_MESSAGES = [
  { sender: 'Alice Johnson', text: 'Hey everyone! Can you all hear me?', time: '12:45' },
  { sender: 'Bob Smith',     text: 'Yes, loud and clear 👍', time: '12:46' },
  { sender: 'test one',      text: 'Great, let\'s get started.', time: '12:46' },
];

export default function MeetingRoom({ meetingId, meeting }) {
  const router = useRouter();
  const timer = useTimer();

  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [participants, setParticipants] = useState(SEED_PARTICIPANTS);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [chatMessages, setChatMessages] = useState(SEED_MESSAGES);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    getParticipants(meetingId)
      .then(data => { if (data.length > 0) setParticipants(data); })
      .catch(() => {});
  }, [meetingId]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setChatMessages(prev => [...prev, { sender: 'test one', text: chatInput.trim(), time }]);
    setChatInput('');
  };

  const handleEndMeeting = async () => {
    try { await updateMeetingStatus(meetingId, 'ended'); } catch {}
    router.push('/');
  };

  const gridClass =
    participants.length === 1 ? 'grid-1' :
    participants.length === 2 ? 'grid-2' :
    'grid-3';

  // Determine main grid participants (all except self if only 2)
  const mainParticipants = participants.length > 1
    ? participants.filter(p => !p.is_host)
    : participants;

  return (
    <div className="meeting-room">
      {/* Top Bar */}
      <div className="room-topbar">
        <div className="room-topbar-left">
          <div className="room-logo">
            <div>
              <span className="room-logo-text">zoom</span>
              <span className="room-logo-sub">Workplace</span>
            </div>
          </div>
          <div className="room-timer">
            <span className="room-timer-dot" />
            {timer}
          </div>
        </div>
        <div className="room-topbar-right">
          <button className="room-icon-btn" title="Security"><Settings size={16} /></button>
          <button className="room-icon-btn" title="View"><Sliders size={16} /></button>
          <button className="room-icon-btn" title="More"><MoreHorizontal size={16} /></button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="video-grid">
        <div className={`video-grid-inner ${gridClass}`}>
          {/* Host self-tile (picture-in-picture) */}
          {participants.length > 1 && (
            <div className="video-tile self-tile">
              <div className="video-avatar" style={{ background: getColor('test one'), width: 36, height: 36, fontSize: 14 }}>
                T
              </div>
              <div className="video-tile-name">test one (You)</div>
            </div>
          )}

          {/* Main participants */}
          {(participants.length === 1 ? participants : participants).map((p) => (
            <div key={p.id} className="video-tile">
              {p.video_on ? (
                <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="video-avatar" style={{ background: getColor(p.display_name) }}>
                    {initials(p.display_name)}
                  </div>
                </div>
              ) : (
                <div className="video-avatar" style={{ background: getColor(p.display_name) }}>
                  {initials(p.display_name)}
                </div>
              )}
              <div className="video-tile-name">
                {p.display_name}
                {p.is_host && <span style={{ fontSize: 10, color: '#aaa', marginLeft: 4 }}>(Host)</span>}
              </div>
              {(p.is_muted || (p.is_host && muted)) && (
                <div className="video-tile-muted">
                  <MicOff size={14} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Participants Panel */}
      <div className={`participants-panel${showParticipants ? ' open' : ''}`}>
        <div className="panel-header">
          <span className="panel-title">Participants ({participants.length})</span>
          <button className="panel-close" onClick={() => setShowParticipants(false)}><X size={18} /></button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }} className="dark-scroll">
          {participants.map(p => (
            <div key={p.id} className="participant-item">
              <div className="participant-avatar" style={{ background: getColor(p.display_name) }}>
                {initials(p.display_name)}
              </div>
              <span className="participant-name">{p.display_name}</span>
              {p.is_host && <span className="participant-host-badge">Host</span>}
              {p.is_muted ? <MicOff size={14} color="#888" /> : <Mic size={14} color="#888" />}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`chat-panel${showChat ? ' open' : ''}`}>
        <div className="panel-header">
          <span className="panel-title">In-Meeting Chat</span>
          <button className="panel-close" onClick={() => setShowChat(false)}><X size={18} /></button>
        </div>
        <div className="chat-messages dark-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {chatMessages.map((msg, i) => (
            <div key={i} className="chat-message">
              <div className="chat-msg-sender">
                <strong>{msg.sender}</strong>
                <span>{msg.time}</span>
              </div>
              <div className="chat-msg-text">{msg.text}</div>
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="Send a message to everyone"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
          />
          <button className="chat-send-btn" onClick={sendChat}><Send size={16} /></button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="control-bar">
        <button
          id="ctrl-audio"
          className={`ctrl-btn${muted ? ' muted' : ''}`}
          onClick={() => setMuted(m => !m)}
        >
          <div className="ctrl-btn-icon">
            {muted
              ? <MicOff size={20} className="ctrl-icon" color="#E02020" />
              : <Mic size={20} className="ctrl-icon" color="white" />
            }
            <ChevronUp size={12} className="ctrl-btn-chevron" />
          </div>
          <span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          id="ctrl-video"
          className={`ctrl-btn${!videoOn ? ' video-off' : ''}`}
          onClick={() => setVideoOn(v => !v)}
        >
          <div className="ctrl-btn-icon">
            {videoOn
              ? <Video size={20} color="white" />
              : <VideoOff size={20} color="#E02020" />
            }
            <ChevronUp size={12} className="ctrl-btn-chevron" />
          </div>
          <span>{videoOn ? 'Stop Video' : 'Start Video'}</span>
        </button>

        <div className="ctrl-separator" />

        <button
          id="ctrl-participants"
          className="ctrl-btn"
          onClick={() => { setShowParticipants(p => !p); setShowChat(false); }}
        >
          <div className="ctrl-btn-icon">
            <Users size={20} color="white" />
            <span className="participants-badge">{participants.length}</span>
            <ChevronUp size={12} className="ctrl-btn-chevron" />
          </div>
          <span>Participants</span>
        </button>

        <button
          id="ctrl-chat"
          className="ctrl-btn"
          onClick={() => { setShowChat(c => !c); setShowParticipants(false); }}
        >
          <div className="ctrl-btn-icon">
            <MessageSquare size={20} color="white" />
            <ChevronUp size={12} className="ctrl-btn-chevron" />
          </div>
          <span>Chat</span>
        </button>

        <button id="ctrl-react" className="ctrl-btn">
          <div className="ctrl-btn-icon">
            <Smile size={20} color="white" />
            <ChevronUp size={12} className="ctrl-btn-chevron" />
          </div>
          <span>React</span>
        </button>

        <button id="ctrl-share" className="ctrl-btn">
          <div className="ctrl-btn-icon">
            <MonitorUp size={20} color="white" />
            <ChevronUp size={12} className="ctrl-btn-chevron" />
          </div>
          <span>Share</span>
        </button>

        <button id="ctrl-host" className="ctrl-btn">
          <div className="ctrl-btn-icon">
            <Sliders size={20} color="white" />
            <ChevronUp size={12} className="ctrl-btn-chevron" />
          </div>
          <span>Host tools</span>
        </button>

        <button id="ctrl-more" className="ctrl-btn">
          <div className="ctrl-btn-icon">
            <MoreHorizontal size={20} color="white" />
          </div>
          <span>More</span>
        </button>

        <div className="ctrl-separator" />

        <button id="ctrl-end" className="ctrl-end-btn" onClick={() => setShowEndModal(true)}>
          <PhoneOff size={20} />
          <span>End</span>
        </button>
      </div>

      {/* End Meeting Modal */}
      {showEndModal && (
        <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">End Meeting</div>
            <div className="modal-text">
              Are you sure you want to end this meeting for all participants?
            </div>
            <div className="modal-actions">
              <button className="modal-btn-danger" onClick={handleEndMeeting}>
                End Meeting for All
              </button>
              <button className="modal-btn-cancel" onClick={() => { setShowEndModal(false); router.push('/'); }}>
                Leave Meeting
              </button>
              <button className="modal-btn-cancel" onClick={() => setShowEndModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
