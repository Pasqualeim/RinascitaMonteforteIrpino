import { useState, useMemo, useEffect } from 'react';
import { DEFAULT_MATCHES_GIORNATA } from '../../data.js';
import { EmptyState, MatchRow, MatchDetailModal, rmDateParts } from '../../components.jsx';

// Group a phase's matches into ordered date buckets (chronological, TBD last)
function groupByDate(items) {
  const buckets = new Map();
  for (const m of items) {
    const key = m?.date || '__tbd__';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(m);
  }
  const sortVal = (key) => {
    if (key === '__tbd__') return Infinity;
    const d = new Date(key + 'T12:00:00');
    return isNaN(d) ? Infinity - 1 : d.getTime(); // "Oggi" literal etc. just before TBD
  };
  return [...buckets.entries()]
    .sort((a, b) => sortVal(a[0]) - sortVal(b[0]))
    .map(([key, list]) => ({ key, items: list, parts: rmDateParts(key) }));
}

// Prominent date band header for a calendar date bucket
function DateBand({ parts, tbd }) {
  if (tbd) return (
    <div className="rm-cal-date rm-cal-date--tbd">
      <span className="rm-cal-date-main">Data da definire</span>
    </div>
  );
  if (!parts) return null;
  if (parts.rel) return (
    <div className={`rm-cal-date rm-cal-date--rel${parts.rel === 'Oggi' ? ' rm-cal-date--today' : ''}`}>
      <span className="rm-cal-date-rel">{parts.rel}</span>
      {parts.day && (
        <span className="rm-cal-date-stack">
          <span className="rm-cal-date-main">{parts.weekday}</span>
          <span className="rm-cal-date-sub">{parts.day} {parts.monthLong}</span>
        </span>
      )}
    </div>
  );
  return (
    <div className="rm-cal-date">
      <span className="rm-cal-date-num">{parts.day}</span>
      <span className="rm-cal-date-stack">
        <span className="rm-cal-date-main">{parts.weekday}</span>
        <span className="rm-cal-date-sub">{parts.monthLong}</span>
      </span>
    </div>
  );
}

const KNOCKOUT_ORDER = [
  'Sedicesimi di finale',
  'Ottavi di finale',
  'Quarti di finale',
  'Semifinali',
  'Finale 3°/4° posto',
  'Finale',
];
const KNOCKOUT_SET = new Set(KNOCKOUT_ORDER);

const TAB_SHORT = {
  'Quarti di finale': 'Quarti',
  'Ottavi di finale': 'Ottavi',
  'Sedicesimi di finale': 'Sedicesimi',
  'Finale 3°/4° posto': '3°/4° Posto',
};

