# Rinascita Monteforte Cup — Sito Torneo

Sito statico per torneo calcio amatoriale "Rinascita Monteforte Cup", Monteforte Irpino (AV).
React 18 via CDN + Babel standalone. Nessun bundler. Nessun backend. Tutto client-side.

## Struttura file

```
index.html              → Sito pubblico (read-only per utenti)
admin.html              → Pannello staff (login richiesto)
colors_and_type.css     → Design system: variabili CSS colori, font, spacing
site/
  styles.css            → Stili pubblici, mobile-first (base=375px, desktop @900px)
  data.js               → Dati + localStorage persistence (chiave: rm_data_v2)
  components.jsx        → Componenti condivisi: Header, BottomNav, LiveBoard, ecc.
  screens.jsx           → Schermate pubbliche: Home, Live, Calendario, Classifica, ecc.
  admin.jsx             → App admin completa: login + CRUD tutte le sezioni
  admin-styles.css      → Stili pannello admin
assets/
  logo-rinascita-monteforte.jpg
  poster-qualificata-2024.png
```

## Sito pubblico (index.html)

**Utenti:** solo visualizzazione. Nessun form iscrizione.

**Sezioni:**
- `home` — Hero, countdown, partita live, partite oggi, classifica, marcatori, bacheca, premi, sponsor
- `live` — Tabellone diretta + risultati oggi
- `calendar` — Calendario partite con filtri categoria
- `table` — Classifica Senior/Over40/Junior + marcatori
- `teams` — Squadre filtrabili per categoria
- `events` — Timeline eventi
- `news` — Bacheca avvisi
- `honors` — Albo d'oro edizioni passate

**Navigazione:**
- Mobile: bottom nav fisso (Home | Live | Calendario | Classifica | Altro)
- "Altro" apre drawer con Squadre/Eventi/Avvisi/Albo d'oro
- Desktop (≥900px): nav orizzontale in header, bottom nav nascosta

**Data refresh:** ogni 30 secondi rilegge localStorage → mostra dati aggiornati da admin.

**Link admin:** footer → "⚙ Accesso staff" → admin.html (discreto, opacity 50%).

## Pannello admin (admin.html)

**Auth:**
- Credenziali in `localStorage.rm_admin_creds_v2` → `{ username, password }`
- Default: `admin` / `rinascita2026`
- Sessione in `sessionStorage.rm_admin_auth_v2` (scade chiudendo tab)
- Cambio password in tab "Settings"

**Sezioni admin:**

| Tab | Cosa gestisce |
|-----|---------------|
| Live 🔴 | Avvia/termina diretta, punteggio +/−, minuto +/−, eventi (⚽🟨🟥↻) |
| Avvisi | CRUD news/avvisi: titolo, testo, categoria, tono, pin |
| Partite | Aggiorna risultati, stato (sch/live/ft), orario, campo |
| Classifica | G/V/N/P/GF/GS/Pt/Forma per ogni squadra, per categoria |
| Marcatori | CRUD capocannonieri con gol |
| Squadre | Modifica info squadre: nome, capitano, statistiche, colore |
| Eventi | CRUD timeline eventi (partita/cerimonia/festa) |
| Albo d'oro | CRUD edizioni passate |
| Sponsor | CRUD sponsor con tag |
| Striscia | Messaggi ticker verde in cima al sito |
| Settings | Cambio username/password, reset dati a default |

## Flusso dati (Supabase + localStorage fallback)

```
Admin salva → rmSaveData() → localStorage["rm_data_v2"] (immediato)
                           → Supabase: site_data WHERE id=1 UPDATE content (async)

Sito pubblico → rmLoadData() ogni 30s:
  1. Prova Supabase site_data.content
  2. Se fallisce → localStorage["rm_data_v2"]
  3. Se entrambi vuoti → DEFAULT_* hardcodati in data.js
```

**Supabase progetto:** `jummgmhkapvvibicnqos` ("Rinascita Cup") — `eu-west-1` — `ACTIVE_HEALTHY`
**URL:** `https://jummgmhkapvvibicnqos.supabase.co`
**Tabella:** `site_data` — colonne: `id bigint PK`, `content jsonb`, `updated_at timestamptz`
**Riga dati:** sempre `id=1` (upsert su riga singola)
**RLS:** SELECT/UPDATE/INSERT aperte al ruolo `public` (anon key sufficiente)

Struttura `content` jsonb:
```js
{
  teams, standings_a, standings_o40, standings_jr,
  live_match,        // { active: bool, home, away, hs, as, minute, events[] }
  matches_today, matches_giornata,
  scorers, news, events, honors, sponsors,
  strip_items,       // array stringhe per ticker
  updated_at         // ISO timestamp ultimo salvataggio
}
```

**Nota:** `content={}` al primo avvio è normale. App usa default finché admin non salva.
**Note MCP:** il MCP locale (`mcp__supabase__*`) punta al progetto sbagliato ("Blockbuster rewind" — INACTIVE). Usare sempre `mcp__claude_ai_Supabase__*` con `project_id=jummgmhkapvvibicnqos`.

## Variabili CSS principali

```css
--brand-green: #00E676    /* colore primario */
--brand-gold:  #F5C518    /* trofei/oro */
--font-display: 'Bebas Neue'  /* titoli uppercase */
--font-body:    'Inter'        /* testo */
--bg-canvas:   #000000
--bg-surface:  #141414
```

## Aggiungere nuova sezione pubblica

1. Aggiungere screen in `site/screens.jsx` (pattern uguale agli altri)
2. Aggiungere route in `App` in `index.html`
3. Aggiungere voce in `BottomNav` (drawer "Altro") in `site/components.jsx`
4. Se ha dati gestibili: aggiungere sezione in `site/admin.jsx`

## Note

- NO bundler. Modifica direttamente i file `.jsx` e `.css`.
- Babel transpila JSX in-browser. Errori JSX visibili in console browser.
- Il sito funziona aprendo `index.html` direttamente nel browser (file://).
- `admin.html` va aperto sullo stesso browser del sito pubblico (stesso localStorage).
- Responsive breakpoints: mobile default, tablet `@600px`, desktop `@900px`.
