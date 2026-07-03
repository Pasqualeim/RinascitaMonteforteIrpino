import { supabase, SUPABASE_FUNCTIONS_URL } from './supabase.js';
import {
  RM_STORAGE_KEY,
  DEFAULT_TEAMS, DEFAULT_GROUPS, DEFAULT_STANDINGS_GROUPS,
  DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_MATCHES_GIORNATA,
  DEFAULT_SCORERS, DEFAULT_SCORERS_GIRONE, DEFAULT_NEWS, DEFAULT_EVENTS, DEFAULT_HONORS,
  DEFAULT_SPONSORS, DEFAULT_STRIP_ITEMS,
} from './constants.js';
import { rmHydrateTournamentData, rmNormalizeTournamentData } from '../domain.js';
import { rmHasAdminSession } from './session.js';
import { rmAdminApi } from './http.js';
import { rmLoadDataFromBootstrap } from './api.js';

const DEFAULTS = {
  teams: DEFAULT_TEAMS,
  groups: DEFAULT_GROUPS,
  standings_groups: DEFAULT_STANDINGS_GROUPS,
  standings_a: [],
  standings_o40: [],
  standings_jr: [],
  live_match: DEFAULT_LIVE_MATCH,
  matches_today: DEFAULT_MATCHES_TODAY,
  matches_giornata: DEFAULT_MATCHES_GIORNATA,
  scorers: DEFAULT_SCORERS,
  scorers_girone: DEFAULT_SCORERS_GIRONE,
  news: DEFAULT_NEWS,
  events: DEFAULT_EVENTS,
  honors: DEFAULT_HONORS,
  sponsors: DEFAULT_SPONSORS,
  strip_items: DEFAULT_STRIP_ITEMS,
  updated_at: null,
};

export function rmMergeDefaults(saved) {
  return rmHydrateTournamentData(saved, DEFAULTS);
}

function rmLoadLocal() {
  try {
    const raw = localStorage.getItem(RM_STORAGE_KEY);
    if (raw) return rmNormalizeTournamentData(JSON.parse(raw));
  } catch {}
  return null;
}

export function rmGetAllData() {
  return rmMergeDefaults(rmLoadLocal());
}

function rmIsAdminPage() {
  try {
    const href = String(window.location.href || '').toLowerCase();
    return href.includes('/admin.html') || href.endsWith('admin.html') || href.includes('admin.html#');
  } catch {
    return false;
  }
}

export async function rmLoadData() {
  if (SUPABASE_FUNCTIONS_URL) {
    try {
      const bootstrapData = await rmLoadDataFromBootstrap();
      if (bootstrapData && bootstrapData.edition?.id) {
        const prevLocal = rmLoadLocal();
        const normalized = rmNormalizeTournamentData(bootstrapData);
        if (prevLocal?.match_settings && (!prevLocal?.edition?.id || prevLocal?.edition?.id === bootstrapData.edition.id)) {
          normalized.match_settings = prevLocal.match_settings;
        }
        localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {
      console.warn('Bootstrap API fallita, uso site_data:', e);
    }
  }

  if (!supabase) return rmLoadLocal();
  try {
    const { data, error } = await supabase
      .from('site_data')
      .select('content')
      .eq('id', 1)
      .single();
    if (error) throw error;
    if (data?.content && Object.keys(data.content).length > 0) {
      const prevLocal = rmLoadLocal();
      const normalized = rmNormalizeTournamentData(data.content);
      if (prevLocal?.match_settings && (!prevLocal?.edition?.id || prevLocal?.edition?.id === normalized?.edition?.id)) {
        normalized.match_settings = prevLocal.match_settings;
      }
      localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch (e) {
    console.warn('Errore caricamento da Supabase, uso cache locale:', e);
  }
  return rmLoadLocal();
}

export async function rmSaveData(data, options = {}) {
  const normalized = rmNormalizeTournamentData(data) || { ...data };
  normalized.updated_at = new Date().toISOString();
  localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));

  const shouldAttemptRemote = options.remote !== false && rmIsAdminPage();
  if (!shouldAttemptRemote) return { remoteSkipped: true, data: normalized };

  if (options.requireAdmin && !rmHasAdminSession()) {
    throw new Error('Sessione admin assente o scaduta');
  }
  if (!rmHasAdminSession()) return { remoteSkipped: true, data: normalized };

  try {
    const payload = await rmAdminApi('/save', { method: 'POST', body: { content: normalized } });
    if (payload?.updated_at) normalized.updated_at = payload.updated_at;
    localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Errore salvataggio admin-api:', e);
    return { remoteError: e?.message || 'Errore salvataggio remoto', data: normalized };
  }

  return { remoteSkipped: false, data: normalized };
}
