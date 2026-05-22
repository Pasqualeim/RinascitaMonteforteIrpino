import { useState, useMemo, useEffect } from 'react';
import { DEFAULT_TEAMS, DEFAULT_GROUPS } from '../../data.js';
import { rmGetTeamGroupId } from '../../domain.js';
import { EmptyState, TeamCard } from '../../components.jsx';

function playerDisplayName(p) {
  if (p.nome || p.cognome) return [p.nome, p.cognome].filter(Boolean).join(' ');
  return p.name || '';
}

function RosterModal({ team, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const players = team.players || [];
  const sortedPlayers = [...players].sort((a, b) => {
    const ca = (a.cognome || a.name || '').toLowerCase();
    const cb = (b.cognome || b.name || '').toLowerCase();
    return ca.localeCompare(cb, 'it');
  });

  const captainName = team.captain?.toLowerCase().trim();

  return (
    <div className="rm-modal-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={e => e.stopPropagation()}>
        <div className="rm-modal-handle" />
        <div className="rm-roster-header">
          <div className="rm-roster-crest" style={{ borderColor: team.color, color: team.color }}>{team.short}</div>
          <div>
            <div className="rm-roster-team-name">{team.flag ? team.flag + ' ' : ''}{team.name}</div>
            <div className="rm-roster-meta">
              {players.length > 0 ? `${players.length} giocatori` : 'Nessun giocatore'}
              {team.captain && <> · Cap. {team.captain}</>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: '#1a1a1a', border: 0, color: 'var(--fg-2)', fontSize: 18, width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >✕</button>
        </div>
        <div className="rm-roster-body">
          <div className="rm-roster-section-title">Rosa</div>
          {players.length === 0
            ? <div className="rm-roster-empty">Nessun giocatore registrato.</div>
            : sortedPlayers.map((p, i) => {
                const name = playerDisplayName(p);
                const isCap = captainName && name.toLowerCase().trim() === captainName;
                return (
                  <div key={p.id || i} className="rm-player-row">
                    <span className="rm-player-num">{i + 1}</span>
                    <span className="rm-player-name">{name}</span>
                    {isCap && <span className="rm-player-captain">Capitano</span>}
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

export function TeamsScreen({ data, tournament }) {
  const [selGroup, setSelGroup] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const teams  = tournament?.teams  || data?.teams  || DEFAULT_TEAMS;
  const groups = tournament?.groups || data?.groups || DEFAULT_GROUPS || [];

  const filtered = useMemo(() => {
    if (selGroup === 'all') return teams;
    if (selGroup === 'none') return teams.filter(t => !rmGetTeamGroupId(t));
    return teams.filter(t => rmGetTeamGroupId(t) === selGroup);
  }, [selGroup, teams]);

  const tabs = [
    { id: 'all', label: `Tutte (${teams.length})` },
    ...groups.map(g => ({ id: g.id, label: `${g.name} (${teams.filter(t => rmGetTeamGroupId(t) === g.id).length})` })),
  ];

  return (
    <div data-screen-label="teams">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{filtered.length} squadre · 2026</span>
            <h3 className="rm-section-title">Squadre</h3>
          </div>
        </div>
        {tabs.length > 1 && (
          <div className="rm-tabs">
            {tabs.map(t => <button key={t.id} className={`rm-tab ${selGroup===t.id?'on':''}`} onClick={() => setSelGroup(t.id)}>{t.label}</button>)}
          </div>
        )}
        {filtered.length === 0
          ? <EmptyState icon="👥" title="Nessuna squadra" sub="Le squadre partecipanti verranno pubblicate dallo staff."/>
          : <div className="rm-team-grid">{filtered.map(t => <TeamCard key={t.short} team={t} onClick={() => setSelectedTeam(t)}/>)}</div>
        }
      </section>
      {selectedTeam && <RosterModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />}
    </div>
  );
}