export function CalendarScreen({ data, tournament }) {
  const rawGiornata = tournament?.matches_giornata || data?.matches_giornata || DEFAULT_MATCHES_GIORNATA;

  // Known group names from tournament data
  const groupNames = useMemo(() => {
    const groups = tournament?.groups || data?.groups || [];
    return new Set(groups.map(g => g.name));
  }, [tournament, data]);

  // A phase is a group phase if it matches a known group name (or its Andata/Ritorno variant)
  // A phase is a knockout phase only if it's in KNOCKOUT_SET
  // Everything else (Round di X, etc.) is silently ignored
  function isGroupPhase(day) {
    if (!day || KNOCKOUT_SET.has(day)) return false;
    if (groupNames.size === 0) return true; // fallback: show all non-knockout when groups not loaded
    if (groupNames.has(day)) return true;
    const base = day.split(' · ')[0];
    return base !== day && groupNames.has(base);
  }

  const groupPhases = useMemo(() =>
    rawGiornata.filter(g => isGroupPhase(g.day)).sort((a, b) => a.day.localeCompare(b.day)),
    [rawGiornata, groupNames]
  );
  const knockoutPhases = useMemo(() =>
    rawGiornata.filter(g => KNOCKOUT_SET.has(g.day))
      .sort((a, b) => KNOCKOUT_ORDER.indexOf(a.day) - KNOCKOUT_ORDER.indexOf(b.day)),
    [rawGiornata]
  );

  const allTabs = useMemo(() => [
    { id: 'all', label: 'Tutte' },
    ...groupPhases.map(g => ({ id: g.day, label: g.day })),
    ...knockoutPhases.map(g => ({ id: g.day, label: TAB_SHORT[g.day] || g.day })),
  ], [groupPhases, knockoutPhases]);

  const [selPhase, setSelPhase] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [query, setQuery] = useState('');
  const [calView, setCalView] = useState('next'); // 'next' | 'played' (only in "Tutte" view)

  useEffect(() => { setSelPhase('all'); setQuery(''); setCalView('next'); }, [tournament?.id]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  function matchHit(m) {
    if (!searching) return true;
    return [m?.home?.name, m?.home?.short, m?.away?.name, m?.away?.short]
      .some(f => f && f.toLowerCase().includes(q));
  }

  // Unique teams appearing in the calendar (for search suggestions)
  const allTeams = useMemo(() => {
    const map = new Map();
    for (const g of rawGiornata) for (const m of (g.items || [])) {
      for (const t of [m?.home, m?.away]) {
        if (t && t.short && t.name && !map.has(t.short)) map.set(t.short, t);
      }
    }
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [rawGiornata]);

  // Suggestions while typing — partial name/short matches, excluding an exact pick
  const suggestions = searching
    ? allTeams.filter(t =>
        (t.name.toLowerCase().includes(q) || (t.short || '').toLowerCase().includes(q))
        && t.name.toLowerCase() !== q
      ).slice(0, 8)
    : [];

  // "Tutte" tab and search are cross-girone views → one flat chronological list,
  // each match tagged with the girone/phase it belongs to. Per-girone tabs keep the
  // grouped-by-phase layout below.
  const flatView = selPhase === 'all' || searching;
  const flatMatches = useMemo(() => {
    const out = [];
    for (const g of [...groupPhases, ...knockoutPhases])
      for (const m of (g.items || [])) if (m) out.push({ ...m, _phaseLabel: g.day });
    return out;
  }, [groupPhases, knockoutPhases]);

  // While searching, span all phases (ignore selected tab) so a team's matches surface everywhere
  const showGroupPhases = searching ? groupPhases : selPhase === 'all'
    ? groupPhases
    : KNOCKOUT_SET.has(selPhase) ? [] : rawGiornata.filter(g => g.day === selPhase);

  const showKnockoutPhases = searching ? knockoutPhases : selPhase === 'all'
    ? knockoutPhases
    : KNOCKOUT_SET.has(selPhase) ? rawGiornata.filter(g => g.day === selPhase) : [];

  const hasAny = [...groupPhases, ...knockoutPhases].some(g => g.items?.length > 0);
  const hitCount = searching
    ? [...groupPhases, ...knockoutPhases].reduce((n, g) => n + (g.items || []).filter(matchHit).length, 0)
    : null;

  return (
    <div data-screen-label="calendar">
      {selectedMatch && <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Stagione 2026</span>
            <h3 className="rm-section-title">Calendario</h3>
          </div>
        </div>

        {hasAny && (
          <div className="rm-cal-search">
            <span className="rm-cal-search-icon">🔍</span>
            <input
              className="rm-cal-search-input"
              type="text"
              inputMode="search"
              placeholder="Cerca una squadra…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="rm-cal-search-clear" onClick={() => setQuery('')} aria-label="Cancella ricerca">✕</button>
            )}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="rm-cal-suggest">
            {suggestions.map(t => (
              <button key={t.short} className="rm-cal-suggest-chip" onClick={() => setQuery(t.name)}>
                <span className="rm-cal-suggest-flag">{t.flag || t.short}</span>
                {t.name}
              </button>
            ))}
          </div>
        )}

        {!searching && allTabs.length > 1 && (
          <div className="rm-tabs">
            {allTabs.map(t => (
              <button key={t.id} className={`rm-tab ${selPhase === t.id ? 'on' : ''}`} onClick={() => setSelPhase(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="rm-cal-search-meta">
            {hitCount} {hitCount === 1 ? 'partita trovata' : 'partite trovate'} per «{query.trim()}»
          </div>
        )}

        {!hasAny ? (
          <EmptyState icon="📅" title="Calendario non ancora disponibile" sub="Lo staff pubblicherà il calendario delle partite a breve." />
        ) : searching && hitCount === 0 ? (
          <EmptyState icon="🔍" title="Nessuna partita trovata" sub={`Nessun risultato per «${query.trim()}». Controlla il nome della squadra.`} />
        ) : flatView ? (
          (() => {
            const timeVal = t => t ? Number(String(t).replace(':', '')) : 9999;
            const renderable = flatMatches.filter(m => matchHit(m) && ((m.home && m.away) || m.date || m.time));
            // Surface what's next: upcoming/live first (chronological), already-played moved
            // to a collapsible "Già giocate" block at the bottom (most recent first).
            const upcoming = renderable.filter(m => m.status !== 'ft').sort((a, b) => timeVal(a.time) - timeVal(b.time));
            const played   = renderable.filter(m => m.status === 'ft').sort((a, b) => timeVal(b.time) - timeVal(a.time));
            const upGroups = groupByDate(upcoming);
            const playedGroups = groupByDate(played).reverse(); // most recent date first

            const renderGroups = (groups, emptyTitle) =>
              groups.length === 0
                ? <EmptyState icon="📅" title={emptyTitle} />
                : groups.map(dg => (
                    <div className="rm-cal-dategroup" key={dg.key}>
                      <DateBand parts={dg.parts} tbd={dg.key === '__tbd__'} />
                      <div className="rm-match-list">
                        {dg.items.map((m, j) => (
                          <MatchRow key={m.id || j} {...m} hideDate tag={m._phaseLabel} onClick={() => setSelectedMatch(m)} />
                        ))}
                      </div>
                    </div>
                  ));

            // While searching, show everything (both upcoming and played) so no result
            // is hidden behind the toggle.
            if (searching) {
              return (
                <>
                  {upcoming.length > 0 && (<>{played.length > 0 && <div className="rm-cal-grouplabel">Prossime partite</div>}{renderGroups(upGroups)}</>)}
                  {played.length > 0 && (<><div className="rm-cal-grouplabel">Già giocate</div>{renderGroups(playedGroups)}</>)}
                </>
              );
            }

            // "Tutte" view: segmented toggle so results are one tap away — no scrolling
            // past every upcoming match to reach the played ones.
            return (
              <>
                <div className="rm-seg">
                  <button className={`rm-seg-btn ${calView === 'next' ? 'on' : ''}`} onClick={() => setCalView('next')}>
                    Prossime{upcoming.length ? ` · ${upcoming.length}` : ''}
                  </button>
                  <button className={`rm-seg-btn ${calView === 'played' ? 'on' : ''}`} onClick={() => setCalView('played')}>
                    Già giocate{played.length ? ` · ${played.length}` : ''}
                  </button>
                </div>
                {calView === 'next'
                  ? renderGroups(upGroups, 'Nessuna partita in programma')
                  : renderGroups(playedGroups, 'Nessuna partita ancora giocata')}
              </>
            );
          })()
        ) : (
          <>
            {showGroupPhases.map(g => {
              const items = (g.items || []).filter(matchHit);
              if (items.length === 0) return null;
              const dateGroups = groupByDate(items);
              return (
                <div className="rm-match-day" key={g.day}>
                  <div className="rm-match-day-head">
                    <div className="rm-match-day-num">{g.day}</div>
                    <div className="rm-match-day-date">{items.length} {items.length === 1 ? 'partita' : 'partite'}</div>
                  </div>
                  {dateGroups.map(dg => (
                    <div className="rm-cal-dategroup" key={dg.key}>
                      <DateBand parts={dg.parts} tbd={dg.key === '__tbd__'} />
                      <div className="rm-match-list">
                        {dg.items.map((m, j) => <MatchRow key={m.id || j} {...m} hideDate onClick={() => setSelectedMatch(m)} />)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {showKnockoutPhases.some(g => (g.items || []).some(matchHit))
              && showGroupPhases.some(g => (g.items || []).some(matchHit))
              && (selPhase === 'all' || searching) && (
              <div className="rm-ko-divider">
                <span>🏆 Fase eliminatoria</span>
              </div>
            )}

            {showKnockoutPhases.map(g => {
              const items = (g.items || []).filter(matchHit);
              if (items.length === 0) return null;
              const allTbd = items.length > 0 && items.every(m => m && !m.home && !m.away && !m.date && !m.time);
              const dateGroups = groupByDate(items);
              return (
                <div className="rm-match-day" key={g.day}>
                  <div className="rm-match-day-head">
                    <div className="rm-match-day-num rm-ko-phase">{g.day}</div>
                    <div className="rm-match-day-date">{items.length} {items.length === 1 ? 'partita' : 'partite'}</div>
                  </div>
                  {allTbd ? (
                    <div className="rm-ko-notice">
                      <span className="rm-ko-notice-icon">📅</span>
                      <span>Date e abbinamenti da definire — aggiornamento a breve dopo la fase a gironi</span>
                    </div>
                  ) : (
                    dateGroups.map(dg => (
                      <div className="rm-cal-dategroup" key={dg.key}>
                        <DateBand parts={dg.parts} tbd={dg.key === '__tbd__'} />
                        <div className="rm-match-list">
                          {dg.items.map((m, j) => <MatchRow key={m.id || j} {...m} hideDate onClick={() => setSelectedMatch(m)} />)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}
