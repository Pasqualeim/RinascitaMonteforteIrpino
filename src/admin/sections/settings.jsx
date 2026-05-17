import { useState, useEffect } from 'react';
import { rmAdminUpdateCredentials, rmGetAllEditions, rmAdminUpdateEdition, rmAdminCreateEdition, rmAdminCreateTournamentCategory, rmAdminUpdateTournamentCategory, rmAdminDeleteTournamentCategory } from '../../data.js';
import { isAdminSessionError, Confirm } from '../shared.jsx';

export function SettingsSection({ data, onSave, adminUser, onUserChange, editionId, tournamentId }) {
  const [user, setUser] = useState(adminUser?.username || '');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [editions, setEditions] = useState([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [editionStatusMsg, setEditionStatusMsg] = useState('');
  const [showNewEdition, setShowNewEdition] = useState(false);
  const [newEdition, setNewEdition] = useState({ name: '', slug: '', year: new Date().getFullYear() + 1, edition_number: '', status: 'upcoming' });
  const [showNewCategory, setShowNewCategory] = useState(null); // edition_id to add category to
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', prize_first: '', prize_second: '', prize_third: '' });
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null); // { editionId, categoryId, name }

  useEffect(() => { setUser(adminUser?.username || ''); }, [adminUser?.username]);

  useEffect(() => {
    setEditionsLoading(true);
    rmGetAllEditions()
      .then(eds => setEditions(eds))
      .finally(() => setEditionsLoading(false));
  }, []);

  async function setEditionStatus(edition, status) {
    setEditionStatusMsg('');
    try {
      await rmAdminUpdateEdition(edition.id, { status });
      setEditions(prev => prev.map(e => e.id === edition.id ? { ...e, status } : e));
      setEditionStatusMsg(`${edition.name} → ${status}`);
    } catch (e) { setEditionStatusMsg('Errore: ' + (e?.message || 'fallito')); }
  }

  async function createEdition(e) {
    e.preventDefault();
    try {
      const res = await rmAdminCreateEdition({
        ...newEdition,
        year: parseInt(newEdition.year),
        edition_number: newEdition.edition_number ? parseInt(newEdition.edition_number) : null,
      });
      setEditions(prev => [res.data, ...prev]);
      setShowNewEdition(false);
      setNewEdition(f => ({ ...f, name: '', slug: '', year: f.year + 1 }));
    } catch (e) { setEditionStatusMsg('Errore creazione edizione: ' + (e?.message || '')); }
  }

  async function createCategory(e) {
    e.preventDefault();
    if (!showNewCategory) return;
    try {
      const res = await rmAdminCreateTournamentCategory({
        edition_id: showNewCategory,
        name: newCategory.name,
        slug: newCategory.slug,
        prize_first: newCategory.prize_first ? parseInt(newCategory.prize_first) : null,
        prize_second: newCategory.prize_second ? parseInt(newCategory.prize_second) : null,
        prize_third: newCategory.prize_third ? parseInt(newCategory.prize_third) : null,
      });
      setEditions(prev => prev.map(ed =>
        ed.id === showNewCategory
          ? { ...ed, tournaments: [...(ed.tournaments || []), res.data] }
          : ed
      ));
      setShowNewCategory(null);
      setNewCategory({ name: '', slug: '', prize_first: '', prize_second: '', prize_third: '' });
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
          <span className="adm-card-title">Edizioni & Categorie</span>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setShowNewEdition(v => !v)}>+ Nuova edizione</button>
        </div>
        {editionStatusMsg && (
          <div style={{ padding: '6px 16px', fontSize: 12, color: editionStatusMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>
            {editionStatusMsg}
          </div>
        )}

        {showNewEdition && (
          <div className="adm-card-body" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <form onSubmit={createEdition} className="adm-form">
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-label">Anno</label>
                  <input type="number" className="adm-input" required value={newEdition.year} onChange={e => setNewEdition(f => ({ ...f, year: e.target.value }))} />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">N° edizione</label>
                  <input type="number" className="adm-input" value={newEdition.edition_number} onChange={e => setNewEdition(f => ({ ...f, edition_number: e.target.value }))} placeholder="es. 4" />
                </div>
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-label">Nome</label>
                  <input className="adm-input" required value={newEdition.name} onChange={e => setNewEdition(f => ({ ...f, name: e.target.value }))} placeholder="Rinascita Cup 2027" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Slug</label>
                  <input className="adm-input" required value={newEdition.slug} onChange={e => setNewEdition(f => ({ ...f, slug: e.target.value }))} placeholder="cup-2027" />
                </div>
              </div>
              <div className="adm-form-actions">
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setShowNewEdition(false)}>Annulla</button>
                <button type="submit" className="adm-btn adm-btn-sm">Crea edizione</button>
              </div>
            </form>
          </div>
        )}

        {showNewCategory && (
          <div className="adm-card-body" style={{ borderBottom: '1px solid var(--border-1)', background: 'rgba(0,230,118,0.03)' }}>
            <div className="adm-label" style={{ marginBottom: 8 }}>Nuova categoria nell'edizione</div>
            <form onSubmit={createCategory} className="adm-form">
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-label">Nome</label>
                  <input className="adm-input" required value={newCategory.name} onChange={e => setNewCategory(f => ({ ...f, name: e.target.value }))} placeholder="Senior, Over 40, Junior…" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Slug</label>
                  <input className="adm-input" required value={newCategory.slug} onChange={e => setNewCategory(f => ({ ...f, slug: e.target.value }))} placeholder="senior, over40, junior…" />
                </div>
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-label">1° premio (€)</label>
                  <input type="number" className="adm-input" value={newCategory.prize_first} onChange={e => setNewCategory(f => ({ ...f, prize_first: e.target.value }))} placeholder="1000" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">2° (€)</label>
                  <input type="number" className="adm-input" value={newCategory.prize_second} onChange={e => setNewCategory(f => ({ ...f, prize_second: e.target.value }))} placeholder="400" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">3° (€)</label>
                  <input type="number" className="adm-input" value={newCategory.prize_third} onChange={e => setNewCategory(f => ({ ...f, prize_third: e.target.value }))} placeholder="250" />
                </div>
              </div>
              <div className="adm-form-actions">
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setShowNewCategory(null)}>Annulla</button>
                <button type="submit" className="adm-btn adm-btn-sm">Aggiungi categoria</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ padding: '4px 16px 12px' }}>
          {editions.length === 0
            ? <div className="adm-empty" style={{ fontSize: 13 }}>{editionsLoading ? 'Caricamento…' : 'Nessuna edizione nel database relazionale'}</div>
            : editions.map(e => {
              const STATUS_LABELS = { upcoming: 'In programma', active: '🔴 Attiva', completed: 'Completata', archived: 'Archiviata' };
              const STATUS_OPTS = ['upcoming', 'active', 'completed', 'archived'];
              const cats = e.tournaments || [];
              return (
                <div key={e.id} style={{ borderBottom: '1px solid var(--border-1)', paddingBottom: 12, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{e.slug}</div>
                    </div>
                    <select className="adm-select" style={{ fontSize: 12, padding: '4px 8px', width: 140 }} value={e.status}
                      onChange={ev => setEditionStatus(e, ev.target.value)}>
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                  {/* Categorie (tornei) dentro questa edizione */}
                  <div style={{ paddingLeft: 12 }}>
                    {cats.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ fontSize: 12, color: 'var(--brand-green)', flex: 1 }}>
                          {t.name}
                          <span style={{ color: 'var(--fg-3)', marginLeft: 6 }}>{t.slug}</span>
                        </span>
                        <button onClick={() => setConfirmDeleteCategory({ editionId: e.id, categoryId: t.id, name: t.name })}
                          style={{ background: 'transparent', border: 0, color: '#FF3D3D', cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </div>
                    ))}
                    <button className="adm-btn adm-btn-ghost adm-btn-sm"
                      style={{ fontSize: 11, marginTop: 4 }}
                      onClick={() => { setShowNewCategory(e.id); setShowNewEdition(false); }}>
                      + Aggiungi categoria
                    </button>
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
