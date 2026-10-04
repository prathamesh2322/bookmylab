// Thin wrapper around fetch() for the BookMyLab REST API (Exp 2 / Exp 7).
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || null;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('bml_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/api/auth/login')) {
      window.dispatchEvent(new Event('bml-unauthorized'));
    }
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data?.fieldErrors);
  }
  return data;
}
