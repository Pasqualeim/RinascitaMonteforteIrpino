import { useState, useMemo } from 'react';
import { DEFAULT_MATCHES_GIORNATA } from '../../data.js';
import { EmptyState, MatchRow } from '../../components.jsx';

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

  const showGroupPhases = selPhase === 'all'
    ? groupPhases
    : KNOCKOUT_SET.has(selPhase) ? [] : rawGiornata.filter(g => g.day === selPhase);

  const showKnockoutPhases = selPhase === 'all'
    ? knockoutPhases
    : KNOCKOUT_SET.has(selPhase) ? rawGiornata.filter(g => g.day === selPhase) : [];

  const hasAny = [...groupPhases, ...knockoutPhases].some(g => g.items?.length > 0);

  return (
    <div data-screen-label="calendar">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Stagione 2026</span>
            <h3 className="rm-section-title">Calendario</h3>
          </div>
        </div>

        {allTabs.length > 1 && (
          <div className="rm-tabs">
            {allTabs.map(t => (
              <button key={t.id} className={`rm-tab ${selPhase === t.id ? 'on' : ''}`} onClick={() => setSelPhase(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {!hasAny ? (
          <EmptyState icon="📅" title="Calendario non ancora disponibile" sub="Lo staff pubblicherà il calendario delle partite a breve." />
        ) : (
          <>
            {showGroupPhases.map(g => (
              <div className="rm-match-day" key={g.day}>
                <div className="rm-match-day-head">
                  <div className="rm-match-day-num">{g.day}</div>
                  <div className="rm-match-day-date">{g.items.length} {g.items.length === 1 ? 'partita' : 'partite'}</div>
                </div>
                <div className="rm-match-list">
                  {g.items.map((m, j) => <MatchRow key={m.id || j} {...m} />)}
                </div>
              </div>
            ))}

            {showKnockoutPhases.length > 0 && selPhase === 'all' && groupPhases.length > 0 && (
              <div className="rm-ko-divider">
                <span>🏆 Fase eliminatoria</span>
              </div>
            )}

            {showKnockoutPhases.map(g => {
              const allTbd = g.items.length > 0 && g.items.every(m => !m.home && !m.away && !m.date && !m.time);
              return (
                <div className="rm-match-day" key={g.day}>
                  <div className="rm-match-day-head">
                    <div className="rm-match-day-num rm-ko-phase">{g.day}</div>
                    <div className="rm-match-day-date">{g.items.length} {g.items.length === 1 ? 'partita' : 'partite'}</div>
                  </div>
                  {allTbd ? (
                    <div className="rm-ko-notice">
                      <span className="rm-ko-notice-icon">📅</span>
                      <span>Date e abbinamenti da definire — aggiornamento a breve dopo la fase a gironi</span>
                    </div>
                  ) : (
                    <div className="rm-match-list">
                      {g.items.map((m, j) => <MatchRow key={m.id || j} {...m} />)}
                    </div>
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
