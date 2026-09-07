'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic, MicOff, Video, VideoOff, Users, MessageSquare,
  Heart, MonitorUp, MonitorOff, MoreHorizontal, PhoneOff, X, Send,
  Sliders, ChevronUp, ChevronDown, ShieldCheck, Sparkles, LayoutGrid,
  Maximize2, Minimize2, Copy, Check, Info
} from 'lucide-react';
import { updateMeetingStatus, sendChatMessage, getChatMessages } from '@/lib/api';
import { WebRTCManager } from '@/lib/webrtc';

/* ─── Zoom Avatar Color Palette ───────────────────── */
const ZOOM_AVATAR_COLORS = [
  '#5B6EAB', // slate lavender (like "t" in Zoom)
  '#0C7C59', // teal green (like "ai" in Zoom)
  '#A0522D', // sienna / terracotta
  '#3E5F8A', // steel blue
  '#7B5294', // plum purple
  '#2C7A7B', // deep teal
  '#8C4351', // muted crimson
  '#556B2F', // olive
];

function getAvatarColor(name = '') {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return ZOOM_AVATAR_COLORS[Math.abs(h) % ZOOM_AVATAR_COLORS.length];
}

function getZoomAvatarText(name = '') {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts[0].toLowerCase() === 'ai') return 'ai';
  if (parts.length >= 2 && parts[0].length === 1 && parts[1].length === 1) {
    return (parts[0] + parts[1]).toLowerCase();
  }
  return parts[0][0].toLowerCase();
}

function formatMeetingId(id = '') {
  const digits = id.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return id;
}

function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = String(elapsed % 60).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}

/* ─── Single video tile ──────────────────────────── */
function VideoTile({
  stream,
  displayName,
  isVideoOff,
  isMuted,
  isSelf,
  isLarge,
  isThumbnail,
  isPinned,
  onPin,
}) {
  const videoRef = useRef(null);

  // Attach stream to video element without unmounting it
  const bindStream = useCallback((el) => {
    if (el) {
      videoRef.current = el;
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
      }
      if (!isVideoOff) {
        el.play().catch(() => {});
      }
    }
  }, [stream, isVideoOff]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      if (!isVideoOff) {
        el.play().catch(() => {});
      }
    }
  }, [stream, isVideoOff]);

  const color = getAvatarColor(displayName);
  const avatarText = getZoomAvatarText(displayName);

  return (
    <div
      className={`video-tile${isLarge ? ' large-tile' : ''}${isThumbnail ? ' thumb-tile' : ''}`}
      onClick={onPin}
    >
      {/* Real video element is ALWAYS mounted to prevent black screen bug */}
      <video
        ref={bindStream}
        autoPlay
        playsInline
        muted={isSelf} /* prevent echo on self-view */
        className="video-el"
        style={{ display: stream && !isVideoOff ? 'block' : 'none' }}
        onLoadedMetadata={(e) => {
          if (!isVideoOff) e.target.play().catch(() => {});
        }}
      />

      {/* Rounded Square Zoom Avatar (shown when video is off) */}
      {(!stream || isVideoOff) && (
        <div className="video-avatar-wrap">
          <div
            className="video-avatar"
            style={{
              background: color,
              width: isThumbnail ? 52 : isLarge ? 96 : 88,
              height: isThumbnail ? 52 : isLarge ? 96 : 88,
              fontSize: isThumbnail ? 22 : isLarge ? 48 : 42,
              borderRadius: isThumbnail ? '8px' : '12px',
            }}
          >
            {avatarText}
          </div>
        </div>
      )}

      {/* Speaker view Pin indicator */}
      {onPin && (
        <button
          className="tile-pin-btn"
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          title={isPinned ? 'Remove pin' : 'Pin video'}
        >
          {isPinned ? 'Remove Pin' : 'Pin'}
        </button>
      )}

      {/* Integrated Name Badge with Mic at bottom-left */}
      <div className="video-tile-name-badge">
        {isMuted ? (
          <MicOff size={13} color="#E02828" className="tile-mic-icon" />
        ) : (
          <Mic size={13} color="#FFFFFF" className="tile-mic-icon" />
        )}
        <span className="tile-name-text">{displayName}</span>
      </div>
    </div>
  );
}

/* ─── Main MeetingRoom Component ─────────────────── */
const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws');

