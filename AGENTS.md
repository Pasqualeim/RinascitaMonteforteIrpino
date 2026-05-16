# Rinascita Monteforte Cup — Sito Torneo

Sito per torneo calcio amatoriale "Rinascita Monteforte Cup", Monteforte Irpino (AV).
**Stack:** Vite + React 18 (JSX, no TypeScript). `npm run dev` per sviluppo, `npm run build` per produzione.
Pubblico client-side read-only, admin protetto da Edge Function Supabase con auth custom `username + password`.

> Questo file è mantenuto aggiornato dal team. Per dettagli tecnici completi vedi `CLAUDE.md`.

## Struttura file

```
index.html              → Entry sito pubblico (Vite)
admin.html              → Entry pannello staff (Vite)
vite.config.js          → Config Vite (multi-page: index + admin)
package.json            → Dipendenze: react, react-dom, @supabase/supabase-js, vite, vitest, eslint
.env                    → VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_ADMIN_API_URL
colors_and_type.css     → Design system: variabili CSS colori, font, spacing
src/
  domain.js             → Hydration, normalizzazione, derivazioni runtime (ES module puro, testabile)
  data.js               → Facade re-export da src/lib/* (backward compat)
  components.jsx        → Componenti condivisi pubblici: EmptyState, Header, BottomNav, LiveBoard, ecc.
  styles.css            → Stili pubblici, mobile-first (base=375px, desktop @900px)
  admin-styles.css      → Stili pannello admin
  lib/
    api.js              → Fetch verso admin-api (bootstrap, editions, CRUD edizioni/categorie)
    auth.js             → Login/logout/me verso Edge Function
    constants.js        → DEFAULT_* + NATIONS_2026 + RM_STORAGE_KEY
    crud.js             → rmAdminDomain — tutti i metodi CRUD endpoint relazionali
    http.js             → rmAdminApi — fetch autenticato con 401 auto-clear
    migration.js        → rmMigrateDataToRelational — blob → tabelle relazionali (una-tantum)
    session.js          → Lettura/scrittura sessionStorage sessione admin
    storage.js          → rmLoadData / rmSaveData / rmGetAllData / rmMergeDefaults
    supabase.js         → Supabase client (anon key)
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
      dashboard.jsx     → Dashboard staff: checklist, badge categorie, accesso rapido tab
      live.jsx          → Live match: punteggio +/−, minuto, eventi, undo
      news.jsx          → CRUD avvisi: titolo, testo, tono, pin
      gironi.jsx        → CRUD gironi: nome, colore
      matches.jsx       → CRUD partite: stato, score, orario, campo, fase
      standings.jsx     → Classifica per girone (tab dinamici, calcolata da DB)
      scorers.jsx       → CRUD marcatori con gol
      teams.jsx         → CRUD squadre: nazione, girone, capitano
      content.jsx       → CRUD eventi, albo d'oro, sponsor
      settings.jsx      → Credenziali staff, reset dati, edizioni+categorie, migrazione DB
  __tests__/
    domain.test.js      → 59 test su domain.js (Vitest)
supabase/
  functions/admin-api/  → Edge Function Deno (v7): auth, bootstrap, CRUD relazionale, legacy /save
assets/
  logo-rinascita-monteforte.jpg
  poster-qualificata-2024.png
dist/                   → Output build (non committare)
docs/
  DEBUGGING_PLAN.md     → Piano operativo debug/refactor con tracker sprint e backlog
  REFACTOR_PLAN.md      → Storico fasi refactor completate
```

## Comandi principali

```bash
npm install        # installa dipendenze
npm run dev        # dev server (http://localhost:5173)
npm run build      # build produzione in dist/
npm run preview    # serve dist/ localmente
npm run test       # vitest run (59 test)
npm run test:watch # vitest watch
npm run lint       # eslint src/
npm run format     # prettier --write
```

## Flusso dati (schema v3)

```
Pubblico (rmLoadData, ogni 30s):
  bootstrap API (teams.length > 0, timeout 5s)
  → site_data Supabase (fallback)
  → localStorage rm_data_v2 (fallback)
  → DEFAULT_* hardcoded (fallback finale)

Admin salva → rmSaveData() → localStorage (immediato)
                           → POST /admin-api/save (blob legacy)
             Live dual-write → PUT /admin-api/live (relazionale)
```

**Nota D-01:** post-migrazione, CRUD admin (matches/teams/groups/news) scrive solo blob.
Il pubblico legge da bootstrap relazionale → modifiche non visibili finché non si ri-migra.
Unica eccezione: live ha dual-write automatico.

## Sistema multi-agente

Agenti in `.claude/agents/`. Organizzati per **tipo di task**, non per singolo file.

| Agente | Quando usarlo | File che può toccare |
|--------|--------------|----------------------|
| `feature-builder` | Nuova sezione/feature da zero che tocca 3+ file | data.js, admin, screens, components, CSS, CLAUDE.md |
| `admin-fixer` | Bug fix o miglioramento mirato solo lato admin | src/admin/*, admin-styles.css |
| `public-fixer` | Bug fix o miglioramento mirato solo sito pubblico | src/public/*, components.jsx, styles.css |
| `supabase` | Operazioni DB: query, RLS, sync, ispezione dati | Supabase MCP su `jummgmhkapvvibicnqos` |
| `reviewer` | QA post-lavoro: verifica CSS, campi dati, update docs | Lettura tutto + scrittura CLAUDE.md + AGENTS.md |

### Quando usare gli agenti vs inline

- **Inline** (nessun agente): modifiche a 1-2 file, task semplici, piccoli fix
- **Agente**: task grandi che proteggono il contesto principale, operazioni DB, review indipendente

### Regole

- `supabase` non modifica schema o dati senza conferma esplicita
- `reviewer` è read-only su tutti i file tranne CLAUDE.md e AGENTS.md
- Per task che toccano sia admin che public, usa `feature-builder` o lavora inline
- Se task richiede modifica a file fuori scope dell'agente scelto, fermati e chiedi conferma
