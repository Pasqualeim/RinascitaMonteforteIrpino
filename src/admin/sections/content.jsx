import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

export function EventsSection({ data, onSave, onRefresh, editionId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const articles = data.events || [];

  if (!editionId) {
    return (
      <div>
        <h2 className="adm-section-title">Regolamento</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna edizione attiva.</div></div>
      </div>
    );
  }

  async function saveItem(item) {
    setBusy(true);
    setErrMsg('');
    try {
      const sort_order = item.sort_order || articles.length + 1;
      if (item.id) {
        await rmAdminDomain.updateEvent(item.id, { title: item.title, description: item.description || '', sort_order });
      } else {
        await rmAdminDomain.createEvent({ edition_id: editionId, title: item.title, description: item.description || '', sort_order, event_type: 'regolamento' });
      }
      setEditing(null);
      await onRefresh('Regolamento aggiornato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio articolo');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteEvent(id);
      setDeleting(null);
      await onRefresh('Articolo eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione articolo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Regolamento</h2>
      <p className="adm-section-sub">Articoli visibili al pubblico nella sezione Regolamento.</p>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{articles.length} articoli</span>
          <button className="adm-btn adm-btn-sm" disabled={busy}
            onClick={() => setEditing({ title: '', description: '', sort_order: articles.length + 1 })}>
            + Nuovo articolo
          </button>
        </div>
        {articles.length === 0 && <div className="adm-empty">Nessun articolo. Aggiungi il primo.</div>}
        {articles.map((art, i) => (
          <div key={art.id || i} className="adm-item-row">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--brand-green)', minWidth: 36, textAlign: 'center' }}>
              {art.sort_order > 0 ? art.sort_order : i + 1}
            </div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{art.title}</div>
              {art.description && <div className="adm-item-meta" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.description}</div>}
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...art })}><EditIcon size={16}/></button>
              <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(art.id)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">{editing.id ? 'Modifica articolo' : 'Nuovo articolo'}</h3>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-row">
                  <div className="adm-form-group" style={{ flex: '0 0 80px' }}>
                    <label className="adm-label">N° Art.</label>
                    <input type="number" className="adm-input" value={editing.sort_order || ''} min="1"
                      onChange={e => setEditing(f => ({ ...f, sort_order: parseInt(e.target.value) || '' }))} />
                  </div>
                  <div className="adm-form-group" style={{ flex: 1 }}>
                    <label className="adm-label">Titolo articolo</label>
                    <input className="adm-input" value={editing.title || ''} autoFocus
                      placeholder="es. Iscrizioni, Svolgimento, Premi…"
                      onChange={e => setEditing(f => ({ ...f, title: e.target.value }))} />
                  </div>
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Testo</label>
                  <textarea className="adm-input" rows={6} value={editing.description || ''}
                    placeholder="Testo completo dell'articolo…"
                    style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                    onChange={e => setEditing(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={busy || !editing.title}>Salva</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting && <Confirm msg="Eliminare questo articolo?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

export function HonorsSection({ data, onSave, onRefresh, editionId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const honors = data.honors || [];

  if (!editionId) {
    return (
      <div>
        <h2 className="adm-section-title">Albo d'oro</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna edizione attiva.</div></div>
      </div>
    );
  }

  async function saveItem(item) {
    setBusy(true);
    setErrMsg('');
    try {
      // Map legacy fields: edition → edition_name, runner → runner_up, topScorer → top_scorer, third → third_place
      const payload = {
        edition_name: item.edition_name || item.edition || '',
        year: item.year || '',
        winner: item.winner || '',
        runner_up: item.runner_up || item.runner || '',
        third_place: item.third_place || item.third || '',
        mvp: item.mvp || '',
        top_scorer: item.top_scorer || item.topScorer || '',
        notes: item.notes || '',
      };
      if (item.id && !String(item.id).startsWith('h')) {
        await rmAdminDomain.updateHonor(item.id, payload);
      } else {
        await rmAdminDomain.createHonor({ edition_id: editionId, ...payload });
      }
      setEditing(null);
      await onRefresh('Albo d\'oro aggiornato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio albo d\'oro');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteHonor(id);
      setDeleting(null);
      await onRefresh('Edizione eliminata');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Albo d'oro</h2>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{honors.length} edizioni</span>
          <button className="adm-btn adm-btn-sm" disabled={busy} onClick={() => setEditing({ year: '', edition: '', winner: '', runner: '', topScorer: '', mvp: '', alt: false })}>+ Nuova edizione</button>
        </div>
        {honors.map((h, i) => (
          <div key={h.id || i} className="adm-item-row">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: h.alt ? 'var(--brand-gold)' : 'var(--brand-green)', lineHeight: 1, width: 60 }}>{h.year}</div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{h.edition_name || h.edition}</div>
              <div className="adm-item-meta">🏆 {h.winner} · ⚽ {h.top_scorer || h.topScorer}</div>
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...h })}><EditIcon size={16}/></button>
              <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(h.id)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Edizione</h3>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-row">
                  <div className="adm-form-group"><label className="adm-label">Anno</label><input className="adm-input" value={editing.year || ''} onChange={e => setEditing(f => ({ ...f, year: e.target.value }))} placeholder="2026" /></div>
                  <div className="adm-form-group"><label className="adm-label">Edizione</label><input className="adm-input" value={editing.edition_name || editing.edition || ''} onChange={e => setEditing(f => ({ ...f, edition_name: e.target.value, edition: e.target.value }))} placeholder="3ª Edizione · Cup 2026" /></div>
                </div>
                <div className="adm-form-group"><label className="adm-label">Vincitore</label><input className="adm-input" value={editing.winner || ''} onChange={e => setEditing(f => ({ ...f, winner: e.target.value }))} /></div>
                <div className="adm-form-group"><label className="adm-label">Finalista</label><input className="adm-input" value={editing.runner_up || editing.runner || ''} onChange={e => setEditing(f => ({ ...f, runner_up: e.target.value, runner: e.target.value }))} /></div>
                <div className="adm-form-group"><label className="adm-label">Capocannoniere</label><input className="adm-input" value={editing.top_scorer || editing.topScorer || ''} onChange={e => setEditing(f => ({ ...f, top_scorer: e.target.value, topScorer: e.target.value }))} placeholder="Nome Cognome (N)" /></div>
                <div className="adm-form-group"><label className="adm-label">MVP</label><input className="adm-input" value={editing.mvp || ''} onChange={e => setEditing(f => ({ ...f, mvp: e.target.value }))} /></div>
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={busy}>Salva</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting && <Confirm msg="Eliminare questa edizione?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

export function SponsorsSection({ data, onSave, onRefresh, editionId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const sponsors = data.sponsors || [];

  if (!editionId) {
    return (
      <div>
        <h2 className="adm-section-title">Sponsor</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna edizione attiva.</div></div>
      </div>
    );
  }

  async function saveItem(item) {
    setBusy(true);
    setErrMsg('');
    try {
      if (item.id && !String(item.id).startsWith('s')) {
        await rmAdminDomain.updateSponsor(item.id, { name: item.name, logo_url: item.logo_url, website_url: item.website_url, tag: item.tag });
      } else {
        await rmAdminDomain.createSponsor({ edition_id: editionId, name: item.name, logo_url: item.logo_url || null, website_url: item.website_url || null, tag: item.tag || '', sort_order: 0 });
      }
      setEditing(null);
      await onRefresh('Sponsor aggiornati');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio sponsor');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteSponsor(id);
      setDeleting(null);
      await onRefresh('Sponsor eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione sponsor');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Sponsor</h2>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{sponsors.length} sponsor</span>
          <button className="adm-btn adm-btn-sm" disabled={busy} onClick={() => setEditing({ name: '', tag: '', logo_url: '', website_url: '' })}>+ Nuovo</button>
        </div>
        {sponsors.map((s, i) => (
          <div key={s.id || i} className="adm-item-row">
            <div className="adm-item-row-body">
              <div className="adm-item-title">{s.name}</div>
              <div className="adm-item-meta">{s.tag}</div>
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...s })}><EditIcon size={16}/></button>
              <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(s.id)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Sponsor</h3>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-group"><label className="adm-label">Nome</label><input className="adm-input" value={editing.name || ''} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="adm-form-group"><label className="adm-label">Categoria/Tag</label><input className="adm-input" value={editing.tag || ''} onChange={e => setEditing(f => ({ ...f, tag: e.target.value }))} placeholder="es. Food partner" /></div>
                <div className="adm-form-group"><label className="adm-label">Logo URL (opz.)</label><input className="adm-input" value={editing.logo_url || ''} onChange={e => setEditing(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." /></div>
                <div className="adm-form-group"><label className="adm-label">Sito web (opz.)</label><input className="adm-input" value={editing.website_url || ''} onChange={e => setEditing(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." /></div>
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={busy}>Salva</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting && <Confirm msg="Eliminare questo sponsor?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}
