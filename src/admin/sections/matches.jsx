import React, { useState, useMemo } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';
import { supabase } from '../../lib/supabase.js';

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

export function MatchesSection({ data, onSave, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState('lista');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [saveError, setSaveError] = useState(''); // API error shown inside modal
  const [openPhases, setOpenPhases] = useState(new Set());

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
    setOpenPhases(prev => {
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
      const home_team_id = updated.home?.id || null;
      const away_team_id = updated.away?.id || null;
      const home_score = updated.hs != null ? parseInt(updated.hs) : null;
      const away_score = updated.as != null ? parseInt(updated.as) : null;

      if (updated._isNew) {
        await rmAdminDomain.createMatch({
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
      } else {
        const teamsLocked = updated.status === 'live' || updated.status === 'ft' || (updated.events?.length > 0);
        const forceTeams = !!updated._forceTeams;
        await rmAdminDomain.updateMatch(updated.id, {
          ...((forceTeams || (!teamsLocked && home_team_id)) ? { home_team_id: home_team_id ?? null } : {}),
          ...((forceTeams || (!teamsLocked && away_team_id)) ? { away_team_id: away_team_id ?? null } : {}),
          ...(!teamsLocked && group_id ? { group_id } : {}),
          home_score,
          away_score,
          status: updated.status || 'sch',
          phase,
          match_date: updated.isoDate || null,
          match_time: updated.time || null,
          pitch: updated.pitch || 'Campo Sportivo',
        });
      }
      setEditing(null);
      setSaveError('');
      await onRefresh('Partita e classifica aggiornate');
    } catch (err) {
      const human = humanizeError(err);
      setSaveError(human); // shown inside modal
      setErrMsg(human);    // fallback shown in section
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
    const isOpen = openPhases.has(day);
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
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Partite</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>{totalMatches} partite totali</p>
        </div>
        <div className="adm-section-actions">
          <button className={`adm-btn adm-btn-sm ${view === 'lista' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('lista')}>Lista</button>
          <button className={`adm-btn adm-btn-sm ${view === 'bracket' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('bracket')}>Tabellone</button>
          <button className="adm-btn adm-btn-sm" onClick={newMatch} disabled={busy}>+ Nuova</button>
        </div>
      </div>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      {view === 'lista' && (
        <div>
          {totalMatches === 0 && (
            <div className="adm-card"><div className="adm-empty">Nessuna partita. Generale dal tab Gironi o aggiungi manualmente.</div></div>
          )}

          {/* ── Gironi ── */}
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

          {/* ── Eliminazione diretta (esclusa Finale) ── */}
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

                {/* ── Finale ── */}
                {finale && (
                  <div className="adm-card" style={{ marginBottom: 12, border: '1px solid rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.03)' }}>
                    <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-gold)', textTransform: 'uppercase' }}>🏆 Finale</span>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{finale.items?.length || 0} partita</span>
                    </div>
                    <PhaseSection day={finale.day} items={finale.items || []} accent="var(--brand-gold)" />
                  </div>
                )}
              </>
            );
          })()}

        </div>
      )}

      {view === 'bracket' && <BracketView giornata={data.matches_giornata} />}

      {editing && <MatchForm match={editing} teams={teams} groups={groups} allPresets={allPresets} defaultPhase={defaultPhase} onSave={saveMatch} onClose={() => { setEditing(null); setSaveError(''); }} busy={busy} saveError={saveError} />}
      {deleting && <Confirm msg="Eliminare questa partita?" onOk={() => deleteMatch(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function MatchForm({ match, teams, groups, allPresets, defaultPhase, onSave, onClose, busy, saveError }) {
  const [form, setForm] = useState({ ...match });
  const [error, setError] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [pendingTeamChange, setPendingTeamChange] = useState(null); // { field, team }
  const [pendingReset, setPendingReset] = useState(false);
  const [resetOriginals, setResetOriginals] = useState(null); // { home, away } team objects
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const sameTeamsSelected = !!form.home?.short && form.home?.short === form.away?.short;

  // Teams are locked if match already started or has events — changing would break standings/events
  const teamsLocked = !match._isNew && (match.status === 'live' || match.status === 'ft' || (match.events?.length > 0));
  // Warn if teams already assigned — changing requires confirm
  const teamsWarn = !match._isNew && !teamsLocked && !!(match.home?.short && match.away?.short);

  function requestTeamChange(field, short) {
    const t = teams.find(x => x.short === short);
    if (!t) return;
    if (teamsWarn && short !== match[field]?.short) {
      setPendingTeamChange({ field, team: t });
    } else {
      set(field, t);
    }
  }

  function confirmTeamChange() {
    if (pendingTeamChange) set(pendingTeamChange.field, pendingTeamChange.team);
    setPendingTeamChange(null);
  }

  async function openReset() {
    try {
      const { data, error: dbErr } = await supabase
        .from('matches')
        .select('original_home_team_id, original_away_team_id')
        .eq('id', match.id)
        .single();
      if (dbErr) throw dbErr;
      const origHome = data?.original_home_team_id ? (teams.find(t => t.id === data.original_home_team_id) || null) : null;
      const origAway = data?.original_away_team_id ? (teams.find(t => t.id === data.original_away_team_id) || null) : null;
      setResetOriginals({ home: origHome, away: origAway });
      setPendingReset(true);
    } catch {
      setError('Impossibile recuperare lo stato originale. Riprova.');
    }
  }

  function confirmReset() {
    if (!resetOriginals) return;
    setPendingReset(false);
    onSave({ ...form, home: resetOriginals.home, away: resetOriginals.away, hs: null, as: null, status: 'sch', _forceTeams: true });
  }
  // Phase selectors for new match
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
    onSave(form);
  }

  return (
    <>
    {pendingReset && (
      <div className="adm-overlay" style={{ zIndex: 1100 }} onClick={() => { setPendingReset(false); setResetOriginals(null); }}>
        <div style={{
          background: '#111', border: '1px solid var(--border-1)', borderRadius: 16,
          margin: 'auto 20px', width: '100%', maxWidth: 380, overflow: 'hidden',
          animation: 'admSlideUp 220ms cubic-bezier(0.16,1,0.3,1)',
        }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
              Ripristina partita
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              Torna allo stato originale
            </div>
          </div>
          {/* Match preview */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 10 }}>
              Verrà ripristinato a
            </div>
            <div style={{
              background: '#0a0a0a', border: '1px solid var(--border-1)', borderRadius: 10,
              padding: '14px 16px', display: 'grid',
              gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8,
              marginBottom: 14,
            }}>
              <div style={{ textAlign: 'right' }}>
                {resetOriginals?.home?.flag && <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 2 }}>{resetOriginals.home.flag}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: resetOriginals?.home ? '#fff' : 'var(--fg-3)' }}>
                  {resetOriginals?.home?.name || 'Da definire'}
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '0 6px' }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>vs</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {resetOriginals?.away?.flag && <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 2 }}>{resetOriginals.away.flag}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: resetOriginals?.away ? '#fff' : 'var(--fg-3)' }}>
                  {resetOriginals?.away?.name || 'Da definire'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 18, lineHeight: 1.5 }}>
              Risultato e stato verranno azzerati. Data e orario rimangono invariati.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }}
                onClick={() => { setPendingReset(false); setResetOriginals(null); }}>
                Annulla
              </button>
              <button type="button" className="adm-btn adm-btn-sm" style={{
                flex: 2, background: 'transparent',
                border: '1px solid rgba(255,61,61,0.5)', color: '#FF6B6B',
              }} onClick={confirmReset}>
                ↩ Ripristina originale
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {pendingTeamChange && (
      <div className="adm-overlay" style={{ zIndex: 1100 }} onClick={() => setPendingTeamChange(null)}>
        <div className="adm-modal" style={{ maxHeight: 'auto', minHeight: 'auto', borderRadius: 12, margin: 'auto 16px' }} onClick={e => e.stopPropagation()}>
          <div className="adm-modal-header" style={{ borderBottom: '1px solid rgba(245,197,24,0.25)' }}>
            <h3 className="adm-modal-title" style={{ color: '#F5C518' }}>⚠️ Cambiare squadra</h3>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <p style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Stai sostituendo <strong>{pendingTeamChange.field === 'home' ? form.home?.name : form.away?.name}</strong> con <strong>{pendingTeamChange.team.name}</strong>.<br/>
              La modifica aggiornerà <strong>classifica e calendario</strong> ovunque nel sistema. Continuare?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => setPendingTeamChange(null)}>Annulla</button>
              <button type="button" className="adm-btn adm-btn-sm" style={{ flex: 2 }} onClick={confirmTeamChange}>Sì, cambia squadra</button>
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
            {/* Info sistema */}
            {!match._isNew && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--fg-2)' }}>
                <span style={{ flex: 'none' }}>ℹ️</span>
                <span>Le modifiche si propagano in tempo reale su calendario, classifica e sito pubblico.</span>
              </div>
            )}

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
            {teamsLocked ? (
              <div style={{ padding: '10px 12px', background: 'rgba(255,61,61,0.06)', border: '1px solid rgba(255,61,61,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--fg-2)' }}>
                <span style={{ display: 'block', fontWeight: 700, color: '#FF3D3D', marginBottom: 4 }}>⚠️ Squadre non modificabili</span>
                Partita già iniziata o con eventi registrati. Cambiare le squadre causerebbe disallineamenti in classifica e statistiche. Per correggere, elimina la partita e ricreala.
              </div>
            ) : (
              <>
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
              </>
            )}

            {/* ── Risultato (solo se live/ft) ── */}
            {(form.status === 'live' || form.status === 'ft') && (
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-label">Gol Casa</label>
                  <input type="number" className="adm-input" value={form.hs ?? ''} onChange={e => set('hs', e.target.value === '' ? null : parseInt(e.target.value))} min="0" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Gol Ospite</label>
                  <input type="number" className="adm-input" value={form.as ?? ''} onChange={e => set('as', e.target.value === '' ? null : parseInt(e.target.value))} min="0" />
                </div>
              </div>
            )}
            {form.status === 'live' && (
              <div className="adm-form-group">
                <label className="adm-label">Minuto</label>
                <input type="number" className="adm-input" value={form.minute || ''} onChange={e => set('minute', parseInt(e.target.value))} min="0" max="120" />
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
              {!match._isNew && !teamsLocked && (
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.4)' }} onClick={openReset}>↩ Originale</button>
              )}
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
