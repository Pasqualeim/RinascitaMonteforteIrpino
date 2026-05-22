import { DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_STANDINGS_GROUPS, DEFAULT_SCORERS, DEFAULT_NEWS, DEFAULT_SPONSORS } from '../../data.js';
import { EmptyState, Countdown, LiveBoard, MatchRow, StandingsTable, TopScorers, NewsCard, CalIcon, PinIcon, UsersIcon, ArrowIcon, ZapIcon, TrophyIcon } from '../../components.jsx';
import { rmDeriveMatchesToday } from '../../domain.js';

function fmtDateIt(iso) {
  if (!iso) return '';
  const dt = new Date(iso);
  if (isNaN(dt)) return '';
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${dt.getDate()} ${months[dt.getMonth()]}`;
}

export function HomeScreen({ onNav, data, tournament }) {
  const d = data || {};
  const liveMatch       = tournament?.live_match       || d.live_match       || DEFAULT_LIVE_MATCH;
  const matchesGiornata = tournament?.matches_giornata || [];
  const matchesToday    = matchesGiornata.length > 0
    ? rmDeriveMatchesToday(matchesGiornata)
    : (d.matches_today || DEFAULT_MATCHES_TODAY);
  const standingsGroups = tournament?.standings_groups || d.standings_groups || DEFAULT_STANDINGS_GROUPS || [];
  const standingsA      = standingsGroups[0]?.rows || [];
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
      <section className="rm-hero">
        <div className="rm-hero-glow"></div>
        <div className="rm-hero-inner">
          <h1 className="rm-hero-title">Rinascita<br/><span className="accent">Monteforte</span></h1>
          <h2 className="rm-hero-sub">{editionName}</h2>
          <p className="rm-hero-meta">
            <span><CalIcon size={15}/> {editionPeriod}</span>
            <span><PinIcon size={15}/> Campo Sportivo, Monteforte Irpino</span>
            <span><UsersIcon size={15}/> {teams.length > 0 ? `${teams.length} squadre · ${groups.length} gironi` : 'Iscrizioni aperte'}</span>
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
        {(data?.tournaments || []).map(t => {
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
            {(data?.tournaments?.length > 1) && (
              <div className="rm-eyebrow" style={{ marginBottom: 12 }}>{t.name}</div>
            )}
            <div className="rm-prize-row">
              {prizes.map((p, i) => (
                <div key={i} className={`rm-prize${i === 0 ? ' gold' : i >= 2 ? ' alt' : ''}`}>
                  {i < 2 && <TrophyIcon size={i === 0 ? 36 : 28}/>}
                  {p.label && <div className="rm-prize-place">{p.label}</div>}
                  <div className="rm-prize-amt">{Number(p.amount).toLocaleString('it-IT')}€</div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </section>

    </div>
  );
}

