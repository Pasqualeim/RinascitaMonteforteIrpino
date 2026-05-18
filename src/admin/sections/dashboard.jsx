import { GridIcon, BellIcon, CalIcon, StarIcon, UsersIcon } from '../shared.jsx';

const IT_MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
function isoToShort(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${IT_MONTHS[parseInt(m) - 1]}`;
}

export function DashboardSection({ data, editionId, tournamentId, tournamentCategories, setTab }) {
  const liveMatch = data.live_match || {};
  const activeCategory = tournamentCategories.find(t => t.id === tournamentId);

  const groupsCount  = (data.groups || []).length;
  const teamsCount   = (data.teams || []).length;
  const allMatches   = (data.matches_giornata || []).flatMap(g => g.items || []);
  const matchesTotal = allMatches.length;
  const matchesFt    = allMatches.filter(m => m.status === 'ft').length;
  const matchesLive  = allMatches.filter(m => m.status === 'live').length;

  // Regia: history + upcoming
  const completedMatches = allMatches
    .filter(m => m.status === 'ft' && m.home && m.away)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const upcomingMatches = allMatches
    .filter(m => m.status === 'sch' && m.home && m.away)
    .sort((a, b) => (a.date || '9').localeCompare(b.date || '9') || (a.time || '').localeCompare(b.time || ''));

  // Seeding alert
  const groupNames = new Set((data.groups || []).map(g => g.name));
  const KNOCKOUT_PHASES = new Set(['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale']);
  const groupMatches = (data.matches_giornata || []).filter(g => groupNames.has(g.day)).flatMap(g => g.items || []);
  const groupsDone = groupMatches.length > 0 && groupMatches.every(m => m.status === 'ft');
  const koSlots = (data.matches_giornata || []).filter(g => KNOCKOUT_PHASES.has(g.day)).flatMap(g => g.items || []);
  const hasUnseededKo = koSlots.some(m => !m.home && !m.away);
  const showSeedingAlert = groupsDone && hasUnseededKo;

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-1)' };

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

      {/* Seeding alert */}
      {showSeedingAlert && (
        <div className="adm-card" style={{ marginBottom: 16, border: '1px solid rgba(0,230,118,0.35)', background: 'rgba(0,230,118,0.04)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20, flex: 'none', marginTop: 1 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-green)', marginBottom: 4 }}>Gironi conclusi — abbinamenti pronti</div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 12, lineHeight: 1.5 }}>
                Puoi applicare gli abbinamenti automatici agli slot della fase eliminatoria.
              </div>
              <button className="adm-btn adm-btn-sm" onClick={() => setTab('fasi')}>Vai alle fasi eliminatorie →</button>
            </div>
          </div>
        </div>
      )}

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
      <div className="adm-eyebrow">Centro controllo</div>
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

      {/* Storico + prossime */}
      <div className="adm-card" style={{ marginBottom: 12 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">📊 Storico risultati</span>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setTab('matches')}>Tutte →</button>
        </div>
        {completedMatches.length === 0 ? (
          <div style={{ padding: '10px 16px 14px', fontSize: 13, color: 'var(--fg-3)' }}>Nessun risultato registrato.</div>
        ) : (
          <div style={{ padding: '0 16px 4px' }}>
            {completedMatches.slice(0, 6).map((m, i) => (
              <div key={m.id || i} style={rowStyle}>
                <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0, minWidth: 52 }}>{isoToShort(m.date) || '—'}</span>
                <span style={{ fontSize: 14, color: '#fff', flex: 1, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                  {m.home?.short} <span style={{ color: 'var(--brand-green)' }}>{m.hs}–{m.as}</span> {m.away?.short}
                </span>
                <span style={{ fontSize: 10, color: 'var(--fg-3)', flexShrink: 0 }}>FT</span>
              </div>
            ))}
            {completedMatches.length > 6 && (
              <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--fg-3)' }}>
                +{completedMatches.length - 6} altri risultati
              </div>
            )}
          </div>
        )}
      </div>

      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">📅 Prossime partite</span>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setTab('matches')}>Gestisci →</button>
        </div>
        {upcomingMatches.length === 0 ? (
          <div style={{ padding: '10px 16px 14px', fontSize: 13, color: 'var(--fg-3)' }}>Nessuna partita in programma.</div>
        ) : (
          <div style={{ padding: '0 16px 4px' }}>
            {upcomingMatches.slice(0, 5).map((m, i) => (
              <div key={m.id || i} style={rowStyle}>
                <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0, minWidth: 52 }}>
                  {m.date ? `${isoToShort(m.date)}${m.time ? ` · ${m.time}` : ''}` : 'TBD'}
                </span>
                <span style={{ fontSize: 14, color: 'var(--fg-2)', flex: 1 }}>
                  {m.home?.short} <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>vs</span> {m.away?.short}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Portale */}
      <div className="adm-eyebrow">Sito pubblico</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Portale</h3>
      <div className="adm-grid-menu">
        <button type="button" className="adm-grid-btn" onClick={() => setTab('news')}><BellIcon size={28}/><span>Avvisi</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('events')}><CalIcon size={28}/><span>Regolamento</span></button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('sponsors')}><StarIcon size={28}/><span>Sponsor</span></button>
      </div>
    </div>
  );
}
