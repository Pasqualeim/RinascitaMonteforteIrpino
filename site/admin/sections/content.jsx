/* global React, DEFAULT_EVENTS, DEFAULT_HONORS, DEFAULT_SPONSORS */

const { useState } = React;

function EventsSection({ data, onSave }) {
  const [events, setEvents] = useState(data.events || DEFAULT_EVENTS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function saveAll(list) { setEvents(list); onSave({ ...data, events: list }, 'Eventi aggiornati'); }
  function saveItem(item) {
    const idx = events.findIndex(e => e.id === item.id);
    saveAll(idx >= 0 ? events.map((e, i) => i === idx ? item : e) : [...events, item]);
    setEditing(null);
  }

  return (
    <div>
      <h2 className="adm-section-title">Eventi</h2>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{events.length} eventi</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setEditing({ id: 'e' + Date.now(), day: '', month: '', kind: 'match', kindLabel: 'Partita', title: '', time: '', where: '', highlight: false })}>+ Nuovo</button>
        </div>
        {events.map((ev, i) => (
          <div key={ev.id} className="adm-item-row">
            <div style={{ textAlign: 'center', minWidth: 44 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand-green)', lineHeight: 1 }}>{ev.day}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{ev.month}</div>
            </div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{ev.title}</div>
              <div className="adm-item-meta">{ev.time} · {ev.where}</div>
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...ev })}><EditIcon size={16}/></button>
              <button className="adm-btn-danger adm-btn-icon" onClick={() => setDeleting(i)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Evento</h3>
            <div className="adm-form">
              <div className="adm-form-row">
                <div className="adm-form-group"><label className="adm-label">Giorno</label><input className="adm-input" value={editing.day} onChange={e => setEditing(f => ({ ...f, day: e.target.value }))} placeholder="15" /></div>
                <div className="adm-form-group"><label className="adm-label">Mese</label><input className="adm-input" value={editing.month} onChange={e => setEditing(f => ({ ...f, month: e.target.value }))} placeholder="Lug" /></div>
              </div>
              <div className="adm-form-group"><label className="adm-label">Titolo</label><input className="adm-input" value={editing.title} onChange={e => setEditing(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="adm-form-row">
                <div className="adm-form-group"><label className="adm-label">Orario</label><input className="adm-input" value={editing.time} onChange={e => setEditing(f => ({ ...f, time: e.target.value }))} /></div>
                <div className="adm-form-group"><label className="adm-label">Dove</label><input className="adm-input" value={editing.where} onChange={e => setEditing(f => ({ ...f, where: e.target.value }))} /></div>
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-label">Tipo</label>
                  <select className="adm-select" value={editing.kind} onChange={e => { const map = { match: 'Partita', cer: 'Cerimonia', party: 'Festa/Cena' }; setEditing(f => ({ ...f, kind: e.target.value, kindLabel: map[e.target.value] || e.target.value })); }}>
                    <option value="match">Partita</option><option value="cer">Cerimonia</option><option value="party">Festa/Cena</option>
                  </select>
                </div>
                <div className="adm-form-group"><label className="adm-label">Extra (opz.)</label><input className="adm-input" value={editing.extra || ''} onChange={e => setEditing(f => ({ ...f, extra: e.target.value }))} /></div>
              </div>
              <label className="adm-checkbox-row"><input type="checkbox" checked={!!editing.highlight} onChange={e => setEditing(f => ({ ...f, highlight: e.target.checked }))} /> In evidenza</label>
              <div className="adm-form-actions">
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting !== null && <Confirm msg="Eliminare questo evento?" onOk={() => { saveAll(events.filter((_, i) => i !== deleting)); setDeleting(null); }} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function HonorsSection({ data, onSave }) {
  const [honors, setHonors] = useState(data.honors || DEFAULT_HONORS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function saveAll(list) { setHonors(list); onSave({ ...data, honors: list }, 'Albo d\'oro aggiornato'); }
  function saveItem(item) {
    const idx = honors.findIndex(h => h.id === item.id);
    saveAll(idx >= 0 ? honors.map(h => h.id === item.id ? item : h) : [...honors, item]);
    setEditing(null);
  }

  return (
    <div>
      <h2 className="adm-section-title">Albo d'oro</h2>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{honors.length} edizioni</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setEditing({ id: 'h' + Date.now(), year: '', edition: '', winner: '', runner: '', topScorer: '', mvp: '', alt: false })}>+ Nuova edizione</button>
        </div>
        {honors.map((h, i) => (
          <div key={h.id} className="adm-item-row">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: h.alt ? 'var(--brand-gold)' : 'var(--brand-green)', lineHeight: 1, width: 60 }}>{h.year}</div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{h.edition}</div>
              <div className="adm-item-meta">🏆 {h.winner} · ⚽ {h.topScorer}</div>
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...h })}><EditIcon size={16}/></button>
              <button className="adm-btn-danger adm-btn-icon" onClick={() => setDeleting(i)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Edizione</h3>
            <div className="adm-form">
              <div className="adm-form-row">
                <div className="adm-form-group"><label className="adm-label">Anno</label><input className="adm-input" value={editing.year} onChange={e => setEditing(f => ({ ...f, year: e.target.value }))} placeholder="2026" /></div>
                <div className="adm-form-group"><label className="adm-label">Edizione</label><input className="adm-input" value={editing.edition} onChange={e => setEditing(f => ({ ...f, edition: e.target.value }))} placeholder="3ª Edizione · Cup 2026" /></div>
              </div>
              <div className="adm-form-group"><label className="adm-label">Vincitore</label><input className="adm-input" value={editing.winner} onChange={e => setEditing(f => ({ ...f, winner: e.target.value }))} /></div>
              <div className="adm-form-group"><label className="adm-label">Finalista</label><input className="adm-input" value={editing.runner} onChange={e => setEditing(f => ({ ...f, runner: e.target.value }))} /></div>
              <div className="adm-form-group"><label className="adm-label">Capocannoniere</label><input className="adm-input" value={editing.topScorer} onChange={e => setEditing(f => ({ ...f, topScorer: e.target.value }))} placeholder="Nome Cognome (N)" /></div>
              <div className="adm-form-group"><label className="adm-label">MVP</label><input className="adm-input" value={editing.mvp} onChange={e => setEditing(f => ({ ...f, mvp: e.target.value }))} /></div>
              <div className="adm-form-actions">
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting !== null && <Confirm msg="Eliminare questa edizione?" onOk={() => { saveAll(honors.filter((_, i) => i !== deleting)); setDeleting(null); }} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function SponsorsSection({ data, onSave }) {
  const [sponsors, setSponsors] = useState(data.sponsors || DEFAULT_SPONSORS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function saveAll(list) { setSponsors(list); onSave({ ...data, sponsors: list }, 'Sponsor aggiornati'); }
  function saveItem(item) {
    const idx = sponsors.findIndex(s => s.id === item.id);
    saveAll(idx >= 0 ? sponsors.map(s => s.id === item.id ? item : s) : [...sponsors, item]);
    setEditing(null);
  }

  return (
    <div>
      <h2 className="adm-section-title">Sponsor</h2>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{sponsors.length} sponsor</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setEditing({ id: 's' + Date.now(), name: '', tag: '' })}>+ Nuovo</button>
        </div>
        {sponsors.map((s, i) => (
          <div key={s.id} className="adm-item-row">
            <div className="adm-item-row-body">
              <div className="adm-item-title">{s.name}</div>
              <div className="adm-item-meta">{s.tag}</div>
            </div>
            <div className="adm-item-actions">
              <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...s })}><EditIcon size={16}/></button>
              <button className="adm-btn-danger adm-btn-icon" onClick={() => setDeleting(i)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Sponsor</h3>
            <div className="adm-form">
              <div className="adm-form-group"><label className="adm-label">Nome</label><input className="adm-input" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="adm-form-group"><label className="adm-label">Categoria/Tag</label><input className="adm-input" value={editing.tag} onChange={e => setEditing(f => ({ ...f, tag: e.target.value }))} placeholder="es. Food partner" /></div>
              <div className="adm-form-actions">
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting !== null && <Confirm msg="Eliminare questo sponsor?" onOk={() => { saveAll(sponsors.filter((_, i) => i !== deleting)); setDeleting(null); }} onCancel={() => setDeleting(null)} />}
    </div>
  );
}
