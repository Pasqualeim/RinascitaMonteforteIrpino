import React, { useState, useMemo } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

// Retry a flaky network call a few times before giving up. Staff correct results on mobile
// data; a single transient failure must not silently drop a manual fix.
async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

const KNOCKOUT_PRESETS = ['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale', '3° posto'];
const KNOCKOUT_SET = new Set(KNOCKOUT_PRESETS);

const IT_MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const IT_MONTH_MAP = { gen:'01',feb:'02',mar:'03',apr:'04',mag:'05',giu:'06',lug:'07',ago:'08',set:'09',ott:'10',nov:'11',dic:'12' };
function isoToItalian(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${IT_MONTHS[parseInt(m) - 1]}`;
}
function italianToIso(str) {
  if (!str) return '';
  const match = str.match(/^(\d{1,2})\s+(\w+)$/i);
  if (!match) return '';
  const month = IT_MONTH_MAP[match[2].toLowerCase()];
  if (!month) return '';
  return `${new Date().getFullYear()}-${month}-${match[1].padStart(2,'0')}`;
}

// scope: 'group' = solo gironi · 'knockout' = solo eliminatorie · 'all' = tutto (default).
// Stesso identico editor partita (MatchForm) in ogni scope — una regola sola per ogni partita.
export function MatchesSection({ data, onSave, onRefresh, tournamentId, compact, scope = 'all' }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [saveError, setSaveError] = useState(''); // API error shown inside modal
  const [closedPhases, setClosedPhases] = useState(new Set());

  function humanizeError(err) {
    const msg = err?.message || '';
    if (/401|unauthorized|session/i.test(msg)) return 'Sessione scaduta — effettua di nuovo il login.';
    if (/network|failed to fetch|load/i.test(msg)) return 'Errore di rete — controlla la connessione e riprova.';
    if (/duplicate|unique|already exists/i.test(msg)) return 'Conflitto: esiste già una partita identica nel sistema.';
    if (/foreign key|fk_|not found in teams/i.test(msg)) return 'Squadra non trovata nel sistema — la registrazione potrebbe essere mancante.';
    if (/404|not found/i.test(msg)) return 'Partita non trovata — potrebbe essere già stata eliminata. Ricarica la pagina.';
    if (/500|internal/i.test(msg)) return 'Errore interno del server — riprova tra qualche secondo.';
    if (/timeout/i.test(msg)) return 'Timeout — il server non ha risposto in tempo. Riprova.';
    return msg || 'Errore sconosciuto — riprova.';
  }

  const teams = data.teams || [];
  const groups = data.groups || [];
  const groupNameSet = new Set(groups.map(g => g.name));
  const groupPresets = groups.map(g => g.name);
  const allPresets = [...groupPresets, ...KNOCKOUT_PRESETS];
  const scopedPresets = scope === 'group' ? groupPresets : scope === 'knockout' ? KNOCKOUT_PRESETS : allPresets;
  const defaultPhase = scope === 'knockout'
    ? (KNOCKOUT_PRESETS.includes('Quarti di finale') ? 'Quarti di finale' : KNOCKOUT_PRESETS[0])
    : (scopedPresets[0] || allPresets[0] || 'Girone A');
  const sectionTitle = scope === 'group' ? 'Partite gironi' : scope === 'knockout' ? 'Partite eliminatorie' : 'Partite';

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Partite</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  function togglePhase(day) {
    setClosedPhases(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  function groupIdFromPhase(phase) {
    const g = groups.find(x => x.name === phase);
    return g ? g.id : null;
  }

  function phaseFromDay(day) {
    if (KNOCKOUT_SET.has(day)) return day;
    const g = groups.find(x => x.name === day);
    return g ? g.name : (day || defaultPhase);
  }

  async function saveMatch(updated) {
    setBusy(true);
    setErrMsg('');
    setSaveError('');
    try {
      const dayKey = updated._day || updated.phase || defaultPhase;
      const phase = phaseFromDay(dayKey);
      const group_id = groupIdFromPhase(dayKey);
      const homeTeam = updated.home?.id ? updated.home : teams.find(t => t.short === updated.home?.short);
      const awayTeam = updated.away?.id ? updated.away : teams.find(t => t.short === updated.away?.short);
      const home_team_id = homeTeam?.id || null;
      const away_team_id = awayTeam?.id || null;
      const home_score = updated.hs != null ? parseInt(updated.hs) : null;
      const away_score = updated.as != null ? parseInt(updated.as) : null;

      let matchId = updated.id;

      // Map the whole cronaca to the bulk, idempotent payload. The server replaces this
      // match's events in one shot (delete+insert), so a retry after a network blip is safe
      // (no duplicates, no silent partial loss) — same path the live "Termina" uses. Only
      // sent for finished matches; omitted otherwise so existing events aren't touched.
      const evPayload = (updated.status === 'ft')
        ? (updated._localEvents || []).map(ev => {
            const isHome = ev._side === 'home' || ev.team === updated.home?.short;
            const teamObj = isHome ? homeTeam : awayTeam;
            return {
              event_type: ev.type,
              team_id: teamObj?.id || null,
              player_name: ev.player || null,
              minute: ev.minute ?? null,
            };
          })
        : null;

      if (updated._isNew) {
        // createMatch is NOT retried — a lost response on retry would create a duplicate match.
        const res = await rmAdminDomain.createMatch({
          tournament_id: tournamentId,
          group_id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status: updated.status || 'sch',
          phase,
          match_date: updated.isoDate || null,
          match_time: updated.time || null,
          pitch: updated.pitch || 'Campo Sportivo',
          sort_order: 0,
        });
        matchId = res?.data?.id || null;
        // Persist the cronaca separately (idempotent → retry-safe).
        if (evPayload && matchId) {
          await withRetry(() => rmAdminDomain.updateMatch(matchId, {
            status: 'ft', home_score, away_score, events: evPayload,
          }));
        }
      } else {
        await withRetry(() => rmAdminDomain.updateMatch(updated.id, {
          home_team_id: home_team_id ?? null,
          away_team_id: away_team_id ?? null,
          group_id: group_id ?? null,
          home_score,
          away_score,
          status: updated.status || 'sch',
          phase,
          match_date: updated.isoDate || null,
          match_time: updated.time || null,
          pitch: updated.pitch || 'Campo Sportivo',
          ...(evPayload ? { events: evPayload } : {}),
        }));
      }

      setEditing(null);
      setSaveError('');
      await onRefresh('Partita e classifica aggiornate');
    } catch (err) {
      const human = humanizeError(err);
      setSaveError(human);
      setErrMsg(human);
    } finally {
      setBusy(false);
    }
  }

  async function deleteMatch(matchId) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteMatch(matchId);
      setDeleting(null);
      await onRefresh('Partita eliminata');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione partita');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAllMatches() {
    setBusy(true);
    setErrMsg('');
    try {
      const allMatches = scopedGiornate.flatMap(d => (d.items || []).filter(m => m.id));
      let deleted = 0, failed = 0;
      for (const m of allMatches) {
        try {
          for (const ev of (m.events || [])) {
            if (ev.id) await rmAdminDomain.deleteMatchEvent(ev.id).catch(() => {});
          }
          await rmAdminDomain.deleteMatch(m.id);
          deleted++;
        } catch {
          failed++;
        }
      }
      await onRefresh(failed > 0 ? `${deleted} partite eliminate, ${failed} fallite` : 'Tutte le partite eliminate');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione partite');
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = { live: '🔴 Live', ft: '✅ Finale', sch: '⏳' };
  const statusColor = { live: '#FF3D3D', ft: 'var(--brand-green)', sch: 'var(--fg-3)' };

  function newMatch() {
    setEditing({ _isNew: true, _day: defaultPhase, status: 'sch', home: null, away: null, hs: null, as: null, isoDate: '', time: '' });
  }

  // Build grouped structure from matches_giornata
  const giornate = data.matches_giornata || [];
  const groupPhases = giornate.filter(d => groupNameSet.has(d.day));
  const knockoutPhases = giornate.filter(d => KNOCKOUT_SET.has(d.day));
  const scopedGiornate = scope === 'group' ? groupPhases : scope === 'knockout' ? knockoutPhases : giornate;
  const totalMatches = scopedGiornate.reduce((s, d) => s + (d.items?.length || 0), 0);

  function PhaseSection({ day, items, accent }) {
    const isOpen = !closedPhases.has(day);
    const done = items.filter(m => m.status === 'ft').length;
    const live = items.filter(m => m.status === 'live').length;
    return (
      <div style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div
          onClick={() => togglePhase(day)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: accent || 'var(--fg-1)' }}>{day}</span>
          {live > 0 && <span style={{ fontSize: 11, color: '#FF3D3D', fontWeight: 700 }}>🔴 {live} live</span>}
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{done}/{items.length}</span>
          <span style={{ fontSize: 13, color: 'var(--fg-3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms', display: 'inline-block' }}>▾</span>
        </div>
        {isOpen && items.map(m => {
          return (
            <div key={m.id} style={{ borderTop: '1px solid var(--border-1)' }}>
              <div className="adm-item-row" style={{ paddingLeft: 28 }}>
                <div className="adm-item-row-body">
                  <div className="adm-item-title" style={{ fontSize: 14 }}>
                    {m.home?.short || 'TBD'} <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>{m.hs != null ? `${m.hs}–${m.as}` : 'vs'}</span> {m.away?.short || 'TBD'}
                  </div>
                  <div className="adm-item-meta">
                    {m.date
                      ? <span style={{ color: 'var(--brand-green)' }}>📅 {isoToItalian(m.date)}{m.time ? ` · ${m.time}` : ''}</span>
                      : <span style={{ color: 'var(--fg-3)' }}>Nessuna data</span>
                    }
                    <span style={{ color: statusColor[m.status], marginLeft: 6 }}>{statusLabel[m.status]}</span>
                  </div>
                </div>
                <div className="adm-item-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...m, isoDate: m.date || '', _day: m.phase || m._day || '' })}><EditIcon size={16}/></button>
                  <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(m.id)}><TrashIcon size={16}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {compact ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{totalMatches} partite</span>
          <button className="adm-btn adm-btn-sm" onClick={newMatch} disabled={busy}>+ Nuova</button>
        </div>
      ) : (
        <div className="adm-section-head">
          <div>
            <h2 className="adm-section-title" style={{ margin: 0 }}>{sectionTitle}</h2>
            <p className="adm-section-sub" style={{ margin: 0 }}>{totalMatches} partite totali</p>
          </div>
          <div className="adm-section-actions">
            {totalMatches > 0 && (
              <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleteAllConfirm(true)} disabled={busy}>🗑 Elimina tutte</button>
            )}
            <button className="adm-btn adm-btn-sm" onClick={newMatch} disabled={busy}>+ Nuova</button>
          </div>
        </div>
      )}

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div>
        {totalMatches === 0 && (
          <div className="adm-card"><div className="adm-empty">{scope === 'knockout' ? 'Nessuna partita di eliminazione. Aggiungi con "+ Nuova" quando conosci le squadre.' : 'Nessuna partita. Genera dal tab Gironi o aggiungi manualmente.'}</div></div>
        )}

        {scope !== 'knockout' && groupPhases.length > 0 && (
          <div className="adm-card" style={{ marginBottom: 12 }}>
            <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Fase a gironi</span>
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                {groupPhases.reduce((s, d) => s + (d.items?.length || 0), 0)} partite
              </span>
            </div>
            {groupPhases.map(d => (
              <PhaseSection key={d.day} day={d.day} items={d.items || []} />
            ))}
          </div>
        )}

        {scope !== 'group' && (() => {
          const preFinale = knockoutPhases.filter(d => d.day !== 'Finale');
          const finale = knockoutPhases.find(d => d.day === 'Finale');
          return (
            <>
              {preFinale.length > 0 && (
                <div className="adm-card" style={{ marginBottom: 12 }}>
                  <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--fg-2)', textTransform: 'uppercase' }}>Eliminazione diretta</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                      {preFinale.reduce((s, d) => s + (d.items?.length || 0), 0)} partite
                    </span>
                  </div>
                  {preFinale.map(d => (
                    <PhaseSection key={d.day} day={d.day} items={d.items || []} />
                  ))}
                </div>
              )}
              {finale && (
                <div className="adm-card" style={{ marginBottom: 12, border: '1px solid rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.03)' }}>
                  <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-gold)', textTransform: 'uppercase' }}>Finale</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{finale.items?.length || 0} partita</span>
                  </div>
                  <PhaseSection day={finale.day} items={finale.items || []} accent="var(--brand-gold)" />
                </div>
              )}
            </>
          );
        })()}
      </div>

      {editing && <MatchForm match={editing} teams={teams} groups={groups} allPresets={scopedPresets} defaultPhase={defaultPhase} scorers={data.scorers || []} onSave={saveMatch} onClose={() => { setEditing(null); setSaveError(''); }} busy={busy} saveError={saveError} />}
      {deleting && <Confirm msg="Eliminare questa partita?" onOk={() => deleteMatch(deleting)} onCancel={() => setDeleting(null)} />}
      {deleteAllConfirm && (
        <Confirm
          msg={`Eliminare tutte le ${totalMatches} partite? Questa azione non è reversibile.`}
          onOk={() => { setDeleteAllConfirm(false); deleteAllMatches(); }}
          onCancel={() => setDeleteAllConfirm(false)}
        />
      )}
    </div>
  );
}

const EVENT_TYPES = [
  { value: 'goal',   label: '⚽ Gol' },
  { value: 'yellow', label: '🟨 Giallo' },
  { value: 'red',    label: '🟥 Rosso' },
];

function MatchForm({ match, teams, groups, allPresets, defaultPhase, scorers = [], onSave, onClose, busy, saveError }) {
  const [form, setForm] = useState({ ...match });
  const [error, setError] = useState('');
  const [pendingTeamChange, setPendingTeamChange] = useState(null); // { field, team, strong }
  const [pendingMismatch, setPendingMismatch] = useState(null); // { detail } — score≠cronaca, conferma vittoria a tavolino
  const [localEvents, setLocalEvents] = useState(match.events || []);
  const [addingEvent, setAddingEvent] = useState(false);
  const [editingEventIdx, setEditingEventIdx] = useState(null);
  const [deletingEventIdx, setDeletingEventIdx] = useState(null);
  const [newEv, setNewEv] = useState({ type: 'goal', player: '', minute: '', side: 'home' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addEvent() {
    if (!newEv.player.trim()) return;
    const ev = { type: newEv.type, player: newEv.player.trim(), minute: newEv.minute ? parseInt(newEv.minute) : null, _side: newEv.side };
    setLocalEvents(evs => {
      const base = editingEventIdx !== null ? evs.filter((_, i) => i !== editingEventIdx) : evs;
      return [...base, ev].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
    });
    setNewEv({ type: 'goal', player: '', minute: '', side: 'home' });
    setEditingEventIdx(null);
    setAddingEvent(false);
  }

  function cancelAddEvent() {
    setAddingEvent(false);
    setEditingEventIdx(null);
    setNewEv({ type: 'goal', player: '', minute: '', side: 'home' });
  }

  function removeEvent(idx) {
    setLocalEvents(evs => evs.filter((_, i) => i !== idx));
  }
  const sameTeamsSelected = !!form.home?.short && form.home?.short === form.away?.short;

  // Partita con risultati o eventi registrati — warn forte al cambio squadra
  const hasResults = !match._isNew && (match.status === 'ft' || match.status === 'live' || (match.events?.length > 0));
  // Partita con squadre già assegnate — warn lieve
  const hasTeams = !match._isNew && !!(match.home?.short && match.away?.short);

  function requestTeamChange(field, short) {
    const t = teams.find(x => x.short === short);
    if (!t) return;
    if (short !== match[field]?.short && hasTeams) {
      setPendingTeamChange({ field, team: t, strong: hasResults });
    } else {
      set(field, t);
    }
  }

  function confirmTeamChange() {
    if (pendingTeamChange) set(pendingTeamChange.field, pendingTeamChange.team);
    setPendingTeamChange(null);
  }

  function confirmMismatchSave() {
    setPendingMismatch(null);
    setError('');
    onSave({ ...form, _localEvents: localEvents, _originalEvents: match.events || [] });
  }

  const groupPresets = (groups || []).map(g => g.name);
  const koPresets = KNOCKOUT_PRESETS.filter(p => KNOCKOUT_SET.has(p));
  const chipStyle = (active) => ({
    fontSize: 12, padding: '5px 10px',
    background: active ? 'var(--brand-green)' : 'transparent',
    border: `1px solid ${active ? 'var(--brand-green)' : 'var(--border-1)'}`,
    color: active ? '#000' : 'var(--fg-2)',
    borderRadius: 6, cursor: 'pointer', fontWeight: active ? 700 : 400, transition: 'all 140ms',
  });

  function submit() {
    if (match._isNew && !form._day) { setError('Seleziona la fase'); return; }
    if (sameTeamsSelected) { setError('Casa e ospite non possono coincidere'); return; }
    // Safety net: a finished match's score should equal the goals recorded in the
    // cronaca, otherwise the public would show a result with no scorer (or a phantom
    // goal). But some results are legit without events (es. vittoria a tavolino 3-0):
    // instead of blocking, warn staff and let them confirm or cancel. Autogol are
    // counted for the team that benefits (kept consistent with how they are stored).
    if (form.status === 'ft') {
      const isGoal = e => e.type === 'goal' || e.type === 'own_goal';
      const isHome = e => e._side === 'home' || e.team === form.home?.short;
      const isAway = e => e._side === 'away' || e.team === form.away?.short;
      const homeGoals = localEvents.filter(e => isGoal(e) && isHome(e)).length;
      const awayGoals = localEvents.filter(e => isGoal(e) && isAway(e)).length;
      const hs = form.hs ?? 0, as = form.as ?? 0;
      if (homeGoals !== hs || awayGoals !== as) {
        const parts = [];
        if (homeGoals !== hs) parts.push(`${form.home?.short || 'Casa'}: punteggio ${hs}, gol in cronaca ${homeGoals}`);
        if (awayGoals !== as) parts.push(`${form.away?.short || 'Ospite'}: punteggio ${as}, gol in cronaca ${awayGoals}`);
        setError('');
        setPendingMismatch({ detail: parts.join(' · ') });
        return;
      }
    }
    setError('');
    onSave({ ...form, _localEvents: localEvents, _originalEvents: match.events || [] });
  }

  const evPanelPlayers = (() => {
    const sideShort = newEv.side === 'home' ? form.home?.short : form.away?.short;
    const fullTeam = teams.find(t => t.short === sideShort);
    return (fullTeam?.players || []).map(p => ({
      ...p,
      displayName: [p.nome, p.cognome].filter(Boolean).join(' ') || p.name || '',
    }));
  })();

  return (
    <>
    {pendingTeamChange && (
      <div className="adm-overlay" style={{ zIndex: 1100 }} onClick={() => setPendingTeamChange(null)}>
        <div className="adm-modal" style={{ minHeight: 'auto', maxHeight: '90vh', borderRadius: 12 }} onClick={e => e.stopPropagation()}>
          <div className="adm-modal-header" style={{ borderBottom: `1px solid ${pendingTeamChange.strong ? 'rgba(255,61,61,0.3)' : 'var(--border-1)'}` }}>
            <h3 className="adm-modal-title" style={{ color: pendingTeamChange.strong ? '#FF6B6B' : '#F5C518' }}>
              ⚠️ Cambiare squadra
            </h3>
            <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setPendingTeamChange(null)}>✕</button>
          </div>
          <div style={{ padding: '20px' }}>
            {pendingTeamChange.strong && (
              <div style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#FF6B6B', lineHeight: 1.5 }}>
                Partita con risultati o eventi registrati. Cambiare squadra invalida la classifica.
              </div>
            )}
            <p style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Sostituisci <strong>{pendingTeamChange.field === 'home' ? form.home?.name : form.away?.name}</strong> con <strong>{pendingTeamChange.team.name}</strong>?
            </p>
            <div className="adm-form-actions" style={{ marginTop: 0 }}>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => setPendingTeamChange(null)}>Annulla</button>
              <button type="button" className={`adm-btn adm-btn-sm ${pendingTeamChange.strong ? 'adm-btn-danger' : ''}`} style={{ flex: 2 }} onClick={confirmTeamChange}>
                Sì, cambia
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {pendingMismatch && (
      <div className="adm-overlay" style={{ zIndex: 1100 }} onClick={() => setPendingMismatch(null)}>
        <div className="adm-modal" style={{ minHeight: 'auto', maxHeight: '90vh', borderRadius: 12 }} onClick={e => e.stopPropagation()}>
          <div className="adm-modal-header" style={{ borderBottom: '1px solid rgba(245,197,24,0.3)' }}>
            <h3 className="adm-modal-title" style={{ color: '#F5C518' }}>⚠️ Punteggio senza cronaca</h3>
            <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setPendingMismatch(null)}>✕</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F5C518', lineHeight: 1.5 }}>
              Punteggio e cronaca non combaciano ({pendingMismatch.detail}).
            </div>
            <p style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Salva comunque? Usa questa opzione per risultati senza eventi segnabili, es. <strong>vittoria a tavolino (3-0)</strong>. Altrimenti annulla e aggiungi i gol mancanti col marcatore.
            </p>
            <div className="adm-form-actions" style={{ marginTop: 0 }}>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => setPendingMismatch(null)}>Annulla</button>
              <button type="button" className="adm-btn adm-btn-sm" style={{ flex: 2 }} onClick={confirmMismatchSave}>
                Salva comunque
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{match._isNew ? 'Nuova Partita' : 'Modifica Partita'}</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="adm-modal-scroll">
          <div className="adm-form">

            {/* Errori */}
            {(error || saveError) && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.25)', borderRadius: 8, fontSize: 13, color: '#FF6B6B', lineHeight: 1.5 }}>
                <span>⚠️</span><span>{error || saveError}</span>
              </div>
            )}

            {/* ── Fase (solo nuova partita) ── */}
            {match._isNew && (
              <div className="adm-form-group">
                <label className="adm-label">Fase *</label>
                {groupPresets.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-display)' }}>Gironi</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {groupPresets.map(p => (
                        <button key={p} type="button" className="adm-btn adm-btn-sm" style={chipStyle(form._day === p)} onClick={() => set('_day', p)}>{p}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-display)' }}>Eliminazione diretta</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {koPresets.map(p => (
                    <button key={p} type="button" className="adm-btn adm-btn-sm" style={chipStyle(form._day === p)} onClick={() => set('_day', p)}>{p}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Squadre ── */}
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Casa</label>
                <select className="adm-select" value={form.home?.short || ''} onChange={e => requestTeamChange('home', e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {teams.filter(t => t.short !== form.away?.short).map(t => (
                    <option key={t.short || t.id} value={t.short}>{t.flag ? `${t.flag} ` : ''}{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Ospite</label>
                <select className="adm-select" value={form.away?.short || ''} onChange={e => requestTeamChange('away', e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {teams.filter(t => t.short !== form.home?.short).map(t => (
                    <option key={t.short || t.id} value={t.short}>{t.flag ? `${t.flag} ` : ''}{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {sameTeamsSelected && (
              <p style={{ margin: 0, fontSize: 12, color: '#FF6B6B' }}>Casa e ospite non possono coincidere.</p>
            )}

            {/* ── Stato ── */}
            <div className="adm-form-group">
              <label className="adm-label">Stato</label>
              <select className="adm-select" value={form.status || 'sch'} onChange={e => {
                const s = e.target.value;
                setForm(f => ({ ...f, status: s, hs: s === 'ft' ? (f.hs ?? 0) : null, as: s === 'ft' ? (f.as ?? 0) : null }));
              }}>
                <option value="sch">Da giocare</option>
                <option value="ft">Giocata</option>
              </select>
            </div>

            {/* ── Risultato ── */}
            {(form.status === 'ft' || form.status === 'live') && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  {/* Casa */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 28 }}>{form.home?.flag || '🏳️'}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{form.home?.name || 'Casa'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ minHeight: 32, width: 32, padding: 0, fontSize: 18, fontFamily: 'monospace' }}
                        onClick={() => set('hs', Math.max(0, (form.hs ?? 0) - 1))}>−</button>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: '#fff', minWidth: 36, textAlign: 'center', lineHeight: 1 }}>{form.hs ?? 0}</span>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ minHeight: 32, width: 32, padding: 0, fontSize: 18, fontFamily: 'monospace' }}
                        onClick={() => set('hs', (form.hs ?? 0) + 1)}>+</button>
                    </div>
                  </div>
                  {/* Separatore */}
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--fg-3)', alignSelf: 'center', marginTop: 16 }}>—</span>
                  {/* Ospite */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 28 }}>{form.away?.flag || '🏳️'}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{form.away?.name || 'Ospite'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ minHeight: 32, width: 32, padding: 0, fontSize: 18, fontFamily: 'monospace' }}
                        onClick={() => set('as', Math.max(0, (form.as ?? 0) - 1))}>−</button>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: '#fff', minWidth: 36, textAlign: 'center', lineHeight: 1 }}>{form.as ?? 0}</span>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ minHeight: 32, width: 32, padding: 0, fontSize: 18, fontFamily: 'monospace' }}
                        onClick={() => set('as', (form.as ?? 0) + 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Gol e Cartellini ── */}
            {form.status === 'ft' && form.home && form.away && (
              <div className="adm-form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="adm-label" style={{ margin: 0 }}>Gol e cartellini</label>
                  {!addingEvent && (
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setAddingEvent(true)}>+ Aggiungi</button>
                  )}
                </div>

                {/* Lista eventi */}
                <div className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {localEvents.length === 0 && !addingEvent && (
                    <div className="adm-empty" style={{ padding: '16px', fontSize: 13 }}>Nessun evento registrato.</div>
                  )}

                  {localEvents.map((ev, i) => {
                    const icon = ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : '🟥';
                    const isHome = ev._side === 'home' || ev.team === form.home?.short;
                    const teamName = isHome ? form.home?.name : form.away?.name;

                    if (deletingEventIdx === i) {
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,61,61,0.06)', borderTop: i > 0 ? '1px solid var(--border-1)' : 'none' }}>
                          <span style={{ fontSize: 16 }}>{icon}</span>
                          <span style={{ flex: 1, fontSize: 13, color: '#FF6B6B' }}>Eliminare <strong>{ev.player || '—'}</strong>?</span>
                          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setDeletingEventIdx(null)}>No</button>
                          <button type="button" className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => { removeEvent(i); setDeletingEventIdx(null); }}>Sì</button>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="adm-item-row" style={{ borderTop: i > 0 ? '1px solid var(--border-1)' : 'none' }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                        <div className="adm-item-row-body">
                          <div className="adm-item-title" style={{ fontSize: 14 }}>{ev.player || '—'}</div>
                          <div className="adm-item-meta">{teamName || ev.team || ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button type="button" className="adm-btn adm-btn-ghost adm-btn-icon" style={{ width: 36, height: 36, fontSize: 14 }} title="Modifica" onClick={() => {
                            const side = (ev._side === 'home' || ev.team === form.home?.short) ? 'home' : 'away';
                            setNewEv({ type: ev.type, player: ev.player || '', minute: ev.minute ?? '', side });
                            setEditingEventIdx(i);
                            setAddingEvent(true);
                          }}>✏️</button>
                          <button type="button" className="adm-btn adm-btn-danger adm-btn-icon" style={{ width: 36, height: 36, fontSize: 14 }} title="Elimina" onClick={() => setDeletingEventIdx(i)}>✕</button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pannello aggiungi/modifica evento */}
                  {addingEvent && (
                    <div style={{ padding: '14px', borderTop: localEvents.length > 0 ? '1px solid var(--border-brand)' : 'none', background: 'rgba(0,230,118,0.03)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Tipo */}
                      <div className="adm-form-group">
                        <label className="adm-label">Tipo</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {EVENT_TYPES.map(t => (
                            <button key={t.value} type="button" className="adm-btn adm-btn-sm"
                              style={{ flex: 1, background: newEv.type === t.value ? 'var(--brand-green)' : 'transparent', border: `1px solid ${newEv.type === t.value ? 'var(--brand-green)' : 'var(--border-1)'}`, color: newEv.type === t.value ? '#000' : 'var(--fg-2)' }}
                              onClick={() => setNewEv(e => ({ ...e, type: t.value }))}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Squadra */}
                      <div className="adm-form-group">
                        <label className="adm-label">Squadra</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['home', 'away'].map(side => (
                            <button key={side} type="button" className="adm-btn adm-btn-sm"
                              style={{ flex: 1, background: newEv.side === side ? 'rgba(0,230,118,0.12)' : 'transparent', border: `1px solid ${newEv.side === side ? 'var(--brand-green)' : 'var(--border-1)'}`, color: newEv.side === side ? 'var(--brand-green)' : 'var(--fg-2)', fontWeight: newEv.side === side ? 700 : 400 }}
                              onClick={() => setNewEv(e => ({ ...e, side, player: '' }))}>
                              {side === 'home' ? (form.home?.name || 'Casa') : (form.away?.name || 'Ospite')}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Calciatore */}
                      <div className="adm-form-group">
                        <label className="adm-label">Calciatore</label>
                        <select className="adm-select" value={newEv.player}
                          onChange={e => setNewEv(ev => ({ ...ev, player: e.target.value }))}>
                          <option value="">— Seleziona —</option>
                          {evPanelPlayers.map((p, idx) => (
                            <option key={p.id || idx} value={p.displayName}>{p.displayName}</option>
                          ))}
                        </select>
                        {evPanelPlayers.length === 0 && (
                          <input className="adm-input" placeholder="Nome calciatore..." value={newEv.player}
                            onChange={e => setNewEv(ev => ({ ...ev, player: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addEvent()} />
                        )}
                      </div>
                      {/* Azioni */}
                      <div className="adm-form-actions" style={{ marginTop: 0 }}>
                        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={cancelAddEvent}>Annulla</button>
                        <button type="button" className="adm-btn adm-btn-sm" style={{ flex: 2 }} onClick={addEvent} disabled={!newEv.player.trim()}>
                          {editingEventIdx !== null ? 'Salva modifica' : 'Aggiungi'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Data e Orario ── */}
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Data</label>
                <input type="date" className="adm-input adm-input-datetime"
                  value={form.isoDate || ''} onChange={e => set('isoDate', e.target.value)} />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Orario</label>
                <input type="time" className="adm-input adm-input-datetime"
                  value={form.time || ''} onChange={e => set('time', e.target.value)} />
              </div>
            </div>

            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" style={{ flex: 1 }} onClick={submit} disabled={busy}>Salva Partita</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function BracketSlot({ match }) {
  const home  = match?.home?.short || 'TBD';
  const away  = match?.away?.short || 'TBD';
  const score = match?.hs != null  ? `${match.hs}–${match.as}` : 'vs';
  const isLive = match?.status === 'live';
  const isDone = match?.status === 'ft';
  const isTbd  = !match;

  return (
    <div style={{
      background: '#0f0f0f',
      border: `1px solid ${isDone ? 'var(--border-brand)' : 'var(--border-1)'}`,
      borderRadius: 8, padding: '10px 14px', minWidth: 150, position: 'relative',
    }}>
      {isLive && <span style={{ position: 'absolute', top: 4, right: 8, fontSize: 10, color: '#FF3D3D' }}>🔴</span>}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.4 }}>
        <div style={{ color: isTbd ? 'var(--fg-3)' : '#fff' }}>{home}</div>
        <div style={{ color: 'var(--fg-3)', fontSize: 13, textAlign: 'center', margin: '1px 0' }}>{score}</div>
        <div style={{ color: isTbd ? 'var(--fg-3)' : '#fff' }}>{away}</div>
      </div>
    </div>
  );
}

function BracketView({ giornata }) {
  const getPhase = name => (giornata || []).find(g => g.day === name)?.items || [];
  const pad = (arr, n) => [...arr, ...Array(Math.max(0, n - arr.length)).fill(null)];

  const q  = pad(getPhase('Quarti di finale'), 4);
  const s  = pad(getPhase('Semifinali'), 2);
  const f  = pad(getPhase('Finale'), 1);
  const t3 = pad(getPhase('Finale 3°/4° posto'), 1);

  const hasAny = q.some(Boolean) || s.some(Boolean) || f.some(Boolean) || t3.some(Boolean);
  if (!hasAny) {
    return <div className="adm-card"><div className="adm-empty">Nessuna partita eliminatoria. Generale dal tab Gironi.</div></div>;
  }

  const colHeader = txt => (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--fg-3)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' }}>{txt}</div>
  );
  const connector = () => (
    <div style={{ width: 24, height: 2, background: 'var(--border-brand)', flexShrink: 0, alignSelf: 'center' }} />
  );

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 0, minWidth: 560, padding: '8px 4px', alignItems: 'stretch' }}>
        {q.some(Boolean) && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {colHeader('Quarti di finale')}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 20 }}>
              {q.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <BracketSlot match={m} />{connector()}
                </div>
              ))}
            </div>
          </div>
        )}
        {s.some(Boolean) && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {colHeader('Semifinali')}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 20 }}>
              {s.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <BracketSlot match={m} />{connector()}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {colHeader('Finali')}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--brand-green)', marginBottom: 6, letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>🏆 FINALE</div>
              <BracketSlot match={f[0]} />
            </div>
            {t3[0] !== undefined && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 6, letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>3°/4° POSTO</div>
                <BracketSlot match={t3[0]} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
