/* global React */
const { useState, useEffect, useMemo } = React;

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

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ current, onNav }) {
  const items = [
    { id: 'home',     label: 'Home' },
    { id: 'live',     label: 'Live' },
    { id: 'calendar', label: 'Calendario' },
    { id: 'table',    label: 'Classifica' },
    { id: 'teams',    label: 'Squadre' },
    { id: 'events',   label: 'Eventi' },
    { id: 'news',     label: 'Avvisi' },
    { id: 'honors',   label: "Albo d'oro" },
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
    { id: 'table',    label: 'Classifica', icon: GridIcon },
  ];

  const more = [
    { id: 'teams',  label: 'Squadre',   icon: UsersIcon },
    { id: 'events', label: 'Eventi',    icon: CalIcon },
    { id: 'news',   label: 'Avvisi',    icon: BellIcon },
    { id: 'honors', label: "Albo d'oro", icon: TrophyIcon },
    { id: '_staff', label: 'Area Staff 🔐', icon: null, isAdmin: true },
  ];

  const isMoreActive = ['teams','events','news','honors'].includes(current);

  function navTo(id) {
    if (id === '_staff') { window.location.href = 'admin.html'; return; }
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
  const src = items && items.length > 0 ? items : (STRIP_ITEMS && STRIP_ITEMS.length > 0 ? STRIP_ITEMS : null);
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
function Countdown({ to }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, to - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="rm-countdown">
      <span className="rm-eyebrow">Calcio d'inizio · 15 Giugno 2026</span>
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
function MatchRow({ home, away, hs, as: as_, date, time, status, pitch, minute }) {
  if (!home || !away) return null;
  const live = status === 'live';
  const done = status === 'ft';
  return (
    <div className={`rm-match ${live ? 'live' : ''} ${done ? 'done' : ''}`}>
      <div className="rm-match-time">
        {live ? (
          <span className="rm-live-tag"><span className="dot"></span>LIVE · {minute}'</span>
        ) : done ? (
          <>
            <span className="date">{date}</span>
            <span className="rm-ft">Finale</span>
          </>
        ) : (
          <>
            <span className="date">{date}</span>
            <span className="time">{time}</span>
          </>
        )}
      </div>
      <div className="rm-match-team rm-match-team--home">
        <span className="rm-team-name">{home.name}</span>
        <span className="rm-crest" style={{ borderColor: home.color || 'var(--brand-green)', color: home.color || 'var(--brand-green)' }}>{home.short}</span>
      </div>
      <div className="rm-match-score">
        {hs != null ? <span>{hs}<i>–</i>{as_}</span> : <span className="rm-vs">VS</span>}
      </div>
      <div className="rm-match-team rm-match-team--away">
        <span className="rm-crest" style={{ borderColor: away.color || 'var(--brand-green)', color: away.color || 'var(--brand-green)' }}>{away.short}</span>
        <span className="rm-team-name">{away.name}</span>
      </div>
      <div className="rm-match-pitch">
        <span>{pitch}</span>
        <b>{home.category || 'Senior'}</b>
      </div>
    </div>
  );
}

// ── Big LIVE board ────────────────────────────────────────────────────────
function LiveBoard({ match }) {
  if (!match || !match.active) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--fg-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
      Nessuna partita in diretta
    </div>
  );
  const { home, away, hs, as: as_, minute, pitch, events = [] } = match;
  if (!home || !away) return null;
  return (
    <div className="rm-live-hero">
      <div className="rm-live-top">
        <span className="rm-live-badge"><span className="dot"></span>In diretta · {minute}'</span>
        <span className="rm-live-pitch">{pitch} · Senior · Giornata 4</span>
      </div>
      <div className="rm-live-board">
        <div className="rm-live-team">
          <div className="rm-live-crest" style={{ borderColor: home.color, color: home.color }}>{home.short}</div>
          <div className="rm-live-team-name">{home.name}</div>
          <div className="rm-live-team-meta">Casa</div>
        </div>
        <div className="rm-live-score">
          <div className="rm-live-score-row">{hs}<i>–</i>{as_}</div>
          <div className="rm-live-min">2° tempo · {minute}'</div>
        </div>
        <div className="rm-live-team">
          <div className="rm-live-crest" style={{ borderColor: away.color, color: away.color }}>{away.short}</div>
          <div className="rm-live-team-name">{away.name}</div>
          <div className="rm-live-team-meta">Ospite</div>
        </div>
      </div>
      {events.length > 0 && (
        <div className="rm-live-events">
          {events.map((e, i) => (
            <div key={i} className="rm-live-event">
              <span className="min">{e.min}'</span>
              <span className="icon">{e.type === 'goal' ? '⚽' : e.type === 'yellow' ? '🟨' : e.type === 'red' ? '🟥' : '↻'}</span>
              <span className="desc"><b>{e.player}</b> · {e.team}{e.note ? ` · ${e.note}` : ''}</span>
            </div>
          ))}
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
        <h3 className="rm-table-title">Girone {group}</h3>
        <span className="rm-eyebrow muted">{updatedLabel}</span>
      </div>
      <div className="rm-table-scroll">
        <table className="rm-table">
          <thead>
            <tr><th>#</th><th>Squadra</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Forma</th><th>Pt</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.short + i} className={i < 2 ? 'top' : ''}>
                <td className="pos">{i + 1}</td>
                <td><div className="rm-team-cell"><span className="rm-crest rm-crest-xs" style={{ borderColor: r.color, color: r.color }}>{r.short}</span>{r.name}</div></td>
                <td>{r.g}</td><td>{r.v}</td><td>{r.n}</td><td>{r.p}</td>
                <td>{r.gf}</td><td>{r.gs}</td><td>{r.gf - r.gs > 0 ? '+' : ''}{r.gf - r.gs}</td>
                <td>
                  <div className="rm-form-pills">
                    {r.form?.map((f, j) => <span key={j} className={`rm-form-pill ${f}`}>{f}</span>)}
                  </div>
                </td>
                <td><span className="rm-pts">{r.pt}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Team card ─────────────────────────────────────────────────────────────
function TeamCard({ team }) {
  return (
    <div className="rm-team-card">
      <div className="rm-team-crest-lg" style={{ borderColor: team.color, color: team.color }}>{team.short}</div>
      <div className="rm-team-meta">
        <div className="rm-team-card-name">{team.name}</div>
        <div className="rm-team-card-sub">{team.category} · Cap. {team.captain}</div>
        <div className="rm-team-stats">
          <span><b>{team.played}</b> G</span>
          <span><b>{team.won}</b> V</span>
          <span><b>{team.goals}</b> GF</span>
          <span className="rm-team-stat-pts"><b>{team.points}</b> Pt</span>
        </div>
      </div>
    </div>
  );
}

// ── Top scorers ───────────────────────────────────────────────────────────
function TopScorers({ list }) {
  return (
    <div className="rm-scorers">
      {list.map((s, i) => (
        <div key={i} className="rm-scorer">
          <div className="rm-scorer-pos">{i + 1}</div>
          <div>
            <div className="rm-scorer-name">{s.name}</div>
            <div className="rm-scorer-team">{s.team}</div>
          </div>
          <span className="rm-crest rm-crest-xs" style={{ borderColor: s.color, color: s.color }}>{s.short}</span>
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
        <span className={`rm-news-cat ${item.tone || ''}`}>{item.cat}</span>
        <span className="rm-news-date">{item.date}</span>
      </div>
      <h4 className="rm-news-title">{item.title}</h4>
      <p className="rm-news-body">{item.body}</p>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────
function EventRow({ ev }) {
  return (
    <div className={`rm-event ${ev.highlight ? 'highlight' : ''}`}>
      <div className="rm-event-date">
        <div className="rm-event-day">{ev.day}</div>
        <div className="rm-event-mon">{ev.month}</div>
      </div>
      <div className="rm-event-body">
        <div className="rm-event-title">{ev.title}</div>
        <div className="rm-event-meta">
          <span><ClockIcon size={13}/>{ev.time}</span>
          <span><PinIcon size={13}/>{ev.where}</span>
          {ev.extra && <span>{ev.extra}</span>}
        </div>
        <span className={`rm-event-cat ${ev.kind}`}>{ev.kindLabel}</span>
      </div>
    </div>
  );
}

// ── Honor card ────────────────────────────────────────────────────────────
function HonorCard({ honor, current }) {
  return (
    <div className={`rm-honor ${current ? 'current' : ''} ${honor.alt ? 'alt' : ''}`}>
      <div className="rm-honor-year">{honor.year}</div>
      <div className="rm-honor-body">
        <h4 className="rm-honor-title">{honor.edition}</h4>
        <div className="rm-honor-list">
          <div className="rm-honor-row"><span>Vincitore</span><b>{honor.winner}</b></div>
          <div className="rm-honor-row"><span>Finalista</span><b>{honor.runner}</b></div>
          <div className="rm-honor-row"><span>Capocann.</span><b>{honor.topScorer}</b></div>
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
            <li><a onClick={() => onNav('events')} style={{ cursor: 'pointer' }}>Eventi</a></li>
            <li><a onClick={() => onNav('news')} style={{ cursor: 'pointer' }}>Avvisi</a></li>
            <li><a onClick={() => onNav('honors')} style={{ cursor: 'pointer' }}>Albo d'oro</a></li>
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
    </footer>
  );
}

Object.assign(window, {
  Header, BottomNav, StatusStrip, Countdown, SponsorWink, MatchRow, LiveBoard,
  StandingsTable, TeamCard, TopScorers, NewsCard, EventRow, HonorCard, Footer,
  TrophyIcon, BallIcon, CalIcon, PinIcon, UsersIcon, ArrowIcon, ClockIcon,
  BellIcon, InstaIcon, MailIcon, HomeIcon, ZapIcon, GridIcon, MoreHorizIcon,
  StarIcon, NewspaperIcon,
});
