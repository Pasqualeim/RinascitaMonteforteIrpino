import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

const KNOCKOUT_PHASES = ['Quarti di finale', 'Semifinali', 'Finale 3°/4° posto', 'Finale'];
const KNOCKOUT_SET = new Set(KNOCKOUT_PHASES);

const IT_MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
function isoToItalian(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${IT_MONTHS[parseInt(m) - 1]}`;
}

export function SetupSection({ data, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const teams = data.teams || [];
  const koPhases = (data.matches_giornata || []).filter(g => KNOCKOUT_SET.has(g.day));
  const totalKo = koPhases.reduce((s, p) => s + (p.items?.length || 0), 0);

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Fase eliminatoria</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  async function saveMatch(form) {
    setBusy(true);
    setErrMsg('');
    try {
      const payload = {
        tournament_id: tournamentId,
        group_id: null,
        home_team_id: form.home?.id || null,
        away_team_id: form.away?.id || null,
        status: 'sch',
        phase: form.phase,
        match_date: form.isoDate || null,
        match_time: form.time || null,
        pitch: 'Campo Sportivo',
        sort_order: 0,
      };
      if (form._isNew) {
        await rmAdminDomain.createMatch(payload);
      } else {
        await rmAdminDomain.updateMatch(form.id, {
          home_team_id: payload.home_team_id,
          away_team_id: payload.away_team_id,
          match_date: payload.match_date,
          match_time: payload.match_time,
          phase: payload.phase,
        });
      }
      setEditing(null);
      await onRefresh('Partita salvata');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio');
    } finally {
      setBusy(false);
    }
  }

  async function deleteMatch(id) {
    setBusy(true);
    try {
      await rmAdminDomain.deleteMatch(id);
      setDeleting(null);
      await onRefresh('Partita eliminata');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione');
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = { live: '🔴 Live', ft: '✅ Giocata', sch: '⏳' };
  const statusColor = { live: '#FF3D3D', ft: 'var(--brand-green)', sch: 'var(--fg-3)' };

  return (
    <div>
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Fase eliminatoria</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>{totalKo} {totalKo === 1 ? 'partita' : 'partite'}</p>
        </div>
        <button className="adm-btn adm-btn-sm" onClick={() => setEditing({ _isNew: true, phase: 'Semifinali', home: null, away: null, isoDate: '', time: '' })} disabled={busy}>
          + Nuova
        </button>
      </div>

      {errMsg && (
        <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>
      )}

      {totalKo === 0 && (
        <div className="adm-card"><div className="adm-empty">Nessuna partita eliminatoria. Aggiungine una con "+ Nuova".</div></div>
      )}

      {KNOCKOUT_PHASES.map(phase => {
        const phaseData = koPhases.find(p => p.day === phase);
        const items = phaseData?.items || [];
        if (items.length === 0) return null;
        const isFinale = phase === 'Finale';
        return (
          <div key={phase} className="adm-card" style={{ marginBottom: 12, ...(isFinale ? { border: '1px solid rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.03)' } : {}) }}>
            <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: isFinale ? 'var(--brand-gold)' : 'var(--fg-2)', textTransform: 'uppercase' }}>
                {isFinale ? '🏆 ' : ''}{phase}
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{items.length} {items.length === 1 ? 'partita' : 'partite'}</span>
            </div>
            {items.map(m => (
              <div key={m.id} style={{ borderTop: '1px solid var(--border-1)' }}>
                <div className="adm-item-row" style={{ paddingLeft: 16 }}>
                  <div className="adm-item-row-body">
                    <div className="adm-item-title" style={{ fontSize: 14 }}>
                      {m.home?.name || 'TBD'} <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>{m.hs != null ? `${m.hs}–${m.as}` : 'vs'}</span> {m.away?.name || 'TBD'}
                    </div>
                    <div className="adm-item-meta">
                      {m.date
                        ? <span style={{ color: 'var(--brand-green)' }}>📅 {isoToItalian(m.date)}{m.time ? ` · ${m.time}` : ''}</span>
                        : <span style={{ color: 'var(--fg-3)' }}>Nessuna data</span>
                      }
                      <span style={{ color: statusColor[m.status], marginLeft: 6 }}>{statusLabel[m.status]}</span>
                    </div>
                  </div>
                  <div className="adm-item-actions">
                    <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...m, isoDate: m.date || '', _isNew: false })}><EditIcon size={16}/></button>
                    <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(m.id)}><TrashIcon size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {editing && (
        <KOMatchForm
          match={editing}
          teams={teams}
          koPhases={koPhases}
          onSave={saveMatch}
          onClose={() => { setEditing(null); setErrMsg(''); }}
          busy={busy}
        />
      )}
      {deleting && <Confirm msg="Eliminare questa partita?" onOk={() => deleteMatch(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  );
}

function KOMatchForm({ match, teams, koPhases, onSave, onClose, busy }) {
  const [form, setForm] = useState({ ...match });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const sameTeam = form.home?.id && form.home?.id === form.away?.id;

  function submit() {
    if (!form.phase) { setError('Seleziona la fase'); return; }
    if (sameTeam) { setError('Casa e ospite non possono coincidere'); return; }

    const phaseData = koPhases.find(p => p.day === form.phase);
    const others = (phaseData?.items || []).filter(m => m.id !== form.id);
    const homeConflict = form.home?.id && others.find(m => m.home?.id === form.home.id || m.away?.id === form.home.id);
    const awayConflict = form.away?.id && others.find(m => m.home?.id === form.away.id || m.away?.id === form.away.id);
    if (homeConflict) { setError(`${form.home.name} gioca già in ${form.phase}`); return; }
    if (awayConflict) { setError(`${form.away.name} gioca già in ${form.phase}`); return; }

    setError('');
    onSave(form);
  }

  const chipStyle = (active) => ({
    fontSize: 12, padding: '6px 12px',
    background: active ? 'var(--brand-green)' : 'transparent',
    border: `1px solid ${active ? 'var(--brand-green)' : 'var(--border-1)'}`,
    color: active ? '#000' : 'var(--fg-2)',
    borderRadius: 6, cursor: 'pointer', fontWeight: active ? 700 : 400, transition: 'all 140ms',
  });

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{match._isNew ? 'Nuova partita eliminatoria' : 'Modifica partita'}</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">
            {error && (
              <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6 }}>{error}</div>
            )}

            <div className="adm-form-group">
              <label className="adm-label">Fase *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {KNOCKOUT_PHASES.map(p => (
                  <button key={p} type="button" style={chipStyle(form.phase === p)} onClick={() => set('phase', p)}>{p}</button>
                ))}
              </div>
            </div>

            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Casa</label>
                <select className="adm-select" value={form.home?.id || ''} onChange={e => {
                  const t = teams.find(x => x.id === e.target.value);
                  set('home', t || null);
                }}>
                  <option value="">-- Seleziona --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Ospite</label>
                <select className="adm-select" value={form.away?.id || ''} onChange={e => {
                  const t = teams.find(x => x.id === e.target.value);
                  set('away', t || null);
                }}>
                  <option value="">-- Seleziona --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            {sameTeam && <p className="adm-inline-hint">Casa e ospite non possono coincidere.</p>}

            <div className="adm-form-group">
              <label className="adm-label">Data</label>
              <input type="date" className="adm-input adm-input-datetime" value={form.isoDate || ''} onChange={e => set('isoDate', e.target.value)} />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Orario</label>
              <input type="time" className="adm-input adm-input-datetime" value={form.time || ''} onChange={e => set('time', e.target.value)} />
            </div>

            <div className="adm-form-actions" style={{ marginTop: 24 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={submit} disabled={busy || sameTeam}>Salva</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
