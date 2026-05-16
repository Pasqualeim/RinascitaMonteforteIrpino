import { useState, useRef, useEffect } from 'react';
import { DEFAULT_TEAMS, DEFAULT_NATIONS_2026, rmAdminDomain, rmGetTeamIdMap } from '../../data.js';

export function LiveSection({ data, onSave, editionId, tournamentId }) {
  const [lm, setLm] = useState(() => JSON.parse(JSON.stringify(data.live_match)));
  const [teams] = useState(data.teams || DEFAULT_TEAMS);
  const [addingEvent, setAddingEvent] = useState(false);
  const [evPlayer, setEvPlayer] = useState('');
  const [evTeam, setEvTeam] = useState(lm.home?.short || '');
  const [evNote, setEvNote] = useState('');
  const [evType, setEvType] = useState('goal');

  const lmRef = useRef(lm);
  useEffect(() => { lmRef.current = lm; }, [lm]);

  useEffect(() => {
    if (!lm.active) return;
    const id = setInterval(() => {
      setLm(prev => {
        if (!prev.active || prev.minute >= 120) return prev;
        return { ...prev, minute: prev.minute + 1 };
      });
    }, 60000);
    return () => clearInterval(id);
  }, [lm.active]);

  const todayMatches = (data.matches_giornata || [])
    .flatMap(g => (g.items || []).filter(m => m.date === 'Oggi' || m.status === 'sch'))
    .filter(m => m.home && m.away);
  const sameTeamsSelected = !!lm.home?.short && lm.home?.short === lm.away?.short;
  const canStartLive = !!lm.home?.short && !!lm.away?.short && !sameTeamsSelected;

  function getFlag(team) {
    if (team?.flag) return team.flag;
    if (!team?.nation) return '🏳️';
    const n = DEFAULT_NATIONS_2026.find(x => x.name === team.nation);
    return n?.flag || '🏳️';
  }

  function getTeamId(shortCode) {
    if (!shortCode) return null;
    const map = rmGetTeamIdMap();
    if (map[shortCode]) return map[shortCode];
    const t = (data.teams || []).find(t => t.short === shortCode);
    return t?.id || null;
  }

  function save(updatedLm, updatedScorers) {
    const newLm = updatedLm || lm;
    const newData = { ...data, live_match: newLm };
    if (updatedScorers) newData.scorers = updatedScorers;
    onSave(newData, updatedScorers ? 'Partita e marcatori aggiornati' : 'Partita live aggiornata');
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
      }).catch(e => console.warn('Live sync relazionale:', e));
    }
  }

  function updateScorer(playerName, teamShort, teamName, delta) {
    let scorers = [...(data.scorers || [])];
    const idx = scorers.findIndex(s => s.name === playerName && (s.short === teamShort || s.team === teamName));

    if (idx >= 0) {
      scorers[idx] = { ...scorers[idx], goals: Math.max(0, (scorers[idx].goals || 0) + delta) };
    } else if (delta > 0) {
      const t = teams.find(x => x.short === teamShort || x.name === teamName);
      scorers.push({
        name: playerName,
        team: teamName,
        short: teamShort || t?.short || '',
        color: t?.color || '#00E676',
        goals: delta
      });
    }
    return scorers.sort((a, b) => (b.goals || 0) - (a.goals || 0));
  }

  function toggleActive() {
    if (!lm.active && !canStartLive) return;
    const updated = { ...lm, active: !lm.active };
    setLm(updated);
    save(updated);
  }

  function setScore(side, delta) {
    const updated = { ...lm, [side]: Math.max(0, (lm[side] || 0) + delta) };
    setLm(updated);
    save(updated);
  }

  function setMinute(delta) {
    const updated = { ...lm, minute: Math.max(0, Math.min(120, (lm.minute || 0) + delta)) };
    setLm(updated);
    save(updated);
  }

  function addEvent(type, teamShort) {
    setEvType(type);
    if (teamShort) setEvTeam(teamShort);
    setAddingEvent(true);
  }

  function confirmEvent() {
    if (!evPlayer.trim()) return;
    const teamObj = teams.find(t => t.short === evTeam) || lm.home;
    const newEvent = { min: lm.minute, type: evType, player: evPlayer.trim(), team: teamObj?.name || '', note: evNote.trim() || undefined, _ts: evTeam };
    const events = [...(lm.events || []), newEvent].sort((a, b) => a.min - b.min);
    const updatedLm = { ...lm, events };

    let updatedScorers = null;
    if (evType === 'goal' && evPlayer !== 'Autogol') {
      updatedScorers = updateScorer(evPlayer.trim(), evTeam, teamObj?.name || '', 1);
    }

    setLm(updatedLm);
    save(updatedLm, updatedScorers);
    setAddingEvent(false);
    setEvPlayer('');
    setEvNote('');
  }

  function undoLastEvent() {
    if (!lm.events || lm.events.length === 0) return;
    removeEvent(lm.events.length - 1);
  }

  function removeEvent(idx) {
    const ev = lm.events[idx];
    const events = lm.events.filter((_, i) => i !== idx);
    const updatedLm = { ...lm, events };

    let updatedScorers = null;
    if (ev.type === 'goal' && ev.player !== 'Autogol') {
      updatedScorers = updateScorer(ev.player, ev._ts || '', ev.team, -1);
    }

    setLm(updatedLm);
    save(updatedLm, updatedScorers);
  }

  function setTeam(side, short) {
    const team = teams.find(t => t.short === short);
    if (team) {
      const opposite = side === 'home' ? 'away' : 'home';
      const updated = {
        ...lm,
        [side]: team,
        ...(lm[opposite]?.short === short ? { [opposite]: null } : {}),
      };
      setLm(updated);
      save(updated);
    }
  }

  function loadMatchFromCalendar(match) {
    const updated = { ...lm, home: match.home, away: match.away, hs: 0, as: 0, minute: 0, events: [] };
    setLm(updated);
    save(updated);
  }

  return (
    <div>
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {lm.active && <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#FF3D3D', flexShrink: 0 }} />}
            Live
          </h2>
          <p className="adm-section-sub" style={{ margin: 0, marginTop: 4 }}>
            {lm.active ? 'Diretta in corso — i visitatori vedono in 30s' : 'Aggiorna la partita in tempo reale'}
          </p>
        </div>
        <button
          className={`adm-btn adm-btn-sm ${lm.active ? 'adm-btn-danger' : 'adm-btn-primary'}`}
          onClick={toggleActive}
          disabled={!lm.active && !canStartLive}
        >
          {lm.active ? '⏹ Termina' : '▶ Avvia'}
        </button>
      </div>

      {!lm.active && todayMatches.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card-header">
            <span className="adm-card-title">Partite di oggi — carica dal calendario</span>
          </div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayMatches.map((m, i) => (
              <button
                key={i}
                onClick={() => loadMatchFromCalendar(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: '#1a1a1a', border: '1px solid var(--border-1)', borderRadius: 8,
                  cursor: 'pointer', color: '#fff', width: '100%', textAlign: 'left',
                  transition: 'border-color 150ms'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 22 }}>{getFlag(m.home)}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{m.home?.short || m.home?.name}</span>
                </span>
                <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-display)', fontSize: 13 }}>vs</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{m.away?.short || m.away?.name}</span>
                  <span style={{ fontSize: 22 }}>{getFlag(m.away)}</span>
                </span>
                {m.time && <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 8 }}>{m.time}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {!lm.active && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card-header"><span className="adm-card-title">Selezione manuale squadre</span></div>
          <div className="adm-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
              <div>
                <div className="adm-label" style={{ marginBottom: 4, textAlign: 'center' }}>Casa</div>
                <select className="adm-select" value={lm.home?.short || ''} onChange={e => setTeam('home', e.target.value)}>
                  <option value="">-- Squadra --</option>
                  {teams
                    .filter(t => !lm.away?.short || t.short === lm.home?.short || t.short !== lm.away.short)
                    .map(t => <option key={t.short} value={t.short}>{getFlag(t)} {t.name}</option>)}
                </select>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--fg-3)', paddingBottom: 10, fontFamily: 'var(--font-display)' }}>VS</div>
              <div>
                <div className="adm-label" style={{ marginBottom: 4, textAlign: 'center' }}>Ospite</div>
                <select className="adm-select" value={lm.away?.short || ''} onChange={e => setTeam('away', e.target.value)}>
                  <option value="">-- Squadra --</option>
                  {teams
                    .filter(t => !lm.home?.short || t.short === lm.away?.short || t.short !== lm.home.short)
                    .map(t => <option key={t.short} value={t.short}>{getFlag(t)} {t.name}</option>)}
                </select>
              </div>
            </div>
            {!canStartLive && (
              <p className="adm-inline-hint">
                Seleziona due squadre diverse prima di avviare la diretta.
              </p>
            )}
          </div>
        </div>
      )}

      <div className={`adm-live-board${lm.active ? ' adm-live-board--active' : ''}`}>
        <div className="adm-scoreboard">
          <div className="adm-sb-team">
            <span className="adm-sb-flag">{getFlag(lm.home)}</span>
            <span className="adm-sb-name" style={{ color: lm.home?.color || '#fff' }}>{lm.home?.short || 'CASA'}</span>
          </div>
          <div className="adm-sb-score">
            <span>{lm.hs || 0}</span>
            <span className="adm-sb-sep">–</span>
            <span>{lm.as || 0}</span>
          </div>
          <div className="adm-sb-team">
            <span className="adm-sb-flag">{getFlag(lm.away)}</span>
            <span className="adm-sb-name" style={{ color: lm.away?.color || '#fff' }}>{lm.away?.short || 'OSPITE'}</span>
          </div>
        </div>

        {lm.active ? (
          <div className="adm-minute-control">
            <button className="adm-min-btn" onClick={() => setMinute(-1)} style={{ minWidth: 44 }}>−1'</button>
            <span className="adm-minute-badge">{lm.minute || 0}'</span>
            <button className="adm-min-btn adm-min-btn--plus" onClick={() => setMinute(1)} style={{ minWidth: 44 }}>+1'</button>
            <button className="adm-min-btn adm-min-btn--plus" onClick={() => setMinute(5)} style={{ minWidth: 44, fontSize: 13 }}>+5'</button>
            <button className="adm-min-btn adm-min-btn--plus" onClick={() => setMinute(10)} style={{ minWidth: 44, fontSize: 13 }}>+10'</button>
          </div>
        ) : (
          <div className="adm-minute-control">
            <span className="adm-minute-badge" style={{ color: 'var(--fg-3)', fontSize: 24 }}>{lm.minute || 0}'</span>
          </div>
        )}

        {lm.active && (
          <div className="adm-score-controls">
            <div className="adm-score-ctrl-col">
              <button className="adm-score-btn adm-score-btn--plus" onClick={() => setScore('hs', 1)}
                style={{ minHeight: 64, fontSize: 20 }}>
                ⚽ +1<br/><span style={{ fontSize: 13 }}>{lm.home?.short || 'CASA'}</span>
              </button>
              <button className="adm-score-btn adm-score-btn--minus" onClick={() => setScore('hs', -1)}
                style={{ minHeight: 48 }}>−1</button>
            </div>
            <div className="adm-score-ctrl-col">
              <button className="adm-score-btn adm-score-btn--plus" onClick={() => setScore('as', 1)}
                style={{ minHeight: 64, fontSize: 20 }}>
                ⚽ +1<br/><span style={{ fontSize: 13 }}>{lm.away?.short || 'OSPITE'}</span>
              </button>
              <button className="adm-score-btn adm-score-btn--minus" onClick={() => setScore('as', -1)}
                style={{ minHeight: 48 }}>−1</button>
            </div>
          </div>
        )}

        {lm.active && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
              <span className="adm-label" style={{ margin: 0 }}>Registra evento</span>
              {lm.events?.length > 0 && (
                <button
                  onClick={undoLastEvent}
                  style={{ fontSize: 12, color: 'var(--fg-3)', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                >
                  ↩ Annulla ultimo
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[lm.home, lm.away].filter(Boolean).map(team => (
                <div key={team.short} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                    {getFlag(team)} {team.short}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="adm-live-ev-btn adm-ev-goal" onClick={() => addEvent('goal', team.short)}
                      style={{ flex: 1, minHeight: 52, fontSize: 22, padding: '4px 0' }}>⚽</button>
                    <button className="adm-live-ev-btn adm-ev-yellow" onClick={() => addEvent('yellow', team.short)}
                      style={{ flex: 1, minHeight: 52, fontSize: 22, padding: '4px 0' }}>🟨</button>
                    <button className="adm-live-ev-btn adm-ev-red" onClick={() => addEvent('red', team.short)}
                      style={{ flex: 1, minHeight: 52, fontSize: 22, padding: '4px 0' }}>🟥</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {lm.events?.length > 0 && (
          <div className="adm-events-log">
            {[...lm.events].reverse().map((ev, i) => (
              <div key={i} className="adm-ev-row">
                <span className="min">{ev.min}'</span>
                <span>{ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : '🟥'}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', flex: 1 }}>
                  <b style={{ color: '#fff' }}>{ev.player}</b> · {ev.team}
                </span>
                <button className="adm-ev-del"
                  onClick={() => removeEvent(lm.events.length - 1 - i)}
                  style={{ minWidth: 36, minHeight: 36 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {addingEvent && (
        <div className="adm-overlay" onClick={() => setAddingEvent(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">
                {evType === 'goal' ? '⚽ Gol' : evType === 'yellow' ? '🟨 Giallo' : '🟥 Rosso'} · {evTeam} · {lm.minute}'
              </h3>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setAddingEvent(false)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-group">
                  <label className="adm-label">Giocatore</label>
                  {(() => {
                    const tObj = teams.find(t => t.short === evTeam) || (lm.home?.short === evTeam ? lm.home : lm.away);
                    const pList = tObj?.players || [];
                    if (pList.length > 0) {
                      return (
                        <select className="adm-select" value={evPlayer} onChange={e => setEvPlayer(e.target.value)} autoFocus>
                          <option value="">-- Seleziona Giocatore --</option>
                          {pList.map(p => <option key={p.id} value={p.name}>{p.number ? p.number + '. ' : ''}{p.name}</option>)}
                          <option value="Autogol">Autogol</option>
                        </select>
                      );
                    }
                    return <input className="adm-input" value={evPlayer} onChange={e => setEvPlayer(e.target.value)} placeholder="Nome cognome" autoFocus />;
                  })()}
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Nota (opz.)</label>
                  <input className="adm-input" value={evNote} onChange={e => setEvNote(e.target.value)} placeholder="es. colpo di testa, doppietta..." />
                </div>
                <div className="adm-form-actions">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setAddingEvent(false)}>Annulla</button>
                  <button className="adm-btn adm-btn-sm" onClick={confirmEvent} disabled={!evPlayer.trim()}>Salva evento</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
