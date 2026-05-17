import React, { useState, useMemo } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

const KNOCKOUT_PRESETS = ['Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];

function buildKnockoutRounds(numTeams) {
  const rounds = [];
  let n = numTeams;
  while (n >= 2) {
    const half = Math.floor(n / 2);
    const name = n === 2 ? 'Finale' : n === 4 ? 'Semifinali' : n === 8 ? 'Quarti di finale' : `Round di ${n}`;
    rounds.push({ phase: name, count: half });
    n = half;
  }
  return rounds;
}

export function MatchesSection({ data, onSave, onRefresh, tournamentId }) {
  const allMatches = useMemo(() => {
    const giornata = data.matches_giornata || [];
    return giornata.flatMap(g => g.items.map(m => ({ ...m, _day: g.day })));
  }, [data.matches_giornata]);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState('lista');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Knockout generator
  const [koOpen, setKoOpen] = useState(false);
  const [koTeamsPerGroup, setKoTeamsPerGroup] = useState(2);
  const [ko3rd, setKo3rd] = useState(true);
  const [koBusy, setKoBusy] = useState(false);
  const [koMsg, setKoMsg] = useState('');

  const teams = data.teams || [];
  const groups = data.groups || [];
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

  // Determine group_id from phase label (matches group name)
  function groupIdFromPhase(phase) {
    const g = groups.find(x => x.name === phase);
    return g ? g.id : null;
  }

  // Determine phase string from _day
  function phaseFromDay(day) {
    if (KNOCKOUT_PRESETS.includes(day)) return day;
    const g = groups.find(x => x.name === day);
    return g ? g.name : (day || defaultPhase);
  }

  async function saveMatch(updated) {
    setBusy(true);
    setErrMsg('');
    try {
      const phase = phaseFromDay(updated._day);
      const group_id = groupIdFromPhase(updated._day);
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
          match_date: updated.date || null,
          match_time: updated.time || null,
          pitch: updated.pitch || 'Campo Sportivo',
          sort_order: 0,
        });
      } else {
        await rmAdminDomain.updateMatch(updated.id, {
          group_id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status: updated.status || 'sch',
          phase,
          match_date: updated.date || null,
          match_time: updated.time || null,
          pitch: updated.pitch || 'Campo Sportivo',
        });
      }
      setEditing(null);
      await onRefresh('Partita e classifica aggiornate');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio partita');
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

  const statusLabel = { live: '🔴 Live', ft: '✅ Finale', sch: '⏳ Programmata' };

  async function generateKnockout() {
    const numQualified = groups.length * koTeamsPerGroup;
    if (numQualified < 2) { setKoMsg('Servono almeno 2 squadre qualificate.'); return; }
    setKoBusy(true);
    setKoMsg('');
    try {
      const rounds = buildKnockoutRounds(numQualified);
      let sortOrder = 1000;
      for (const round of rounds) {
        for (let i = 0; i < round.count; i++) {
          await rmAdminDomain.createMatch({
            tournament_id: tournamentId,
            home_team_id: null,
            away_team_id: null,
            status: 'sch',
            phase: round.phase,
            group_id: null,
            sort_order: sortOrder++,
          });
        }
      }
      if (ko3rd && numQualified >= 4) {
        await rmAdminDomain.createMatch({
          tournament_id: tournamentId,
          home_team_id: null, away_team_id: null, status: 'sch',
          phase: '3° posto', group_id: null, sort_order: sortOrder++,
        });
      }
      const total = rounds.reduce((s, r) => s + r.count, 0) + (ko3rd && numQualified >= 4 ? 1 : 0);
      setKoOpen(false);
      await onRefresh(`Fase knockout generata: ${total} partite`);
    } catch (err) {
      setKoMsg('Errore: ' + (err?.message || ''));
    } finally {
      setKoBusy(false);
    }
  }

  function newMatch() {
    setEditing({ _isNew: true, _day: defaultPhase, status: 'sch', home: null, away: null, hs: null, as: null, date: '', time: '', pitch: 'Campo Sportivo' });
  }

  return (
    <div>
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Partite</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>Risultati, fasi torneo e tabellone eliminazione.</p>
        </div>
        <div className="adm-section-actions">
          <button className={`adm-btn adm-btn-sm ${view === 'lista' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('lista')}>Lista</button>
          <button className={`adm-btn adm-btn-sm ${view === 'bracket' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('bracket')}>Bracket</button>
          {groups.length > 0 && (
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setKoOpen(o => !o)}>🏆 Knockout</button>
          )}
          <button className="adm-btn adm-btn-sm" onClick={newMatch} disabled={busy}>+ Nuova</button>
        </div>
      </div>

      {/* Knockout generator panel */}
      {koOpen && (
        <div className="adm-card" style={{ marginBottom: 16, background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.3)' }}>
          <div className="adm-card-header"><span className="adm-card-title">🏆 Genera Fase Knockout</span></div>
          <div className="adm-card-body">
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14 }}>
              {groups.length} gironi. Genera il bracket di eliminazione diretta per le squadre qualificate.
            </div>
            <div className="adm-form-row" style={{ alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
              <div className="adm-form-group" style={{ flex: '0 0 160px' }}>
                <label className="adm-label">Squadre per girone che avanzano</label>
                <select className="adm-select" value={koTeamsPerGroup} onChange={e => setKoTeamsPerGroup(parseInt(e.target.value))}>
                  <option value={1}>1 (solo 1° posto)</option>
                  <option value={2}>2 (1° e 2° posto)</option>
                  <option value={3}>3 (1°, 2°, 3°)</option>
                  <option value={4}>4 (tutte)</option>
                </select>
              </div>
              <div className="adm-form-group" style={{ flex: '0 0 auto' }}>
                <label className="adm-label">Opzioni</label>
                <label className="adm-checkbox-row">
                  <input type="checkbox" checked={ko3rd} onChange={e => setKo3rd(e.target.checked)} />
                  Partita 3° posto
                </label>
              </div>
            </div>
            {(() => {
              const n = groups.length * koTeamsPerGroup;
              const rounds = buildKnockoutRounds(n);
              const total = rounds.reduce((s, r) => s + r.count, 0) + (ko3rd && n >= 4 ? 1 : 0);
              return (
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>
                  {n} squadre qualificate → {rounds.map(r => `${r.phase} (${r.count})`).join(' → ')}
                  {ko3rd && n >= 4 ? ' → 3° posto (1)' : ''}
                  {' '}<strong style={{ color: 'var(--brand-green)' }}>= {total} partite totali</strong>
                </div>
              );
            })()}
            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setKoOpen(false)}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={generateKnockout} disabled={koBusy}>
                {koBusy ? 'Generazione…' : 'Genera bracket'}
              </button>
            </div>
            {koMsg && <div style={{ marginTop: 8, fontSize: 13, color: '#FF3D3D' }}>{koMsg}</div>}
          </div>
        </div>
      )}

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      {view === 'lista' && (
        <div className="adm-card">
          {allMatches.length === 0 ? (
            <div className="adm-empty">Nessuna partita nel calendario.</div>
          ) : (
            allMatches.map(m => (
              <div key={m.id} className="adm-item-row">
                <div className="adm-item-row-body">
                  <div className="adm-item-title">
                    {m.home?.short} {m.hs != null ? `${m.hs}–${m.as}` : 'VS'} {m.away?.short}
                  </div>
                  <div className="adm-item-meta">{m._day} · {m.time} · {statusLabel[m.status]}</div>
                </div>
                <div className="adm-item-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...m })}><EditIcon size={16}/></button>
                  <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(m.id)}><TrashIcon size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'bracket' && <BracketView giornata={data.matches_giornata} />}

      {editing && <MatchForm match={editing} teams={teams} groups={groups} allPresets={allPresets} defaultPhase={defaultPhase} giornate={data.matches_giornata || []} onSave={saveMatch} onClose={() => setEditing(null)} busy={busy} />}
      {deleting && <Confirm msg="Eliminare questa partita?" onOk={() => deleteMatch(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function MatchForm({ match, teams, groups, allPresets, defaultPhase, giornate, onSave, onClose, busy }) {
  const [form, setForm] = useState({ ...match });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const presets = allPresets && allPresets.length > 0 ? allPresets : KNOCKOUT_PRESETS;
  const sameTeamsSelected = !!form.home?.short && form.home?.short === form.away?.short;

  function submit() {
    if (!form.home || !form.away) { setError('Seleziona entrambe le squadre'); return; }
    if (sameTeamsSelected) { setError('Casa e ospite devono essere squadre diverse'); return; }
    setError('');
    onSave(form);
  }

  const groupNames = (groups || []).map(g => g.name);

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{match._isNew ? 'Nuova Partita' : 'Modifica partita'}</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">
            {error && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6 }}>{error}</div>}
            <div className="adm-form-group">
              <label className="adm-label">Fase / Giornata</label>
              {groupNames.length > 0 && (
                <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>GIRONI</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {presets.map((p, i) => {
                  const isKnockout = KNOCKOUT_PRESETS.includes(p);
                  const isFirstKnockout = isKnockout && (i === 0 || !KNOCKOUT_PRESETS.includes(presets[i - 1]));
                  return (
                    <React.Fragment key={p}>
                      {isFirstKnockout && groupNames.length > 0 && (
                        <div style={{ width: '100%', fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em', marginTop: 4 }}>ELIMINAZIONE DIRETTA</div>
                      )}
                      <button type="button"
                        className={`adm-btn adm-btn-sm ${form._day === p ? '' : 'adm-btn-ghost'}`}
                        style={{ fontSize: 11, padding: '4px 8px' }}
                        onClick={() => set('_day', p)}>{p}</button>
                    </React.Fragment>
                  );
                })}
              </div>
              <input className="adm-input" value={form._day || ''} onChange={e => set('_day', e.target.value)} placeholder="Fase personalizzata..." />
            </div>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Squadra Casa</label>
                <select className="adm-select" value={form.home?.short || ''} onChange={e => { const t = teams.find(x => x.short === e.target.value); if (t) set('home', t); }}>
                  <option value="">-- Seleziona --</option>
                  {teams
                    .filter(t => !form.away?.short || t.short === form.home?.short || t.short !== form.away.short)
                    .map(t => <option key={t.short || t.id} value={t.short}>{t.name}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Squadra Ospite</label>
                <select className="adm-select" value={form.away?.short || ''} onChange={e => { const t = teams.find(x => x.short === e.target.value); if (t) set('away', t); }}>
                  <option value="">-- Seleziona --</option>
                  {teams
                    .filter(t => !form.home?.short || t.short === form.away?.short || t.short !== form.home.short)
                    .map(t => <option key={t.short || t.id} value={t.short}>{t.name}</option>)}
                </select>
              </div>
            </div>
            {sameTeamsSelected && (
              <p className="adm-inline-hint" style={{ marginTop: -4 }}>
                Casa e ospite non possono coincidere.
              </p>
            )}
            <div className="adm-form-group">
              <label className="adm-label">Stato</label>
              <select className="adm-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="sch">Programmata</option>
                <option value="live">Live</option>
                <option value="ft">Terminata</option>
              </select>
            </div>
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
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Data</label>
                <input className="adm-input" value={form.date || ''} onChange={e => set('date', e.target.value)} placeholder="es. 15 Lug" />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Orario</label>
                <input className="adm-input" value={form.time || ''} onChange={e => set('time', e.target.value)} placeholder="es. 19:00" />
              </div>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Campo</label>
              <input className="adm-input" value={form.pitch || ''} onChange={e => set('pitch', e.target.value)} placeholder="es. Campo Sportivo" />
            </div>
            <div className="adm-form-actions" style={{ marginTop: 24 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={submit} disabled={busy}>Salva Partita</button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 150,
      position: 'relative',
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
    return <div className="adm-empty">Nessuna partita nelle fasi eliminatorie. Aggiungi partite con fase "Quarti di finale", "Semifinali", "Finale 3°/4° posto" o "Finale".</div>;
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {colHeader('Quarti di finale')}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 20 }}>
            {q.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <BracketSlot match={m} />
                {connector()}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {colHeader('Semifinali')}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 20 }}>
            {s.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <BracketSlot match={m} />
                {connector()}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {colHeader('Finali')}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--brand-green)', marginBottom: 6, letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>🏆 FINALE</div>
              <BracketSlot match={f[0]} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 6, letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>3°/4° POSTO</div>
              <BracketSlot match={t3[0]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
