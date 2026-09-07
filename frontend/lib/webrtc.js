/**
 * WebRTCManager — handles all WebRTC and WebSocket signaling for a meeting room.
 *
 * Usage:
 *   const mgr = new WebRTCManager({ meetingId, userId, displayName, wsBase,
 *                                    onStreamsUpdate, onPeersUpdate, onChatMessage });
 *   const localStream = await mgr.init();  // getUserMedia
 *   mgr.connect();                          // open WebSocket, start signaling
 *   // ... user is in the call ...
 *   mgr.cleanup();                          // on unmount / leave
 */

/* ─── Animated Fallback Video Track Generator ─────────── */
export function createFallbackCanvasTrack(displayName = 'test one') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  let frame = 0;
  let animId = null;

  function draw() {
    frame++;
    // Dark sleek gradient background matching Zoom
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    const hue1 = 215 + Math.sin(frame * 0.02) * 12;
    const hue2 = 230 + Math.cos(frame * 0.02) * 12;
    grad.addColorStop(0, `hsl(${hue1}, 24%, 18%)`);
    grad.addColorStop(1, `hsl(${hue2}, 28%, 11%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    // Subtle moving ambient particles/rings
    const cx = 320, cy = 160;
    const pulse = Math.sin(frame * 0.06) * 5;

    // Glowing avatar container
    ctx.beginPath();
    ctx.arc(cx, cy, 50 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#5B6EAB';
    ctx.fill();

    // White lowercase letter in center
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (displayName && displayName.trim()) ? displayName.trim()[0].toLowerCase() : 't';
    ctx.fillText(initial, cx, cy);

    // Live video indicator badge
    ctx.fillStyle = 'rgba(0, 208, 108, 0.9)';
    ctx.beginPath();
    ctx.arc(cx - 70, cy + 85, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.textAlign = 'left';
    ctx.fillText(`${displayName} (Video Active)`, cx - 58, cy + 89);

    animId = requestAnimationFrame(draw);
  }
  draw();

  const stream = canvas.captureStream(30);
  const track = stream.getVideoTracks()[0];
  if (track) {
    const origStop = track.stop.bind(track);
    track.stop = () => {
      if (animId) cancelAnimationFrame(animId);
      origStop();
    };
  }
  return track;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCManager {
  constructor({ meetingId, userId, displayName, wsBase, onStreamsUpdate, onPeersUpdate, onChatMessage, onHostMuteAll, onKicked }) {
    this.meetingId    = meetingId;
    this.userId       = userId;
    this.displayName  = displayName;
    this.wsBase       = wsBase;

    // Callbacks
    this.onStreamsUpdate = onStreamsUpdate || (() => {});
    this.onPeersUpdate   = onPeersUpdate   || (() => {});
    this.onChatMessage   = onChatMessage   || (() => {});
    this.onHostMuteAll   = onHostMuteAll   || (() => {});
    this.onKicked        = onKicked        || (() => {});

    // State
    this.ws             = null;
    this.localStream    = null;
    this.screenStream   = null;
    this.peerConns      = {};   // peerId → RTCPeerConnection
    this.remoteStreams   = {};   // peerId → MediaStream
    this.peers          = {};   // peerId → { display_name, is_muted, video_off }
    this.isMuted        = false;
    this.isVideoOff     = false;
    this.isScreenSharing = false;
    this._pendingIce    = {};   // peerId → [candidate, ...] queued before remote desc set
  }

  /* ─────────────────────────────────────────────
     1.  GET LOCAL MEDIA
     ───────────────────────────────────────────── */
  async init() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (videoErr) {
      console.warn('Real camera unavailable, creating live fallback stream:', videoErr.message);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (audioErr) {
        console.warn('Mic unavailable:', audioErr.message);
        this.localStream = new MediaStream();
        this.isMuted = true;
      }
      // Add animated fallback track so video is available when enabled
      const fallbackTrack = createFallbackCanvasTrack(this.displayName);
      if (fallbackTrack) {
        this.localStream.addTrack(fallbackTrack);
      }
      this.isVideoOff = false;
    }
    return this.localStream;
  }

  /* ─────────────────────────────────────────────
     2.  CONNECT TO SIGNALING SERVER
     ───────────────────────────────────────────── */
  connect() {
    const wsUrl = `${this.wsBase}/ws/${this.meetingId}` +
      `?user_id=${encodeURIComponent(this.userId)}` +
      `&display_name=${encodeURIComponent(this.displayName)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen  = () => console.log('[WS] Connected to signaling server');
    this.ws.onclose = () => console.log('[WS] Disconnected from signaling server');
    this.ws.onerror = (e) => console.error('[WS] Error:', e);

    this.ws.onmessage = async (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      await this._handleSignal(data);
    };
  }

  /* ─────────────────────────────────────────────
     3.  SIGNALING MESSAGE HANDLER
     ───────────────────────────────────────────── */
  async _handleSignal(data) {
    const { type } = data;

    switch (type) {
      /* Server sends us the list of already-connected peers → we initiate offers */
      case 'peers': {
        for (const peer of data.peers) {
          this._registerPeer(peer);
          await this._createOffer(peer.user_id);
        }
        this.onPeersUpdate({ ...this.peers });
        break;
      }

      /* A new peer joined after us → they will send us an offer */
      case 'peer-joined': {
        this._registerPeer(data.peer);
        this.onPeersUpdate({ ...this.peers });
        break;
      }

      /* Incoming WebRTC offer → answer it */
      case 'offer': {
        await this._handleOffer(data.from, data.sdp);
        break;
      }

      /* Remote peer accepted our offer */
      case 'answer': {
        await this._handleAnswer(data.from, data.sdp);
        break;
      }

      /* ICE candidate from a peer */
      case 'ice': {
        await this._handleIce(data.from, data.candidate);
        break;
      }

      /* Peer disconnected */
      case 'peer-left': {
        this._removePeer(data.user_id);
        break;
      }

      /* Peer muted/unmuted */
      case 'peer-muted': {
        if (this.peers[data.user_id]) {
          this.peers[data.user_id].is_muted = data.muted;
          this.onPeersUpdate({ ...this.peers });
        }
        break;
      }

      /* Peer toggled video */
      case 'peer-video': {
        if (this.peers[data.user_id]) {
          this.peers[data.user_id].video_off = data.videoOff;
          this.onPeersUpdate({ ...this.peers });
        }
        break;
      }

      /* Chat message from a peer */
      case 'chat': {
        this.onChatMessage({
          sender: data.display_name,
          text:   data.text,
          time:   new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
        break;
      }

      /* Host muted all participants */
      case 'host-mute-all': {
        this.onHostMuteAll();
        break;
      }

      /* Kicked from meeting by host */
      case 'kicked': {
        this.onKicked(data.reason || 'You have been removed from the meeting by the host.');
        break;
      }

      default:
        console.warn('[WS] Unknown message type:', type);
    }
  }

  /* ─────────────────────────────────────────────
     4.  PEER CONNECTION MANAGEMENT
     ───────────────────────────────────────────── */
  _registerPeer(peer) {
    this.peers[peer.user_id] = {
      display_name: peer.display_name,
      is_muted:     peer.is_muted  ?? false,
      video_off:    peer.video_off ?? false,
    };
  }

  _createPeerConnection(peerId) {
    if (this.peerConns[peerId]) return this.peerConns[peerId];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConns[peerId] = pc;
    this._pendingIce[peerId] = [];

    /* Add local tracks so the peer can receive our media */
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    /* Send ICE candidates to the peer via signaling server */
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ice', target: peerId, candidate }));
      }
    };

    /* Build the remote stream as tracks arrive */
    const remoteStream = new MediaStream();
    this.remoteStreams[peerId] = remoteStream;

    pc.ontrack = ({ track }) => {
      remoteStream.addTrack(track);
      this.onStreamsUpdate({ ...this.remoteStreams });
    };

    /* Clean up if connection drops */
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Peer ${peerId} state: ${state}`);
      if (state === 'failed' || state === 'closed') {
        this._removePeer(peerId);
      }
    };

    return pc;
  }

  async _createOffer(peerId) {
    const pc = this._createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this._send({ type: 'offer', target: peerId, sdp: pc.localDescription });
  }

  async _handleOffer(peerId, sdp) {
    const pc = this._createPeerConnection(peerId);
    try {
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush queued ICE candidates
      for (const c of (this._pendingIce[peerId] || [])) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      this._pendingIce[peerId] = [];

      if (pc.signalingState === 'have-remote-offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this._send({ type: 'answer', target: peerId, sdp: pc.localDescription });
      }
    } catch (err) {
      console.warn('Error handling offer:', err.message);
    }
  }

  async _handleAnswer(peerId, sdp) {
    const pc = this.peerConns[peerId];
    if (!pc) return;
    try {
      if (pc.signalingState !== 'have-local-offer') {
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush queued ICE candidates
      for (const c of (this._pendingIce[peerId] || [])) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      this._pendingIce[peerId] = [];
    } catch (err) {
      console.warn('Error handling answer:', err.message);
    }
  }

  async _handleIce(peerId, candidate) {
    if (!candidate) return;
    const pc = this.peerConns[peerId];
    if (!pc || !pc.remoteDescription) {
      // Queue until remote description is set
      this._pendingIce[peerId] = this._pendingIce[peerId] || [];
      this._pendingIce[peerId].push(candidate);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  }

  _removePeer(peerId) {
    this.peerConns[peerId]?.close();
    delete this.peerConns[peerId];
    delete this.remoteStreams[peerId];
    delete this.peers[peerId];
    delete this._pendingIce[peerId];
    this.onStreamsUpdate({ ...this.remoteStreams });
    this.onPeersUpdate({ ...this.peers });
  }

  /* ─────────────────────────────────────────────
     5.  MEDIA CONTROLS
     ───────────────────────────────────────────── */
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = !this.isMuted; });
    this._send({ type: 'mute', muted: this.isMuted });
    return this.isMuted;
  }

  async toggleVideo() {
    this.isVideoOff = !this.isVideoOff;

    if (!this.isVideoOff) {
      // Turning camera back ON
      let videoTrack = this.localStream?.getVideoTracks()[0];

      if (!videoTrack || videoTrack.readyState === 'ended') {
        let freshTrack = null;
        try {
          const freshMedia = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          });
          freshTrack = freshMedia.getVideoTracks()[0];
        } catch (err) {
          console.warn('Could not access hardware camera, falling back to simulated camera stream:', err.message);
          freshTrack = createFallbackCanvasTrack(this.displayName);
        }

        if (freshTrack) {
          if (videoTrack && this.localStream) {
            this.localStream.removeTrack(videoTrack);
            videoTrack.stop();
          }
          if (this.localStream) {
            this.localStream.addTrack(freshTrack);
          }
          videoTrack = freshTrack;

          // Update peer connections
          for (const pc of Object.values(this.peerConns)) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              await sender.replaceTrack(freshTrack).catch(() => {});
            } else {
              pc.addTrack(freshTrack, this.localStream);
            }
          }
        }
      }

      if (videoTrack) {
        videoTrack.enabled = true;
      }
    } else {
      // Turning camera OFF
      this.localStream?.getVideoTracks().forEach(t => { t.enabled = false; });
    }

    this._send({ type: 'video', videoOff: this.isVideoOff });
    return this.isVideoOff;
  }

  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      });
      const screenVideoTrack = this.screenStream.getVideoTracks()[0];

      // Replace the video track in every existing peer connection
      for (const pc of Object.values(this.peerConns)) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenVideoTrack);
      }

      // Replace in local stream so self-view shows screen
      const oldVideo = this.localStream?.getVideoTracks()[0];
      if (oldVideo && this.localStream) {
        this.localStream.removeTrack(oldVideo);
        oldVideo.stop();
      }
      this.localStream?.addTrack(screenVideoTrack);

      screenVideoTrack.onended = () => this.stopScreenShare();
      this.isScreenSharing = true;
      this.onStreamsUpdate({ ...this.remoteStreams }); // trigger re-render for local too
      return true;
    } catch (e) {
      console.warn('Screen share cancelled or denied:', e.message);
      return false;
    }
  }

  async stopScreenShare() {
    if (!this.isScreenSharing) return;
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    this.isScreenSharing = false;

    // Re-acquire camera
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];

      for (const pc of Object.values(this.peerConns)) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(camTrack);
      }

      const oldVideo = this.localStream?.getVideoTracks()[0];
      if (oldVideo && this.localStream) {
        this.localStream.removeTrack(oldVideo);
        oldVideo.stop();
      }
      this.localStream?.addTrack(camTrack);
      camTrack.enabled = !this.isVideoOff;
    } catch (e) {
      console.warn('Could not restore camera after screen share:', e.message);
    }

    this.onStreamsUpdate({ ...this.remoteStreams });
  }

  /* ─────────────────────────────────────────────
     6.  CHAT
     ───────────────────────────────────────────── */
  sendChat(text) {
    this._send({ type: 'chat', text });
  }

  /* ─────────────────────────────────────────────
     7.  HOST CONTROLS
     ───────────────────────────────────────────── */
  muteAll() {
    this._send({ type: 'mute-all' });
  }

  kickPeer(peerId, reason = 'Removed by host') {
    this._send({ type: 'kick', target: peerId, reason });
  }

  /* ─────────────────────────────────────────────
     8.  CLEANUP
     ───────────────────────────────────────────── */
  cleanup() {
    this._send({ type: 'leave' });
    this.ws?.close();
    Object.values(this.peerConns).forEach(pc => pc.close());
    this.localStream?.getTracks().forEach(t => t.stop());
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.peerConns    = {};
    this.remoteStreams = {};
  }

  /* ─────────────────────────────────────────────
     HELPERS
     ───────────────────────────────────────────── */
  _send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
