import { useState, useEffect } from 'react';
import { rmLoadData, rmAdminLogin } from '../data.js';

export function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
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
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} className="adm-input" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" required style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }} aria-label={showPass ? 'Nascondi password' : 'Mostra password'}>
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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
