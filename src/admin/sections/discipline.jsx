import { useState } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';
import { EditIcon, TrashIcon, Confirm } from '../shared.jsx';

const NOTES_KEY = 'rm_discipline_notes_v1';
function loadNotes() { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch { return {}; } }
function saveNotes(n) { try { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); } catch {} }

function buildCardRecords(data) {
  const teamByShort = Object.fromEntries((data.teams || []).map(t => [t.short, t]));
  const records = {};

  for (const phase of data.matches_giornata || []) {
    for (const match of phase.items || []) {
      for (const ev of match.events || []) {
        if (ev.type !== 'yellow' && ev.type !== 'red') continue;
        if (!ev.id) continue;
        const key = `${ev.player || '—'}__${ev.team || ''}`;
        if (!records[key]) {
          const t = teamByShort[ev.team];
          records[key] = { key, player: ev.player || '—', teamShort: ev.team || '', teamName: t?.name || ev.team || '', teamFlag: t?.flag || '', cards: [] };
        }
        const d = match.date;
        const dateLabel = d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
        records[key].cards.push({
          id: ev.id,
          type: ev.type,
          matchId: match.id,
          matchHomeShort: match.home?.short || '',
          matchAwayShort: match.away?.short || '',
          home: match.home?.name || '?', homeFlag: match.home?.flag || '',
          away: match.away?.name || '?', awayFlag: match.away?.flag || '',
          phase: phase.day,
          date: dateLabel,
        });
      }
    }
  }

  return Object.values(records).sort((a, b) => {
    const aRed = a.cards.filter(c => c.type === 'red').length;
    const bRed = b.cards.filter(c => c.type === 'red').length;
    if (bRed !== aRed) return bRed - aRed;
    return b.cards.length - a.cards.length;
  });
}

function alertLevel(cards) {
  const reds = cards.filter(c => c.type === 'red').length;
  const yellows = cards.filter(c => c.type === 'yellow').length;
  if (reds > 0) return 'red';
  if (yellows >= 2) return 'orange';
  return 'yellow';
}

const EVENT_TYPES = [
  { value: 'yellow', label: '🟨 Giallo' },
  { value: 'red',    label: '🟥 Rosso' },
];

