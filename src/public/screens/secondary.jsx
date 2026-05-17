import { useState, useEffect } from 'react';
import { DEFAULT_EVENTS, DEFAULT_NEWS, DEFAULT_HONORS, rmGetAllEditions, rmLoadDataFromBootstrap } from '../../data.js';
import { EmptyState, EventRow, NewsCard, HonorCard } from '../../components.jsx';

export function EventsScreen({ data }) {
  const articles = data?.events || DEFAULT_EVENTS;
  return (
    <div data-screen-label="events">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Rinascita Monteforte Cup 2026</span>
            <h3 className="rm-section-title">Regolamento</h3>
          </div>
        </div>
        {articles.length === 0
          ? <EmptyState icon="📋" title="Regolamento non ancora disponibile" sub="Lo staff pubblicherà il regolamento ufficiale a breve."/>
          : <div className="rm-rulebook">
              {articles.map((art, i) => (
                <div key={art.id || i} className="rm-rule-article">
                  <div className="rm-rule-num">Art. {art.sort_order > 0 ? art.sort_order : i + 1}</div>
                  <div className="rm-rule-body">
                    <div className="rm-rule-title">{art.title}</div>
                    {art.description && <div className="rm-rule-text">{art.description}</div>}
                  </div>
                </div>
              ))}
            </div>
        }
      </section>
    </div>
  );
}

export function NewsScreen({ data }) {
  const news = data?.news || DEFAULT_NEWS;
  return (
    <div data-screen-label="news">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Bacheca ufficiale</span>
            <h3 className="rm-section-title">Avvisi & News</h3>
          </div>
        </div>
        {news.length === 0
          ? <EmptyState icon="📢" title="Nessun avviso" sub="Gli avvisi e le notizie del torneo verranno pubblicati qui."/>
          : <div className="rm-news-grid">{news.map((n, i) => <NewsCard key={n.id || i} item={n} featured={i === 0}/>)}</div>
        }
      </section>
    </div>
  );
}

export function HonorsScreen({ data }) {
  const honors = data?.honors || DEFAULT_HONORS;
  const currentEditionSlug = data?.edition?.slug || null;

  const [editions, setEditions] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [editionData, setEditionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    rmGetAllEditions().then(list => {
      setEditions(list);
    });
  }, []);

  async function loadEdition(slug) {
    if (slug === selectedSlug) return;
    setSelectedSlug(slug);
    setLoading(true);
    setEditionData(null);
    try {
      const d = await rmLoadDataFromBootstrap(slug);
      setEditionData(d);
    } finally {
      setLoading(false);
    }
  }

  const pastEditions = editions.filter(e =>
    e.status === 'completed' || e.status === 'archived'
  );
  const upcomingEditions = editions.filter(e =>
    e.status === 'upcoming' || e.status === 'active'
  );

  const selectedEditionMeta = editions.find(e => e.slug === selectedSlug);
  const displayHonors = selectedSlug && editionData
    ? (editionData.honors || [])
    : honors;

  return (
    <div data-screen-label="honors">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Storico tornei</span>
            <h3 className="rm-section-title">Albo d'oro</h3>
          </div>
        </div>

        {/* Edition picker */}
        {editions.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Seleziona edizione
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setSelectedSlug(null); setEditionData(null); }}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid',
                  borderColor: !selectedSlug ? 'var(--brand-green)' : 'var(--border-1)',
                  background: !selectedSlug ? 'rgba(0,230,118,0.1)' : 'transparent',
                  color: !selectedSlug ? 'var(--brand-green)' : 'var(--fg-2)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Tutti
              </button>
              {[...upcomingEditions, ...pastEditions].map(e => (
                <button
                  key={e.slug}
                  onClick={() => loadEdition(e.slug)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: selectedSlug === e.slug ? 'var(--brand-green)' : 'var(--border-1)',
                    background: selectedSlug === e.slug ? 'rgba(0,230,118,0.1)' : 'transparent',
                    color: selectedSlug === e.slug ? 'var(--brand-green)' : 'var(--fg-2)',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {e.year}
                  {(e.status === 'active' || e.status === 'upcoming') && (
                    <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--brand-green)' }}>●</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Edizione selezionata: mostra teams/squadre/highlights */}
        {selectedSlug && selectedEditionMeta && (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: '1px solid var(--border-brand)' }}>
            <div style={{ fontSize: 11, color: 'var(--brand-green)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Edizione selezionata
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', marginBottom: 4 }}>
              {selectedEditionMeta.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>
              {selectedEditionMeta.tournaments?.[0]?.name || 'Rinascita Monteforte Cup'}
              {selectedEditionMeta.location && ` · ${selectedEditionMeta.location}`}
            </div>
            {editionData && !loading && (
              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Squadre', val: editionData.teams?.length || 0 },
                  { label: 'Partite', val: editionData.matches?.length || 0 },
                  { label: 'Marcatori', val: editionData.scorers?.length || 0 },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--brand-green)' }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-3)', fontSize: 14 }}>
            Caricamento edizione…
          </div>
        )}

        {!loading && (
          displayHonors.length === 0
            ? <EmptyState icon="🏆" title="Albo d'oro vuoto" sub="Le edizioni passate verranno aggiunte dallo staff."/>
            : <div className="rm-honors">{displayHonors.map((h, i) => <HonorCard key={h.id || i} honor={h} current={i === 0 && !selectedSlug}/>)}</div>
        )}
      </section>
    </div>
  );
}

