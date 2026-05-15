/* global React, ReactDOM, rmGetAllData, rmLoadData, rmMergeDefaults */
/* global StatusStrip, Header, Footer, BottomNav */
/* global HomeScreen, LiveScreen, CalendarScreen, TableScreen, TeamsScreen, EventsScreen, NewsScreen, HonorsScreen */

const { useState, useEffect, useCallback } = React;

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App/></ErrorBoundary>
);