function CardEditModal({ card, record, data, onClose, onSave }) {
  const homeTeam = (data.teams || []).find(t => t.short === card.matchHomeShort);
  const awayTeam = (data.teams || []).find(t => t.short === card.matchAwayShort);
  const [type, setType] = useState(card.type);
  const [teamShort, setTeamShort] = useState(record.teamShort);
  const [player, setPlayer] = useState(record.player);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const selectedTeam = (data.teams || []).find(t => t.short === teamShort);
  const players = (selectedTeam?.players || []).map(p => ({
    ...p, displayName: [p.nome, p.cognome].filter(Boolean).join(' ') || p.name || '',
  }));

  async function save() {
    if (!player.trim()) { setErr('Seleziona un calciatore'); return; }
    setBusy(true);
    setErr('');
    try {
      const teamObj = (data.teams || []).find(t => t.short === teamShort);
      await rmAdminDomain.updateMatchEvent(card.id, {
        event_type: type,
        player_name: player.trim(),
        team_id: teamObj?.id || null,
      });
      await onSave('Cartellino aggiornato');
    } catch (e) {
      setErr(e?.message || 'Errore salvataggio');
      setBusy(false);
    }
  }

  const matchTeams = [homeTeam, awayTeam].filter(Boolean);

  return (
    <div className="adm-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">Modifica cartellino</h3>
          <button className="adm-btn adm-btn-ghost adm-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-scroll">
          <div className="adm-form">
            {/* Partita di riferimento (read-only) */}
            <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 8, fontSize: 13, color: 'var(--fg-3)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Partita</span>
              {card.homeFlag} {card.home} <span style={{ color: 'var(--fg-3)' }}>vs</span> {card.awayFlag} {card.away}
              <span style={{ marginLeft: 8, fontSize: 11 }}>· {card.phase}</span>
            </div>

            {/* Tipo cartellino */}
            <div className="adm-form-group">
              <label className="adm-label">Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {EVENT_TYPES.map(t => (
                  <button key={t.value} type="button" className="adm-btn adm-btn-sm"
                    style={{ flex: 1, background: type === t.value ? 'var(--brand-green)' : 'transparent', border: `1px solid ${type === t.value ? 'var(--brand-green)' : 'var(--border-1)'}`, color: type === t.value ? '#000' : 'var(--fg-2)' }}
                    onClick={() => setType(t.value)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Squadra */}
            {matchTeams.length > 0 && (
              <div className="adm-form-group">
                <label className="adm-label">Squadra</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {matchTeams.map(t => (
                    <button key={t.short} type="button" className="adm-btn adm-btn-sm"
                      style={{ flex: 1, background: teamShort === t.short ? 'rgba(0,230,118,0.12)' : 'transparent', border: `1px solid ${teamShort === t.short ? 'var(--brand-green)' : 'var(--border-1)'}`, color: teamShort === t.short ? 'var(--brand-green)' : 'var(--fg-2)', fontWeight: teamShort === t.short ? 700 : 400 }}
                      onClick={() => { setTeamShort(t.short); setPlayer(''); }}>
                      {t.flag} {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Calciatore */}
            <div className="adm-form-group">
              <label className="adm-label">Calciatore</label>
              {players.length > 0 ? (
                <select className="adm-select" value={player} onChange={e => setPlayer(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {players.map((p, i) => (
                    <option key={p.id || i} value={p.displayName}>{p.displayName}</option>
                  ))}
                </select>
              ) : (
                <input className="adm-input" placeholder="Nome calciatore..." value={player}
                  onChange={e => setPlayer(e.target.value)} />
              )}
            </div>

            {err && <div style={{ color: '#FF6B6B', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.25)', borderRadius: 8 }}>{err}</div>}

            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>Annulla</button>
              <button className="adm-btn adm-btn-sm" style={{ flex: 1 }} onClick={save} disabled={busy || !player.trim()}>
                {busy ? 'Salvataggio…' : 'Salva modifica'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DisciplineSection({ data, onRefresh, tournamentId }) {
  const [notes, setNotes] = useState(loadNotes);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [expanded, setExpanded] = useState({});
  const [filterTeam, setFilterTeam] = useState('');
  const [deletingCard, setDeletingCard] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title" style={{ margin: 0 }}>Disciplina</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  const records = buildCardRecords(data);
  const teamShorts = [...new Set(records.map(r => r.teamShort))];
  const filtered = filterTeam ? records.filter(r => r.teamShort === filterTeam) : records;

  const totYellow = records.reduce((s, r) => s + r.cards.filter(c => c.type === 'yellow').length, 0);
  const totRed    = records.reduce((s, r) => s + r.cards.filter(c => c.type === 'red').length, 0);
  const atRisk    = records.filter(r => alertLevel(r.cards) !== 'yellow' || r.cards.filter(c => c.type === 'yellow').length >= 2).length;

  async function deleteCard(card) {
    setBusy(true);
    setErrMsg('');
    try {
      await rmAdminDomain.deleteMatchEvent(card.id);
      setDeletingCard(null);
      await onRefresh('Cartellino eliminato');
    } catch (e) {
      setErrMsg(e?.message || 'Errore eliminazione');
    } finally {
      setBusy(false);
    }
  }

  function saveNote(key) {
    const updated = { ...notes, [key]: noteText.trim() };
    if (!noteText.trim()) delete updated[key];
    setNotes(updated);
    saveNotes(updated);
    setEditingNote(null);
    setNoteText('');
  }

  function toggleExpand(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 className="adm-section-title" style={{ margin: 0 }}>Disciplina</h2>
          <p className="adm-section-sub" style={{ margin: 0 }}>Storico cartellini · nessun automatismo</p>
        </div>
      </div>

      {errMsg && <div style={{ color: '#FF6B6B', fontSize: 13, padding: '8px 14px', background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.25)', borderRadius: 8, marginBottom: 12 }}>{errMsg}</div>}

      {/* Chip statistiche */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Gialli', value: totYellow, color: '#F5C518' },
          { label: 'Rossi',  value: totRed,    color: '#FF3D3D' },
          { label: 'A rischio', value: atRisk, color: '#FF8C00' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Avviso no-automatismo */}
      <div style={{ padding: '10px 14px', background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: 14 }}>
        <strong style={{ color: '#F5C518' }}>Solo storico.</strong> Lo staff decide manualmente squalifiche e comunicazioni. Usa le note per annotare.
      </div>

      {/* Filtro squadra */}
      {teamShorts.length > 1 && (
        <div className="adm-form-group" style={{ marginBottom: 14 }}>
          <select className="adm-select" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="">Tutte le squadre</option>
            {teamShorts.map(s => {
              const t = (data.teams || []).find(x => x.short === s);
              return <option key={s} value={s}>{t?.flag ? `${t.flag} ` : ''}{t?.name || s}</option>;
            })}
          </select>
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="adm-card"><div className="adm-empty">{records.length === 0 ? 'Nessun cartellino registrato.' : 'Nessun risultato.'}</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const level = alertLevel(r.cards);
            const yellows = r.cards.filter(c => c.type === 'yellow');
            const reds = r.cards.filter(c => c.type === 'red');
            const isExpanded = !!expanded[r.key];
            const note = notes[r.key] || '';
            const isEditingNote = editingNote === r.key;

            const borderColor = level === 'red' ? 'rgba(255,61,61,0.35)'
              : level === 'orange' ? 'rgba(255,140,0,0.35)'
              : 'var(--border-1)';

            return (
              <div key={r.key} className="adm-card" style={{ border: `1px solid ${borderColor}`, padding: 0 }}>
                {/* Riga principale — cliccabile per espandere */}
                <div className="adm-item-row" style={{ cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-1)' : 'none' }}
                  onClick={() => toggleExpand(r.key)}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{r.teamFlag || '🏳️'}</span>
                  <div className="adm-item-row-body">
                    <div className="adm-item-title">{r.player}</div>
                    <div className="adm-item-meta">{r.teamName}</div>
                  </div>
                  {/* Badge cartellini */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {yellows.length > 0 && (
                      <span style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontFamily: 'var(--font-display)', color: '#F5C518' }}>
                        🟨 {yellows.length}
                      </span>
                    )}
                    {reds.length > 0 && (
                      <span style={{ background: 'rgba(255,61,61,0.12)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontFamily: 'var(--font-display)', color: '#FF3D3D' }}>
                        🟥 {reds.length}
                      </span>
                    )}
                    {level === 'orange' && <span style={{ fontSize: 9, color: '#FF8C00', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ATTENZIONE</span>}
                    {level === 'red' && <span style={{ fontSize: 9, color: '#FF3D3D', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ROSSO DIRETTO</span>}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--fg-3)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 160ms', marginLeft: 4 }}>▾</span>
                </div>

                {/* Dettaglio espanso */}
                {isExpanded && (
                  <div style={{ padding: '0 0 4px' }}>
                    {/* Singoli cartellini */}
                    {r.cards.map((card, ci) => {
                      if (deletingCard?.id === card.id) {
                        return (
                          <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(255,61,61,0.05)', borderBottom: '1px solid var(--border-1)' }}>
                            <span style={{ fontSize: 16 }}>{card.type === 'yellow' ? '🟨' : '🟥'}</span>
                            <span style={{ flex: 1, fontSize: 13, color: '#FF6B6B' }}>Eliminare questo cartellino?</span>
                            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setDeletingCard(null)}>No</button>
                            <button className="adm-btn adm-btn-danger adm-btn-sm" disabled={busy} onClick={() => deleteCard(card)}>{busy ? '…' : 'Sì'}</button>
                          </div>
                        );
                      }
                      return (
                        <div key={card.id} className="adm-item-row" style={{ paddingLeft: 20 }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{card.type === 'yellow' ? '🟨' : '🟥'}</span>
                          <div className="adm-item-row-body">
                            <div style={{ fontSize: 13, color: '#fff' }}>
                              {card.homeFlag} {card.home} <span style={{ color: 'var(--fg-3)' }}>vs</span> {card.awayFlag} {card.away}
                            </div>
                            <div className="adm-item-meta">{card.phase}{card.date ? ` · ${card.date}` : ''}</div>
                          </div>
                          <div className="adm-item-actions">
                            <button className="adm-btn adm-btn-ghost adm-btn-icon" style={{ width: 36, height: 36 }}
                              onClick={e => { e.stopPropagation(); setEditingCard(card); setEditingRecord(r); }}>
                              <EditIcon size={15}/>
                            </button>
                            <button className="adm-btn adm-btn-danger adm-btn-icon" style={{ width: 36, height: 36 }}
                              onClick={e => { e.stopPropagation(); setDeletingCard(card); }}>
                              <TrashIcon size={15}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Note staff */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-1)' }}>
                      <label className="adm-label" style={{ marginBottom: 6 }}>Note staff</label>
                      {isEditingNote ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <textarea className="adm-textarea" rows={2}
                            placeholder="Es: Squalificato per giornata 3…"
                            value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus />
                          <div className="adm-form-actions" style={{ marginTop: 0 }}>
                            <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }}
                              onClick={() => { setEditingNote(null); setNoteText(''); }}>Annulla</button>
                            <button className="adm-btn adm-btn-sm" style={{ flex: 2 }}
                              onClick={() => saveNote(r.key)}>Salva</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <p style={{ flex: 1, margin: 0, fontSize: 13, color: note ? 'var(--fg-1)' : 'var(--fg-3)', fontStyle: note ? 'normal' : 'italic', lineHeight: 1.5 }}>
                            {note || 'Nessuna nota.'}
                          </p>
                          <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flexShrink: 0 }}
                            onClick={e => { e.stopPropagation(); setEditingNote(r.key); setNoteText(note); }}>
                            {note ? '✏️' : '+ Nota'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal modifica cartellino */}
      {editingCard && editingRecord && (
        <CardEditModal
          card={editingCard}
          record={editingRecord}
          data={data}
          onClose={() => { setEditingCard(null); setEditingRecord(null); }}
          onSave={async (msg) => { setEditingCard(null); setEditingRecord(null); await onRefresh(msg); }}
        />
      )}
    </div>
  );
}
