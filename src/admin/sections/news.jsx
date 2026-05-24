import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

function fmtDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function NewsSection({ data, onSave, onRefresh, editionId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const news = data.news || [];


  if (!editionId) {
    return (
      <div>
        <h2 className="adm-section-title">Avvisi & News</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna edizione attiva.</div></div>
      </div>
    );
  }

  async function saveItem(item) {
    setBusy(true);
    setErrMsg('');
    try {
      if (item.id && !String(item.id).startsWith('n')) {
        // Existing DB item
        await rmAdminDomain.updateNews(item.id, { title: item.title, body: item.body, category: item.category || item.cat || 'generale', tone: item.tone || '', pinned: !!item.pinned });
      } else {
        // New item
        await rmAdminDomain.createNews({ edition_id: editionId, title: item.title, body: item.body, category: item.category || item.cat || 'generale', tone: item.tone || '', pinned: !!item.pinned });
      }
      setEditing(null);
      await onRefresh('Avvisi aggiornati');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio avviso');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteNews(id);
      setDeleting(null);
      await onRefresh('Avviso eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione avviso');
    } finally {
      setBusy(false);
    }
  }

  function newItem() {
    setEditing({ title: '', body: '', category: 'avviso', tone: '', pinned: false });
  }

  const TONE_COLOR = { '': 'var(--brand-green)', warn: 'var(--brand-gold)', alert: '#FF3D3D' };

  return (
    <div>
      <h2 className="adm-section-title">Avvisi & News</h2>
      <p className="adm-section-sub">Gestisci la bacheca pubblica con avvisi, news e comunicati.</p>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{news.length} {news.length === 1 ? 'elemento' : 'elementi'}</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={newItem} disabled={busy}>+ Nuovo</button>
        </div>
        {news.length === 0 ? (
          <div className="adm-empty">Nessun avviso o news. Clicca "+ Nuovo" per aggiungerne uno.</div>
        ) : (
          news.map(n => {
            const cat = n.category || n.cat || 'generale';
            const col = TONE_COLOR[n.tone || ''] || 'var(--brand-green)';
            return (
              <div key={n.id} className="adm-item-row">
                <div className="adm-item-row-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: col, border: `1px solid ${col}`, borderRadius: 999, padding: '1px 7px', opacity: 0.9 }}>{cat}</span>
                    {n.pinned && <span style={{ fontSize: 11 }}>📌</span>}
                  </div>
                  <div className="adm-item-title">{n.title || '(senza titolo)'}</div>
                  <div className="adm-item-meta">{fmtDate(n.date || n.created_at)}</div>
                </div>
                <div className="adm-item-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...n })}><EditIcon size={16}/></button>
                  <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(n.id)}><TrashIcon size={16}/></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <NewsForm item={editing} onSave={saveItem} onClose={() => setEditing(null)} busy={busy} />
      )}
      {deleting && (
        <Confirm msg="Eliminare questo avviso?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function NewsForm({ item, onSave, onClose, busy }) {
  const [form, setForm] = useState({
    category: 'avviso', tone: '', pinned: false, title: '', body: '',
    ...item,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isNew = !item.title && !item.id;
  const cat = form.category || 'avviso';

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{isNew ? 'Nuovo' : 'Modifica'}</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">

            {/* Tipo: pill toggle Avviso / News */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              {[{ v: 'avviso', l: 'Avviso' }, { v: 'news', l: 'News' }].map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => set('category', o.v)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid',
                    borderColor: cat === o.v ? 'var(--brand-green)' : 'var(--border-1)',
                    background: cat === o.v ? 'rgba(0,230,118,0.1)' : 'transparent',
                    color: cat === o.v ? 'var(--brand-green)' : 'var(--fg-2)',
                    fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em',
                    cursor: 'pointer',
                  }}
                >{o.l}</button>
              ))}
            </div>

            <div className="adm-form-group">
              <label className="adm-label">Titolo</label>
              <input className="adm-input" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Titolo" required />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Testo</label>
              <textarea className="adm-textarea" value={form.body || ''} onChange={e => set('body', e.target.value)} placeholder="Descrizione…" rows={4} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <input
                type="checkbox"
                id="news-pin"
                checked={!!form.pinned}
                onChange={e => set('pinned', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--brand-green)', cursor: 'pointer' }}
              />
              <label htmlFor="news-pin" style={{ fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer' }}>
                📌 In evidenza
              </label>
            </div>

            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={() => onSave(form)} disabled={!(form.title || '').trim() || busy}>Salva</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
