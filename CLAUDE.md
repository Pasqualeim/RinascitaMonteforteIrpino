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
- `home` — Hero, countdown, partita live, partite oggi, classifica per-girone, marcatori, bacheca, premi, sponsor
- `live` — Tabellone diretta + risultati oggi
- `calendar` — Calendario partite con filtri dinamici per fase/girone
- `table` — Classifica per girone (tab dinamici, auto-calcolati) + marcatori
- `teams` — Squadre filtrabili per girone, con nazioni FIFA 2026
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
| Gironi | CRUD gironi con colore, auto-calcolo standings per girone |
| Live 🔴 | Avvia/termina diretta, punteggio +/−, minuto +/−, eventi (⚽🟨🟥↻) |
| Avvisi | CRUD news/avvisi: titolo, testo, categoria, tono, pin |
| Partite | Aggiorna risultati, stato (sch/live/ft), orario, campo, fase (girone/knockout) |
| Classifica | G/V/N/P/GF/GS/Pt/Forma per ogni squadra, per girone (tab dinamici) |
| Marcatori | CRUD capocannonieri con gol |
| Squadre | Modifica info: nazione FIFA 2026 (picker con flag), girone, capitano, statistiche |
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
  teams,             // [{ id, name, group_id, nation (FIFA 2026), ... }]
  groups,            // [{ id, name, color }] gironi creati dallo staff
  standings_groups,  // [{ id, name, color, rows: [...] }] classifiche auto-calcolate per girone
  standings_a, standings_o40, standings_jr,  // deprecati (sempre [])
  live_match,        // { active: bool, home, away, hs, as, minute, events[] }
  matches_today, matches_giornata,
  scorers, news, events, honors, sponsors,
  strip_items,       // array stringhe per ticker
  updated_at         // ISO timestamp ultimo salvataggio
}
```

**Campi team:** `id, name, group_id, nation, capitano, statistics`
(campo `category` rimosso — sostituito da `group_id`)

**Nota:** `content={}` al primo avvio è normale. App usa default finché admin non salva.

**Globals window (rifrescati da rmLoadData):**
- `GROUPS` — array gironi
- `STANDINGS_GROUPS` — classifiche calcolate per girone
- `NATIONS_2026` — dict nazioni FIFA 2026 (name → {flag, short})
- `TEAMS`, `MATCHES_TODAY`, `LIVE_MATCH`, ecc. — come prima

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

## Sistema gironi — flusso operativo

**Workflow staff:**

1. **Crea gironi** (tab "Gironi")
   - Nome, colore per ogni girone
   - `computeStandings()` auto-genera `standings_groups` quando partite finiscono

2. **Crea squadre**
   - `TeamForm` consente scegliere nazione FIFA 2026 (picker con flag emoji)
   - Assegna squadra a `group_id`
   - Campo `category` (Senior/Over40/Jr) rimosso

3. **Inserisce partite**
   - `MatchForm` mostra preset fasi dinamici (generati da gironi)
   - Fasi knockout: Quarti, Semifinali, Finale 3°/4°, Finale (hardcodati)
   - `computeStandings(giornata, teams, groups)` auto-calcola classifiche per girone

4. **Visualizza classifica**
   - `StandingsSection` mostra tab dinamici per girone
   - Ogni tab: G/V/N/P/GF/GS/Pt/Forma

**Schermate pubbliche aggiornate:**
- `TableScreen` — classifica per-girone con tab dinamici
- `TeamsScreen` — filtra per girone, mostra flag nazione
- `CalendarScreen` — tab per fase/girone (filtro effettivo)
- `HomeScreen` — mostra primo girone da `standings_groups[0]`

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

## Sistema multi-agente

Agenti in `.claude/agents/`. Organizzati per **tipo di task**, non per singolo file.

| Agente | Quando usarlo | File che può toccare |
|--------|--------------|----------------------|
| `feature-builder` | Nuova sezione/feature da zero che tocca 3+ file | data.js, admin.jsx, screens.jsx, components.jsx, CSS, CLAUDE.md |
| `admin-fixer` | Bug fix o miglioramento mirato solo lato admin | admin.jsx, admin-styles.css |
| `public-fixer` | Bug fix o miglioramento mirato solo sito pubblico | screens.jsx, components.jsx, styles.css, index.html |
| `supabase` | Operazioni DB: query, RLS, sync, ispezione dati | Supabase (MCP `mcp__claude_ai_Supabase__*`, project_id=jummgmhkapvvibicnqos) |
| `reviewer` | QA post-lavoro: verifica classi CSS, campi dati, update CLAUDE.md | Lettura tutto + scrittura CLAUDE.md |

### Quando usare gli agenti vs inline

- **Inline** (nessun agente): modifiche a 1-2 file, task semplici, piccoli fix
- **Agente**: task grandi che proteggono il contesto principale, operazioni specializzate (DB), review indipendente

### Regole

- `supabase` non modifica schema o dati senza conferma esplicita dell'utente
- `reviewer` è read-only su tutti i file tranne CLAUDE.md
- Per task che toccano sia admin che public, usa `feature-builder` o lavora inline
- Se task richiede modifica a file fuori scope dell'agente scelto, fermati e chiedi conferma