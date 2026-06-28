import { useState } from 'react';
import { DEFAULT_STANDINGS_GROUPS, DEFAULT_SCORERS } from '../../data.js';
import { StandingsTable, TopScorers, ArrowIcon } from '../../components.jsx';

const KO_PHASES = ['Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];
const KO_SET = new Set(KO_PHASES);

// Raggruppa gli incroci del tabellone per fase, preservando l'ordine di sort_order.
function groupBracket(ties) {
  const sorted = [...ties].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const order = [];
  const map = {};
  for (const t of sorted) {
    const r = t.round || 'Fase';
    if (!map[r]) { map[r] = []; order.push(r); }
    map[r].push(t);
  }
  return order.map(round => ({ round, ties: map[round] }));
}

export function TableScreen({ data, tournament, onNav }) {
  const standingsGroups = tournament?.standings_groups || data?.standings_groups || DEFAULT_STANDINGS_GROUPS || [];
  const scorers         = tournament?.scorers          || data?.scorers          || DEFAULT_SCORERS;
  const matchesGiornata = tournament?.matches_giornata || data?.matches_giornata || [];
  const bracket         = tournament?.bracket          || data?.bracket          || [];
  const bracketIntro    = tournament?.bracket_intro    || data?.bracket_intro    || '';
  const bracketRounds   = groupBracket(bracket);
  const koPhases = KO_PHASES
    .map(phase => ({ phase, items: (matchesGiornata.find(g => g.day === phase)?.items || []).filter(m => m && (m.status === 'ft' || m.home)) }))
    .filter(p => p.items.length > 0);

  // Transizione di fase automatica: la classifica gironi si "chiude" a tendina
  // il giorno DOPO l'ultima partita di girone, lasciando spazio alla fase successiva.
  const todayISO = new Date().toISOString().slice(0, 10);
  const groupItems = matchesGiornata.flatMap(g => g.items || []).filter(m => m && m.group_id);
  const groupDates = groupItems
    .map(m => m.date)
    .filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const lastGroupDate = groupDates.length ? groupDates[groupDates.length - 1] : null;
  const allGroupDone = groupItems.length > 0 && groupItems.every(m => m.status === 'ft');
  const groupPhaseOver = allGroupDone && (lastGroupDate ? todayISO > lastGroupDate : true);
  const hasNextPhase = bracketRounds.length > 0 || koPhases.length > 0;
  const collapseStandings = groupPhaseOver && hasNextPhase;

  // null = segue lo stato automatico; true/false = scelta manuale dell'utente.
  const [standingsOverride, setStandingsOverride] = useState(null);
  const standingsOpen = standingsOverride !== null ? standingsOverride : !collapseStandings;

  return (
    <div data-screen-label="table">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{collapseStandings ? '🏁 Fase a gironi conclusa' : (tournament?.name || 'Aggiornata in tempo reale')}</span>
            <h3 className="rm-section-title">Classifica{collapseStandings ? ' finale' : ''}</h3>
          </div>
          {collapseStandings && standingsGroups.length > 0 && (
            <button className="rm-section-link" onClick={() => setStandingsOverride(!standingsOpen)} aria-expanded={standingsOpen}>
              {standingsOpen ? 'Nascondi' : 'Mostra'}
              <span aria-hidden="true" style={{ display: 'inline-block', marginLeft: 6, transition: 'transform 240ms ease', transform: standingsOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
          )}
        </div>

        {collapseStandings && !standingsOpen && standingsGroups.length > 0 && (
          <button
            type="button"
            onClick={() => setStandingsOverride(true)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: 'rgba(0,230,118,0.05)', border: '1px solid var(--border-card)',
              borderRadius: 12, padding: '13px 16px', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>🏁</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Gironi conclusi · Classifiche finali</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>Spazio alla fase successiva qui sotto ↓ · tocca per rivedere</span>
            </span>
            <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--brand-green)' }}>▾</span>
          </button>
        )}

        {standingsGroups.length === 0 ? (
          <div className="rm-empty"><div className="rm-empty-icon">📊</div><div className="rm-empty-title">Classifica in arrivo</div><div className="rm-empty-sub">I gironi verranno pubblicati dallo staff.</div></div>
        ) : (
          <div style={{
            maxHeight: standingsOpen ? 8000 : 0,
            opacity: standingsOpen ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 480ms cubic-bezier(0.4,0,0.2,1), opacity 320ms ease',
            marginTop: standingsOpen && collapseStandings ? 14 : 0,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {standingsGroups.map((g) => (
                <StandingsTable key={g.id} rows={g.rows} group={g.name} updatedLabel={collapseStandings ? 'Finale' : 'In corso'} qualifyCount={g.qualify_count ?? 2}/>
              ))}
            </div>
          </div>
        )}
      </section>

      {bracketRounds.length > 0 && (
        <section className="rm-section">
          <div className="rm-section-head">
            <div>
              <span className="rm-eyebrow">{tournament?.name || 'Fase a eliminazione'}</span>
              <h3 className="rm-section-title">Come ci si qualifica</h3>
            </div>
          </div>
          {bracketIntro && (
            <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, margin: '0 0 14px' }}>{bracketIntro}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bracketRounds.map(({ round, ties }) => {
              const isFinal = /finale/i.test(round) && !/semi|pre|3/i.test(round);
              const accent = isFinal ? 'var(--brand-gold)' : 'var(--brand-green)';
              return (
                <div key={round} style={{ background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                  <div style={{ padding: '9px 16px', borderBottom: '1px solid var(--border-card)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>
                      {isFinal ? '🏆 ' : ''}{round}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>
                    {ties.map((t, i) => {
                      const boxStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px 8px', borderRadius: 8, border: `1px solid ${accent}`, background: isFinal ? 'rgba(245,197,24,0.06)' : 'rgba(0,230,118,0.06)', fontSize: 13, fontWeight: 600, color: '#fff', minHeight: 38 };
                      return (
                        <div key={t.id || i} style={{ display: 'grid', gridTemplateColumns: ties.length > 1 ? '22px 1fr auto 1fr' : '1fr auto 1fr', alignItems: 'stretch', gap: 8 }}>
                          {ties.length > 1 && (
                            <span style={{ alignSelf: 'center', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 15, color: accent, lineHeight: 1 }}>{i + 1}</span>
                          )}
                          <div style={boxStyle}>{t.home_label || 'TBD'}</div>
                          <span style={{ alignSelf: 'center', fontFamily: 'var(--font-display)', fontSize: 14, color: accent, letterSpacing: '0.06em', padding: '0 2px' }}>VS</span>
                          <div style={boxStyle}>{t.away_label || 'TBD'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {koPhases.length > 0 && (
        <section className="rm-section">
          <div className="rm-section-head">
            <div>
              <span className="rm-eyebrow">{tournament?.name || ''}</span>
              <h3 className="rm-section-title">Eliminatorie</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {koPhases.map(({ phase, items }) => (
              <div key={phase} style={{ background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                <div style={{ padding: '8px 16px 4px', borderBottom: '1px solid var(--border-card)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: phase === 'Finale' ? 'var(--brand-gold)' : 'var(--fg-3)' }}>
                    {phase === 'Finale' ? '🏆 ' : ''}{phase}
                  </span>
                </div>
                {items.map((m, i) => {
                  const home = m.home || {};
                  const away = m.away || {};
                  const isDone = m.status === 'ft';
                  return (
                    <div key={m.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border-card)' : 'none' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{home.flag || ''} {home.name || home.short || 'TBD'}</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 54 }}>
                        {isDone ? (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--brand-green)', letterSpacing: 2 }}>{m.hs}–{m.as}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>vs</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{away.flag || ''} {away.name || away.short || 'TBD'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {scorers.length > 0 && (
        <section className="rm-section">
          <div className="rm-section-head">
            <div>
              <span className="rm-eyebrow">{scorers.length > 3 ? 'Top 3 Capocannonieri' : 'Capocannonieri'}</span>
              <h3 className="rm-section-title">Marcatori</h3>
            </div>
            {onNav && (
              <button className="rm-section-link" onClick={() => onNav('scorers')}>Tutti i marcatori <ArrowIcon size={13}/></button>
            )}
          </div>
          {scorers.length > 3 ? (
            <div className="rm-scorers-peek" onClick={onNav ? () => onNav('scorers') : undefined} title="Vedi tutti i marcatori">
              <TopScorers list={scorers.slice(0, 4)}/>
            </div>
          ) : (
            <TopScorers list={scorers}/>
          )}
        </section>
      )}
    </div>
  );
}

