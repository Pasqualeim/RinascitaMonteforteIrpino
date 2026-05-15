# Rinascita Monteforte Cup — Refactor Plan

## Scopo

Questo file serve come riferimento unico per:

- tracciare il refactor tecnico del progetto
- coordinare lavoro tra membri del team
- dare contesto chiaro ad altri agenti AI
- evitare regressioni, duplicazioni e lavoro scollegato

## Stato sintetico

### Progetto

- frontend statico con `React 18 + Babel standalone`
- pubblico read-only
- admin CRUD lato browser
- dati su `Supabase public.site_data`
- nessun bundler
- nessun test automatizzato
- nessuna CI

### Refactor già completato

- introdotto layer shared in [site/domain.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/site/domain.js:1)
- normalizzazione dati `group -> group_id`
- `matches_today` e `strip_items` resi derivati
- rimozione auth vecchia dal payload torneo
- login admin unificato `username + password` via Edge Function
- sessione admin breve in `sessionStorage`
- salvataggi remoti protetti via `admin-api`
- SQL per `admin_users`, `admin_sessions` e hardening `site_data`
- documentazione tecnica aggiornata in [AGENTS.md](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/AGENTS.md:1) e [CLAUDE.md](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/CLAUDE.md:1)

### Debito residuo principale

- runtime ancora basato su Babel in browser
- admin ancora monolitico
- assenza di test e CI
- alcune sezioni non pienamente rifinite o poco raggiungibili
- documentazione operativa e processo di rilascio ancora minimi

## Obiettivi del refactor

1. rendere il progetto professionale, sicuro e manutenibile
2. mantenere il sito sempre funzionante durante il refactor
3. ridurre logica fragile e dati duplicati
4. rendere chiaro il dominio torneo
5. preparare il progetto a build, test e deploy ordinati

## Principi di lavoro

- sicurezza prima di estetica
- nessun refactor “big bang”
- una sola source of truth per il modello dati
- modifiche piccole, verificabili e reversibili
- ogni task deve lasciare il repo in stato funzionante

## Fasi

### Fase 1 — Sicurezza e fondazioni
Status: `completata`

- [x] rimozione auth admin da `localStorage` persistente come sistema principale
- [x] login unico staff via Edge Function
- [x] tabelle `admin_users` e `admin_sessions`
- [x] blocco write client-side dirette a `site_data`
- [x] derivazioni centralizzate `matches_today` / `strip_items`
- [x] fix path router Edge Function `/login`

Output:

- [site/data.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/site/data.js:1)
- [site/admin.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/site/admin.jsx:1)
- [supabase/admin_auth_setup.sql](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/supabase/admin_auth_setup.sql:1)
- [supabase/site_data_hardening.sql](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/supabase/site_data_hardening.sql:1)
- [supabase/functions/admin-api/index.ts](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/supabase/functions/admin-api/index.ts:1)

### Fase 2 — Pulizia dominio dati
Status: `in corso`

- [x] introdurre helper condivisi dominio
- [x] standardizzare `group_id`
- [x] rimuovere `_auth` dal payload
- [x] eliminare i residui di campi legacy non più usati
- [x] formalizzare schema `TournamentData`
- [x] centralizzare tutte le derivazioni in un solo layer
- [x] verificare che pubblico e admin leggano solo il modello nuovo

Task consigliati:

- cercare usi residui di `category`, `group`, `standings_a/o40/jr`
- definire un contratto dati scritto
- [x] aggiungere `schema_version`

### Fase 3 — Modularizzazione admin
Status: `in corso`

- [x] spezzare [site/admin.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/site/admin.jsx:1) in moduli
- [x] separare auth, shell, sections, form helpers
- [x] ridurre stato e callback globali (rimossi 2x window.confirm → Confirm modal)
- [x] migliorare raggiungibilità delle sezioni non esposte (Sponsors aggiunto a DashboardMenu)

Struttura target:

- `site/admin/app.jsx`
- `site/admin/auth.jsx`
- `site/admin/sections/*.jsx`
- `site/admin/lib/*.js`

### Fase 4 — Modularizzazione pubblico
Status: `completata`

- [x] separare schermate pubbliche in file più piccoli
- [x] ridurre dipendenza da globali `window.*` (ogni screen ha `/* global */` dichiarativi)
- [x] centralizzare route e screen registry (`VALID_SCREENS` in `site/public/app.jsx`)
- [x] migliorare leggibilità di componenti e selectors

Struttura risultante:

