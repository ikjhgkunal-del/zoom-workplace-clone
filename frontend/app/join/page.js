'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, Mic, MicOff, Video, VideoOff, Image as ImageIcon,
  Check, Sparkles, RefreshCw
} from 'lucide-react';
import { getMeeting, joinMeeting } from '@/lib/api';
import { createFallbackCanvasTrack } from '@/lib/webrtc';
import { toast } from '@/components/Toast';
import { getStoredName } from '@/lib/useProfile';

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillId = params.get('meetingId') || '';

  const [meetingId, setMeetingId] = useState(prefillId);
  const [name, setName] = useState('');
  const [rememberName, setRememberName] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Media preview state
  const videoRef = useRef(null);
  const [previewStream, setPreviewStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [virtualBg, setVirtualBg] = useState('none'); // 'none' | 'blur' | 'office' | 'studio'
  const [showBgMenu, setShowBgMenu] = useState(false);

  useEffect(() => {
    if (prefillId) setMeetingId(prefillId);
  }, [prefillId]);

  useEffect(() => {
    const saved = getStoredName();
    if (saved) setName(saved);
  }, []);

  // Initialize camera and mic preview
  useEffect(() => {
    let activeStream = null;
    let isMounted = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        activeStream = stream;
        setPreviewStream(stream);
      } catch (err) {
        console.warn('Real camera/mic failed, falling back to simulated track:', err.message);
        try {
          // Try audio only + canvas video
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!isMounted) {
            audioStream.getTracks().forEach(t => t.stop());
            return;
          }
          const canvasTrack = createFallbackCanvasTrack(name);
          if (canvasTrack) audioStream.addTrack(canvasTrack);
          activeStream = audioStream;
          setPreviewStream(audioStream);
        } catch {
          // Complete fallback for restricted browser/permissions
          const fallbackStream = new MediaStream();
          const canvasTrack = createFallbackCanvasTrack(name);
          if (canvasTrack) fallbackStream.addTrack(canvasTrack);
          activeStream = fallbackStream;
          setPreviewStream(fallbackStream);
        }
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Attach stream to video element
  useEffect(() => {
    const el = videoRef.current;
    if (el && previewStream) {
      if (el.srcObject !== previewStream) {
        el.srcObject = previewStream;
      }
      if (!videoOff) {
        el.play().catch(() => {});
      }
    }
  }, [previewStream, videoOff]);

  // Audio level analyser for mic preview
  useEffect(() => {
    if (!previewStream || muted) {
      setAudioLevel(0);
      return;
    }

    const audioTrack = previewStream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      setAudioLevel(0);
      return;
    }

    let audioCtx = null;
    let analyser = null;
    let source = null;
    let animId = null;

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        source = audioCtx.createMediaStreamSource(previewStream);
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const level = Math.min(100, Math.round((avg / 120) * 100));
          setAudioLevel(level);
          animId = requestAnimationFrame(loop);
        };
        loop();
      }
    } catch {
      // AudioContext policy
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) source.disconnect();
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
    };
  }, [previewStream, muted]);

  // Toggle Video
  const handleToggleVideo = () => {
    const nextVideoOff = !videoOff;
    setVideoOff(nextVideoOff);
    if (previewStream) {
      previewStream.getVideoTracks().forEach(track => {
        track.enabled = !nextVideoOff;
      });
    }
  };

  // Toggle Audio
  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (previewStream) {
      previewStream.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanId = meetingId.replace(/\s+/g, '').trim();
    if (!cleanId) { setError('Please enter a Meeting ID'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    setError('');
    setLoading(true);
    try {
      await getMeeting(cleanId);
      await joinMeeting(cleanId, name.trim(), false);
      // Persist name for future sessions
      if (rememberName) localStorage.setItem('zoom_display_name', name.trim());
      // Save for the meeting room (used by WebRTC)
      sessionStorage.setItem('display_name', name.trim());
      sessionStorage.setItem('is_host', 'false');
      sessionStorage.setItem('initial_muted', muted ? 'true' : 'false');
      sessionStorage.setItem('initial_video_off', videoOff ? 'true' : 'false');

      // Stop preview stream before moving to meeting room
      if (previewStream) {
        previewStream.getTracks().forEach(t => t.stop());
      }

      router.push(`/meeting/${cleanId}`);
    } catch (err) {
      const msg = err.message || 'Meeting not found. Check the ID and try again.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-format meeting ID with spaces: 123 456 7890
  const handleMeetingIdChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 3 && digits.length <= 6) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length > 6) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
    setMeetingId(formatted);
  };

  const handleBack = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(t => t.stop());
    }
    router.push('/');
  };

  const initialLetter = (name.trim()[0] || 't').toLowerCase();

  return (
    <div className="join-page">
      {/* Top bar */}
      <div className="join-topbar">
        <button className="join-back-btn" onClick={handleBack}>
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      {/* Body */}
      <div className="join-body">
        {/* Camera Preview */}
        <div className="join-preview">
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="join-preview-video"
            style={{
              display: videoOff ? 'none' : 'block',
              filter: virtualBg === 'blur' ? 'blur(8px)' : 'none',
              background: virtualBg === 'office' ? '#2D3748' : (virtualBg === 'studio' ? '#1A202C' : '#000000')
            }}
          />

          {/* Camera Off Avatar State */}
          {videoOff && (
            <div className="join-avatar-view">
              <div className="join-avatar-circle">
                {initialLetter}
              </div>
              <div className="join-camera-off-text">Camera is off</div>
            </div>
          )}

          {/* Name & Live Mic Level Badge (Bottom-Left) */}
          <div className="join-name-mic-badge">
            {muted ? (
              <MicOff size={13} color="#E02828" />
            ) : (
              <div className="join-audio-level-indicator">
                <Mic size={13} color="#FFFFFF" />
                {audioLevel > 12 && <div className="join-audio-pulse-ring" />}
              </div>
            )}
            <span>{name || 'test one'}</span>
          </div>

          {/* Preview Controls (Bottom Center) */}
          <div className="join-preview-controls">
            <button
              type="button"
              className="join-control-btn"
              onClick={handleToggleMute}
              id="join-toggle-mute"
            >
              <div className={`join-control-icon${muted ? ' muted' : (audioLevel > 18 ? ' speaking' : '')}`}>
                {muted ? <MicOff size={18} color="#E02828" /> : <Mic size={18} />}
              </div>
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              type="button"
              className="join-control-btn"
              onClick={handleToggleVideo}
              id="join-toggle-video"
            >
              <div className={`join-control-icon${videoOff ? ' video-off' : ''}`}>
                {videoOff ? <VideoOff size={18} color="#E02828" /> : <Video size={18} />}
              </div>
              <span>{videoOff ? 'Start Video' : 'Stop Video'}</span>
            </button>
          </div>

          {/* Virtual Backgrounds Popover Button */}
          <button
            type="button"
            className="join-bg-btn"
            onClick={() => setShowBgMenu(v => !v)}
            id="join-bg-btn"
          >
            <ImageIcon size={12} />
            <span>Backgrounds</span>
          </button>

          {/* Backgrounds Options Popover */}
          {showBgMenu && (
            <div className="join-bg-popover">
              <button
                type="button"
                className={`join-bg-option${virtualBg === 'none' ? ' active' : ''}`}
                onClick={() => { setVirtualBg('none'); setShowBgMenu(false); }}
              >
                <span>None</span>
              </button>
              <button
                type="button"
                className={`join-bg-option${virtualBg === 'blur' ? ' active' : ''}`}
                onClick={() => { setVirtualBg('blur'); setShowBgMenu(false); }}
              >
                <span>Blur</span>
              </button>
              <button
                type="button"
                className={`join-bg-option${virtualBg === 'office' ? ' active' : ''}`}
                onClick={() => { setVirtualBg('office'); setShowBgMenu(false); }}
              >
                <span>Office</span>
              </button>
              <button
                type="button"
                className={`join-bg-option${virtualBg === 'studio' ? ' active' : ''}`}
                onClick={() => { setVirtualBg('studio'); setShowBgMenu(false); }}
              >
                <span>Studio</span>
              </button>
            </div>
          )}
        </div>

        {/* Form Panel */}
        <form className="join-form-panel" onSubmit={handleJoin}>
          <h1 className="join-form-title">Enter Meeting Info</h1>

          <label className="join-form-label" htmlFor="join-meeting-id">Meeting ID or Link</label>
          <input
            id="join-meeting-id"
            className="join-form-input"
            placeholder="123 456 7890"
            value={meetingId}
            onChange={handleMeetingIdChange}
            inputMode="numeric"
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
