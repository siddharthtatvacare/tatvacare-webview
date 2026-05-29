const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function fetchQuestions() {
  return request('/questions');
}

export function initSession(patientId) {
  return request('/session/init', {
    method: 'POST',
    body: JSON.stringify({ patientId })
  });
}

export function saveResponses(sessionId, answers, activeBranches) {
  return request('/responses/save', {
    method: 'POST',
    body: JSON.stringify({ sessionId, answers, activeBranches })
  });
}

export function getRecommendation(sessionId) {
  return request('/recommend', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
}

export function getExplanation(sessionId) {
  return request(`/recommend/explain/${sessionId}`);
}

// Triggers the server-to-server Fortis webhook — backend pulls full payload from MongoDB
export function notifyBooking(sessionId) {
  return request('/booking/notify', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
}
