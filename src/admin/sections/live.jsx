import { useState, useRef, useEffect } from 'react';
import { DEFAULT_NATIONS_2026, rmAdminDomain, rmGetTeamIdMap } from '../../data.js';

function matchKey(m) {
  return `${m.home?.short || ''}-${m.away?.short || ''}-${m.date || ''}-${m.time || ''}`;
}

export function LiveSection({ data, onSave, editionId, tournamentId }) {
  const halfDuration = data.match_settings?.half_duration || 30;

  const [lm, setLm] = useState(() => JSON.parse(JSON.stringify(data.live_match)));
  const [teams] = useState(data.teams || []);
  const [selectedKey, setSelectedKey] = useState(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmTerminate, setConfirmTerminate] = useState(false);
  const [confirmRemoveEvent, setConfirmRemoveEvent] = useState(null); // origIdx | null
  const [displayMinute, setDisplayMinute] = useState(lm.minute || 0);

  // Goal flow state
  const [goalFlow, setGoalFlow] = useState(null);
  // null | { scoringSide:'hs'|'as', scoringShort, step:'pick'|'autogol' }

  // Card flow state
  const [cardFlow, setCardFlow] = useState(null);
  // null | { type:'yellow'|'red', teamShort }

  // Pending inline confirm for phase transitions and score corrections
  // null | 'end_first' | 'start_second' | 'adj_hs_-1' | 'adj_as_-1'
  const [pending, setPending] = useState(null);
  const pendingTimerRef = useRef(null);

  function requestConfirm(action) {
    clearTimeout(pendingTimerRef.current);
    setPending(action);
    pendingTimerRef.current = setTimeout(() => setPending(null), 4000);
  }
  function cancelPending() {
    clearTimeout(pendingTimerRef.current);
    setPending(null);
  }
  function executePending() {
    clearTimeout(pendingTimerRef.current);
    const action = pending;
    setPending(null);
    if (action === 'end_first') endFirstHalf();
    else if (action === 'start_second') startSecondHalf();
    else if (action === 'adj_hs_-1') adjustScore('hs', -1);
    else if (action === 'adj_as_-1') adjustScore('as', -1);
  }

  const lmRef = useRef(lm);
  useEffect(() => { lmRef.current = lm; }, [lm]);

  useEffect(() => {
    if (!lm.active || lm.phase === 'half_time') return;
    function calcMinute(s) {
      const ref = s.timer_started_at;
      if (!ref) return s.minute || 0;
      const elapsed = Math.floor((Date.now() - ref) / 60000);
      return s.phase === 'second_half' ? halfDuration + elapsed : elapsed;
    }
    setDisplayMinute(calcMinute(lm));
    const id = setInterval(() => setDisplayMinute(calcMinute(lmRef.current)), 30000);
    return () => clearInterval(id);
  }, [lm.active, lm.phase, lm.timer_started_at, halfDuration]);

  const today = new Date().toISOString().slice(0, 10);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const allMatches = (data.matches_giornata || [])
    .flatMap(g => (g.items || []).map(m => ({ ...m, _group: g.label || g.name || '' })))
    .filter(m => m.home && m.away && m.status !== 'ft')
    .sort((a, b) => {
      const da = a.date === 'Oggi' ? today : (a.date || '9999');
      const db = b.date === 'Oggi' ? today : (b.date || '9999');
      if (da !== db) return da < db ? -1 : 1;
      return (a.time || '00:00') < (b.time || '00:00') ? -1 : 1;
    });

  const matchGroups = allMatches.reduce((acc, m) => {
    const key = (m.date === 'Oggi' || m.date === today) ? '__today__' : (m.date || '__other__');
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const todayMatches = matchGroups['__today__'] || [];
  const smartDefault = (() => {
    if (!todayMatches.length) return allMatches[0] || null;
    let best = todayMatches[0], bestDelta = Infinity;
    for (const m of todayMatches) {
      if (!m.time) continue;
      const [h, min] = m.time.split(':').map(Number);
      const absDelta = Math.abs(h * 60 + min - nowMin);
      if (absDelta < bestDelta) { bestDelta = absDelta; best = m; }
    }
    return best;
  })();
  const smartDefaultKey = smartDefault ? matchKey(smartDefault) : null;
  const activeKey = selectedKey || smartDefaultKey;
  const selectedMatchObj = allMatches.find(m => matchKey(m) === activeKey) || null;

  // Preview teams for scoreboard when not yet live
  const displayHome = lm.active ? lm.home : (selectedMatchObj?.home || lm.home);
  const displayAway = lm.active ? lm.away : (selectedMatchObj?.away || lm.away);

  function formatDateLabel(key) {
    if (key === '__today__') return 'Oggi';
    if (key === '__other__') return 'In programma';
    if (!key.includes('-')) return key;
    const d = new Date(key + 'T12:00:00');
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toISOString().slice(0, 10) === tomorrow.toISOString().slice(0, 10)) return 'Domani';
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function getFlag(team) {
    if (!team) return '🏳️';
    if (team.flag) return team.flag;
    if (!team.nation) return '🏳️';
    const n = DEFAULT_NATIONS_2026.find(x => x.name === team.nation);
    return n?.flag || '🏳️';
  }

  function getTeamId(shortCode) {
    if (!shortCode) return null;
    const map = rmGetTeamIdMap();
    if (map[shortCode]) return map[shortCode];
    const t = teams.find(t => t.short === shortCode);
    return t?.id || null;
  }

  function getPlayers(teamShort) {
    const t = teams.find(t => t.short === teamShort)
      || (lm.home?.short === teamShort ? lm.home : null)
      || (lm.away?.short === teamShort ? lm.away : null);
    return t?.players || [];
  }

  function getYellowCount(playerName, teamShort) {
    return (lm.events || []).filter(e => e.type === 'yellow' && e.player === playerName && e._ts === teamShort).length;
  }

  function persistLm(newLm, updatedScorers) {
    const newData = { ...data, live_match: newLm };
    if (updatedScorers) newData.scorers = updatedScorers;
    onSave(newData, updatedScorers ? 'Partita e marcatori aggiornati' : 'Live aggiornato');
    setLm({ ...newLm });
    if (tournamentId) {
      rmAdminDomain.updateLive({
        tournament_id: tournamentId,
        active: newLm.active ?? false,
        home_team_id: getTeamId(newLm.home?.short),
        away_team_id: getTeamId(newLm.away?.short),
        home_score: newLm.hs ?? 0,
        away_score: newLm.as ?? 0,
        minute: newLm.minute ?? 0,
        pitch: newLm.pitch || '',
        events: newLm.events || [],
      }).catch(e => console.warn('Live sync:', e));
    }
  }

  function updateScorer(playerName, teamShort, teamName, delta) {
    let scorers = [...(data.scorers || [])];
    const idx = scorers.findIndex(s => s.name === playerName && (s.short === teamShort || s.team === teamName));
    if (idx >= 0) {
      scorers[idx] = { ...scorers[idx], goals: Math.max(0, (scorers[idx].goals || 0) + delta) };
    } else if (delta > 0) {
      const t = teams.find(x => x.short === teamShort || x.name === teamName);
      scorers.push({ name: playerName, team: teamName, short: teamShort || t?.short || '', color: t?.color || '#00E676', goals: delta });
    }
    return scorers.sort((a, b) => (b.goals || 0) - (a.goals || 0));
  }

  function doStartLive() {
    if (!selectedMatchObj) return;
    const updated = {
      ...lm, active: true, phase: 'first_half',
      timer_started_at: Date.now(),
      home: selectedMatchObj.home, away: selectedMatchObj.away,
      hs: 0, as: 0, minute: 0, events: [],
    };
    setDisplayMinute(0);
    persistLm(updated);
    setSelectedKey(null);
    setConfirmStart(false);
  }

  function doTerminate() {
    persistLm({ ...lm, active: false, phase: null, timer_started_at: null, minute: displayMinute });
    setConfirmTerminate(false);
  }

  function endFirstHalf() {
    setDisplayMinute(halfDuration);
    persistLm({ ...lm, phase: 'half_time', minute: halfDuration, timer_started_at: null });
  }

  function startSecondHalf() {
    setDisplayMinute(halfDuration);
    persistLm({ ...lm, phase: 'second_half', timer_started_at: Date.now() });
  }

  function adjustScore(side, delta) {
    persistLm({ ...lm, [side]: Math.max(0, (lm[side] || 0) + delta), minute: displayMinute });
  }

  // Goal flow
  function openGoal(scoringSide) {
    const scoringShort = scoringSide === 'hs' ? lm.home?.short : lm.away?.short;
    setGoalFlow({ scoringSide, scoringShort, step: 'pick' });
  }

  function pickGoalPlayer(playerName, isAutogolStep) {
    const { scoringSide, scoringShort } = goalFlow;
    const autogolFromShort = isAutogolStep ? goalFlow.autogolFromShort : null;

    const eventTeamShort = autogolFromShort || scoringShort;
    const eventTeamObj = teams.find(t => t.short === eventTeamShort)
      || (lm.home?.short === eventTeamShort ? lm.home : lm.away);

    const newEvent = {
      min: displayMinute,
      type: 'goal',
      player: playerName,
      team: eventTeamObj?.name || '',
      _ts: eventTeamShort,
      ...(autogolFromShort ? { _autogol: true } : {}),
    };
    const events = [...(lm.events || []), newEvent].sort((a, b) => a.min - b.min);
    const updatedLm = { ...lm, [scoringSide]: (lm[scoringSide] || 0) + 1, events, minute: displayMinute };

    let updatedScorers = null;
    if (!autogolFromShort) {
      updatedScorers = updateScorer(playerName, scoringShort, eventTeamObj?.name || '', 1);
    }

    persistLm(updatedLm, updatedScorers);
    setGoalFlow(null);
  }

  function switchToAutogol() {
    const { scoringSide, scoringShort } = goalFlow;
    const autogolFromShort = scoringSide === 'hs' ? lm.away?.short : lm.home?.short;
    setGoalFlow({ ...goalFlow, step: 'autogol', autogolFromShort });
  }

  // Card flow
  function openCard(type, teamShort) {
    setCardFlow({ type, teamShort });
  }

  function pickCardPlayer(playerName) {
    const { type, teamShort } = cardFlow;
    const teamObj = teams.find(t => t.short === teamShort)
      || (lm.home?.short === teamShort ? lm.home : lm.away);
    const newEvents = [{ min: displayMinute, type, player: playerName, team: teamObj?.name || '', _ts: teamShort }];
    if (type === 'yellow' && getYellowCount(playerName, teamShort) >= 1) {
      newEvents.push({ min: displayMinute, type: 'red', player: playerName, team: teamObj?.name || '', _ts: teamShort, _reason: 'doppio_giallo' });
    }
    const events = [...(lm.events || []), ...newEvents].sort((a, b) => a.min - b.min);
    persistLm({ ...lm, events, minute: displayMinute });
    setCardFlow(null);
  }

  function removeEvent(origIdx) {
    const ev = lm.events[origIdx];
    const events = lm.events.filter((_, i) => i !== origIdx);
    const updatedLm = { ...lm, events };
    let updatedScorers = null;
    if (ev.type === 'goal' && !ev._autogol) {
      const side = ev._ts === lm.home?.short ? 'hs' : 'as';
      updatedLm[side] = Math.max(0, (lm[side] || 0) - 1);
      updatedScorers = updateScorer(ev.player, ev._ts || '', ev.team, -1);
    }
    persistLm(updatedLm, updatedScorers);
  }

  const phaseLabel = lm.phase === 'first_half' ? '1° Tempo' : lm.phase === 'half_time' ? 'Intervallo' : lm.phase === 'second_half' ? '2° Tempo' : null;

  // Sorted events with original index for deletion
  const sortedEvents = (lm.events || [])
    .map((ev, origIdx) => ({ ...ev, origIdx }))
    .sort((a, b) => b.min - a.min); // newest first

  // Player list for goal/card modal
  const goalPickTeamShort = goalFlow?.step === 'autogol' ? goalFlow.autogolFromShort : goalFlow?.scoringShort;
  const goalPlayers = goalPickTeamShort ? getPlayers(goalPickTeamShort) : [];
  const cardPlayers = cardFlow ? getPlayers(cardFlow.teamShort) : [];

  return (
    <div>
      {/* Header */}
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {lm.active && <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#FF3D3D', flexShrink: 0 }} />}
            Live
          </h2>
          <p className="adm-section-sub" style={{ margin: 0, marginTop: 4 }}>
            {lm.active ? `${phaseLabel} — aggiorna ogni 30s` : 'Seleziona partita e avvia'}
          </p>
        </div>
      </div>

      {/* Match selection */}
      {!lm.active && (
        <>
          <div className="adm-card" style={{ marginBottom: 12 }}>
            <div className="adm-card-header">
              <span className="adm-card-title">Seleziona partita</span>
            </div>
            <div style={{ padding: '0 12px 12px' }}>
              {allMatches.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '8px 0 0' }}>Nessuna partita in programma.</p>
              )}
              {Object.entries(matchGroups).map(([dateKey, matches]) => (
                <div key={dateKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 6px' }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: '0.12em', color: dateKey === '__today__' ? 'var(--brand-green)' : 'var(--fg-3)', textTransform: 'uppercase' }}>
                      {formatDateLabel(dateKey)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
                  </div>
                  {matches.map((m) => {
                    const k = matchKey(m);
                    const isSelected = k === activeKey;
                    return (
                      <button key={k} onClick={() => setSelectedKey(k)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                        background: isSelected ? 'rgba(0,230,118,0.08)' : 'transparent',
                        border: `1px solid ${isSelected ? 'var(--brand-green)' : 'var(--border-1)'}`,
                        borderRadius: 8, cursor: 'pointer', color: '#fff', width: '100%',
                        textAlign: 'left', marginBottom: 6,
                      }}>
                        <span style={{ minWidth: 42, fontSize: 12, fontFamily: 'var(--font-display)', color: isSelected ? 'var(--brand-green)' : 'var(--fg-3)', flexShrink: 0 }}>
                          {m.time || '--:--'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
                          <span style={{ fontSize: 18 }}>{getFlag(m.home)}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{m.home?.short}</span>
                        </span>
                        <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-display)', fontSize: 12 }}>vs</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'flex-end' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{m.away?.short}</span>
                          <span style={{ fontSize: 18 }}>{getFlag(m.away)}</span>
                        </span>
                        {m._group && <span style={{ fontSize: 10, color: 'var(--fg-3)', marginLeft: 4, flexShrink: 0 }}>{m._group}</span>}
                        {isSelected && <span style={{ color: 'var(--brand-green)', fontSize: 14, flexShrink: 0 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <button
            className="adm-btn adm-btn-primary"
            onClick={() => selectedMatchObj && setConfirmStart(true)}
            disabled={!selectedMatchObj}
            style={{ width: '100%', marginBottom: 16, fontSize: 15, padding: '13px 0' }}>
            Avvia diretta
          </button>
        </>
      )}

      {/* Scoreboard */}
      <div className={`adm-live-board${lm.active ? ' adm-live-board--active' : ''}`}>
        <div className="adm-scoreboard">
          <div className="adm-sb-team">
            <span className="adm-sb-flag">{getFlag(displayHome)}</span>
            <span className="adm-sb-name" style={{ color: displayHome?.color || '#fff' }}>{displayHome?.short || 'CASA'}</span>
          </div>
          <div className="adm-sb-score">
            <span>{lm.hs || 0}</span>
            <span className="adm-sb-sep">–</span>
            <span>{lm.as || 0}</span>
          </div>
          <div className="adm-sb-team">
            <span className="adm-sb-flag">{getFlag(displayAway)}</span>
            <span className="adm-sb-name" style={{ color: displayAway?.color || '#fff' }}>{displayAway?.short || 'OSPITE'}</span>
          </div>
        </div>

        {/* Timer + phase */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: '4px 0 8px' }}>
          {phaseLabel && (
            <span style={{ fontSize: 11, color: lm.phase === 'half_time' ? 'var(--brand-gold)' : 'var(--brand-green)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
              {phaseLabel}
            </span>
          )}
          <span className="adm-minute-badge" style={{ color: lm.active && lm.phase !== 'half_time' ? '#fff' : 'var(--fg-3)' }}>
            {lm.phase === 'half_time' ? `${halfDuration}'` : `${displayMinute}'`}
          </span>
        </div>

        {/* Phase controls */}
        {lm.active && lm.phase === 'first_half' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            {pending === 'end_first' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--brand-gold)' }}>Fine 1° tempo?</span>
                <button onClick={executePending} style={{ padding: '6px 16px', background: 'rgba(245,197,24,0.2)', border: '1px solid var(--brand-gold)', borderRadius: 6, color: 'var(--brand-gold)', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Sì</button>
                <button onClick={cancelPending} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 13, cursor: 'pointer' }}>No</button>
              </div>
            ) : (
              <button onClick={() => requestConfirm('end_first')} style={{ padding: '10px 24px', background: 'rgba(245,197,24,0.12)', border: '1px solid var(--brand-gold)', borderRadius: 8, color: 'var(--brand-gold)', fontFamily: 'var(--font-display)', fontSize: 14, cursor: 'pointer', letterSpacing: '0.05em' }}>
                Fine 1° Tempo
              </button>
            )}
          </div>
        )}
        {lm.active && lm.phase === 'half_time' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            {pending === 'start_second' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--brand-green)' }}>Inizia 2° tempo?</span>
                <button onClick={executePending} style={{ padding: '6px 16px', background: 'rgba(0,230,118,0.2)', border: '1px solid var(--brand-green)', borderRadius: 6, color: 'var(--brand-green)', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Sì</button>
                <button onClick={cancelPending} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 13, cursor: 'pointer' }}>No</button>
              </div>
            ) : (
              <button onClick={() => requestConfirm('start_second')} style={{ padding: '10px 24px', background: 'rgba(0,230,118,0.12)', border: '1px solid var(--brand-green)', borderRadius: 8, color: 'var(--brand-green)', fontFamily: 'var(--font-display)', fontSize: 14, cursor: 'pointer', letterSpacing: '0.05em' }}>
                Inizia 2° Tempo
              </button>
            )}
          </div>
        )}

        {/* Score + cards controls */}
        {lm.active && lm.phase !== 'half_time' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
              {/* Home */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="adm-score-btn adm-score-btn--plus" onClick={() => openGoal('hs')} style={{ minHeight: 64, fontSize: 20 }}>
                  ⚽<br/><span style={{ fontSize: 13 }}>{lm.home?.short || 'CASA'}</span>
                </button>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="adm-live-ev-btn adm-ev-yellow" onClick={() => openCard('yellow', lm.home?.short)} style={{ flex: 1, minHeight: 44, fontSize: 20 }}>🟨</button>
                  <button className="adm-live-ev-btn adm-ev-red" onClick={() => openCard('red', lm.home?.short)} style={{ flex: 1, minHeight: 44, fontSize: 20 }}>🟥</button>
                </div>
                {pending === 'adj_hs_-1' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, color: '#FF3D3D' }}>−1 gol?</span>
                    <button onClick={executePending} style={{ padding: '3px 10px', background: 'rgba(255,61,61,0.15)', border: '1px solid rgba(255,61,61,0.4)', borderRadius: 5, color: '#FF3D3D', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Sì</button>
                    <button onClick={cancelPending} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 5, color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer' }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => requestConfirm('adj_hs_-1')} style={{ background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 12, padding: '4px 0', cursor: 'pointer' }}>−1 correzione</button>
                )}
              </div>
              {/* Away */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="adm-score-btn adm-score-btn--plus" onClick={() => openGoal('as')} style={{ minHeight: 64, fontSize: 20 }}>
                  ⚽<br/><span style={{ fontSize: 13 }}>{lm.away?.short || 'OSPITE'}</span>
                </button>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="adm-live-ev-btn adm-ev-yellow" onClick={() => openCard('yellow', lm.away?.short)} style={{ flex: 1, minHeight: 44, fontSize: 20 }}>🟨</button>
                  <button className="adm-live-ev-btn adm-ev-red" onClick={() => openCard('red', lm.away?.short)} style={{ flex: 1, minHeight: 44, fontSize: 20 }}>🟥</button>
                </div>
                {pending === 'adj_as_-1' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, color: '#FF3D3D' }}>−1 gol?</span>
                    <button onClick={executePending} style={{ padding: '3px 10px', background: 'rgba(255,61,61,0.15)', border: '1px solid rgba(255,61,61,0.4)', borderRadius: 5, color: '#FF3D3D', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Sì</button>
                    <button onClick={cancelPending} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 5, color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer' }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => requestConfirm('adj_as_-1')} style={{ background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 12, padding: '4px 0', cursor: 'pointer' }}>−1 correzione</button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Events log — livescore style */}
        {sortedEvents.length > 0 && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border-1)', paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.12em', color: 'var(--fg-3)' }}>EVENTI</span>
              {lm.active && (
                <button onClick={() => {
                  const last = lm.events?.[lm.events.length - 1];
                  if (last) removeEvent(lm.events.length - 1);
                }} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3)', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 5, padding: '2px 8px', cursor: 'pointer' }}>
                  ↩ Annulla ultimo
                </button>
              )}
            </div>
            {sortedEvents.map((ev) => {
              const isHome = ev._ts === lm.home?.short;
              const icon = ev.type === 'goal' ? (ev._autogol ? '⚽ (aut)' : '⚽') : ev.type === 'yellow' ? '🟨' : '🟥';
              return (
                <div key={ev.origIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: 3, minHeight: 28 }}>
                  {/* Home side */}
                  <div style={{ flex: 1, textAlign: 'right', paddingRight: 6, fontSize: 13 }}>
                    {isHome && (
                      <span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{ev.player}</span>
                        {ev._reason === 'doppio_giallo' && <span style={{ fontSize: 11, color: 'var(--brand-gold)', marginLeft: 4 }}>2°</span>}
                        <span style={{ marginLeft: 4 }}>{icon}</span>
                      </span>
                    )}
                  </div>
                  {/* Minute center */}
                  <div style={{ width: 32, textAlign: 'center', fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                    {ev.min}'
                  </div>
                  {/* Away side */}
                  <div style={{ flex: 1, paddingLeft: 6, fontSize: 13 }}>
                    {!isHome && (
                      <span>
                        <span style={{ marginRight: 4 }}>{icon}</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{ev.player}</span>
                        {ev._reason === 'doppio_giallo' && <span style={{ fontSize: 11, color: 'var(--brand-gold)', marginLeft: 4 }}>2°</span>}
                      </span>
                    )}
                  </div>
                  {/* Delete */}
                  <button onClick={() => setConfirmRemoveEvent(ev.origIdx)} style={{ width: 24, height: 24, background: 'transparent', border: 0, color: 'var(--fg-3)', cursor: 'pointer', fontSize: 12, padding: 0, flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Termina — bottom */}
        {lm.active && (
          <button onClick={() => setConfirmTerminate(true)} style={{ width: '100%', marginTop: 20, padding: '12px 0', background: 'transparent', border: '1px solid rgba(255,61,61,0.35)', borderRadius: 8, color: '#FF3D3D', fontFamily: 'var(--font-display)', fontSize: 14, cursor: 'pointer', letterSpacing: '0.06em' }}>
            TERMINA PARTITA
          </button>
        )}
      </div>

      {/* Modal: confirm start */}
      {confirmStart && selectedMatchObj && (
        <div className="adm-overlay" onClick={() => setConfirmStart(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <div className="adm-modal-header">
              <span className="adm-card-title">Avvia diretta</span>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setConfirmStart(false)}>✕</button>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '14px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fff', letterSpacing: '0.05em' }}>
                  {getFlag(selectedMatchObj.home)} {selectedMatchObj.home?.short} — {selectedMatchObj.away?.short} {getFlag(selectedMatchObj.away)}
                </div>
                {selectedMatchObj.time && (
                  <div style={{ fontSize: 12, color: 'var(--brand-green)', marginTop: 6 }}>{selectedMatchObj.time} {selectedMatchObj._group ? `· ${selectedMatchObj._group}` : ''}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>{halfDuration}' + {halfDuration}' · timer parte subito · score reset 0–0</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => setConfirmStart(false)}>Annulla</button>
                <button className="adm-btn adm-btn-primary adm-btn-sm" style={{ flex: 2 }} onClick={doStartLive}>Avvia</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirm terminate */}
      {confirmTerminate && (
        <div className="adm-overlay" onClick={() => setConfirmTerminate(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <div className="adm-modal-header">
              <span className="adm-card-title">Termina partita</span>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setConfirmTerminate(false)}>✕</button>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '14px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fff' }}>
                  {getFlag(lm.home)} {lm.home?.short} {lm.hs ?? 0}–{lm.as ?? 0} {lm.away?.short} {getFlag(lm.away)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 6 }}>{displayMinute}' · {phaseLabel}</div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 14px' }}>
                La diretta verrà chiusa. Il risultato viene salvato come finale.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => setConfirmTerminate(false)}>Annulla</button>
                <button className="adm-btn adm-btn-sm" style={{ flex: 2, background: 'rgba(255,61,61,0.15)', border: '1px solid rgba(255,61,61,0.5)', color: '#FF3D3D' }} onClick={doTerminate}>Termina</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: goal player picker */}
      {goalFlow && (
        <div className="adm-overlay" onClick={() => setGoalFlow(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <span className="adm-card-title">
                {goalFlow.step === 'autogol'
                  ? `⚽ Autogol — giocatore ${goalPickTeamShort}`
                  : `⚽ Gol ${goalFlow.scoringShort} — ${displayMinute}'`}
              </span>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setGoalFlow(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              {goalPlayers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 16px 8px' }}>
                  {goalPlayers.map(p => (
                    <button key={p.id || p.name} type="button" onClick={() => pickGoalPlayer(p.name, goalFlow.step === 'autogol')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-1)', borderRadius: 8, cursor: 'pointer', color: '#fff', textAlign: 'left' }}>
                      {p.number && <span style={{ fontSize: 12, color: 'var(--fg-3)', minWidth: 22 }}>{p.number}</span>}
                      <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                    </button>
                  ))}
                  {goalFlow.step !== 'autogol' && (
                    <button type="button" onClick={switchToAutogol} style={{ padding: '10px 12px', background: 'rgba(255,61,61,0.06)', border: '1px solid rgba(255,61,61,0.25)', borderRadius: 8, cursor: 'pointer', color: 'var(--fg-2)', fontSize: 13, textAlign: 'left' }}>
                      Autogol (segna giocatore avversario)
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '0 16px 16px' }}>
                  <input
                    className="adm-input"
                    placeholder="Nome cognome"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) pickGoalPlayer(e.target.value.trim(), goalFlow.step === 'autogol'); }}
                    style={{ marginBottom: 8 }}
                  />
                  {goalFlow.step !== 'autogol' && (
                    <button type="button" onClick={switchToAutogol} style={{ padding: '8px 12px', background: 'rgba(255,61,61,0.06)', border: '1px solid rgba(255,61,61,0.25)', borderRadius: 8, cursor: 'pointer', color: 'var(--fg-2)', fontSize: 13, width: '100%' }}>
                      Autogol
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirm remove event */}
      {confirmRemoveEvent !== null && (() => {
        const ev = lm.events?.[confirmRemoveEvent];
        if (!ev) return null;
        const icon = ev.type === 'goal' ? (ev._autogol ? '⚽ (aut)' : '⚽') : ev.type === 'yellow' ? '🟨' : '🟥';
        return (
          <div className="adm-overlay" onClick={() => setConfirmRemoveEvent(null)}>
            <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 300 }}>
              <div className="adm-modal-header">
                <span className="adm-card-title">Rimuovi evento</span>
                <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setConfirmRemoveEvent(null)}>✕</button>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '12px', marginBottom: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{ev.player}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>{ev.min}' · {ev.team || ev._ts}</div>
                  {ev._reason === 'doppio_giallo' && <div style={{ fontSize: 11, color: 'var(--brand-gold)', marginTop: 2 }}>Espulsione per doppio giallo</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }} onClick={() => setConfirmRemoveEvent(null)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" style={{ flex: 2, background: 'rgba(255,61,61,0.15)', border: '1px solid rgba(255,61,61,0.5)', color: '#FF3D3D' }} onClick={() => { removeEvent(confirmRemoveEvent); setConfirmRemoveEvent(null); }}>Rimuovi</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: card player picker */}
      {cardFlow && (
        <div className="adm-overlay" onClick={() => setCardFlow(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <span className="adm-card-title">
                {cardFlow.type === 'yellow' ? '🟨 Giallo' : '🟥 Rosso'} — {cardFlow.teamShort} · {displayMinute}'
              </span>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setCardFlow(null)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              {cardPlayers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 16px 8px' }}>
                  {cardPlayers.map(p => {
                    const yellows = cardFlow.type === 'yellow' ? getYellowCount(p.name, cardFlow.teamShort) : 0;
                    return (
                      <button key={p.id || p.name} type="button" onClick={() => pickCardPlayer(p.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-1)', borderRadius: 8, cursor: 'pointer', color: '#fff', textAlign: 'left' }}>
                        {p.number && <span style={{ fontSize: 12, color: 'var(--fg-3)', minWidth: 22 }}>{p.number}</span>}
                        <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                        {yellows === 1 && <span style={{ fontSize: 11, color: 'var(--brand-gold)' }}>🟨 → 🟥</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '0 16px 16px' }}>
                  <input
                    className="adm-input"
                    placeholder="Nome cognome"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) pickCardPlayer(e.target.value.trim()); }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
