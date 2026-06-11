import { useState, useEffect } from 'react';
import { rmGetAllEditions, rmAdminUpdateEdition, rmAdminCreateTournamentCategory, rmAdminUpdateTournamentCategory, rmAdminDeleteTournamentCategory } from '../../data.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

function ordinal(n) {
  return `${n}° Posto`;
}

// ── Date edizione: conversioni input ──────────────────────────────
function toDateInput(v) {
  if (!v) return '';
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : '';
}
function toDateTimeLocal(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromDateTimeLocal(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString();
}

function EditionDatesForm({ edition, onSave }) {
  const [start, setStart] = useState(toDateInput(edition.start_date));
  const [end, setEnd] = useState(toDateInput(edition.end_date));
  const [kickoff, setKickoff] = useState(toDateTimeLocal(edition.kickoff_date));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setBusy(true);
    setSaved(false);
    try {
      await onSave(edition.id, {
        start_date: start || null,
        end_date: end || null,
        kickoff_date: fromDateTimeLocal(kickoff),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* status gestito dal parent */ } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: '4px 16px 14px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 10 }}>{edition.name}</div>
      <div className="adm-form-group">
        <label className="adm-label">Calcio d'inizio (countdown sito)</label>
        <input type="datetime-local" className="adm-input" value={kickoff} onChange={e => setKickoff(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="adm-form-group" style={{ flex: 1, minWidth: 140 }}>
          <label className="adm-label">Data inizio torneo</label>
          <input type="date" className="adm-input" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="adm-form-group" style={{ flex: 1, minWidth: 140 }}>
          <label className="adm-label">Data fine torneo</label>
          <input type="date" className="adm-input" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button type="button" className="adm-btn adm-btn-sm" onClick={submit} disabled={busy}>
          {busy ? 'Salvataggio…' : 'Salva date'}
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--brand-green)' }}>Salvato ✓</span>}
      </div>
    </div>
  );
}

function PrizesEditor({ prizes, onChange }) {
  function add() { onChange([...prizes, { label: ordinal(prizes.length + 1), amount: '' }]); }
  function remove(i) { onChange(prizes.filter((_, idx) => idx !== i)); }
  function update(i, field, val) { onChange(prizes.map((p, idx) => idx === i ? { ...p, [field]: val } : p)); }
  return (
    <div className="adm-form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label className="adm-label" style={{ margin: 0 }}>Premi (opzionale)</label>
        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ fontSize: 11 }} onClick={add}>+ Premio</button>
      </div>
      {prizes.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input className="adm-input" placeholder="Descrizione (es. 1° posto)" value={p.label}
            onChange={e => update(i, 'label', e.target.value)} style={{ flex: 2 }} />
          <input className="adm-input" placeholder="€" type="number" min="0" value={p.amount}
            onChange={e => update(i, 'amount', e.target.value)} style={{ flex: 1 }} />
          <button type="button" onClick={() => remove(i)}
            style={{ background: 'transparent', border: 0, color: '#FF3D3D', cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0 }}>✕</button>
        </div>
      ))}
      {prizes.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>Nessun premio configurato.</p>
      )}
    </div>
  );
}

function CategoryForm({ editionId, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [prizes, setPrizes] = useState([]);
  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
  }
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const filtered = prizes.filter(p => p.label || p.amount);
    onSubmit({
      edition_id: editionId,
      name: name.trim(),
      slug: slugify(name),
      prizes: filtered,
      prize_first: filtered[0]?.amount ? parseInt(filtered[0].amount) : null,
      prize_second: filtered[1]?.amount ? parseInt(filtered[1].amount) : null,
      prize_third: filtered[2]?.amount ? parseInt(filtered[2].amount) : null,
    });
  }
  return (
    <form onSubmit={submit} className="adm-form" style={{ padding: '12px 16px', background: 'rgba(0,230,118,0.03)', borderTop: '1px solid var(--border-1)' }}>
      <div className="adm-form-group">
        <label className="adm-label">Nome categoria</label>
        <input className="adm-input" required value={name} onChange={e => setName(e.target.value)} placeholder="Senior, Over 40, Junior…" autoFocus />
      </div>
      <PrizesEditor prizes={prizes} onChange={setPrizes} />
      <div className="adm-form-actions">
        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onCancel}>Annulla</button>
        <button type="submit" className="adm-btn adm-btn-sm">Aggiungi</button>
      </div>
    </form>
  );
}

