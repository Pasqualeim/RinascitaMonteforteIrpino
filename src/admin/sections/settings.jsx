import { useState, useEffect } from 'react';
import { rmAdminUpdateCredentials, rmSaveData, RM_STORAGE_KEY, rmMigrateDataToRelational, rmGetAllEditions, rmAdminUpdateEdition, rmAdminCreateEdition, rmAdminGetTournaments, rmAdminCreateTournament } from '../../data.js';
import { isAdminSessionError, Confirm } from '../shared.jsx';

export function SettingsSection({ data, onSave, adminUser, onUserChange, editionId, tournamentId }) {
  const [user, setUser] = useState(adminUser?.username || '');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);
  const [editions, setEditions] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [editionStatusMsg, setEditionStatusMsg] = useState('');
  const [showNewEdition, setShowNewEdition] = useState(false);
  const [newEdition, setNewEdition] = useState({ name: '', slug: '', year: new Date().getFullYear() + 1, edition_number: '', status: 'upcoming', tournament_id: '' });
  const [showNewTournament, setShowNewTournament] = useState(false);
  const [newTournament, setNewTournament] = useState({ name: '', slug: '', description: '', location: '' });

  useEffect(() => { setUser(adminUser?.username || ''); }, [adminUser?.username]);

  useEffect(() => {
    setEditionsLoading(true);
    Promise.all([rmGetAllEditions(), rmAdminGetTournaments().catch(() => ({ data: [] }))])
      .then(([eds, tourRes]) => {
        setEditions(eds);
        setTournaments(tourRes?.data || []);
        if (tourRes?.data?.[0]?.id) setNewEdition(f => ({ ...f, tournament_id: tourRes.data[0].id }));
      })
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
      const res = await rmAdminCreateEdition({ ...newEdition, year: parseInt(newEdition.year), edition_number: newEdition.edition_number ? parseInt(newEdition.edition_number) : null });
      setEditions(prev => [res.data, ...prev]);
      setShowNewEdition(false);
      setNewEdition(f => ({ ...f, name: '', slug: '', year: f.year + 1 }));
    } catch (e) { setEditionStatusMsg('Errore creazione edizione: ' + (e?.message || '')); }
  }

  async function createTournament(e) {
    e.preventDefault();
    try {
      const res = await rmAdminCreateTournament(newTournament);
      setTournaments(prev => [...prev, res.data]);
      setNewEdition(f => ({ ...f, tournament_id: res.data.id }));
      setShowNewTournament(false);
      setNewTournament({ name: '', slug: '', description: '', location: '' });
    } catch (e) { setEditionStatusMsg('Errore creazione torneo: ' + (e?.message || '')); }
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

  async function doMigrate() {
    if (!editionId) { setMigrateResult({ error: 'Nessuna edizione attiva trovata. Verifica connessione Supabase.' }); return; }
    setMigrating(true);
    setMigrateResult(null);
    try {
      const results = await rmMigrateDataToRelational(data, editionId, tournamentId);
      setMigrateResult(results);
    } catch (e) {
      setMigrateResult({ error: e?.message || 'Migrazione fallita' });
    } finally {
      setMigrating(false);
    }
  }

  async function doReset() {
    setConfirmingReset(false);
    localStorage.removeItem(RM_STORAGE_KEY);
    try {
      await rmSaveData({}, { requireAdmin: true });
      window.location.reload();
    } catch (error) {
      setMsg(isAdminSessionError(error) ? 'Sessione scaduta. Rientra nel pannello e riprova.' : (error?.message || 'Reset fallito'));
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
      {/* Gestione tornei */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">Tornei</span>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setShowNewTournament(v => !v)}>+ Nuovo torneo</button>
        </div>
        {showNewTournament && (
          <div className="adm-card-body" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <form onSubmit={createTournament} className="adm-form">
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-label">Nome</label>
                  <input className="adm-input" required value={newTournament.name} onChange={e => setNewTournament(f => ({ ...f, name: e.target.value }))} placeholder="Rinascita Monteforte Cup" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Slug</label>
                  <input className="adm-input" required value={newTournament.slug} onChange={e => setNewTournament(f => ({ ...f, slug: e.target.value }))} placeholder="rinascita-monteforte-cup" />
                </div>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Luogo</label>
                <input className="adm-input" value={newTournament.location} onChange={e => setNewTournament(f => ({ ...f, location: e.target.value }))} placeholder="Monteforte Irpino (AV)" />
              </div>
              <div className="adm-form-actions">
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setShowNewTournament(false)}>Annulla</button>
                <button type="submit" className="adm-btn adm-btn-sm">Crea torneo</button>
              </div>
            </form>
          </div>
        )}
        <div style={{ padding: '4px 16px 12px' }}>
          {tournaments.length === 0
            ? <div className="adm-empty" style={{ fontSize: 13 }}>{editionsLoading ? 'Caricamento…' : 'Nessun torneo nel database relazionale'}</div>
            : tournaments.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-1)', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{t.slug}{t.location ? ` · ${t.location}` : ''}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Gestione edizioni */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">Edizioni</span>
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
              <div className="adm-form-group">
                <label className="adm-label">Torneo</label>
                <select className="adm-select" required value={newEdition.tournament_id} onChange={e => setNewEdition(f => ({ ...f, tournament_id: e.target.value }))}>
                  <option value="">-- Seleziona torneo --</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
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
                  <input className="adm-input" required value={newEdition.name} onChange={e => setNewEdition(f => ({ ...f, name: e.target.value }))} placeholder="Cup 2027 · 4ª Edizione" />
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
        <div style={{ padding: '4px 16px 12px' }}>
          {editions.length === 0
            ? <div className="adm-empty" style={{ fontSize: 13 }}>{editionsLoading ? 'Caricamento…' : 'Nessuna edizione nel database relazionale'}</div>
            : editions.map(e => {
              const STATUS_LABELS = { upcoming: 'In programma', active: '🔴 Attiva', completed: 'Completata', archived: 'Archiviata' };
              const STATUS_OPTS = ['upcoming', 'active', 'completed', 'archived'];
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-1)', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{e.tournaments?.name} · {e.slug}</div>
                  </div>
                  <select
                    className="adm-select"
                    style={{ fontSize: 12, padding: '4px 8px', width: 140 }}
                    value={e.status}
                    onChange={ev => setEditionStatus(e, ev.target.value)}
                  >
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              );
            })
          }
        </div>
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header"><span className="adm-card-title">Migrazione database</span></div>
        <div className="adm-card-body">
          <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 8 }}>
            Copia tutti i dati attuali (gironi, squadre, partite, marcatori, ecc.) nel nuovo database relazionale.
            {editionId
              ? <span style={{ color: 'var(--brand-green)', display: 'block', marginTop: 4 }}>✓ Edizione 2026 rilevata</span>
              : <span style={{ color: '#FF3D3D', display: 'block', marginTop: 4 }}>✗ Nessuna edizione attiva trovata</span>
            }
          </p>
          {migrateResult && !migrateResult.error && (
            <div style={{ fontSize: 12, color: 'var(--brand-green)', marginBottom: 10, lineHeight: 1.7 }}>
              ✓ Gironi: {migrateResult.groups} · Squadre: {migrateResult.teams} · Partite: {migrateResult.matches} · Marcatori: {migrateResult.scorers} · News: {migrateResult.news} · Sponsor: {migrateResult.sponsors}
              {migrateResult.errors?.length > 0 && (
                <div style={{ color: '#F5C518', marginTop: 4 }}>
                  {migrateResult.errors.length} errori: {migrateResult.errors.slice(0, 3).join('; ')}
                </div>
              )}
            </div>
          )}
          {migrateResult?.error && (
            <div style={{ fontSize: 12, color: '#FF3D3D', marginBottom: 10 }}>{migrateResult.error}</div>
          )}
          <button
            className="adm-btn adm-btn-sm"
            onClick={doMigrate}
            disabled={migrating || !editionId}
          >
            {migrating ? 'Migrazione in corso…' : 'Migra al nuovo database'}
          </button>
        </div>
      </div>
      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title">Dati sito</span></div>
        <div className="adm-card-body">
          <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14 }}>Ripristina tutti i dati (classifica, partite, avvisi, ecc.) ai valori predefiniti. L'operazione è irreversibile.</p>
          <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmingReset(true)}>Ripristina dati iniziali</button>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <a href="index.html" style={{ color: 'var(--brand-green)', fontSize: 14 }}>← Vai al sito pubblico</a>
      </div>
      {confirmingReset && (
        <Confirm
          msg="Ripristinare tutti i dati ai valori iniziali? Questa operazione non può essere annullata."
          onOk={doReset}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}
