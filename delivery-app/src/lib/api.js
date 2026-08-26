const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

export const api = {
  post: (path, body, token) => request('POST', path, body, token),
  get: (path, token) => request('GET', path, null, token),
  patch: (path, body, token) => request('PATCH', path, body, token),
};
