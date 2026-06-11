import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOP';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function suggestGroups(teamCount) {
  if (teamCount <= 4) return 1;
  if (teamCount <= 8) return 2;
  if (teamCount <= 12) return 3;
  if (teamCount <= 16) return 4;
  return Math.ceil(teamCount / 4);
}

function nextGroupName(existingGroups) {
  const used = new Set(
    existingGroups.map(g => {
      const m = g.name.match(/Girone\s+([A-P])/i);
      return m ? m[1].toUpperCase() : null;
    }).filter(Boolean)
  );
  for (const letter of GROUP_LETTERS) {
    if (!used.has(letter)) return `Girone ${letter}`;
  }
  return '';
}

export function GironiSection({ data, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Auto-setup wizard
  const [setupOpen, setSetupOpen] = useState(false);
  const [numGroups, setNumGroups] = useState(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');
  const [reshuffleConfirm, setReshuffleConfirm] = useState(false);
  const [deleteAllGroupsConfirm, setDeleteAllGroupsConfirm] = useState(false);

  // Partite di girone
  const [genMode, setGenMode] = useState('single');
  const [genBusy, setGenBusy] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [genConfirm, setGenConfirm] = useState(false);
  const [matchGenOpen, setMatchGenOpen] = useState(false);

  const groups = data.groups || [];
  const allTeams = data.teams || [];
  const suggested = suggestGroups(allTeams.length);
  const effectiveNumGroups = numGroups ?? suggested;

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Gironi</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  async function saveGroup(g) {
    setBusy(true);
    setErrMsg('');
    try {
      const qualify = Math.max(1, parseInt(g.qualify_count, 10) || 2);
      if (g._isNew) {
        await rmAdminDomain.createGroup({ tournament_id: tournamentId, name: g.name, color: '#00E676', sort_order: groups.length, qualify_count: qualify });
      } else {
        await rmAdminDomain.updateGroup(g.id, { name: g.name, qualify_count: qualify });
      }
      setEditing(null);
      await onRefresh('Girone salvato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio girone');
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup(id) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteGroup(id);
      await onRefresh('Girone eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione girone');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAllGroups() {
    setBusy(true);
    setErrMsg('');
    try {
      for (const t of allTeams) {
        if (t.registration_id && t.group_id) {
          await rmAdminDomain.updateRegistration(t.registration_id, { group_id: null }).catch(() => {});
        }
      }
      let failed = 0;
      for (const g of groups) {
        try { await rmAdminDomain.deleteGroup(g.id); } catch { failed++; }
      }
      await onRefresh(failed > 0 ? `Gironi eliminati con ${failed} errori` : 'Tutti i gironi eliminati');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione gironi');
    } finally {
      setBusy(false);
    }
  }

  async function assignTeam(groupId, team) {
    if (!team.registration_id) { setErrMsg('Squadra non iscritta alla categoria. Iscrivila prima dal tab Squadre.'); return; }
    setBusy(true);
    try {
      await rmAdminDomain.updateRegistration(team.registration_id, { group_id: groupId });
      await onRefresh('Squadra aggiunta al girone');
    } catch (err) {
      setErrMsg(err?.message || 'Errore assegnazione squadra');
    } finally {
      setBusy(false);
    }
  }

  async function removeTeamFromGroup(team) {
    if (!team.registration_id) return;
    setBusy(true);
    try {
      await rmAdminDomain.updateRegistration(team.registration_id, { group_id: null });
      await onRefresh('Squadra rimossa dal girone');
    } catch (err) {
      setErrMsg(err?.message || 'Errore rimozione squadra');
    } finally {
      setBusy(false);
    }
  }

  async function autoSetup() {
    if (allTeams.length === 0) { setSetupMsg('Nessuna squadra registrata.'); return; }
    setSetupBusy(true);
    setSetupMsg('');
    try {
      const created = [];
      for (let i = 0; i < effectiveNumGroups; i++) {
        const res = await rmAdminDomain.createGroup({
          tournament_id: tournamentId,
          name: `Girone ${GROUP_LETTERS[i]}`,
          color: '#00E676',
          sort_order: i,
        });
        created.push(res.data || res);
      }
      const shuffled = shuffle(allTeams);
      for (let i = 0; i < shuffled.length; i++) {
        const t = shuffled[i];
        if (t.registration_id) {
          await rmAdminDomain.updateRegistration(t.registration_id, { group_id: created[i % effectiveNumGroups].id });
        }
      }
      setSetupOpen(false);
      await onRefresh(`${effectiveNumGroups} gironi creati, ${shuffled.length} squadre assegnate`);
    } catch (err) {
      setSetupMsg('Errore: ' + (err?.message || 'creazione gironi fallita'));
    } finally {
      setSetupBusy(false);
    }
  }

  async function reshuffleTeams() {
    if (groups.length === 0 || allTeams.length === 0) return;
    setSetupBusy(true);
    setSetupMsg('');
    try {
      const shuffled = shuffle(allTeams);
      for (let i = 0; i < shuffled.length; i++) {
        const t = shuffled[i];
        if (t.registration_id) {
          await rmAdminDomain.updateRegistration(t.registration_id, { group_id: groups[i % groups.length].id });
        }
      }
      await onRefresh('Squadre rimescolate');
    } catch (err) {
      setSetupMsg('Errore: ' + (err?.message || ''));
    } finally {
      setSetupBusy(false);
    }
  }

  const allAssigned = allTeams.length > 0 && allTeams.every(t => t.group_id);
  const groupNames = new Set(groups.map(g => g.name));
  const hasGroupMatches = (data.matches_giornata || []).some(g => groupNames.has(g.day) && (g.items || []).length > 0);

  async function generateGroupMatches() {
    setGenBusy(true);
    setGenMsg('');
    try {
      const toDelete = (data.matches_giornata || [])
        .filter(day => groups.some(g => day.day === g.name || day.day?.startsWith(g.name + ' · ')))
        .flatMap(day => day.items || [])
        .filter(m => m.id);
      for (const m of toDelete) await rmAdminDomain.deleteMatch(m.id);
      let created = 0;
      for (const g of groups) {
        const groupTeams = allTeams.filter(t => t.group_id === g.id);
        if (groupTeams.length < 2) continue;
        const pairs = [];
        for (let a = 0; a < groupTeams.length; a++)
          for (let b = a + 1; b < groupTeams.length; b++)
            pairs.push([groupTeams[a], groupTeams[b]]);
        for (const [home, away] of pairs) {
          await rmAdminDomain.createMatch({
            tournament_id: tournamentId, group_id: g.id,
            home_team_id: home.id, away_team_id: away.id,
            status: 'sch',
            phase: genMode === 'double' ? `${g.name} · Andata` : g.name,
            sort_order: created++,
          });
        }
        if (genMode === 'double') {
          for (const [home, away] of pairs) {
            await rmAdminDomain.createMatch({
              tournament_id: tournamentId, group_id: g.id,
              home_team_id: away.id, away_team_id: home.id,
              status: 'sch', phase: `${g.name} · Ritorno`,
              sort_order: created++,
            });
          }
        }
      }
      setGenConfirm(false);
      await onRefresh(`${created} partite di girone generate`);
      setGenMsg(`✓ ${created} partite`);
    } catch (err) {
      setGenMsg('Errore: ' + (err?.message || ''));
    } finally {
      setGenBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Gironi</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>{allTeams.length} squadre · {groups.length} gironi</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {groups.length > 0 && (
            <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleteAllGroupsConfirm(true)} disabled={busy}>
              🗑 Gironi
            </button>
          )}
          <button
            className={`adm-btn adm-btn-sm ${groups.length === 0 && allTeams.length > 0 ? '' : 'adm-btn-ghost'}`}
            onClick={() => setSetupOpen(o => !o)} disabled={setupBusy}>
            ⚡ Setup auto
          </button>
          <button className="adm-btn adm-btn-sm" onClick={() => setEditing({ _isNew: true, name: nextGroupName(groups), qualify_count: 2 })} disabled={busy}>+ Girone</button>
        </div>
      </div>

      {/* Auto-setup panel */}
      {setupOpen && (
        <div className="adm-card" style={{ marginBottom: 16, background: 'rgba(0,230,118,0.04)', border: '1px solid var(--border-brand)' }}>
          <div className="adm-card-header"><span className="adm-card-title">⚡ Setup Automatico Gironi</span></div>
          <div className="adm-card-body">
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 12 }}>
              {allTeams.length} squadre. Suggerimento: <strong style={{ color: 'var(--brand-green)' }}>{suggested} gironi</strong> da ~{Math.ceil(allTeams.length / suggested)} squadre.
            </div>

            {groups.length === 0 ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label className="adm-label">N° gironi</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {[1, 2, 3, 4, 6, 8].map(n => (
                      <button key={n} type="button" onClick={() => setNumGroups(n)} style={{
                        width: 48, height: 48, borderRadius: 10, border: `2px solid ${effectiveNumGroups === n ? 'var(--brand-green)' : 'var(--border-1)'}`,
                        background: effectiveNumGroups === n ? 'rgba(0,230,118,0.12)' : 'var(--bg-surface)',
                        color: effectiveNumGroups === n ? 'var(--brand-green)' : 'var(--fg-2)',
                        fontFamily: 'var(--font-display)', fontSize: 22, cursor: 'pointer', transition: 'all 0.15s',
                      }}>{n}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 8 }}>
                    → {GROUP_LETTERS.slice(0, effectiveNumGroups).split('').map(l => `Girone ${l}`).join(', ')}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 12 }}>
                  Squadre distribuite casualmente nei gironi.
                </div>
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setSetupOpen(false)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={autoSetup} disabled={setupBusy || allTeams.length === 0}>
                    {setupBusy ? 'Creazione…' : `Crea ${effectiveNumGroups} gironi + assegna squadre`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 12 }}>
                  Gironi esistenti: {groups.map(g => g.name).join(', ')}. Rimescola le squadre mantenendo i gironi attuali.
                </div>
                {reshuffleConfirm ? (
                  <div style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: '#FF3D3D', fontWeight: 600, marginBottom: 6 }}>⚠️ Le assegnazioni attuali andranno perse.</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setReshuffleConfirm(false)}>Annulla</button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => { setReshuffleConfirm(false); reshuffleTeams(); }} disabled={setupBusy}>
                        Rimescola comunque
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="adm-form-actions">
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setSetupOpen(false)}>Chiudi</button>
                    <button className="adm-btn adm-btn-sm" onClick={() => setReshuffleConfirm(true)} disabled={setupBusy}>
                      🔀 Rimescola squadre (random)
                    </button>
                  </div>
                )}
              </>
            )}
            {setupMsg && <div style={{ marginTop: 8, fontSize: 13, color: setupMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>{setupMsg}</div>}
          </div>
        </div>
      )}

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      {/* ── Partite di girone ── */}
      {groups.length > 0 && allAssigned && (
        <div className="adm-card" style={{ marginBottom: 12 }}>
          <div className="adm-card-header" style={{ cursor: 'pointer' }} onClick={() => setMatchGenOpen(o => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="adm-card-title">Partite di girone</span>
              {hasGroupMatches && !matchGenOpen && (
                <span style={{ fontSize: 11, color: 'var(--brand-green)', background: 'rgba(0,230,118,0.1)', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>✓ Generate</span>
              )}
            </div>
            <span style={{ fontSize: 16, color: 'var(--fg-3)', transform: matchGenOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms', display: 'inline-block' }}>▾</span>
          </div>
          {matchGenOpen && (
            <div className="adm-card-body" style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                  { id: 'single', label: 'Sola andata', desc: 'Ogni coppia 1 volta', count: groups.reduce((s, g) => { const n = allTeams.filter(t => t.group_id === g.id).length; return s + n * (n - 1) / 2; }, 0) },
                  { id: 'double', label: 'Andata e ritorno', desc: 'Ogni coppia 2 volte', count: groups.reduce((s, g) => { const n = allTeams.filter(t => t.group_id === g.id).length; return s + n * (n - 1); }, 0) },
                ].map(opt => (
                  <button key={opt.id} type="button" onClick={() => setGenMode(opt.id)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: genMode === opt.id ? 'rgba(0,230,118,0.08)' : 'transparent',
                      border: `1px solid ${genMode === opt.id ? 'var(--brand-green)' : 'var(--border-1)'}`,
                      color: '#fff', transition: 'all 140ms' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: genMode === opt.id ? 'var(--brand-green)' : '#fff', marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{opt.desc}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}><strong style={{ color: 'var(--brand-green)' }}>{opt.count}</strong> partite totali</div>
                  </button>
                ))}
              </div>
              {genConfirm ? (
                <div style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, color: '#FF3D3D', fontWeight: 600, marginBottom: 8 }}>⚠️ Esistono già partite di girone. Rigenerando verranno cancellate — i risultati andranno persi.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setGenConfirm(false)}>Annulla</button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => { setGenConfirm(false); generateGroupMatches(); }} disabled={genBusy}>Rigenera comunque</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="adm-btn adm-btn-sm"
                    onClick={() => hasGroupMatches ? setGenConfirm(true) : generateGroupMatches()}
                    disabled={genBusy}>
                    {genBusy ? 'Generazione…' : hasGroupMatches ? '🔄 Rigenera partite' : '⚽ Genera partite'}
                  </button>
                  {genMsg && <span style={{ fontSize: 13, color: genMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>{genMsg}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="adm-card"><div className="adm-empty">{allTeams.length === 0 ? 'Registra prima le squadre, poi crea i gironi.' : 'Nessun girone. Usa "Setup auto" o "+ Girone".'}</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map(g => {
            const groupTeams = allTeams.filter(t => t.group_id === g.id);
            const freeTeams = allTeams.filter(t => !t.group_id);
            const isOpen = openGroup === g.id;
            return (
              <div key={g.id} className="adm-card">
                <div className="adm-card-header">
                  <div>
                    <span className="adm-card-title">{g.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 8 }}>{groupTeams.length} squadre</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-green)', background: 'rgba(0,230,118,0.1)', borderRadius: 4, padding: '2px 6px', marginLeft: 8 }}>
                      Passano {g.qualify_count ?? 2}
                    </span>
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
                      <div key={t.id || t.short} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < groupTeams.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                        <span style={{ fontSize: 20 }}>{t.flag || '🏳️'}</span>
                        <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>{t.name}</span>
                        {isOpen && (
                          <button onClick={() => removeTeamFromGroup(t)} disabled={busy}
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
                            <button key={t.id || t.short} onClick={() => assignTeam(g.id, t)} disabled={busy}
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
                  <label className="adm-label">Squadre che passano il turno</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} type="button"
                        onClick={() => setEditing(f => ({ ...f, qualify_count: n }))}
                        className={`adm-btn adm-btn-sm ${(editing.qualify_count ?? 2) === n ? '' : 'adm-btn-ghost'}`}
                        style={{ minWidth: 44 }}>
                        {n}
                      </button>
                    ))}
                    <input type="number" className="adm-input" min="1" max="8"
                      value={editing.qualify_count ?? 2}
                      onChange={e => setEditing(f => ({ ...f, qualify_count: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                      style={{ width: 64 }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '6px 0 0' }}>
                    Le prime {editing.qualify_count ?? 2} in classifica si qualificano alla fase successiva.
                  </p>
                </div>
                <div className="adm-form-actions" style={{ marginTop: 24 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveGroup(editing)} disabled={!editing.name?.trim() || busy}>Salva</button>
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
      {deleteAllGroupsConfirm && (
        <Confirm
          msg={`Eliminare tutti i ${groups.length} gironi? Le squadre rimangono ma verranno de-assegnate dai gironi.`}
          onOk={() => { setDeleteAllGroupsConfirm(false); deleteAllGroups(); }}
          onCancel={() => setDeleteAllGroupsConfirm(false)}
        />
      )}
    </div>
  );
}