export default function MeetingRoom({ meetingId, meeting, displayName, userId }) {
  const router   = useRouter();
  const timer    = useTimer();
  const rtcRef   = useRef(null);
  const chatEndRef = useRef(null);
  const participantsMenuRef = useRef(null);
  const infoPopoverRef = useRef(null);
  const reactionsBarRef = useRef(null);

  /* ── State ── */
  const [localStream,    setLocalStream]    = useState(null);
  const [remoteStreams,  setRemoteStreams]  = useState({});   // peerId → MediaStream
  const [peers,          setPeers]          = useState({});   // peerId → {display_name, is_muted, video_off}
  const [muted,          setMuted]          = useState(false);
  const [videoOff,       setVideoOff]       = useState(false);
  const [screenSharing,  setScreenSharing]  = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showParticipantsMenu, setShowParticipantsMenu] = useState(false);
  const [showChat,       setShowChat]       = useState(false);
  const [showEndModal,   setShowEndModal]   = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMeetingInfo, setShowMeetingInfo] = useState(false);
  const [showReactions,  setShowReactions]  = useState(false);
  const [activeReactions, setActiveReactions] = useState([]);
  const [toast,          setToast]          = useState('');
  const [viewMode,       setViewMode]       = useState('speaker'); // 'speaker' or 'gallery'
  const [pinnedId,       setPinnedId]       = useState(null);
  const [chatMessages,   setChatMessages]   = useState([]);
  const [chatInput,      setChatInput]      = useState('');
  const [permError,      setPermError]      = useState(null);
  const [connecting,     setConnecting]     = useState(true);
  const [isFullscreen,   setIsFullscreen]   = useState(false);

  /* ── Close popups on outside click ── */
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (showParticipantsMenu && !participantsMenuRef.current?.contains(e.target) && !e.target.closest('#ctrl-participants-arrow')) {
        setShowParticipantsMenu(false);
      }
      if (showMeetingInfo && !infoPopoverRef.current?.contains(e.target) && !e.target.closest('#meeting-info-trigger')) {
        setShowMeetingInfo(false);
      }
      if (showReactions && !reactionsBarRef.current?.contains(e.target) && !e.target.closest('#ctrl-react')) {
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [showParticipantsMenu, showMeetingInfo, showReactions]);

  /* ── Mount: init WebRTC ── */
  useEffect(() => {
    if (!meetingId || !userId || !displayName) return;

    const mgr = new WebRTCManager({
      meetingId,
      userId,
      displayName,
      wsBase: WS_BASE,
      onStreamsUpdate: (streams) => setRemoteStreams({ ...streams }),
      onPeersUpdate:  (p)       => setPeers({ ...p }),
      onChatMessage:  (msg)     => {
        setChatMessages(prev => [...prev, msg]);
        sendChatMessage(meetingId, {
          sender_name: msg.sender || 'Guest',
          is_self: false,
          is_guest: true,
          text: msg.text,
          created_at: msg.time || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        }).catch(() => {});
      },
      onHostMuteAll: () => {
        if (!isHost) {
          mgr.setMuted(true);
          setMuted(true);
          showToastMsg('The host has muted all participants.');
        }
      },
      onKicked: (reason) => {
        alert(reason);
        router.push('/');
      },
    });
    rtcRef.current = mgr;

    // Load continuous meeting chat history
    getChatMessages(meetingId)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setChatMessages(data.map(m => ({
            sender: m.sender_name,
            text: m.text,
            time: m.created_at,
            self: Boolean(m.is_self),
          })));
        }
      })
      .catch(() => {});

    (async () => {
      try {
        const stream = await mgr.init();
        setLocalStream(stream);

        const initMuted = typeof window !== 'undefined' && sessionStorage.getItem('initial_muted') === 'true';
        const initVideoOff = typeof window !== 'undefined' && sessionStorage.getItem('initial_video_off') === 'true';
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('initial_muted');
          sessionStorage.removeItem('initial_video_off');
        }

        if (initMuted) {
          mgr.setAudioMuted(true);
          setMuted(true);
        } else {
          setMuted(mgr.isMuted);
        }

        if (initVideoOff) {
          mgr.setVideoDisabled(true);
          setVideoOff(true);
        } else {
          setVideoOff(mgr.isVideoOff);
        }
      } catch (err) {
        setPermError(err.message);
      }
      mgr.connect();
      setConnecting(false);
    })();

    return () => mgr.cleanup();
  }, [meetingId, userId, displayName]);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /* ── Show Toast Helper ── */
  const showToastMsg = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }, []);

  /* ── Controls ── */
  const handleMute = useCallback(() => {
    const newVal = rtcRef.current?.toggleMute();
    if (newVal !== undefined) setMuted(newVal);
  }, []);

  const handleVideo = useCallback(async () => {
    const newVal = await rtcRef.current?.toggleVideo();
    if (newVal !== undefined) {
      setVideoOff(newVal);
      if (rtcRef.current?.localStream) {
        setLocalStream(new MediaStream(rtcRef.current.localStream.getTracks()));
      }
    }
  }, []);

  const handleScreenShare = useCallback(async () => {
    if (screenSharing) {
      await rtcRef.current?.stopScreenShare();
      setScreenSharing(false);
    } else {
      const ok = await rtcRef.current?.startScreenShare();
      if (ok) setScreenSharing(true);
    }
  }, [screenSharing]);

  const handleEnd = useCallback(async () => {
    rtcRef.current?.cleanup();
    try { await updateMeetingStatus(meetingId, 'ended'); } catch {}
    router.push('/');
  }, [meetingId, router]);

  const handleLeave = useCallback(() => {
    rtcRef.current?.cleanup();
    router.push('/');
  }, [router]);

  const sendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, {
      sender: displayName,
      text,
      time: timeStr,
      self: true,
    }]);
    rtcRef.current?.sendChat(text);
    sendChatMessage(meetingId, {
      sender_name: displayName,
      is_self: true,
      is_guest: false,
      text,
      created_at: timeStr,
    }).catch(() => {});
    setChatInput('');
  }, [chatInput, displayName, meetingId]);

  /* ── Share / Invite Helpers ── */
  const getInviteUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join?meetingId=${encodeURIComponent(meetingId)}`;
    }
    return `http://localhost:3000/join?meetingId=${meetingId}`;
  }, [meetingId]);

  const copyInviteLink = useCallback(() => {
    const url = getInviteUrl();
    navigator.clipboard.writeText(url).then(() => {
      showToastMsg('Invite link has been copied to the clipboard.');
      setShowParticipantsMenu(false);
    }).catch(() => {
      showToastMsg('Link copied to clipboard!');
      setShowParticipantsMenu(false);
    });
  }, [getInviteUrl, showToastMsg]);

  const copyFullInvitation = useCallback(() => {
    const url = getInviteUrl();
    const title = meeting?.title || `${displayName}'s Zoom Meeting`;
    const text = `Join Zoom Meeting\n${title}\n\nMeeting ID: ${formatMeetingId(meetingId)}\n\nJoin Link: ${url}`;
    navigator.clipboard.writeText(text).then(() => {
      showToastMsg('Invitation copied to clipboard.');
      setShowInviteModal(false);
    });
  }, [getInviteUrl, meeting, displayName, meetingId, showToastMsg]);

  /* ── Host Controls (Bonus Feature) ── */
  const handleMuteAll = useCallback(() => {
    if (rtcRef.current) {
      rtcRef.current.muteAll();
    }
    showToastMsg('All participants have been muted.');
  }, [showToastMsg]);

  const handleRemoveParticipant = useCallback((peerId, peerName) => {
    if (typeof window !== 'undefined' && window.confirm(`Remove ${peerName || 'participant'} from the meeting?`)) {
      if (rtcRef.current) {
        rtcRef.current.kickPeer(peerId);
      }
      showToastMsg(`${peerName || 'Participant'} was removed from the meeting.`);
    }
  }, [showToastMsg]);

  /* ── Reaction trigger ── */
  const triggerReaction = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    setActiveReactions(prev => [...prev, { id, emoji }]);
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
    setShowReactions(false);
  }, []);

  /* ── Fullscreen toggle ── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  /* ── Permission error screen ── */
  if (permError) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#121212',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'white', gap: 16, fontFamily: 'Inter, sans-serif', padding: 24,
      }}>
        <div style={{ fontSize: 40 }}>🎥</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Camera / Microphone Access Required</div>
        <p style={{ color: '#aaa', fontSize: 13, maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
          Please allow camera and microphone permissions in your browser settings and refresh the page.
        </p>
        <button
          style={{ padding: '8px 20px', background: '#0E71EB', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
          onClick={() => window.location.reload()}
        >
          Refresh & Retry
        </button>
        <button
          style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          onClick={handleLeave}
        >
          ← Leave meeting
        </button>
      </div>
    );
  }

  /* ── Build participant list ── */
  const peerList = Object.entries(peers).map(([pid, info]) => ({
    id:          pid,
    displayName: info.display_name,
    stream:      remoteStreams[pid] || null,
    isMuted:     info.is_muted  ?? false,
    isVideoOff:  info.video_off ?? false,
    isSelf:      false,
  }));

  const allTiles = [
    { id: userId, displayName, stream: localStream, isMuted: muted, isVideoOff: videoOff, isSelf: true },
    ...peerList,
  ];

  const totalTiles = allTiles.length;
  const meetingTitle = meeting?.title || `${displayName || 'test one'}'s Zoom Meeting`;

  // Determine active speaker / pinned tile for Speaker View
  const mainPinnedTile = pinnedId
    ? allTiles.find(t => t.id === pinnedId) || allTiles[0]
    : allTiles[0];

  const thumbnailTiles = allTiles.filter(t => t.id !== mainPinnedTile?.id);

  /* ─────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────── */
  return (
    <div className="meeting-room">

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="zoom-toast">
          <Check size={16} color="#00D06C" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── Floating Reaction Emojis ── */}
      <div className="floating-reactions-layer">
        {activeReactions.map(r => (
          <div key={r.id} className="floating-emoji">
            {r.emoji}
          </div>
        ))}
      </div>

      {/* ── Top Bar (Exact Zoom Workplace Meeting Style) ── */}
      <div className="room-topbar">
        <div className="room-topbar-left">
          {/* Info Button + Meeting Title */}
          <div
            className="meeting-title-wrap"
            onClick={() => setShowMeetingInfo(v => !v)}
            title="Meeting information"
          >
            <button
              id="meeting-info-trigger"
              className="meeting-info-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowMeetingInfo(v => !v);
              }}
              title="Meeting information"
            >
              <Info size={15} />
            </button>
            <span className="room-meeting-title">{meetingTitle}</span>
          </div>

          {/* Meeting Info Popover */}
          {showMeetingInfo && (
            <div className="meeting-info-popover" ref={infoPopoverRef}>
              <div className="info-popover-title">{meetingTitle}</div>
              <div className="info-popover-divider" />
              <div className="info-popover-row">
                <span className="info-row-label">Meeting ID:</span>
                <span className="info-row-val font-mono">{formatMeetingId(meetingId)}</span>
              </div>
              <div className="info-popover-row">
                <span className="info-row-label">Host:</span>
                <span className="info-row-val">{meeting?.host_name || displayName}</span>
              </div>
              <div className="info-popover-row">
                <span className="info-row-label">Invite Link:</span>
                <button className="info-link-btn" onClick={copyInviteLink}>
                  Copy Link
                </button>
              </div>
              <div className="info-popover-row">
                <span className="info-row-label">Security:</span>
                <span className="info-row-val green-text">Enhanced encryption</span>
              </div>
            </div>
          )}
        </div>

        <div className="room-topbar-right">
          {/* Green Security Shield */}
          <div className="room-shield-wrap" title="Enhanced encryption active">
            <ShieldCheck size={16} color="#00D06C" />
          </div>

          <div className="topbar-divider" />

          {/* View Mode Switcher */}
          <button
            className="room-view-toggle-btn"
            onClick={() => setViewMode(v => v === 'speaker' ? 'gallery' : 'speaker')}
            title={viewMode === 'speaker' ? 'Switch to Gallery view' : 'Switch to Speaker view'}
          >
            <LayoutGrid size={14} />
            <span>{viewMode === 'speaker' ? 'View' : 'Speaker'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            className="room-top-icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Middle Stage & Dockable Side Panels ── */}
      <div className="meeting-stage-container">
        <div className="meeting-stage-left">
          {/* Video Grid Area */}
          <div className="video-grid">
            {viewMode === 'speaker' && totalTiles > 1 ? (
              /* Speaker View (Thumbnails on top + Large pinned stage below - Matching Image 1) */
              <div className="speaker-view-layout">
                {/* Top thumbnail row */}
                <div className="speaker-thumbnails-row">
                  {thumbnailTiles.map(tile => (
                    <div key={tile.id} className="thumb-tile-container">
                      <VideoTile
                        stream={tile.stream}
                        displayName={tile.displayName}
                        isVideoOff={tile.isVideoOff}
                        isMuted={tile.isMuted}
                        isSelf={tile.isSelf}
                        isThumbnail={true}
                        onPin={() => setPinnedId(tile.id)}
                      />
                    </div>
                  ))}
                </div>

                {/* Main Stage Tile */}
                <div className="speaker-main-stage">
                  {mainPinnedTile && (
                    <VideoTile
                      stream={mainPinnedTile.stream}
                      displayName={mainPinnedTile.displayName}
                      isVideoOff={mainPinnedTile.isVideoOff}
                      isMuted={mainPinnedTile.isMuted}
                      isSelf={mainPinnedTile.isSelf}
                      isLarge={true}
                      isPinned={true}
                      onPin={() => setPinnedId(pinnedId ? null : mainPinnedTile.id)}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* Gallery View / Single User Stage */
              <div className={`video-grid-inner ${totalTiles === 1 ? 'grid-1' : totalTiles === 2 ? 'grid-2' : totalTiles <= 4 ? 'grid-4' : 'grid-many'}`}>
                {allTiles.map(tile => (
                  <VideoTile
                    key={tile.id}
                    stream={tile.stream}
                    displayName={tile.displayName}
                    isVideoOff={tile.isVideoOff}
                    isMuted={tile.isMuted}
                    isSelf={tile.isSelf}
                    isLarge={totalTiles === 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Bottom Control Bar (Exact Zoom 3-Zone Layout Matching Screenshots 1, 3, 4, 5) ── */}
          <div className="control-bar">
            {/* Zone 1: Left-aligned Audio & Video */}
            <div className="ctrl-left-group">
              {/* 1. Mute / Unmute */}
              <button
                id="ctrl-audio"
                className={`ctrl-btn${muted ? ' muted' : ''}`}
                onClick={handleMute}
                title={muted ? 'Unmute' : 'Mute'}
              >
                <div className="ctrl-btn-icon">
                  {muted
                    ? <MicOff size={19} className="ctrl-icon" color="#E02828" />
                    : <Mic    size={19} className="ctrl-icon" color="white" />}
                  <ChevronUp size={11} className="ctrl-btn-chevron" />
                </div>
                <span>{muted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* 2. Video */}
              <button
                id="ctrl-video"
                className={`ctrl-btn${videoOff ? ' video-off' : ''}`}
                onClick={handleVideo}
                title={videoOff ? 'Start Video' : 'Stop Video'}
              >
                <div className="ctrl-btn-icon">
                  {videoOff
                    ? <VideoOff size={19} color="#E02828" />
                    : <Video    size={19} color="white" />}
                  <ChevronUp size={11} className="ctrl-btn-chevron" />
                </div>
                <span>Video</span>
              </button>
            </div>

            {/* Zone 2: Center-aligned Primary Meeting Controls */}
            <div className="ctrl-center-group">
              {/* 3. Participants (with Up-Arrow Popup Menu) */}
              <div className="ctrl-btn-wrapper">
                <button
                  id="ctrl-participants"
                  className={`ctrl-btn${showParticipants ? ' active-ctrl' : ''}`}
                  onClick={() => {
                    setShowParticipants(p => !p);
                    setShowChat(false);
                  }}
                >
                  <div className="ctrl-btn-icon">
                    <Users size={19} color="white" />
                    <span className="participants-badge">{totalTiles}</span>
                    <span
                      id="ctrl-participants-arrow"
                      className="ctrl-arrow-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowParticipantsMenu(v => !v);
                      }}
                      title="Invite options"
                    >
                      <ChevronUp size={11} className="ctrl-btn-chevron hoverable" />
                    </span>
                  </div>
                  <span>Participants</span>
                </button>

                {/* Up-Arrow Popup Menu (Matching Screenshot 3) */}
                {showParticipantsMenu && (
                  <div className="participants-popup-menu" ref={participantsMenuRef}>
                    <button
                      id="popup-invite-btn"
                      className="popup-menu-item"
                      onClick={() => {
                        setShowParticipantsMenu(false);
                        setShowInviteModal(true);
                      }}
                    >
                      <span>Invite...</span>
                    </button>
                    <button
                      id="popup-copy-link-btn"
                      className="popup-menu-item"
                      onClick={copyInviteLink}
                    >
                      <span>Copy invite link</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Chat */}
              <button
                id="ctrl-chat"
                className={`ctrl-btn${showChat ? ' active-ctrl' : ''}`}
                onClick={() => {
                  setShowChat(c => !c);
                  setShowParticipants(false);
                }}
              >
                <div className="ctrl-btn-icon">
                  <MessageSquare size={19} color="white" />
                </div>
                <span>Chat</span>
              </button>

              {/* 5. React (Heart Icon matching Screenshots 1 & 3) */}
              <div className="ctrl-btn-wrapper">
                <button
                  id="ctrl-react"
                  className={`ctrl-btn${showReactions ? ' active-ctrl' : ''}`}
                  onClick={() => setShowReactions(v => !v)}
                >
                  <div className="ctrl-btn-icon">
                    <Heart size={19} color="white" />
                  </div>
                  <span>React</span>
                </button>

                {/* Reactions Floating Bar */}
                {showReactions && (
                  <div className="reactions-bar" ref={reactionsBarRef}>
                    {['👍', '❤️', '👏', '😂', '😮', '🎉'].map((emoji) => (
                      <button
                        key={emoji}
                        className="reaction-emoji-btn"
                        onClick={() => triggerReaction(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Share (Zoom Signature Green Icon matching Screenshots 1 & 3) */}
              <button
                id="ctrl-share"
                className={`ctrl-btn${screenSharing ? ' active-ctrl' : ''}`}
                onClick={handleScreenShare}
                title={screenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <div className="ctrl-btn-icon">
                  <div className="zoom-share-icon-wrap">
                    <MonitorUp size={15} color="white" strokeWidth={2.5} />
                  </div>
                  <ChevronUp size={11} className="ctrl-btn-chevron" />
                </div>
                <span>Share</span>
              </button>

              {/* 7. Host Tools */}
              <button id="ctrl-host" className="ctrl-btn">
                <div className="ctrl-btn-icon">
                  <Sliders size={19} color="white" />
                </div>
                <span>Host tools</span>
              </button>

              {/* 8. Zoom AI */}
              <button id="ctrl-zoom-ai" className="ctrl-btn">
                <div className="ctrl-btn-icon">
                  <Sparkles size={19} color="white" />
                </div>
                <span>Zoom AI</span>
              </button>

              {/* 9. More */}
              <button id="ctrl-more" className="ctrl-btn">
                <div className="ctrl-btn-icon">
                  <MoreHorizontal size={19} color="white" />
                </div>
                <span>More</span>
              </button>
            </div>

            {/* Zone 3: Right-aligned End Meeting Button */}
            <div className="ctrl-right-group">
              <button
                id="ctrl-end"
                className="ctrl-end-btn"
                onClick={() => setShowEndModal(true)}
                title="End meeting"
              >
                <div className="end-icon-square">
                  <X size={14} color="white" strokeWidth={3} />
                </div>
                <span>End</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Participants Side Panel (Matching Screenshot 5) ── */}
        {showParticipants && (
          <div className="meeting-side-panel participants-side-panel">
            <div className="side-panel-header">
              <span className="side-panel-title">Participants ({totalTiles})</span>
              <button className="panel-close" onClick={() => setShowParticipants(false)} title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="participants-list-scroll dark-scroll">
              {/* Self */}
              <div className="participant-row">
                <div className="participant-avatar" style={{ background: getAvatarColor(displayName) }}>
                  {getZoomAvatarText(displayName)}
                </div>
                <div className="participant-info">
                  <span className="participant-name">{displayName} (Host, me)</span>
                </div>
                <div className="participant-status-icons">
                  {muted ? <MicOff size={14} color="#E02828" /> : <Mic size={14} color="#FFFFFF" />}
                  {videoOff ? <VideoOff size={14} color="#E02828" /> : <Video size={14} color="#FFFFFF" />}
                </div>
              </div>
              {/* Remote peers */}
              {peerList.map(p => (
                <div key={p.id} className="participant-row">
                  <div className="participant-avatar" style={{ background: getAvatarColor(p.displayName) }}>
                    {getZoomAvatarText(p.displayName)}
                  </div>
                  <div className="participant-info">
                    <span className="participant-name">{p.displayName} (Guest)</span>
                  </div>
                  <div className="participant-status-icons" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.isMuted ? <MicOff size={14} color="#E02828" /> : <Mic size={14} color="#FFFFFF" />}
                    {p.isVideoOff ? <VideoOff size={14} color="#E02828" /> : <Video size={14} color="#FFFFFF" />}
                    {isHost && (
                      <button
                        className="participant-remove-btn"
                        onClick={() => handleRemoveParticipant(p.id, p.displayName)}
                        title={`Remove ${p.displayName}`}
                        style={{
                          background: 'rgba(224, 40, 40, 0.15)',
                          border: '1px solid rgba(224, 40, 40, 0.35)',
                          color: '#FF6B6B',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          lineHeight: '1.2'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="participants-bottom-actions">
              <button className="side-pill-btn" onClick={() => setShowInviteModal(true)}>
                Invite
              </button>
              <button className="side-pill-btn" onClick={handleMuteAll}>
                Mute All
              </button>
              <button className="side-pill-btn icon-only" title="More options">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Chat Side Panel (Matching Screenshot 4) ── */}
        {showChat && (
          <div className="meeting-side-panel chat-side-panel">
            <div className="side-panel-header">
              <span className="side-panel-title">{meetingTitle}</span>
              <button className="panel-close" onClick={() => setShowChat(false)} title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="chat-messages-scroll dark-scroll">
              <div className="chat-disclaimer-notice">
                Messages addressed to &ldquo;Meeting Group Chat&rdquo; will also appear in the meeting group chat in Team Chat
              </div>
              {chatMessages.length === 0 && (
                <div className="chat-empty-state">
                  No messages yet.<br />Say hello! 👋
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-message-group${msg.self ? ' self' : ''}`}>
                  <div className="chat-sender-header">
                    <span className="sender-name">{msg.self ? 'You' : msg.sender}</span>
                    <span className="sender-time">{msg.time}</span>
                  </div>
                  <div className="chat-bubble-text">{msg.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-compose-box">
              <div className="chat-privacy-hint">
                <span>Who can see your messages?</span>
              </div>
              <div className="chat-recipient-row">
                <span className="chat-to-label">To:</span>
                <span className="chat-recipient-pill">Meeting Group Chat</span>
              </div>
              <div className="chat-textarea-wrap">
                <textarea
                  id="chat-msg-input"
                  className="chat-textarea"
                  placeholder="Type message here ..."
                  rows={2}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                />
                <div className="chat-textarea-footer">
                  <div className="chat-toolbar-icons">
                    <span className="chat-tool-icon" title="Formatting">Aa</span>
                    <span className="chat-tool-icon" title="Attach file">📎</span>
                    <span className="chat-tool-icon" title="Emoji">😊</span>
                  </div>
                  <button className="chat-submit-plane-btn" onClick={sendChat} id="chat-send-btn" title="Send">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Invite Modal (Opened from Participants ^ Menu) ── */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-card invite-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title">Invite people to join meeting</div>
              <button className="panel-close" onClick={() => setShowInviteModal(false)}><X size={18} /></button>
            </div>
            <div className="invite-details-box">
              <div className="invite-row">
                <span className="invite-label">Topic:</span>
                <span className="invite-val font-semibold">{meetingTitle}</span>
              </div>
              <div className="invite-row">
                <span className="invite-label">Meeting ID:</span>
                <span className="invite-val font-mono">{formatMeetingId(meetingId)}</span>
              </div>
              <div className="invite-row">
                <span className="invite-label">Invite Link:</span>
                <span className="invite-val invite-link-text">{getInviteUrl()}</span>
              </div>
            </div>
            <div className="invite-modal-actions">
              <button className="zoom-blue-btn" onClick={copyInviteLink}>
                <Copy size={16} />
                <span>Copy Invite Link</span>
              </button>
              <button className="zoom-outline-btn" onClick={copyFullInvitation}>
                <span>Copy Invitation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End Meeting Modal ── */}
      {showEndModal && (
        <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">End Meeting</div>
            <div className="modal-text">
              Choose how you'd like to leave this meeting.
            </div>
            <div className="modal-actions">
              <button className="modal-btn-danger" onClick={handleEnd}>
                End Meeting for All
              </button>
              <button className="modal-btn-cancel" onClick={handleLeave}>
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
