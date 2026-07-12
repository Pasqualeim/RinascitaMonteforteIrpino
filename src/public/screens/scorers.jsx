import { useState } from 'react';
import { DEFAULT_SCORERS } from '../../data.js';
import { EmptyState, TopScorers } from '../../components.jsx';

// `embedded`: renderizzata dentro la pagina Torneo (tab Marcatori) — niente
// wrapper di sezione né titolo proprio. Senza prop resta una schermata autonoma.
export function ScorersScreen({ data, tournament, embedded }) {
  const scorersKo = tournament?.scorers || data?.scorers || DEFAULT_SCORERS;
  const scorersGirone = tournament?.scorers_girone || data?.scorers_girone || [];

  // 'ko' = classifica marcatori ufficiale (solo gol da fasi eliminatorie) · 'girone' =
  // lista informativa gol fase a gironi, non ufficiale.
  const [phase, setPhase] = useState('ko');
  const scorers = phase === 'girone' ? scorersGirone : scorersKo;
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

  const inner = (
    <>
        <div className="rm-tabs">
          <button className={`rm-tab ${phase === 'ko' ? 'on' : ''}`} onClick={() => { setPhase('ko'); setQuery(''); }}>Eliminatorie</button>
          <button className={`rm-tab ${phase === 'girone' ? 'on' : ''}`} onClick={() => { setPhase('girone'); setQuery(''); }}>Gironi</button>
        </div>

        {phase === 'girone' && (
          <p style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5, margin: '0 0 14px' }}>
            I gol segnati durante la fase a gironi non saranno validi ai fini della classifica marcatori. Il conteggio inizierà esclusivamente dalle fasi eliminatorie.
          </p>
        )}

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
    </>
  );

  if (embedded) return inner;

  return (
    <div data-screen-label="scorers">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{tournament?.name || 'Capocannonieri'}</span>
            <h3 className="rm-section-title">Marcatori</h3>
          </div>
        </div>
        {inner}
      </section>
    </div>
  );
}
