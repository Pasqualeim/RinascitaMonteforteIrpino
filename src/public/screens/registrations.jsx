const FALLBACK_CATEGORIES = [
  {
    id: 'over-40',
    name: 'Over 40',
    registration_fee: 150,
    min_teams: 6,
    registration_open: true,
    registration_notes: 'Il montepremi verrà definito in base al numero di squadre iscritte.',
  },
  {
    id: 'junior',
    name: 'Junior (10–16 anni)',
    registration_fee: 100,
    min_teams: 6,
    registration_open: true,
    registration_notes: 'Il montepremi verrà definito in base al numero di squadre iscritte.',
  },
];

export function RegistrationsScreen({ data }) {
  const dynamic = (data?.tournaments || []).filter(t => t.registration_fee != null);
  const cats = dynamic.length > 0 ? dynamic : FALLBACK_CATEGORIES;

  return (
    <main>
      <div className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Torneo 2026</span>
            <h2 className="rm-section-title">Iscrizioni</h2>
          </div>
        </div>

        <div className="rm-reg-grid">
          {cats.map((cat, i) => (
            <div key={cat.id || i} className="rm-reg-card">
              <div className="rm-reg-card-head">
                <span className="rm-reg-card-name">{cat.name}</span>
                {cat.registration_open != null && (
                  <span className={`rm-reg-status ${cat.registration_open ? 'open' : 'closed'}`}>
                    {cat.registration_open ? '● Aperte' : '● Chiuse'}
                  </span>
                )}
              </div>

              <div className="rm-reg-rows">
                {cat.registration_fee != null && (
                  <div className="rm-reg-row">
                    <span className="rm-reg-label">Quota iscrizione</span>
                    <span className="rm-reg-value">{cat.registration_fee}€</span>
                  </div>
                )}
                {cat.min_teams != null && (
                  <div className="rm-reg-row">
                    <span className="rm-reg-label">Squadre minime</span>
                    <span className="rm-reg-value">{cat.min_teams} squadre</span>
                  </div>
                )}
                {(cat.prize_first > 0) && (
                  <div className="rm-reg-row">
                    <span className="rm-reg-label">1° posto</span>
                    <span className="rm-reg-value" style={{ color: 'var(--brand-gold)' }}>{cat.prize_first}€</span>
                  </div>
                )}
              </div>

              {cat.registration_notes && (
                <p className="rm-reg-note">{cat.registration_notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
