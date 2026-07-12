import { useState, useEffect } from 'react';
import { DEFAULT_STANDINGS_GROUPS } from '../../data.js';
import { StandingsTable, EmptyState } from '../../components.jsx';
import { ScorersScreen } from './scorers.jsx';

const KO_PHASES = ['Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];

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

// Pagina "Torneo": classifica, tabellone qualificazione + eliminatorie e
// marcatori in un'unica destinazione con tab interni.
export function TableScreen({ data, tournament, onNav, initialTab }) {
  const standingsGroups = tournament?.standings_groups || data?.standings_groups || DEFAULT_STANDINGS_GROUPS || [];
  const matchesGiornata = tournament?.matches_giornata || data?.matches_giornata || [];
  const bracket         = tournament?.bracket          || data?.bracket          || [];
  const bracketIntro    = tournament?.bracket_intro    || data?.bracket_intro    || '';
  const bracketRounds   = groupBracket(bracket);
  const koPhases = KO_PHASES
    .map(phase => ({ phase, items: (matchesGiornata.find(g => g.day === phase)?.items || []).filter(m => m && (m.status === 'ft' || m.home)) }))
    .filter(p => p.items.length > 0);

  // Fase a gironi conclusa (il giorno dopo l'ultima partita) → la classifica
  // viene etichettata "finale".
  const todayISO = new Date().toISOString().slice(0, 10);
  const groupItems = matchesGiornata.flatMap(g => g.items || []).filter(m => m && m.group_id);
  const groupDates = groupItems
    .map(m => m.date)
    .filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const lastGroupDate = groupDates.length ? groupDates[groupDates.length - 1] : null;
  const allGroupDone = groupItems.length > 0 && groupItems.every(m => m.status === 'ft');
  const groupPhaseOver = allGroupDone && (lastGroupDate ? todayISO > lastGroupDate : true);

  const [tab, setTab] = useState(initialTab || 'classifica');
  useEffect(() => { setTab(initialTab || 'classifica'); }, [initialTab, tournament?.id]);

  const tabs = [
    { id: 'classifica', label: 'Classifica' },
    { id: 'tabellone',  label: 'Tabellone' },
    { id: 'marcatori',  label: 'Marcatori' },
  ];

  return (
    <div data-screen-label="table">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{tournament?.name || 'Rinascita Cup'}</span>
            <h3 className="rm-section-title">Torneo</h3>
          </div>
          {tab === 'classifica' && groupPhaseOver && (
            <span className="rm-eyebrow muted">🏁 Gironi conclusi</span>
          )}
        </div>

        <div className="rm-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`rm-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'classifica' && (
          standingsGroups.length === 0 ? (
            <EmptyState icon="📊" title="Classifica in arrivo" sub="I gironi verranno pubblicati dallo staff."/>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {standingsGroups.map((g) => (
                <StandingsTable key={g.id} rows={g.rows} group={g.name} updatedLabel={groupPhaseOver ? 'Finale' : 'In corso'} qualifyCount={g.qualify_count ?? 2}/>
              ))}
            </div>
          )
        )}

        {tab === 'tabellone' && (
          <>
            {bracketRounds.length === 0 && koPhases.length === 0 && (
              <EmptyState icon="🏆" title="Tabellone in definizione" sub="Gli incroci della fase eliminatoria verranno pubblicati dallo staff."/>
            )}

            {bracketRounds.length > 0 && (
              <div style={{ marginBottom: koPhases.length > 0 ? 28 : 0 }}>
                <div className="rm-section-head">
                  <div>
                    <span className="rm-eyebrow">Fase a eliminazione</span>
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
              </div>
            )}

            {koPhases.length > 0 && (
              <div>
                <div className="rm-section-head">
                  <div>
                    <span className="rm-eyebrow">Risultati e incroci</span>
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
              </div>
            )}
          </>
        )}

        {tab === 'marcatori' && (
          <ScorersScreen data={data} tournament={tournament} embedded/>
        )}
      </section>
    </div>
  );
}
