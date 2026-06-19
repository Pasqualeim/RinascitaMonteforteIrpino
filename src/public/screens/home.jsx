import { useRef, useState, useEffect } from 'react';
import { DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_STANDINGS_GROUPS, DEFAULT_SCORERS, DEFAULT_NEWS, DEFAULT_SPONSORS } from '../../data.js';
import { EmptyState, Countdown, LiveBoard, MatchRow, MatchDetailModal, StandingsTable, TopScorers, NewsCard, CalIcon, PinIcon, UsersIcon, ArrowIcon, ZapIcon, TrophyIcon, StarIcon } from '../../components.jsx';
import { rmDeriveMatchesToday } from '../../domain.js';

// Swipeable standings: one girone per slide, native horizontal scroll-snap + tab shortcuts
function StandingsCarousel({ groups, onNav }) {
  const scroller = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    if (scroller.current) scroller.current.scrollLeft = 0;
  }, [groups.length]);

  function onScroll() {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }
  function goTo(i) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <div>
      <div className="rm-section-head">
        <div>
          <span className="rm-eyebrow">Classifica per girone</span>
          <h3 className="rm-section-title">Classifica</h3>
        </div>
        <button className="rm-section-link" onClick={() => onNav('table')}>Tutti i gironi <ArrowIcon size={13}/></button>
      </div>
      {groups.length > 1 && (
        <div className="rm-tabs rm-stand-tabs">
          {groups.map((g, i) => (
            <button key={g.id || i} className={`rm-tab ${i === active ? 'on' : ''}`} onClick={() => goTo(i)}>
              {g.name || `Girone ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <div className="rm-stand-carousel" ref={scroller} onScroll={onScroll}>
        {groups.map((g, i) => (
          <div className="rm-stand-slide" key={g.id || i}>
            <StandingsTable rows={g.rows || []} group={g.name || 'A'} updatedLabel="In corso" qualifyCount={g.qualify_count ?? 2}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtDateIt(iso) {
  if (!iso) return '';
  const dt = new Date(iso);
  if (isNaN(dt)) return '';
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${dt.getDate()} ${months[dt.getMonth()]}`;
}

export function HomeScreen({ onNav, data, tournament }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const d = data || {};
  const liveMatch       = tournament?.live_match       || d.live_match       || DEFAULT_LIVE_MATCH;
  const matchesGiornata = tournament?.matches_giornata || [];
  const matchesToday    = matchesGiornata.length > 0
    ? rmDeriveMatchesToday(matchesGiornata)
    : (d.matches_today || DEFAULT_MATCHES_TODAY);
  const standingsGroups = tournament?.standings_groups || d.standings_groups || DEFAULT_STANDINGS_GROUPS || [];
  const standGroups     = standingsGroups.filter(g => (g?.rows?.length || 0) > 0);
  const scorers         = tournament?.scorers          || d.scorers          || DEFAULT_SCORERS;
  const news            = d.news             || DEFAULT_NEWS;
  const sponsors        = d.sponsors         || DEFAULT_SPONSORS;
  const teams           = tournament?.teams  || d.teams            || [];
  const groups          = tournament?.groups || d.groups           || [];

  // Edition metadata — dynamic from bootstrap, hardcoded defaults as fallback
  const edition          = d.edition || {};
  const firstTournament  = (Array.isArray(d.tournaments) && d.tournaments[0]) || {};
  const editionName  = edition.name        || 'Cup 2026 · 3ª Edizione';
  const kickoffIso   = edition.kickoff_date || '2026-06-15T20:00:00+02:00';
  const kickoff      = new Date(kickoffIso).getTime();
  const startFmt     = fmtDateIt(edition.start_date) || '15 Giugno';
  const endFmt       = fmtDateIt(edition.end_date)   || '15 Luglio';
  const editionPeriod = `${startFmt} – ${endFmt}`;
  // Prizes live on tournament, not edition (schema v3)
  const prize1 = firstTournament.prize_first  ?? 1000;
  const prize2 = firstTournament.prize_second ?? 400;
  const prize3 = firstTournament.prize_third  ?? 250;
  const kickoffLabel = `Calcio d'inizio · ${fmtDateIt(kickoffIso) || '15 Giugno 2026'}`;

  return (
    <div data-screen-label="home">
      {selectedMatch && <MatchDetailModal match={selectedMatch} teams={teams} onClose={() => setSelectedMatch(null)} />}
      <section className="rm-hero">
        <div className="rm-hero-glow"></div>
        <div className="rm-hero-inner">
          <h1 className="rm-hero-title">Rinascita<br/><span className="accent">Monteforte</span></h1>
          <h2 className="rm-hero-sub">{editionName}</h2>
          <p className="rm-hero-meta">
            <span><CalIcon size={15}/> {editionPeriod}</span>
            <a href="https://maps.app.goo.gl/J3ktHpMgRxqWJ34eA" target="_blank" rel="noopener noreferrer" className="rm-hero-location-link"><PinIcon size={15}/> Campo Sportivo, Monteforte Irpino</a>
            {teams.length > 0
              ? <span><UsersIcon size={15}/> {teams.length} squadre · {groups.length} gironi</span>
              : <button className="rm-hero-meta-link" onClick={() => onNav('registrations')}><UsersIcon size={15}/> Iscrizioni aperte →</button>
            }
          </p>
          <div className="rm-hero-ctas">
            <button className="rm-btn rm-btn-primary rm-btn-lg" onClick={() => onNav('live')}>
              Risultati live <ZapIcon size={17}/>
            </button>
            <button className="rm-btn rm-btn-ghost" onClick={() => onNav('calendar')}>
              Calendario
            </button>
          </div>
          <Countdown to={kickoff} label={kickoffLabel}/>
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
          : <div className="rm-match-list">{matchesToday.map((m, i) => <MatchRow key={m.id || i} {...m} onClick={() => setSelectedMatch(m)}/>)}</div>
        }
      </section>

      {standGroups.length > 0 && (
        <section className="rm-section">
          <StandingsCarousel groups={standGroups} onNav={onNav}/>
        </section>
      )}

      {scorers.length > 0 && (
        <section className="rm-section">
          <div className="rm-section-head">
            <div>
              <span className="rm-eyebrow">{scorers.length > 5 ? 'Top 5 Capocannonieri' : 'Capocannonieri'}</span>
              <h3 className="rm-section-title">Marcatori</h3>
            </div>
            <button className="rm-section-link" onClick={() => onNav('scorers')}>Tutti i marcatori <ArrowIcon size={13}/></button>
          </div>
          {scorers.length > 5 ? (
            <div className="rm-scorers-peek" onClick={() => onNav('scorers')} title="Vedi tutti i marcatori">
              <TopScorers list={scorers.slice(0, 5)}/>
            </div>
          ) : (
            <TopScorers list={scorers}/>
          )}
        </section>
      )}

      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Avvisi · Aggiornamenti</span>
            <h3 className="rm-section-title">Bacheca</h3>
          </div>
          <button className="rm-section-link" onClick={() => onNav('news')}>Tutti gli avvisi <ArrowIcon size={13}/></button>
        </div>
        {news.length === 0
          ? <EmptyState icon="📢" title="Nessun avviso" sub="Gli avvisi del torneo verranno pubblicati qui."/>
          : <div className="rm-news-grid">{news.slice(0, 4).map((n, i) => <NewsCard key={n.id || i} item={n} featured={i === 0}/>)}</div>
        }
      </section>

      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Montepremi 2026</span>
            <h3 className="rm-section-title">Premi & quote</h3>
          </div>
        </div>
        {(() => {
          const tournaments = (data?.tournaments || []).filter(Boolean);
          const anyPrize = tournaments.some(t => {
            const prizes = Array.isArray(t.prizes) && t.prizes.length > 0
              ? t.prizes
              : [t.prize_first, t.prize_second, t.prize_third].filter(v => v > 0);
            return prizes.length > 0;
          });
          if (!anyPrize) return (
            <EmptyState icon="🏆" title="Montepremi in definizione" sub="Lo staff pubblicherà a breve i premi per ogni categoria."/>
          );
          return tournaments.map(t => {
            const prizes = Array.isArray(t.prizes) && t.prizes.length > 0
              ? t.prizes
              : [
                  t.prize_first  > 0 ? { label: '1° Posto', amount: t.prize_first  } : null,
                  t.prize_second > 0 ? { label: '2° Posto', amount: t.prize_second } : null,
                  t.prize_third  > 0 ? { label: '3° Posto', amount: t.prize_third  } : null,
                ].filter(Boolean);
            if (!prizes.length) return null;
            return (
              <div key={t.id} style={{ marginBottom: 20 }}>
                {(tournaments.length > 1) && (
                  <div className="rm-eyebrow" style={{ marginBottom: 12 }}>{t.name}</div>
                )}
                <div className="rm-prize-row">
                  {prizes.map((p, i) => {
                    const amount = Number(p.amount) || 0;
                    const isMoney = amount > 0;
                    const cls = isMoney ? `rm-prize${i === 0 ? ' gold' : ''}` : 'rm-prize rm-prize--honor';
                    return (
                      <div key={i} className={cls}>
                        {isMoney ? (
                          <>
                            <TrophyIcon size={i === 0 ? 36 : 28}/>
                            {p.label && <div className="rm-prize-place">{p.label}</div>}
                            <div className="rm-prize-amt">{amount.toLocaleString('it-IT')}€</div>
                          </>
                        ) : (
                          <>
                            <StarIcon size={24}/>
                            <div className="rm-prize-place">Premio d'onore</div>
                            <div className="rm-prize-honor-name">{p.label}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </section>

    </div>
  );
}