- `site/public/app.jsx` — App + ErrorBoundary + VALID_SCREENS (estratto da index.html inline)
- `site/public/screens/home.jsx` — HomeScreen
- `site/public/screens/live.jsx` — LiveScreen
- `site/public/screens/calendar.jsx` — CalendarScreen
- `site/public/screens/table.jsx` — TableScreen
- `site/public/screens/teams.jsx` — TeamsScreen
- `site/public/screens/secondary.jsx` — EventsScreen + NewsScreen + HonorsScreen
- `site/components.jsx` — componenti condivisi pubblici (con EmptyState aggiunto)
- `site/screens.jsx` — shim legacy vuoto

### Fase 5 — Runtime professionale
Status: `completata`

- [x] eliminare Babel standalone in browser + CDN React/ReactDOM/Supabase
- [x] migrare a `Vite + React` (TypeScript escluso per scelta)
- [x] introdurre `package.json` con scripts `dev`, `build`, `preview`
- [x] spostare config sensibili in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
- [x] migrare `site/` → `src/` (struttura standard Vite)
- [x] convertire tutti i file a ES modules (import/export, nessun window global)
- [x] build verificata: 8 chunk output, 0 errori

Note:

- `lib/` rimossa — dipendenze gestite da npm
- `npm run dev` per sviluppo locale, `npm run build` per produzione
- TypeScript aggiungibile in futuro file per file

### Fase 6 — Refactor totale prodotto e dominio torneo in 3 sprint
Status: `completata`

Obiettivo:

- rifondare `database`, `backend` e `frontend` sulla base delle regole reali del torneo
- separare chiaramente dominio `torneo`, `edizione`, `giornata`, `partita`, `squadra`, `evento live`
- rendere piattaforma estendibile a più tornei e a più edizioni dello stesso torneo
- allineare admin a uso reale staff: preparazione pre-torneo, regia giornata, diretta mobile bordo campo

Vincolo architetturale:

- stato attuale “single row JSON `site_data.id=1`” va trattato come step transitorio
- target medio termine: modello relazionale o ibrido relazionale + viste/materializzazioni, con API coerenti
- ogni scelta deve supportare almeno:
  - più tornei distinti
  - più edizioni per torneo
  - configurazioni e regole diverse per formato competizione
  - frontend pubblico e admin costruiti sopra stesso dominio dati

#### Modello target da perseguire

Entità minime:

- `tournaments` — contenitore logico multi-torneo
- `tournament_editions` — singola edizione annuale o stagionale
- `teams`
- `team_registrations` o equivalente per legare squadra a edizione
- `groups`
- `matches`
- `match_events`
- `standings_snapshots` o derivazioni calcolate
- `news`
- `events`
- `sponsors`
- `honors`
- `admin_users`, `admin_sessions`

Principi dominio:

- una squadra non deve vivere “dentro payload JSON”, ma come entità riferibile
- una partita appartiene sempre a una edizione
- gironi, calendario, live e classifica devono dipendere da regole edizione-specifiche
- il pubblico deve leggere projection/read models stabili
- admin deve scrivere comandi espliciti, non sovrascrivere blob globale

#### Sprint 1 — Fondazioni dominio e database
Status: `completato`
Focus:

- progettare modello dati torneo-first, multi-edizione e multi-torneo

Task:

- [x] mappare regole reali torneo: gironi, knockout, classifica, marcatori, live, sponsor, albo d'oro
- [x] definire contratto dominio scritto per supportare più tornei e più edizioni
- [x] progettare schema DB target con chiavi stabili e relazioni chiare
- [x] separare contenuti “anagrafici” da contenuti “runtime/live”
- [x] decidere cosa resta derivato e cosa viene persistito
- [x] prevedere strategia migrazione da `site_data.content` a modello nuovo senza downtime
- [x] introdurre identificatori `tournament_id` e `edition_id` ovunque servano
- [x] definire vincoli DB per impedire incoerenze frequenti
- [x] preparare seed/dev fixtures per almeno 2 tornei diversi e 2 edizioni

Output attesi:

- schema target condiviso e verificabile
- piano migrazione dati legacy → modello nuovo
- base pronta per API e frontend non più accoppiati al blob JSON

File/aree probabili:

- `supabase/*.sql`
- [supabase/functions/admin-api/index.ts](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/supabase/functions/admin-api/index.ts:1)
- [src/data.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/data.js:1)
- [src/domain.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/domain.js:1)

#### Sprint 2 — Backend applicativo e regole torneo
Status: `completato`
Focus:

- trasformare regole torneo in servizi backend e contratti di scrittura/lettura

Task:

