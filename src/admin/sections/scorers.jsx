import { useState } from 'react';
import { DEFAULT_SCORERS } from '../../data.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

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
          <button className="adm-btn adm-btn-sm" onClick={() => setEditing({ _idx: -1, name: '', team: '', short: '', color: '#00E676', goals: 0 })}>+ Nuovo</button>
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
