import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { rmGetAllData, rmLoadData, rmMergeDefaults } from '../data.js';
import { StatusStrip, Header, Footer, BottomNav } from '../components.jsx';
import { HomeScreen } from './screens/home.jsx';
import { LiveScreen } from './screens/live.jsx';
import { CalendarScreen } from './screens/calendar.jsx';
import { TableScreen } from './screens/table.jsx';
import { TeamsScreen } from './screens/teams.jsx';
import { EventsScreen, NewsScreen, HonorsScreen } from './screens/secondary.jsx';
import '../styles.css';

const VALID_SCREENS = ['home','live','calendar','table','teams','events','news','honors'];

function App() {
  const [screen, setScreen] = useState(() => {
    const h = (window.location.hash || '#home').replace('#', '');
    return VALID_SCREENS.includes(h) ? h : 'home';
  });

  const [data, setData] = useState(() => rmGetAllData());

  const refresh = useCallback(async () => {
    const remoteData = await rmLoadData();
    if (remoteData) {
      setData(rmMergeDefaults(remoteData));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.location.hash = screen;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  const hasLive = !!(data?.live_match?.active);

  return (
    <div className="rm-app">
      <StatusStrip items={data?.strip_items}/>
      <Header current={screen} onNav={setScreen}/>
      {screen === 'home'     && <HomeScreen     onNav={setScreen} data={data}/>}
      {screen === 'live'     && <LiveScreen                       data={data}/>}
      {screen === 'calendar' && <CalendarScreen                   data={data}/>}
      {screen === 'table'    && <TableScreen                      data={data}/>}
      {screen === 'teams'    && <TeamsScreen                      data={data}/>}
      {screen === 'events'   && <EventsScreen                     data={data}/>}
      {screen === 'news'     && <NewsScreen                       data={data}/>}
      {screen === 'honors'   && <HonorsScreen                     data={data}/>}
      <Footer onNav={setScreen}/>
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