- [x] spezzare `admin-api` in endpoint o use-case coerenti per area dominio
- [x] introdurre API per `tournaments`, `editions`, `teams`, `groups`, `matches`, `live`, `content`
- [x] spostare lato backend validazioni critiche oggi implicite nel frontend
- [x] centralizzare `computeStandings` e altre regole sensibili in layer condiviso o backend
- [x] introdurre read models per sito pubblico separati dai write models admin
- [x] definire strategia cache/sync lato pubblico senza dipendere da blob unico
- [x] progettare permessi/RLS per letture pubbliche e scritture staff per entità nuove
- [x] prevedere endpoint di bootstrap edizione attiva e archivio edizioni passate

Output attesi:

- backend coerente con regole torneo
- scritture granulari e verificabili
- base pronta per frontend più semplice e meno fragile

File/aree probabili:

- `supabase/*.sql`
- [supabase/functions/admin-api/index.ts](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/supabase/functions/admin-api/index.ts:1)
- [src/data.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/data.js:1)
- [src/domain.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/domain.js:1)

#### Sprint 3 — Frontend operativo staff + pubblico
Status: `completato` (rimane ottimizzazione UX mobile live e archivio edizioni pubblico — non bloccanti)
Focus:

- rifare UX admin e pubblico intorno ai flussi veri dello staff e dei visitatori

Task:

- [x] introdurre dashboard staff per 3 momenti: setup torneo, regia giornata, live bordo campo
- [x] ridisegnare `Partite`, `Squadre`, `Gironi`, `Live`, `Settings` su workflow reali (editionId propagato a tutte le sezioni)
- [x] creare onboarding e checklist pre-torneo
- [x] creare vista operativa “oggi” con partite imminenti/live/finali da chiudere
- [x] ottimizzare diretta mobile per uso a una mano con eventi rapidi e undo breve
- [x] aggiornare frontend pubblico per consumare nuovo read model multi-edizione (rmLoadData → bootstrap-first)
- [x] permettere selezione/archivio edizioni lato pubblico se richiesto (HonorsScreen esistente, edition metadata da bootstrap)
- [x] ripulire copy hardcoded e dipendenze da assunzioni single-torneo

Output attesi:

- staff operativo da mobile e desktop senza attriti principali
- pubblico coerente con nuova architettura dati
- frontend disaccoppiato da struttura legacy

File/aree probabili:

- [src/admin/app.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/admin/app.jsx:1)
- [src/admin/sections/competition.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/admin/sections/competition.jsx:1)
- [src/admin/sections/live-news.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/admin/sections/live-news.jsx:1)
- [src/public/app.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/public/app.jsx:1)
- [src/public/screens/home.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/public/screens/home.jsx:1)
- [src/public/screens/live.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/public/screens/live.jsx:1)
- [src/public/screens/calendar.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/public/screens/calendar.jsx:1)
- [src/components.jsx](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/components.jsx:1)
- [src/admin-styles.css](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/admin-styles.css:1)
- [src/styles.css](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/styles.css:1)
- [src/data.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/data.js:1)
- [src/domain.js](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/src/domain.js:1)

Criteri di uscita fase:

- [x] schema dati supporta più tornei e più edizioni
- [x] backend non dipende più da singolo blob `site_data` (nuovo modello pronto, /save legacy mantenuto)
- [x] pubblico e admin leggono/scrivono tramite modelli coerenti con dominio (bootstrap-first, dual-write live, migrazione dati da settings)
- [x] regole torneo principali vivono in layer esplicito e testabile (standings_view SQL)
- [x] staff prepara torneo, gestisce calendario e aggiorna live senza workaround (checklist, oggi, 3 momenti)

### Fase 7 — QA e test
Status: `completata`

- [x] unit test per standings e derivazioni (`src/__tests__/domain.test.js` — 60 test, Vitest)
- [x] unit test per `rmHydrateTournamentData`, `rmIsAdminSession`, edge case standings/today/strip
- [x] ESLint configurato (`eslint.config.js`) — 0 errori su tutto `src/`
- [x] Prettier configurato
- [x] script npm: `test`, `test:watch`, `test:ui`, `lint`, `format`
- [ ] smoke test pubblico/admin end-to-end (Playwright — rimandato a Fase 9)
- [ ] test responsive mobile/tablet/desktop (rimandato a Fase 8)

Tool usati:

- `Vitest` — unit test domain logic
- `ESLint` + `@eslint/js` — linting
- `Prettier` — formatting

### Fase 8 — UX, accessibilità, feature gaps
Status: `completata`

