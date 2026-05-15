import { useState, useEffect } from 'react';
import { rmAdminUpdateCredentials, rmSaveData, RM_STORAGE_KEY, rmMigrateDataToRelational } from '../../data.js';
import { isAdminSessionError, Confirm } from '../shared.jsx';

export function SettingsSection({ data, onSave, adminUser, onUserChange, editionId, tournamentId }) {
  const [user, setUser] = useState(adminUser?.username || '');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);

  useEffect(() => {
    setUser(adminUser?.username || '');
  }, [adminUser?.username]);

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
