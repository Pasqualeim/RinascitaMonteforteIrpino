import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { rmGetAllData, rmLoadData, rmMergeDefaults } from '../data.js';
import { rmDeriveMatchesToday } from '../domain.js';
import { StatusStrip, Header, Footer, BottomNav } from '../components.jsx';
import { HomeScreen } from './screens/home.jsx';
import { CalendarScreen } from './screens/calendar.jsx';
import { TableScreen } from './screens/table.jsx';
import { TeamsScreen } from './screens/teams.jsx';
import { EventsScreen, NewsScreen, HonorsScreen } from './screens/secondary.jsx';
import { RegistrationsScreen } from './screens/registrations.jsx';
import '../styles.css';

// 'live' e 'scorers' restano validi come deep-link: 'live' apre la Home (la
// diretta è il primo blocco), 'scorers' apre Torneo sul tab Marcatori.
const VALID_SCREENS = ['home','live','calendar','table','teams','scorers','registrations','events','news','honors'];

function App() {
  const [screen, setScreen] = useState(() => {
    const h = (window.location.hash || '#home').replace('#', '');
    return VALID_SCREENS.includes(h) ? h : 'home';
  });

  const [data, setData] = useState(() => rmGetAllData());
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [catCompact, setCatCompact] = useState(false);

  const refresh = useCallback(async () => {
    const remoteData = await rmLoadData();
    if (remoteData) {
      setData(rmMergeDefaults(remoteData));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    const onVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const ids = data?.tournaments?.map(t => t.id) || [];
    if (ids.length === 0) return;
    if (!activeTournamentId || !ids.includes(activeTournamentId)) {
      setActiveTournamentId(ids[0]);
    }
  }, [data?.tournaments]);

  useEffect(() => {
    window.location.hash = screen;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  // Cat-bar resta sticky ma si rimpicciolisce dopo un po' di scroll
  useEffect(() => {
    const onScroll = () => setCatCompact(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeTournament = useMemo(() =>
    data?.tournaments?.find(t => t.id === activeTournamentId) || data?.tournaments?.[0] || null,
    [data, activeTournamentId]
  );

  const hasLive = !!(activeTournament?.live_match?.active || data?.live_match?.active);

  // Stato per categoria: live > oggi > niente (indicatore sulla pill)
  const catStatuses = useMemo(() => {
    const list = data?.tournaments || [];
    return list.map(t => {
      const isLive = !!t.live_match?.active;
      const hasToday = rmDeriveMatchesToday(t.matches_giornata || []).length > 0;
      return { id: t.id, status: isLive ? 'live' : (hasToday ? 'today' : '') };
    });
  }, [data?.tournaments]);
  const statusOf = (id) => catStatuses.find(c => c.id === id)?.status || '';

  return (
    <div className="rm-app">
      <StatusStrip items={data?.strip_items}/>
      <Header current={screen} onNav={setScreen} hasLive={hasLive}/>
      {(data?.tournaments?.length > 1) && (
        <div className={`rm-cat-bar ${catCompact ? 'compact' : ''}`}>
          <div className="rm-cat-switch" role="tablist" aria-label="Seleziona categoria torneo">
            {data.tournaments.map(t => {
              const status = statusOf(t.id);
              const statusLabel = status === 'live' ? 'in diretta ora' : (status === 'today' ? 'si gioca oggi' : '');
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTournamentId === t.id}
                  aria-label={statusLabel ? `${t.name} · ${statusLabel}` : t.name}
                  className={`rm-cat-pill ${activeTournamentId === t.id ? 'on' : ''}`}
                  onClick={() => setActiveTournamentId(t.id)}
                >
                  {t.name}
                  {status === 'today' && <span className="rm-cat-tag today" aria-hidden="true">oggi</span>}
                  {status === 'live'  && <span className="rm-cat-tag live" aria-hidden="true">live</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {(screen === 'home' || screen === 'live')
                             && <HomeScreen     onNav={setScreen} data={data} tournament={activeTournament}/>}
      {screen === 'calendar' && <CalendarScreen                   data={data} tournament={activeTournament}/>}
      {screen === 'table'    && <TableScreen        onNav={setScreen} data={data} tournament={activeTournament}/>}
      {screen === 'scorers'  && <TableScreen        onNav={setScreen} data={data} tournament={activeTournament} initialTab="marcatori"/>}
      {screen === 'teams'    && <TeamsScreen                      data={data} tournament={activeTournament}/>}
      {screen === 'registrations' && <RegistrationsScreen          data={data}/>}
      {screen === 'events'   && <EventsScreen                     data={data}/>}
      {screen === 'news'     && <NewsScreen                       data={data}/>}
      {screen === 'honors'   && <HonorsScreen                     data={data}/>}
      <Footer/>
      <BottomNav current={screen} onNav={setScreen} hasLive={hasLive}/>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{color:'#00E676',padding:'32px 20px',fontFamily:'monospace',fontSize:13,lineHeight:1.5}}>
        <div style={{marginBottom:8,color:'#FF3D3D',fontWeight:'bold'}}>Errore JavaScript:</div>
        {this.state.err.message}
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App/></ErrorBoundary>
);
