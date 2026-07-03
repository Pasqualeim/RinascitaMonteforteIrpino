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
      scorers.jsx       → ScorersScreen: tab Eliminatorie (ufficiale, `scorers`) / Gironi (non ufficiale, `scorers_girone`)
      secondary.jsx     → EventsScreen + NewsScreen + HonorsScreen
  lib/
    api.js              → Chiamate HTTP verso admin-api (fetch wrapper autenticato)
    auth.js             → Login/logout/me verso Edge Function
    constants.js        → Costanti condivise (fasi knockout, nazioni, ecc.)
    crud.js             → Helper CRUD generici per endpoint relazionali
    http.js             → Fetch base con timeout, retry, error parsing
    migration.js        → rmMigrateDataToRelational: blob → tabelle relazionali
    session.js          → Lettura/scrittura sessionStorage sessione admin
    storage.js          → Lettura/scrittura localStorage rm_data_v2
    supabase.js         → Supabase client (anon key)
  admin/
    shared.jsx          → Helper admin condivisi: icone, toast, confirm, session helpers
    auth.jsx            → Login staff
    app.jsx             → Entry React admin: shell, routing tab, boot sessione
    sections/
      dashboard.jsx     → Dashboard staff: checklist, badge categorie, accesso rapido tab
      live.jsx          → Live match: punteggio +/−, minuto, eventi, undo
      news.jsx          → CRUD avvisi: titolo, testo, tono, pin
      gironi.jsx        → CRUD gironi: nome, colore
      matches.jsx       → CRUD partite (MatchForm standard). Prop `scope`: 'group'|'knockout'|'all' filtra fasi; tab Partite gironi (scope=group) e tab Partite eliminatorie (scope=knockout) — STESSO editor, sezioni distinte come gironi
      standings.jsx     → Classifica per girone (tab dinamici, calcolata da DB) + gestione penalità punti (sconfitta a tavolino)
      bracket.jsx       → CRUD tabellone posizionale qualificazione (incroci fase eliminazione + intro). SOLO organizzazione; le partite vere sono nel tab Partite eliminatorie
      scorers.jsx       → CRUD marcatori con gol. Prop `scope`: 'ko' (ufficiale, tab Marcatori eliminatorie) | 'girone' (non ufficiale, tab Marcatori gironi) — stesso editor, liste/tabelle DB separate (`scorers`/`scorers_girone`)
      teams.jsx         → CRUD squadre: nazione, girone, capitano
      content.jsx       → CRUD eventi, albo d'oro, sponsor
      settings.jsx      → Credenziali staff, reset dati, edizioni+categorie, migrazione DB
assets/
  logo-rinascita-monteforte.jpg
  poster-qualificata-2024.png
