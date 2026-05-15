import { useState } from 'react';
import { DEFAULT_TEAMS, DEFAULT_NATIONS_2026, DEFAULT_NEWS, rmAdminDomain, rmGetTeamIdMap } from '../../data.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

export function LiveSection({ data, onSave, editionId, tournamentId }) {
  const [lm, setLm] = useState(() => JSON.parse(JSON.stringify(data.live_match)));
  const [teams] = useState(data.teams || DEFAULT_TEAMS);
  const [addingEvent, setAddingEvent] = useState(false);
  const [evPlayer, setEvPlayer] = useState('');
  const [evTeam, setEvTeam] = useState(lm.home?.short || '');
  const [evNote, setEvNote] = useState('');
  const [evType, setEvType] = useState('goal');

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

  function save(updatedLm, updatedScorers) {
    const newLm = updatedLm || lm;
    const newData = { ...data, live_match: newLm };
    if (updatedScorers) newData.scorers = updatedScorers;
    onSave(newData, updatedScorers ? 'Partita e marcatori aggiornati' : 'Partita live aggiornata');
    setLm({ ...newLm });
    // Dual-write live state to relational table (fire-and-forget)
    if (tournamentId) {
      const teamIdMap = rmGetTeamIdMap();
      rmAdminDomain.updateLive({
        tournament_id: tournamentId,
        active: newLm.active ?? false,
        home_team_id: teamIdMap[newLm.home?.short] || null,
        away_team_id: teamIdMap[newLm.away?.short] || null,
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

  function addEvent(type) {
    setEvType(type);
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
            <div className="adm-live-event-btns">
              <button className="adm-live-ev-btn adm-ev-goal" onClick={() => addEvent('goal')}
                style={{ minHeight: 64, fontSize: 28 }}>⚽<span>Gol</span></button>
              <button className="adm-live-ev-btn adm-ev-yellow" onClick={() => addEvent('yellow')}
                style={{ minHeight: 64, fontSize: 28 }}>🟨<span>Giallo</span></button>
              <button className="adm-live-ev-btn adm-ev-red" onClick={() => addEvent('red')}
                style={{ minHeight: 64, fontSize: 28 }}>🟥<span>Rosso</span></button>
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
                {evType === 'goal' ? '⚽ Gol' : evType === 'yellow' ? '🟨 Giallo' : '🟥 Rosso'} · {lm.minute}'
              </h3>
              <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setAddingEvent(false)}>✕</button>
            </div>
            <div className="adm-modal-scroll">
              <div className="adm-form">
                <div className="adm-form-group">
                  <label className="adm-label">Squadra</label>
                  <select className="adm-select" value={evTeam} onChange={e => { setEvTeam(e.target.value); setEvPlayer(''); }}>
                    {(lm.home || lm.away ? [lm.home, lm.away].filter(Boolean) : teams).map(t => (
                      <option key={t.short} value={t.short}>{getFlag(t)} {t.name}</option>
                    ))}
                  </select>
                </div>
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

export function NewsSection({ data, onSave }) {
  const [news, setNews] = useState(data.news || DEFAULT_NEWS);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const TONE_OPTS = [
    { value: '', label: 'Normale' },
    { value: 'alert', label: 'Alert (rosso)' },
    { value: 'warn', label: 'Attenzione (giallo)' },
  ];
  const CAT_OPTS = ['News', 'Avviso', 'Regolamento', 'Eventi', 'Sponsor'];

  function saveAll(list) {
    setNews(list);
    onSave({ ...data, news: list }, 'Avvisi aggiornati');
  }

  function saveItem(item) {
    const exists = news.find(n => n.id === item.id);
    const updated = exists ? news.map(n => n.id === item.id ? item : n) : [item, ...news];
    saveAll(updated);
    setEditing(null);
  }

  function deleteItem(id) {
    saveAll(news.filter(n => n.id !== id));
    setDeleting(null);
  }

  function newItem() {
    setEditing({ id: 'n' + Date.now(), cat: 'News', tone: '', date: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), title: '', body: '', pinned: false });
  }

  return (
    <div>
      <h2 className="adm-section-title">Avvisi & News</h2>
      <p className="adm-section-sub">Gestisci la bacheca pubblica. Gli avvisi in evidenza appaiono in cima.</p>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">{news.length} avvisi</span>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={newItem}>+ Nuovo avviso</button>
        </div>
        {news.length === 0 ? (
          <div className="adm-empty">Nessun avviso. Clicca "Nuovo avviso" per aggiungerne uno.</div>
        ) : (
          news.map(n => (
            <div key={n.id} className="adm-item-row">
              <div className="adm-item-row-body">
                <div className="adm-item-title">{n.pinned ? '📌 ' : ''}{n.title || '(senza titolo)'}</div>
                <div className="adm-item-meta">{n.cat} · {n.date} {n.tone ? `· ${n.tone}` : ''}</div>
              </div>
              <div className="adm-item-actions">
                <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...n })}><EditIcon size={16}/></button>
                <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(n.id)}><TrashIcon size={16}/></button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <NewsForm item={editing} catOpts={CAT_OPTS} toneOpts={TONE_OPTS}
          onSave={saveItem} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <Confirm msg="Eliminare questo avviso?" onOk={() => deleteItem(deleting)} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function NewsForm({ item, catOpts, toneOpts, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{item.title ? 'Modifica avviso' : 'Nuovo avviso'}</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Categoria</label>
                <select className="adm-select" value={form.cat} onChange={e => set('cat', e.target.value)}>
                  {catOpts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Tono</label>
                <select className="adm-select" value={form.tone || ''} onChange={e => set('tone', e.target.value)}>
                  {toneOpts.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Data</label>
              <input className="adm-input" value={form.date} onChange={e => set('date', e.target.value)} placeholder="es. 29 Giu · 14:20" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Titolo</label>
              <input className="adm-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titolo dell'avviso" required />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Testo</label>
              <textarea className="adm-textarea" value={form.body} onChange={e => set('body', e.target.value)} placeholder="Descrizione..." rows={4} />
            </div>
            <label className="adm-checkbox-row">
              <input type="checkbox" checked={!!form.pinned} onChange={e => set('pinned', e.target.checked)} />
              In evidenza (📌)
            </label>
            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={() => onSave(form)} disabled={!form.title.trim()}>Salva</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
