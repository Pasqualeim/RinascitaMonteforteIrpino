import { useState } from 'react';
import { DEFAULT_STANDINGS_GROUPS, DEFAULT_SCORERS } from '../../data.js';
import { StandingsTable, TopScorers } from '../../components.jsx';

export function TableScreen({ data }) {
  const standingsGroups = data?.standings_groups || DEFAULT_STANDINGS_GROUPS || [];
  const scorers         = data?.scorers          || DEFAULT_SCORERS;
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

