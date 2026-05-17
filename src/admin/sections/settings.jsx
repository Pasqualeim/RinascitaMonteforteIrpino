import { useState, useEffect } from 'react';
import { rmAdminUpdateCredentials, rmGetAllEditions, rmAdminCreateTournamentCategory, rmAdminUpdateTournamentCategory, rmAdminDeleteTournamentCategory } from '../../data.js';
import { isAdminSessionError, Confirm } from '../shared.jsx';

function PrizesEditor({ prizes, onChange }) {
  function add() { onChange([...prizes, { label: '', amount: '' }]); }
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
        <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>Nessun premio. Premi + Premio per aggiungerne.</p>
      )}
    </div>
  );
}

export function SettingsSection({ data, onSave, adminUser, onUserChange, editionId, tournamentId }) {
  const [user, setUser] = useState(adminUser?.username || '');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [editions, setEditions] = useState([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [editionStatusMsg, setEditionStatusMsg] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPrizes, setNewCategoryPrizes] = useState([]);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null); // { id, name, prizes: [{label,amount}] }

  useEffect(() => { setUser(adminUser?.username || ''); }, [adminUser?.username]);

  useEffect(() => {
    setEditionsLoading(true);
    rmGetAllEditions()
      .then(eds => setEditions(eds))
      .finally(() => setEditionsLoading(false));
  }, []);

  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
  }

  async function createCategory(e) {
    e.preventDefault();
    if (!showNewCategory || !newCategoryName.trim()) return;
    try {
      const prizes = newCategoryPrizes.filter(p => p.label || p.amount);
      const res = await rmAdminCreateTournamentCategory({
        edition_id: showNewCategory,
        name: newCategoryName.trim(),
        slug: slugify(newCategoryName),
        prizes,
        prize_first: prizes[0]?.amount ? parseInt(prizes[0].amount) : null,
        prize_second: prizes[1]?.amount ? parseInt(prizes[1].amount) : null,
        prize_third: prizes[2]?.amount ? parseInt(prizes[2].amount) : null,
      });
      setEditions(prev => prev.map(ed =>
        ed.id === showNewCategory
          ? { ...ed, tournaments: [...(ed.tournaments || []), res.data] }
          : ed
      ));
      setShowNewCategory(null);
      setNewCategoryName('');
      setNewCategoryPrizes([]);
    } catch (e) { setEditionStatusMsg('Errore creazione categoria: ' + (e?.message || '')); }
  }

  async function deleteCategory(edId, categoryId) {
    try {
      await rmAdminDeleteTournamentCategory(categoryId);
      setEditions(prev => prev.map(ed =>
        ed.id === edId
          ? { ...ed, tournaments: (ed.tournaments || []).filter(t => t.id !== categoryId) }
          : ed
      ));
    } catch (e) { setEditionStatusMsg('Errore eliminazione categoria: ' + (e?.message || '')); }
    setConfirmDeleteCategory(null);
  }

  async function saveCategory(e) {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      const prizes = (editingCategory.prizes || []).filter(p => p.label || p.amount);
      await rmAdminUpdateTournamentCategory(editingCategory.id, {
        name: editingCategory.name,
        slug: slugify(editingCategory.name),
        prizes,
        prize_first: prizes[0]?.amount ? parseInt(prizes[0].amount) : null,
        prize_second: prizes[1]?.amount ? parseInt(prizes[1].amount) : null,
        prize_third: prizes[2]?.amount ? parseInt(prizes[2].amount) : null,
      });
      setEditions(prev => prev.map(ed => ({
        ...ed,
        tournaments: (ed.tournaments || []).map(t =>
          t.id === editingCategory.id ? { ...t, ...editingCategory, prizes } : t
        ),
      })));
      setEditionStatusMsg('Categoria aggiornata');
      setEditingCategory(null);
    } catch (e) { setEditionStatusMsg('Errore aggiornamento categoria: ' + (e?.message || '')); }
  }

  async function save(e) {
    e.preventDefault();
    if (pass && pass !== confirm) { setMsg('Le password non coincidono'); return; }
    try {
      const payload = await rmAdminUpdateCredentials({
        username: user.trim(),
        password: pass || undefined,
      });
      setPass('');
      setConfirm('');
      setMsg('Credenziali staff aggiornate');
      if (onUserChange) onUserChange(payload.user);
    } catch (error) {
      setMsg(isAdminSessionError(error) ? 'Sessione scaduta. Rientra nel pannello e riprova.' : (error?.message || 'Aggiornamento credenziali fallito'));
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Impostazioni</h2>
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header"><span className="adm-card-title">Credenziali staff</span></div>
        <div className="adm-card-body">
          <form onSubmit={save} className="adm-form">
            <div className="adm-form-group">
              <label className="adm-label">Username</label>
              <input className="adm-input" value={user} onChange={e => setUser(e.target.value)} required />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Nuova Password (lascia vuoto per non cambiare)</label>
              <input type="password" className="adm-input" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
            </div>
            {pass && (
              <div className="adm-form-group">
                <label className="adm-label">Conferma Password</label>
                <input type="password" className="adm-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
              </div>
            )}
            {msg && <div style={{ color: /non|fallit|errore|cort/i.test(msg) ? '#FF3D3D' : 'var(--brand-green)', fontSize: 13 }}>{msg}</div>}
            <button className="adm-btn adm-btn-sm" type="submit">Salva credenziali</button>
          </form>
        </div>
      </div>
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header"><span className="adm-card-title">Sessione admin</span></div>
        <div className="adm-card-body">
          <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14 }}>
            Login unico attivo. Questo account staff controlla sia l'accesso al pannello sia i salvataggi sul database.
          </p>
          <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
            Utente corrente: <strong style={{ color: 'var(--fg-1)' }}>{adminUser?.username || 'staff'}</strong>
          </div>
        </div>
      </div>
      {/* Gestione edizioni + categorie */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">Categorie di Torneo</span>
          {editions.length > 0 && (
            <button className="adm-btn adm-btn-sm" onClick={() => {
              const targetId = editions[0]?.id;
              if (targetId) { setShowNewCategory(targetId); setEditingCategory(null); }
            }}>+ Categoria</button>
          )}
        </div>
        {editionStatusMsg && (
          <div style={{ padding: '6px 16px', fontSize: 12, color: editionStatusMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>
            {editionStatusMsg}
          </div>
        )}

        {showNewCategory && (
          <div className="adm-card-body" style={{ borderBottom: '1px solid var(--border-1)', background: 'rgba(0,230,118,0.03)' }}>
            <form onSubmit={createCategory} className="adm-form">
              <div className="adm-form-group">
                <label className="adm-label">Nome categoria</label>
                <input className="adm-input" required value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)} placeholder="Senior, Over 40, Junior…" autoFocus />
              </div>
              <PrizesEditor prizes={newCategoryPrizes} onChange={setNewCategoryPrizes} />
              <div className="adm-form-actions">
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setShowNewCategory(null); setNewCategoryName(''); setNewCategoryPrizes([]); }}>Annulla</button>
                <button type="submit" className="adm-btn adm-btn-sm">Aggiungi categoria</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ padding: '4px 16px 12px' }}>
          {editions.length === 0
            ? <div className="adm-empty" style={{ fontSize: 13 }}>{editionsLoading ? 'Caricamento…' : 'Nessuna edizione nel database relazionale'}</div>
            : editions.map(e => {
              const cats = e.tournaments || [];
              return (
                <div key={e.id} style={{ borderBottom: '1px solid var(--border-1)', paddingBottom: 12, marginBottom: 4 }}>
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{e.year}</div>
                  </div>
                  {/* Categorie (tornei) dentro questa edizione */}
                  <div style={{ paddingLeft: 12 }}>
                    {cats.map(t => (
                      <div key={t.id}>
                        {editingCategory?.id === t.id ? (
                          <form onSubmit={saveCategory} className="adm-form" style={{ background: 'rgba(0,230,118,0.05)', borderRadius: 8, padding: 10, marginBottom: 4 }}>
                            <div className="adm-form-group">
                              <label className="adm-label">Nome categoria</label>
                              <input className="adm-input" required value={editingCategory.name}
                                onChange={ev => setEditingCategory(f => ({ ...f, name: ev.target.value }))} autoFocus />
                            </div>
                            <PrizesEditor prizes={editingCategory.prizes || []} onChange={p => setEditingCategory(f => ({ ...f, prizes: p }))} />
                            <div className="adm-form-actions">
                              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditingCategory(null)}>Annulla</button>
                              <button type="submit" className="adm-btn adm-btn-sm">Salva</button>
                            </div>
                          </form>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-1)' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, color: 'var(--brand-green)', fontWeight: 600 }}>{t.name}</span>
                              {(t.prizes?.length > 0) && t.prizes.map((p, i) => (
                                <span key={i} style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 8 }}>🏆 {p.label && `${p.label} `}{p.amount}€</span>
                              ))}
                              {(!t.prizes?.length && (t.prize_first > 0)) && (
                                <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 8 }}>🏆 {t.prize_first}€</span>
                              )}
                            </div>
                            <button
                              onClick={() => setEditingCategory({ id: t.id, name: t.name, prizes: t.prizes?.length ? t.prizes.map(p => ({ label: p.label || '', amount: p.amount || '' })) : [] })}
                              className="adm-btn adm-btn-ghost adm-btn-sm"
                              title="Modifica">✎</button>
                            <button onClick={() => setConfirmDeleteCategory({ editionId: e.id, categoryId: t.id, name: t.name })}
                              className="adm-btn adm-btn-danger adm-btn-sm">✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <a href="index.html" style={{ color: 'var(--brand-green)', fontSize: 14 }}>← Vai al sito pubblico</a>
      </div>
      {confirmDeleteCategory && (
        <Confirm
          msg={`Eliminare la categoria "${confirmDeleteCategory.name}"? Questa operazione è irreversibile e rimuove gironi, partite e iscrizioni collegate.`}
          onOk={() => deleteCategory(confirmDeleteCategory.editionId, confirmDeleteCategory.categoryId)}
          onCancel={() => setConfirmDeleteCategory(null)}
        />
      )}
    </div>
  );
}
