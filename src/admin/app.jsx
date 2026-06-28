import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { rmLoadData, rmSaveData, rmGetAllData, rmMergeDefaults, rmAdminLogout, rmAdminMe, rmHasAdminSession, rmLoadDataFromBootstrap, rmGetAllEditions, rmNormalizeTournamentData, RM_STORAGE_KEY } from '../data.js';
import { getSessionUser, isAdminSessionError, Toast, HomeIcon, ZapIcon, BellIcon, SettingsIcon } from './shared.jsx';
import { LoginScreen } from './auth.jsx';
import { DashboardSection } from './sections/dashboard.jsx';
import { LiveSection } from './sections/live.jsx';
import { NewsSection } from './sections/news.jsx';
import { GironiSection } from './sections/gironi.jsx';
import { SetupSection } from './sections/setup.jsx';
import { MatchesSection } from './sections/matches.jsx';
import { StandingsSection } from './sections/standings.jsx';
import { BracketSection } from './sections/bracket.jsx';
import { ScorersSection } from './sections/scorers.jsx';
import { TeamsSection } from './sections/teams.jsx';
import { EventsSection, HonorsSection } from './sections/content.jsx';
import { IscrizioniSection } from './sections/iscrizioni.jsx';
import { DisciplineSection } from './sections/discipline.jsx';
import { SettingsSection } from './sections/settings.jsx';
import '../admin-styles.css';

const PRIMARY_NAV_ITEMS = [
  { id: 'dashboard', label: 'Torneo' },
  { id: 'live', label: 'Live' },
  { id: 'news', label: 'Bacheca' },
  { id: 'settings', label: 'Impostazioni' },
];

const VALID_TABS = ['dashboard','live','news','settings','gironi','fasi','matches','standings','bracket','scorers','teams','events','iscrizioni','honors','discipline'];

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
  const [bootstrapCache, setBootstrapCache] = useState(null);

  function bounceToLogin(message = 'Sessione scaduta. Effettua di nuovo l\'accesso.') {
    setToast({ msg: message, type: 'error' });
    setTimeout(() => {
      window.location.replace('admin.html');
    }, 1800);
  }

  async function sync() {
    const bootstrapData = await rmLoadDataFromBootstrap();
    if (bootstrapData?.edition?.id) setEditionId(bootstrapData.edition.id);
    if (bootstrapData?.tournaments?.length) {
      setTournamentCategories(bootstrapData.tournaments);
      setTournamentId(prev => prev || bootstrapData.tournaments[0].id);
      setBootstrapCache(bootstrapData);
      // Persist to localStorage — preserve match_settings (not in relational DB)
      try {
        const prevLocal = rmGetAllData();
        const normalized = rmNormalizeTournamentData(bootstrapData);
        if (prevLocal?.match_settings) normalized.match_settings = prevLocal.match_settings;
        localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
      } catch {}
    } else {
      setBootstrapCache(null);
      const fallback = await rmLoadData();
      if (fallback) setData(rmMergeDefaults(fallback));
    }
  }

  // Re-derive data whenever bootstrap or selected tournament changes
  useEffect(() => {
    if (!bootstrapCache || !tournamentId) return;
    const tournament = bootstrapCache.tournaments?.find(t => t.id === tournamentId)
      || bootstrapCache.tournaments?.[0];
    if (!tournament) return;
    const localData = rmGetAllData();
    setData(rmMergeDefaults(rmNormalizeTournamentData({
      ...bootstrapCache,
      match_settings:   bootstrapCache.match_settings || localData.match_settings,
      groups:           tournament.groups           || [],
      teams:            tournament.teams             || [],
      standings_groups: tournament.standings_groups  || [],
      live_match:       tournament.live_match        || { active: false },
      matches:          tournament.matches           || [],
      matches_giornata: tournament.matches_giornata  || [],
      scorers:          tournament.scorers           || [],
      bracket:          tournament.bracket           || [],
      bracket_intro:    tournament.bracket_intro     ?? null,
    })));
  }, [bootstrapCache, tournamentId]);

  useEffect(() => {
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

  async function refresh(msg) {
    await sync();
    if (msg) setToast({ msg, type: 'success' });
  }

  const props = { data, onSave: handleSave, onRefresh: refresh, adminUser, onUserChange: setAdminUser, editionId, tournamentId, tournamentCategories };
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
        <button className="adm-logout" onClick={logout}>Esci</button>
      </header>

      <div className="adm-cat-bar">
        {tournamentCategories.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--fg-3)', marginRight: 4 }}>Nessun torneo —</span>
        )}
        {tournamentCategories.map(t => (
          <button
            key={t.id}
            type="button"
            className={`adm-cat-pill ${tournamentId === t.id ? 'on' : ''}`}
            onClick={() => setTournamentId(t.id)}
          >
            {t.name}
          </button>
        ))}
        <button
          type="button"
          className="adm-cat-pill adm-cat-pill-add"
          onClick={() => navigateTo('settings')}
          title="Gestisci tornei in Impostazioni"
        >
          + Torneo
        </button>
      </div>

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

        {tab === 'dashboard'  && <DashboardSection data={data} onSave={handleSave} onRefresh={refresh} editionId={editionId} tournamentId={tournamentId} tournamentCategories={tournamentCategories} setTab={navigateTo} />}
        {tab === 'live'       && <LiveSection {...props} />}
        {tab === 'news'       && <NewsSection {...props} />}
        {tab === 'gironi'     && <GironiSection {...props} />}
        {tab === 'fasi'       && <SetupSection {...props} />}
        {tab === 'matches'    && <MatchesSection {...props} />}
        {tab === 'standings'  && <StandingsSection {...props} />}
        {tab === 'bracket'    && <BracketSection {...props} />}
        {tab === 'scorers'    && <ScorersSection {...props} />}
        {tab === 'teams'      && <TeamsSection {...props} />}
        {tab === 'events'     && <EventsSection {...props} />}
        {tab === 'iscrizioni' && <IscrizioniSection {...props} />}
        {tab === 'honors'     && <HonorsSection {...props} />}
        {tab === 'discipline' && <DisciplineSection {...props} />}
        {tab === 'settings'   && <SettingsSection {...props} />}
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
          <BellIcon size={24}/><span>Avvisi</span>
        </button>
        <button className={`adm-bn-item ${bottomNav === 'settings' ? 'on' : ''}`} onClick={() => navigateTo('settings')}>
          <SettingsIcon size={24}/><span>Impost.</span>
        </button>
      </nav>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

function Root() {
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');

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
        try { await rmAdminLogout(); } catch {}
        if (active && (error?.message?.toLowerCase().includes('fetch') || error?.message?.toLowerCase().includes('network'))) {
          setBootError('Errore di rete. Controlla la connessione e ricarica la pagina.');
        }
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

  if (!authed) return (
    <>
      {bootError && (
        <div style={{ background: '#1a0000', color: '#FF3D3D', fontSize: 13, padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #3d0000' }}>
          {bootError}
        </div>
      )}
      <LoginScreen onLogin={() => setAuthed(true)} />
    </>
  );
  return <AdminApp />;
}

createRoot(document.getElementById('root')).render(<Root />);
