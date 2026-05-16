import { useState } from 'react';
import { DEFAULT_NEWS } from '../../data.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

export function NewsSection({ data, onSave }) {
  const [news, setNews] = useState(data.news || DEFAULT_NEWS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const TONE_OPTS = [
    { value: '', label: 'Normale' },
    { value: 'alert', label: 'Alert (rosso)' },
    { value: 'warn', label: 'Attenzione (giallo)' },
  ];
  const CAT_OPTS = ['News', 'Avviso', 'Regolamento', 'Eventi', 'Sponsor'];

  function saveAll(list) {
    setNews(list);
    onSave({ ...data, news: list }, 'Avvisi aggiornati');
  }

  function saveItem(item) {
    const exists = news.find(n => n.id === item.id);
    const updated = exists ? news.map(n => n.id === item.id ? item : n) : [item, ...news];
    saveAll(updated);
    setEditing(null);
  }

  function deleteItem(id) {
    saveAll(news.filter(n => n.id !== id));
    setDeleting(null);
  }

  function newItem() {
    setEditing({ id: 'n' + Date.now(), cat: 'News', tone: '', date: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), title: '', body: '', pinned: false });
  }

  return (
    <div>
      <h2 className="adm-section-title">Avvisi & News</h2>
      <p className="adm-section-sub">Gestisci la bacheca pubblica. Gli avvisi in evidenza appaiono in cima.</p>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{news.length} avvisi</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={newItem}>+ Nuovo avviso</button>
        </div>
        {news.length === 0 ? (
          <div className="adm-empty">Nessun avviso. Clicca "Nuovo avviso" per aggiungerne uno.</div>
        ) : (
          news.map(n => (
            <div key={n.id} className="adm-item-row">
              <div className="adm-item-row-body">
                <div className="adm-item-title">{n.pinned ? '📌 ' : ''}{n.title || '(senza titolo)'}</div>
                <div className="adm-item-meta">{n.cat} · {n.date} {n.tone ? `· ${n.tone}` : ''}</div>
              </div>
              <div className="adm-item-actions">
                <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...n })}><EditIcon size={16}/></button>
                <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(n.id)}><TrashIcon size={16}/></button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <NewsForm item={editing} catOpts={CAT_OPTS} toneOpts={TONE_OPTS}
          onSave={saveItem} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <Confirm msg="Eliminare questo avviso?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function NewsForm({ item, catOpts, toneOpts, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{item.title ? 'Modifica avviso' : 'Nuovo avviso'}</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Categoria</label>
                <select className="adm-select" value={form.cat} onChange={e => set('cat', e.target.value)}>
                  {catOpts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Tono</label>
                <select className="adm-select" value={form.tone || ''} onChange={e => set('tone', e.target.value)}>
                  {toneOpts.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Data</label>
              <input className="adm-input" value={form.date} onChange={e => set('date', e.target.value)} placeholder="es. 29 Giu · 14:20" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Titolo</label>
              <input className="adm-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titolo dell'avviso" required />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Testo</label>
              <textarea className="adm-textarea" value={form.body} onChange={e => set('body', e.target.value)} placeholder="Descrizione..." rows={4} />
            </div>
            <label className="adm-checkbox-row">
              <input type="checkbox" checked={!!form.pinned} onChange={e => set('pinned', e.target.checked)} />
              In evidenza (📌)
            </label>
            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={() => onSave(form)} disabled={!form.title.trim()}>Salva</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
