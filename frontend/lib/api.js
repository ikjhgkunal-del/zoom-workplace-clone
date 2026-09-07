const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  apiFetch(`/meetings/instant?host_name=${encodeURIComponent(hostName)}`, { method: 'POST' });

export const scheduleMeeting = (data) =>
  apiFetch('/meetings/schedule', { method: 'POST', body: JSON.stringify(data) });

export const getMeetings = (filter = 'all') =>
  apiFetch(`/meetings?filter=${filter}`);

export const getMeeting = (meetingId) =>
  apiFetch(`/meetings/${meetingId}`);

export const updateMeetingStatus = (meetingId, status) =>
  apiFetch(`/meetings/${meetingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

export const deleteMeeting = (meetingId) =>
  apiFetch(`/meetings/${meetingId}`, { method: 'DELETE' });

// Participants
export const joinMeeting = (meetingId, displayName, isHost = false) =>
  apiFetch(`/meetings/${meetingId}/join`, {
    method: 'POST',
    body: JSON.stringify({ display_name: displayName, is_host: isHost }),
  });

export const getParticipants = (meetingId) =>
  apiFetch(`/meetings/${meetingId}/participants`);

export const leaveMeeting = (meetingId, participantId) =>
  apiFetch(`/meetings/${meetingId}/participants/${participantId}/leave`, { method: 'PUT' });
