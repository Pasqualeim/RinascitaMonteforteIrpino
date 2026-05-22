import { useState, useEffect } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────
const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const TrophyIcon  = (p) => <Icon {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></Icon>;
const BallIcon    = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></Icon>;
const CalIcon     = (p) => <Icon {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></Icon>;
const PinIcon     = (p) => <Icon {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></Icon>;
const UsersIcon   = (p) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
const ArrowIcon   = (p) => <Icon {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Icon>;
const ClockIcon   = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>;
const BellIcon    = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>;
const InstaIcon   = (p) => <Icon {...p}><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></Icon>;
const MailIcon    = (p) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></Icon>;
const HomeIcon    = (p) => <Icon {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>;
const ZapIcon     = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const GridIcon    = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>;
const MoreHorizIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>;
const StarIcon    = (p) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>;
const NewspaperIcon = (p) => <Icon {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></Icon>;

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <div className="rm-empty">
      <div className="rm-empty-icon">{icon}</div>
      <div className="rm-empty-title">{title}</div>
      {sub && <div className="rm-empty-sub">{sub}</div>}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ current, onNav, hasLive }) {
  const items = [
    { id: 'home',     label: 'Home' },
    { id: 'live',     label: 'Live' },
    { id: 'calendar', label: 'Calendario' },
    { id: 'table',    label: 'Classifica' },
    { id: 'teams',    label: 'Squadre' },
    { id: 'events',   label: 'Regolamento' },
    { id: 'news',     label: 'Avvisi' },
  ];
  return (
    <header className="rm-header">
      <a className="rm-logo" onClick={() => onNav('home')} style={{ cursor: 'pointer' }}>
        <img src="assets/logo-rinascita-monteforte.jpg" alt="Rinascita Monteforte"/>
        <div>
          <div className="rm-logo-title">Rinascita</div>
          <div className="rm-logo-sub">Monteforte Cup</div>
        </div>
      </a>
      <nav className="rm-nav">
        {items.map(i => (
          <button key={i.id}
            className={`rm-nav-item ${current === i.id ? 'on' : ''}`}
            onClick={() => onNav(i.id)}>
            {i.label}
            {i.id === 'live' && hasLive && <span className="rm-nav-live-dot"/>}
          </button>
        ))}
      </nav>
    </header>
  );
}

// ── Bottom Navigation ──────────────────────────────────────────────────────
function BottomNav({ current, onNav, hasLive }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  useEffect(() => {
    setDrawerOpen(false);
  }, [current]);

  const primary = [
    { id: 'home',     label: 'Home',      icon: HomeIcon },
    { id: 'live',     label: 'Live',      icon: ZapIcon,  live: true },
    { id: 'calendar', label: 'Calendario', icon: CalIcon },
    { id: 'table',    label: 'Classifica', icon: TrophyIcon },
  ];

  const more = [
    { id: 'teams',  label: 'Squadre',   icon: UsersIcon },
    { id: 'events', label: 'Regolamento', icon: NewspaperIcon },
    { id: 'news',   label: 'Avvisi',    icon: BellIcon },
    { id: '_staff', label: 'Area Staff 🔐', icon: null, isAdmin: true },
  ];

  const isMoreActive = drawerOpen || ['teams','events','news'].includes(current);

  function navTo(id) {
    if (id === '_staff') { window.location.href = 'admin.html'; return; }
    setDrawerOpen(false);
    onNav(id);
  }

  return (
    <>
      {drawerOpen && (
        <div className="rm-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="rm-drawer" onClick={e => e.stopPropagation()}>
            <div className="rm-drawer-title">Sezioni</div>
            <div className="rm-drawer-grid">
              {more.filter(i => !i.isAdmin).map(item => (
                <button key={item.id} className="rm-drawer-item" onClick={() => navTo(item.id)}>
                  <item.icon size={18}/>
                  {item.label}
                </button>
              ))}
            </div>
            <a href="admin.html" className="rm-drawer-staff-btn">
              🔐 Area Staff — Accesso riservato
            </a>
          </div>
        </div>
      )}
      <nav className="rm-bottom-nav">
        {primary.map(item => (
          <button key={item.id} className={`rm-bn-item ${current === item.id ? 'on' : ''}`} onClick={() => onNav(item.id)}>
            {item.live && hasLive && <span className="rm-live-dot"/>}
            <item.icon size={22}/>
            <span>{item.label}</span>
          </button>
        ))}
        <button className={`rm-bn-item ${isMoreActive ? 'on' : ''}`} onClick={() => setDrawerOpen(o => !o)}>
          <MoreHorizIcon size={22}/>
          <span>Altro</span>
        </button>
      </nav>
    </>
  );
}

// ── Top marquee strip ──────────────────────────────────────────────────────
function StatusStrip({ items }) {
  const src = items && items.length > 0 ? items : null;
  if (!src) return null;
  const repeated = [...src, ...src, ...src, ...src];
  return (
    <div className="rm-strip">
      <div className="rm-strip-track">
        {repeated.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────
function Countdown({ to, label }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = to - now;
  if (diff <= 0) {
    return (
      <div className="rm-countdown">
        <span className="rm-eyebrow">Torneo in corso · Estate 2026</span>
        <div className="rm-cd-row" style={{ justifyContent: 'flex-start' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,5vw,30px)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand-green)' }}>In campo! ⚽</span>
        </div>
      </div>
    );
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="rm-countdown">
      <span className="rm-eyebrow">{label || "Calcio d'inizio · 15 Giugno 2026"}</span>
      <div className="rm-cd-row">
        <div className="rm-cd-cell"><b>{pad(d)}</b><span>giorni</span></div>
        <div className="rm-cd-sep">:</div>
        <div className="rm-cd-cell"><b>{pad(h)}</b><span>ore</span></div>
        <div className="rm-cd-sep">:</div>
        <div className="rm-cd-cell"><b>{pad(m)}</b><span>min</span></div>
        <div className="rm-cd-sep">:</div>
        <div className="rm-cd-cell"><b>{pad(s)}</b><span>sec</span></div>
      </div>
    </div>
  );
}

// ── Sponsor wink ──────────────────────────────────────────────────────────
function SponsorWink() {
  return (
    <div className="rm-sponsor">
      <span className="rm-sponsor-eyebrow">Major Worldwide Partner</span>
      <div className="rm-sponsor-logo">FIFA*</div>
      <span className="rm-sponsor-foot">* ironicamente.</span>
    </div>
  );
}

// ── Match row ─────────────────────────────────────────────────────────────
function MatchRow({ home, away, hs, as: as_, date, time, status, pitch, minute, events, onClick }) {
  const isTbd = !home || !away;
  if (isTbd && !date && !time) return null;
  const live = status === 'live';
  const done = status === 'ft';
  const tbdTeam = { name: 'Da definire', short: '?', color: 'var(--fg-3)' };
  const homeTeam = home || tbdTeam;
  const awayTeam = away || tbdTeam;
  const clickable = !!onClick && !isTbd;
  return (
    <div
      className={`rm-match ${live ? 'live' : ''} ${done ? 'done' : ''}${isTbd ? ' tbd' : ''}${clickable ? ' clickable' : ''}`}
      onClick={clickable ? onClick : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
    >
      <div className="rm-match-time">
        {live ? (
          <span className="rm-live-tag"><span className="dot"></span>LIVE · {minute}'</span>
        ) : done ? (
          <>
            <span className="date">{date}</span>
            <span className="rm-ft">FT</span>
          </>
        ) : (
          <>
            <span className="date">{date}</span>
            <span className="time">{time || (isTbd ? 'Orario TBD' : '')}</span>
          </>
        )}
      </div>
      <div className="rm-match-team rm-match-team--home">
        <span className="rm-team-name">{homeTeam.name}</span>
        <span className="rm-crest" style={{ borderColor: homeTeam.color || 'var(--brand-green)', color: homeTeam.color || 'var(--brand-green)', fontSize: homeTeam.flag ? 18 : undefined }}>
          {homeTeam.flag || homeTeam.short}
        </span>
      </div>
      <div className="rm-match-score">
        {hs != null ? <span>{hs}<i>–</i>{as_}</span> : <span className="rm-vs">VS</span>}
      </div>
      <div className="rm-match-team rm-match-team--away">
        <span className="rm-crest" style={{ borderColor: awayTeam.color || 'var(--brand-green)', color: awayTeam.color || 'var(--brand-green)', fontSize: awayTeam.flag ? 18 : undefined }}>
          {awayTeam.flag || awayTeam.short}
        </span>
        <span className="rm-team-name">{awayTeam.name}</span>
      </div>
    </div>
  );
}

// ── Big LIVE board ────────────────────────────────────────────────────────
function LiveBoard({ match }) {
  const halfDuration = match?.half_duration || 30;
  const [displayMinute, setDisplayMinute] = useState(match?.minute || 0);

  useEffect(() => {
    if (!match?.active || match?.phase === 'half_time') {
      setDisplayMinute(match?.minute || 0);
      return;
    }
    function calcMinute() {
      const ref = match.timer_started_at;
      if (!ref) return match.minute || 0;
      const elapsed = Math.floor((Date.now() - ref) / 60000);
      return match.phase === 'second_half' ? halfDuration + elapsed : elapsed;
    }
    setDisplayMinute(calcMinute());
    const id = setInterval(() => setDisplayMinute(calcMinute()), 5000);
    return () => clearInterval(id);
  }, [match?.active, match?.phase, match?.timer_started_at, match?.minute, halfDuration]);

  if (!match || !match.active) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--fg-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
      Nessuna partita in diretta
    </div>
  );
  const { home, away, hs, as: as_, pitch, events = [], phase } = match;
  if (!home || !away) return null;

  const phaseLabel = phase === 'half_time' ? 'Intervallo'
    : phase === 'second_half' ? '2° Tempo'
    : phase === 'first_half' ? '1° Tempo'
    : displayMinute > halfDuration ? '2° Tempo' : '1° Tempo';
  const isHalfTime = phase === 'half_time';

  const sortedEvents = [...events].sort((a, b) => b.min - a.min);

  return (
    <div className="rm-live-hero">
      <div className="rm-live-top">
        <span className="rm-live-badge">
          <span className="dot"></span>
          {isHalfTime ? 'Intervallo' : `In diretta · ${displayMinute}'`}
        </span>
        {pitch && <span className="rm-live-pitch">{pitch}</span>}
      </div>
      <div className="rm-live-board">
        <div className="rm-live-team">
          <div className="rm-live-crest" style={{ borderColor: home.color, color: home.color, fontSize: home.flag ? 28 : undefined }}>{home.flag || home.short}</div>
          <div className="rm-live-team-name">{home.name}</div>
          <div className="rm-live-team-meta">Casa</div>
        </div>
        <div className="rm-live-score">
          <div className="rm-live-score-row">{hs}<i>–</i>{as_}</div>
          <div className="rm-live-min">{phaseLabel}{!isHalfTime && ` · ${displayMinute}'`}</div>
        </div>
        <div className="rm-live-team">
          <div className="rm-live-crest" style={{ borderColor: away.color, color: away.color, fontSize: away.flag ? 28 : undefined }}>{away.flag || away.short}</div>
          <div className="rm-live-team-name">{away.name}</div>
          <div className="rm-live-team-meta">Ospite</div>
        </div>
      </div>

      {sortedEvents.length > 0 && (
        <div className="rm-live-events">
          {sortedEvents.map((e, i) => {
            const isHome = e._ts === home.short;
            const icon = e.type === 'goal' ? (e._autogol ? '⚽ aut.' : '⚽') : e.type === 'yellow' ? '🟨' : '🟥';
            return (
              <div key={i} className="rm-live-event-row">
                <div className="rm-lev-home">
                  {isHome && <><span className="rm-lev-name">{e.player}</span><span className="rm-lev-icon">{icon}</span></>}
                </div>
                <div className="rm-lev-min">{e.min}'</div>
                <div className="rm-lev-away">
                  {!isHome && <><span className="rm-lev-icon">{icon}</span><span className="rm-lev-name">{e.player}</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Standings ─────────────────────────────────────────────────────────────
function StandingsTable({ rows, group, updatedLabel }) {
  return (
    <div className="rm-table-wrap">
      <div className="rm-table-head">
        <h3 className="rm-table-title">{group && group.toLowerCase().startsWith('girone') ? group : `Girone ${group}`}</h3>
        <span className="rm-eyebrow muted">{updatedLabel}</span>
      </div>
      <table className="rm-table">
        <thead>
          <tr><th>#</th><th>Squadra</th><th>G</th><th>V</th><th>N</th><th>P</th><th>Pt</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.short + i} className={i < 2 ? 'top' : ''}>
              <td className="pos">{i + 1}</td>
              <td><div className="rm-team-cell"><span style={{ fontSize: 18, lineHeight: 1 }}>{r.flag || '🏳️'}</span>{r.name}</div></td>
              <td>{r.g}</td><td>{r.v}</td><td>{r.n}</td><td>{r.p}</td>
              <td><span className="rm-pts">{r.pt}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Team card ─────────────────────────────────────────────────────────────
function TeamCard({ team, onClick }) {
  const hasRoster = (team.players?.length ?? 0) > 0;
  return (
    <div className="rm-team-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="rm-team-crest-lg" style={{ borderColor: team.color, color: team.color }}>{team.short}</div>
      <div className="rm-team-meta">
        <div className="rm-team-card-name">{team.name}</div>
        <div className="rm-team-card-sub">
          {team.captain ? 'Cap. ' + team.captain : team.flag || ''}
          {hasRoster && <span style={{ marginLeft: 8, color: 'var(--brand-green)', fontWeight: 600 }}>{team.players.length} gioc.</span>}
        </div>
        <div className="rm-team-stats">
          <span><b>{team.played ?? 0}</b> G</span>
          <span><b>{team.won ?? 0}</b> V</span>
          <span><b>{team.goals ?? 0}</b> GF</span>
          <span className="rm-team-stat-pts"><b>{team.points ?? 0}</b> Pt</span>
        </div>
      </div>
      {onClick && <span style={{ color: 'var(--fg-3)', fontSize: 18, flexShrink: 0 }}>›</span>}
    </div>
  );
}

// ── Top scorers ───────────────────────────────────────────────────────────
function TopScorers({ list }) {
  if (!list?.length) return (
    <div className="rm-empty">
      <div className="rm-empty-icon">⚽</div>
      <div className="rm-empty-title">Nessun marcatore</div>
      <div className="rm-empty-sub">I marcatori verranno aggiornati dallo staff.</div>
    </div>
  );
  return (
    <div className="rm-scorers">
      {list.map((s, i) => (
        <div key={s.id || i} className="rm-scorer">
          <div className="rm-scorer-pos">{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div className="rm-scorer-name">{s.name}</div>
            <div className="rm-scorer-team">{s.flag || ''} {s.team || s.short}</div>
          </div>
          <div className="rm-scorer-goals"><BallIcon size={15}/>{s.goals}</div>
        </div>
      ))}
    </div>
  );
}

// ── News card ─────────────────────────────────────────────────────────────
function NewsCard({ item, featured }) {
  return (
    <div className={`rm-news-card ${featured ? 'featured' : ''} ${item.pinned ? 'pinned' : ''}`}>
      {item.pinned && <span className="rm-news-pin">📌 In evidenza</span>}
      <div className="rm-news-top">
        <span className={`rm-news-cat ${item.tone || ''}`}>{item.category || item.cat}</span>
        <span className="rm-news-date">{item.date}</span>
      </div>
      <h4 className="rm-news-title">{item.title}</h4>
      <p className="rm-news-body">{item.body}</p>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────
const EVENT_KIND_LABELS = { partita: 'Match', cerimonia: 'Cerimonia', festa: 'Festa' };

function EventRow({ ev }) {
  // Support bootstrap DB shape ({date, time, type, description}) and legacy blob shape ({day, month, kind, kindLabel, where})
  let day = ev.day;
  let month = ev.month;
  if (!day && ev.date) {
    const dt = new Date(ev.date + 'T12:00:00');
    if (!isNaN(dt)) {
      day = dt.getDate();
      month = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][dt.getMonth()];
    }
  }
  const kindType = ev.kind || ev.type || '';
  const kindLabel = ev.kindLabel || EVENT_KIND_LABELS[kindType] || kindType;
  const where = ev.where || ev.description || '';

  return (
    <div className={`rm-event ${ev.highlight ? 'highlight' : ''}`}>
      <div className="rm-event-date">
        <div className="rm-event-day">{day}</div>
        <div className="rm-event-mon">{month}</div>
      </div>
      <div className="rm-event-body">
        <div className="rm-event-title">{ev.title}</div>
        <div className="rm-event-meta">
          {ev.time && <span><ClockIcon size={13}/>{ev.time}</span>}
          {where && <span><PinIcon size={13}/>{where}</span>}
          {ev.extra && <span>{ev.extra}</span>}
        </div>
        {kindLabel && <span className={`rm-event-cat ${kindType}`}>{kindLabel}</span>}
      </div>
    </div>
  );
}

// ── Honor card ────────────────────────────────────────────────────────────
function HonorCard({ honor, current }) {
  // Support both bootstrap DB shape (runner_up, top_scorer) and legacy blob shape (runner, topScorer)
  const runner    = honor.runner_up   || honor.runner    || '';
  const topScorer = honor.top_scorer  || honor.topScorer || '';
  return (
    <div className={`rm-honor ${current ? 'current' : ''} ${honor.alt ? 'alt' : ''}`}>
      <div className="rm-honor-year">{honor.year}</div>
      <div className="rm-honor-body">
        <h4 className="rm-honor-title">{honor.edition}</h4>
        <div className="rm-honor-list">
          <div className="rm-honor-row"><span>Vincitore</span><b>{honor.winner}</b></div>
          <div className="rm-honor-row"><span>Finalista</span><b>{runner}</b></div>
          <div className="rm-honor-row"><span>Capocann.</span><b>{topScorer}</b></div>
          <div className="rm-honor-row"><span>MVP</span><b>{honor.mvp}</b></div>
        </div>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
function Footer({ onNav }) {
  return (
    <footer className="rm-footer">
      <div className="rm-footer-grid">
        <div className="rm-footer-brand">
          <div className="rm-logo-title" style={{ fontSize: 22 }}>Associazione Rinascita</div>
          <div className="rm-footer-tagline">Per la passione,<br/>per il paese,<br/>per il calcio.</div>
          <p className="rm-footer-text">Monteforte Irpino (AV) · Volontariato sportivo dal 2024. Il Rinascita Monteforte Cup è un torneo amatoriale aperto a Senior, Over 40 e Junior.</p>
        </div>
        <div>
          <h4>Torneo</h4>
          <ul>
            <li><a onClick={() => onNav('live')} style={{ cursor: 'pointer' }}>Risultati live</a></li>
            <li><a onClick={() => onNav('calendar')} style={{ cursor: 'pointer' }}>Calendario</a></li>
            <li><a onClick={() => onNav('table')} style={{ cursor: 'pointer' }}>Classifica</a></li>
            <li><a onClick={() => onNav('teams')} style={{ cursor: 'pointer' }}>Squadre</a></li>
          </ul>
        </div>
        <div>
          <h4>Informazioni</h4>
          <ul>
            <li><a onClick={() => onNav('events')} style={{ cursor: 'pointer' }}>Regolamento</a></li>
            <li><a onClick={() => onNav('news')} style={{ cursor: 'pointer' }}>Avvisi</a></li>
          </ul>
        </div>
        <div>
          <h4>Contatti</h4>
          <ul>
            <li><a href="mailto:info@rinascitamonteforte.it"><MailIcon size={13}/> info@rinascitamonteforte.it</a></li>
            <li><a href="https://www.instagram.com/associazionerinascita_" target="_blank" rel="noreferrer"><InstaIcon size={13}/> @associazionerinascita_</a></li>
            <li><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PinIcon size={13}/> Campo Sportivo, Monteforte Irpino</span></li>
          </ul>
        </div>
      </div>
      <div className="rm-footer-bot">
        <span>© 2026 Associazione Rinascita · Monteforte Irpino (AV)</span>
        <span>Sito non ufficiale · FIFA non c'entra niente, davvero.</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <a href="admin.html" className="rm-footer-admin-btn">🔐 Area Staff — Accesso riservato</a>
      </div>
      <p className="rm-footer-credit">Made with ❤️ by Pasquale Ercolino, Emanuele Iovane e Matteo Ercolino</p>
    </footer>
  );
}

// ── Match detail modal ────────────────────────────────────────────────────
function MatchDetailModal({ match, onClose }) {
  if (!match) return null;
  const { home, away, hs, as: as_, date, time, status, phase, events = [] } = match;
  const done = status === 'ft';
  const live = status === 'live';
  const hasScore = hs != null;

  const EVENT_ICON = { goal: '⚽', yellow: '🟨', red: '🟥', yellow_red: '🟨🟥' };

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="rm-modal-overlay" onClick={handleOverlayClick}>
      <div className="rm-modal">
        <div className="rm-modal-handle"/>
        <div className="rm-modal-header">
          <span className="rm-modal-phase">{phase || 'Partita'}</span>
          <button className="rm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="rm-modal-score-block">
          <div className="rm-modal-team">
            <div className="rm-modal-team-flag" style={{ borderColor: home?.color || 'var(--brand-green)', fontSize: 24 }}>
              {home?.flag || home?.short || '?'}
            </div>
            <div className="rm-modal-team-name">{home?.name || '?'}</div>
          </div>

          <div className={`rm-modal-scoreline${!hasScore ? ' vs' : ''}`}>
            {hasScore ? `${hs} – ${as_}` : 'VS'}
          </div>

          <div className="rm-modal-team">
            <div className="rm-modal-team-flag" style={{ borderColor: away?.color || 'var(--brand-green)', fontSize: 24 }}>
              {away?.flag || away?.short || '?'}
            </div>
            <div className="rm-modal-team-name">{away?.name || '?'}</div>
          </div>
        </div>

        <div className="rm-modal-meta">
          {date && <span className="rm-modal-meta-item"><CalIcon size={12}/> {date}</span>}
          {time && <span className="rm-modal-meta-item"><ClockIcon size={12}/> {time}</span>}
          {done && <span className="rm-modal-meta-item" style={{ color: 'var(--brand-green)' }}>FT</span>}
          {live && <span className="rm-modal-meta-item" style={{ color: '#ff4444' }}>🔴 LIVE</span>}
        </div>

        {(done || live || events.length > 0) && (
          <div className="rm-modal-events">
            <div className="rm-modal-events-title">Cronaca</div>
            {events.length === 0 ? (
              <div className="rm-modal-no-events">Nessun evento registrato</div>
            ) : (
              <div className="rm-live-events" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                {[...events]
                  .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
                  .map((ev, i) => {
                    const isHome = ev.team === home?.short;
                    const icon = EVENT_ICON[ev.type] || '•';
                    return (
                      <div key={i} className="rm-live-event-row">
                        <div className="rm-lev-home">
                          {isHome && <><span className="rm-lev-name">{ev.player || '—'}</span><span className="rm-lev-icon">{icon}</span></>}
                        </div>
                        <div className="rm-lev-min">{ev.minute != null ? `${ev.minute}'` : '—'}</div>
                        <div className="rm-lev-away">
                          {!isHome && <><span className="rm-lev-icon">{icon}</span><span className="rm-lev-name">{ev.player || '—'}</span></>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export {
  EmptyState,
  Header, BottomNav, StatusStrip, Countdown, SponsorWink, MatchRow, MatchDetailModal, LiveBoard,
  StandingsTable, TeamCard, TopScorers, NewsCard, EventRow, HonorCard, Footer,
  TrophyIcon, BallIcon, CalIcon, PinIcon, UsersIcon, ArrowIcon, ClockIcon,
  BellIcon, InstaIcon, MailIcon, HomeIcon, ZapIcon, GridIcon, MoreHorizIcon,
  StarIcon, NewspaperIcon,
};
