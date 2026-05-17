import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

export function GironiSection({ data, onSave, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const groups = data.groups || [];
  const allTeams = data.teams || [];

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
        await rmAdminDomain.createGroup({ tournament_id: tournamentId, name: g.name, color: g.color || '#00E676', sort_order: 0 });
      } else {
        await rmAdminDomain.updateGroup(g.id, { name: g.name, color: g.color || '#00E676' });
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
    setErrMsg('');
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
    setErrMsg('');
    try {
      await rmAdminDomain.updateRegistration(team.registration_id, { group_id: null });
      await onRefresh('Squadra rimossa dal girone');
    } catch (err) {
      setErrMsg(err?.message || 'Errore rimozione squadra');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Gironi</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>Crea gironi e assegna le squadre.</p>
        </div>
        <button className="adm-btn adm-btn-sm" onClick={() => setEditing({ _isNew: true, name: '', color: '#00E676' })} disabled={busy}>+ Girone</button>
      </div>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      {groups.length === 0 ? (
        <div className="adm-card"><div className="adm-empty">Nessun girone. Creane uno per iniziare.</div></div>
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
                <div className="adm-form-group">
                  <label className="adm-label">Colore</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={editing.color || '#00E676'} onChange={e => setEditing(f => ({ ...f, color: e.target.value }))} style={{ width: 48, height: 48, border: '1px solid var(--border-1)', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 2 }} />
                    <input className="adm-input" style={{ flex: 1 }} value={editing.color || '#00E676'} onChange={e => setEditing(f => ({ ...f, color: e.target.value }))} placeholder="#00E676" />
                  </div>
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