function CategoryEditForm({ category, onSubmit, onCancel }) {
  const [editing, setEditing] = useState({
    ...category,
    prizes: category.prizes?.length ? category.prizes.map(p => ({ label: p.label || '', amount: p.amount || '' })) : [],
  });
  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
  }
  function submit(e) {
    e.preventDefault();
    const filtered = (editing.prizes || []).filter(p => p.label || p.amount);
    onSubmit({
      ...editing,
      prizes: filtered,
      slug: slugify(editing.name),
      prize_first: filtered[0]?.amount ? parseInt(filtered[0].amount) : null,
      prize_second: filtered[1]?.amount ? parseInt(filtered[1].amount) : null,
      prize_third: filtered[2]?.amount ? parseInt(filtered[2].amount) : null,
    });
  }
  return (
    <form onSubmit={submit} className="adm-form" style={{ padding: '12px 16px', background: 'rgba(0,230,118,0.03)', borderTop: '1px solid var(--border-1)' }}>
      <div className="adm-form-group">
        <label className="adm-label">Nome categoria</label>
        <input className="adm-input" required value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} autoFocus />
      </div>
      <PrizesEditor prizes={editing.prizes || []} onChange={p => setEditing(f => ({ ...f, prizes: p }))} />
      <div className="adm-form-actions">
        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onCancel}>Annulla</button>
        <button type="submit" className="adm-btn adm-btn-sm">Salva</button>
      </div>
    </form>
  );
}

