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
- [ ] ridurre stato e callback globali
- [ ] migliorare raggiungibilità delle sezioni non esposte

Struttura target:

- `site/admin/app.jsx`
- `site/admin/auth.jsx`
- `site/admin/sections/*.jsx`
- `site/admin/lib/*.js`

### Fase 4 — Modularizzazione pubblico
Status: `da fare`

- [ ] separare schermate pubbliche in file più piccoli
- [ ] ridurre dipendenza da globali `window.*`
- [ ] centralizzare route e screen registry
- [ ] migliorare leggibilità di componenti e selectors

Struttura target:

- `site/public/app.jsx`
- `site/public/screens/*.jsx`
- `site/shared/components/*.jsx`

### Fase 5 — Runtime professionale
Status: `da fare`

- [ ] migrare a `Vite + React + TypeScript`
- [ ] eliminare Babel standalone in browser
- [ ] introdurre `package.json`
- [ ] introdurre script `dev`, `build`, `preview`
- [ ] spostare config sensibili in `.env`

Note:

- questa fase va fatta dopo la stabilizzazione del dominio
- UI e comportamenti vanno preservati durante la migrazione

### Fase 6 — QA e test
Status: `da fare`

- [ ] unit test per standings e derivazioni
- [ ] smoke test pubblico/admin
- [ ] test login, save, reset, cambio credenziali
- [ ] test responsive base mobile/tablet/desktop
- [ ] checklist regressioni condivisa

Tool target:

- `Vitest`
- `Playwright`
- `ESLint`
- `Prettier`

### Fase 7 — UX, accessibilità, feature gaps
Status: `da fare`

- [ ] migliorare feedback errori/save
- [ ] gestire meglio sessione scaduta
- [ ] sostituire `alert/confirm` con modali UI
- [ ] aggiungere `focus-visible`
- [ ] aggiungere `prefers-reduced-motion`
- [ ] verificare sponsor, ticker e sezioni secondarie
- [ ] rimuovere copy hardcoded non gestibile

### Fase 8 — Processo e deploy
Status: `da fare`

- [ ] definire ambiente dev/prod
- [ ] aggiungere CI
- [ ] aggiungere build check
- [ ] aggiungere test check
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
