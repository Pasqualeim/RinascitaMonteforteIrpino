import { GridIcon, CalIcon, StarIcon, UsersIcon } from '../shared.jsx';
import { MatchesSection } from './matches.jsx';

export function DashboardSection({ data, onSave, onRefresh, editionId, tournamentId, tournamentCategories, setTab }) {
  const liveMatch = data.live_match || {};
  const activeCategory = tournamentCategories.find(t => t.id === tournamentId);

  const groupsCount  = (data.groups || []).length;
  const teamsCount   = (data.teams || []).length;
  const allMatches   = (data.matches_giornata || []).flatMap(g => g.items || []);
  const matchesTotal = allMatches.length;
  const matchesFt    = allMatches.filter(m => m.status === 'ft').length;

  return (
    <div>
      <div className="adm-eyebrow" style={{ marginTop: 10 }}>Gestione torneo</div>
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
                }}>{t.name}</span>
              );
            })}
          </div>
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

      {/* ── Setup Torneo ── */}
      <div className="adm-eyebrow" style={{ marginTop: 4 }}>Preparazione pre-torneo</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Setup Torneo</h3>
      <div className="adm-grid-menu" style={{ marginBottom: 24 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('teams')}><UsersIcon size={28}/><span>Squadre</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('gironi')}><GridIcon size={28}/><span>Gironi</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('fasi')}><GridIcon size={28}/><span>Eliminatorie</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('matches')}><CalIcon size={28}/><span>Partite</span></button>
      </div>

      {/* ── Regia ── */}
      <div className="adm-eyebrow">Centro di controllo</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Regia</h3>

      {/* Live */}
      {liveMatch.active && (
        <div className="adm-card" style={{ marginBottom: 12, border: '1px solid rgba(255,61,61,0.4)', background: 'rgba(255,61,61,0.04)' }}>
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

      <MatchesSection data={data} onSave={onSave} onRefresh={onRefresh} tournamentId={tournamentId} compact />

      {/* Portale */}
      <div className="adm-eyebrow">Sito pubblico</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Portale</h3>
      <div className="adm-grid-menu">
        <button type="button" className="adm-grid-btn" onClick={() => setTab('events')}><CalIcon size={28}/><span>Regolamento</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('sponsors')}><StarIcon size={28}/><span>Sponsor</span></button>
      </div>
    </div>
  );
}
