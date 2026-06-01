import { useState, useEffect } from 'react';
import { rmAdminDomain } from '../../lib/crud.js';

export function IscrizioniSection({ data, onRefresh, tournamentId, tournamentCategories }) {
  const tournament = (tournamentCategories || []).find(t => t.id === tournamentId) || null;

  const [form, setForm] = useState({
    registration_fee: '',
    min_teams: '',
    max_teams: '',
    registration_open: null,
    registration_notes: '',
  });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!tournament) return;
    setForm({
      registration_fee: tournament.registration_fee != null ? String(tournament.registration_fee) : '',
      min_teams: tournament.min_teams != null ? String(tournament.min_teams) : '',
      max_teams: tournament.max_teams != null ? String(tournament.max_teams) : '',
      registration_open: tournament.registration_open ?? null,
      registration_notes: tournament.registration_notes || '',
    });
    setDirty(false);
    setSaved(false);
    setErrMsg('');
  }, [tournamentId]);

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    if (!tournamentId) return;
    setBusy(true);
    setErrMsg('');
    try {
      const payload = {
        registration_fee: form.registration_fee !== '' ? parseInt(form.registration_fee, 10) : null,
        min_teams: form.min_teams !== '' ? parseInt(form.min_teams, 10) : null,
        max_teams: form.max_teams !== '' ? parseInt(form.max_teams, 10) : null,
        registration_open: form.registration_open,
        registration_notes: form.registration_notes.trim() || null,
      };
      await rmAdminDomain.updateTournament(tournamentId, payload);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await onRefresh('Iscrizioni salvate');
    } catch (err) {
      setErrMsg(err?.message || 'Errore salvataggio');
    } finally {
      setBusy(false);
    }
  }

  if (!tournamentId) {
    return (
      <div>
        <h2 className="adm-section-title">Iscrizioni</h2>
        <div className="adm-card"><div className="adm-empty">Nessuna categoria selezionata.</div></div>
      </div>
    );
  }

  const statusChip = (val, label, color) => ({
    fontSize: 12, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: form.registration_open === val ? 700 : 400,
    background: form.registration_open === val ? color : 'transparent',
    border: `1px solid ${form.registration_open === val ? color : 'var(--border-1)'}`,
    color: form.registration_open === val ? '#000' : 'var(--fg-2)',
    transition: 'all 140ms',
  });

  return (
    <div>
      <h2 className="adm-section-title">Iscrizioni</h2>
      <p className="adm-section-sub">
        Quota e limiti per <strong style={{ color: 'var(--brand-green)' }}>{tournament?.name || '—'}</strong>. Visibili sul sito pubblico.
      </p>

      {errMsg && (
        <div style={{ color: '#FF3D3D', fontSize: 13, padding: '8px 12px', background: 'rgba(255,61,61,0.1)', borderRadius: 6, marginBottom: 12 }}>
          {errMsg}
        </div>
      )}

      <div className="adm-card">
        <div className="adm-card-body">
          <div className="adm-form">

            {/* Stato iscrizioni */}
            <div className="adm-form-group">
              <label className="adm-label">Stato iscrizioni</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" style={statusChip(true, 'Aperte', 'var(--brand-green)')}
                  onClick={() => set('registration_open', true)}>● Aperte</button>
                <button type="button" style={statusChip(false, 'Chiuse', '#FF3D3D')}
                  onClick={() => set('registration_open', false)}>● Chiuse</button>
                <button type="button" style={statusChip(null, 'Non specificato', 'var(--fg-3)')}
                  onClick={() => set('registration_open', null)}>Non specificato</button>
              </div>
            </div>

            {/* Quota */}
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Quota iscrizione (€)</label>
                <input
                  className="adm-input"
                  type="number"
                  min="0"
                  placeholder="es. 150"
                  value={form.registration_fee}
                  onChange={e => set('registration_fee', e.target.value)}
                />
                <p style={{ fontSize: 11, color: 'var(--fg-3)', margin: '4px 0 0' }}>Lascia vuoto se non ancora definita.</p>
              </div>
            </div>

            {/* Min / Max squadre */}
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label">Squadre minime</label>
                <input
                  className="adm-input"
                  type="number"
                  min="2"
                  placeholder="es. 6"
                  value={form.min_teams}
                  onChange={e => set('min_teams', e.target.value)}
                />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Squadre massime</label>
                <input
                  className="adm-input"
                  type="number"
                  min="2"
                  placeholder="es. 16"
                  value={form.max_teams}
                  onChange={e => set('max_teams', e.target.value)}
                />
              </div>
            </div>

            {/* Note */}
            <div className="adm-form-group">
              <label className="adm-label">Note iscrizioni (opzionale)</label>
              <textarea
                className="adm-input"
                rows={3}
                placeholder="es. Il montepremi sarà definito in base alle iscrizioni ricevute."
                value={form.registration_notes}
                onChange={e => set('registration_notes', e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6 }}
              />
            </div>

            <div className="adm-form-actions">
              {saved && <span style={{ fontSize: 13, color: 'var(--brand-green)' }}>Salvato ✓</span>}
              <button className="adm-btn adm-btn-sm" onClick={save} disabled={busy || !dirty}>
                {busy ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Anteprima */}
      <div className="adm-card" style={{ marginTop: 12, background: 'rgba(0,230,118,0.03)', border: '1px solid rgba(0,230,118,0.15)' }}>
        <div style={{ padding: '10px 16px 6px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--brand-green)', textTransform: 'uppercase' }}>
            Anteprima pubblica
          </span>
        </div>
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <PreviewRow label="Stato" value={
            form.registration_open === true ? '● Aperte' :
            form.registration_open === false ? '● Chiuse' :
            '—'
          } />
          <PreviewRow label="Quota" value={form.registration_fee ? `${form.registration_fee}€` : 'Da definire — contatta lo staff'} />
          {form.min_teams && <PreviewRow label="Squadre minime" value={`${form.min_teams} squadre`} />}
          {form.max_teams && <PreviewRow label="Squadre massime" value={`${form.max_teams} squadre`} />}
          {form.registration_notes && (
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '4px 0 0', lineHeight: 1.5 }}>{form.registration_notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, gap: 8 }}>
      <span style={{ color: 'var(--fg-3)' }}>{label}</span>
      <span style={{ color: 'var(--fg-1)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