export function SettingsSection({ data, onSave, onRefresh, editionId }) {
  const [halfDuration, setHalfDuration] = useState(data.match_settings?.half_duration || 30);
  const [halfDirty, setHalfDirty] = useState(false);
  const [matchSaved, setMatchSaved] = useState(false);

  // Sync halfDuration from bootstrap only when not mid-edit
  useEffect(() => {
    if (halfDirty) return;
    const v = data.match_settings?.half_duration;
    if (typeof v === 'number' && v > 0) setHalfDuration(v);
  }, [data.match_settings?.half_duration, halfDirty]);
  const [editions, setEditions] = useState([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);

  useEffect(() => {
    setEditionsLoading(true);
    rmGetAllEditions()
      .then(eds => setEditions(eds))
      .catch(() => setEditions([]))
      .finally(() => setEditionsLoading(false));
  }, []);

  function showStatus(msg) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  }

  async function createCategory(payload) {
    try {
      const res = await rmAdminCreateTournamentCategory(payload);
      setEditions(prev => prev.map(ed =>
        ed.id === payload.edition_id
          ? { ...ed, tournaments: [...(ed.tournaments || []), res.data] }
          : ed
      ));
      setShowNewCategory(null);
      if (onRefresh) await onRefresh('Categoria aggiunta');
    } catch (e) { showStatus('Errore: ' + (e?.message || '')); }
  }

  async function updateCategory(payload) {
    try {
      await rmAdminUpdateTournamentCategory(payload.id, payload);
      setEditions(prev => prev.map(ed => ({
        ...ed,
        tournaments: (ed.tournaments || []).map(t => t.id === payload.id ? { ...t, ...payload } : t),
      })));
      setEditingCategory(null);
      showStatus('Categoria aggiornata');
    } catch (e) { showStatus('Errore: ' + (e?.message || '')); }
  }

  async function deleteCategory(edId, categoryId) {
    try {
      await rmAdminDeleteTournamentCategory(categoryId);
      setEditions(prev => prev.map(ed =>
        ed.id === edId
          ? { ...ed, tournaments: (ed.tournaments || []).filter(t => t.id !== categoryId) }
          : ed
      ));
      if (onRefresh) await onRefresh('Categoria eliminata');
    } catch (e) { showStatus('Errore: ' + (e?.message || '')); }
    setConfirmDeleteCategory(null);
  }

  async function saveEditionDates(edId, payload) {
    try {
      await rmAdminUpdateEdition(edId, payload);
      setEditions(prev => prev.map(ed => ed.id === edId ? { ...ed, ...payload } : ed));
      if (onRefresh) await onRefresh('Date edizione aggiornate');
      else showStatus('Date edizione aggiornate');
    } catch (e) {
      showStatus('Errore: ' + (e?.message || ''));
      throw e;
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Impostazioni</h2>

      {/* ── Categorie torneo ───────────────────────────── */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">Categorie di Torneo</span>
          {editions.length > 0 && !showNewCategory && (
            <button className="adm-btn adm-btn-sm" onClick={() => {
              setEditingCategory(null);
              setShowNewCategory(editions[0]?.id);
            }}>+ Categoria</button>
          )}
        </div>

        {statusMsg && (
          <div style={{ padding: '6px 16px', fontSize: 12, color: statusMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>
            {statusMsg}
          </div>
        )}

        {showNewCategory && (
          <CategoryForm
            editionId={showNewCategory}
            onSubmit={createCategory}
            onCancel={() => setShowNewCategory(null)}
          />
        )}

        <div style={{ padding: '4px 0 8px' }}>
          {editionsLoading && <div className="adm-empty" style={{ fontSize: 13 }}>Caricamento…</div>}
          {!editionsLoading && editions.length === 0 && (
            <div className="adm-empty" style={{ fontSize: 13 }}>Nessuna edizione trovata.</div>
          )}
          {editions.map(e => {
            const cats = e.tournaments || [];
            return (
              <div key={e.id}>
                <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>{e.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{e.year}</span>
                </div>
                {cats.length === 0 && (
                  <div style={{ padding: '4px 16px 8px', fontSize: 12, color: 'var(--fg-3)' }}>Nessuna categoria</div>
                )}
                {cats.map(t => (
                  <div key={t.id}>
                    {editingCategory?.id === t.id ? (
                      <CategoryEditForm
                        category={editingCategory}
                        onSubmit={updateCategory}
                        onCancel={() => setEditingCategory(null)}
                      />
                    ) : (
                      <div className="adm-item-row">
                        <div className="adm-item-row-body">
                          <div className="adm-item-title">{t.name}</div>
                          {(t.prize_first > 0 || t.prizes?.length > 0) && (
                            <div className="adm-item-meta">
                              {t.prizes?.length > 0
                                ? t.prizes.map((p, i) => `${p.label} ${p.amount}€`).join(' · ')
                                : `🏆 ${t.prize_first}€`}
                            </div>
                          )}
                        </div>
                        <div className="adm-item-actions">
                          <button className="adm-btn adm-btn-ghost adm-btn-icon"
                            onClick={() => { setShowNewCategory(null); setEditingCategory({ ...t }); }}>
                            <EditIcon size={16} />
                          </button>
                          <button className="adm-btn adm-btn-danger adm-btn-icon"
                            onClick={() => setConfirmDeleteCategory({ editionId: e.id, categoryId: t.id, name: t.name })}>
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Date edizione ──────────────────────────────── */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header"><span className="adm-card-title">Date Edizione</span></div>
        <div style={{ padding: '4px 0 8px' }}>
          {editionsLoading && <div className="adm-empty" style={{ fontSize: 13 }}>Caricamento…</div>}
          {!editionsLoading && editions.length === 0 && (
            <div className="adm-empty" style={{ fontSize: 13 }}>Nessuna edizione trovata.</div>
          )}
          {editions.map(e => (
            <EditionDatesForm key={e.id} edition={e} onSave={saveEditionDates} />
          ))}
        </div>
      </div>

      {/* ── Durata tempi ───────────────────────────────── */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header"><span className="adm-card-title">Durata tempi</span></div>
        <div className="adm-card-body">
          <div className="adm-form">
            <div className="adm-form-group">
              <label className="adm-label">Minuti per tempo</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {[20, 25, 30, 35, 45].map(v => (
                  <button key={v} type="button"
                    onClick={() => { setHalfDuration(v); setHalfDirty(true); }}
                    className={`adm-btn adm-btn-sm ${halfDuration === v ? '' : 'adm-btn-ghost'}`}>
                    {v}'
                  </button>
                ))}
                <input type="number" className="adm-input" min="1" max="90"
                  value={halfDuration} onChange={e => { setHalfDuration(parseInt(e.target.value) || 30); setHalfDirty(true); }}
                  style={{ width: 64 }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '6px 0 0' }}>
                Totale: {halfDuration * 2}' + recupero
              </p>
            </div>
            {matchSaved && <div style={{ fontSize: 13, color: 'var(--brand-green)' }}>Salvato ✓</div>}
            <button className="adm-btn adm-btn-sm" type="button" onClick={() => {
              onSave({ ...data, match_settings: { ...(data.match_settings || {}), half_duration: halfDuration } }, 'Impostazioni partita salvate');
              setHalfDirty(false);
              setMatchSaved(true);
              setTimeout(() => setMatchSaved(false), 2000);
            }}>Salva</button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 8 }}>
        <a href="index.html" style={{ color: 'var(--brand-green)', fontSize: 14 }}>← Vai al sito pubblico</a>
      </div>

      {confirmDeleteCategory && (
        <Confirm
          msg={`Eliminare "${confirmDeleteCategory.name}"? Rimuove gironi, partite e iscrizioni collegate.`}
          onOk={() => deleteCategory(confirmDeleteCategory.editionId, confirmDeleteCategory.categoryId)}
          onCancel={() => setConfirmDeleteCategory(null)}
        />
      )}
    </div>
  );
}