dist/                   → Output build (non committare)
```

## Sito pubblico (index.html)

**Utenti:** solo visualizzazione. Nessun form iscrizione.

**Sezioni:**
- `home` — Hero, countdown, partita live, partite oggi, classifica per-girone, marcatori (preview ufficiale), bacheca, premi, sponsor
- `live` — Tabellone diretta + risultati oggi
- `calendar` — Calendario partite con filtri dinamici per fase/girone
- `table` — Classifica per girone (tab dinamici, auto-calcolati) + sezione "Come ci si qualifica" (tabellone qualificazione da `tournament.bracket`) + eliminatorie + marcatori (preview ufficiale)
- `scorers` — Marcatori completi, tab Eliminatorie (ufficiale) / Gironi (non ufficiale, non conta)
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

**Selettore categoria:** dropdown in topbar per scegliere categoria attiva (Senior, Over 40, ecc.) quando ci sono più tornei nell'edizione. Tutti i tab competizione operano sulla categoria selezionata.

**Sezioni admin:**

| Tab | Cosa gestisce |
|-----|---------------|
| Gironi | CRUD gironi con colore + n° squadre qualificate al turno (`qualify_count`), auto-calcolo standings per girone |
| Live 🔴 | Avvia/termina diretta (con confirm), selezione partita da calendario, timer real-time, fasi (1°T/Intervallo/2°T), punteggio +/−, eventi (⚽🟨🟥), undo |
| Avvisi | CRUD news/avvisi: titolo, testo, categoria, tono, pin |
| Partite gironi | Aggiorna risultati, stato (sch/live/ft), orario, campo, fase (etichetta dashboard "Partite gironi"; tab interno `matches`). La fase KO ora si gestisce in Qualificazione |
| Classifica | G/V/N/P/GF/GS/Pt per ogni squadra, per girone (tab dinamici, calcolata da DB, tiebreak scontri diretti). Pannello "⚖️ Penalità": sottrae punti a una squadra (es. −1 a tavolino / mancata presentazione) via `penalty_points` su iscrizione. Pulsante "✋ Modifica manuale": fissa a mano l'ordine del girone (frecce ▲▼ per riga) via `rank_override` su iscrizione — usare solo per casi che l'algoritmo non risolve; "↩ Torna automatico" rimuove l'override |
| Qualificazione | **Solo tabellone posizionale** editabile (`knockout_ties`: round, casa/ospite per posizione, riordino, intro) = vista pubblica "Come ci si qualifica". Le partite vere stanno nel tab separato "Partite eliminatorie". Tab `fasi` (SetupSection) resta nel codice ma non linkato |
| Partite eliminatorie | `MatchesSection scope="knockout"` standalone (tab `komatches`) → STESSO editor "Modifica partita" dei gironi (squadre, stato, punteggio, gol/cartellini→marcatori, data/ora). Specchia esattamente "Partite gironi" (scope=group). Le KO sono vere `matches` (phase=KO) e compaiono in Live/Calendario/Eliminatorie pubblico |
| Marcatori gironi | `ScorersSection scope="girone"` (tab `scorersgirone`) — CRUD marcatori fase a gironi, **non ufficiale, non conta** per la classifica marcatori (decisione staff). Squadra mostrata = quella al momento del gol (congelata) |
| Marcatori eliminatorie | `ScorersSection scope="ko"` (tab `scorers`) — CRUD marcatori **ufficiali**, solo gol da fasi eliminatorie. Squadra mostrata = rosa attuale (segue i trasferimenti: staff sposta il giocatore in Squadre → il marcatore lo segue in automatico) |
| Squadre | Modifica info: nazione FIFA 2026 (picker con flag), girone, capitano, statistiche |
| Eventi | CRUD timeline eventi (partita/cerimonia/festa) |
| Albo d'oro | CRUD edizioni passate |
| Sponsor | CRUD sponsor con tag |
| Striscia | Messaggi ticker verde in cima al sito |
| Settings | Cambio username/password, reset dati, gestione edizioni+categorie, date edizione (kickoff/inizio/fine), migrazione DB |

## Flusso dati (Supabase relazionale + localStorage fallback)

```
Admin login → POST /functions/v1/admin-api/login
            → token sessione in sessionStorage["rm_admin_session_v1"]

Admin salva → rmSaveData() → localStorage["rm_data_v2"] (immediato)
                           → POST /functions/v1/admin-api/save  (legacy blob)
             Live dual-write → PUT /functions/v1/admin-api/live  (relazionale)

Sito pubblico → rmLoadData() ogni 30s:
  1. GET /functions/v1/admin-api/bootstrap → se teams.length > 0, usa dati relazionali
  2. Altrimenti → Supabase site_data.content (legacy blob)
  3. Altrimenti → localStorage["rm_data_v2"]
  4. Altrimenti → DEFAULT_* hardcodati in data.js

Migrazione dati (una-tantum, da Settings admin):
  → rmMigrateDataToRelational(data, editionId, tournamentId)
  → popola tutte le tabelle relazionali dal blob corrente
  → salva rm_team_id_map_v1 in localStorage (short → uuid) per live dual-write
```

**Supabase progetto:** `jummgmhkapvvibicnqos` ("Rinascita Cup") — `eu-west-1` — `ACTIVE_HEALTHY`
**URL:** `https://jummgmhkapvvibicnqos.supabase.co`

**Tabelle legacy (backward compat):**
- `site_data` — `id bigint PK`, `content jsonb`, `updated_at timestamptz` — blob JSON schema v2
- `admin_users`, `admin_sessions` — auth custom

**Tabelle relazionali (schema v3 — Fase 6):**

