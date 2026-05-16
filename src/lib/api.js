import { SUPABASE_FUNCTIONS_URL } from './supabase.js';
import { rmAdminApi } from './http.js';

let _cachedEditionId = null;

export async function rmLoadDataFromBootstrap(editionSlug = null) {
  if (!SUPABASE_FUNCTIONS_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = editionSlug
      ? `${SUPABASE_FUNCTIONS_URL}/bootstrap?edition=${encodeURIComponent(editionSlug)}`
      : `${SUPABASE_FUNCTIONS_URL}/bootstrap`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const { data } = await res.json();
    if (!data || data.schema_version !== 3) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function rmGetAllEditions() {
  if (!SUPABASE_FUNCTIONS_URL) return [];
  try {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/editions`);
    if (!res.ok) return [];
    const { data } = await res.json();
    return data || [];
  } catch {
    return [];
  }
}

export async function rmGetActiveEditionId() {
  if (_cachedEditionId) return _cachedEditionId;
  const data = await rmLoadDataFromBootstrap();
  if (data?.edition?.id) {
    _cachedEditionId = data.edition.id;
  }
  return _cachedEditionId || null;
}

export async function rmAdminUpdateEdition(id, updates) {
  return rmAdminApi(`/editions/${id}`, { method: 'PUT', body: updates });
}

export async function rmAdminCreateEdition(payload) {
  return rmAdminApi('/editions', { method: 'POST', body: payload });
}

export async function rmAdminCreateTournamentCategory(payload) {
  return rmAdminApi('/tournaments', { method: 'POST', body: payload });
}

export async function rmAdminUpdateTournamentCategory(id, updates) {
  return rmAdminApi(`/tournaments/${id}`, { method: 'PUT', body: updates });
}

export async function rmAdminDeleteTournamentCategory(id) {
  return rmAdminApi(`/tournaments/${id}`, { method: 'DELETE' });
}
