import { DEFAULT_SCORERS } from '../../data.js';
import { TopScorers } from '../../components.jsx';

export function ScorersScreen({ data, tournament }) {
  const scorers = tournament?.scorers || data?.scorers || DEFAULT_SCORERS;

  return (
    <div data-screen-label="scorers">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{tournament?.name || 'Capocannonieri'}</span>
            <h3 className="rm-section-title">Marcatori</h3>
          </div>
        </div>
        <TopScorers list={scorers}/>
      </section>
    </div>
  );
}
