import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_TEAMS, DEFAULT_GROUPS, DEFAULT_NATIONS_2026, DEFAULT_MATCHES_GIORNATA, DEFAULT_SCORERS } from '../../data.js';
import { rmGetTeamGroupId } from '../../domain.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

const KNOCKOUT_PRESETS = ['Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];

export function MatchesSection({ data, onSave }) {
  const allMatches = useMemo(() => {
    const giornata = data.matches_giornata || DEFAULT_MATCHES_GIORNATA;
    return giornata.flatMap(g => g.items.map(m => ({ ...m, _day: g.day })));
  }, [data.matches_giornata]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState('lista');
  const teams = data.teams || DEFAULT_TEAMS;

  const groups = data.groups || DEFAULT_GROUPS;
  const groupPresets = groups.map(g => g.name);
  const allPresets = [...groupPresets, ...KNOCKOUT_PRESETS];
  const defaultPhase = allPresets[0] || 'Girone A';

  function saveMatch(updated) {
    let giornata = JSON.parse(JSON.stringify(data.matches_giornata || []));

    if (!updated._isNew) {
      for (let g of giornata) {
        const idx = g.items.findIndex(m => m.id === updated.id);
        if (idx >= 0) { g.items.splice(idx, 1); break; }
      }
    } else {
      updated.id = Date.now().toString();
    }

    updated.pitch = updated.pitch || 'Campo Sportivo';
    const targetDay = updated._day || defaultPhase;
    delete updated._isNew;
    delete updated._day;

    let g = giornata.find(x => x.day === targetDay);
    if (!g) { g = { day: targetDay, items: [] }; giornata.push(g); }
    g.items.push(updated);
    giornata = giornata.filter(x => x.items.length > 0);

    onSave({ ...data, matches_giornata: giornata }, 'Partita e classifica aggiornate');
    setEditing(null);
  }

  function deleteMatch(matchId) {
    let giornata = JSON.parse(JSON.stringify(data.matches_giornata || []));
    for (let g of giornata) {
      g.items = g.items.filter(m => m.id !== matchId);
    }
    giornata = giornata.filter(x => x.items.length > 0);
    onSave({ ...data, matches_giornata: giornata }, 'Partita eliminata');
    setDeleting(null);
  }

  const statusLabel = { live: '🔴 Live', ft: '✅ Finale', sch: '⏳ Programmata' };

  function newMatch() {
    setEditing({ _isNew: true, _day: defaultPhase, status: 'sch', home: null, away: null, hs: null, as: null, date: '', time: '', pitch: 'Campo Sportivo' });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Partite</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>Risultati, fasi torneo e tabellone eliminazione.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`adm-btn adm-btn-sm ${view === 'lista' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('lista')}>Lista</button>
          <button className={`adm-btn adm-btn-sm ${view === 'bracket' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('bracket')}>Bracket</button>
          <button className="adm-btn adm-btn-sm" onClick={newMatch}>+ Nuova</button>
        </div>
      </div>

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

      {editing && <MatchForm match={editing} teams={teams} groups={groups} allPresets={allPresets} defaultPhase={defaultPhase} giornate={data.matches_giornata || []} onSave={saveMatch} onClose={() => setEditing(null)} />}
      {deleting && <Confirm msg="Eliminare questa partita?" onOk={() => deleteMatch(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function MatchForm({ match, teams, groups, allPresets, defaultPhase, giornate, onSave, onClose }) {
  const [form, setForm] = useState({ ...match });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const presets = allPresets && allPresets.length > 0 ? allPresets : KNOCKOUT_PRESETS;

  function submit() {
    if (!form.home || !form.away) { setError('Seleziona entrambe le squadre'); return; }
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
                  {teams.map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Squadra Ospite</label>
                <select className="adm-select" value={form.away?.short || ''} onChange={e => { const t = teams.find(x => x.short === e.target.value); if (t) set('away', t); }}>
                  <option value="">-- Seleziona --</option>
                  {teams.map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
                </select>
              </div>
            </div>
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
              <button className="adm-btn adm-btn-sm" onClick={submit}>Salva Partita</button>
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

export function StandingsSection({ data }) {
  const standings_groups = data.standings_groups || [];
  const [selIdx, setSelIdx] = useState(0);

  if (standings_groups.length === 0) {
    return (
      <div>
        <h2 className="adm-section-title">Classifica</h2>
        <div className="adm-card">
          <div className="adm-empty">Nessun girone configurato. Crea gironi dalla sezione Gironi e assegna le squadre.</div>
        </div>
      </div>
    );
  }

  const current = standings_groups[selIdx] || standings_groups[0];

  return (
    <div>
      <h2 className="adm-section-title">Classifica</h2>
      <div style={{ padding: '10px 16px', background: 'rgba(0,230,118,0.07)', border: '1px solid var(--border-brand)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--brand-green)' }}>
        ⚡ Calcolata automaticamente dai risultati FT, per partite tra squadre dello stesso girone.
      </div>
      {standings_groups.length > 1 && (
        <div className="rm-tabs" style={{ marginBottom: 16 }}>
          {standings_groups.map((g, i) => (
            <button key={g.id} className={`rm-tab ${selIdx === i ? 'on' : ''}`} onClick={() => setSelIdx(i)}>{g.name}</button>
          ))}
        </div>
      )}
      <div className="adm-card">
        {current.rows.length === 0 ? (
          <div className="adm-empty">Nessuna partita FT per questo girone. I risultati appariranno automaticamente.</div>
        ) : (
          current.rows.map((r, i) => (
            <div key={r.short} className="adm-item-row">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand-green)', width: 28 }}>{i + 1}</div>
              <div className="adm-crest" style={{ borderColor: r.color, color: r.color }}>{r.flag || r.short}</div>
              <div className="adm-item-row-body">
                <div className="adm-item-title">{r.flag ? r.flag + ' ' : ''}{r.name}</div>
                <div className="adm-item-meta">G{r.g} V{r.v} N{r.n} P{r.p} · GF{r.gf} GS{r.gs} · <b style={{ color: 'var(--brand-green)' }}>{r.pt}pt</b></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ScorersSection({ data, onSave }) {
  const [scorers, setScorers] = useState(data.scorers || DEFAULT_SCORERS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function saveAll(list) {
    setScorers(list);
    onSave({ ...data, scorers: list }, 'Marcatori aggiornati');
  }

  function saveItem(item) {
    const idx = scorers.findIndex(s => s._idx === item._idx);
    let updated;
    if (idx >= 0) {
      updated = scorers.map((s, i) => i === idx ? item : s);
    } else {
      updated = [...scorers, item];
    }
    updated.sort((a, b) => (b.goals || 0) - (a.goals || 0));
    saveAll(updated);
    setEditing(null);
  }

  return (
    <div>
      <h2 className="adm-section-title">Marcatori</h2>
      <p className="adm-section-sub">Capocannonieri del torneo (ordinati per gol).</p>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{scorers.length} marcatori</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setEditing({ _idx: -1, name: '', team: '', short: '', color: '#00E676', goals: 0 })}>+ Nuovo</button>
        </div>
        {scorers.map((s, i) => (
          <div key={i} className="adm-item-row">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--brand-green)', width: 26 }}>{i + 1}</div>
            <div className="adm-crest" style={{ borderColor: s.color, color: s.color }}>{s.short}</div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{s.name}</div>
              <div className="adm-item-meta">{s.team}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--brand-green)', marginRight: 8 }}>⚽{s.goals}</div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...s, _idx: i })}><EditIcon size={16}/></button>
              <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(i)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Marcatore</h3>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-group">
                  <label className="adm-label">Squadra</label>
                  <select className="adm-select" value={editing.short || ''} onChange={e => {
                    const t = (data.teams || []).find(x => x.short === e.target.value);
                    if (t) setEditing(f => ({ ...f, short: t.short, team: t.name, color: t.color || '#00E676', name: '' }));
                    else setEditing(f => ({ ...f, short: e.target.value }));
                  }}>
                    <option value="">-- Seleziona Squadra --</option>
                    {(data.teams || []).map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
                  </select>
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Giocatore</label>
                  {(() => {
                    const tObj = (data.teams || []).find(t => t.short === editing.short);
                    const pList = tObj?.players || [];
                    if (pList.length > 0) {
                      return (
                        <select className="adm-select" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))}>
                          <option value="">-- Seleziona Giocatore --</option>
                          {pList.map(p => <option key={p.id} value={p.name}>{p.number ? p.number + '. ' : ''}{p.name}</option>)}
                        </select>
                      );
                    }
                    return <input className="adm-input" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} placeholder="Nome giocatore" />;
                  })()}
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Gol</label>
                  <input type="number" className="adm-input" value={editing.goals} onChange={e => setEditing(f => ({ ...f, goals: parseInt(e.target.value) || 0 }))} min="0" />
                </div>
                <div className="adm-form-actions" style={{ marginTop: 24 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={!editing.name || !editing.short}>Salva</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting !== null && (
        <Confirm msg={`Eliminare ${scorers[deleting]?.name}?`} onOk={() => { saveAll(scorers.filter((_, i) => i !== deleting)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

export function GironiSection({ data, onSave }) {
  const [groups, setGroups] = useState(data.groups || DEFAULT_GROUPS);
  const [editing, setEditing] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  function saveGroup(g) {
    let updated;
    if (g._isNew) {
      const newG = { id: 'g' + Date.now(), name: g.name, color: g.color || '#00E676' };
      updated = [...groups, newG];
    } else {
      updated = groups.map(x => x.id === g.id ? { ...x, name: g.name, color: g.color || '#00E676' } : x);
    }
    setGroups(updated);
    onSave({ ...data, groups: updated }, 'Girone salvato');
    setEditing(null);
  }

  function deleteGroup(id) {
    const updated = groups.filter(g => g.id !== id);
    const updatedTeams = (data.teams || []).map(t => (rmGetTeamGroupId(t) === id ? { ...t, group_id: '' } : t));
    setGroups(updated);
    onSave({ ...data, groups: updated, teams: updatedTeams }, 'Girone eliminato');
  }

  function assignTeam(groupId, teamShort) {
    const updatedTeams = (data.teams || []).map(t => t.short === teamShort ? { ...t, group_id: groupId } : t);
    onSave({ ...data, teams: updatedTeams }, 'Squadra aggiunta al girone');
  }

  function removeTeamFromGroup(teamShort) {
    const updatedTeams = (data.teams || []).map(t => t.short === teamShort ? { ...t, group_id: '' } : t);
    onSave({ ...data, teams: updatedTeams }, 'Squadra rimossa dal girone');
  }

  const allTeams = data.teams || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Gironi</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>Crea gironi e assegna le squadre.</p>
        </div>
        <button className="adm-btn adm-btn-sm" onClick={() => setEditing({ _isNew: true, name: '', color: '#00E676' })}>+ Girone</button>
      </div>

      {groups.length === 0 ? (
        <div className="adm-card"><div className="adm-empty">Nessun girone. Creane uno per iniziare.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map(g => {
            const groupTeams = allTeams.filter(t => rmGetTeamGroupId(t) === g.id);
            const freeTeams = allTeams.filter(t => !rmGetTeamGroupId(t));
            const isOpen = openGroup === g.id;
            return (
              <div key={g.id} className="adm-card">
                <div className="adm-card-header">
                  <div>
                    <span className="adm-card-title">{g.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 8 }}>{groupTeams.length} squadre</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={`adm-btn adm-btn-sm ${isOpen ? '' : 'adm-btn-ghost'}`} onClick={() => setOpenGroup(isOpen ? null : g.id)}>
                      {isOpen ? 'Chiudi' : '👥 Gestisci'}
                    </button>
                    <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...g })}><EditIcon size={16}/></button>
                    <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeletingGroupId(g.id)}><TrashIcon size={16}/></button>
                  </div>
                </div>

                {groupTeams.length > 0 && (
                  <div style={{ padding: '0 16px' }}>
                    {groupTeams.map((t, i) => (
                      <div key={t.short} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < groupTeams.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                        <span style={{ fontSize: 20 }}>{t.flag || '🏳️'}</span>
                        <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>{t.name}</span>
                        {isOpen && (
                          <button onClick={() => removeTeamFromGroup(t.short)}
                            style={{ background: 'transparent', border: 0, color: '#FF3D3D', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-1)', padding: '12px 16px' }}>
                    {freeTeams.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Nessuna squadra libera da assegnare.</div>
                    ) : (
                      <>
                        <div className="adm-label" style={{ marginBottom: 8 }}>Aggiungi squadra</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {freeTeams.map(t => (
                            <button key={t.short} onClick={() => assignTeam(g.id, t.short)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,230,118,0.04)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', color: '#fff', textAlign: 'left' }}>
                              <span style={{ fontSize: 20 }}>{t.flag || '🏳️'}</span>
                              <span style={{ fontSize: 14, flex: 1 }}>{t.name}</span>
                              <span style={{ color: 'var(--brand-green)', fontSize: 20, lineHeight: 1 }}>+</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">{editing._isNew ? 'Nuovo Girone' : 'Modifica Girone'}</h3>
              <button className="adm-btn adm-btn-ghost" style={{ minHeight: 44, width: 44, padding: 0 }} onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-group">
                  <label className="adm-label">Nome Girone</label>
                  <input className="adm-input" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} placeholder="es. Girone A" autoFocus />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Colore</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={editing.color || '#00E676'} onChange={e => setEditing(f => ({ ...f, color: e.target.value }))} style={{ width: 48, height: 48, border: '1px solid var(--border-1)', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 2 }} />
                    <input className="adm-input" style={{ flex: 1 }} value={editing.color || '#00E676'} onChange={e => setEditing(f => ({ ...f, color: e.target.value }))} placeholder="#00E676" />
                  </div>
                </div>
                <div className="adm-form-actions" style={{ marginTop: 24 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveGroup(editing)} disabled={!editing.name.trim()}>Salva</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deletingGroupId && (
        <Confirm
          msg="Eliminare questo girone? Le squadre assegnate perderanno il girone."
          onOk={() => { deleteGroup(deletingGroupId); setDeletingGroupId(null); }}
          onCancel={() => setDeletingGroupId(null)}
        />
      )}
    </div>
  );
}

function TeamForm({ team, groups, onSave, onClose }) {
  const nations = DEFAULT_NATIONS_2026;
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState({
    ...team,
    nation: team.nation || team.name || '',
    players: team.players || [],
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNum, setNewPlayerNum] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerNum, setEditPlayerNum] = useState('');
  const isNew = !team.short;
  const [selectedNationShort, setSelectedNationShort] = useState(() => {
    const fromNation = nations.find(n => n.name === (team.nation || team.name))?.short;
    return fromNation || (team.short ? team.short.split('-')[0] : '');
  });

  function shouldSyncShort(currentShort, previousNationShort) {
    if (!isNew) return false;
    if (!currentShort) return true;
    if (!previousNationShort) return false;
    return currentShort === previousNationShort
      || currentShort === `${previousNationShort}-JR`
      || currentShort === `${previousNationShort}-O40`;
  }

  function pickNation(ns) {
    const previousNationShort = selectedNationShort;
    setSelectedNationShort(ns);
    const n = nations.find(x => x.short === ns);
    if (n) {
      setEditing(f => ({
        ...f,
        nation: n.name,
        name: n.name,
        flag: n.flag,
        short: shouldSyncShort(f.short, previousNationShort) ? n.short : f.short,
      }));
    } else {
      setEditing(f => ({
        ...f,
        nation: '',
        name: '',
        flag: '',
        short: shouldSyncShort(f.short, previousNationShort) ? '' : f.short,
      }));
    }
  }

  function addPlayer(e) {
    e.preventDefault();
    if (!newPlayerName) return;
    const p = { id: Date.now().toString(), name: newPlayerName.trim(), number: newPlayerNum };
    setEditing(f => ({ ...f, players: [...f.players, p] }));
    setNewPlayerName('');
    setNewPlayerNum('');
  }

  function removePlayer(id) {
    setEditing(f => ({ ...f, players: f.players.filter(p => p.id !== id) }));
    if (editingPlayerId === id) setEditingPlayerId(null);
  }

  function startEditPlayer(p) {
    setEditingPlayerId(p.id);
    setEditPlayerName(p.name);
    setEditPlayerNum(p.number || '');
  }

  function saveEditPlayer(id) {
    if (!editPlayerName.trim()) return;
    setEditing(f => ({ ...f, players: f.players.map(p => p.id === id ? { ...p, name: editPlayerName.trim(), number: editPlayerNum } : p) }));
    setEditingPlayerId(null);
  }

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{isNew ? 'Nuova Squadra' : (editing.flag ? editing.flag + ' ' : '') + editing.name}</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">
            {isNew ? (
              <>
                <div className="adm-form-group">
                  <label className="adm-label">Nazione FIFA 2026</label>
                  <select className="adm-select" value={selectedNationShort} onChange={e => pickNation(e.target.value)}>
                    <option value="">-- Seleziona nazione --</option>
                    {nations.map(n => <option key={n.short} value={n.short}>{n.flag} {n.name} ({n.short})</option>)}
                  </select>
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Sigla</label>
                  <input className="adm-input" value={editing.short || ''} onChange={e => setEditing(f => ({ ...f, short: e.target.value.toUpperCase() }))} placeholder="es. ITA" />
                </div>
              </>
            ) : (
              <>
                <div className="adm-form-group">
                  <label className="adm-label">Nazione FIFA 2026</label>
                  <select className="adm-select" value={selectedNationShort} onChange={e => pickNation(e.target.value)}>
                    <option value="">-- Seleziona nazione --</option>
                    {nations.map(n => <option key={n.short} value={n.short}>{n.flag} {n.name} ({n.short})</option>)}
                  </select>
                </div>
                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label">Sigla</label>
                    <input className="adm-input" value={editing.short || ''} disabled style={{ opacity: 0.5 }} />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label">Nome squadra</label>
                    <input className="adm-input" value={editing.name || ''} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {isNew && (
              <div className="adm-form-group">
                <label className="adm-label">Nome squadra</label>
                <input className="adm-input" value={editing.name || ''} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} />
              </div>
            )}

            <div className="adm-form-group" style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label className="adm-label" style={{ margin: 0 }}>Rosa Giocatori</label>
                {editing.players.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--brand-green)', fontWeight: 600 }}>{editing.players.length} giocatori</span>
                )}
              </div>

              {editing.players.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                  {editing.players.map(p => (
                    editingPlayerId === p.id ? (
                      <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                        <input
                          className="adm-input"
                          value={editPlayerNum}
                          onChange={e => setEditPlayerNum(e.target.value)}
                          style={{ width: 56, textAlign: 'center', flexShrink: 0, padding: '8px 6px' }}
                          type="number" min="1" max="99"
                          autoFocus
                        />
                        <input
                          className="adm-input"
                          value={editPlayerName}
                          onChange={e => setEditPlayerName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditPlayer(p.id); if (e.key === 'Escape') setEditingPlayerId(null); }}
                          style={{ flex: 1 }}
                        />
                        <button className="adm-btn adm-btn-sm adm-btn-brand" onClick={() => saveEditPlayer(p.id)} style={{ flexShrink: 0 }}>✓</button>
                        <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setEditingPlayerId(null)} style={{ flexShrink: 0 }}>✕</button>
                      </div>
                    ) : (
                      <div key={p.id} onClick={() => startEditPlayer(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,230,118,0.3)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                        {p.number && (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--brand-green)', minWidth: 24, textAlign: 'center' }}>{p.number}</span>
                        )}
                        <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>{p.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', marginRight: 4 }}>modifica</span>
                        <button onClick={e => { e.stopPropagation(); removePlayer(p.id); }}
                          style={{ background: 'transparent', border: 0, color: 'rgba(255,61,61,0.5)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>✕</button>
                      </div>
                    )
                  ))}
                </div>
              )}

              <form onSubmit={addPlayer} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <input
                  className="adm-input"
                  placeholder="#"
                  style={{ width: 56, textAlign: 'center', flexShrink: 0, padding: '10px 6px' }}
                  value={newPlayerNum}
                  onChange={e => setNewPlayerNum(e.target.value)}
                  type="number"
                  min="1"
                  max="99"
                />
                <input
                  className="adm-input"
                  placeholder="Nome giocatore"
                  style={{ flex: 1 }}
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                />
                <button className="adm-btn adm-btn-sm adm-btn-brand" type="submit" style={{ flexShrink: 0, minWidth: 48 }}>+</button>
              </form>

              {editing.players.length === 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>Nessun giocatore. Inserisci numero e nome, poi premi +</p>
              )}
            </div>

            {formError && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6 }}>{formError}</div>}
            <div className="adm-form-actions" style={{ marginTop: 24 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={() => {
                if (!editing.short) { setFormError('Inserisci una sigla per la squadra (es. ITA)'); return; }
                setFormError('');
                onSave(editing);
              }}>Salva Squadra</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamsSection({ data, onSave }) {
  const [teams, setTeams] = useState(data.teams || DEFAULT_TEAMS);
  const [editing, setEditing] = useState(null);
  const [deletingTeamShort, setDeletingTeamShort] = useState(null);
  const [filterGroup, setFilterGroup] = useState('all');
  const groups = data.groups || DEFAULT_GROUPS;

  function saveItem(item) {
    if (!item.short) {
      return;
    }
    let updated;
    if (teams.find(t => t.short === item.short)) {
      updated = teams.map(t => t.short === item.short ? item : t);
    } else {
      updated = [...teams, item];
    }
    setTeams(updated);
    onSave({ ...data, teams: updated }, 'Squadra salvata');
    setEditing(null);
  }

  function deleteTeam(short) {
    const updated = teams.filter(t => t.short !== short);
    setTeams(updated);
    onSave({ ...data, teams: updated }, 'Squadra eliminata');
  }

  function newTeam() {
    setEditing({ short: '', name: '', nation: '', group_id: '', flag: '', players: [], played: 0, won: 0, goals: 0, points: 0 });
  }

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));
  const filtered = filterGroup === 'all' ? teams
    : filterGroup === 'none' ? teams.filter(t => !rmGetTeamGroupId(t))
    : teams.filter(t => rmGetTeamGroupId(t) === filterGroup);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Squadre</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>{teams.length} squadre registrate</p>
        </div>
        <button className="adm-btn adm-btn-sm" onClick={newTeam}>+ Nuova Squadra</button>
      </div>

      {groups.length > 0 && (
        <div className="rm-tabs" style={{ marginBottom: 12 }}>
          <button className={`rm-tab ${filterGroup === 'all' ? 'on' : ''}`} onClick={() => setFilterGroup('all')}>Tutte ({teams.length})</button>
          {groups.map(g => (
            <button key={g.id} className={`rm-tab ${filterGroup === g.id ? 'on' : ''}`} onClick={() => setFilterGroup(g.id)}>
              {g.name} ({teams.filter(t => rmGetTeamGroupId(t) === g.id).length})
            </button>
          ))}
          <button className={`rm-tab ${filterGroup === 'none' ? 'on' : ''}`} onClick={() => setFilterGroup('none')}>
            Senza girone ({teams.filter(t => !rmGetTeamGroupId(t)).length})
          </button>
        </div>
      )}

      <div className="adm-card">
        {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-3)' }}>Nessuna squadra{filterGroup !== 'all' ? ' in questo girone' : ' registrata'}</div>}
        {filtered.map(t => {
          const teamGroupId = rmGetTeamGroupId(t);
          const gName = groupMap[teamGroupId] || (teamGroupId ? teamGroupId : 'Nessun girone');
          return (
            <div key={t.short} className="adm-item-row">
              <div className="adm-crest" style={{ borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}>{t.flag || t.short}</div>
              <div className="adm-item-row-body">
                <div className="adm-item-title">{t.flag ? t.flag + ' ' : ''}{t.name}</div>
                <div className="adm-item-meta">{gName} · {t.players?.length || 0} giocatori</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...t })}><EditIcon size={16}/></button>
                <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeletingTeamShort(t.short)}><TrashIcon size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <TeamForm team={editing} groups={groups} onSave={saveItem} onClose={() => setEditing(null)} />}
      {deletingTeamShort && (
        <Confirm
          msg="Eliminare questa squadra?"
          onOk={() => { deleteTeam(deletingTeamShort); setDeletingTeamShort(null); }}
          onCancel={() => setDeletingTeamShort(null)}
        />
      )}
    </div>
  );
}
