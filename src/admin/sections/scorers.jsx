import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

export function ScorersSection({ data, onSave, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const scorers = data.scorers || [];
  const teams = data.teams || [];

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title">Marcatori</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  async function saveItem(item) {
    setBusy(true);
    setErrMsg('');
    try {
      const team = teams.find(t => t.short === item.short);
      const team_id = team?.id || null;
      // Validate: if team has a roster, player must be in it
      const roster = team?.players || [];
      if (roster.length > 0 && !roster.some(p => p.name === item.name)) {
        setErrMsg(`"${item.name}" non è nel roster di ${team?.name || item.short}. Controlla il nome o scegli la squadra corretta.`);
        setBusy(false);
        return;
      }
      const goals = parseInt(item.goals) || 0;
      if (item.id) {
        await rmAdminDomain.updateScorer(item.id, { player_name: item.name, team_id, goals });
      } else {
        await rmAdminDomain.createScorer({ tournament_id: tournamentId, team_id, player_name: item.name, goals, sort_order: 0 });
      }
      setEditing(null);
      await onRefresh('Marcatori aggiornati');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio marcatore');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(scorer) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteScorer(scorer.id);
      setDeleting(null);
      await onRefresh('Marcatore eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione marcatore');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Marcatori</h2>
      <p className="adm-section-sub">Capocannonieri del torneo (ordinati per gol).</p>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{scorers.length} marcatori</span>
          <button className="adm-btn adm-btn-sm" disabled={busy} onClick={() => setEditing({ name: '', short: '', team: '', color: '#00E676', goals: 0 })}>+ Nuovo</button>
        </div>
        {scorers.map((s, i) => (
          <div key={s.id || i} className="adm-item-row">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--brand-green)', width: 26 }}>{i + 1}</div>
            <div className="adm-crest" style={{ borderColor: s.color, color: s.color }}>{s.short}</div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{s.name}</div>
              <div className="adm-item-meta">{s.team}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--brand-green)', marginRight: 8 }}>⚽{s.goals}</div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...s, short: s.short || s.team })}><EditIcon size={16}/></button>
              <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(s)}><TrashIcon size={16}/></button>
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
                    const t = teams.find(x => x.short === e.target.value);
                    if (t) {
                      const roster = t.players || [];
                      const keepName = roster.length === 0 || roster.some(p => p.name === editing.name);
                      setEditing(f => ({ ...f, short: t.short, team: t.name, color: t.color || '#00E676', name: keepName ? f.name : '' }));
                    } else {
                      setEditing(f => ({ ...f, short: e.target.value }));
                    }
                  }}>
                    <option value="">-- Seleziona Squadra --</option>
                    {teams.map(t => <option key={t.id || t.short} value={t.short}>{t.name}</option>)}
                  </select>
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Giocatore</label>
                  {(() => {
                    const tObj = teams.find(t => t.short === editing.short);
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
                  <input type="number" className="adm-input" value={editing.goals ?? ''} onChange={e => setEditing(f => ({ ...f, goals: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) }))} min="0" placeholder="0" />
                </div>
                <div className="adm-form-actions" style={{ marginTop: 24 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={!editing.name || !editing.short || busy}>Salva</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting && (
        <Confirm msg={`Eliminare ${deleting.name}?`} onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
