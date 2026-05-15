import { useState, useEffect } from 'react';
import { rmLoadData, rmAdminLogin } from '../data.js';

export function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    rmLoadData();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const session = await rmAdminLogin(user.trim(), pass);
      onLogin(session?.user || null);
    } catch (error) {
      setErr(error?.message || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-login">
      <div className="adm-login-box">
        <div className="adm-login-logo">
          <img src="assets/logo-rinascita-monteforte.jpg" alt="Rinascita" />
          <div>
            <div className="adm-login-logo-text">Rinascita</div>
            <div className="adm-login-logo-sub">Area Staff</div>
          </div>
        </div>
        <h1 className="adm-login-title">Accesso</h1>
        <p className="adm-login-sub">Riservato allo staff. Gli utenti possono solo visualizzare il sito pubblico.</p>
        {err && <div className="adm-login-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="adm-field">
            <label className="adm-label">Utente</label>
            <input className="adm-input" value={user} onChange={e => setUser(e.target.value)} placeholder="Username" autoComplete="username" required />
          </div>
          <div className="adm-field">
            <label className="adm-label">Password</label>
            <input type="password" className="adm-input" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          </div>
          <button className="adm-btn" type="submit" disabled={loading}>{loading ? 'Accesso...' : 'Entra'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--fg-3)' }}>
          <a href="index.html" style={{ color: 'var(--brand-green)' }}>← Torna al sito pubblico</a>
        </p>
      </div>
    </div>
  );
}
