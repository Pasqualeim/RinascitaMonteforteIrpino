import { useState } from 'react';

export function StandingsSection({ data }) {
  const standings_groups = data.standings_groups || [];
  const [selIdx, setSelIdx] = useState(0);

  if (standings_groups.length === 0) {
    return (
      <div>
        <h2 className="adm-section-title">Classifica</h2>
        <div className="adm-card">
          <div className="adm-empty">Nessun girone configurato. Crea gironi dalla sezione Gironi e assegna le squadre.</div>
        </div>
      </div>
    );
  }

  const current = standings_groups[selIdx] || standings_groups[0];

  return (
    <div>
      <h2 className="adm-section-title">Classifica</h2>
      <div style={{ padding: '10px 16px', background: 'rgba(0,230,118,0.07)', border: '1px solid var(--border-brand)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--brand-green)' }}>
        ⚡ Calcolata automaticamente dai risultati FT, per partite tra squadre dello stesso girone.
      </div>
      {standings_groups.length > 1 && (
        <div className="rm-tabs" style={{ marginBottom: 16 }}>
          {standings_groups.map((g, i) => (
            <button key={g.id} className={`rm-tab ${selIdx === i ? 'on' : ''}`} onClick={() => setSelIdx(i)}>{g.name}</button>
          ))}
        </div>
      )}
      <div className="adm-card">
        {current.rows.length === 0 ? (
          <div className="adm-empty">Nessuna partita FT per questo girone. I risultati appariranno automaticamente.</div>
        ) : (
          current.rows.map((r, i) => (
            <div key={r.short} className="adm-item-row">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand-green)', width: 28 }}>{i + 1}</div>
              <div className="adm-crest" style={{ borderColor: r.color, color: r.color }}>{r.flag || r.short}</div>
              <div className="adm-item-row-body">
                <div className="adm-item-title">{r.flag ? r.flag + ' ' : ''}{r.name}</div>
                <div className="adm-item-meta">G{r.g} V{r.v} N{r.n} P{r.p} · GF{r.gf} GS{r.gs} · <b style={{ color: 'var(--brand-green)' }}>{r.pt}pt</b></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
