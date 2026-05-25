import { useState, useEffect } from 'react';
import { DEFAULT_EVENTS, DEFAULT_NEWS, DEFAULT_HONORS, rmGetAllEditions, rmLoadDataFromBootstrap } from '../../data.js';
import { EmptyState, EventRow, NewsCard, HonorCard } from '../../components.jsx';

function parseRulebook(text) {
  const lines = text.split('\n');
  const sections = [];
  let cur = null;
  let prevWasEmpty = true;

  function isHeading(line) {
    const t = line.trim();
    if (!t || t.length < 2) return false;
    if (/^ART(?:ICOLO)?\.?\s*\d+/i.test(t)) return true;
    if (/^\d+\s*[.\-–]\s+[A-ZÀÈÉÌÍÒÓÙÚ(]/.test(t)) return true;
    if (/^§\s*\d+/.test(t)) return true;
    // Short all-caps line after empty line (section title)
    if (prevWasEmpty && t.length <= 52 && !/[a-zàèéìíòóùú]/.test(t) && /[A-ZÀÈÉÌÍÒÓÙÚ]{3}/.test(t) && !/^[-•–▪*\d]/.test(t)) return true;
    return false;
  }

  function parseHeading(line) {
    const t = line.trim();
    let m = t.match(/^(ART(?:ICOLO)?\.?\s*\d+(?:\.\d+)?)\s*[-–:.\s]+(.+)?/i);
    if (m) return { num: m[1].replace(/\s+/g, ' ').toUpperCase(), title: (m[2] || '').trim() };
    m = t.match(/^(\d+(?:\.\d+)?)\s*[.\-–]\s+(.+)/);
    if (m) return { num: m[1], title: m[2].trim() };
    m = t.match(/^(§\s*\d+)\s*[-–:.\s]+(.+)?/);
    if (m) return { num: m[1], title: (m[2] || '').trim() };
    return { num: null, title: t };
  }

  const ITEM_RE = /^(\s*)([-•–▪]\s+|[a-zA-Z]\)\s+|\d+[.)]\s+)/;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      prevWasEmpty = true;
      if (cur) cur.body.push({ type: 'gap' });
      continue;
    }
    if (isHeading(line)) {
      if (cur) sections.push(cur);
      const { num, title } = parseHeading(line);
      cur = { num, title, body: [] };
    } else {
      if (!cur) cur = { num: null, title: null, body: [] };
      const im = line.match(ITEM_RE);
      if (im) {
        const indent = im[1].length > 0;
        const marker = im[2].trimEnd();
        const content = line.slice(im[0].length).trim();
        cur.body.push({ type: 'item', indent, marker, content });
      } else {
        cur.body.push({ type: 'text', content: line.trimStart() });
      }
    }
    prevWasEmpty = false;
  }
  if (cur) sections.push(cur);
  sections.forEach(s => {
    while (s.body.length && s.body[s.body.length - 1].type === 'gap') s.body.pop();
  });
  return sections;
}

function RulebookRenderer({ text }) {
  const sections = parseRulebook(text);
  if (!sections.length) return null;

  function renderBody(body) {
    const nodes = [];
    let i = 0;
    while (i < body.length) {
      const b = body[i];
      if (b.type === 'gap') { i++; continue; }
      if (b.type === 'item') {
        const items = [];
        while (i < body.length && body[i].type === 'item') items.push(body[i++]);
        nodes.push(
          <ul key={`ul${i}`} className="rm-rule-list">
            {items.map((it, j) => (
              <li key={j} className={`rm-rule-item${it.indent ? ' rm-indent' : ''}`}>
                <span className="rm-rule-marker">{it.marker}</span>
                <span>{it.content}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        nodes.push(<p key={`p${i}`} className="rm-rule-p">{b.content}</p>);
        i++;
      }
    }
    return nodes;
  }

  return (
    <div className="rm-rulebook">
      {sections.map((sec, i) => {
        const hasHeader = sec.num || sec.title;
        return (
          <div key={i} className={`rm-rule-article${!hasHeader ? ' rm-rule-preamble' : ''}`}>
            {hasHeader && (
              <div className="rm-rule-header">
                {sec.num && <span className="rm-rule-num">{sec.num}</span>}
                {sec.title && <span className="rm-rule-title">{sec.title}</span>}
              </div>
            )}
            {sec.body.length > 0 && (
              <div className="rm-rule-body">{renderBody(sec.body)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EventsScreen({ data }) {
  const entry = (data?.events || DEFAULT_EVENTS).find(e => e && e.event_type === 'regolamento') || (data?.events || []).find(Boolean) || null;
  const text = entry?.description || '';
  return (
    <div data-screen-label="events">
      <section className="rm-section">
        <div className="rm-section-head">
          <div>
            <span className="rm-eyebrow">Rinascita Monteforte Cup 2026</span>
            <h3 className="rm-section-title">Regolamento</h3>
          </div>
        </div>
        {!text
          ? <EmptyState icon="📋" title="Regolamento non ancora disponibile" sub="Lo staff pubblicherà il regolamento ufficiale a breve."/>
          : <RulebookRenderer text={text} />
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
    }).catch(() => {});
  }, []);

  async function loadEdition(slug) {
    if (slug === selectedSlug) return;
    setSelectedSlug(slug);
    setLoading(true);
    setEditionData(null);
    try {
      const d = await rmLoadDataFromBootstrap(slug);
      setEditionData(d);
    } catch {
      setEditionData(null);
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

