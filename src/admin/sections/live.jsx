import { useState, useRef, useEffect } from 'react';
import { DEFAULT_NATIONS_2026, rmAdminDomain, rmGetTeamIdMap } from '../../data.js';

function matchKey(m) {
  return `${m.home?.short || ''}-${m.away?.short || ''}-${m.date || ''}-${m.time || ''}`;
}

export function LiveSection({ data, onSave, onRefresh, editionId, tournamentId }) {
  const halfDuration = data.match_settings?.half_duration || 30;

  const [lm, setLm] = useState(() => JSON.parse(JSON.stringify(data.live_match)));
  const teams = data.teams || [];
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

  useEffect(() => {
    setLm(JSON.parse(JSON.stringify(data.live_match)));
    setDisplayMinute(data.live_match?.minute || 0);
    setSelectedKey(null);
    setGoalFlow(null);
    setCardFlow(null);
    setPending(null);
  }, [tournamentId]);

  const lmRef = useRef(lm);
  useEffect(() => { lmRef.current = lm; }, [lm]);

  const scorersRef = useRef(data.scorers);
  useEffect(() => { scorersRef.current = data.scorers; }, [data.scorers]);

  useEffect(() => {
    if (!lm.active || lm.phase === 'half_time') return;
    function calcMinute(s) {
      const ref = s.timer_started_at;
      if (!ref) return s.minute || 0;
      const elapsed = Math.floor((Date.now() - ref) / 60000);
      return s.phase === 'second_half' ? halfDuration + elapsed : elapsed;
    }
    setDisplayMinute(calcMinute(lm));
    const id = setInterval(() => setDisplayMinute(calcMinute(lmRef.current)), 5000);
    return () => clearInterval(id);
  }, [lm.active, lm.phase, lm.timer_started_at, halfDuration]);

  const today = new Date().toISOString().slice(0, 10);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const allMatches = (data.matches_giornata || [])
    .flatMap(g => (g.items || []).map(m => ({ ...m, _group: g.day || '' })))
    .filter(m => m.home && m.away && (m.status === 'sch' || m.status === 'ft'))
    .sort((a, b) => {
      // sch before ft, then by date/time
      if (a.status !== b.status) return a.status === 'sch' ? -1 : 1;
      const da = a.date === 'Oggi' ? today : (a.date || '9999');
      const db = b.date === 'Oggi' ? today : (b.date || '9999');
      if (da !== db) return da < db ? -1 : 1;
      return (a.time || '00:00') < (b.time || '00:00') ? -1 : 1;
    });

  const todayMatches = allMatches.filter(m => m.status === 'sch' && (m.date === 'Oggi' || m.date === today));
  const scheduledMatches = allMatches.filter(m => m.status === 'sch');
  const smartDefault = (() => {
    if (!todayMatches.length) return scheduledMatches[0] || null;
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
  const selectedMatchObj = scheduledMatches.find(m => matchKey(m) === activeKey) || null;

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
        match_id: newLm.match_id || null,
        active: newLm.active ?? false,
        home_team_id: getTeamId(newLm.home?.short),
        away_team_id: getTeamId(newLm.away?.short),
        home_score: newLm.hs ?? 0,
        away_score: newLm.as ?? 0,
        minute: newLm.minute ?? 0,
        phase: newLm.phase || null,
        timer_started_at: newLm.timer_started_at || null,
        pitch: newLm.pitch || '',
        events: newLm.events || [],
      }).catch(e => console.warn('Live sync:', e));
    }
    if (updatedScorers && tournamentId) {
      updatedScorers.forEach(s => {
        if (s.id) {
          rmAdminDomain.updateScorer(s.id, { goals: s.goals }).catch(e => console.warn('Scorer sync:', e));
        }
      });
    }
  }

  function updateScorer(playerName, teamShort, delta) {
    let scorers = [...(data.scorers || [])];
    // Bootstrap returns s.short (not s.team) for the short code
    const idx = scorers.findIndex(s => s.name === playerName && (s.short === teamShort || s.team === teamShort));
    if (idx >= 0) {
      scorers[idx] = { ...scorers[idx], goals: Math.max(0, (scorers[idx].goals || 0) + delta) };
    } else if (delta > 0) {
      const t = teams.find(x => x.short === teamShort);
      scorers.push({ name: playerName, short: teamShort, team: t?.name || teamShort, flag: t?.flag || '', color: t?.color || '#00E676', goals: delta });
    }
    return scorers.sort((a, b) => (b.goals || 0) - (a.goals || 0));
  }

  function updateGiornataMatch(giornata, predicate, patch) {
    return (giornata || []).map(g => ({
      ...g,
      items: (g.items || []).map(m => predicate(m) ? { ...m, ...patch } : m),
    }));
  }

  function doStartLive() {
    if (!selectedMatchObj) return;
    const updatedLm = {
      ...lm, active: true, phase: 'first_half',
      timer_started_at: Date.now(),
      match_id: selectedMatchObj.id || null,
      home: selectedMatchObj.home, away: selectedMatchObj.away,
      hs: 0, as: 0, minute: 0, events: [],
    };
    const updatedGiornata = updateGiornataMatch(
      data.matches_giornata,
      m => matchKey(m) === activeKey,
      { status: 'live' }
    );
    setDisplayMinute(0);
    onSave({ ...data, live_match: updatedLm, matches_giornata: updatedGiornata }, 'Diretta avviata');
    setLm({ ...updatedLm });
    if (tournamentId) {
      rmAdminDomain.updateLive({
        tournament_id: tournamentId,
        match_id: updatedLm.match_id,
        active: true,
        home_team_id: getTeamId(updatedLm.home?.short),
        away_team_id: getTeamId(updatedLm.away?.short),
        home_score: 0, away_score: 0, minute: 0,
        phase: 'first_half',
        timer_started_at: updatedLm.timer_started_at,
        pitch: updatedLm.pitch || '', events: [],
      }).catch(e => console.warn('Live start sync:', e));
    }
    setSelectedKey(null);
    setConfirmStart(false);
  }

  async function doTerminate() {
    setConfirmTerminate(false);
    const terminatedLm = { ...lm, active: false, phase: null, timer_started_at: null, minute: displayMinute };
    const isThisMatch = m =>
      (lm.match_id && m.id === lm.match_id) ||
      (!lm.match_id && m.home?.short === lm.home?.short && m.away?.short === lm.away?.short);
    const updatedGiornata = updateGiornataMatch(
      data.matches_giornata,
      isThisMatch,
      { status: 'ft', hs: lm.hs ?? 0, as: lm.as ?? 0 }
    );
    onSave({ ...data, live_match: terminatedLm, matches_giornata: updatedGiornata }, 'Partita terminata');
    setLm({ ...terminatedLm });

    const promises = [];

    if (tournamentId) {
      promises.push(
        rmAdminDomain.updateLive({
          tournament_id: tournamentId, match_id: null, active: false,
          home_team_id: null, away_team_id: null,
          home_score: 0, away_score: 0, minute: 0,
          phase: null, timer_started_at: null, pitch: '', events: [],
        }).catch(e => console.warn('Live reset sync:', e))
      );
    }

    if (lm.match_id) {
      promises.push(
        rmAdminDomain.updateMatch(lm.match_id, {
          status: 'ft',
          home_score: lm.hs ?? 0,
          away_score: lm.as ?? 0,
        }).catch(e => console.warn('Match finish sync:', e))
      );

      // Persist all events not yet in match_events (cards have no _match_event_id pre-fix)
      for (const ev of (lm.events || [])) {
        if (!ev._match_event_id) {
          promises.push(
            rmAdminDomain.createMatchEvent({
              match_id: lm.match_id,
              team_id: getTeamId(ev._ts) || null,
              event_type: ev.type,
              player_name: ev.player || null,
              minute: ev.min ?? null,
            }).catch(e => console.warn('Event persist on terminate:', e))
          );
        }
      }
    }

    // Sync all scorers: create new (no id), update existing
    if (tournamentId) {
      for (const s of (scorersRef.current || [])) {
        if (s.id) {
          promises.push(
            rmAdminDomain.updateScorer(s.id, { goals: s.goals })
              .catch(e => console.warn('Scorer update sync:', e))
          );
        } else {
          const teamId = getTeamId(s.short || s.team);
          promises.push(
            rmAdminDomain.createScorer({
              tournament_id: tournamentId,
              team_id: teamId || null,
              player_name: s.name,
              goals: s.goals,
              sort_order: 0,
            }).catch(e => console.warn('Scorer create sync:', e))
          );
        }
      }
    }

    await Promise.allSettled(promises);
    onRefresh?.();
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

  async function pickGoalPlayer(playerName, isAutogolStep) {
    const { scoringSide, scoringShort } = goalFlow;
    const autogolFromShort = isAutogolStep ? goalFlow.autogolFromShort : null;

    const displayTeamShort = scoringShort;
    const playerTeamShort = autogolFromShort || scoringShort;
    const playerTeamObj = teams.find(t => t.short === playerTeamShort)
      || (lm.home?.short === playerTeamShort ? lm.home : lm.away);

    const newEvent = {
      min: displayMinute,
      type: 'goal',
      player: playerName,
      team: playerTeamObj?.name || '',
      _ts: displayTeamShort,
      ...(autogolFromShort ? { _autogol: true, _player_ts: autogolFromShort } : {}),
    };

    // Create match_event in DB (persists even after match ends — bootstrap uses it for scorers)
    if (!autogolFromShort && lm.match_id) {
      try {
        const res = await rmAdminDomain.createMatchEvent({
          match_id: lm.match_id,
          team_id: getTeamId(playerTeamShort) || null,
          event_type: 'goal',
          player_name: playerName,
          minute: displayMinute,
        });
        if (res?.data?.id) newEvent._match_event_id = res.data.id;
      } catch(e) {
        console.warn('Match event create:', e);
      }
    }

    const currentLm = lmRef.current;
    const events = [...(currentLm.events || []), newEvent].sort((a, b) => a.min - b.min);
    const updatedLm = { ...currentLm, [scoringSide]: (currentLm[scoringSide] || 0) + 1, events, minute: displayMinute };

    let updatedScorers = null;
    if (!autogolFromShort) {
      updatedScorers = updateScorer(playerName, scoringShort, 1);
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

  async function pickCardPlayer(playerName) {
    const { type, teamShort } = cardFlow;
    const teamObj = teams.find(t => t.short === teamShort)
      || (lm.home?.short === teamShort ? lm.home : lm.away);
    const newEvents = [{ min: displayMinute, type, player: playerName, team: teamObj?.name || '', _ts: teamShort }];
    if (type === 'yellow' && getYellowCount(playerName, teamShort) >= 1) {
      newEvents.push({ min: displayMinute, type: 'red', player: playerName, team: teamObj?.name || '', _ts: teamShort, _reason: 'doppio_giallo' });
    }
    if (lm.match_id) {
      for (const ev of newEvents) {
        try {
          const res = await rmAdminDomain.createMatchEvent({
            match_id: lm.match_id,
            team_id: getTeamId(teamShort) || null,
            event_type: ev.type,
            player_name: playerName,
            minute: displayMinute,
          });
          if (res?.data?.id) ev._match_event_id = res.data.id;
        } catch(e) {
          console.warn('Match event card create:', e);
        }
      }
    }
    const currentLm = lmRef.current;
    const events = [...(currentLm.events || []), ...newEvents].sort((a, b) => a.min - b.min);
    persistLm({ ...currentLm, events, minute: displayMinute });
    setCardFlow(null);
  }

  function removeEvent(origIdx) {
    const ev = lm.events[origIdx];
    const events = lm.events.filter((_, i) => i !== origIdx);
    const updatedLm = { ...lm, events };
    let updatedScorers = null;
    if (ev._match_event_id) {
      rmAdminDomain.deleteMatchEvent(ev._match_event_id).catch(e => console.warn('Match event delete:', e));
    }
    if (ev.type === 'goal') {
      const side = ev._ts === lm.home?.short ? 'hs' : 'as';
      updatedLm[side] = Math.max(0, (lm[side] || 0) - 1);
      if (!ev._autogol) {
        updatedScorers = updateScorer(ev.player, ev._ts || '', -1);
      }
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
              {allMatches.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '8px 0 0' }}>Nessuna partita da giocare.</p>
              ) : (() => {
                // Group by _group preserving order
                const grouped = [];
                const seen = new Map();
                for (const m of allMatches) {
                  const g = m._group || '';
                  if (!seen.has(g)) { seen.set(g, []); grouped.push({ label: g, items: seen.get(g) }); }
                  seen.get(g).push(m);
                }
                return grouped.map(({ label, items }) => (
                  <div key={label || '_'}>
                    {label && (
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--fg-3)', letterSpacing: '0.1em', padding: '8px 0 4px', borderBottom: '1px solid var(--border-1)', marginBottom: 8 }}>
                        {label} · {items.length} {items.length === 1 ? 'partita' : 'partite'}
                      </div>
                    )}
                    {items.map((m) => {
                const k = matchKey(m);
                const isFt = m.status === 'ft';
                const isSelected = !isFt && k === activeKey;
                const isToday = m.date === today || m.date === 'Oggi';
                const dateLabel = m.date ? (isToday ? 'Oggi' : formatDateLabel(m.date.includes('-') ? m.date : m.date)) : null;
                return (
                  <button key={k} onClick={() => !isFt && setSelectedKey(k)} disabled={isFt} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: isSelected ? 'rgba(0,230,118,0.08)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--brand-green)' : 'var(--border-1)'}`,
                    borderRadius: 8, cursor: isFt ? 'default' : 'pointer',
                    color: isFt ? 'var(--fg-3)' : '#fff', width: '100%',
                    textAlign: 'left', marginBottom: 8, opacity: isFt ? 0.55 : 1,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 54, flexShrink: 0 }}>
                      {dateLabel && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: isToday && !isFt ? 'var(--brand-green)' : 'var(--fg-3)', letterSpacing: '0.08em' }}>
                          {dateLabel}
                        </span>
                      )}
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-display)', color: isSelected ? 'var(--brand-green)' : 'var(--fg-2)' }}>
                        {m.time || '--:--'}
                      </span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{getFlag(m.home)}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{m.home?.short}</span>
                      {isFt
                        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--fg-2)', margin: '0 2px' }}>{m.hs ?? 0}–{m.as ?? 0}</span>
                        : <span style={{ color: 'var(--fg-3)', fontSize: 11, margin: '0 2px' }}>vs</span>
                      }
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{m.away?.short}</span>
                      <span style={{ fontSize: 16 }}>{getFlag(m.away)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {isFt && <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--fg-3)', letterSpacing: '0.08em', border: '1px solid var(--border-1)', borderRadius: 4, padding: '2px 5px' }}>FT</span>}
                      {isSelected && <span style={{ color: 'var(--brand-green)', fontSize: 14 }}>✓</span>}
                    </div>
                  </button>
                );
              })}
                  </div>
                ))}
              )()}
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

      {/* Scoreboard — solo quando live */}
      {lm.active && <div className="adm-live-board adm-live-board--active">
        <div className="adm-scoreboard">
          <div className="adm-sb-team">
            <span className="adm-sb-flag">{getFlag(lm.home)}</span>
            <span className="adm-sb-name" style={{ color: lm.home?.color || '#fff' }}>{lm.home?.short}</span>
          </div>
          <div className="adm-sb-score">
            <span>{lm.hs || 0}</span>
            <span className="adm-sb-sep">–</span>
            <span>{lm.as || 0}</span>
          </div>
          <div className="adm-sb-team">
            <span className="adm-sb-flag">{getFlag(lm.away)}</span>
            <span className="adm-sb-name" style={{ color: lm.away?.color || '#fff' }}>{lm.away?.short}</span>
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
                  <div style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 15 }}>⚠️</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FF3D3D', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>TOGLI GOL?</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 10 }}>Rimuove 1 gol da <strong style={{ color: 'var(--fg-1)' }}>{lm.home?.short}</strong>. Non annullabile.</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={executePending} style={{ flex: 1, padding: '7px 0', background: 'rgba(255,61,61,0.2)', border: '1px solid rgba(255,61,61,0.5)', borderRadius: 6, color: '#FF3D3D', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Conferma</button>
                      <button onClick={cancelPending} style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer' }}>Annulla</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => requestConfirm('adj_hs_-1')} style={{ background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 11, padding: '5px 0', cursor: 'pointer', letterSpacing: '0.03em' }}>− correzione gol</button>
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
                  <div style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 15 }}>⚠️</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FF3D3D', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>TOGLI GOL?</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 10 }}>Rimuove 1 gol da <strong style={{ color: 'var(--fg-1)' }}>{lm.away?.short}</strong>. Non annullabile.</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={executePending} style={{ flex: 1, padding: '7px 0', background: 'rgba(255,61,61,0.2)', border: '1px solid rgba(255,61,61,0.5)', borderRadius: 6, color: '#FF3D3D', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Conferma</button>
                      <button onClick={cancelPending} style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer' }}>Annulla</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => requestConfirm('adj_as_-1')} style={{ background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 11, padding: '5px 0', cursor: 'pointer', letterSpacing: '0.03em' }}>− correzione gol</button>
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
        <button onClick={() => setConfirmTerminate(true)} style={{ width: '100%', marginTop: 20, padding: '12px 0', background: 'transparent', border: '1px solid rgba(255,61,61,0.35)', borderRadius: 8, color: '#FF3D3D', fontFamily: 'var(--font-display)', fontSize: 14, cursor: 'pointer', letterSpacing: '0.06em' }}>
          TERMINA PARTITA
        </button>
      </div>}

      {/* Modal: confirm start */}
      {confirmStart && selectedMatchObj && (
        <div className="adm-overlay" onClick={() => setConfirmStart(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="adm-modal-header">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.12em', color: 'var(--fg-2)' }}>AVVIA DIRETTA</span>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setConfirmStart(false)}>✕</button>
            </div>
            <div style={{ padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%', borderRadius: 12, padding: '24px 20px 20px',
                background: 'linear-gradient(160deg, rgba(0,230,118,0.08) 0%, #0a0a0a 60%)',
                border: '1px solid rgba(0,230,118,0.2)',
                textAlign: 'center', marginBottom: 28, position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--brand-green)' }}>CALCIO D'INIZIO</span>
                </div>
                <div style={{ fontSize: 36, marginBottom: 4, marginTop: 16 }}>
                  {getFlag(selectedMatchObj.home)} {getFlag(selectedMatchObj.away)}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.05em', color: '#fff', lineHeight: 1.1 }}>
                  {selectedMatchObj.home?.short} <span style={{ color: 'var(--fg-3)', fontSize: 18 }}>vs</span> {selectedMatchObj.away?.short}
                </div>
                {selectedMatchObj.time && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--brand-green)' }}>{selectedMatchObj.time}</span>
                    {selectedMatchObj._group && <><span style={{ color: 'var(--border-1)' }}>·</span><span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{selectedMatchObj._group}</span></>}
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                  {halfDuration}' + {halfDuration}' · TIMER PARTE SUBITO · 0–0
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  onClick={() => setConfirmStart(false)}
                  style={{ flex: 1, padding: '14px 0', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer' }}>
                  ANNULLA
                </button>
                <button
                  onClick={doStartLive}
                  style={{ flex: 2, padding: '14px 0', background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.45)', borderRadius: 10, color: 'var(--brand-green)', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700 }}>
                  AVVIA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirm terminate */}
      {confirmTerminate && (
        <div className="adm-overlay" onClick={() => setConfirmTerminate(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="adm-modal-header">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.12em', color: 'var(--fg-2)' }}>TERMINA PARTITA</span>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setConfirmTerminate(false)}>✕</button>
            </div>
            <div style={{ padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%', borderRadius: 12, padding: '24px 20px 20px',
                background: 'linear-gradient(160deg, rgba(255,61,61,0.08) 0%, #0a0a0a 60%)',
                border: '1px solid rgba(255,61,61,0.2)',
                textAlign: 'center', marginBottom: 16, position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.2em', color: '#FF3D3D' }}>RISULTATO FINALE</span>
                </div>
                <div style={{ fontSize: 36, marginBottom: 4, marginTop: 16 }}>
                  {getFlag(lm.home)} {getFlag(lm.away)}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: '0.05em', color: '#fff', lineHeight: 1.1 }}>
                  {lm.home?.short} <span style={{ color: '#FF3D3D', margin: '0 4px' }}>{lm.hs ?? 0}–{lm.as ?? 0}</span> {lm.away?.short}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#FF3D3D' }}>{displayMinute}'</span>
                  <span style={{ color: 'var(--border-1)' }}>·</span>
                  <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{phaseLabel}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
                La diretta verrà chiusa. Il risultato viene salvato come finale.
              </p>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  onClick={() => setConfirmTerminate(false)}
                  style={{ flex: 1, padding: '14px 0', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer' }}>
                  ANNULLA
                </button>
                <button
                  onClick={doTerminate}
                  style={{ flex: 2, padding: '14px 0', background: 'rgba(255,61,61,0.12)', border: '1px solid rgba(255,61,61,0.45)', borderRadius: 10, color: '#FF3D3D', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700 }}>
                  TERMINA
                </button>
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
        const isGoal = ev.type === 'goal';
        const isYellow = ev.type === 'yellow';
        const isRed = ev.type === 'red';
        const accentColor = isGoal ? 'var(--brand-green)' : isYellow ? 'var(--brand-gold)' : '#FF3D3D';
        const typeLabel = isGoal ? (ev._autogol ? 'AUTOGOL' : 'GOL') : isYellow ? 'AMMONIZIONE' : 'ESPULSIONE';
        const bigIcon = isGoal ? '⚽' : isYellow ? '🟨' : '🟥';
        return (
          <div className="adm-overlay" onClick={() => setConfirmRemoveEvent(null)}>
            <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="adm-modal-header">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.12em', color: 'var(--fg-2)' }}>RIMUOVI EVENTO</span>
                <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setConfirmRemoveEvent(null)}>✕</button>
              </div>
              <div style={{ padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                {/* Event card */}
                <div style={{
                  width: '100%', borderRadius: 12, padding: '24px 20px 20px',
                  background: `linear-gradient(160deg, rgba(${isGoal ? '0,230,118' : isYellow ? '245,197,24' : '255,61,61'},0.08) 0%, #0a0a0a 60%)`,
                  border: `1px solid ${accentColor}30`,
                  textAlign: 'center', marginBottom: 28, position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.2em', color: accentColor }}>{typeLabel}</span>
                  </div>
                  <div style={{ fontSize: 44, lineHeight: 1, margin: '16px 0 12px' }}>{bigIcon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.04em', color: '#fff', lineHeight: 1.1 }}>{ev.player}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: accentColor }}>{ev.min}'</span>
                    <span style={{ color: 'var(--border-1)', fontSize: 12 }}>·</span>
                    <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{ev.team || ev._ts}</span>
                  </div>
                  {ev._reason === 'doppio_giallo' && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--brand-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                      2° GIALLO → ESPULSIONE
                    </div>
                  )}
                  {isGoal && ev._autogol && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                      IN PROPRIA PORTA
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button
                    onClick={() => setConfirmRemoveEvent(null)}
                    style={{ flex: 1, padding: '14px 0', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer' }}>
                    ANNULLA
                  </button>
                  <button
                    onClick={() => { removeEvent(confirmRemoveEvent); setConfirmRemoveEvent(null); }}
                    style={{ flex: 2, padding: '14px 0', background: 'rgba(255,61,61,0.12)', border: '1px solid rgba(255,61,61,0.45)', borderRadius: 10, color: '#FF3D3D', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700 }}>
                    RIMUOVI
                  </button>
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
