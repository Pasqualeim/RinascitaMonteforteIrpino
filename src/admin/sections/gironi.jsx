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

export function GironiSection({ data, onSave, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Auto-setup wizard state
  const [setupOpen, setSetupOpen] = useState(false);
  const [numGroups, setNumGroups] = useState(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');

  // Generate matches state
  const [genMsg, setGenMsg] = useState('');
  const [genBusy, setGenBusy] = useState(false);

  const groups = data.groups || [];
  const allTeams = data.teams || [];
  const suggested = suggestGroups(allTeams.length);
  const effectiveNumGroups = numGroups ?? suggested;

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Gironi</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata. Seleziona una categoria dal menu in alto.</div></div>
      </div>
    );
  }

  async function saveGroup(g) {
    setBusy(true);
    setErrMsg('');
    try {
      if (g._isNew) {
        await rmAdminDomain.createGroup({ tournament_id: tournamentId, name: g.name, color: '#00E676', sort_order: groups.length });
      } else {
        await rmAdminDomain.updateGroup(g.id, { name: g.name });
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

  async function assignTeam(groupId, team) {
    if (!team.registration_id) return;
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
      // Create groups
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
      // Shuffle + assign round-robin
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

  async function generateGroupMatches() {
    if (groups.length === 0) { setGenMsg('Crea prima i gironi.'); return; }
    setGenBusy(true);
    setGenMsg('');
    try {
      let created = 0;
      for (const g of groups) {
        const groupTeams = allTeams.filter(t => t.group_id === g.id);
        if (groupTeams.length < 2) continue;
        // Round-robin pairs
        for (let a = 0; a < groupTeams.length; a++) {
          for (let b = a + 1; b < groupTeams.length; b++) {
            await rmAdminDomain.createMatch({
              tournament_id: tournamentId,
              group_id: g.id,
              home_team_id: groupTeams[a].id,
              away_team_id: groupTeams[b].id,
              status: 'sch',
              phase: g.name,
              sort_order: created,
            });
            created++;
          }
        }
      }
      await onRefresh(`${created} partite di girone generate`);
      setGenMsg(`✓ ${created} partite generate`);
    } catch (err) {
      setGenMsg('Errore: ' + (err?.message || ''));
    } finally {
      setGenBusy(false);
    }
  }

  const allAssigned = allTeams.length > 0 && allTeams.every(t => t.group_id);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Gironi</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>{allTeams.length} squadre · {groups.length} gironi</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {groups.length === 0 && allTeams.length > 0 && (
            <button className="adm-btn adm-btn-sm" onClick={() => setSetupOpen(o => !o)} disabled={setupBusy}>
              ⚡ Setup auto
            </button>
          )}
          {groups.length > 0 && (
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setSetupOpen(o => !o)} disabled={setupBusy}>
              ⚡ Setup auto
            </button>
          )}
          <button className="adm-btn adm-btn-sm" onClick={() => setEditing({ _isNew: true, name: '' })} disabled={busy}>+ Girone</button>
        </div>
      </div>

      {/* Auto-setup panel */}
      {setupOpen && (
        <div className="adm-card" style={{ marginBottom: 16, background: 'rgba(0,230,118,0.04)', border: '1px solid var(--border-brand)' }}>
          <div className="adm-card-header"><span className="adm-card-title">⚡ Setup Automatico Gironi</span></div>
          <div className="adm-card-body">
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 12 }}>
              {allTeams.length} squadre registrate. Suggerimento: <strong style={{ color: 'var(--brand-green)' }}>{suggested} gironi</strong> da ~{Math.ceil(allTeams.length / suggested)} squadre ciascuno.
            </div>

            {groups.length === 0 ? (
              <>
                <div className="adm-form-row" style={{ alignItems: 'center', marginBottom: 12 }}>
                  <div className="adm-form-group" style={{ flex: '0 0 140px' }}>
                    <label className="adm-label">N° gironi</label>
                    <input type="number" className="adm-input" min="1" max="16"
                      value={effectiveNumGroups}
                      onChange={e => setNumGroups(parseInt(e.target.value) || 1)} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', paddingTop: 20 }}>
                    → {GROUP_LETTERS.slice(0, effectiveNumGroups).split('').map(l => `Girone ${l}`).join(', ')}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 12 }}>
                  Le squadre verranno distribuite casualmente nei gironi.
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
                  Gironi esistenti: {groups.map(g => g.name).join(', ')}. Rimescola la distribuzione delle squadre mantenendo i gironi attuali.
                </div>
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setSetupOpen(false)}>Chiudi</button>
                  <button className="adm-btn adm-btn-sm" onClick={reshuffleTeams} disabled={setupBusy}>
                    {setupBusy ? 'Rimescolamento…' : '🔀 Rimescola squadre (random)'}
                  </button>
                </div>
              </>
            )}
            {setupMsg && <div style={{ marginTop: 8, fontSize: 13, color: setupMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>{setupMsg}</div>}
          </div>
        </div>
      )}

      {/* Generate group matches */}
      {groups.length > 0 && allAssigned && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card-header">
            <span className="adm-card-title">Partite di girone</span>
          </div>
          <div className="adm-card-body" style={{ paddingTop: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 12 }}>
              Genera automaticamente tutte le partite round-robin per ogni girone (ogni squadra affronta tutte le altre nel girone).
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="adm-btn adm-btn-sm" onClick={generateGroupMatches} disabled={genBusy}>
                {genBusy ? 'Generazione…' : '⚽ Genera partite round-robin'}
              </button>
              {genMsg && <span style={{ fontSize: 13, color: genMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>{genMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

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
                <div className="adm-form-actions" style={{ marginTop: 24 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveGroup(editing)} disabled={!editing.name.trim() || busy}>Salva</button>
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