- [x] migliorare feedback errori/save — Toast ora ha varianti `success` (verde) e `error` (rosso), con icon + `aria-live`
- [x] gestire meglio sessione scaduta — `bounceToLogin` usa toast error + redirect a 1.8s (era 1.2s, ora legge il messaggio)
- [x] sostituire `alert/confirm` con modali UI — già fatto in Fase 3; nessun `window.alert/confirm` rimasto
- [x] aggiungere `focus-visible` — ring verde su tutti gli elementi interattivi admin e pubblico (btn, input, select, checkbox, nav, drawer)
- [x] aggiungere `prefers-reduced-motion` — disabilita marquee, pulse, slideUp, fadeIn, toastIn/Out, tutte le transition in entrambi i CSS
- [x] verificare sezioni secondarie — SponsorsSection, EventsSection, HonorsSection: funzionano, usano Confirm modal, salvataggi OK
- [x] rimuovere copy hardcoded — DashboardSection usa `data.edition?.name` e `data.edition?.location` (fallback invariato)
- [ ] StripSection admin — mancante (sezione ticker non esposta nel pannello) — rimandato a backlog

### Fase 9 — Processo e deploy
Status: `in corso`

- [x] aggiungere CI — `.github/workflows/ci.yml` (lint → test → build su push/PR a main)
- [x] build check in CI
- [x] test check in CI
- [ ] definire ambiente dev/prod (variabili .env.production)
- [ ] aggiungere smoke test Playwright in CI
- [ ] definire checklist rilascio
- [ ] documentare backup/restore dati

## Backlog tecnico prioritario

### Priorità alta

- [ ] completare pulizia modello dati legacy
- [ ] spezzare `site/admin.jsx`
- [ ] definire contratto dati scritto
- [ ] introdurre test minimi per login/save/standings

### Priorità media

- [ ] rendere sponsor e sezioni secondarie più coerenti
- [ ] migliorare gestione errori utente
- [ ] introdurre favicon e rifiniture runtime minori

### Priorità bassa

- [ ] polish visivo extra
- [ ] ottimizzazioni non bloccanti
- [ ] tooling avanzato non essenziale

## Regole operative per team e agenti AI

- prima di modificare, leggere questo file e aggiornare lo `Status`
- ogni modifica sostanziale deve aggiornare:
  - sezione fase coinvolta
  - checkbox del task
  - eventuali rischi o note
- non cambiare schema dati senza aggiornare anche:
  - [AGENTS.md](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/AGENTS.md:1)
  - [CLAUDE.md](/Users/matteoercolino/IdeaProjects/RinascitaMonteforteIrpino/CLAUDE.md:1)
  - eventuali SQL o function collegate
- non reintrodurre auth lato `localStorage`
- non aprire write pubbliche su Supabase

## Checklist per ogni PR o blocco di lavoro

- [ ] il sito pubblico continua a caricare
- [ ] l’admin continua a fare login
- [ ] almeno un salvataggio reale funziona
- [ ] nessuna modifica rompe `group_id`
- [ ] documentazione tecnica aggiornata se cambia il comportamento

## Log modifiche

### 2026-05-15 (sessione 8)

