import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

export function EventsSection({ data, onSave, onRefresh, editionId }) {
  const existing = (data.events || []).find(e => e.event_type === 'regolamento') || null;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  if (!editionId) {
    return (
      <div>
        <h2 className="adm-section-title">Regolamento</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna edizione attiva.</div></div>
      </div>
    );
  }

  function startEdit() {
    setText(existing?.description || '');
    setEditing(true);
    setErrMsg('');
  }

  async function save() {
    if (!text.trim()) { setErrMsg('Il testo non può essere vuoto.'); return; }
    setBusy(true);
    setErrMsg('');
    try {
      if (existing?.id) {
        await rmAdminDomain.updateEvent(existing.id, { description: text, title: 'Regolamento', sort_order: 1 });
      } else {
        await rmAdminDomain.createEvent({ edition_id: editionId, title: 'Regolamento', description: text, sort_order: 1, event_type: 'regolamento' });
      }
      setEditing(false);
      await onRefresh('Regolamento salvato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Regolamento</h2>
      <p className="adm-section-sub">Testo del regolamento visibile al pubblico.</p>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      {!editing ? (
        <div className="adm-card">
          {existing?.description ? (
            <>
              <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)' }}>
                {existing.description}
              </div>
              <div style={{ padding: '0 16px 14px' }}>
                <button className="adm-btn adm-btn-sm" onClick={startEdit}>Modifica</button>
              </div>
            </>
          ) : (
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <p style={{ color: 'var(--fg-3)', fontSize: 13, margin: 0 }}>Nessun regolamento inserito.</p>
              <button className="adm-btn adm-btn-sm" onClick={startEdit}>+ Scrivi regolamento</button>
            </div>
          )}
        </div>
      ) : (
        <div className="adm-card">
          <div style={{ padding: '14px 16px 12px' }}>
            <textarea
              className="adm-input"
              rows={14}
              autoFocus
              value={text}
              placeholder="Scrivi qui il testo completo del regolamento…"
              style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.7 }}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Annulla</button>
            <button className="adm-btn adm-btn-sm" onClick={save} disabled={busy || !text.trim()}>
              {busy ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </div>
      )}
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
  const [uploading, setUploading] = useState(false);
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

  async function handleImageUpload(file) {
    if (!file) return;
    setUploading(true);
    setErrMsg('');
    try {
      const { supabase } = await import('../../lib/supabase.js');
      const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('sponsors').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('sponsors').getPublicUrl(path);
      setEditing(f => ({ ...f, logo_url: urlData.publicUrl }));
    } catch (err) {
      setErrMsg('Errore caricamento immagine: ' + (err?.message || ''));
    } finally {
      setUploading(false);
    }
  }

  async function saveItem(item) {
    if (!item.name?.trim()) { setErrMsg('Nome obbligatorio.'); return; }
    setBusy(true);
    setErrMsg('');
    try {
      const payload = { name: item.name.trim(), logo_url: item.logo_url || null, website_url: item.website_url || null, tag: '' };
      if (item.id && !String(item.id).startsWith('s')) {
        await rmAdminDomain.updateSponsor(item.id, payload);
      } else {
        await rmAdminDomain.createSponsor({ edition_id: editionId, ...payload, sort_order: sponsors.length });
      }
      setEditing(null);
      await onRefresh('Sponsor aggiornato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id) {
    setBusy(true);
    try {
      await rmAdminDomain.deleteSponsor(id);
      setDeleting(null);
      await onRefresh('Sponsor eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione');
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
          <button className="adm-btn adm-btn-sm" disabled={busy} onClick={() => { setErrMsg(''); setEditing({ name: '', logo_url: '', website_url: '' }); }}>+ Nuovo</button>
        </div>
        {sponsors.length === 0 && <div className="adm-empty">Nessuno sponsor. Aggiungi il primo.</div>}
        {sponsors.map((s, i) => (
          <div key={s.id || i} className="adm-item-row">
            {s.logo_url && <img src={s.logo_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, background: '#1a1a1a', flexShrink: 0 }} />}
            <div className="adm-item-row-body">
              <div className="adm-item-title">{s.name}</div>
              {s.website_url && <div className="adm-item-meta" style={{ color: 'var(--brand-green)', fontSize: 11 }}>{s.website_url}</div>}
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => { setErrMsg(''); setEditing({ ...s }); }}><EditIcon size={16}/></button>
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
                <div className="adm-form-group">
                  <label className="adm-label">Nome *</label>
                  <input className="adm-input" value={editing.name || ''} autoFocus placeholder="Nome sponsor" onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Social / Sito web (opz.)</label>
                  <input className="adm-input" value={editing.website_url || ''} placeholder="https://instagram.com/… o https://…" onChange={e => setEditing(f => ({ ...f, website_url: e.target.value }))} />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Logo / Immagine (opz.)</label>
                  {editing.logo_url && (
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={editing.logo_url} alt="" style={{ height: 56, objectFit: 'contain', borderRadius: 6, background: '#1a1a1a', padding: 4 }} />
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(f => ({ ...f, logo_url: '' }))}>Rimuovi</button>
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <span className="adm-btn adm-btn-ghost adm-btn-sm" style={{ pointerEvents: 'none' }}>
                      {uploading ? 'Caricamento…' : '📎 Carica immagine'}
                    </span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                      onChange={e => handleImageUpload(e.target.files?.[0])} />
                  </label>
                  <p style={{ fontSize: 11, color: 'var(--fg-3)', margin: '6px 0 0' }}>Max 2 MB · JPG, PNG, WebP</p>
                </div>
                {errMsg && <div style={{ color: '#FF3D3D', fontSize: 12, marginBottom: 8 }}>{errMsg}</div>}
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={busy || uploading}>Salva</button>
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
