/* global React, window, rmLoadData, rmSaveData, rmGetAllData, DEFAULT_TEAMS,
   DEFAULT_STANDINGS_A, DEFAULT_STANDINGS_O40, DEFAULT_STANDINGS_JR,
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
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ ...n })}>Modifica</button>
                <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleting(n.id)}>✕</button>
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

// ── Compute Standings ─────────────────────────────────────────────────────
function computeStandings(giornata, teams) {
  const map = {};

  for (const t of (teams || [])) {
    map[t.short] = {
      short: t.short, name: t.name, color: t.color,
      category: t.category,
      g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0, form: []
    };
  }

  const allMatches = (giornata || []).flatMap(g => g.items || []);

  for (const m of allMatches) {
    if (m.status !== 'ft' || m.hs == null || m.as == null || !m.home || !m.away) continue;
    const h = map[m.home.short];
    const a = map[m.away.short];
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

  const sort = arr => arr.sort((a, b) => {
    if (b.pt !== a.pt) return b.pt - a.pt;
    const drA = a.gf - a.gs, drB = b.gf - b.gs;
    if (drB !== drA) return drB - drA;
    return b.gf - a.gf;
  });

  const rows = Object.values(map);
  return {
    standings_a:   sort(rows.filter(r => r.category === 'Senior')),
    standings_o40: sort(rows.filter(r => r.category === 'Over 40')),
    standings_jr:  sort(rows.filter(r => r.category === 'Junior')),
  };
}

const PHASE_PRESETS = [
  'Girone A', 'Girone B', 'Girone Over 40', 'Girone Junior',
  'Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'
];

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
    const targetDay = updated._day || PHASE_PRESETS[0];
    delete updated._isNew;
    delete updated._day;

    let g = giornata.find(x => x.day === targetDay);
    if (!g) { g = { day: targetDay, items: [] }; giornata.push(g); }
    g.items.push(updated);
    giornata = giornata.filter(x => x.items.length > 0);

    const matchesToday = giornata.flatMap(x => x.items.filter(m => m.date === 'Oggi' || m.date === updated.date));
    const newStandings = computeStandings(giornata, data.teams);
    onSave({ ...data, matches_giornata: giornata, matches_today: matchesToday.slice(0, 5), ...newStandings }, 'Partita e classifica aggiornate');
    setEditing(null);
  }

  function deleteMatch(matchId) {
    let giornata = JSON.parse(JSON.stringify(data.matches_giornata || []));
    for (let g of giornata) {
      g.items = g.items.filter(m => m.id !== matchId);
    }
    giornata = giornata.filter(x => x.items.length > 0);
    const newStandings = computeStandings(giornata, data.teams);
    onSave({ ...data, matches_giornata: giornata, ...newStandings }, 'Partita eliminata');
    setDeleting(null);
  }

  const statusLabel = { live: '🔴 Live', ft: '✅ Finale', sch: '⏳ Programmata' };

  function newMatch() {
    setEditing({ _isNew: true, _day: PHASE_PRESETS[0], status: 'sch', home: null, away: null, hs: null, as: null, date: '', time: '' });
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
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ ...m })}>Modifica</button>
                  <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleting(m.id)}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'bracket' && <BracketView giornata={data.matches_giornata} />}

      {editing && <MatchForm match={editing} teams={teams} giornate={data.matches_giornata || []} onSave={saveMatch} onClose={() => setEditing(null)} />}
      {deleting && <Confirm msg="Eliminare questa partita?" onOk={() => deleteMatch(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function MatchForm({ match, teams, giornate, onSave, onClose }) {
  const [form, setForm] = useState({ ...match });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function submit() {
    if (!form.home || !form.away) { alert("Seleziona entrambe le squadre"); return; }
    onSave(form);
  }

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <h3 className="adm-modal-title">{match._isNew ? 'Nuova Partita' : 'Modifica partita'}</h3>
        <div className="adm-form">
          <div className="adm-form-group">
            <label className="adm-label">Fase / Giornata</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {PHASE_PRESETS.map(p => (
                <button key={p} type="button"
                  className={`adm-btn adm-btn-sm ${form._day === p ? '' : 'adm-btn-ghost'}`}
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  onClick={() => set('_day', p)}>{p}</button>
              ))}
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
  const [tab, setTab] = useState('senior');

  const sectionMap = {
    senior: { key: 'standings_a', label: 'Senior', default: DEFAULT_STANDINGS_A },
    over40: { key: 'standings_o40', label: 'Over 40', default: DEFAULT_STANDINGS_O40 },
    junior: { key: 'standings_jr', label: 'Junior', default: DEFAULT_STANDINGS_JR },
  };

  const { key, default: def } = sectionMap[tab];
  const rows = data[key] || def;

  return (
    <div>
      <h2 className="adm-section-title">Classifica</h2>
      <div style={{ padding: '10px 16px', background: 'rgba(0,230,118,0.07)', border: '1px solid var(--border-brand)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--brand-green)' }}>
        ⚡ Classifica calcolata automaticamente dai risultati delle partite terminate (FT).
      </div>
      <div className="rm-tabs" style={{ marginBottom: 16 }}>
        {Object.entries(sectionMap).map(([id, s]) => (
          <button key={id} className={`rm-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{s.label}</button>
        ))}
      </div>
      <div className="adm-card">
        {rows.length === 0 ? (
          <div className="adm-empty">Nessuna squadra in classifica. Aggiungi squadre e partite con risultato FT.</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.short} className="adm-item-row">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand-green)', width: 28 }}>{i + 1}</div>
              <div className="adm-crest" style={{ borderColor: r.color, color: r.color }}>{r.short}</div>
              <div className="adm-item-row-body">
                <div className="adm-item-title">{r.name}</div>
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
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ ...s, _idx: i })}>Mod.</button>
              <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleting(i)}>✕</button>
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

// ── Teams Section ─────────────────────────────────────────────────────────
function TeamForm({ team, onSave, onClose }) {
  const [editing, setEditing] = useState({ ...team, players: team.players || [] });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNum, setNewPlayerNum] = useState('');
  const isNew = !team.short; // if short is empty, it's a new team

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

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <h3 className="adm-modal-title">{isNew ? 'Nuova Squadra' : editing.name}</h3>
        <div className="adm-form" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
          <div className="adm-form-row">
            <div className="adm-form-group"><label className="adm-label">Nome squadra</label><input className="adm-input" value={editing.name} onChange={e => setEditing(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="adm-form-group"><label className="adm-label">Sigla (max 3 lett.)</label><input className="adm-input" value={editing.short} onChange={e => setEditing(f => ({ ...f, short: e.target.value.toUpperCase().slice(0, 3) }))} disabled={!isNew} /></div>
          </div>
          <div className="adm-form-row">
            <div className="adm-form-group"><label className="adm-label">Bandiera (Emoji)</label><input className="adm-input" value={editing.flag || ''} onChange={e => setEditing(f => ({ ...f, flag: e.target.value }))} placeholder="🇮🇹" /></div>
            <div className="adm-form-group">
              <label className="adm-label">Categoria</label>
              <select className="adm-input" value={editing.category} onChange={e => setEditing(f => ({ ...f, category: e.target.value }))}>
                <option value="Senior">Senior</option>
                <option value="Over 40">Over 40</option>
                <option value="Junior">Junior</option>
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

  function saveItem(item) {
    if (!item.short) {
      alert("Devi inserire una sigla per la squadra (es. RM)");
      return;
    }
    let updated;
    if (teams.find(t => t.short === item.short)) {
      updated = teams.map(t => t.short === item.short ? item : t);
    } else {
      updated = [...teams, item];
    }
    setTeams(updated);
    onSave({ ...data, teams: updated }, 'Squadra salvata');
    setEditing(null);
  }

  function deleteTeam(short) {
    if (!window.confirm('Sicuro di voler eliminare questa squadra?')) return;
    const updated = teams.filter(t => t.short !== short);
    setTeams(updated);
    onSave({ ...data, teams: updated }, 'Squadra eliminata');
  }

  function newTeam() {
    setEditing({
      short: '', name: '', category: 'Senior', captain: '',
      played: 0, won: 0, goals: 0, points: 0, color: '#00E676', flag: '', players: []
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Squadre</h2>
        <button className="adm-btn adm-btn-sm" onClick={newTeam}>+ Nuova Squadra</button>
      </div>
      <div className="adm-card">
        {teams.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-3)' }}>Nessuna squadra registrata</div>}
        {teams.map(t => (
          <div key={t.short} className="adm-item-row">
            <div className="adm-crest" style={{ borderColor: t.color, color: t.color }}>{t.short}</div>
            <div className="adm-item-row-body">
              <div className="adm-item-title">{t.flag ? t.flag + ' ' : ''}{t.name}</div>
              <div className="adm-item-meta">{t.category} · {t.players?.length || 0} Giocatori · {t.played}G {t.won}V {t.points}pt</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ ...t })}>Modifica</button>
              <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => deleteTeam(t.short)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      {editing && <TeamForm team={editing} onSave={saveItem} onClose={() => setEditing(null)} />}
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
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ ...ev })}>Mod.</button>
              <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleting(i)}>✕</button>
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
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ ...h })}>Mod.</button>
              <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleting(i)}>✕</button>
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
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ ...s })}>Mod.</button>
              <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleting(i)}>✕</button>
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

// ── Admin App ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'live', label: 'Live 🔴' },
  { id: 'matches', label: 'Partite' },
  { id: 'teams', label: 'Squadre' },
  { id: 'scorers', label: 'Marcatori' },
  { id: 'standings', label: 'Classifica' },
  { id: 'news', label: 'Avvisi' },
  { id: 'events', label: 'Eventi' },
  { id: 'honors', label: "Albo d'oro" },
  { id: 'sponsors', label: 'Sponsor' },
  { id: 'settings', label: '⚙ Settings' },
];

function AdminApp() {
  const [tab, setTab] = useState('live');
  const [data, setData] = useState(() => {
    const d = rmGetAllData();
    return { ...d, ...computeStandings(d.matches_giornata, d.teams) };
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function sync() {
      const remoteData = await rmLoadData();
      if (remoteData) {
        const merged = rmMergeDefaults(remoteData);
        setData({ ...merged, ...computeStandings(merged.matches_giornata, merged.teams) });
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

  return (
    <div className="adm-app">
      <header className="adm-topbar">
        <div className="adm-topbar-left">
          <img src="assets/logo-rinascita-monteforte.jpg" alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
          <span className="adm-topbar-title">Admin Rinascita</span>
          <span className="adm-badge">Staff</span>
        </div>
        <button className="adm-logout" onClick={logout}>Esci</button>
      </header>

      <div className="adm-tabs-wrap">
        <div className="adm-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`adm-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="adm-main">
        {tab === 'live' && <LiveSection      {...props} />}
        {tab === 'news' && <NewsSection      {...props} />}
        {tab === 'matches' && <MatchesSection   {...props} />}
        {tab === 'standings' && <StandingsSection {...props} />}
        {tab === 'scorers' && <ScorersSection   {...props} />}
        {tab === 'teams' && <TeamsSection     {...props} />}
        {tab === 'events' && <EventsSection    {...props} />}
        {tab === 'honors' && <HonorsSection    {...props} />}
        {tab === 'sponsors' && <SponsorsSection  {...props} />}
        {tab === 'settings' && <SettingsSection  {...props} />}
      </main>

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
