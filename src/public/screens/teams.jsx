import { useState, useMemo } from 'react';
import { DEFAULT_TEAMS, DEFAULT_GROUPS } from '../../data.js';
import { rmGetTeamGroupId } from '../../domain.js';
import { EmptyState, TeamCard } from '../../components.jsx';

export function TeamsScreen({ data, tournament }) {
  const [selGroup, setSelGroup] = useState('all');
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
          : <div className="rm-team-grid">{filtered.map(t => <TeamCard key={t.short} team={t}/>)}</div>
        }
      </section>
    </div>
  );
}

