import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { rmLoadData, rmSaveData, rmGetAllData, rmMergeDefaults, rmAdminLogout, rmAdminMe, rmHasAdminSession, rmLoadDataFromBootstrap, rmGetAllEditions } from '../data.js';
import { getSessionUser, isAdminSessionError, Toast, HomeIcon, ZapIcon, GridIcon, BellIcon, MenuIcon, CalIcon, BallIcon, StarIcon, TrophyIcon, UsersIcon } from './shared.jsx';
import { LoginScreen } from './auth.jsx';
import { LiveSection, NewsSection } from './sections/live-news.jsx';
import { GironiSection, MatchesSection, StandingsSection, ScorersSection, TeamsSection } from './sections/competition.jsx';
import { EventsSection, HonorsSection, SponsorsSection } from './sections/content.jsx';
import { SettingsSection } from './sections/settings.jsx';
import '../admin-styles.css';

const PRIMARY_NAV_ITEMS = [
  { id: 'dashboard', label: 'Torneo' },
  { id: 'live', label: 'Live' },
  { id: 'news', label: 'Bacheca' },
  { id: 'settings', label: 'Impostazioni' },
];

function DashboardSection({ data, editionId, tournamentCategories, setTab }) {
  const liveMatch = data.live_match || {};
  const todayMatches = (data.matches_today || []).filter(m => !liveMatch.active || m.status !== 'live');

  const checks = [
    { done: (data.groups || []).length > 0,                                          label: 'Gironi configurati',    tab: 'gironi' },
    { done: (data.teams || []).length > 0,                                           label: 'Squadre registrate',    tab: 'teams' },
    { done: (data.matches_giornata || []).some(g => (g.items || []).length > 0),     label: 'Calendario inserito',   tab: 'matches' },
    { done: (data.news || []).length > 0,                                            label: 'Bacheca con avvisi',    tab: 'news' },
  ];
  const progress = checks.filter(c => c.done).length;
  const allDone  = progress === checks.length;
  const matchesTotal = (data.matches_giornata || []).reduce((n, g) => n + (g.items || []).length, 0);
  const matchesFt    = (data.matches_giornata || []).flatMap(g => g.items || []).filter(m => m.status === 'ft').length;

  return (
    <div>
      {/* Header */}
      <div className="adm-eyebrow" style={{ marginTop: 10 }}>
        {editionId ? 'Database relazionale attivo' : 'Gestione torneo'}
      </div>
      <h2 className="adm-section-title" style={{ margin: 0 }}>{data.edition?.name || 'Rinascita Cup 2026'}</h2>
      <p className="adm-section-sub">{data.edition?.location || 'Campo Sportivo Monteforte Irpino'}</p>

      {/* Categorie torneo */}
      {tournamentCategories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, marginBottom: 4 }}>
          {tournamentCategories.map(t => (
            <span key={t.id} style={{
              padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
              background: 'rgba(0,230,118,0.1)', border: '1px solid var(--border-brand)',
              color: 'var(--brand-green)',
            }}>
              {t.name}
              {(t.prize_first || 0) > 0 && (
                <span style={{ marginLeft: 6, color: 'var(--fg-3)', fontWeight: 400 }}>
                  🏆 {t.prize_first}€
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Onboarding checklist */}
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

      {/* Oggi quick view */}
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

      {/* Statistiche rapide */}
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

      {/* Momento 1: Setup torneo */}
      <div className="adm-eyebrow" style={{ marginTop: allDone ? 0 : 4 }}>Preparazione pre-torneo</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Setup Torneo</h3>
      <div className="adm-grid-menu" style={{ marginBottom: 24 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('gironi')}>
          <GridIcon size={28}/><span>Gironi</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('teams')}>
          <UsersIcon size={28}/><span>Squadre</span>
        </button>
      </div>

      {/* Momento 2: Regia giornata */}
      <div className="adm-eyebrow">Durante la giornata</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Regia Giornata</h3>
      <div className="adm-grid-menu" style={{ marginBottom: 24 }}>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('matches')}>
          <CalIcon size={28}/><span>Partite</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('standings')}>
          <GridIcon size={28}/><span>Classifica</span>
        </button>
        <button type="button" className="adm-grid-btn" onClick={() => setTab('scorers')}>
          <BallIcon size={28}/><span>Marcatori</span>
        </button>
      </div>

      {/* Momento 3: Live bordo campo */}
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

      {/* Portale pubblico */}
      <div className="adm-eyebrow">Sito pubblico</div>
      <h3 className="adm-section-title" style={{ marginBottom: 10 }}>Portale</h3>
      <div className="adm-grid-menu">
        <button type="button" className="adm-grid-btn" onClick={() => setTab('events')}>
          <CalIcon size={28}/><span>Eventi</span>
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

const VALID_TABS = ['dashboard','live','news','settings','gironi','matches','standings','scorers','teams','events','honors','sponsors'];

function tabFromHash() {
  const h = window.location.hash.replace('#', '');
  return VALID_TABS.includes(h) ? h : 'dashboard';
}

function AdminApp() {
  const [tab, setTab] = useState(tabFromHash);
  const [data, setData] = useState(() => rmGetAllData());
  const [toast, setToast] = useState(null);
  const [adminUser, setAdminUser] = useState(getSessionUser);
  const [editionId, setEditionId] = useState(null);
  const [tournamentId, setTournamentId] = useState(null);
  const [tournamentCategories, setTournamentCategories] = useState([]);

  function bounceToLogin(message = 'Sessione scaduta. Effettua di nuovo l\'accesso.') {
    setToast({ msg: message, type: 'error' });
    setTimeout(() => {
      window.location.replace('admin.html');
    }, 1800);
  }

  useEffect(() => {
    async function sync() {
      const [remoteData, bootstrapData] = await Promise.all([
        rmLoadData(),
        rmLoadDataFromBootstrap(),
      ]);
      if (remoteData) setData(rmMergeDefaults(remoteData));
      if (bootstrapData?.edition?.id) setEditionId(bootstrapData.edition.id);
      if (bootstrapData?.tournaments?.length) {
        setTournamentCategories(bootstrapData.tournaments);
        setTournamentId(bootstrapData.tournaments[0].id);
      }
    }
    sync();
  }, []);

  useEffect(() => {
    function onPop() { setTab(tabFromHash()); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  async function handleSave(newData, msg) {
    const hydrated = rmMergeDefaults(newData);
    setData(hydrated);
    try {
      const result = await rmSaveData(hydrated, { requireAdmin: true });
      if (result?.remoteError) {
        if (isAdminSessionError({ message: result.remoteError })) {
          bounceToLogin('Sessione scaduta. Accesso richiesto.');
          return;
        }
        setToast({ msg: `Sync fallita: ${result.remoteError}`, type: 'error' });
        return;
      }
      if (msg) setToast({ msg, type: 'success' });
    } catch (error) {
      if (isAdminSessionError(error)) {
        bounceToLogin('Sessione scaduta. Accesso richiesto.');
        return;
      }
      setToast({ msg: error?.message || 'Salvataggio fallito', type: 'error' });
    }
  }

  function navigateTo(t) {
    window.history.pushState(null, '', '#' + t);
    setTab(t);
  }

  async function logout() {
    await rmAdminLogout();
    window.location.replace('admin.html');
  }

  const props = { data, onSave: handleSave, adminUser, onUserChange: setAdminUser, editionId, tournamentId, tournamentCategories };
  const isMainTab = ['dashboard', 'live', 'news', 'settings'].includes(tab);
  const bottomNav = isMainTab ? tab : 'dashboard';

  return (
    <div className="adm-app">
      <header className="adm-topbar">
        <div className="adm-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <img src="assets/logo-rinascita-monteforte.jpg" alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
          <span className="adm-topbar-title">Admin Rinascita</span>
          <span className="adm-badge">Staff</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tournamentCategories.length > 1 && (
            <select
              value={tournamentId || ''}
              onChange={e => setTournamentId(e.target.value)}
              style={{ fontSize: 12, padding: '4px 28px 4px 8px', minWidth: 90, height: 30 }}
            >
              {tournamentCategories.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button className="adm-logout" onClick={logout}>Esci</button>
        </div>
      </header>

      <div className="adm-desktop-nav" aria-label="Navigazione primaria admin">
        {PRIMARY_NAV_ITEMS.map(item => {
          const isActive = bottomNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`adm-desktop-nav-btn ${isActive ? 'on' : ''}`}
              onClick={() => navigateTo(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <main className="adm-main">
        {!isMainTab && (
          <button className="adm-back-link" type="button" onClick={() => navigateTo('dashboard')}>
            ← Torna al Menù
          </button>
        )}

        {tab === 'dashboard' && <DashboardSection data={data} editionId={editionId} tournamentCategories={tournamentCategories} setTab={navigateTo} />}
        {tab === 'live' && <LiveSection {...props} />}
        {tab === 'news' && <NewsSection {...props} />}
        {tab === 'gironi' && <GironiSection {...props} />}
        {tab === 'matches' && <MatchesSection {...props} />}
        {tab === 'standings' && <StandingsSection {...props} />}
        {tab === 'scorers' && <ScorersSection {...props} />}
        {tab === 'teams' && <TeamsSection {...props} />}
        {tab === 'events' && <EventsSection {...props} />}
        {tab === 'honors' && <HonorsSection {...props} />}
        {tab === 'sponsors' && <SponsorsSection {...props} />}
        {tab === 'settings' && <SettingsSection {...props} />}
      </main>

      <nav className="adm-bottom-nav">
        <button className={`adm-bn-item ${bottomNav === 'dashboard' ? 'on' : ''}`} onClick={() => navigateTo('dashboard')}>
          <HomeIcon size={24}/><span>Torneo</span>
        </button>
        <button className={`adm-bn-item ${bottomNav === 'live' ? 'on' : ''}`} onClick={() => navigateTo('live')}>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <ZapIcon size={24}/>
            {data.live_match?.active && <span style={{ position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: '50%', background: '#FF3D3D', border: '1.5px solid #000' }} />}
          </span>
          <span>Live</span>
        </button>
        <button className={`adm-bn-item ${bottomNav === 'news' ? 'on' : ''}`} onClick={() => navigateTo('news')}>
          <BellIcon size={24}/><span>Bacheca</span>
        </button>
        <button className={`adm-bn-item ${bottomNav === 'settings' ? 'on' : ''}`} onClick={() => navigateTo('settings')}>
          <MenuIcon size={24}/><span>Impost.</span>
        </button>
      </nav>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

function Root() {
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;

    async function boot() {
      if (!rmHasAdminSession()) {
        if (active) setBooting(false);
        return;
      }

      try {
        await rmAdminMe();
        if (active) setAuthed(true);
      } catch (error) {
        await rmAdminLogout();
      } finally {
        if (active) setBooting(false);
      }
    }

    boot();
    return () => { active = false; };
  }, []);

  if (booting) {
    return (
      <div className="adm-login">
        <div className="adm-login-box">
          <h1 className="adm-login-title">Accesso staff</h1>
          <p className="adm-login-sub">Verifica sessione in corso...</p>
        </div>
      </div>
    );
  }

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <AdminApp />;
}

createRoot(document.getElementById('root')).render(<Root />);
