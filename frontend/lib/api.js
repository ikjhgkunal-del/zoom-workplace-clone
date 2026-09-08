const API_BASE = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Meetings
export const createInstantMeeting = (hostName = 'test one') =>
  apiFetch(`/api/meetings/instant?host_name=${encodeURIComponent(hostName)}`, { method: 'POST' });

export const scheduleMeeting = (data) =>
  apiFetch('/api/meetings/schedule', { method: 'POST', body: JSON.stringify(data) });

export const getMeetings = (filter = 'all') =>
  apiFetch(`/api/meetings?filter=${filter}`);

export const getMeeting = (meetingId) =>
  apiFetch(`/api/meetings/${meetingId}`);

export const updateMeetingStatus = (meetingId, status) =>
  apiFetch(`/api/meetings/${meetingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

export const updateMeeting = (meetingId, data) =>
  apiFetch(`/api/meetings/${meetingId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMeeting = (meetingId) =>
  apiFetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });

// Participants
export const joinMeeting = (meetingId, displayName, isHost = false) =>
  apiFetch(`/api/meetings/${meetingId}/join`, {
    method: 'POST',
    body: JSON.stringify({ display_name: displayName, is_host: isHost }),
  });

export const getParticipants = (meetingId) =>
  apiFetch(`/api/meetings/${meetingId}/participants`);

export const leaveMeeting = (meetingId, participantId) =>
  apiFetch(`/api/meetings/${meetingId}/participants/${participantId}/leave`, { method: 'PUT' });

// Team Chat
export const getChatChannels = () =>
  apiFetch('/api/chat/channels');

export const createChatChannel = (data) =>
  apiFetch('/api/chat/channels', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getChatMessages = (channelId) =>
  apiFetch(`/api/chat/channels/${channelId}/messages`);

export const sendChatMessage = (channelId, data) =>
  apiFetch(`/api/chat/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

