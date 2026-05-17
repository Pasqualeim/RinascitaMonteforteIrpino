import { DEFAULT_LIVE_MATCH } from '../../data.js';
import { EmptyState, LiveBoard, MatchRow } from '../../components.jsx';

export function LiveScreen({ data, tournament }) {
  const liveMatch = tournament?.live_match || data?.live_match || DEFAULT_LIVE_MATCH;
  const today = new Date().toISOString().slice(0, 10);
  const allMatches = tournament?.matches || data?.matches || [];
  const matchesToday = allMatches.filter(m => m.date === today || m.status === 'live').slice(0, 10);
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

