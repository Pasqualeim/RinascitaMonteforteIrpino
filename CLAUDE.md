# Rinascita Monteforte Cup — Sito Torneo

Sito per torneo calcio amatoriale "Rinascita Monteforte Cup", Monteforte Irpino (AV).
**Stack:** Vite + React 18 (JSX, no TypeScript). `npm run dev` per sviluppo, `npm run build` per produzione.
Pubblico client-side read-only, admin protetto da Edge Function Supabase con auth custom `username + password`.

## Struttura file

```
index.html              → Entry sito pubblico (Vite)
admin.html              → Entry pannello staff (Vite)
vite.config.js          → Config Vite (multi-page: index + admin)
package.json            → Dipendenze: react, react-dom, @supabase/supabase-js, vite
.env                    → VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_ADMIN_API_URL
colors_and_type.css     → Design system: variabili CSS colori, font, spacing
src/
  domain.js             → Hydration, normalizzazione, derivazioni runtime (ES module puro)
  data.js               → Persistence, auth session, Supabase client, defaults
  components.jsx        → Componenti condivisi pubblici: EmptyState, Header, BottomNav, LiveBoard, ecc.
  styles.css            → Stili pubblici, mobile-first (base=375px, desktop @900px)
  admin-styles.css      → Stili pannello admin
  public/
    app.jsx             → Entry React pubblico: App + ErrorBoundary + VALID_SCREENS
    screens/
      home.jsx          → HomeScreen
      live.jsx          → LiveScreen
      calendar.jsx      → CalendarScreen
      table.jsx         → TableScreen
      teams.jsx         → TeamsScreen
      secondary.jsx     → EventsScreen + NewsScreen + HonorsScreen
  admin/
    shared.jsx          → Helper admin condivisi: icone, toast, confirm, session helpers
    auth.jsx            → Login staff
    app.jsx             → Entry React admin: shell, routing tab, boot sessione
    sections/
      live-news.jsx     → Live match + avvisi
      competition.jsx   → Partite, bracket, classifica, marcatori, gironi, squadre
      content.jsx       → Eventi, albo d'oro, sponsor
      settings.jsx      → Credenziali staff + reset dati
assets/
  logo-rinascita-monteforte.jpg
  poster-qualificata-2024.png
dist/                   → Output build (non committare)
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
- Login unico staff via Edge Function `admin-api`
- Credenziali staff in tabella `public.admin_users` (`username`, `password_hash`, `role`)
- Sessione breve in `sessionStorage.rm_admin_session_v1`
- Cambio username/password in tab "Settings" via endpoint protetto `/credentials`

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
Admin login → POST /functions/v1/admin-api/login
            → token sessione in sessionStorage["rm_admin_session_v1"]

Admin salva → rmSaveData() → localStorage["rm_data_v2"] (immediato)
                           → POST /functions/v1/admin-api/save
                           → Supabase: site_data WHERE id=1 UPDATE content

Sito pubblico → rmLoadData() ogni 30s:
  1. Prova Supabase site_data.content
  2. Se fallisce → localStorage["rm_data_v2"]
  3. Se entrambi vuoti → DEFAULT_* hardcodati in data.js
```

**Supabase progetto:** `jummgmhkapvvibicnqos` ("Rinascita Cup") — `eu-west-1` — `ACTIVE_HEALTHY`
**URL:** `https://jummgmhkapvvibicnqos.supabase.co`
**Tabella:** `site_data` — colonne: `id bigint PK`, `content jsonb`, `updated_at timestamptz`
**Tabelle auth custom:** `admin_users`, `admin_sessions`
**Edge Function:** `admin-api`
**Riga dati:** sempre `id=1` (upsert su riga singola)
**RLS desiderata:** `site_data` leggibile dal client pubblico; scritture solo via Edge Function con `service_role`