| Tabella | FK principale | Scopo |
|---------|---------------|-------|
| `editions` | — | Container annuale (es. "Rinascita Cup 2026") |
| `tournaments` | `edition_id` | Categorie nell'edizione (Senior, Over 40, Junior…) |
| `groups` | `tournament_id` | Gironi dentro una categoria (col. `qualify_count` smallint default 2 = squadre che passano il turno) |
| `knockout_ties` | `tournament_id` | Tabellone posizionale (solo display pubblico "Come ci si qualifica"): `round`, `sort_order`, `home_label`/`away_label` (es. "Prima del Girone A"). Le partite KE **vere** stanno in `matches` (phase=KO). Colonne match (`home_team_id`/`status`/`home_score`/`note`…) presenti ma **deprecate/non usate**. Intro su `tournaments.bracket_intro` |
| `teams` | — | Registry squadre globale (riutilizzabile tra edizioni) |
| `team_registrations` | `team_id`, `tournament_id`, `group_id` | Iscrizione squadra a categoria. Col. `penalty_points` smallint default 0 = punti sottratti in classifica (penalità a tavolino). Col. `rank_override` smallint nullable = posizione fissata a mano dallo staff in Classifica (null = ordine automatico) |
| `matches` | `tournament_id`, `group_id` | Partite con home/away/score/status/phase |
| `match_events` | `match_id` | Goal, cartellini, cambi |
| `live_match_state` | `tournament_id` UNIQUE | Stato live per categoria (una riga per torneo) |
| `scorers` | `tournament_id` | Marcatori manuali per categoria. Col. `phase` text default `'ko'` (`'girone'`\|`'ko'`) = a quale lista appartiene la riga manuale — non ufficiale/gironi o ufficiale/eliminatorie. Righe auto-derivate da `match_events` (non in questa tabella) sono a loro volta bucketizzate per fase in `bootstrap.ts` via `matches.group_id` (non nullo = girone, null = KO) |
| `news` | `edition_id` | Avvisi condivisi tra categorie |
| `edition_events` | `edition_id` | Timeline eventi condivisi |
| `honors` | `edition_id`, `tournament_id` | Albo d'oro |
| `sponsors` | `edition_id` | Sponsor condivisi |
| `strip_messages` | `edition_id` | Ticker condivisi |

**Edge Function `admin-api` (v7) — endpoint:**

| Metodo | Path | Auth | Scopo |
|--------|------|------|-------|
| GET | `/bootstrap[?edition=slug]` | No | Payload completo per edizione (multi-torneo) |
| GET | `/editions` | No | Lista edizioni con categorie |
| POST | `/login` | No | Login staff |
| GET | `/me` | Sì | Sessione corrente |
| POST | `/logout` | Sì | Logout |
| POST | `/credentials` | Sì | Cambio username/password |
| POST | `/save` | Sì | Salva blob legacy (backward compat) |
| POST/PUT | `/editions[/:id]` | Sì | CRUD edizioni |
| POST/PUT/DELETE | `/tournaments[/:id]` | Sì | CRUD categorie |
| POST/PUT/DELETE | `/groups[/:id]` | Sì | CRUD gironi (tournament_id) |
| POST/PUT/DELETE | `/teams[/:id]` | Sì | CRUD squadre globali |
| POST/PUT/DELETE | `/registrations[/:id]` | Sì | CRUD iscrizioni (tournament_id) |
| POST/PUT/DELETE | `/matches[/:id]` | Sì | CRUD partite (tournament_id) |
| POST/DELETE | `/match-events[/:id]` | Sì | CRUD eventi partita |
| PUT | `/live` | Sì | Aggiorna stato live (tournament_id) |
| POST/PUT/DELETE | `/scorers[/:id]` | Sì | CRUD marcatori (tournament_id, body opzionale `phase`: `'girone'`\|`'ko'`, default `'ko'`) |
| POST/PUT/DELETE | `/knockout-ties[/:id]` | Sì | CRUD incroci tabellone qualificazione (tournament_id) |
| POST/PUT/DELETE | `/news[/:id]` | Sì | CRUD news (edition_id) |
| POST/PUT/DELETE | `/events[/:id]` | Sì | CRUD eventi (edition_id) |
| POST/PUT/DELETE | `/honors[/:id]` | Sì | CRUD albo d'oro |
| POST/PUT/DELETE | `/sponsors[/:id]` | Sì | CRUD sponsor (edition_id) |
| POST/PUT/DELETE | `/strip[/:id]` | Sì | CRUD ticker (edition_id) |

**Schema bootstrap response (schema_version: 3):**
```js
{
  schema_version: 3,
  edition: { id, name, year, slug, status, kickoff_date, start_date, end_date, location },
  tournaments: [          // array categorie
    {
      id, name, slug, sort_order, prize_first, prize_second, prize_third,
      bracket_intro, bracket,   // tabellone qualificazione (incroci editabili)
      groups, teams, standings_groups, live_match,
      matches, matches_giornata,
      scorers,          // classifica marcatori UFFICIALE — solo gol da fasi eliminatorie
      scorers_girone,   // lista informativa gol fase a gironi — NON ufficiale, non conta
    }
  ],
  // Legacy compat (primo torneo esposto flat per admin/public esistente):
  groups, teams, standings_groups, live_match, matches, matches_giornata, scorers, scorers_girone,
  // Condivisi edizione:
  news, events, honors, sponsors, strip_items, updated_at
}
```

**Seed DB attuale:** edizione 2026 con categorie Senior (1000€) e Over 40 (500€). Edizioni 2024/2025 come storico.

**Nota:** `content={}` al primo avvio è normale. App usa default finché admin non migra al modello relazionale.

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

## Sistema edizione, categorie e gironi — flusso operativo