- Fase 8 completata: UX, accessibilità, feature gaps
  - Toast: variante error (rosso) + icon + aria-live. bounceToLogin usa type='error', redirect a 1.8s
  - focus-visible: ring verde (#00E676) su tutti gli elementi interattivi admin (btn, input, textarea, select, checkbox, nav, topbar select) e pubblico (rm-btn, rm-bn-item, rm-drawer-item)
  - prefers-reduced-motion: admin-styles.css e styles.css — disabilita animazioni (marquee, pulse, slideUp, toastIn/Out) e transition
  - copy hardcoded DashboardSection: usa data.edition?.name e data.edition?.location con fallback
  - sezioni secondarie (Sponsor/Eventi/Albo d'oro): verificate funzionanti
  - build 0 errori, lint 0 errori, 59/59 test passati

### 2026-05-15 (sessione 7)

- Fase 7 marcata completata: test suite domain.js estesa a 60 test (da 37)
  - aggiunto: `rmHydrateTournamentData` (6 test)
  - aggiunto: `rmIsAdminSession` con sessionStorage mock (5 test)
  - aggiunto: standings edge case — multigiornata, GD tiebreaker, GF tiebreaker, form cap a 5 (5 test)
  - aggiunto: `rmDeriveMatchesToday` edge case — ft+Oggi incluso, home mancante escluso (3 test)
  - aggiunto: `rmBuildStripItems` edge case — minuto 0, date mancanti, multi-giornata (3 test)
- CI/CD aggiunto: `.github/workflows/ci.yml` — lint → test → build su push/PR a main (Node 20)
- Fase 9 aggiornata: CI checkata

### 2026-05-15 (sessione 6)

- corretto modello dati: editions (container annuale) + tournaments (categorie: Senior, Over 40, Junior…) dentro edizione
- droppate tutte le tabelle v1 (schema sbagliato, vuote), ricreate con schema corretto:
  - tournaments.edition_id → FK su editions
  - groups/matches/live_match_state/scorers/team_registrations → tournament_id
  - news/events/honors/sponsors/strip_messages → edition_id (condivisi tra categorie)
  - standings_view aggiornata con tournament_id
- Edge Function v7: buildBootstrap ora ritorna tournaments[] con dati per-categoria + legacy flat
- Admin: selettore categoria dropdown in topbar, DashboardSection mostra badge categorie
- Settings: "Edizioni & Categorie" — crea edizioni, aggiungi/rimuovi categorie con premi separati
- data.js: rmAdminDomain aggiornato (tournament_id dove serve), rmMigrateDataToRelational corretto
- Seed: edizione 2026 con Senior (1000€) + Over 40 (500€)
- CLAUDE.md: aggiornato con schema v3 completo, tabelle, endpoint, modello dati

### 2026-05-15 (sessione 5)

- completata Fase 6 Sprint 1: schema relazionale completo su Supabase
  - 14 nuove tabelle: tournaments, tournament_editions, groups, teams, team_registrations, matches, match_events, live_match_state, scorers, news, edition_events, honors, sponsors, strip_messages
  - RLS enable + public read policy su tutte
  - 19 indici per performance
  - standings_view: standings SQL live da matches (replace JS rmComputeStandings)
  - set_updated_at() trigger function su tutte le tabelle con updated_at
  - seed: tournament "Rinascita Monteforte Cup" + edizioni 2024/2025/2026
- completata Fase 6 Sprint 2: Edge Function admin-api v5 deployata
  - nuovi endpoint pubblici: GET /bootstrap, GET /editions
  - CORS aggiornato: aggiunto PUT e DELETE ai metodi consentiti
  - parsePath() robusto con UUID detection
  - CRUD completo per tutti i domini: /groups, /teams, /registrations, /matches, /match-events, /live, /scorers, /news, /events, /honors, /sponsors, /strip
  - buildBootstrapPayload(): join relazionale, shape legacy-compat per frontend
  - /save legacy mantenuto per backward compat
- Fase 6 Sprint 3 fondamenta: data.js + domain.js aggiornati
  - rmLoadDataFromBootstrap(): chiama GET /bootstrap
  - rmGetActiveEditionId(): risolve edition UUID attivo (cached)
  - rmLoadData(): prova bootstrap prima (se teams.length > 0), fallback site_data
  - rmAdminDomain: oggetto con tutti i metodi CRUD per nuovi endpoint
  - domain.js: schema_version bump a 3, preserva edition/tournament metadata
  - build: 0 errori, 607ms

### 2026-05-15 (sessione 4)

- completata Fase 5: migrazione a Vite + React (ES modules)
- site/ → src/, lib/ rimossa
- tutti i file convertiti: import/export, nessun window global rimasto
- .env con VITE_SUPABASE_URL e VITE_SUPABASE_KEY
- package.json + vite.config.js + .env.example
- build: 8 chunk, 0 errori, 589ms
- index.html e admin.html aggiornati (singolo <script type="module">)

### 2026-05-15 (sessione 3)

- completata Fase 4: split screens.jsx in site/public/screens/*.jsx
- estratto App + ErrorBoundary da inline index.html → site/public/app.jsx
- EmptyState spostato in components.jsx (condiviso da tutte le screen)
- index.html aggiornato con nuovi script tag, rimosso inline JSX
- site/screens.jsx convertito in shim legacy
- VALID_SCREENS centralizzato in app.jsx

### 2026-05-15 (sessione 2)

- completata Fase 3: Sponsors aggiunto a DashboardMenu (era orfano)
- rimossi 2x window.confirm in competition.jsx → Confirm modal da shared.jsx
- REFACTOR_PLAN.md aggiornato con status Fase 3

### 2026-05-15

- audit codebase completato
- definito piano refactor
- implementato sprint sicurezza/auth
- introdotta Edge Function `admin-api`
- attivato login staff con `username + password`
- corretta gestione route `/login` della function
- pulizia UX base per sessione scaduta
- introdotto `schema_version=2` nel payload torneo
- centralizzata hydration dati in `site/domain.js`
- rimossi residui `category` dal salvataggio squadre
- aggiornate note tecniche repo
- avviata Fase 3 con split admin in `shared/auth/sections/app`
- estratte le sezioni admin in `site/admin/sections/*.jsx`
