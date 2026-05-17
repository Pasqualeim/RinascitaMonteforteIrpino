import { GridIcon, ZapIcon, BellIcon, CalIcon, StarIcon, TrophyIcon, UsersIcon } from '../shared.jsx';

export function DashboardSection({ data, editionId, tournamentId, tournamentCategories, setTab }) {
  const liveMatch = data.live_match || {};
  const todayMatches = (data.matches_today || []).filter(m => !liveMatch.active || m.status !== 'live');
  const activeCategory = tournamentCategories.find(t => t.id === tournamentId);

  const checks = [
    { done: (data.groups || []).length > 0,                                          label: 'Gironi configurati',    tab: 'gironi' },
    { done: (data.teams || []).length >= 2,                                          label: 'Squadre registrate',    tab: 'teams' },
    { done: (data.matches_giornata || []).some(g => (g.items || []).length > 0),     label: 'Calendario inserito',   tab: 'matches' },
    { done: (data.news || []).length > 0,                                            label: 'Bacheca con avvisi',    tab: 'news' },
  ];
  const progress = checks.filter(c => c.done).length;
  const allDone  = progress === checks.length;
  const matchesTotal = (data.matches_giornata || []).reduce((n, g) => n + (g.items || []).length, 0);
  const matchesFt    = (data.matches_giornata || []).flatMap(g => g.items || []).filter(m => m.status === 'ft').length;

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
              {(activeCategory.prize_first || 0) > 0 && (
                <span style={{ marginLeft: 6 }}>· 🏆 {activeCategory.prize_first}€</span>
              )}
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

      {!allDone && (
        <div className="adm-card" style={{ marginBottom: 20, marginTop: 16 }}>
          <div className="adm-card-header">
            <span className="adm-card-title">Checklist pre-torneo</span>
            <span style={{ color: 'var(--brand-green)', fontSize: 13, fontWeight: 700 }}>{progress}/{checks.length}</span>
          </div>
          <div style={{ padding: '0 16px 4px' }}>
            {checks.map(c => (
              <div key={c.label}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-1)', cursor: c.done ? 'default' : 'pointer' }}
                onClick={() => !c.done && setTab(c.tab)}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{c.done ? '✅' : '⬜'}</span>
                <span style={{ fontSize: 14, color: c.done ? 'var(--fg-2)' : '#fff', flex: 1 }}>{c.label}</span>
                {!c.done && <span style={{ color: 'var(--brand-green)', fontSize: 16 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {allDone && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, marginTop: allDone && !liveMatch.active ? 16 : 0 }}>
          {[
            { label: 'Squadre', value: (data.teams || []).length },
            { label: 'Partite FT', value: `${matchesFt}/${matchesTotal}` },
            { label: 'Marcatori', value: (data.scorers || []).length },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border-1)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--brand-green)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="adm-eyebrow" style={{ marginTop: allDone ? 0 : 4 }}>Preparazione pre-torneo</div>
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

      <div className="adm-eyebrow">Bordo campo</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        Live Diretta
        {liveMatch.active && (
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#FF3D3D' }} />
        )}
      </h3>
      <div className="adm-grid-menu" style={{ marginBottom: 24 }}>
        <button type="button" className="adm-grid-btn"
          style={{ borderColor: liveMatch.active ? 'rgba(255,61,61,0.5)' : undefined }}
          onClick={() => setTab('live')}>
          <ZapIcon size={28}/>
          <span>{liveMatch.active ? '🔴 In Diretta' : 'Avvia Live'}</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('news')}>
          <BellIcon size={28}/><span>Avvisi</span>
        </button>
      </div>

      <div className="adm-eyebrow">Sito pubblico</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Portale</h3>
      <div className="adm-grid-menu">
        <button type="button" className="adm-grid-btn" onClick={() => setTab('events')}>
          <CalIcon size={28}/><span>Regolamento</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('honors')}>
          <TrophyIcon size={28}/><span>Albo d'oro</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('sponsors')}>
          <StarIcon size={28}/><span>Sponsor</span>
        </button>
      </div>
    </div>
  );
}
