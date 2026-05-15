/* global React, MATCHES_GIORNATA */
/* global EmptyState, MatchRow */

const { useState, useMemo } = React;

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

Object.assign(window, { CalendarScreen });
