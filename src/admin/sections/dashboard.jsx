import { GridIcon, BellIcon, CalIcon, StarIcon, UsersIcon } from '../shared.jsx';

export function DashboardSection({ data, editionId, tournamentId, tournamentCategories, setTab }) {
  const liveMatch = data.live_match || {};
  const todayMatches = (data.matches_today || []).filter(m => !liveMatch.active || m.status !== 'live');
  const activeCategory = tournamentCategories.find(t => t.id === tournamentId);

  const groupsCount   = (data.groups || []).length;
  const teamsCount    = (data.teams || []).length;
  const newsCount     = (data.news || []).length;
  const matchesTotal = (data.matches_giornata || []).reduce((n, g) => n + (g.items || []).length, 0);
  const matchesFt    = (data.matches_giornata || []).flatMap(g => g.items || []).filter(m => m.status === 'ft').length;
  const scorersCount = (data.scorers || []).length;

  return (
    <div>
      <div className="adm-eyebrow" style={{ marginTop: 10 }}>
        Gestione torneo
      </div>
      <h2 className="adm-section-title" style={{ margin: 0 }}>{data.edition?.name || 'Rinascita Cup 2026'}</h2>
      <p className="adm-section-sub">{data.edition?.location || 'Campo Sportivo Monteforte Irpino'}</p>

      {tournamentCategories.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 4 }}>
          {activeCategory && (
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 6 }}>
              Stai gestendo: <strong style={{ color: 'var(--brand-green)' }}>{activeCategory.name}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tournamentCategories.map(t => {
              const isActive = t.id === tournamentId;
              return (
                <span key={t.id} style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                  background: isActive ? 'var(--brand-green)' : 'rgba(0,230,118,0.08)',
                  border: `1px solid ${isActive ? 'var(--brand-green)' : 'var(--border-brand)'}`,
                  color: isActive ? '#000' : 'var(--brand-green)',
                }}>
                  {t.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, marginBottom: 20 }}>
        {[
          { label: 'Gironi', value: groupsCount, tab: 'gironi' },
          { label: 'Squadre', value: teamsCount, tab: 'teams' },
          { label: 'Partite', value: `${matchesFt}/${matchesTotal}`, tab: 'matches' },
        ].map(s => (
          <div key={s.label} onClick={() => setTab(s.tab)} style={{
            flex: '1 1 calc(50% - 4px)', minWidth: 0, background: 'var(--bg-surface)',
            borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border-1)',
            textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--brand-green)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {(liveMatch.active || todayMatches.length > 0) && (
        <div className="adm-card" style={{ marginBottom: 20, marginTop: allDone ? 16 : 0 }}>
          <div className="adm-card-header">
            <span className="adm-card-title">🗓️ Oggi</span>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setTab('matches')}>Tutte le partite</button>
          </div>
          <div style={{ padding: '0 16px 4px' }}>
            {liveMatch.active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-1)' }}>
                <span style={{ fontSize: 12, color: '#FF3D3D', fontWeight: 700, flexShrink: 0 }}>🔴 LIVE</span>
                <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>
                  {liveMatch.home?.short} {liveMatch.hs ?? 0}–{liveMatch.as ?? 0} {liveMatch.away?.short}
                  <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 6 }}>{liveMatch.minute}'</span>
                </span>
                <button className="adm-btn adm-btn-sm" style={{ fontSize: 12 }} onClick={() => setTab('live')}>Gestisci →</button>
              </div>
            )}
            {todayMatches.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-1)' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', flexShrink: 0, minWidth: 40 }}>{m.time || '--:--'}</span>
                <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>{m.home?.short} vs {m.away?.short}</span>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ fontSize: 12 }} onClick={() => setTab('matches')}>Aggiorna</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="adm-eyebrow" style={{ marginTop: 4 }}>Preparazione pre-torneo</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Setup Torneo</h3>
      <div className="adm-grid-menu" style={{ marginBottom: 24 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('teams')}>
          <UsersIcon size={28}/><span>Squadre</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('gironi')}>
          <GridIcon size={28}/><span>Gironi</span>
        </button>
      </div>

      <div className="adm-eyebrow">Durante la giornata</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Regia Giornata</h3>
      <div className="adm-grid-menu" style={{ marginBottom: 24 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('matches')}>
          <CalIcon size={28}/><span>Partite</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('standings')}>
          <GridIcon size={28}/><span>Classifica</span>
        </button>
      </div>

      <div className="adm-eyebrow">Sito pubblico</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Portale</h3>
      <div className="adm-grid-menu">
        <button type="button" className="adm-grid-btn" onClick={() => setTab('news')}>
          <BellIcon size={28}/><span>Avvisi</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('events')}>
          <CalIcon size={28}/><span>Regolamento</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('sponsors')}>
          <StarIcon size={28}/><span>Sponsor</span>
        </button>
      </div>
    </div>
  );
}
