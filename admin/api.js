/**
 * api.js — Shared fetch wrapper for Speed Layer Admin UI.
 * Set window.SPEED_LAYER_API_URL to override the base URL (e.g. for GitHub Pages).
 */
const API_BASE = (window.SPEED_LAYER_API_URL || '') + '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error((data && (data.error || JSON.stringify(data))) || `HTTP ${res.status}`);
  return data;
}

const api = {
  listSites: () => apiFetch('/sites'),
  getSite: (domain) => apiFetch(`/sites/${domain}`),
  createSite: (data) => apiFetch('/sites', { method: 'POST', body: JSON.stringify(data) }),
  updateSite: (domain, data) => apiFetch(`/sites/${domain}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSite: (domain) => apiFetch(`/sites/${domain}`, { method: 'DELETE' }),
  enableSite: (domain) => apiFetch(`/sites/${domain}/enable`, { method: 'POST' }),
  disableSite: (domain) => apiFetch(`/sites/${domain}/disable`, { method: 'POST' }),
  health: () => apiFetch('/health'),
  getTelemetry: (limit = 100) => apiFetch(`/telemetry?limit=${limit}`)
};

window.api = api;
