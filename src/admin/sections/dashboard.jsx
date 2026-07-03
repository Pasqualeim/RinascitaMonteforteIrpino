import { GridIcon, CalIcon, StarIcon, UsersIcon, BallIcon, TrophyIcon, CardIcon, BracketIcon } from '../shared.jsx';

export function DashboardSection({ data, onSave, onRefresh, editionId, tournamentId, tournamentCategories, setTab }) {
  const liveMatch = data.live_match || {};
  const activeCategory = tournamentCategories.find(t => t.id === tournamentId);

  const groupsCount  = (data.groups || []).length;
  const teamsCount   = (data.teams || []).length;
  const allMatches   = (data.matches_giornata || []).flatMap(g => g.items || []);
  const matchesTotal = allMatches.length;
  const matchesFt    = allMatches.filter(m => m.status === 'ft').length;
  // Breakdown per fase — colpo d'occhio su gironi vs eliminatorie senza dover aprire i tab.
  const groupMatches   = allMatches.filter(m => m.group_id);
  const knockoutMatches = allMatches.filter(m => !m.group_id);
  const groupFt     = groupMatches.filter(m => m.status === 'ft').length;
  const knockoutFt  = knockoutMatches.filter(m => m.status === 'ft').length;

  return (
    <div>
      <div className="adm-eyebrow" style={{ marginTop: 10 }}>Gestione torneo</div>
      <h2 className="adm-section-title" style={{ margin: 0 }}>{data.edition?.name || 'Rinascita Cup 2026'}</h2>
      <p className="adm-section-sub">{data.edition?.location || 'Campo Sportivo Monteforte Irpino'}</p>

      {activeCategory && (
        <div style={{ marginTop: 10, marginBottom: 4, fontSize: 12, color: 'var(--fg-3)' }}>
          Stai gestendo: <strong style={{ color: 'var(--brand-green)' }}>{activeCategory.name}</strong>
        </div>
      )}

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, marginBottom: 20 }}>
        {[
          { label: 'Gironi', value: groupsCount, tab: 'gironi' },
          { label: 'Squadre', value: teamsCount, tab: 'teams' },
          { label: 'Giocate', value: `${matchesFt}/${matchesTotal}`, tab: 'matches' },
        ].map(s => (
          <div key={s.label} onClick={() => setTab(s.tab)} style={{
            flex: '1 1 calc(33% - 6px)', minWidth: 0, background: 'var(--bg-surface)',
            borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border-1)',
            textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--brand-green)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Avanzamento per fase — barra di progresso, colpo d'occhio senza aprire i tab */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        {[
          { key: 'girone', label: 'Fase a gironi', ft: groupFt, total: groupMatches.length, tab: 'matches' },
          { key: 'ko', label: 'Fase eliminatoria', ft: knockoutFt, total: knockoutMatches.length, tab: 'komatches' },
        ].map((p, i) => {
          const pct = p.total > 0 ? Math.round((p.ft / p.total) * 100) : 0;
          const done = p.total > 0 && p.ft === p.total;
          const statusLabel = p.total === 0 ? 'Nessuna partita' : done ? '✓ Completata' : p.ft === 0 ? 'In programma' : 'In corso';
          const statusColor = done ? 'var(--brand-green)' : p.total === 0 ? 'var(--fg-3)' : 'var(--fg-2)';
          return (
            <div
              key={p.key}
              onClick={() => setTab(p.tab)}
              style={{ padding: '13px 16px', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.label}</span>
                <span style={{ fontSize: 11, color: statusColor, fontWeight: 600, flexShrink: 0 }}>{statusLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--border-1)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand-green)', borderRadius: 999, transition: 'width 300ms ease' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', flexShrink: 0, minWidth: 38, textAlign: 'right' }}>{p.ft}/{p.total}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Gestione torneo, raggruppata per fase ── */}
      <h3 className="adm-section-title" style={{ marginBottom: 4 }}>Gestione torneo</h3>

      {/* 1 · Preparazione */}
      <div className="adm-eyebrow" style={{ marginTop: 14 }}>1 · Preparazione</div>
      <div className="adm-grid-menu" style={{ marginBottom: 18 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('teams')}><UsersIcon size={28}/><span>Squadre</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('gironi')}><GridIcon size={28}/><span>Gironi</span></button>
      </div>

      {/* 2 · Fase a gironi */}
      <div className="adm-eyebrow">2 · Fase a gironi</div>
      <div className="adm-grid-menu" style={{ marginBottom: 18 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('matches')}><CalIcon size={28}/><span>Partite gironi</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('standings')}><TrophyIcon size={28}/><span>Classifica</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('scorersgirone')}><BallIcon size={28}/><span>Marcatori gironi</span></button>
      </div>

      {/* 3 · Fase a eliminazione */}
      <div className="adm-eyebrow">3 · Fase a eliminazione</div>
      <div className="adm-grid-menu" style={{ marginBottom: 18 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('bracket')}><BracketIcon size={28}/><span>Qualificazione</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('komatches')}><CalIcon size={28}/><span>Partite eliminatorie</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('scorers')}><BallIcon size={28}/><span>Marcatori eliminatorie</span></button>
      </div>

      {/* 4 · Statistiche */}
      <div className="adm-eyebrow">4 · Statistiche</div>
      <div className="adm-grid-menu" style={{ marginBottom: 24 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('discipline')}><CardIcon size={28}/><span>Cartellini</span></button>
      </div>

      {/* Live attiva */}
      {liveMatch.active && (
        <div className="adm-card" style={{ marginBottom: 16, border: '1px solid rgba(255,61,61,0.4)', background: 'rgba(255,61,61,0.04)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#FF3D3D', fontWeight: 700, flexShrink: 0 }}>🔴 LIVE</span>
            <span style={{ fontSize: 16, fontFamily: 'var(--font-display)', color: '#fff', flex: 1, letterSpacing: '0.04em' }}>
              {liveMatch.home?.short} {liveMatch.hs ?? 0}–{liveMatch.as ?? 0} {liveMatch.away?.short}
              <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 8, fontFamily: 'inherit' }}>{liveMatch.minute}'</span>
            </span>
            <button className="adm-btn adm-btn-sm" onClick={() => setTab('live')}>Gestisci →</button>
          </div>
        </div>
      )}

      {/* Portale */}
      <div className="adm-eyebrow">Sito pubblico</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Portale</h3>
      <div className="adm-grid-menu">
        <button type="button" className="adm-grid-btn" onClick={() => setTab('events')}><CalIcon size={28}/><span>Regolamento</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('iscrizioni')}><StarIcon size={28}/><span>Iscrizioni</span></button>
      </div>
    </div>
  );
}
