export function RegistrationsScreen({ data }) {
  const tournaments = data?.tournaments || [];

  return (
    <main>
      <div className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">{data?.edition?.name || 'Torneo 2026'}</span>
            <h2 className="rm-section-title">Iscrizioni</h2>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <div className="rm-reg-grid">
            <div className="rm-reg-card">
              <div className="rm-reg-card-head">
                <span className="rm-reg-card-name">Categorie in definizione</span>
              </div>
              <p className="rm-reg-note">
                Le categorie e le quote di iscrizione verranno pubblicate dallo staff a breve.
                Contatta l'organizzazione per informazioni.
              </p>
            </div>
          </div>
        ) : (
          <div className="rm-reg-grid">
            {tournaments.map((cat, i) => (
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
                  <div className="rm-reg-row">
                    <span className="rm-reg-label">Quota iscrizione</span>
                    <span className="rm-reg-value">
                      {cat.registration_fee != null
                        ? `${cat.registration_fee}€`
                        : <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Da definire — contatta lo staff</span>
                      }
                    </span>
                  </div>
                  {cat.min_teams != null && (
                    <div className="rm-reg-row">
                      <span className="rm-reg-label">Squadre minime</span>
                      <span className="rm-reg-value">{cat.min_teams} squadre</span>
                    </div>
                  )}
                  {cat.max_teams != null && (
                    <div className="rm-reg-row">
                      <span className="rm-reg-label">Squadre massime</span>
                      <span className="rm-reg-value">{cat.max_teams} squadre</span>
                    </div>
                  )}
                  {cat.prize_first > 0 && (
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
        )}
      </div>
    </main>
  );
}
