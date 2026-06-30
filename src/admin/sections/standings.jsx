import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';

const POS_COLOR = ['#F5C518', '#C0C0C0', '#CD7F32'];

const FORM_STYLE = {
  W: { bg: 'rgba(0,230,118,0.15)', color: 'var(--brand-green)' },
  D: { bg: 'rgba(255,255,255,0.08)', color: 'var(--fg-3)' },
  L: { bg: 'rgba(255,61,61,0.12)', color: '#FF6B6B' },
};

export function StandingsSection({ data, onRefresh, teamsPerGroupAdvance }) {
  const standings_groups = data.standings_groups || [];
  const allTeams = data.teams || [];
  const [selIdx, setSelIdx] = useState(0);
  const [penOpen, setPenOpen] = useState(false);
  const [busyShort, setBusyShort] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  if (standings_groups.length === 0) {
    return (
      <div>
        <h2 className="adm-section-title">Classifica</h2>
        <div className="adm-card">
          <div className="adm-empty">Nessun girone configurato. Crea gironi e assegna le squadre.</div>
        </div>
      </div>
    );
  }

  const current = standings_groups[selIdx] || standings_groups[0];
  const advance = current?.qualify_count ?? teamsPerGroupAdvance ?? 2;

  // Risolve la squadra (con registration_id + penalità correnti) per ogni riga di classifica.
  const teamByShort = {};
  for (const t of allTeams) teamByShort[t.short] = t;

  async function setPenalty(short, value) {
    const team = teamByShort[short];
    if (!team?.registration_id) { setErrMsg('Squadra non iscritta: impossibile applicare la penalità.'); return; }
    const next = Math.max(0, value);
    setBusyShort(short);
    setErrMsg('');
    try {
      await rmAdminDomain.updateRegistration(team.registration_id, { penalty_points: next });
      await onRefresh?.(next > 0 ? `Penalità di ${next} ${next === 1 ? 'punto' : 'punti'} applicata` : 'Penalità rimossa');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio penalità');
    } finally {
      setBusyShort(null);
    }
  }

  return (
    <div>
      <h2 className="adm-section-title">Classifica</h2>

      {standings_groups.length > 1 && (
        <div className="rm-tabs" style={{ marginBottom: 14 }}>
          {standings_groups.map((g, i) => (
            <button key={g.id} className={`rm-tab ${selIdx === i ? 'on' : ''}`} onClick={() => setSelIdx(i)}>{g.name}</button>
          ))}
        </div>
      )}

      <div className="adm-card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 28px 28px 28px 28px 32px', gap: '0 8px', padding: '8px 14px', borderBottom: '1px solid var(--border-1)', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>#</span>
          <span>Squadra</span>
          <span style={{ textAlign: 'center' }}>G</span>
          <span style={{ textAlign: 'center' }}>V</span>
          <span style={{ textAlign: 'center' }}>P</span>
          <span style={{ textAlign: 'center' }}>DR</span>
          <span style={{ textAlign: 'center' }}>Pt</span>
        </div>

        {current.rows.length === 0 ? (
          <div className="adm-empty">Nessuna partita FT. I risultati appariranno automaticamente.</div>
        ) : (
          current.rows.map((r, i) => {
            const posColor = POS_COLOR[i] || 'var(--fg-3)';
            const isQualifying = i < advance;
            const dr = r.gf - r.gs;
            return (
              <div key={r.short}>
                {/* Qualifying line */}
                {i === advance && (
                  <div style={{ height: 1, background: 'rgba(0,230,118,0.3)', margin: '0 14px', position: 'relative' }}>
                    <span style={{ position: 'absolute', right: 0, top: -9, fontSize: 9, color: 'var(--brand-green)', letterSpacing: '0.08em' }}>QUALIFICATI ↑</span>
                  </div>
                )}
                <div style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 28px 28px 28px 28px 32px', gap: '0 8px',
                  padding: '10px 14px', alignItems: 'center',
                  borderBottom: '1px solid var(--border-1)',
                  background: isQualifying ? 'rgba(0,230,118,0.02)' : 'transparent',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: posColor, lineHeight: 1 }}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {r.flag && <span style={{ fontSize: 16, lineHeight: 1 }}>{r.flag}</span>}
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      {r.pen > 0 && (
                        <span title={`${r.pen} ${r.pen === 1 ? 'punto' : 'punti'} di penalizzazione`} style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#FF6B6B', background: 'rgba(255,61,61,0.12)', borderRadius: 4, padding: '1px 5px' }}>−{r.pen}</span>
                      )}
                    </div>
                    {r.form?.length > 0 && (
                      <div style={{ display: 'flex', gap: 3 }}>
                        {r.form.slice(-5).map((f, fi) => {
                          const s = FORM_STYLE[f] || FORM_STYLE.D;
                          return (
                            <span key={fi} style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: s.bg, color: s.color }}>
                              {f}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--fg-2)', textAlign: 'center' }}>{r.g}</span>
                  <span style={{ fontSize: 13, color: 'var(--brand-green)', textAlign: 'center', fontWeight: 600 }}>{r.v}</span>
                  <span style={{ fontSize: 13, color: '#FF6B6B', textAlign: 'center' }}>{r.p}</span>
                  <span style={{ fontSize: 13, color: dr > 0 ? 'var(--brand-green)' : dr < 0 ? '#FF6B6B' : 'var(--fg-3)', textAlign: 'center' }}>
                    {dr > 0 ? '+' : ''}{dr}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: isQualifying ? 'var(--brand-gold)' : '#fff', textAlign: 'center' }}>{r.pt}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 8, paddingLeft: 4 }}>
        G=giocate · V=vinte · P=perse · DR=diff. reti · Pt=punti · Calcolata automaticamente dai risultati FT
      </div>

      {/* ── Penalità (sconfitta a tavolino / mancata presentazione) ── */}
      <div className="adm-card" style={{ marginTop: 14 }}>
        <div className="adm-card-header" style={{ cursor: 'pointer' }} onClick={() => setPenOpen(o => !o)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="adm-card-title">⚖️ Penalità — {current.name}</span>
            {current.rows.some(r => r.pen > 0) && !penOpen && (
              <span style={{ fontSize: 11, color: '#FF6B6B', background: 'rgba(255,61,61,0.1)', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>Attive</span>
            )}
          </div>
          <span style={{ fontSize: 16, color: 'var(--fg-3)', transform: penOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms', display: 'inline-block' }}>▾</span>
        </div>
        {penOpen && (
          <div className="adm-card-body" style={{ paddingTop: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 12px' }}>
              Sottrai punti in classifica a una squadra (es. <strong style={{ color: '#FF6B6B' }}>−1</strong> per sconfitta a tavolino o mancata presentazione). La classifica si aggiorna automaticamente.
            </p>
            {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {current.rows.map(r => {
                const pen = r.pen || 0;
                const busy = busyShort === r.short;
                return (
                  <div key={r.short} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-1)' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{r.flag || '🏳️'}</span>
                    <span style={{ fontSize: 14, color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setPenalty(r.short, pen - 1)} disabled={busy || pen <= 0} title="Riduci penalità">−</button>
                      <span style={{ minWidth: 44, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, color: pen > 0 ? '#FF6B6B' : 'var(--fg-3)' }}>
                        {pen > 0 ? `−${pen}` : '0'}
                      </span>
                      <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setPenalty(r.short, pen + 1)} disabled={busy} title="Aumenta penalità">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
