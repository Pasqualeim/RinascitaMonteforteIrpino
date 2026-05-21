import React, { useState, useMemo } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

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

export function MatchesSection({ data, onSave, onRefresh, tournamentId, compact }) {
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
  const defaultPhase = allPresets[0] || 'Girone A';

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

      if (updated._isNew) {
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
      } else {
        await rmAdminDomain.updateMatch(updated.id, {
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
        });
      }

      // Sync events for finished matches
      if (updated.status === 'ft' && matchId) {
        const originalEvts = updated._originalEvents || [];
        const localEvts = updated._localEvents || [];
        const localIds = new Set(localEvts.filter(e => e.id).map(e => e.id));
        // Delete removed events
        for (const ev of originalEvts) {
          if (ev.id && !localIds.has(ev.id)) {
            await rmAdminDomain.deleteMatchEvent(ev.id).catch(e => console.warn('Event delete:', e));
          }
        }
        // Add new events
        for (const ev of localEvts) {
          if (!ev.id) {
            const teamObj = ev._side === 'home' ? homeTeam : awayTeam;
            await rmAdminDomain.createMatchEvent({
              match_id: matchId,
              team_id: teamObj?.id || null,
              event_type: ev.type,
              player_name: ev.player || null,
              minute: ev.minute ?? null,
            }).catch(e => console.warn('Event create:', e));
          }
        }
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
      const allMatchIds = giornate.flatMap(d => (d.items || []).filter(m => m.id).map(m => m.id));
      for (const id of allMatchIds) {
        await rmAdminDomain.deleteMatch(id);
      }
      await onRefresh('Tutte le partite eliminate');
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
  const totalMatches = giornate.reduce((s, d) => s + (d.items?.length || 0), 0);

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
            <h2 className="adm-section-title" style={{ margin: 0 }}>Partite</h2>
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
          <div className="adm-card"><div className="adm-empty">Nessuna partita. Generale dal tab Gironi o aggiungi manualmente.</div></div>
        )}

        {groupPhases.length > 0 && (
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

        {(() => {
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

      {editing && <MatchForm match={editing} teams={teams} groups={groups} allPresets={allPresets} defaultPhase={defaultPhase} scorers={data.scorers || []} onSave={saveMatch} onClose={() => { setEditing(null); setSaveError(''); }} busy={busy} saveError={saveError} />}
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
  const [localEvents, setLocalEvents] = useState(match.events || []);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEv, setNewEv] = useState({ type: 'goal', player: '', minute: '', side: 'home' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addEvent() {
    if (!newEv.player.trim()) return;
    setLocalEvents(evs => [...evs, { type: newEv.type, player: newEv.player.trim(), minute: newEv.minute ? parseInt(newEv.minute) : null, _side: newEv.side }]
      .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999)));
    setNewEv({ type: 'goal', player: '', minute: '', side: 'home' });
    setAddingEvent(false);
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
    setError('');
    onSave({ ...form, _localEvents: localEvents, _originalEvents: match.events || [] });
  }

  return (
    <>
    {pendingTeamChange && (
      <div className="adm-overlay" style={{ zIndex: 1100 }} onClick={() => setPendingTeamChange(null)}>
        <div className="adm-modal" style={{ maxHeight: 'auto', minHeight: 'auto', borderRadius: 12, margin: 'auto 16px' }} onClick={e => e.stopPropagation()}>
          <div className="adm-modal-header" style={{ borderBottom: `1px solid ${pendingTeamChange.strong ? 'rgba(255,61,61,0.3)' : 'rgba(245,197,24,0.25)'}` }}>
            <h3 className="adm-modal-title" style={{ color: pendingTeamChange.strong ? '#FF6B6B' : '#F5C518' }}>
              ⚠️ Cambiare squadra
            </h3>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            {pendingTeamChange.strong && (
              <div style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#FF6B6B', lineHeight: 1.5 }}>
                Questa partita ha <strong>risultati o eventi registrati</strong>. Cambiare la squadra invaliderà la classifica e gli eventi associati.
              </div>
            )}
            <p style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Sostituisci <strong>{pendingTeamChange.field === 'home' ? form.home?.name : form.away?.name}</strong> con <strong>{pendingTeamChange.team.name}</strong>. Continuare?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => setPendingTeamChange(null)}>Annulla</button>
              <button type="button" className="adm-btn adm-btn-sm" style={{ flex: 2, ...(pendingTeamChange.strong ? { background: 'transparent', border: '1px solid rgba(255,61,61,0.5)', color: '#FF6B6B' } : {}) }} onClick={confirmTeamChange}>
                Sì, cambia squadra
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
            {error && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6 }}>{error}</div>}
            {saveError && <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, fontSize: 13, color: '#FF6B6B', lineHeight: 1.5 }}><span style={{ flex: 'none' }}>⚠️</span><span>{saveError}</span></div>}

            {/* ── Fase (solo nuova partita) ── */}
            {match._isNew && (
              <div className="adm-form-group">
                <label className="adm-label">Fase *</label>
                {groupPresets.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Gironi</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {groupPresets.map(p => (
                        <button key={p} type="button" style={chipStyle(form._day === p)} onClick={() => set('_day', p)}>{p}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Eliminazione diretta</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {koPresets.map(p => (
                      <button key={p} type="button" style={chipStyle(form._day === p)} onClick={() => set('_day', p)}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Squadre ── */}
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Casa</label>
                <select className="adm-select" value={form.home?.short || ''} onChange={e => requestTeamChange('home', e.target.value)}>
                  <option value="">-- Seleziona --</option>
                  {teams.filter(t => t.short !== form.away?.short).map(t => <option key={t.short || t.id} value={t.short}>{t.name}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Ospite</label>
                <select className="adm-select" value={form.away?.short || ''} onChange={e => requestTeamChange('away', e.target.value)}>
                  <option value="">-- Seleziona --</option>
                  {teams.filter(t => t.short !== form.home?.short).map(t => <option key={t.short || t.id} value={t.short}>{t.name}</option>)}
                </select>
              </div>
            </div>
            {sameTeamsSelected && <p className="adm-inline-hint" style={{ marginTop: -4 }}>Casa e ospite non possono coincidere.</p>}

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

            {/* ── Risultato (solo per partite giocate) ── */}
            {(form.status === 'ft' || form.status === 'live') && (
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Gol Casa</label>
                <input type="number" className="adm-input" value={form.hs ?? 0} onChange={e => set('hs', e.target.value === '' ? 0 : parseInt(e.target.value))} min="0" />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Gol Ospite</label>
                <input type="number" className="adm-input" value={form.as ?? 0} onChange={e => set('as', e.target.value === '' ? 0 : parseInt(e.target.value))} min="0" />
              </div>
            </div>
            )}

            {/* ── Eventi (solo partite giocate) ── */}
            {form.status === 'ft' && form.home && form.away && (
              <div className="adm-form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="adm-label" style={{ margin: 0 }}>Gol e cartellini</label>
                  {!addingEvent && (
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setAddingEvent(true)}>+ Aggiungi</button>
                  )}
                </div>

                {localEvents.length === 0 && !addingEvent && (
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', padding: '8px 0' }}>Nessun evento. Aggiungi gol e cartellini.</div>
                )}

                {localEvents.map((ev, i) => {
                  const icon = ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : '🟥';
                  const teamName = (ev._side === 'home' || ev.team === form.home?.short)
                    ? form.home?.name : form.away?.name;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ minWidth: 30, fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-display)' }}>
                        {ev.minute != null ? `${ev.minute}'` : '—'}
                      </span>
                      <span style={{ fontSize: 15 }}>{icon}</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--fg-1)', fontWeight: 600 }}>{ev.player || '—'}</span>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{teamName || ev.team || ''}</span>
                      <button type="button" onClick={() => removeEvent(i)} style={{ background: 'transparent', border: 0, color: 'var(--fg-3)', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>✕</button>
                    </div>
                  );
                })}

                {addingEvent && (
                  <div style={{ background: '#0f0f0f', border: '1px solid var(--border-1)', borderRadius: 8, padding: '12px', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {EVENT_TYPES.map(t => (
                        <button key={t.value} type="button"
                          style={{ fontSize: 12, padding: '5px 10px', background: newEv.type === t.value ? 'var(--brand-green)' : 'transparent', border: `1px solid ${newEv.type === t.value ? 'var(--brand-green)' : 'var(--border-1)'}`, color: newEv.type === t.value ? '#000' : 'var(--fg-2)', borderRadius: 6, cursor: 'pointer', fontWeight: newEv.type === t.value ? 700 : 400 }}
                          onClick={() => setNewEv(e => ({ ...e, type: t.value }))}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button"
                        style={{ flex: 1, fontSize: 12, padding: '6px 8px', background: newEv.side === 'home' ? 'rgba(0,230,118,0.15)' : 'transparent', border: `1px solid ${newEv.side === 'home' ? 'var(--brand-green)' : 'var(--border-1)'}`, color: newEv.side === 'home' ? 'var(--brand-green)' : 'var(--fg-2)', borderRadius: 6, cursor: 'pointer' }}
                        onClick={() => setNewEv(e => ({ ...e, side: 'home' }))}>
                        {form.home?.name || 'Casa'}
                      </button>
                      <button type="button"
                        style={{ flex: 1, fontSize: 12, padding: '6px 8px', background: newEv.side === 'away' ? 'rgba(0,230,118,0.15)' : 'transparent', border: `1px solid ${newEv.side === 'away' ? 'var(--brand-green)' : 'var(--border-1)'}`, color: newEv.side === 'away' ? 'var(--brand-green)' : 'var(--fg-2)', borderRadius: 6, cursor: 'pointer' }}
                        onClick={() => setNewEv(e => ({ ...e, side: 'away' }))}>
                        {form.away?.name || 'Ospite'}
                      </button>
                    </div>
                    {(() => {
                      const sideTeam = newEv.side === 'home' ? form.home : form.away;
                      const teamPlayers = sideTeam?.players || [];
                      return teamPlayers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {teamPlayers.map((p, i) => (
                            <button key={p.id || i} type="button"
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: newEv.player === p.name ? 'rgba(0,230,118,0.12)' : 'var(--bg-canvas)', border: `1px solid ${newEv.player === p.name ? 'var(--brand-green)' : 'var(--border-1)'}`, borderRadius: 8, cursor: 'pointer', color: newEv.player === p.name ? 'var(--brand-green)' : '#fff', textAlign: 'left', fontWeight: newEv.player === p.name ? 700 : 400 }}
                              onClick={() => setNewEv(ev => ({ ...ev, player: newEv.player === p.name ? '' : p.name }))}>
                              <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <input className="adm-input" placeholder="Altro giocatore..." value={newEv.player}
                      onChange={e => setNewEv(ev => ({ ...ev, player: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addEvent()} />

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => { setAddingEvent(false); setNewEv({ type: 'goal', player: '', minute: '', side: 'home' }); }}>Annulla</button>
                      <button type="button" className="adm-btn adm-btn-sm" style={{ flex: 2 }} onClick={addEvent} disabled={!newEv.player.trim()}>Aggiungi</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Data e Orario ── */}
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

            <div className="adm-form-actions" style={{ marginTop: 24 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={submit} disabled={busy}>Salva Partita</button>
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
