import { DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_STANDINGS_GROUPS, DEFAULT_SCORERS, DEFAULT_NEWS, DEFAULT_SPONSORS } from '../../data.js';
import { EmptyState, Countdown, SponsorWink, LiveBoard, MatchRow, StandingsTable, TopScorers, NewsCard, CalIcon, PinIcon, UsersIcon, ArrowIcon, ZapIcon, TrophyIcon } from '../../components.jsx';

export function HomeScreen({ onNav, data }) {
  const d = data || {};
  const liveMatch       = d.live_match       || DEFAULT_LIVE_MATCH;
  const matchesToday    = d.matches_today    || DEFAULT_MATCHES_TODAY;
  const standingsGroups = d.standings_groups || DEFAULT_STANDINGS_GROUPS || [];
  const standingsA      = standingsGroups[0]?.rows || [];
  const scorers         = d.scorers          || DEFAULT_SCORERS;
  const news            = d.news             || DEFAULT_NEWS;
  const sponsors        = d.sponsors         || DEFAULT_SPONSORS;
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

