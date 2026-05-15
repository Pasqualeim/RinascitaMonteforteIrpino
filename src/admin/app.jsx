import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { rmLoadData, rmSaveData, rmGetAllData, rmMergeDefaults, rmAdminLogout, rmAdminMe, rmHasAdminSession } from '../data.js';
import { getSessionUser, isAdminSessionError, Toast, HomeIcon, ZapIcon, GridIcon, BellIcon, MenuIcon, CalIcon, BallIcon, StarIcon, TrophyIcon, UsersIcon } from './shared.jsx';
import { LoginScreen } from './auth.jsx';
import { LiveSection, NewsSection } from './sections/live-news.jsx';
import { GironiSection, MatchesSection, StandingsSection, ScorersSection, TeamsSection } from './sections/competition.jsx';
import { EventsSection, HonorsSection, SponsorsSection } from './sections/content.jsx';
import { SettingsSection } from './sections/settings.jsx';
import '../admin-styles.css';

function DashboardMenu({ setTab }) {
  return (
    <>
      <div className="adm-eyebrow" style={{ marginTop: 10 }}>Stagione 2026</div>
      <h3 className="adm-section-title">Torneo</h3>
      <p className="adm-section-sub">Gestisci le squadre, i calendari e le classifiche.</p>

      <div className="adm-grid-menu">
        <div className="adm-grid-btn" onClick={() => setTab('teams')}>
          <UsersIcon size={32} />
          <span>Squadre & Rose</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('gironi')}>
          <GridIcon size={32} />
          <span>Gironi</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('matches')}>
          <CalIcon size={32} />
          <span>Partite</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('standings')}>
          <GridIcon size={32} />
          <span>Classifiche</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('scorers')}>
          <BallIcon size={32} />
          <span>Marcatori</span>
        </div>
      </div>

      <div className="adm-eyebrow" style={{ marginTop: 32 }}>Sito Pubblico</div>
      <h3 className="adm-section-title">Portale</h3>
      <p className="adm-section-sub">Personalizza gli eventi, gli avvisi e l'albo d'oro del sito.</p>

      <div className="adm-grid-menu">
        <div className="adm-grid-btn" onClick={() => setTab('events')}>
          <CalIcon size={32} />
          <span>Eventi</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('honors')}>
          <TrophyIcon size={32} />
          <span>Albo d'oro</span>
        </div>
        <div className="adm-grid-btn" onClick={() => setTab('sponsors')}>
          <StarIcon size={32} />
          <span>Sponsor</span>
        </div>
      </div>
    </>
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

  function bounceToLogin(message = 'Sessione scaduta. Effettua di nuovo l\'accesso.') {
    setToast(message);
    setTimeout(() => {
      window.location.replace('admin.html');
    }, 1200);
  }

  useEffect(() => {
    async function sync() {
      const remoteData = await rmLoadData();
      if (remoteData) {
        setData(rmMergeDefaults(remoteData));
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
        setToast(`Sync fallita: ${result.remoteError}`);
        return;
      }
      if (msg) setToast(msg);
    } catch (error) {
      if (isAdminSessionError(error)) {
        bounceToLogin('Sessione scaduta. Accesso richiesto.');
        return;
      }
      setToast(error?.message || 'Salvataggio fallito');
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

  const props = { data, onSave: handleSave, adminUser, onUserChange: setAdminUser };
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

      <main className="adm-main">
        {!isMainTab && (
          <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginBottom: 20, padding: 0 }} onClick={() => navigateTo('dashboard')}>
            ← Torna al Menù
          </button>
        )}

        {tab === 'dashboard' && <DashboardMenu setTab={navigateTo} />}
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

      {toast && <Toast msg={`✓ ${toast}`} onDone={() => setToast(null)} />}
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
