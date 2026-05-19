import { useState } from 'react';
import { DEFAULT_STANDINGS_GROUPS, DEFAULT_SCORERS } from '../../data.js';
import { StandingsTable, TopScorers } from '../../components.jsx';

const KO_PHASES = ['Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];
const KO_SET = new Set(KO_PHASES);

export function TableScreen({ data, tournament }) {
  const standingsGroups = tournament?.standings_groups || data?.standings_groups || DEFAULT_STANDINGS_GROUPS || [];
  const scorers         = tournament?.scorers          || data?.scorers          || DEFAULT_SCORERS;
  const matchesGiornata = tournament?.matches_giornata || data?.matches_giornata || [];
  const koPhases = KO_PHASES
    .map(phase => ({ phase, items: (matchesGiornata.find(g => g.day === phase)?.items || []).filter(m => m.status === 'ft' || m.home) }))
    .filter(p => p.items.length > 0);

  return (
    <div data-screen-label="table">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{tournament?.name || 'Aggiornata in tempo reale'}</span>
            <h3 className="rm-section-title">Classifica</h3>
          </div>
        </div>
        {standingsGroups.length === 0 ? (
          <div className="rm-empty"><div className="rm-empty-icon">📊</div><div className="rm-empty-title">Classifica in arrivo</div><div className="rm-empty-sub">I gironi verranno pubblicati dallo staff.</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {standingsGroups.map((g) => (
              <StandingsTable key={g.id} rows={g.rows} group={g.name} updatedLabel="In corso"/>
            ))}
          </div>
        )}
      </section>

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

      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Capocannonieri</span>
            <h3 className="rm-section-title">Marcatori</h3>
          </div>
        </div>
        <TopScorers list={scorers}/>
      </section>
    </div>
  );
}

