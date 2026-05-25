import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { rmGetAllData, rmLoadData, rmMergeDefaults } from '../data.js';
import { StatusStrip, Header, Footer, BottomNav } from '../components.jsx';
import { HomeScreen } from './screens/home.jsx';
import { LiveScreen } from './screens/live.jsx';
import { CalendarScreen } from './screens/calendar.jsx';
import { TableScreen } from './screens/table.jsx';
import { TeamsScreen } from './screens/teams.jsx';
import { EventsScreen, NewsScreen } from './screens/secondary.jsx';
import '../styles.css';

const VALID_SCREENS = ['home','live','calendar','table','teams','events','news'];

function App() {
  const [screen, setScreen] = useState(() => {
    const h = (window.location.hash || '#home').replace('#', '');
    return VALID_SCREENS.includes(h) ? h : 'home';
  });

  const [data, setData] = useState(() => rmGetAllData());
  const [activeTournamentId, setActiveTournamentId] = useState(null);

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

  const activeTournament = useMemo(() =>
    data?.tournaments?.find(t => t.id === activeTournamentId) || data?.tournaments?.[0] || null,
    [data, activeTournamentId]
  );

  const hasLive = !!(activeTournament?.live_match?.active || data?.live_match?.active);

  return (
    <div className="rm-app">
      <StatusStrip items={data?.strip_items}/>
      <Header current={screen} onNav={setScreen} hasLive={hasLive}/>
      {(data?.tournaments?.length > 1) && (
        <div className="rm-cat-bar">
          {data.tournaments.map(t => (
            <button
              key={t.id}
              className={`rm-cat-pill ${activeTournamentId === t.id ? 'on' : ''}`}
              onClick={() => setActiveTournamentId(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      {screen === 'home'     && <HomeScreen     onNav={setScreen} data={data} tournament={activeTournament}/>}
      {screen === 'live'     && <LiveScreen                       data={data} tournament={activeTournament}/>}
      {screen === 'calendar' && <CalendarScreen                   data={data} tournament={activeTournament}/>}
      {screen === 'table'    && <TableScreen                      data={data} tournament={activeTournament}/>}
      {screen === 'teams'    && <TeamsScreen                      data={data} tournament={activeTournament}/>}
      {screen === 'events'   && <EventsScreen                     data={data}/>}
      {screen === 'news'     && <NewsScreen                       data={data}/>}
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
