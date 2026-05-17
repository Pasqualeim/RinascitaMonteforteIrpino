import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

export function EventsSection({ data, onSave, onRefresh, editionId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const events = data.events || [];

  if (!editionId) {
    return (
      <div>
        <h2 className="adm-section-title">Eventi</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna edizione attiva.</div></div>
      </div>
    );
  }

  async function saveItem(item) {
    setBusy(true);
    setErrMsg('');
    try {
      // Build event_date from day + month fields (legacy shape)
      const event_date = item.event_date || (item.day && item.month ? `${item.day} ${item.month}` : null);
      const event_time = item.event_time || item.time || null;
      const event_type = item.event_type || item.kind || 'partita';
      const description = item.description || item.extra || '';
      if (item.id && !String(item.id).startsWith('e')) {
        await rmAdminDomain.updateEvent(item.id, { title: item.title, event_date, event_time, event_type, description });
      } else {
        await rmAdminDomain.createEvent({ edition_id: editionId, title: item.title, event_date, event_time, event_type, description, sort_order: 0 });
      }
      setEditing(null);
      await onRefresh('Eventi aggiornati');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio evento');
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
      await onRefresh('Evento eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione evento');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Eventi</h2>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{events.length} eventi</span>
          <button className="adm-btn adm-btn-sm" disabled={busy} onClick={() => setEditing({ day: '', month: '', kind: 'match', kindLabel: 'Partita', title: '', time: '', where: '', highlight: false })}>+ Nuovo</button>
        </div>
        {events.map((ev, i) => (
          <div key={ev.id || i} className="adm-item-row">
            <div style={{ textAlign: 'center', minWidth: 44 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand-green)', lineHeight: 1 }}>{ev.day}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{ev.month}</div>
            </div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{ev.title}</div>
              <div className="adm-item-meta">{ev.time} · {ev.where}</div>
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...ev })}><EditIcon size={16}/></button>
              <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(ev.id)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Evento</h3>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-row">
                  <div className="adm-form-group"><label className="adm-label">Giorno</label><input className="adm-input" value={editing.day || ''} onChange={e => setEditing(f => ({ ...f, day: e.target.value }))} placeholder="15" /></div>
                  <div className="adm-form-group"><label className="adm-label">Mese</label><input className="adm-input" value={editing.month || ''} onChange={e => setEditing(f => ({ ...f, month: e.target.value }))} placeholder="Lug" /></div>
                </div>
                <div className="adm-form-group"><label className="adm-label">Titolo</label><input className="adm-input" value={editing.title || ''} onChange={e => setEditing(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="adm-form-row">
                  <div className="adm-form-group"><label className="adm-label">Orario</label><input className="adm-input" value={editing.time || ''} onChange={e => setEditing(f => ({ ...f, time: e.target.value }))} /></div>
                  <div className="adm-form-group"><label className="adm-label">Dove</label><input className="adm-input" value={editing.where || ''} onChange={e => setEditing(f => ({ ...f, where: e.target.value }))} /></div>
                </div>
                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label">Tipo</label>
                    <select className="adm-select" value={editing.kind || 'match'} onChange={e => { const map = { match: 'Partita', cer: 'Cerimonia', party: 'Festa/Cena' }; setEditing(f => ({ ...f, kind: e.target.value, kindLabel: map[e.target.value] || e.target.value })); }}>
                      <option value="match">Partita</option><option value="cer">Cerimonia</option><option value="party">Festa/Cena</option>
                    </select>
                  </div>
                  <div className="adm-form-group"><label className="adm-label">Extra (opz.)</label><input className="adm-input" value={editing.extra || ''} onChange={e => setEditing(f => ({ ...f, extra: e.target.value }))} /></div>
                </div>
                <label className="adm-checkbox-row"><input type="checkbox" checked={!!editing.highlight} onChange={e => setEditing(f => ({ ...f, highlight: e.target.checked }))} /> In evidenza</label>
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={busy}>Salva</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting && <Confirm msg="Eliminare questo evento?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />}
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
