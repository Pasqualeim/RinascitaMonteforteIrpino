import { useState } from 'react';
import { DEFAULT_NATIONS_2026 } from '../../data.js';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

function playerDisplayName(p) {
  if (p.nome || p.cognome) return [p.nome, p.cognome].filter(Boolean).join(' ');
  return p.name || '';
}

function TeamForm({ team, existingTeams, groups, onSave, onClose }) {
  const nations = DEFAULT_NATIONS_2026;
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState({
    ...team,
    nation: team.nation || team.name || '',
    players: team.players || [],
  });
  const [newNome, setNewNome] = useState('');
  const [newCognome, setNewCognome] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCognome, setEditCognome] = useState('');
  const isNew = !team.id;
  const [selectedNationShort, setSelectedNationShort] = useState(() => {
    const fromNation = nations.find(n => n.name === (team.nation || team.name))?.short;
    return fromNation || (team.short ? team.short.split('-')[0] : '');
  });

  function pickNation(ns) {
    setSelectedNationShort(ns);
    const n = nations.find(x => x.short === ns);
    if (n) {
      const alreadyTaken = existingTeams.some(t => t.short === ns && t.id !== team.id);
      if (alreadyTaken) {
        setFormError(`${n.flag} ${n.name} già registrata. Seleziona un'altra nazione.`);
      } else {
        setFormError('');
      }
      setEditing(f => ({ ...f, nation: n.name, name: n.name, flag: n.flag, short: n.short }));
    } else {
      setFormError('');
      setEditing(f => ({ ...f, nation: '', name: '', flag: '', short: '' }));
    }
  }

  function addPlayer(e) {
    e.preventDefault();
    if (!newNome && !newCognome) return;
    const nome = newNome.trim();
    const cognome = newCognome.trim();
    const fullName = [nome, cognome].filter(Boolean).join(' ').toLowerCase();
    const duplicate = editing.players.some(p => [p.nome, p.cognome].filter(Boolean).join(' ').toLowerCase() === fullName);
    if (duplicate) {
      setFormError(`Giocatore "${[nome, cognome].filter(Boolean).join(' ')}" già presente in questa squadra.`);
      return;
    }
    setFormError('');
    const p = { id: Date.now().toString(), nome, cognome, name: [nome, cognome].filter(Boolean).join(' ') };
    setEditing(f => ({ ...f, players: [...f.players, p] }));
    setNewNome('');
    setNewCognome('');
  }

  function removePlayer(id) {
    setEditing(f => ({ ...f, players: f.players.filter(p => p.id !== id) }));
    if (editingPlayerId === id) setEditingPlayerId(null);
  }

  function startEditPlayer(p) {
    setEditingPlayerId(p.id);
    setEditNome(p.nome || '');
    setEditCognome(p.cognome || '');
  }

  function saveEditPlayer(id) {
    if (!editNome.trim() && !editCognome.trim()) return;
    setEditing(f => ({ ...f, players: f.players.map(p => p.id === id
      ? { ...p, nome: editNome.trim(), cognome: editCognome.trim(), name: [editNome.trim(), editCognome.trim()].filter(Boolean).join(' ') }
      : p
    ) }));
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
            <div className="adm-form-group">
              <label className="adm-label">Nazione FIFA 2026</label>
              <select className="adm-select" value={selectedNationShort} onChange={e => pickNation(e.target.value)}>
                <option value="">-- Seleziona nazione --</option>
                {nations.map(n => <option key={n.short} value={n.short}>{n.flag} {n.name} ({n.short})</option>)}
              </select>
            </div>

            {!isNew && (
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
                          placeholder="Nome"
                          value={editNome}
                          onChange={e => setEditNome(e.target.value)}
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <input
                          className="adm-input"
                          placeholder="Cognome"
                          value={editCognome}
                          onChange={e => setEditCognome(e.target.value)}
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
                        <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>{playerDisplayName(p)}</span>
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
                  placeholder="Nome"
                  style={{ flex: 1 }}
                  value={newNome}
                  onChange={e => setNewNome(e.target.value)}
                />
                <input
                  className="adm-input"
                  placeholder="Cognome"
                  style={{ flex: 1 }}
                  value={newCognome}
                  onChange={e => setNewCognome(e.target.value)}
                />
                <button className="adm-btn adm-btn-sm adm-btn-brand" type="submit" style={{ flexShrink: 0, minWidth: 48 }}>+</button>
              </form>

              {editing.players.length === 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>Nessun giocatore. Inserisci nome e cognome, poi premi +</p>
              )}
            </div>

            {formError && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6 }}>{formError}</div>}
            <div className="adm-form-actions" style={{ marginTop: 24 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={() => {
                if (!editing.short) { setFormError('Seleziona una nazione per la squadra'); return; }
                const alreadyTaken = existingTeams.some(t => t.short === editing.short && t.id !== team.id);
                if (alreadyTaken) { setFormError(`${editing.flag} ${editing.nation} già registrata. Seleziona un'altra nazione.`); return; }
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

export function TeamsSection({ data, onSave, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const teams = data.teams || [];
  const groups = data.groups || [];

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Squadre</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  async function saveItem(item) {
    if (!item.short) return;
    setBusy(true);
    setErrMsg('');
    try {
      if (item.id) {
        // Existing team — update
        await rmAdminDomain.updateTeam(item.id, { name: item.name, short: item.short, nation: item.nation, flag: item.flag, color: item.color });
        if (item.registration_id) {
          await rmAdminDomain.updateRegistration(item.registration_id, { group_id: item.group_id || null, captain: item.captain, players: item.players });
        }
      } else {
        // New team — create then register
        const res = await rmAdminDomain.createTeam({ name: item.name, short: item.short, nation: item.nation, flag: item.flag, color: item.color });
        const newId = res?.data?.id || res?.id;
        if (newId) {
          await rmAdminDomain.upsertRegistration({ team_id: newId, tournament_id: tournamentId, group_id: item.group_id || null, captain: item.captain || null, players: item.players || [] });
        }
      }
      setEditing(null);
      await onRefresh('Squadra salvata');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio squadra');
    } finally {
      setBusy(false);
    }
  }

  async function deleteTeam(team) {
    setBusy(true);
    setErrMsg('');
    try {
      const teamScorers = (data.scorers || []).filter(s => s.team === team.short);
      await Promise.all(teamScorers.filter(s => s.id).map(s => rmAdminDomain.deleteScorer(s.id).catch(() => {})));
      if (team.registration_id) {
        await rmAdminDomain.deleteRegistration(team.registration_id);
      }
      await rmAdminDomain.deleteTeam(team.id);
      await onRefresh('Squadra eliminata');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione squadra');
    } finally {
      setBusy(false);
    }
  }

  function newTeam() {
    setEditing({ short: '', name: '', nation: '', group_id: '', flag: '', players: [] });
  }

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Squadre</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>{teams.length} squadre registrate</p>
        </div>
        <button className="adm-btn adm-btn-sm" onClick={newTeam} disabled={busy}>+ Nuova Squadra</button>
      </div>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div className="adm-card">
        {teams.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-3)' }}>Nessuna squadra registrata</div>}
        {teams.map(t => {
          const gName = groupMap[t.group_id] || (t.group_id ? t.group_id : 'Nessun girone');
          return (
            <div key={t.id || t.short} className="adm-item-row">
              <div className="adm-crest" style={{ borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}>{t.flag || t.short}</div>
              <div className="adm-item-row-body">
                <div className="adm-item-title">{t.flag ? t.flag + ' ' : ''}{t.name}</div>
                <div className="adm-item-meta">{gName} · {t.players?.length || 0} giocatori</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...t })}><EditIcon size={16}/></button>
                <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeletingTeam(t)}><TrashIcon size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <TeamForm team={editing} existingTeams={teams} groups={groups} onSave={saveItem} onClose={() => setEditing(null)} />}
      {deletingTeam && (
        <Confirm
          msg="Eliminare questa squadra?"
          onOk={() => { deleteTeam(deletingTeam); setDeletingTeam(null); }}
          onCancel={() => setDeletingTeam(null)}
        />
      )}
    </div>
  );
}
