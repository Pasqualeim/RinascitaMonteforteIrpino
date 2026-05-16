import { useState } from 'react';
import { DEFAULT_TEAMS, DEFAULT_GROUPS, DEFAULT_NATIONS_2026 } from '../../data.js';
import { rmGetTeamGroupId } from '../../domain.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

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
    if (!item.short) return;
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
