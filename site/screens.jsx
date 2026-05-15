/* global React, window, MATCHES_GIORNATA, MATCHES_TODAY, LIVE_MATCH, STANDINGS_GROUPS, TEAMS, SCORERS, NEWS, EVENTS, HONORS, SPONSORS, STRIP_ITEMS, GROUPS */
const { useState, useMemo } = React;

function EmptyState({ icon, title, sub }) {
  return (
    <div className="rm-empty">
      <div className="rm-empty-icon">{icon}</div>
      <div className="rm-empty-title">{title}</div>
      {sub && <div className="rm-empty-sub">{sub}</div>}
    </div>
  );
}

function HomeScreen({ onNav, data }) {
  const d = data || {};
  const liveMatch    = d.live_match       || LIVE_MATCH;
  const matchesToday = d.matches_today    || MATCHES_TODAY;
  const standingsGroups = d.standings_groups || STANDINGS_GROUPS || [];
  const standingsA      = standingsGroups[0]?.rows || [];
  const scorers      = d.scorers          || SCORERS;
  const news         = d.news             || NEWS;
  const sponsors     = d.sponsors         || SPONSORS;
  const kickoff = new Date('2026-06-15T20:00:00+02:00').getTime();

  return (
    <div data-screen-label="home">
      <section className="rm-hero">
        <div className="rm-hero-glow"></div>
        <div className="rm-hero-inner">
          <SponsorWink/>
          <h1 className="rm-hero-title">Rinascita<br/><span className="accent">Monteforte</span></h1>
          <h2 className="rm-hero-sub">Cup 2026 · 3ª Edizione</h2>
          <p className="rm-hero-meta">
            <span><CalIcon size={15}/> 15 Giugno – 15 Luglio</span>
            <span><PinIcon size={15}/> Campo Sportivo, Monteforte Irpino</span>
            <span><UsersIcon size={15}/> 10 squadre · 3 categorie</span>
          </p>
          <div className="rm-hero-ctas">
            <button className="rm-btn rm-btn-primary rm-btn-lg" onClick={() => onNav('live')}>
              Risultati live <ZapIcon size={17}/>
            </button>
            <button className="rm-btn rm-btn-ghost" onClick={() => onNav('calendar')}>
              Calendario
            </button>
          </div>
          <Countdown to={kickoff}/>
        </div>
      </section>

      {liveMatch?.active && (
        <section className="rm-section">
          <div className="rm-section-head">
            <div>
              <span className="rm-eyebrow">In campo ora</span>
              <h3 className="rm-section-title">Partita Live</h3>
            </div>
            <button className="rm-section-link" onClick={() => onNav('live')}>Apri live <ArrowIcon size={13}/></button>
          </div>
          <LiveBoard match={liveMatch}/>
        </section>
      )}

      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Oggi al campo</span>
            <h3 className="rm-section-title">Partite di oggi</h3>
          </div>
          <button className="rm-section-link" onClick={() => onNav('calendar')}>Tutto il calendario <ArrowIcon size={13}/></button>
        </div>
        {matchesToday.length === 0
          ? <EmptyState icon="📅" title="Nessuna partita oggi" sub="Le partite verranno pubblicate dallo staff."/>
          : <div className="rm-match-list">{matchesToday.map((m, i) => <MatchRow key={m.id || i} {...m}/>)}</div>
        }
      </section>

      <section className="rm-section">
        <div className="rm-two-col">
          <div>
            <div className="rm-section-head">
              <div>
                <span className="rm-eyebrow">{standingsGroups[0]?.name || 'Girone A'}</span>
                <h3 className="rm-section-title">Classifica</h3>
              </div>
              <button className="rm-section-link" onClick={() => onNav('table')}>Tutti i gironi <ArrowIcon size={13}/></button>
            </div>
            <StandingsTable rows={standingsA} group={standingsGroups[0]?.name || 'A'} updatedLabel="In corso"/>
          </div>
          <div>
            <div className="rm-section-head">
              <div>
                <span className="rm-eyebrow">Capocannonieri</span>
                <h3 className="rm-section-title" style={{ fontSize: 'clamp(26px,6vw,44px)' }}>Marcatori</h3>
              </div>
            </div>
            <TopScorers list={scorers}/>
          </div>
        </div>
      </section>

      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Avvisi · Aggiornamenti</span>
            <h3 className="rm-section-title">Bacheca</h3>
          </div>
          <button className="rm-section-link" onClick={() => onNav('news')}>Tutti gli avvisi <ArrowIcon size={13}/></button>
        </div>
        <div className="rm-news-grid">
          {news.slice(0, 4).map((n, i) => <NewsCard key={n.id || i} item={n} featured={i === 0}/>)}
        </div>
      </section>

      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Montepremi 2026</span>
            <h3 className="rm-section-title">Premi & quote</h3>
          </div>
        </div>
        <div className="rm-prize-row">
          <div className="rm-prize gold">
            <TrophyIcon size={36}/>
            <div className="rm-prize-place">1° Posto Senior</div>
            <div className="rm-prize-amt">1.000€</div>
            <div className="rm-prize-foot">+ coppa + medaglie</div>
          </div>
          <div className="rm-prize">
            <TrophyIcon size={28}/>
            <div className="rm-prize-place">2° Posto Senior</div>
            <div className="rm-prize-amt">400€</div>
            <div className="rm-prize-foot">+ medaglie</div>
          </div>
          <div className="rm-prize alt">
            <div className="rm-prize-place">Iscrizione Senior</div>
            <div className="rm-prize-amt">250€</div>
            <div className="rm-prize-foot">per squadra · arbitraggio incluso</div>
          </div>
        </div>
      </section>

      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Hanno detto sì</span>
            <h3 className="rm-section-title">Sponsor</h3>
          </div>
        </div>
        <div className="rm-sponsors">
          {sponsors.map((s, i) => (
            <div key={s.id || i} className="rm-sponsor-card">
              <div className="rm-sponsor-name">{s.name}</div>
              <div className="rm-sponsor-tag">{s.tag}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LiveScreen({ data }) {
  const liveMatch    = data?.live_match    || LIVE_MATCH;
  const matchesToday = data?.matches_today || MATCHES_TODAY;
  return (
    <div data-screen-label="live">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">In diretta</span>
            <h3 className="rm-section-title">Live</h3>
          </div>
          <span className="rm-eyebrow muted">Aggiornamento ogni 30s</span>
        </div>
        <LiveBoard match={liveMatch}/>
      </section>
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Ultimi 90 minuti</span>
            <h3 className="rm-section-title">Oggi</h3>
          </div>
        </div>
        {matchesToday.length === 0
          ? <EmptyState icon="⚡" title="Nessuna partita in corso" sub="Quando inizia una partita, il live comparirà qui."/>
          : <div className="rm-match-list">{matchesToday.map((m, i) => <MatchRow key={m.id || i} {...m}/>)}</div>
        }
      </section>
    </div>
  );
}

function CalendarScreen({ data }) {
  const matchesGiornata = data?.matches_giornata || MATCHES_GIORNATA;
  const allPhases = matchesGiornata.map(g => g.day);
  const [selPhase, setSelPhase] = useState('all');

  const filtered = useMemo(() =>
    selPhase === 'all' ? matchesGiornata : matchesGiornata.filter(g => g.day === selPhase),
    [selPhase, matchesGiornata]
  );

  return (
    <div data-screen-label="calendar">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Stagione 2026</span>
            <h3 className="rm-section-title">Calendario</h3>
          </div>
        </div>
        {allPhases.length > 1 && (
          <div className="rm-tabs">
            <button className={`rm-tab ${selPhase === 'all' ? 'on' : ''}`} onClick={() => setSelPhase('all')}>Tutte</button>
            {allPhases.map(p => (
              <button key={p} className={`rm-tab ${selPhase === p ? 'on' : ''}`} onClick={() => setSelPhase(p)}>{p}</button>
            ))}
          </div>
        )}
        {filtered.length === 0
          ? <EmptyState icon="📅" title="Calendario non ancora disponibile" sub="Lo staff pubblicherà il calendario delle partite a breve."/>
          : filtered.map((d, i) => (
            <div className="rm-match-day" key={i}>
              <div className="rm-match-day-head">
                <div className="rm-match-day-num">{d.day}</div>
                <div className="rm-match-day-date">{d.items.length} partite</div>
              </div>
              <div className="rm-match-list">
                {d.items.map((m, j) => <MatchRow key={m.id || j} {...m}/>)}
              </div>
            </div>
          ))
        }
      </section>
    </div>
  );
}

function TableScreen({ data }) {
  const standingsGroups = data?.standings_groups || STANDINGS_GROUPS || [];
  const scorers         = data?.scorers          || SCORERS;
  const [selIdx, setSelIdx] = useState(0);
  const rowStyle = { fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff', marginBottom: 10 };

  return (
    <div data-screen-label="table">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Aggiornata in tempo reale</span>
            <h3 className="rm-section-title">Classifica</h3>
          </div>
        </div>
        {standingsGroups.length === 0 ? (
          <div className="rm-empty"><div className="rm-empty-icon">📊</div><div className="rm-empty-title">Classifica in arrivo</div><div className="rm-empty-sub">I gironi verranno pubblicati dallo staff.</div></div>
        ) : standingsGroups.length === 1 ? (
          <div><div style={rowStyle}>{standingsGroups[0].name}</div><StandingsTable rows={standingsGroups[0].rows} group={standingsGroups[0].name} updatedLabel="In corso"/></div>
        ) : (
          <div>
            <div className="rm-tabs" style={{ marginBottom: 16 }}>
              {standingsGroups.map((g, i) => (
                <button key={g.id} className={`rm-tab ${selIdx === i ? 'on' : ''}`} onClick={() => setSelIdx(i)}>{g.name}</button>
              ))}
            </div>
            {standingsGroups.map((g, i) => (
              selIdx === i && (
                <div key={g.id}><div style={rowStyle}>{g.name}</div><StandingsTable rows={g.rows} group={g.name} updatedLabel="In corso"/></div>
              )
            ))}
          </div>
        )}
      </section>
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Capocannonieri 2026</span>
            <h3 className="rm-section-title">Marcatori</h3>
          </div>
        </div>
        <TopScorers list={scorers}/>
      </section>
    </div>
  );
}

function TeamsScreen({ data }) {
  const [selGroup, setSelGroup] = useState('all');
  const teams = data?.teams || TEAMS;
  const groups = data?.groups || GROUPS || [];

  const filtered = useMemo(() => {
    if (selGroup === 'all') return teams;
    if (selGroup === 'none') return teams.filter(t => !window.rmGetTeamGroupId(t));
    return teams.filter(t => window.rmGetTeamGroupId(t) === selGroup);
  }, [selGroup, teams]);

  const tabs = [
    { id: 'all', label: `Tutte (${teams.length})` },
    ...groups.map(g => ({ id: g.id, label: `${g.name} (${teams.filter(t => window.rmGetTeamGroupId(t) === g.id).length})` })),
  ];

  return (
    <div data-screen-label="teams">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{filtered.length} squadre · 2026</span>
            <h3 className="rm-section-title">Squadre</h3>
          </div>
        </div>
        {tabs.length > 1 && (
          <div className="rm-tabs">
            {tabs.map(t => <button key={t.id} className={`rm-tab ${selGroup===t.id?'on':''}`} onClick={() => setSelGroup(t.id)}>{t.label}</button>)}
          </div>
        )}
        {filtered.length === 0
          ? <EmptyState icon="👥" title="Nessuna squadra" sub="Le squadre partecipanti verranno pubblicate dallo staff."/>
          : <div className="rm-team-grid">{filtered.map(t => <TeamCard key={t.short} team={t}/>)}</div>
        }
      </section>
    </div>
  );
}

function EventsScreen({ data }) {
  const events = data?.events || EVENTS;
  return (
    <div data-screen-label="events">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Tornei · Cerimonie · Feste</span>
            <h3 className="rm-section-title">Eventi 2026</h3>
          </div>
        </div>
        {events.length === 0
          ? <EmptyState icon="🗓" title="Nessun evento" sub="Gli eventi del torneo verranno pubblicati a breve."/>
          : <div className="rm-events">{events.map((e, i) => <EventRow key={e.id || i} ev={e}/>)}</div>
        }
      </section>
    </div>
  );
}

function NewsScreen({ data }) {
  const news = data?.news || NEWS;
  return (
    <div data-screen-label="news">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Bacheca ufficiale</span>
            <h3 className="rm-section-title">Avvisi & News</h3>
          </div>
        </div>
        {news.length === 0
          ? <EmptyState icon="📢" title="Nessun avviso" sub="Gli avvisi e le notizie del torneo verranno pubblicati qui."/>
          : <div className="rm-news-grid">{news.map((n, i) => <NewsCard key={n.id || i} item={n} featured={i === 0}/>)}</div>
        }
      </section>
    </div>
  );
}

function HonorsScreen({ data }) {
  const honors = data?.honors || HONORS;
  return (
    <div data-screen-label="honors">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Le edizioni passate</span>
            <h3 className="rm-section-title">Albo d'oro</h3>
          </div>
        </div>
        {honors.length === 0
          ? <EmptyState icon="🏆" title="Albo d'oro vuoto" sub="Le edizioni passate verranno aggiunte dallo staff."/>
          : <div className="rm-honors">{honors.map((h, i) => <HonorCard key={h.id || i} honor={h} current={i===0}/>)}</div>
        }
      </section>
    </div>
  );
}

Object.assign(window, { HomeScreen, LiveScreen, CalendarScreen, TableScreen, TeamsScreen, EventsScreen, NewsScreen, HonorsScreen });
