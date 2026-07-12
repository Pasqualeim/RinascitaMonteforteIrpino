import { useRef, useState, useEffect } from 'react';
import { DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_STANDINGS_GROUPS, DEFAULT_SCORERS, DEFAULT_NEWS } from '../../data.js';
import { EmptyState, Countdown, LiveBoard, MatchRow, MatchDetailModal, StandingsTable, TopScorers, NewsCard, CalIcon, PinIcon, UsersIcon, ArrowIcon, ZapIcon, TrophyIcon, StarIcon, fmtMatchDate } from '../../components.jsx';
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
          <span className="rm-eyebrow">Per girone</span>
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

const KO_ORDER = ['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];
const KO_SET = new Set(KO_ORDER);
const KO_SHORT = {
  'Sedicesimi di finale': 'Sedicesimi',
  'Ottavi di finale': 'Ottavi',
  'Quarti di finale': 'Quarti',
  'Finale 3°/4° posto': '3°/4° Posto',
};
const KO_PHRASE = {
  'Sedicesimi di finale': 'ai sedicesimi di finale',
  'Ottavi di finale': 'agli ottavi di finale',
  'Quarti di finale': 'ai quarti di finale',
  'Semifinali': 'alle semifinali',
  'Finale 3°/4° posto': 'alla finale 3°/4° posto',
  'Finale': 'alla finalissima',
};

function fmtDateIt(iso) {
  if (!iso) return '';
  const dt = new Date(iso);
  if (isNaN(dt)) return '';
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${dt.getDate()} ${months[dt.getMonth()]}`;
}

// Prossima partita da giocare: prima tra quelle di oggi non finite,
// altrimenti la più vicina nel futuro (data ISO) su tutte le fasi.
function findNextMatch(matchesGiornata, matchesToday) {
  const todayUp = (matchesToday || []).find(m => m && m.status !== 'ft' && m.status !== 'live');
  if (todayUp) return { match: todayUp, isToday: true };
  const todayISO = new Date().toISOString().slice(0, 10);
  const future = [];
  for (const g of matchesGiornata || []) {
    for (const m of g.items || []) {
      if (!m || m.status === 'ft' || m.status === 'live') continue;
      if (!m.date || !/^\d{4}-\d{2}-\d{2}$/.test(m.date) || m.date < todayISO) continue;
      future.push({ ...m, _phaseLabel: m.phase || g.day });
    }
  }
  future.sort((a, b) => `${a.date} ${a.time || '99:99'}`.localeCompare(`${b.date} ${b.time || '99:99'}`));
  return future[0] ? { match: future[0], isToday: future[0].date === todayISO } : null;
}

// Hero oro del giorno della finale: sostituisce la now card standard.
function FinaleHero({ match, onClick }) {
  const tbd = { name: 'Da definire', short: '?', color: 'var(--fg-3)' };
  const home = match.home || tbd;
  const away = match.away || tbd;
  const clickable = !!(match.home && match.away);
  return (
    <button type="button" className="rm-now rm-now--finale" onClick={clickable ? onClick : undefined} style={!clickable ? { cursor: 'default' } : undefined}>
      <div className="rm-finale-eyebrow">🏆 Oggi si assegna la coppa</div>
      <div className="rm-finale-title">Finalissima</div>
      <div className="rm-now-board">
        <span className="rm-now-team">
          <span className="rm-now-flag rm-now-flag--gold">{home.flag || home.short}</span>
          <span className="rm-now-name">{home.name}</span>
        </span>
        <span className="rm-now-vs rm-now-vs--gold">VS</span>
        <span className="rm-now-team">
          <span className="rm-now-flag rm-now-flag--gold">{away.flag || away.short}</span>
          <span className="rm-now-name">{away.name}</span>
        </span>
      </div>
      <div className="rm-now-kick rm-now-kick--gold">
        <span>Calcio d'inizio</span>
        <b>{match.time || 'Orario da definire'}</b>
      </div>
    </button>
  );
}

// Banner campione: dopo il fischio finale la home proclama il vincitore.
// Con punteggio pari (es. rigori non tracciati) mostra solo il risultato.
function ChampionBanner({ finale, third, onClick }) {
  const { home, away, hs, as: as_ } = finale;
  const winner = hs > as_ ? home : as_ > hs ? away : null;
  const thirdWinner = third && third.status === 'ft' && third.home && third.away
    ? (third.hs > third.as ? third.home : third.as > third.hs ? third.away : null)
    : null;
  return (
    <button type="button" className="rm-champion" onClick={onClick}>
      {winner ? (
        <>
          <div className="rm-champion-eyebrow">🏆 Campione del torneo</div>
          <div className="rm-champion-flag">{winner.flag || winner.short}</div>
          <div className="rm-champion-name">{winner.name}</div>
        </>
      ) : (
        <div className="rm-champion-eyebrow">🏆 Finale conclusa</div>
      )}
      <div className="rm-champion-score">
        Finale · {home?.name || home?.short} {hs}–{as_} {away?.name || away?.short}
      </div>
      {thirdWinner && (
        <div className="rm-champion-third">3° posto: {thirdWinner.flag || ''} {thirdWinner.name}</div>
      )}
    </button>
  );
}

// Card "prossima partita" — squadre note o TBD, calcio d'inizio in evidenza.
function NowNextCard({ match, isToday, onClick }) {
  const tbd = { name: 'Da definire', short: '?', color: 'var(--fg-3)' };
  const home = match.home || tbd;
  const away = match.away || tbd;
  const isKo = KO_SET.has(match.phase);
  const clickable = !!(match.home && match.away);
  const Tag = match.phase ? (
    <span className={`rm-match-tag${isKo ? ' rm-match-tag--ko' : ''}`}>
      {isKo && <TrophyIcon size={10}/>}
      {isKo ? (KO_SHORT[match.phase] || match.phase) : match.phase}
    </span>
  ) : null;
  return (
    <button type="button" className="rm-now" onClick={clickable ? onClick : undefined} style={!clickable ? { cursor: 'default' } : undefined}>
      <div className="rm-now-top">
        <span className={`rm-eyebrow${isKo ? ' rm-eyebrow--ko' : ''}`}>
          Prossima partita · {isToday ? 'Oggi' : fmtMatchDate(match.date)}
        </span>
        {Tag}
      </div>
      <div className="rm-now-board">
        <span className="rm-now-team">
          <span className="rm-now-flag" style={{ borderColor: home.color || 'var(--border-1)' }}>{home.flag || home.short}</span>
          <span className="rm-now-name">{home.name}</span>
        </span>
        <span className="rm-now-vs">VS</span>
        <span className="rm-now-team">
          <span className="rm-now-flag" style={{ borderColor: away.color || 'var(--border-1)' }}>{away.flag || away.short}</span>
          <span className="rm-now-name">{away.name}</span>
        </span>
      </div>
      <div className="rm-now-kick">
        <span>Calcio d'inizio</span>
        <b>{match.time || 'Orario da definire'}</b>
      </div>
    </button>
  );
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
  const teams           = tournament?.teams  || d.teams            || [];
  const groups          = tournament?.groups || d.groups           || [];

  // Fase a gironi conclusa → banner "si va ai quarti" (o alla fase KO successiva) in home.
  const groupStageItems = matchesGiornata.flatMap(g => g.items || []).filter(m => m && m.group_id);
  const groupPhaseOver = groupStageItems.length > 0 && groupStageItems.every(m => m.status === 'ft');
  const nextPhase = KO_ORDER
    .map(day => matchesGiornata.find(g => g.day === day))
    .find(g => g && (g.items || []).some(m => m && (m.home || m.away || m.date)));
  const nextPhaseLabel = nextPhase ? (KO_PHRASE[nextPhase.day] || `alla fase ${nextPhase.day}`) : 'alla fase eliminatoria';

  // Partite di oggi in fase eliminatoria → sezione in risalto (eyebrow/titolo oro + badge per riga)
  const todayKoPhases = KO_ORDER.filter(phase => matchesToday.some(m => m.phase === phase));
  const isKoToday = todayKoPhases.length > 0;
  const todayTitle = todayKoPhases.length === 1 ? todayKoPhases[0]
    : todayKoPhases.length > 1 ? todayKoPhases.join(' · ')
    : 'Partite di oggi';

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

  // Prima del calcio d'inizio: hero pieno con countdown. A torneo in corso:
  // masthead compatto, la home apre sulla "now card" (live o prossima partita).
  const preTournament = Number.isFinite(kickoff) && kickoff > Date.now();
  const isLive = !!liveMatch?.active;
  const nextMatch = !isLive ? findNextMatch(matchesGiornata, matchesToday) : null;

  // Giorno della finale: hero oro prima del match, banner campione dopo.
  const todayISO = new Date().toISOString().slice(0, 10);
  const finaleMatch = (matchesGiornata.find(g => g.day === 'Finale')?.items || [])
    .find(m => m && (m.home || m.away));
  const thirdMatch = (matchesGiornata.find(g => g.day === 'Finale 3°/4° posto')?.items || [])
    .find(m => m && (m.home || m.away));
  const finaleIsToday = !!finaleMatch && (finaleMatch.date === todayISO || finaleMatch.date === 'Oggi');
  const finaleDone = !!finaleMatch && finaleMatch.status === 'ft' && finaleMatch.hs != null;
  const finaleLiveNow = matchesToday.some(m => m.phase === 'Finale' && m.status === 'live');
  const showFinaleHero = finaleIsToday && !finaleDone && !finaleLiveNow && !isLive;

  return (
    <div data-screen-label="home">
      {selectedMatch && <MatchDetailModal match={selectedMatch} teams={teams} onClose={() => setSelectedMatch(null)} />}

      {preTournament ? (
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
              <button className="rm-btn rm-btn-primary rm-btn-lg" onClick={() => onNav('calendar')}>
                Calendario <ZapIcon size={17}/>
              </button>
              <button className="rm-btn rm-btn-ghost" onClick={() => onNav('teams')}>
                Squadre
              </button>
            </div>
            <Countdown to={kickoff} label={kickoffLabel}/>
          </div>
        </section>
      ) : (
        <section className="rm-masthead">
          <h1 className="rm-masthead-title">Rinascita <span className="accent">Monteforte</span></h1>
          <p className="rm-masthead-sub">{editionName} · {editionPeriod}</p>
        </section>
      )}

      {finaleDone && (
        <section className="rm-section rm-section--now">
          <ChampionBanner finale={finaleMatch} third={thirdMatch} onClick={() => setSelectedMatch(finaleMatch)}/>
        </section>
      )}

      {groupPhaseOver && !finaleIsToday && !finaleDone && (
        <section className="rm-section" style={{ paddingTop: 0 }}>
          <button
            type="button"
            onClick={() => onNav('calendar')}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: 'rgba(0,230,118,0.06)', border: '1px solid var(--border-card)',
              borderRadius: 12, padding: '14px 16px', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>🏆</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Fase a gironi conclusa</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Si va {nextPhaseLabel} — scopri il calendario</span>
            </span>
            <ArrowIcon size={15}/>
          </button>
        </section>
      )}

      {isLive ? (
        <section className="rm-section rm-section--now">
          <div className="rm-section-head">
            <div>
              <span className={`rm-eyebrow${finaleLiveNow ? ' rm-eyebrow--ko' : ''}`}>{finaleLiveNow ? '🏆 Finalissima in corso' : 'In campo ora'}</span>
              <h3 className="rm-section-title">{finaleLiveNow ? 'Finale' : 'Diretta'}</h3>
            </div>
            <span className="rm-eyebrow muted">Aggiornamento ogni 30s</span>
          </div>
          <LiveBoard match={liveMatch}/>
        </section>
      ) : showFinaleHero ? (
        <section className="rm-section rm-section--now">
          <FinaleHero match={finaleMatch} onClick={() => setSelectedMatch(finaleMatch)}/>
        </section>
      ) : nextMatch && !finaleDone ? (
        <section className="rm-section rm-section--now">
          <NowNextCard
            match={nextMatch.match}
            isToday={nextMatch.isToday}
            onClick={() => setSelectedMatch(nextMatch.match)}
          />
        </section>
      ) : !preTournament && !finaleDone && matchesToday.length === 0 ? (
        <section className="rm-section rm-section--now">
          <EmptyState icon="📅" title="Nessuna partita in programma" sub="Il calendario verrà aggiornato dallo staff."/>
        </section>
      ) : null}

      {matchesToday.length > 0 && (
        <section className="rm-section">
          <div className="rm-section-head">
            <div>
              <span className={`rm-eyebrow${isKoToday ? ' rm-eyebrow--ko' : ''}`}>{isKoToday ? '🏆 Fase eliminatoria' : 'Oggi al campo'}</span>
              <h3 className="rm-section-title">{todayTitle}</h3>
            </div>
            <button className="rm-section-link" onClick={() => onNav('calendar')}>Tutto il calendario <ArrowIcon size={13}/></button>
          </div>
          <div className="rm-match-list">{matchesToday.map((m, i) => {
            const isKo = KO_SET.has(m.phase);
            return (
              <MatchRow
                key={m.id || i}
                {...m}
                tag={isKo ? (KO_SHORT[m.phase] || m.phase) : undefined}
                tagVariant={isKo ? 'ko' : undefined}
                onClick={() => setSelectedMatch(m)}
              />
            );
          })}</div>
        </section>
      )}

      {/* Classifica in home solo a gironi in corso: conclusi, vive nella pagina Torneo. */}
      {standGroups.length > 0 && !groupPhaseOver && (
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

      {news.length > 0 && (
        <section className="rm-section">
          <div className="rm-section-head">
            <div>
              <span className="rm-eyebrow">Avvisi · Aggiornamenti</span>
              <h3 className="rm-section-title">Bacheca</h3>
            </div>
            <button className="rm-section-link" onClick={() => onNav('news')}>Tutti gli avvisi <ArrowIcon size={13}/></button>
          </div>
          <div className="rm-news-grid">{news.slice(0, 2).map((n, i) => <NewsCard key={n.id || i} item={n} featured={i === 0}/>)}</div>
        </section>
      )}

      {(() => {
        const tournaments = (data?.tournaments || []).filter(Boolean);
        const anyPrize = tournaments.some(t => {
          const prizes = Array.isArray(t.prizes) && t.prizes.length > 0
            ? t.prizes
            : [t.prize_first, t.prize_second, t.prize_third].filter(v => v > 0);
          return prizes.length > 0;
        });
        if (!anyPrize) return null;
        return (
          <section className="rm-section">
            <div className="rm-section-head">
              <div>
                <span className="rm-eyebrow">Montepremi 2026</span>
                <h3 className="rm-section-title">Premi & quote</h3>
              </div>
            </div>
            {tournaments.map(t => {
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
            })}
          </section>
        );
      })()}

    </div>
  );
}