**Modello dati:**
- **Edizione** = container annuale (es. "Rinascita Cup 2026"), una sola per anno
- **Categoria/Torneo** = divisione dentro l'edizione (Senior, Over 40, Junior…), con propri premi
- **Girone** = gruppo dentro una categoria (Girone A, B…)
- Classifica calcolata live da SQL (`standings_view`) per G/V/N/P/GF/GS/Pt. `pt` netto = vittorie*3 + pareggi − `penalty_points`. Ordinamento (a pari punti) applicato in JS, identico in `bootstrap.ts` (server) e `domain.js::rmComputeStandings` (client, ricalcolo admin): 1) punti scontri diretti tra le squadre in parità 2) diff. reti scontri diretti 3) gol fatti scontri diretti 4) diff. reti generale 5) gol fatti generali 6) nome. `rank_override` (se impostato dallo staff) ha sempre priorità assoluta su questo calcolo
- **Default categoria sito/admin = SENIOR** (il torneo con `sort_order` minore esce primo nel bootstrap → `tournaments[0]`). Ordine attuale: SENIOR=0, OVER 40=1, JUNIOR=2

**Workflow staff (modello relazionale):**

1. **Crea/seleziona edizione** (Settings → Edizioni & Categorie)
   - Una edizione per anno, con stato: upcoming/active/completed/archived
   - Aggiungi categorie (Senior, Over 40, Junior) con montepremi separati

2. **Seleziona categoria** (dropdown topbar admin)
   - Tutte le operazioni successive operano sulla categoria selezionata

3. **Crea gironi** (tab "Gironi") — legati alla categoria corrente
4. **Crea squadre + iscrivi** a categoria e girone
5. **Inserisce partite** — legate a categoria/girone
6. **Classifica** calcolata automaticamente da `standings_view` SQL

**Migrazione da blob a relazionale (una-tantum):**
- Settings → "Migra al nuovo database" → copia tutto il blob corrente nelle tabelle relazionali
- Salva mappa `short → uuid` in localStorage per live dual-write

**Schermate pubbliche:**
- `HomeScreen` — usa `data.edition` per nome/date/premi (dinamico da bootstrap)
- `TableScreen` — classifica per-girone con tab dinamici + tabellone qualificazione ("Come ci si qualifica", da `tournament.bracket`/`bracket_intro`)
- `TeamsScreen` — filtra per girone, mostra flag nazione
- `CalendarScreen` — tab per fase/girone
- `HonorsScreen` — picker edizioni da `/editions`, carica dati edizione specifica

## Aggiungere nuova sezione pubblica

1. Creare `src/public/screens/nuova.jsx` con `export function NuovaScreen({ data }) {...}`
2. Importarla in `src/public/app.jsx` e aggiungere id in `VALID_SCREENS` + route nel JSX
3. Aggiungere voce in `BottomNav` in `src/components.jsx`
4. Se ha dati gestibili: aggiungere sezione nella sezione admin appropriata

## Valori dinamici da bootstrap (schema v3)

Con il modello relazionale attivo, `HomeScreen` legge da `data.edition`:
- `edition.name` → titolo edizione (es. "Cup 2026 · 3ª Edizione")
- `edition.kickoff_date` → countdown automatico
- `edition.start_date` / `edition.end_date` → periodo formattato in italiano
- `edition.prize_*` non più su edizione — premi ora su **categoria torneo** (`tournament.prize_first/second/third`)

Il `Countdown` accetta prop `label` per testo dinamico kick-off.

**Fallback hardcodati** (usati solo quando bootstrap non ha dati):

| File | Valore di fallback |
|------|--------------------|
| `src/public/screens/home.jsx` | `'2026-06-15T20:00:00+02:00'`, `'Cup 2026 · 3ª Edizione'`, `'15 Giugno'`/`'15 Luglio'` |
| `src/components.jsx` Countdown | `"Calcio d'inizio · 15 Giugno 2026"` |

Il countdown mostra "In campo! ⚽" automaticamente dopo la data kick-off.

## Regole cartellini (live) — dinamiche da regolamento

- **Doppio giallo = espulsione automatica**: implementato in `live.jsx` — quando un giocatore riceve un 2° giallo nella stessa partita, viene aggiunto automaticamente un evento rosso con `_reason: 'doppio_giallo'`.
- **Gialli accumulati tra partite**: NON gestiti automaticamente — lo staff gestisce manualmente le squalifiche. La regola dipende dal regolamento di edizione (es. 3 gialli = 1 turno di stop). Se il regolamento cambia, adeguare il comportamento in `live.jsx → confirmEvent()`.
- **Rosso diretto**: inseribile manualmente dallo staff (bottone 🟥).

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
