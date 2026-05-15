import { DEFAULT_EVENTS, DEFAULT_NEWS, DEFAULT_HONORS } from '../../data.js';
import { EmptyState, EventRow, NewsCard, HonorCard } from '../../components.jsx';

export function EventsScreen({ data }) {
  const events = data?.events || DEFAULT_EVENTS;
  return (
    <div data-screen-label="events">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Tornei · Cerimonie · Feste</span>
            <h3 className="rm-section-title">Eventi 2026</h3>
          </div>
        </div>
        {events.length === 0
          ? <EmptyState icon="🗓" title="Nessun evento" sub="Gli eventi del torneo verranno pubblicati a breve."/>
          : <div className="rm-events">{events.map((e, i) => <EventRow key={e.id || i} ev={e}/>)}</div>
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
  return (
    <div data-screen-label="honors">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Le edizioni passate</span>
            <h3 className="rm-section-title">Albo d'oro</h3>
          </div>
        </div>
        {honors.length === 0
          ? <EmptyState icon="🏆" title="Albo d'oro vuoto" sub="Le edizioni passate verranno aggiunte dallo staff."/>
          : <div className="rm-honors">{honors.map((h, i) => <HonorCard key={h.id || i} honor={h} current={i===0}/>)}</div>
        }
      </section>
    </div>
  );
}

