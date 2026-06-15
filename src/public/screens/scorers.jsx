import { useState } from 'react';
import { DEFAULT_SCORERS } from '../../data.js';
import { EmptyState, TopScorers } from '../../components.jsx';

export function ScorersScreen({ data, tournament }) {
  const scorers = tournament?.scorers || data?.scorers || DEFAULT_SCORERS;
  // Keep each player's real ranking (list is already sorted by goals desc) so a
  // search result still shows the true position, not its index within the filtered list.
  const ranked = scorers.map((s, i) => ({ ...s, _pos: i + 1 }));

  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const filtered = searching ? ranked.filter(s => (s.name || '').toLowerCase().includes(q)) : ranked;
  const suggestions = searching
    ? ranked.filter(s => (s.name || '').toLowerCase().includes(q) && (s.name || '').toLowerCase() !== q).slice(0, 8)
    : [];

  return (
    <div data-screen-label="scorers">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{tournament?.name || 'Capocannonieri'}</span>
            <h3 className="rm-section-title">Marcatori</h3>
          </div>
        </div>

        {scorers.length > 0 && (
          <div className="rm-cal-search">
            <span className="rm-cal-search-icon">🔍</span>
            <input
              className="rm-cal-search-input"
              type="text"
              inputMode="search"
              placeholder="Cerca un giocatore…"
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
            {suggestions.map((s, i) => (
              <button key={s.id || i} className="rm-cal-suggest-chip" onClick={() => setQuery(s.name)}>
                <span className="rm-cal-suggest-flag">{s.flag || s.team || '⚽'}</span>
                {s.name}
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="rm-cal-search-meta">
            {filtered.length} {filtered.length === 1 ? 'giocatore trovato' : 'giocatori trovati'} per «{query.trim()}»
          </div>
        )}

        {searching && filtered.length === 0
          ? <EmptyState icon="🔍" title="Nessun giocatore trovato" sub={`Nessun risultato per «${query.trim()}». Controlla il nome.`} />
          : <TopScorers list={filtered}/>}
      </section>
    </div>
  );
}