Struttura `content` jsonb:
```js
{
  schema_version,    // 2
  teams,             // [{ id, name, group_id, nation (FIFA 2026), ... }]
  groups,            // [{ id, name, color }] gironi creati dallo staff
  standings_groups,  // [{ id, name, color, rows: [...] }] classifiche auto-calcolate per girone
  live_match,        // { active: bool, home, away, hs, as, minute, events[] }
  matches_giornata,
  scorers, news, events, honors, sponsors,
  updated_at         // ISO timestamp ultimo salvataggio
}
```

**Derivati runtime, non persistiti:** `matches_today`, `strip_items`
**Alias legacy runtime:** `standings_a`, `standings_o40`, `standings_jr` (sempre `[]`)

**Campi team principali:** `short, name, group_id, nation, flag, players`
(campo `category` rimosso — sostituito da `group_id`)

**Nota:** `content={}` al primo avvio è normale. App usa default finché admin non salva.

**Globals window (rifrescati da rmLoadData):**
- `GROUPS` — array gironi
- `STANDINGS_GROUPS` — classifiche calcolate per girone
- `NATIONS_2026` — dict nazioni FIFA 2026 (name → {flag, short})
- `TEAMS`, `MATCHES_TODAY`, `LIVE_MATCH`, ecc. — come prima

**Note MCP:** usare sempre il progetto `jummgmhkapvvibicnqos` quando disponibile nel plugin/connector Supabase.

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
   - La sigla squadra viene proposta dalla nazione ma resta indipendente dal vecchio campo `category`
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

1. Creare `src/public/screens/nuova.jsx` con `export function NuovaScreen({ data }) {...}`
2. Importarla in `src/public/app.jsx` e aggiungere id in `VALID_SCREENS` + route nel JSX
3. Aggiungere voce in `BottomNav` in `src/components.jsx`
4. Se ha dati gestibili: aggiungere sezione nella sezione admin appropriata

## Note

- **Build:** `npm run dev` (dev server con HMR) · `npm run build` (output in `dist/`) · `npm run preview` (serve dist/ localmente)
- Vite gestisce JSX automaticamente (`@vitejs/plugin-react`). Import CSS in JSX funziona.
- Errori JSX visibili in console browser e nel terminale del dev server.
- Il sito richiede `npm install` e `npm run dev` per funzionare localmente (non più file://).
- `admin.html` e sito pubblico condividono `localStorage.rm_data_v2` solo come cache/fallback dati.
- La sessione staff vive in `sessionStorage`, quindi chiudere la tab admin richiede nuovo login.
- Responsive breakpoints: mobile default, tablet `@600px`, desktop `@900px`.

## Sistema multi-agente

Agenti in `.claude/agents/`. Organizzati per **tipo di task**, non per singolo file.

| Agente | Quando usarlo | File che può toccare |
|--------|--------------|----------------------|
| `feature-builder` | Nuova sezione/feature da zero che tocca 3+ file | data.js, admin.jsx, screens.jsx, components.jsx, CSS, CLAUDE.md |
| `admin-fixer` | Bug fix o miglioramento mirato solo lato admin | admin.jsx, admin-styles.css |
| `public-fixer` | Bug fix o miglioramento mirato solo sito pubblico | screens.jsx, components.jsx, styles.css, index.html |
| `supabase` | Operazioni DB: query, RLS, sync, ispezione dati | Supabase plugin/MCP sul progetto `jummgmhkapvvibicnqos` |
| `reviewer` | QA post-lavoro: verifica classi CSS, campi dati, update CLAUDE.md | Lettura tutto + scrittura CLAUDE.md |

### Quando usare gli agenti vs inline

- **Inline** (nessun agente): modifiche a 1-2 file, task semplici, piccoli fix
- **Agente**: task grandi che proteggono il contesto principale, operazioni specializzate (DB), review indipendente

### Regole

- `supabase` non modifica schema o dati senza conferma esplicita dell'utente
- `reviewer` è read-only su tutti i file tranne CLAUDE.md
- Per task che toccano sia admin che public, usa `feature-builder` o lavora inline
- Se task richiede modifica a file fuori scope dell'agente scelto, fermati e chiedi conferma
