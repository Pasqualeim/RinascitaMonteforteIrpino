import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';

const IT_MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const IT_MONTH_MAP = { gen:'01',feb:'02',mar:'03',apr:'04',mag:'05',giu:'06',lug:'07',ago:'08',set:'09',ott:'10',nov:'11',dic:'12' };

function isoToItalian(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${IT_MONTHS[parseInt(m) - 1]}`;
}

function italianToIso(str) {
  if (!str) return '';
  const match = str.match(/^(\d{1,2})\s+(\w+)$/i);
  if (!match) return '';
  const month = IT_MONTH_MAP[match[2].toLowerCase()];
  if (!month) return '';
  return `${new Date().getFullYear()}-${month}-${match[1].padStart(2, '0')}`;
}

const KO_SORT = ['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale'];

function phaseContext(phaseName, sortedPhaseNames) {
  if (phaseName === 'Finale 3°/4° posto') return 'Perdenti delle semifinali';
  const idx = sortedPhaseNames.indexOf(phaseName);
  if (idx === 0) return 'Qualificati dai gironi';
  if (idx > 0) return `Vincitori: ${sortedPhaseNames[idx - 1]}`;
  return '';
}

function buildKnockoutRounds(numTeams) {
  const rounds = [];
  let n = numTeams;
  while (n >= 2) {
    const half = Math.floor(n / 2);
    const name = n === 2 ? 'Finale'
      : n === 4 ? 'Semifinali'
      : n === 8 ? 'Quarti di finale'
      : n === 16 ? 'Ottavi di finale'
      : n === 32 ? 'Sedicesimi di finale'
      : `Turno di ${n}`;
    rounds.push({ phase: name, count: half });
    n = half;
  }
  return rounds;
}

export function SetupSection({ data, onRefresh, tournamentId, teamsPerGroupAdvance }) {
  const groups = data.groups || [];
  const allTeams = data.teams || [];

  const [ko3rd, setKo3rd] = useState(true);
  const [koBusy, setKoBusy] = useState(false);
  const [koMsg, setKoMsg] = useState('');
  const [genPanelOpen, setGenPanelOpen] = useState(false);
  const [seedingMode, setSeedingMode] = useState(
    () => localStorage.getItem('rm_seeding_mode') || 'cross'
  );
  const [koConfirm, setKoConfirm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null); // { id, isoDate, time }
  const [savingMatch, setSavingMatch] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [warnMatch, setWarnMatch] = useState(null); // id of match with existing date asking confirm

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Fase eliminatoria</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Fase eliminatoria</h2>
        <div className="adm-card">
          <div className="adm-empty">Crea prima i gironi e configura la qualificazione nel tab <strong>Gironi</strong>.</div>
        </div>
      </div>
    );
  }

  const numQualified = groups.length * teamsPerGroupAdvance;
  const koRounds = numQualified >= 2 ? buildKnockoutRounds(numQualified) : [];
  const koTotalMatches = koRounds.reduce((s, r) => s + r.count, 0) + (ko3rd && numQualified >= 4 ? 1 : 0);

  const KNOCKOUT_NAMES = new Set(['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale', '3° posto']);
  const hasKnockoutMatches = (data.matches_giornata || []).some(g => KNOCKOUT_NAMES.has(g.day) && (g.items || []).length > 0);
  const existingKoCount = (data.matches_giornata || [])
    .filter(g => KNOCKOUT_NAMES.has(g.day))
    .reduce((s, d) => s + (d.items?.length || 0), 0);

  const qualConfirmed = localStorage.getItem('rm_teams_per_group_advance') !== null;

  async function saveMatchDateTime() {
    if (!editingMatch) return;
    setSavingMatch(true);
    setSaveError('');
    try {
      await rmAdminDomain.updateMatch(editingMatch.id, {
        match_date: editingMatch.isoDate || null,
        match_time: editingMatch.time || null,
      });
      setEditingMatch(null);
      setSaveError('');
      await onRefresh('Data/ora aggiornata');
    } catch (err) {
      setSaveError(err?.message || 'Errore nel salvataggio');
    } finally {
      setSavingMatch(false);
    }
  }

  // Check if all group matches are completed
  const groupNames = new Set((data.groups || []).map(g => g.name));
  const groupMatches = (data.matches_giornata || []).filter(g => groupNames.has(g.day)).flatMap(g => g.items || []);
  const groupsDone = groupMatches.length > 0 && groupMatches.every(m => m.status === 'ft');

  // First knockout round info
  const firstRoundPhase = koRounds[0]?.phase;
  const firstRoundSlots = (data.matches_giornata || []).find(g => g.day === firstRoundPhase)?.items || [];
  const hasUnseededSlots = firstRoundSlots.length > 0 && firstRoundSlots.some(m => !m.home_team_id && !m.away_team_id && !m.home && !m.away);

  // Build seeded pairs from standings
  function buildSeedPairs() {
    const standings = data.standings_groups || [];
    if (standings.length < 2 || seedingMode === 'manual') return null;
    const qualified = standings.map(sg => ({
      teams: sg.rows.slice(0, teamsPerGroupAdvance).map(row => allTeams.find(t => t.short === row.short)).filter(Boolean),
    }));
    if (qualified.some(q => q.teams.length < teamsPerGroupAdvance)) return null;
    if (seedingMode === 'cross' && qualified.length === 2) {
      return [
        { home: qualified[0].teams[0], away: qualified[1].teams[1] },
        { home: qualified[1].teams[0], away: qualified[0].teams[1] },
      ];
    }
    if (seedingMode === 'rank') {
      const pairs = [];
      for (let r = 0; r < teamsPerGroupAdvance; r++) {
        const rankTeams = qualified.map(q => q.teams[r]).filter(Boolean);
        for (let i = 0; i < rankTeams.length - 1; i += 2)
          pairs.push({ home: rankTeams[i], away: rankTeams[i + 1] });
      }
      return pairs.length > 0 ? pairs : null;
    }
    return null;
  }

  async function generateKnockout() {
    if (numQualified < 2) { setKoMsg('Servono almeno 2 squadre qualificate.'); return; }
    setKoBusy(true);
    setKoMsg('');
    try {
      // Delete ALL existing knockout slots first — prevents duplicates on regenerate
      const KNOCKOUT_NAMES = new Set(['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale', '3° posto']);
      const existingSlots = (data.matches_giornata || [])
        .filter(g => KNOCKOUT_NAMES.has(g.day))
        .flatMap(g => g.items || [])
        .filter(m => m.id);
      for (const slot of existingSlots) {
        await rmAdminDomain.deleteMatch(slot.id);
      }

      let sortOrder = 1000;
      for (const round of koRounds) {
        for (let i = 0; i < round.count; i++) {
          await rmAdminDomain.createMatch({
            tournament_id: tournamentId,
            home_team_id: null, away_team_id: null,
            status: 'sch', phase: round.phase,
            group_id: null, sort_order: sortOrder++,
          });
        }
      }
      if (ko3rd && numQualified >= 4) {
        await rmAdminDomain.createMatch({
          tournament_id: tournamentId,
          home_team_id: null, away_team_id: null,
          status: 'sch', phase: 'Finale 3°/4° posto',
          group_id: null, sort_order: sortOrder++,
        });
      }
      setKoConfirm(false);
      setGenPanelOpen(false);
      await onRefresh(`Fase eliminatoria generata: ${koTotalMatches} partite — puoi già inserire le date`);
    } catch (err) {
      setKoMsg('Errore: ' + (err?.message || ''));
    } finally {
      setKoBusy(false);
    }
  }

  async function applySeeding() {
    const pairs = buildSeedPairs();
    if (!pairs) return;
    setKoBusy(true);
    setKoMsg('');
    try {
      const slots = firstRoundSlots.filter(m => !m.home && !m.away);
      for (let i = 0; i < Math.min(pairs.length, slots.length); i++) {
        const slot = slots[i];
        const pair = pairs[i];
        if (pair.home?.id || pair.away?.id) {
          await rmAdminDomain.updateMatch(slot.id, {
            home_team_id: pair.home?.id || null,
            away_team_id: pair.away?.id || null,
          });
        }
      }
      await onRefresh('Abbinamenti applicati');
    } catch (err) {
      setKoMsg('Errore abbinamento: ' + (err?.message || ''));
    } finally {
      setKoBusy(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Fase eliminatoria</h2>
        <p className="adm-section-sub" style={{ margin: 0 }}>
          {qualConfirmed
            ? `${groups.length} gironi × ${teamsPerGroupAdvance} = ${numQualified} squadre qualificate`
            : 'Configura prima la qualificazione nel tab Gironi'}
        </p>
      </div>

      {!qualConfirmed && (
        <div className="adm-card">
          <div className="adm-empty">
            Vai nel tab <strong>Gironi</strong> e conferma quante squadre per girone avanzano.
          </div>
        </div>
      )}

      {qualConfirmed && (
        <>
          {/* ── Config + genera ── */}
          <div className="adm-card" style={{ marginBottom: 12 }}>
            {hasKnockoutMatches && !genPanelOpen ? (
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                  ✓ Fase eliminatoria generata · <strong>{existingKoCount}</strong> partite
                </span>
                <button
                  className="adm-btn adm-btn-sm"
                  style={{ background: 'transparent', border: '1px solid rgba(255,61,61,0.5)', color: '#FF6B6B', flexShrink: 0 }}
                  onClick={() => setGenPanelOpen(true)}>
                  ↺ Rigenera
                </button>
              </div>
            ) : (
            <div className="adm-card-body" style={{ paddingTop: 12 }}>
              {hasKnockoutMatches && (
                <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginBottom: 12 }} onClick={() => setGenPanelOpen(false)}>Annulla</button>
              )}
              {koRounds.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 8 }}>Fasi generate automaticamente:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {koRounds.map((r, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-1)', borderRadius: 6, padding: '4px 10px', color: 'var(--fg-1)' }}>
                          {r.phase} <span style={{ color: 'var(--fg-3)' }}>×{r.count}</span>
                        </span>
                        {(i < koRounds.length - 1 || (ko3rd && numQualified >= 4)) && (
                          <span style={{ color: 'var(--fg-3)', fontSize: 11 }}>→</span>
                        )}
                      </span>
                    ))}
                    {ko3rd && numQualified >= 4 && (
                      <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-1)', borderRadius: 6, padding: '4px 10px', color: 'var(--fg-3)' }}>
                        3°/4° posto ×1
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--brand-green)', marginTop: 10, fontWeight: 600 }}>
                    Totale: {koTotalMatches} partite
                  </div>
                </div>
              )}

              {/* Seeding mode */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Abbinamenti primo turno</div>
                {[
                  { id: 'cross', label: 'Incrocio gironi', desc: '1° Girone A vs 2° Girone B · 1° Girone B vs 2° Girone A' },
                  { id: 'rank',  label: 'Per rango', desc: 'I migliori tra loro, i secondi tra loro' },
                  { id: 'manual', label: 'Manuale', desc: 'Assegni le squadre tu tramite tab Partite' },
                ].map(opt => (
                  <button key={opt.id} type="button"
                    onClick={() => { setSeedingMode(opt.id); localStorage.setItem('rm_seeding_mode', opt.id); }}
                    style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', marginBottom: 6,
                      padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                      background: seedingMode === opt.id ? 'rgba(0,230,118,0.06)' : 'transparent',
                      border: `1px solid ${seedingMode === opt.id ? 'var(--brand-green)' : 'var(--border-1)'}`,
                      color: '#fff', transition: 'all 140ms' }}>
                    <span style={{ fontSize: 13, fontWeight: seedingMode === opt.id ? 700 : 400, color: seedingMode === opt.id ? 'var(--brand-green)' : 'var(--fg-1)', marginBottom: 2 }}>{opt.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{opt.desc}</span>
                  </button>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-2)', marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={ko3rd} onChange={e => setKo3rd(e.target.checked)} />
                Genera partita 3°/4° posto
              </label>

              {/* Warning se gironi non finiti */}
              {!groupsDone && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--fg-2)', marginBottom: 12, lineHeight: 1.5 }}>
                  <span style={{ flex: 'none' }}>ℹ️</span>
                  <span>I gironi non sono ancora terminati. Gli slot verranno creati <strong>senza squadre</strong> — puoi già inserire le date. Il sistema applicherà gli abbinamenti automaticamente quando i gironi finiscono.</span>
                </div>
              )}

              {koConfirm ? (
                <div style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, color: '#FF3D3D', fontWeight: 600, marginBottom: 8 }}>
                    ⚠️ Esistono già {existingKoCount} partite eliminatorie. Rigenerando verranno cancellate — le date inserite andranno perse.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setKoConfirm(false)}>Annulla</button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={generateKnockout} disabled={koBusy}>
                      {koBusy ? 'Generazione…' : 'Rigenera comunque'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    className="adm-btn adm-btn-sm"
                    style={{ border: '1px solid var(--brand-gold)', color: '#fff', background: 'transparent' }}
                    onClick={() => hasKnockoutMatches ? setKoConfirm(true) : generateKnockout()}
                    disabled={koBusy || numQualified < 2}>
                    {koBusy ? 'Generazione…' : hasKnockoutMatches ? 'Rigenera eliminatorie' : 'Genera eliminatorie'}
                  </button>
                  {koMsg && <span style={{ fontSize: 13, color: koMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>{koMsg}</span>}
                </div>
              )}
            </div>
            )}
          </div>

          {/* ── Applica abbinamenti ── */}
          {hasKnockoutMatches && hasUnseededSlots && groupsDone && seedingMode !== 'manual' && (
            <div className="adm-card" style={{ marginBottom: 12, border: '1px solid rgba(0,230,118,0.3)', background: 'rgba(0,230,118,0.04)' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-green)', marginBottom: 3 }}>🎯 Gironi conclusi — abbinamenti pronti</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                    Applica la modalità <strong>{seedingMode === 'cross' ? 'incrocio gironi' : 'per rango'}</strong> agli slot del {firstRoundPhase || 'primo turno'}.
                  </div>
                </div>
                <button className="adm-btn adm-btn-sm" onClick={applySeeding} disabled={koBusy} style={{ flexShrink: 0 }}>
                  {koBusy ? '…' : 'Applica'}
                </button>
              </div>
              {koMsg && <div style={{ padding: '0 16px 12px', fontSize: 12, color: koMsg.startsWith('Errore') ? '#FF3D3D' : 'var(--brand-green)' }}>{koMsg}</div>}
            </div>
          )}

          {/* ── Partite generate ── */}
          {hasKnockoutMatches && (() => {
            const KNOCKOUT_NAMES = new Set(['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale', '3° posto']);
            const koPhases = (data.matches_giornata || []).filter(g => KNOCKOUT_NAMES.has(g.day) && (g.items || []).length > 0);
            const phaseOrdinals = ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima', 'ottava'];
            const statusBadge = { live: { label: '🔴 In corso', color: '#FF3D3D' }, ft: { label: '✅ Terminata', color: 'var(--brand-green)' }, sch: { label: 'Da giocare', color: 'var(--fg-3)' } };
            return (
              <div className="adm-card">
                <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border-1)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-gold)', marginBottom: 2 }}>
                    Slot partite ({existingKoCount})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                    {seedingMode === 'manual'
                      ? 'Abbinamenti manuali — assegna le squadre nel tab Partite dopo i gironi.'
                      : seedingMode === 'cross'
                      ? 'Abbinamenti automatici (incrocio gironi) — rigenera per applicare dopo i gironi.'
                      : 'Abbinamenti automatici (per rango) — rigenera per applicare dopo i gironi.'}
                  </div>
                </div>
                {(() => {
              const sortedPhaseNames = koPhases
                .map(p => p.day)
                .filter(n => KO_SORT.includes(n))
                .sort((a, b) => KO_SORT.indexOf(a) - KO_SORT.indexOf(b));
              return koPhases.map(phase => {
                  const items = phase.items || [];
                  return (
                    <div key={phase.day} style={{ borderBottom: '1px solid var(--border-1)' }}>
                      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{phase.day}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{items.length} {items.length === 1 ? 'partita' : 'partite'}</span>
                      </div>
                      {items.map((m, i) => {
                        const isTbd = !m.home?.short && !m.away?.short;
                        const badge = statusBadge[m.status] || statusBadge.sch;
                        const isEditing = editingMatch?.id === m.id;
                        const context = phaseContext(phase.day, sortedPhaseNames);
                        return (
                          <div key={m.id} style={{ borderTop: '1px solid var(--border-1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px 10px 24px' }}>
                              <div style={{ flex: 1 }}>
                                {isTbd ? (
                                  <div>
                                    <div style={{ fontSize: 13, color: 'var(--fg-2)', fontStyle: 'italic' }}>
                                      {items.length > 1 ? `Partita ${i + 1}` : phase.day}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{context}</div>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                                      {m.home?.name || m.home?.short} <span style={{ color: 'var(--fg-3)', fontWeight: 400, fontSize: 12 }}>{m.hs != null ? `${m.hs}–${m.as}` : 'vs'}</span> {m.away?.name || m.away?.short}
                                    </div>
                                  </div>
                                )}
                                {(m.date || m.time) && !isEditing && (
                                  <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 3 }}>📅 {isoToItalian(m.date)}{m.date && m.time ? ' · ' : ''}{m.time}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: badge.color }}>{badge.label}</span>
                                {!isEditing && (
                                  <button
                                    className="adm-btn adm-btn-ghost adm-btn-sm"
                                    style={{ fontSize: 11, padding: '3px 8px' }}
                                    onClick={() => {
                                      const hasDT = !!(m.date || m.time);
                                      if (hasDT && warnMatch !== m.id) { setWarnMatch(m.id); return; }
                                      setWarnMatch(null);
                                      setSaveError('');
                                      setEditingMatch({ id: m.id, isoDate: m.date || '', time: m.time || '' });
                                    }}>
                                    {(m.date || m.time) ? '✎ Modifica' : '+ Data/ora'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Warning modifica già salvata */}
                            {warnMatch === m.id && !isEditing && (
                              <div style={{ margin: '0 16px 10px 24px', background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 12, color: '#FF3D3D', fontWeight: 600, marginBottom: 6 }}>⚠️ Data/ora già impostata</div>
                                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 10 }}>Vuoi sovrascrivere 📅 {isoToItalian(m.date)}{m.date && m.time ? ' · ' : ''}{m.time}?</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setWarnMatch(null)}>Annulla</button>
                                  <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => { setWarnMatch(null); setSaveError(''); setEditingMatch({ id: m.id, isoDate: m.date || '', time: m.time || '' }); }}>
                                    Sì, modifica
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Form inline data/ora */}
                            {isEditing && (
                              <div style={{ margin: '0 16px 14px', background: '#0a0a0a', borderRadius: 10, border: '1px solid var(--border-1)', padding: '14px 14px 12px', overflow: 'hidden' }}>
                                {isTbd && (
                                  <div style={{ fontSize: 12, color: 'var(--fg-3)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-1)', borderRadius: 7, padding: '8px 10px', marginBottom: 10 }}>
                                    ℹ️ Le squadre verranno assegnate dopo i risultati della fase precedente. Puoi comunque fissare data e orario ora.
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                                    <span style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Data</span>
                                    <input type="date" className="adm-input adm-input-datetime"
                                      value={editingMatch.isoDate || ''}
                                      onChange={e => setEditingMatch(f => ({ ...f, isoDate: e.target.value }))} />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                                    <span style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Orario</span>
                                    <input type="time" className="adm-input adm-input-datetime"
                                      value={editingMatch.time || ''}
                                      onChange={e => setEditingMatch(f => ({ ...f, time: e.target.value }))} />
                                  </div>
                                </div>
                                {saveError && (
                                  <div style={{ fontSize: 12, color: '#FF3D3D', background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 7, padding: '8px 10px', marginBottom: 10 }}>
                                    ⚠️ {saveError}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button className="adm-btn adm-btn-secondary adm-btn-sm" style={{ flex: 1 }}
                                    onClick={() => { setEditingMatch(null); setWarnMatch(null); setSaveError(''); }}>
                                    Annulla
                                  </button>
                                  <button className="adm-btn adm-btn-sm" style={{ flex: 2 }}
                                    onClick={saveMatchDateTime} disabled={savingMatch}>
                                    {savingMatch ? '…' : 'Salva'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
