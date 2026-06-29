import { useState, useEffect } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

// Suggerimenti fase — modificabili a mano nel campo (datalist, non vincolante).
const ROUND_PRESETS = ['Quarti di finale', 'Semifinali', 'Prefinale', 'Finale 3°/4° posto', 'Finale'];

// Ties ordinati e raggruppati per fase, mantenendo l'ordine di sort_order
// (l'ordine delle fasi è quello di prima apparizione nella lista ordinata).
function groupByRound(ties) {
  const sorted = [...ties].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const order = [];
  const map = {};
  for (const t of sorted) {
    const r = t.round || 'Senza fase';
    if (!map[r]) { map[r] = []; order.push(r); }
    map[r].push(t);
  }
  return { sorted, order, map };
}

export function BracketSection({ data, onRefresh, tournamentId }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const [intro, setIntro] = useState(data.bracket_intro || '');
  const [introDirty, setIntroDirty] = useState(false);

  // Risincronizza l'intro quando cambia categoria o arrivano dati freschi.
  useEffect(() => {
    setIntro(data.bracket_intro || '');
    setIntroDirty(false);
  }, [tournamentId, data.bracket_intro]);

  const ties = data.bracket || [];
  const { sorted, order, map } = groupByRound(ties);

  // Autocomplete etichette: squadre reali + posizioni dai gironi.
  const teamNames = (data.teams || []).map(t => t.name).filter(Boolean);
  const posLabels = (data.groups || []).flatMap(g => [`Prima del ${g.name}`, `Seconda del ${g.name}`, `Terza del ${g.name}`]);
  const labelSuggestions = [...new Set([...teamNames, ...posLabels])];

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Qualificazione</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  async function saveIntro() {
    setBusy(true); setErrMsg('');
    try {
      await rmAdminDomain.updateTournament(tournamentId, { bracket_intro: intro.trim() || null });
      setIntroDirty(false);
      await onRefresh('Introduzione salvata');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio introduzione');
    } finally { setBusy(false); }
  }

  async function saveTie(t) {
    setBusy(true); setErrMsg('');
    try {
      const payload = {
        round: (t.round || '').trim(),
        home_label: (t.home_label || '').trim(),
        away_label: (t.away_label || '').trim(),
      };
      if (t._isNew) {
        const nextOrder = sorted.length ? Math.max(...sorted.map(x => x.sort_order ?? 0)) + 1 : 0;
        await rmAdminDomain.createKnockoutTie({ tournament_id: tournamentId, sort_order: nextOrder, ...payload });
      } else {
        await rmAdminDomain.updateKnockoutTie(t.id, payload);
      }
      setEditing(null);
      await onRefresh('Incrocio salvato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio incrocio');
    } finally { setBusy(false); }
  }

  async function deleteTie(id) {
    setBusy(true); setErrMsg('');
    try {
      await rmAdminDomain.deleteKnockoutTie(id);
      setDeleting(null);
      await onRefresh('Incrocio eliminato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore eliminazione incrocio');
    } finally { setBusy(false); }
  }

  // Riordino: scambia sort_order con il vicino nella lista globale ordinata.
  async function moveTie(tie, dir) {
    const idx = sorted.findIndex(x => x.id === tie.id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    setBusy(true); setErrMsg('');
    try {
      await rmAdminDomain.updateKnockoutTie(tie.id, { sort_order: other.sort_order ?? swapIdx });
      await rmAdminDomain.updateKnockoutTie(other.id, { sort_order: tie.sort_order ?? idx });
      await onRefresh('Ordine aggiornato');
    } catch (err) {
      setErrMsg(err?.message || 'Errore riordino');
    } finally { setBusy(false); }
  }

  return (
    <div>
      <h2 className="adm-section-title" style={{ margin: 0 }}>Qualificazione</h2>
      <p className="adm-section-sub" style={{ marginTop: 2 }}>
        Costruisci il <strong>tabellone posizionale</strong> mostrato sul sito (es. “Prima del Girone A” vs “Terza del Girone B”).
        Le <strong>partite vere</strong> della fase a eliminazione si gestiscono nel tab <strong>“Partite eliminatorie”</strong>, con lo stesso editor dei gironi.
      </p>

      {errMsg && <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>{errMsg}</div>}

      {/* ── Tabellone posizionale (vista pubblica regolamento) ── */}
      <div className="adm-eyebrow" style={{ marginTop: 10 }}>Sito pubblico · “Come ci si qualifica”</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px' }}>
        <span className="adm-section-sub" style={{ margin: 0, fontSize: 12 }}>{ties.length} incroci (etichette posizione)</span>
        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditing({ _isNew: true, round: order[order.length - 1] || ROUND_PRESETS[0], home_label: '', away_label: '' })} disabled={busy}>+ Incrocio</button>
      </div>

      {/* Introduzione */}
      <div className="adm-card" style={{ marginBottom: 12 }}>
        <div className="adm-card-header"><span className="adm-card-title">Introduzione (opzionale)</span></div>
        <div className="adm-card-body">
          <textarea
            className="adm-textarea"
            value={intro}
            onChange={e => { setIntro(e.target.value); setIntroDirty(true); }}
            placeholder="Breve descrizione della modalità di qualificazione della categoria…"
            rows={3}
          />
          <div className="adm-form-actions" style={{ marginTop: 8 }}>
            <button className="adm-btn adm-btn-sm" onClick={saveIntro} disabled={!introDirty || busy}>Salva introduzione</button>
          </div>
        </div>
      </div>

      {ties.length === 0 ? (
        <div className="adm-card"><div className="adm-empty">Nessun incrocio. Clicca “+ Incrocio” per costruire il tabellone posizionale.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {order.map(round => (
            <div key={round} className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">{round === 'Finale' ? '🏆 ' : ''}{round}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{map[round].length} incroci</span>
              </div>
              <div style={{ padding: '0 14px' }}>
                {map[round].map((t, i) => {
                  const globalIdx = sorted.findIndex(x => x.id === t.id);
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 0', borderBottom: i < map[round].length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>{t.home_label || '—'}</span>
                          <span style={{ color: 'var(--brand-green)', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.06em' }}>VS</span>
                          <span>{t.away_label || '—'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <button className="adm-btn adm-btn-ghost adm-btn-icon" title="Su" disabled={busy || globalIdx <= 0} onClick={() => moveTie(t, -1)}>↑</button>
                        <button className="adm-btn adm-btn-ghost adm-btn-icon" title="Giù" disabled={busy || globalIdx >= sorted.length - 1} onClick={() => moveTie(t, 1)}>↓</button>
                        <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setEditing({ ...t })}><EditIcon size={16}/></button>
                        <button className="adm-btn adm-btn-danger adm-btn-icon" onClick={() => setDeleting(t.id)}><TrashIcon size={16}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TieForm item={editing} onSave={saveTie} onClose={() => setEditing(null)} busy={busy} suggestions={labelSuggestions} />
      )}
      {deleting && (
        <Confirm msg="Eliminare questo incrocio?" onOk={() => deleteTie(deleting)} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function TieForm({ item, onSave, onClose, busy, suggestions = [] }) {
  const [form, setForm] = useState({ round: '', home_label: '', away_label: '', ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isNew = !!item._isNew;

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">{isNew ? 'Nuovo incrocio' : 'Modifica incrocio'}</h3>
          <button className="adm-btn adm-btn-ghost" style={{ minHeight: 44, width: 44, padding: 0 }} onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">
            <div className="adm-form-group">
              <label className="adm-label">Fase</label>
              <input className="adm-input" list="rm-round-presets" value={form.round || ''} onChange={e => set('round', e.target.value)} placeholder="es. Quarti di finale" autoFocus />
              <datalist id="rm-round-presets">
                {ROUND_PRESETS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Casa</label>
              <input className="adm-input" list="rm-tie-labels" value={form.home_label || ''} onChange={e => set('home_label', e.target.value)} placeholder="es. Prima del Girone A" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Ospite</label>
              <input className="adm-input" list="rm-tie-labels" value={form.away_label || ''} onChange={e => set('away_label', e.target.value)} placeholder="es. Terza del Girone B" />
            </div>
            <datalist id="rm-tie-labels">
              {suggestions.map(s => <option key={s} value={s} />)}
            </datalist>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '2px 0 0' }}>
              Solo etichette di posizione per il sito. I risultati si inseriscono nel tab “Partite eliminatorie”.
            </p>
            <div className="adm-form-actions" style={{ marginTop: 16 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" onClick={() => onSave(form)} disabled={busy}>Salva</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
