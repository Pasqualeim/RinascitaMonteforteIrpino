/* global React, window, rmLoadData, rmSaveData, rmGetAllData, DEFAULT_TEAMS, DEFAULT_GROUPS,
   DEFAULT_NATIONS_2026, DEFAULT_STANDINGS_GROUPS,
   DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_MATCHES_GIORNATA,
   DEFAULT_SCORERS, DEFAULT_NEWS, DEFAULT_EVENTS, DEFAULT_HONORS,
   DEFAULT_SPONSORS, DEFAULT_STRIP_ITEMS */

const { useState, useEffect, useCallback, useMemo } = React;

// ── Auth ──────────────────────────────────────────────────────────────────
const AUTH_KEY = 'rm_admin_auth_v2';
const CREDS_KEY = 'rm_admin_creds_v2';

function getStoredCreds() {
  const data = rmGetAllData();
  return data._auth || { username: 'Admin', password: 'pasale98' };
}

function checkLogin(user, pass) {
  const creds = getStoredCreds();
  return user === creds.username && pass === creds.password;
}

function isLoggedIn() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

// ── Icons ─────────────────────────────────────────────────────────────────
const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const EditIcon = (p) => <Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>;
const TrashIcon = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></Icon>;
const HomeIcon = (p) => <Icon {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>;
const ZapIcon = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const GridIcon = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>;
const BellIcon = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>;
const MenuIcon = (p) => <Icon {...p}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></Icon>;
const UsersIcon = (p) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
const CalIcon = (p) => <Icon {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></Icon>;
const BallIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></Icon>;
const StarIcon = (p) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>;
const TrophyIcon = (p) => <Icon {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></Icon>;
const NewspaperIcon = (p) => <Icon {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></Icon>;

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2200);
    return () => clearTimeout(id);
  }, [onDone]);
  return <div className="adm-toast">{msg}</div>;
}

// ── Login Screen ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    // Prova a sincronizzare i dati remoti prima del login
    rmLoadData();
  }, []);

  function submit(e) {
    e.preventDefault();
    if (checkLogin(user.trim(), pass)) {
      sessionStorage.setItem(AUTH_KEY, '1');
      onLogin();
    } else {
      setErr('Credenziali non valide');
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
          <button className="adm-btn" type="submit">Entra</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--fg-3)' }}>
          <a href="index.html" style={{ color: 'var(--brand-green)' }}>← Torna al sito pubblico</a>
        </p>
      </div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────
function Confirm({ msg, onOk, onCancel }) {
  return (
    <div className="adm-overlay" onClick={onCancel}>
      <div className="adm-modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <h3 className="adm-modal-title" style={{ fontSize: 18 }}>Conferma</h3>
        <p style={{ color: 'var(--fg-2)', fontSize: 14, marginBottom: 20 }}>{msg}</p>
        <div className="adm-form-actions">
          <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={onCancel}>Annulla</button>
          <button className="adm-btn adm-btn-danger adm-btn-sm" style={{ flex: 1 }} onClick={onOk}>Elimina</button>
        </div>
      </div>
    </div>
  );
}

// ── Live Section ──────────────────────────────────────────────────────────
function LiveSection({ data, onSave }) {
  const [lm, setLm] = useState(() => JSON.parse(JSON.stringify(data.live_match)));
  const [teams] = useState(data.teams || DEFAULT_TEAMS);
  const [addingEvent, setAddingEvent] = useState(false);
  const [evPlayer, setEvPlayer] = useState('');
  const [evTeam, setEvTeam] = useState(lm.home?.short || '');
  const [evNote, setEvNote] = useState('');
  const [evType, setEvType] = useState('goal');

  function save(updatedLm, updatedScorers) {
    const newLm = updatedLm || lm;
    const newData = { ...data, live_match: newLm };
    if (updatedScorers) newData.scorers = updatedScorers;
    onSave(newData, updatedScorers ? 'Partita e marcatori aggiornati' : 'Partita live aggiornata');
    setLm({ ...newLm });
  }

  function updateScorer(playerName, teamShort, teamName, delta) {
    let scorers = [...(data.scorers || [])];
    const idx = scorers.findIndex(s => s.name === playerName && (s.short === teamShort || s.team === teamName));
    
    if (idx >= 0) {
      scorers[idx] = { ...scorers[idx], goals: Math.max(0, (scorers[idx].goals || 0) + delta) };
    } else if (delta > 0) {
      const t = teams.find(x => x.short === teamShort || x.name === teamName);
      scorers.push({
        name: playerName,
        team: teamName,
        short: teamShort || t?.short || '',
        color: t?.color || '#00E676',
        goals: delta
      });
    }
    return scorers.sort((a, b) => (b.goals || 0) - (a.goals || 0));
  }

  function toggleActive() {
    const updated = { ...lm, active: !lm.active };
    setLm(updated);
    save(updated);
  }

  function setScore(side, delta) {
    const updated = { ...lm, [side]: Math.max(0, (lm[side] || 0) + delta) };
    setLm(updated);
    save(updated);
  }

  function setMinute(delta) {
    const updated = { ...lm, minute: Math.max(0, Math.min(120, (lm.minute || 0) + delta)) };
    setLm(updated);
    save(updated);
  }

  function addEvent(type) {
    setEvType(type);
    setAddingEvent(true);
  }

  function confirmEvent() {
    if (!evPlayer.trim()) return;
    const teamObj = teams.find(t => t.short === evTeam) || lm.home;
    const newEvent = { min: lm.minute, type: evType, player: evPlayer.trim(), team: teamObj?.name || '', note: evNote.trim() || undefined, _ts: evTeam };
    const events = [...(lm.events || []), newEvent].sort((a, b) => a.min - b.min);
    const updatedLm = { ...lm, events };
    
    let updatedScorers = null;
    if (evType === 'goal' && evPlayer !== 'Autogol') {
      updatedScorers = updateScorer(evPlayer.trim(), evTeam, teamObj?.name || '', 1);
    }
    
    setLm(updatedLm);
    save(updatedLm, updatedScorers);
    setAddingEvent(false);
    setEvPlayer('');
    setEvNote('');
  }

  function removeEvent(idx) {
    const ev = lm.events[idx];
    const events = lm.events.filter((_, i) => i !== idx);
    const updatedLm = { ...lm, events };
    
    let updatedScorers = null;
    if (ev.type === 'goal' && ev.player !== 'Autogol') {
      updatedScorers = updateScorer(ev.player, ev._ts || '', ev.team, -1);
    }
    
    setLm(updatedLm);
    save(updatedLm, updatedScorers);
  }

  function setTeam(side, short) {
    const team = teams.find(t => t.short === short);
    if (team) {
      const updated = { ...lm, [side]: team };
      setLm(updated);
      save(updated);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Live</h2>
      <p className="adm-section-sub">Aggiorna la partita in tempo reale. I visitatori vedono i cambiamenti entro 30 secondi.</p>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">Stato partita</span>
          <button className={`adm-btn adm-btn-sm ${lm.active ? 'adm-btn-danger' : 'adm-btn-secondary'}`}
            onClick={toggleActive}>
            {lm.active ? '⏹ Termina diretta' : '▶ Avvia diretta'}
          </button>
        </div>
      </div>

      {lm.active && (
        <div className="adm-live-board">
          {/* Teams selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 8, marginBottom: 16, alignItems: 'end' }}>
            <div style={{ minWidth: 0 }}>
              <div className="adm-label" style={{ marginBottom: 4, textAlign: 'center' }}>Casa</div>
              <select className="adm-select" value={lm.home?.short || ''} onChange={e => setTeam('home', e.target.value)}>
                <option value="">--</option>
                {teams.map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--fg-3)', fontSize: 16, paddingBottom: 12 }}>VS</div>
            <div style={{ minWidth: 0 }}>
              <div className="adm-label" style={{ marginBottom: 4, textAlign: 'center' }}>Ospite</div>
              <select className="adm-select" value={lm.away?.short || ''} onChange={e => setTeam('away', e.target.value)}>
                <option value="">--</option>
                {teams.map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Score */}
          <div className="adm-live-score-row">
            <div className="adm-live-team-box">
              <div className="adm-live-team-short" style={{ color: lm.home?.color }}>{lm.home?.short || 'HOM'}</div>
              <div className="adm-live-team-name">{lm.home?.name || 'Casa'}</div>
            </div>
            <div className="adm-live-score-center">{lm.hs || 0}<i>–</i>{lm.as || 0}</div>
            <div className="adm-live-team-box">
              <div className="adm-live-team-short" style={{ color: lm.away?.color }}>{lm.away?.short || 'AWA'}</div>
              <div className="adm-live-team-name">{lm.away?.name || 'Ospite'}</div>
            </div>
          </div>

          <div className="adm-live-min-badge">
            <button onClick={() => setMinute(-1)} style={{ background: 'transparent', border: 0, color: 'var(--fg-3)', cursor: 'pointer', fontSize: 18 }}>−</button>
            {' '}{lm.minute || 0}'{' '}
            <button onClick={() => setMinute(1)} style={{ background: 'transparent', border: 0, color: 'var(--brand-green)', cursor: 'pointer', fontSize: 18 }}>+</button>
          </div>

          {/* Score buttons */}
          <div className="adm-live-btns">
            <button className="adm-live-goal-btn" onClick={() => setScore('hs', 1)}>
              +1 Gol<span className="sub">{lm.home?.name || 'Casa'}</span>
            </button>
            <button className="adm-live-goal-btn" onClick={() => setScore('as', 1)}>
              +1 Gol<span className="sub">{lm.away?.name || 'Ospite'}</span>
            </button>
            <button className="adm-live-goal-btn adm-btn-ghost" onClick={() => setScore('hs', -1)} style={{ background: 'transparent', border: '1px solid var(--border-1)' }}>
              −1<span className="sub">{lm.home?.short || 'HOM'}</span>
            </button>
            <button className="adm-live-goal-btn adm-btn-ghost" onClick={() => setScore('as', -1)} style={{ background: 'transparent', border: '1px solid var(--border-1)' }}>
              −1<span className="sub">{lm.away?.short || 'AWA'}</span>
            </button>
          </div>

          {/* Event buttons */}
          <div className="adm-label" style={{ marginBottom: 8, marginTop: 4 }}>Aggiungi evento</div>
          <div className="adm-live-event-btns">
            <button className="adm-live-ev-btn" onClick={() => addEvent('goal')}>⚽<span>Gol</span></button>
            <button className="adm-live-ev-btn" onClick={() => addEvent('yellow')}>🟨<span>Giallo</span></button>
            <button className="adm-live-ev-btn" onClick={() => addEvent('red')}>🟥<span>Rosso</span></button>
          </div>

          {/* Events log */}
          {lm.events?.length > 0 && (
            <div className="adm-events-log">
              {lm.events.map((ev, i) => (
                <div key={i} className="adm-ev-row">
                  <span className="min">{ev.min}'</span>
                  <span>{ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : '🟥'}</span>
                  <span style={{ fontSize: 13, color: 'var(--fg-2)' }}><b style={{ color: '#fff' }}>{ev.player}</b> · {ev.team}</span>
                  <button className="adm-ev-del" onClick={() => removeEvent(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add event modal */}
      {addingEvent && (
        <div className="adm-overlay" onClick={() => setAddingEvent(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Aggiungi evento · {evType === 'goal' ? '⚽ Gol' : evType === 'yellow' ? '🟨 Giallo' : '🟥 Rosso'}</h3>
            <div className="adm-form">
              <div className="adm-form-group">
                <label className="adm-label">Squadra</label>
                <select className="adm-select" value={evTeam} onChange={e => { setEvTeam(e.target.value); setEvPlayer(''); }}>
                  {(lm.home || lm.away ? [lm.home, lm.away].filter(Boolean) : teams).map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Giocatore</label>
                {(() => {
                  const tObj = teams.find(t => t.short === evTeam) || (lm.home?.short === evTeam ? lm.home : lm.away);
                  const pList = tObj?.players || [];
                  if (pList.length > 0) {
                    return (
                      <select className="adm-select" value={evPlayer} onChange={e => setEvPlayer(e.target.value)} autoFocus>
                        <option value="">-- Seleziona Giocatore --</option>
                        {pList.map(p => <option key={p.id} value={p.name}>{p.number ? p.number + '. ' : ''}{p.name}</option>)}
                        <option value="Autogol">Autogol</option>
                      </select>
                    );
                  }
                  return <input className="adm-input" value={evPlayer} onChange={e => setEvPlayer(e.target.value)} placeholder="Nome cognome" autoFocus />;
                })()}
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Nota (opz.)</label>
                <input className="adm-input" value={evNote} onChange={e => setEvNote(e.target.value)} placeholder="es. colpo di testa, doppietta..." />
              </div>
              <div className="adm-form-actions">
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setAddingEvent(false)}>Annulla</button>
                <button className="adm-btn adm-btn-sm" onClick={confirmEvent} disabled={!evPlayer.trim()}>Salva evento</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── News Section ──────────────────────────────────────────────────────────
function NewsSection({ data, onSave }) {
  const [news, setNews] = useState(data.news || DEFAULT_NEWS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const TONE_OPTS = [
    { value: '', label: 'Normale' },
    { value: 'alert', label: 'Alert (rosso)' },
    { value: 'warn', label: 'Attenzione (giallo)' },
  ];
  const CAT_OPTS = ['News', 'Avviso', 'Regolamento', 'Eventi', 'Sponsor'];

  function saveAll(list) {
    setNews(list);
    onSave({ ...data, news: list }, 'Avvisi aggiornati');
  }

  function saveItem(item) {
    const exists = news.find(n => n.id === item.id);
    const updated = exists ? news.map(n => n.id === item.id ? item : n) : [item, ...news];
    saveAll(updated);
    setEditing(null);
  }

  function deleteItem(id) {
    saveAll(news.filter(n => n.id !== id));
    setDeleting(null);
  }

  function newItem() {
    setEditing({ id: 'n' + Date.now(), cat: 'News', tone: '', date: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), title: '', body: '', pinned: false });
  }

  return (
    <div>
      <h2 className="adm-section-title">Avvisi & News</h2>
      <p className="adm-section-sub">Gestisci la bacheca pubblica. Gli avvisi in evidenza appaiono in cima.</p>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{news.length} avvisi</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={newItem}>+ Nuovo avviso</button>
        </div>
        {news.length === 0 ? (
          <div className="adm-empty">Nessun avviso. Clicca "Nuovo avviso" per aggiungerne uno.</div>
        ) : (
          news.map(n => (
            <div key={n.id} className="adm-item-row">
              <div className="adm-item-row-body">
                <div className="adm-item-title">{n.pinned ? '📌 ' : ''}{n.title || '(senza titolo)'}</div>
                <div className="adm-item-meta">{n.cat} · {n.date} {n.tone ? `· ${n.tone}` : ''}</div>
              </div>
              <div className="adm-item-actions">
                <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...n })}><EditIcon size={16}/></button>
                <button className="adm-btn-danger adm-btn-icon" onClick={() => setDeleting(n.id)}><TrashIcon size={16}/></button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <NewsForm item={editing} catOpts={CAT_OPTS} toneOpts={TONE_OPTS}
          onSave={saveItem} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <Confirm msg="Eliminare questo avviso?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function NewsForm({ item, catOpts, toneOpts, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <h3 className="adm-modal-title">{item.title ? 'Modifica avviso' : 'Nuovo avviso'}</h3>
        <div className="adm-form">
          <div className="adm-form-row">
            <div className="adm-form-group">
              <label className="adm-label">Categoria</label>
              <select className="adm-select" value={form.cat} onChange={e => set('cat', e.target.value)}>
                {catOpts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Tono</label>
              <select className="adm-select" value={form.tone || ''} onChange={e => set('tone', e.target.value)}>
                {toneOpts.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="adm-form-group">
            <label className="adm-label">Data</label>
            <input className="adm-input" value={form.date} onChange={e => set('date', e.target.value)} placeholder="es. 29 Giu · 14:20" />
          </div>
          <div className="adm-form-group">
            <label className="adm-label">Titolo</label>
            <input className="adm-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titolo dell'avviso" required />
          </div>
          <div className="adm-form-group">
            <label className="adm-label">Testo</label>
            <textarea className="adm-textarea" value={form.body} onChange={e => set('body', e.target.value)} placeholder="Descrizione..." rows={4} />
          </div>
          <label className="adm-checkbox-row">
            <input type="checkbox" checked={!!form.pinned} onChange={e => set('pinned', e.target.checked)} />
            In evidenza (📌)
          </label>
          <div className="adm-form-actions">
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
            <button className="adm-btn adm-btn-sm" onClick={() => onSave(form)} disabled={!form.title.trim()}>Salva</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compute Standings per girone ─────────────────────────────────────────
function computeStandings(giornata, teams, groups) {
  const teamGroup = {};
  for (const t of (teams || [])) {
    if (t.group) teamGroup[t.short] = t.group;
  }

  const gMap = {};
  for (const g of (groups || [])) {
    gMap[g.id] = { id: g.id, name: g.name, color: g.color || '#00E676', rows: {} };
  }

  for (const t of (teams || [])) {
    if (!t.group || !gMap[t.group]) continue;
    gMap[t.group].rows[t.short] = {
      short: t.short, name: t.name, color: t.color, flag: t.flag || '',
      g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0, form: []
    };
  }

  const allMatches = (giornata || []).flatMap(g => g.items || []);
  for (const m of allMatches) {
    if (m.status !== 'ft' || m.hs == null || m.as == null || !m.home || !m.away) continue;
    const hg = teamGroup[m.home.short];
    const ag = teamGroup[m.away.short];
    if (!hg || hg !== ag || !gMap[hg]) continue;
    const h = gMap[hg].rows[m.home.short];
    const a = gMap[hg].rows[m.away.short];
    if (!h || !a) continue;

    h.g++; a.g++;
    h.gf += m.hs; h.gs += m.as;
    a.gf += m.as; a.gs += m.hs;

    if (m.hs > m.as) {
      h.v++; h.pt += 3; a.p++;
      h.form = [...h.form.slice(-4), 'W'];
      a.form = [...a.form.slice(-4), 'L'];
    } else if (m.hs < m.as) {
      a.v++; a.pt += 3; h.p++;
      h.form = [...h.form.slice(-4), 'L'];
      a.form = [...a.form.slice(-4), 'W'];
    } else {
      h.n++; h.pt++; a.n++; a.pt++;
      h.form = [...h.form.slice(-4), 'D'];
      a.form = [...a.form.slice(-4), 'D'];
    }
  }

  const sort = arr => arr.sort((a, b) =>
    b.pt - a.pt || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf
  );

  const standings_groups = Object.values(gMap).map(g => ({
    id: g.id, name: g.name, color: g.color,
    rows: sort(Object.values(g.rows)),
  }));

  return { standings_groups, standings_a: [], standings_o40: [], standings_jr: [] };
}

const KNOCKOUT_PRESETS = ['Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];

// ── Matches Section ───────────────────────────────────────────────────────
function MatchesSection({ data, onSave }) {
  const allMatches = useMemo(() => {
    const giornata = data.matches_giornata || DEFAULT_MATCHES_GIORNATA;
    return giornata.flatMap(g => g.items.map(m => ({ ...m, _day: g.day })));
  }, [data.matches_giornata]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState('lista');
  const teams = data.teams || DEFAULT_TEAMS;

  const groups = data.groups || DEFAULT_GROUPS;
  const groupPresets = groups.map(g => g.name);
  const allPresets = [...groupPresets, ...KNOCKOUT_PRESETS];
  const defaultPhase = allPresets[0] || 'Girone A';

  function saveMatch(updated) {
    let giornata = JSON.parse(JSON.stringify(data.matches_giornata || []));

    if (!updated._isNew) {
      for (let g of giornata) {
        const idx = g.items.findIndex(m => m.id === updated.id);
        if (idx >= 0) { g.items.splice(idx, 1); break; }
      }
    } else {
      updated.id = Date.now().toString();
    }

    updated.pitch = 'Campo Sportivo';
    const targetDay = updated._day || defaultPhase;
    delete updated._isNew;
    delete updated._day;

    let g = giornata.find(x => x.day === targetDay);
    if (!g) { g = { day: targetDay, items: [] }; giornata.push(g); }
    g.items.push(updated);
    giornata = giornata.filter(x => x.items.length > 0);

    const matchesToday = giornata.flatMap(x => x.items.filter(m => m.date === 'Oggi' || m.date === updated.date));
    const newStandings = computeStandings(giornata, data.teams, data.groups);
    onSave({ ...data, matches_giornata: giornata, matches_today: matchesToday.slice(0, 5), ...newStandings }, 'Partita e classifica aggiornate');
    setEditing(null);
  }

  function deleteMatch(matchId) {
    let giornata = JSON.parse(JSON.stringify(data.matches_giornata || []));
    for (let g of giornata) {
      g.items = g.items.filter(m => m.id !== matchId);
    }
    giornata = giornata.filter(x => x.items.length > 0);
    const newStandings = computeStandings(giornata, data.teams, data.groups);
    onSave({ ...data, matches_giornata: giornata, ...newStandings }, 'Partita eliminata');
    setDeleting(null);
  }

  const statusLabel = { live: '🔴 Live', ft: '✅ Finale', sch: '⏳ Programmata' };

  function newMatch() {
    setEditing({ _isNew: true, _day: defaultPhase, status: 'sch', home: null, away: null, hs: null, as: null, date: '', time: '' });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Partite</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>Risultati, fasi torneo e tabellone eliminazione.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`adm-btn adm-btn-sm ${view === 'lista' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('lista')}>Lista</button>
          <button className={`adm-btn adm-btn-sm ${view === 'bracket' ? '' : 'adm-btn-ghost'}`} onClick={() => setView('bracket')}>Bracket</button>
          <button className="adm-btn adm-btn-sm" onClick={newMatch}>+ Nuova</button>
        </div>
      </div>

      {view === 'lista' && (
        <div className="adm-card">
          {allMatches.length === 0 ? (
            <div className="adm-empty">Nessuna partita nel calendario.</div>
          ) : (
            allMatches.map(m => (
              <div key={m.id} className="adm-item-row">
                <div className="adm-item-row-body">
                  <div className="adm-item-title">
                    {m.home?.short} {m.hs != null ? `${m.hs}–${m.as}` : 'VS'} {m.away?.short}
                  </div>
                  <div className="adm-item-meta">{m._day} · {m.time} · {statusLabel[m.status]}</div>
                </div>
                <div className="adm-item-actions">
                  <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...m })}><EditIcon size={16}/></button>
                  <button className="adm-btn-danger adm-btn-icon" onClick={() => setDeleting(m.id)}><TrashIcon size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'bracket' && <BracketView giornata={data.matches_giornata} />}

      {editing && <MatchForm match={editing} teams={teams} groups={groups} allPresets={allPresets} defaultPhase={defaultPhase} giornate={data.matches_giornata || []} onSave={saveMatch} onClose={() => setEditing(null)} />}
      {deleting && <Confirm msg="Eliminare questa partita?" onOk={() => deleteMatch(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function MatchForm({ match, teams, groups, allPresets, defaultPhase, giornate, onSave, onClose }) {
  const [form, setForm] = useState({ ...match });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const presets = allPresets && allPresets.length > 0 ? allPresets : KNOCKOUT_PRESETS;

  function submit() {
    if (!form.home || !form.away) { alert("Seleziona entrambe le squadre"); return; }
    onSave(form);
  }

  const groupNames = (groups || []).map(g => g.name);

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <h3 className="adm-modal-title">{match._isNew ? 'Nuova Partita' : 'Modifica partita'}</h3>
        <div className="adm-form">
          <div className="adm-form-group">
            <label className="adm-label">Fase / Giornata</label>
            {groupNames.length > 0 && (
              <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>GIRONI</div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {presets.map((p, i) => {
                const isKnockout = KNOCKOUT_PRESETS.includes(p);
                const isFirstKnockout = isKnockout && (i === 0 || !KNOCKOUT_PRESETS.includes(presets[i - 1]));
                return (
                  <React.Fragment key={p}>
                    {isFirstKnockout && groupNames.length > 0 && (
                      <div style={{ width: '100%', fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em', marginTop: 4 }}>ELIMINAZIONE DIRETTA</div>
                    )}
                    <button type="button"
                      className={`adm-btn adm-btn-sm ${form._day === p ? '' : 'adm-btn-ghost'}`}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => set('_day', p)}>{p}</button>
                  </React.Fragment>
                );
              })}
            </div>
            <input className="adm-input" value={form._day || ''} onChange={e => set('_day', e.target.value)} placeholder="Fase personalizzata..." />
          </div>
          <div className="adm-form-row">
            <div className="adm-form-group">
              <label className="adm-label">Squadra Casa</label>
              <select className="adm-select" value={form.home?.short || ''} onChange={e => { const t = teams.find(x => x.short === e.target.value); if (t) set('home', t); }}>
                <option value="">-- Seleziona --</option>
                {teams.map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Squadra Ospite</label>
              <select className="adm-select" value={form.away?.short || ''} onChange={e => { const t = teams.find(x => x.short === e.target.value); if (t) set('away', t); }}>
                <option value="">-- Seleziona --</option>
                {teams.map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="adm-form-group">
            <label className="adm-label">Stato</label>
            <select className="adm-select" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="sch">Programmata</option>
              <option value="live">Live</option>
              <option value="ft">Terminata</option>
            </select>
          </div>
          {(form.status === 'live' || form.status === 'ft') && (
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Gol Casa</label>
                <input type="number" className="adm-input" value={form.hs ?? ''} onChange={e => set('hs', e.target.value === '' ? null : parseInt(e.target.value))} min="0" />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Gol Ospite</label>
                <input type="number" className="adm-input" value={form.as ?? ''} onChange={e => set('as', e.target.value === '' ? null : parseInt(e.target.value))} min="0" />
              </div>
            </div>
          )}
          {form.status === 'live' && (
            <div className="adm-form-group">
              <label className="adm-label">Minuto</label>
              <input type="number" className="adm-input" value={form.minute || ''} onChange={e => set('minute', parseInt(e.target.value))} min="0" max="120" />
            </div>
          )}
          <div className="adm-form-row">
            <div className="adm-form-group">
              <label className="adm-label">Data</label>
              <input className="adm-input" value={form.date || ''} onChange={e => set('date', e.target.value)} placeholder="es. 15 Lug" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Orario</label>
              <input className="adm-input" value={form.time || ''} onChange={e => set('time', e.target.value)} placeholder="es. 19:00" />
            </div>
          </div>
          <div className="adm-form-actions" style={{ marginTop: 24 }}>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
            <button className="adm-btn adm-btn-sm" onClick={submit}>Salva Partita</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bracket ───────────────────────────────────────────────────────────────
function BracketSlot({ match }) {
  const home  = match?.home?.short || 'TBD';
  const away  = match?.away?.short || 'TBD';
  const score = match?.hs != null  ? `${match.hs}–${match.as}` : 'vs';
  const isLive = match?.status === 'live';
  const isDone = match?.status === 'ft';
  const isTbd  = !match;

  return (
    <div style={{
      background: '#0f0f0f',
      border: `1px solid ${isDone ? 'var(--border-brand)' : 'var(--border-1)'}`,
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 150,
      position: 'relative',
    }}>
      {isLive && <span style={{ position: 'absolute', top: 4, right: 8, fontSize: 10, color: '#FF3D3D' }}>🔴</span>}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.4 }}>
        <div style={{ color: isTbd ? 'var(--fg-3)' : '#fff' }}>{home}</div>
        <div style={{ color: 'var(--fg-3)', fontSize: 13, textAlign: 'center', margin: '1px 0' }}>{score}</div>
        <div style={{ color: isTbd ? 'var(--fg-3)' : '#fff' }}>{away}</div>
      </div>
    </div>
  );
}

function BracketView({ giornata }) {
  const getPhase = name => (giornata || []).find(g => g.day === name)?.items || [];
  const pad = (arr, n) => [...arr, ...Array(Math.max(0, n - arr.length)).fill(null)];

  const q  = pad(getPhase('Quarti di finale'), 4);
  const s  = pad(getPhase('Semifinali'), 2);
  const f  = pad(getPhase('Finale'), 1);
  const t3 = pad(getPhase('Finale 3°/4° posto'), 1);

  const hasAny = q.some(Boolean) || s.some(Boolean) || f.some(Boolean) || t3.some(Boolean);
  if (!hasAny) {
    return <div className="adm-empty">Nessuna partita nelle fasi eliminatorie. Aggiungi partite con fase "Quarti di finale", "Semifinali", "Finale 3°/4° posto" o "Finale".</div>;
  }

  const colHeader = txt => (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--fg-3)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' }}>{txt}</div>
  );
  const connector = () => (
    <div style={{ width: 24, height: 2, background: 'var(--border-brand)', flexShrink: 0, alignSelf: 'center' }} />
  );

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 0, minWidth: 560, padding: '8px 4px', alignItems: 'stretch' }}>

        {/* Quarti */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {colHeader('Quarti di finale')}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 20 }}>
            {q.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <BracketSlot match={m} />
                {connector()}
              </div>
            ))}
          </div>
        </div>

        {/* Semifinali */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {colHeader('Semifinali')}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 20 }}>
            {s.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <BracketSlot match={m} />
                {connector()}
              </div>
            ))}
          </div>
        </div>

        {/* Finali */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {colHeader('Finali')}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--brand-green)', marginBottom: 6, letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>🏆 FINALE</div>
              <BracketSlot match={f[0]} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 6, letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>3°/4° POSTO</div>
              <BracketSlot match={t3[0]} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Standings Section ─────────────────────────────────────────────────────
function StandingsSection({ data }) {
  const standings_groups = data.standings_groups || [];
  const [selIdx, setSelIdx] = useState(0);

  if (standings_groups.length === 0) {
    return (
      <div>
        <h2 className="adm-section-title">Classifica</h2>
        <div className="adm-card">
          <div className="adm-empty">Nessun girone configurato. Crea gironi dalla sezione Gironi e assegna le squadre.</div>
        </div>
      </div>
    );
  }

  const current = standings_groups[selIdx] || standings_groups[0];

  return (
    <div>
      <h2 className="adm-section-title">Classifica</h2>
      <div style={{ padding: '10px 16px', background: 'rgba(0,230,118,0.07)', border: '1px solid var(--border-brand)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--brand-green)' }}>
        ⚡ Calcolata automaticamente dai risultati FT, per partite tra squadre dello stesso girone.
      </div>
      {standings_groups.length > 1 && (
        <div className="rm-tabs" style={{ marginBottom: 16 }}>
          {standings_groups.map((g, i) => (
            <button key={g.id} className={`rm-tab ${selIdx === i ? 'on' : ''}`} onClick={() => setSelIdx(i)}>{g.name}</button>
          ))}
        </div>
      )}
      <div className="adm-card">
        {current.rows.length === 0 ? (
          <div className="adm-empty">Nessuna partita FT per questo girone. I risultati appariranno automaticamente.</div>
        ) : (
          current.rows.map((r, i) => (
            <div key={r.short} className="adm-item-row">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand-green)', width: 28 }}>{i + 1}</div>
              <div className="adm-crest" style={{ borderColor: r.color, color: r.color }}>{r.flag || r.short}</div>
              <div className="adm-item-row-body">
                <div className="adm-item-title">{r.flag ? r.flag + ' ' : ''}{r.name}</div>
                <div className="adm-item-meta">G{r.g} V{r.v} N{r.n} P{r.p} · GF{r.gf} GS{r.gs} · <b style={{ color: 'var(--brand-green)' }}>{r.pt}pt</b></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Scorers Section ───────────────────────────────────────────────────────
function ScorersSection({ data, onSave }) {
  const [scorers, setScorers] = useState(data.scorers || DEFAULT_SCORERS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function saveAll(list) {
    setScorers(list);
    onSave({ ...data, scorers: list }, 'Marcatori aggiornati');
  }

  function saveItem(item) {
    const exists = scorers.find(s => s.name === item.name && s.team === item.team);
    const idx = scorers.findIndex(s => s._idx === item._idx);
    let updated;
    if (idx >= 0) {
      updated = scorers.map((s, i) => i === idx ? item : s);
    } else {
      updated = [...scorers, item];
    }
    updated.sort((a, b) => (b.goals || 0) - (a.goals || 0));
    saveAll(updated);
    setEditing(null);
  }

  return (
    <div>
      <h2 className="adm-section-title">Marcatori</h2>
      <p className="adm-section-sub">Capocannonieri del torneo (ordinati per gol).</p>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{scorers.length} marcatori</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setEditing({ _idx: -1, name: '', team: '', short: '', color: '#00E676', goals: 0 })}>+ Nuovo</button>
        </div>
        {scorers.map((s, i) => (
          <div key={i} className="adm-item-row">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--brand-green)', width: 26 }}>{i + 1}</div>
            <div className="adm-crest" style={{ borderColor: s.color, color: s.color }}>{s.short}</div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{s.name}</div>
              <div className="adm-item-meta">{s.team}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--brand-green)', marginRight: 8 }}>⚽{s.goals}</div>
            <div className="adm-item-actions">
              <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...s, _idx: i })}><EditIcon size={16}/></button>
              <button className="adm-btn-danger adm-btn-icon" onClick={() => setDeleting(i)}><TrashIcon size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">Marcatore</h3>
            <div className="adm-form">
              <div className="adm-form-group">
                <label className="adm-label">Squadra</label>
                <select className="adm-select" value={editing.short || ''} onChange={e => {
                  const t = (data.teams || []).find(x => x.short === e.target.value);
                  if (t) setEditing(f => ({ ...f, short: t.short, team: t.name, color: t.color || '#00E676', name: '' }));
                  else setEditing(f => ({ ...f, short: e.target.value }));
                }}>
                  <option value="">-- Seleziona Squadra --</option>
                  {(data.teams || []).map(t => <option key={t.short} value={t.short}>{t.name}</option>)}
                </select>
              </div>

              <div className="adm-form-group">
                <label className="adm-label">Giocatore</label>
                {(() => {
                  const tObj = (data.teams || []).find(t => t.short === editing.short);
                  const pList = tObj?.players || [];
                  if (pList.length > 0) {
                    return (
                      <select className="adm-select" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))}>
                        <option value="">-- Seleziona Giocatore --</option>
                        {pList.map(p => <option key={p.id} value={p.name}>{p.number ? p.number + '. ' : ''}{p.name}</option>)}
                      </select>
                    );
                  }
                  return <input className="adm-input" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} placeholder="Nome giocatore" />;
                })()}
              </div>

              <div className="adm-form-group">
                <label className="adm-label">Gol</label>
                <input type="number" className="adm-input" value={editing.goals} onChange={e => setEditing(f => ({ ...f, goals: parseInt(e.target.value) || 0 }))} min="0" />
              </div>
              <div className="adm-form-actions" style={{ marginTop: 24 }}>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                <button className="adm-btn adm-btn-sm" onClick={() => saveItem(editing)} disabled={!editing.name || !editing.short}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleting !== null && (
        <Confirm msg={`Eliminare ${scorers[deleting]?.name}?`} onOk={() => { saveAll(scorers.filter((_, i) => i !== deleting)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

// ── Gironi Section ────────────────────────────────────────────────────────
function GironiSection({ data, onSave }) {
  const [groups, setGroups] = useState(data.groups || DEFAULT_GROUPS);
  const [editing, setEditing] = useState(null);

  function saveGroup(g) {
    let updated;
    if (g._isNew) {
      const newG = { id: 'g' + Date.now(), name: g.name, color: g.color || '#00E676' };
      updated = [...groups, newG];
    } else {
      updated = groups.map(x => x.id === g.id ? { id: g.id, name: g.name, color: g.color } : x);
    }
    setGroups(updated);
    const newStandings = computeStandings(data.matches_giornata || [], data.teams, updated);
    onSave({ ...data, groups: updated, ...newStandings }, 'Girone salvato');
    setEditing(null);
  }

  function deleteGroup(id) {
    if (!window.confirm('Eliminare questo girone? Le squadre assegnate perderanno il girone.')) return;
    const updated = groups.filter(g => g.id !== id);
    const updatedTeams = (data.teams || []).map(t => t.group === id ? { ...t, group: '' } : t);
    setGroups(updated);
    const newStandings = computeStandings(data.matches_giornata || [], updatedTeams, updated);
    onSave({ ...data, groups: updated, teams: updatedTeams, ...newStandings }, 'Girone eliminato');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Gironi</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>Crea i gironi e assegna le squadre dalla sezione Squadre.</p>
        </div>
        <button className="adm-btn adm-btn-sm" onClick={() => setEditing({ _isNew: true, name: '', color: '#00E676' })}>+ Nuovo Girone</button>
      </div>

      <div className="adm-card">
        {groups.length === 0 ? (
          <div className="adm-empty">Nessun girone. Crea un girone e poi assegna le squadre dalla sezione Squadre.</div>
        ) : (
          groups.map(g => {
            const count = (data.teams || []).filter(t => t.group === g.id).length;
            return (
              <div key={g.id} className="adm-item-row">
                <div className="adm-crest" style={{ borderColor: g.color || '#00E676', color: g.color || '#00E676', fontSize: 11 }}>
                  {g.name.slice(0, 3).toUpperCase()}
                </div>
                <div className="adm-item-row-body">
                  <div className="adm-item-title">{g.name}</div>
                  <div className="adm-item-meta">{count} squadre assegnate</div>
                </div>
                <div className="adm-item-actions">
                  <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...g })}><EditIcon size={16}/></button>
                  <button className="adm-btn-danger adm-btn-icon" onClick={() => deleteGroup(g.id)}><TrashIcon size={16}/></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <div className="adm-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="adm-modal-title">{editing._isNew ? 'Nuovo Girone' : 'Modifica Girone'}</h3>
            <div className="adm-form">
              <div className="adm-form-group">
                <label className="adm-label">Nome Girone</label>
                <input className="adm-input" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} placeholder="es. Girone A" autoFocus />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Colore identificativo</label>
                <input type="color" className="adm-input" value={editing.color || '#00E676'} onChange={e => setEditing(f => ({ ...f, color: e.target.value }))} style={{ height: 40 }} />
              </div>
              <div className="adm-form-actions" style={{ marginTop: 24 }}>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing(null)}>Annulla</button>
                <button className="adm-btn adm-btn-sm" onClick={() => saveGroup(editing)} disabled={!editing.name.trim()}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teams Section ─────────────────────────────────────────────────────────
function TeamForm({ team, groups, onSave, onClose }) {
  const [editing, setEditing] = useState({ ...team, players: team.players || [] });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNum, setNewPlayerNum] = useState('');
  const isNew = !team.short;
  const nations = window.NATIONS_2026 || DEFAULT_NATIONS_2026 || [];

  function addPlayer(e) {
    e.preventDefault();
    if (!newPlayerName) return;
    const p = { id: Date.now().toString(), name: newPlayerName.trim(), number: newPlayerNum };
    setEditing(f => ({ ...f, players: [...f.players, p] }));
    setNewPlayerName('');
    setNewPlayerNum('');
  }

  function removePlayer(id) {
    setEditing(f => ({ ...f, players: f.players.filter(p => p.id !== id) }));
  }

  function pickNation(short) {
    const n = nations.find(x => x.short === short);
    if (!n) return;
    setEditing(f => ({ ...f, name: n.name, flag: n.flag, short: n.short, color: f.color || '#00E676' }));
  }

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <h3 className="adm-modal-title">{isNew ? 'Nuova Squadra' : (editing.flag ? editing.flag + ' ' : '') + editing.name}</h3>
        <div className="adm-form" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>

          {isNew && (
            <div className="adm-form-group">
              <label className="adm-label">Scegli Nazione FIFA 2026</label>
              <select className="adm-select" value={editing.short || ''} onChange={e => pickNation(e.target.value)}>
                <option value="">-- Seleziona nazione --</option>
                {nations.map(n => <option key={n.short} value={n.short}>{n.flag} {n.name} ({n.short})</option>)}
              </select>
            </div>
          )}

          <div className="adm-form-row">
            <div className="adm-form-group"><label className="adm-label">Nome squadra</label><input className="adm-input" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="adm-form-group"><label className="adm-label">Sigla (max 3 lett.)</label><input className="adm-input" value={editing.short} onChange={e => setEditing(f => ({ ...f, short: e.target.value.toUpperCase().slice(0, 3) }))} disabled={!isNew} /></div>
          </div>
          <div className="adm-form-row">
            <div className="adm-form-group"><label className="adm-label">Bandiera (Emoji)</label><input className="adm-input" value={editing.flag || ''} onChange={e => setEditing(f => ({ ...f, flag: e.target.value }))} placeholder="🇮🇹" /></div>
            <div className="adm-form-group">
              <label className="adm-label">Girone</label>
              <select className="adm-select" value={editing.group || ''} onChange={e => setEditing(f => ({ ...f, group: e.target.value }))}>
                <option value="">-- Nessun girone --</option>
                {(groups || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <div className="adm-form-group"><label className="adm-label">Colore</label><input type="color" className="adm-input" value={editing.color || '#00E676'} onChange={e => setEditing(f => ({ ...f, color: e.target.value }))} style={{ height: 40 }} /></div>

          <h4 style={{ marginTop: 20, marginBottom: 10, color: '#fff', fontSize: 14 }}>Rosa Giocatori</h4>
          <div style={{ background: '#111', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {editing.players.length === 0 ? <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>Nessun giocatore inserito.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {editing.players.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#1a1a1a', padding: '6px 10px', borderRadius: 6, fontSize: 13 }}>
                    <span>{p.number ? <b>{p.number}.</b> : ''} {p.name}</span>
                    <button style={{ background: 'transparent', border: 0, color: '#FF3D3D', cursor: 'pointer' }} onClick={() => removePlayer(p.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addPlayer} style={{ display: 'flex', gap: 6 }}>
              <input className="adm-input" placeholder="N." style={{ width: 50 }} value={newPlayerNum} onChange={e => setNewPlayerNum(e.target.value)} />
              <input className="adm-input" placeholder="Nome giocatore" style={{ flex: 1 }} value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} />
              <button className="adm-btn adm-btn-sm" type="submit">+</button>
            </form>
          </div>

          <h4 style={{ marginTop: 10, marginBottom: 10, color: 'var(--fg-2)', fontSize: 13 }}>Statistiche</h4>
          <div className="adm-form-row">
            <div className="adm-form-group"><label className="adm-label">Partite</label><input type="number" className="adm-input" value={editing.played} onChange={e => setEditing(f => ({ ...f, played: parseInt(e.target.value) || 0 }))} min="0" /></div>
            <div className="adm-form-group"><label className="adm-label">Vittorie</label><input type="number" className="adm-input" value={editing.won} onChange={e => setEditing(f => ({ ...f, won: parseInt(e.target.value) || 0 }))} min="0" /></div>
          </div>
          <div className="adm-form-row">
            <div className="adm-form-group"><label className="adm-label">Gol Fatti</label><input type="number" className="adm-input" value={editing.goals} onChange={e => setEditing(f => ({ ...f, goals: parseInt(e.target.value) || 0 }))} min="0" /></div>
            <div className="adm-form-group"><label className="adm-label">Punti</label><input type="number" className="adm-input" value={editing.points} onChange={e => setEditing(f => ({ ...f, points: parseInt(e.target.value) || 0 }))} min="0" /></div>
          </div>

          <div className="adm-form-actions" style={{ marginTop: 24 }}>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
            <button className="adm-btn adm-btn-sm" onClick={() => onSave(editing)}>Salva Squadra</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamsSection({ data, onSave }) {
  const [teams, setTeams] = useState(data.teams || DEFAULT_TEAMS);
  const [editing, setEditing] = useState(null);
  const [filterGroup, setFilterGroup] = useState('all');
  const groups = data.groups || DEFAULT_GROUPS;

  function saveItem(item) {
    if (!item.short) {
      alert("Devi inserire una sigla per la squadra (es. ITA)");
      return;
    }
    let updated;
    if (teams.find(t => t.short === item.short)) {
      updated = teams.map(t => t.short === item.short ? item : t);
    } else {
      updated = [...teams, item];
    }
    setTeams(updated);
    const newStandings = computeStandings(data.matches_giornata || [], updated, data.groups);
    onSave({ ...data, teams: updated, ...newStandings }, 'Squadra salvata');
    setEditing(null);
  }

  function deleteTeam(short) {
    if (!window.confirm('Sicuro di voler eliminare questa squadra?')) return;
    const updated = teams.filter(t => t.short !== short);
    setTeams(updated);
    const newStandings = computeStandings(data.matches_giornata || [], updated, data.groups);
    onSave({ ...data, teams: updated, ...newStandings }, 'Squadra eliminata');
  }

  function newTeam() {
    setEditing({ short: '', name: '', group: '', flag: '', color: '#00E676', players: [], played: 0, won: 0, goals: 0, points: 0 });
  }

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));
  const filtered = filterGroup === 'all' ? teams
    : filterGroup === 'none' ? teams.filter(t => !t.group)
    : teams.filter(t => t.group === filterGroup);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Squadre</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>{teams.length} squadre registrate</p>
        </div>
        <button className="adm-btn adm-btn-sm" onClick={newTeam}>+ Nuova Squadra</button>
      </div>

      {groups.length > 0 && (
        <div className="rm-tabs" style={{ marginBottom: 12 }}>
          <button className={`rm-tab ${filterGroup === 'all' ? 'on' : ''}`} onClick={() => setFilterGroup('all')}>Tutte ({teams.length})</button>
          {groups.map(g => (
            <button key={g.id} className={`rm-tab ${filterGroup === g.id ? 'on' : ''}`} onClick={() => setFilterGroup(g.id)}>
              {g.name} ({teams.filter(t => t.group === g.id).length})
            </button>
          ))}
          <button className={`rm-tab ${filterGroup === 'none' ? 'on' : ''}`} onClick={() => setFilterGroup('none')}>
            Senza girone ({teams.filter(t => !t.group).length})
          </button>
        </div>
      )}

      <div className="adm-card">
        {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-3)' }}>Nessuna squadra{filterGroup !== 'all' ? ' in questo girone' : ' registrata'}</div>}
        {filtered.map(t => {
          const gName = groupMap[t.group] || (t.group ? t.group : 'Nessun girone');
          return (
            <div key={t.short} className="adm-item-row">
              <div className="adm-crest" style={{ borderColor: t.color, color: t.color }}>{t.flag || t.short}</div>
              <div className="adm-item-row-body">
                <div className="adm-item-title">{t.flag ? t.flag + ' ' : ''}{t.name}</div>
                <div className="adm-item-meta">{gName} · {t.players?.length || 0} giocatori</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...t })}><EditIcon size={16}/></button>
                <button className="adm-btn-danger adm-btn-icon" onClick={() => deleteTeam(t.short)}><TrashIcon size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <TeamForm team={editing} groups={groups} onSave={saveItem} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ── Events Section ────────────────────────────────────────────────────────
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

// ── Honors Section ────────────────────────────────────────────────────────
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

// ── Sponsors Section ──────────────────────────────────────────────────────
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

// ── Settings Section ──────────────────────────────────────────────────────
function SettingsSection({ data, onSave }) {
  const [user, setUser] = useState(data._auth.username);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');

  async function save(e) {
    e.preventDefault();
    if (pass && pass !== confirm) { setMsg('Le password non coincidono'); return; }

    const newAuth = {
      username: user.trim(),
      password: pass || data._auth.password
    };

    const newData = { ...data, _auth: newAuth };
    await onSave(newData, 'Credenziali aggiornate');
    setPass(''); setConfirm('');
    setMsg('Salvato correttamente! Sarà attiva al prossimo login.');
    setTimeout(() => setMsg(''), 3000);
  }

  async function resetData() {
    if (!window.confirm('Ripristinare tutti i dati ai valori iniziali? Questa operazione non può essere annullata.')) return;
    localStorage.removeItem(window.RM_STORAGE_KEY);
    await rmSaveData({});
    window.location.reload();
  }

  return (
    <div>
      <h2 className="adm-section-title">Impostazioni</h2>
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header"><span className="adm-card-title">Credenziali accesso</span></div>
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
            {msg && <div style={{ color: msg.includes('non') ? '#FF3D3D' : 'var(--brand-green)', fontSize: 13 }}>{msg}</div>}
            <button className="adm-btn adm-btn-sm" type="submit">Salva credenziali</button>
          </form>
        </div>
      </div>
      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title">Dati sito</span></div>
        <div className="adm-card-body">
          <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14 }}>Ripristina tutti i dati (classifica, partite, avvisi, ecc.) ai valori predefiniti. L'operazione è irreversibile.</p>
          <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={resetData}>Ripristina dati iniziali</button>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <a href="index.html" style={{ color: 'var(--brand-green)', fontSize: 14 }}>← Vai al sito pubblico</a>
      </div>
    </div>
  );
}

// ── Dashboard Menu ────────────────────────────────────────────────────────
function DashboardMenu({ setTab }) {
  return (
    <>
      <div className="adm-eyebrow" style={{ marginTop: 10 }}>Stagione 2026</div>
      <h3 className="adm-section-title">Torneo</h3>
      <p className="adm-section-sub">Gestisci le squadre, i calendari e le classifiche.</p>
      
      <div className="adm-grid-menu">
        <div className="adm-grid-btn" onClick={() => setTab('gironi')}>
          <GridIcon size={32} />
          <span>Gironi</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('teams')}>
          <UsersIcon size={32} />
          <span>Squadre & Rose</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('matches')}>
          <CalIcon size={32} />
          <span>Partite</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('standings')}>
          <GridIcon size={32} />
          <span>Classifiche</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('scorers')}>
          <BallIcon size={32} />
          <span>Marcatori</span>
        </div>
      </div>

      <div className="adm-eyebrow" style={{ marginTop: 32 }}>Sito Pubblico</div>
      <h3 className="adm-section-title">Portale</h3>
      <p className="adm-section-sub">Personalizza gli eventi, gli avvisi e l'albo d'oro del sito.</p>
      
      <div className="adm-grid-menu">
        <div className="adm-grid-btn" onClick={() => setTab('events')}>
          <CalIcon size={32} />
          <span>Eventi</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('honors')}>
          <TrophyIcon size={32} />
          <span>Albo d'oro</span>
        </div>
      </div>
    </>
  );
}

// ── Admin App ─────────────────────────────────────────────────────────────
function AdminApp() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState(() => {
    const d = rmGetAllData();
    return { ...d, ...computeStandings(d.matches_giornata, d.teams, d.groups) };
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function sync() {
      const remoteData = await rmLoadData();
      if (remoteData) {
        const merged = rmMergeDefaults(remoteData);
        setData({ ...merged, ...computeStandings(merged.matches_giornata, merged.teams, merged.groups) });
      }
    }
    sync();
  }, []);

  async function handleSave(newData, msg) {
    setData(newData);
    if (msg) setToast(msg);
    await rmSaveData(newData);
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.reload();
  }

  const props = { data, onSave: handleSave };

  const isMainTab = ['dashboard', 'live', 'news', 'settings'].includes(tab);
  const bottomNav = isMainTab ? tab : 'dashboard';

  return (
    <div className="adm-app">
      <header className="adm-topbar">
        <div className="adm-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <img src="assets/logo-rinascita-monteforte.jpg" alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
          <span className="adm-topbar-title">Admin Rinascita</span>
          <span className="adm-badge">Staff</span>
        </div>
        <button className="adm-logout" onClick={logout}>Esci</button>
      </header>

      <main className="adm-main">
        {!isMainTab && (
          <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginBottom: 20, padding: 0 }} onClick={() => setTab('dashboard')}>
            ← Torna al Menù
          </button>
        )}
        
        {tab === 'dashboard' && <DashboardMenu setTab={setTab} />}
        {tab === 'live' && <LiveSection      {...props} />}
        {tab === 'news' && <NewsSection      {...props} />}
        {tab === 'gironi' && <GironiSection   {...props} />}
        {tab === 'matches' && <MatchesSection   {...props} />}
        {tab === 'standings' && <StandingsSection {...props} />}
        {tab === 'scorers' && <ScorersSection   {...props} />}
        {tab === 'teams' && <TeamsSection     {...props} />}
        {tab === 'events' && <EventsSection    {...props} />}
        {tab === 'honors' && <HonorsSection    {...props} />}
        {tab === 'sponsors' && <SponsorsSection  {...props} />}
        {tab === 'settings' && <SettingsSection  {...props} />}
      </main>

      <nav className="adm-bottom-nav">
        <button className={`adm-bn-item ${bottomNav === 'dashboard' ? 'on' : ''}`} onClick={() => setTab('dashboard')}>
          <HomeIcon size={24}/><span>Torneo</span>
        </button>
        <button className={`adm-bn-item ${bottomNav === 'live' ? 'on' : ''}`} onClick={() => setTab('live')}>
          <ZapIcon size={24}/><span>Live</span>
        </button>
        <button className={`adm-bn-item ${bottomNav === 'news' ? 'on' : ''}`} onClick={() => setTab('news')}>
          <BellIcon size={24}/><span>Bacheca</span>
        </button>
        <button className={`adm-bn-item ${bottomNav === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}>
          <MenuIcon size={24}/><span>Altro</span>
        </button>
      </nav>

      {toast && <Toast msg={`✓ ${toast}`} onDone={() => setToast(null)} />}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
function Root() {
  const [authed, setAuthed] = useState(isLoggedIn());
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <AdminApp />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
