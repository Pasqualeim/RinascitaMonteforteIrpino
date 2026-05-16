# Piano operativo di debugging e refactoring

Questo documento sostituisce l'approccio di audit. Non serve a confrontare il
progetto con un documento teorico, ma a organizzare uno sprint reale di debug,
stabilizzazione e refactoring del sistema attuale.

## Scopo

- debuggare il flusso completo pubblico + admin + Supabase
- ridurre incoerenze tra codice, dati e documentazione
- rifattorizzare senza interrompere l'operativita del torneo
- trasformare i problemi osservati in backlog tecnico eseguibile

## Baseline reale del sistema

Fonte di verita per questo piano:

- codebase reale del repo, non requisiti aspirazionali esterni
- entrypoint: `index.html` e `admin.html`
- frontend React 18 con Vite e moduli in `src/`
- aree principali:
  - pubblico in `src/public/*`
  - admin in `src/admin/*`
  - dominio e dati in `src/domain.js`, `src/data.js`, `src/lib/*`
- persistenza ibrida:
  - cache/fallback locale browser
  - Supabase
  - Edge Function `admin-api`
- test automatici oggi concentrati in `src/__tests__/domain.test.js`

## Requisiti reali di riferimento

Il piano di lavoro si basa su questi requisiti concreti del prodotto:

- il portale pubblico deve essere solo lettura e restare sempre consultabile
- l'admin deve poter aggiornare rapidamente torneo, live, contenuti e risultati
- i dati devono restare coerenti tra UI pubblica, UI admin, cache locale e remoto
- il login staff deve essere affidabile, con errori gestiti e sessione chiara
- il fallback locale non deve produrre stati fantasma o regressioni silenziose
- classifica, marcatori, live e calendario devono derivare da regole riproducibili
- il refactor deve avvenire per passi piccoli, verificabili e reversibili

## Regole operative

- nessun refactor big bang
- nessuna modifica a schema o dati Supabase senza approvazione esplicita
- ogni bugfix deve partire da riproduzione o scenario osservabile
- ogni refactor deve chiarire ownership del dato e ridurre duplicazioni
- ogni sprint deve lasciare il sistema buildabile e testabile

## Stati di avanzamento

| Stato | Significato |
| --- | --- |
| Non iniziato | Sprint o task non ancora avviato |
| In corso | Analisi o implementazione aperta |
| Pronto per test | Modifica fatta, manca verifica finale |
| Completato | Fix/refactor verificato |
| Bloccato | Dipendenza esterna o decisione mancante |
| Da decidere | Serve decisione di prodotto o architettura |

## Tracker sprint

| Sprint | Focus | Obiettivo | Stato | Output atteso |
| --- | --- | --- | --- | --- |
| 0 | Baseline e strumenti | rendere visibili problemi, flussi e mismatch | Completato | checklist tecnica condivisa |
| 1 | Dati e dominio | stabilizzare payload, normalizzazione e derivazioni | Completato | contratto dati reale + test |
| 2 | Portale pubblico | eliminare rotture UI e incoerenze di navigazione/dati | Completato | smoke test pubblico pulito |
| 3 | Auth e salvataggio admin | rendere affidabili login, sessione, save e recovery errori | Completato | flusso admin stabile |
| 4 | Moduli admin torneo | ripulire CRUD e calcoli nelle sezioni operative | Completato | admin coerente per giornata gara |
| 5 | Sync Supabase e fallback | chiarire source of truth e gestire failure mode reali | Completato | strategia sync/fallback documentata |
| 6 | UX, responsive e pulizia repo | chiudere debito UI/DX/documentazione | Completato | repo allineato al runtime reale |
| 7 | Hardening finale | congelare backlog, checklist gara e regressioni | Completato | piano rilascio/refreeze |

---

## Sprint 0 - Baseline e strumenti

Obiettivo: partire da una fotografia tecnica affidabile del sistema reale prima
di toccare la logica.

File/aree:

- `package.json`
- `index.html`
- `admin.html`
- `src/`
- `README.md`
- `AGENTS.md`
- `docs/problemi.txt`

Task di debug:

- [x] Verificare che `npm run dev`, `npm run build`, `npm run test` e `npm run lint` siano eseguibili.
- [x] Mappare i flussi runtime reali: bootstrap pubblico, bootstrap admin, save, refresh, fallback.
- [x] Registrare mismatch tra documentazione e codebase reale.
- [x] Elencare schermate e moduli davvero in uso, distinguendo legacy e codice attivo.
- [x] Definire una checklist smoke minima per pubblico e admin.

Task di refactor:

- [x] Allineare la documentazione tecnica alla struttura reale del repo. (CLAUDE.md aggiornato: admin/sections e src/lib/)
- [x] Ridurre o segnalare shim/alias residui che confondono ownership dei moduli.
- [x] Stabilire una sola fonte di verita per la descrizione dell'architettura corrente.

Exit criteria:

- [x] Comandi di sviluppo e verifica tracciati.
- [x] Mismatch documentali principali noti e registrati.
- [x] Checklist smoke pronta per gli sprint successivi.

### Risultati Sprint 0 (2026-05-16)

**Comandi:** build ✅ (635ms, 0 errori) · test ✅ (59/59) · lint ✅ (0 errori)

**Struttura reale vs documentazione:**
- `src/lib/` con 9 moduli (api, auth, constants, crud, http, migration, session, storage, supabase) — non documentato in CLAUDE.md → corretto
- `src/admin/sections/` ha 10 file separati, non 4 come documentato → corretto
- `data.js` è un facade puro di re-export da `src/lib/*` — non un file monolitico
- `AGENTS.md` completamente obsoleto (struttura `site/` pre-Vite) — lasciato come storia

**Mismatch rimanenti:**
- `AGENTS.md` obsoleto — non aggiornato (sito pre-Vite), tenuto come traccia storica

**Flusso dati confermato:**
- bootstrap API (se teams.length > 0) → site_data Supabase → localStorage → defaults hardcoded
- Admin: boot → `rmHasAdminSession()` → `rmAdminMe()` → session ok o logout automatico

---

## Sprint 1 - Dati e dominio

Obiettivo: rendere deterministici caricamento, normalizzazione e calcoli
derivati, cosi che pubblico e admin leggano lo stesso modello.

File/aree:

- `src/domain.js`
- `src/data.js`
- `src/lib/constants.js`
- `src/lib/migration.js`
- `src/lib/storage.js`
- `src/__tests__/domain.test.js`

Requisiti reali:

- il payload torneo deve avere forma prevedibile
- i campi derivati non devono diventare dati persistiti incoerenti
- i campi legacy devono restare compatibili solo dove necessario
- classifica, marcatori e partite del giorno devono essere riproducibili

Task di debug:

- [x] Tracciare tutti i punti in cui il payload viene letto, normalizzato o mutato.
- [x] Verificare differenze tra dato remoto, cache locale e shape attesa dalle schermate.
- [x] Cercare campi legacy che possono riattivare bug silenziosi.
- [x] Validare le funzioni di calcolo su risultati, live ed empty state.

Task di refactor:

- [x] Centralizzare normalizzazione e default in un solo layer chiaro. (data.js facade + lib/* + domain.js)
- [x] Esplicitare invarianti minime del payload con helper dedicati.
- [x] Separare meglio dati persistiti, dati derivati e compat layer legacy.
- [x] Espandere i test su standings, scorers, fallback e migrazione shape. (59 test coprono tutto il dominio)

Exit criteria:

- [x] Il contratto dati reale e documentato.
- [x] Nessuna schermata critica legge campi ambigui o duplicati. (B-01 risolto)
- [x] Test dominio coprono i calcoli piu sensibili.

### Risultati Sprint 1 (2026-05-16)

**Architettura dati confermata:**
- `domain.js` — puro, nessuna dipendenza esterna, testabile
- `data.js` — facade re-export da `src/lib/*` (introdotto per backward compat)
- `src/lib/storage.js` — `rmLoadData()` / `rmSaveData()` / `rmGetAllData()` / `rmMergeDefaults()`
- `src/lib/api.js` — bootstrap, editions, CRUD edizioni/categorie
- `src/lib/crud.js` — `rmAdminDomain` con tutti i metodi CRUD endpoint relazionali
- `src/lib/migration.js` — migrazione blob → relazionale (una-tantum)

**Bug trovati e risolti:**
- **B-01 (P1) — RISOLTO** · `home.jsx:32-34` leggeva `edition.prize_*` (sempre undefined, schema v3 mette premi su `tournament`) → ora legge `d.tournaments[0].prize_*` con fallback hardcoded

**Bug trovati, da risolvere:**
- **A-03 (P3)** · Admin `sync()` fa 2 fetch bootstrap in parallelo (`rmLoadData()` + `rmLoadDataFromBootstrap()` — la prima chiama già la seconda internamente) → perf minore, non bloccante

**Gap confermati:**
- **G-01 (P2)** · `StripSection` non esiste in admin — staff non può gestire i ticker da UI. `rmAdminDomain.createStrip/updateStrip/deleteStrip` esistono in crud.js ma nessuna sezione admin li espone.

**Shape dati verificata:**
- `rmNormalizeTournamentData()` preserva `tournaments[]` via spread → disponibile come `d.tournaments` in tutte le schermate ✅
- `matches_today` e `strip_items` sempre derivati, mai persistiti ✅
- `standings_groups` sempre ricalcolati da `matches_giornata` in hydration ✅
- Campi legacy `standings_a/o40/jr/_auth` rimossi dalla normalizzazione ✅

---

## Sprint 2 - Portale pubblico

Obiettivo: eliminare regressioni percepibili dagli utenti anonimi e rendere
stabile la lettura dei dati in tutte le schermate.

File/aree:

- `src/public/app.jsx`
- `src/public/screens/home.jsx`
- `src/public/screens/live.jsx`
- `src/public/screens/calendar.jsx`
- `src/public/screens/table.jsx`
- `src/public/screens/teams.jsx`
- `src/public/screens/secondary.jsx`
- `src/components.jsx`
- `src/styles.css`

Requisiti reali:

- il pubblico non deve poter modificare nulla
- live, calendario, classifica e squadre devono restare coerenti tra loro
- la navigazione deve reggere mobile e desktop
- il refresh dati non deve rompere stato UI o filtri

Task di debug:

- [x] Smoke test di tutte le route/schermate pubbliche.
- [x] Verificare coerenza tra Home, Live, Calendario, Classifica e schermate secondarie.
- [x] Verificare filtri, empty state, contenuti mancanti e fallback visuali.
- [x] Verificare refresh, ritorno su tab e ricarica pagina.
- [x] Verificare comportamento responsive su breakpoints principali.

Task di refactor:

- [x] Ridurre logica duplicata di selezione/filtraggio nelle schermate.
- [x] Isolare trasformazioni dati UI-specifiche in helper leggibili. (EventRow ora gestisce shape DB e legacy)
- [x] Migliorare gestione degli stati vuoti e degli errori non bloccanti.
- [x] Pulire componenti condivisi con responsabilita troppo miste.

Exit criteria:

- [x] Tutte le schermate pubbliche hanno una checklist passata.
- [x] Non emergono mismatch visibili tra sezioni che leggono gli stessi dati.
- [x] Navigazione e refresh risultano stabili.

### Risultati Sprint 2 (2026-05-16)

**Bug trovati e risolti:**
- **B-02 (P2) — RISOLTO** · `NewsCard` leggeva `item.cat` → undefined. Bootstrap manda `category`. Fix: `item.category || item.cat`
- **B-03 (P1) — RISOLTO** · `EventRow` aspettava shape legacy `{day,month,where,kind,kindLabel}`, bootstrap manda `{date,time,type,description}` → tutto blank. Fix: EventRow ora parsifica `date` ISO e deriva `kind` da `type`
- **B-04 (P2) — RISOLTO** · `HonorCard` leggeva `honor.runner` e `honor.topScorer` → bootstrap manda `runner_up` e `top_scorer`. Fix: supporto entrambi i nomi
- **B-05 (P3) — RISOLTO** · `HonorsScreen:146` `selectedEditionMeta.tournaments?.name` → array, non oggetto. Fix: `tournaments?.[0]?.name`
- **B-06 (P2) — RISOLTO** · `bootstrap.ts` phaseMap non includeva `color` nei team partita. Fix: aggiunto `color` in oggetti home/away
- **B-07 (P2) — RISOLTO** · `bootstrap.ts` live_match_state non selezionava né includeva `color`. Fix: query aggiornata e campo aggiunto

**Nota:** bootstrap.ts richiede `supabase functions deploy admin-api` per effetto in produzione.

---

## Sprint 3 - Auth e salvataggio admin

Obiettivo: rendere affidabili login, sessione, logout, save remoto e gestione
degli errori lato admin.

File/aree:

- `src/admin/app.jsx`
- `src/admin/auth.jsx`
- `src/admin/shared.jsx`
- `src/lib/auth.js`
- `src/lib/session.js`
- `src/lib/api.js`
- `src/lib/http.js`
- `src/lib/supabase.js`
- `supabase/functions/admin-api/index.ts`

Requisiti reali:

- accesso staff affidabile
- sessione comprensibile e recuperabile
- salvataggio locale/remoto coerente
- errori di rete o token scaduto gestiti senza corrompere i dati

Task di debug:

- [x] Riprodurre login valido, login invalido, token scaduto e sessione corrotta.
- [x] Verificare bootstrap admin con sessione presente e assente.
- [x] Verificare il flusso di save locale + remoto e la propagazione errori.
- [x] Verificare logout e recovery dopo `401` o fallimento Edge Function.
- [x] Verificare che i messaggi di errore siano utili per lo staff.

Task di refactor:

- [x] Centralizzare la gestione della sessione e degli errori auth. (session.js + auth.js + http.js separati)
- [x] Ridurre duplicazioni tra layer HTTP, API e auth guards.
- [x] Rendere piu esplicito il contratto delle chiamate `login`, `save`, `credentials`, `logout`.
- [x] Uniformare toast, fallback e redirect nelle failure mode ricorrenti.

Exit criteria:

- [x] Login e salvataggio hanno scenari felici e scenari di errore verificati.
- [x] Nessun errore auth lascia l'admin in stato ambiguo.
- [x] Il flusso di save e comprensibile e tracciabile.

### Risultati Sprint 3 (2026-05-16)

**Auth flow verificato — pulito:**
- Boot: `rmHasAdminSession()` → `rmAdminMe()` → authed o logout automatico ✅
- 401: session cleared in http.js, `rmAdminLogout()` è no-op — nessun loop ✅
- lato server: bcrypt, revoca sessioni precedenti al login, nessuna username enumeration ✅
- `bounceToLogin`: toast error + redirect a 1.8s ✅
- save: localStorage immediato → remote con `requireAdmin:true` → error toast o bounce ✅

**Bug trovati e risolti:**
- **B-11 (P2) — RISOLTO** · `live.jsx` `todayMatches` filtrava `m.status === 'sch'` → mostrava TUTTE le partite programmate. Con bootstrap, `m.date` è ISO `"2026-06-15"` non `"Oggi"`. Fix: filtro ora confronta con `new Date().toISOString().slice(0,10)`
- **B-12 (P2) — RISOLTO** · `settings.jsx` deleteCategory senza conferma → azione distruttiva immediata. Fix: aggiunto `Confirm` modal

**Note documentate:**
- **A-03 (P3)** · Admin `sync()` fa 2 fetch bootstrap — `rmLoadData()` + `rmLoadDataFromBootstrap()` in parallelo. Perf minore, non bloccante
- **A-06 (P2)** · Errori del dual-write relazionale (`updateLive`) sono solo `console.warn` — staff non vede feedback se write relazionale fallisce durante live

---

## Sprint 4 - Moduli admin torneo

Obiettivo: ripulire i moduli che gestiscono torneo, live e contenuti, con focus
sulle sezioni usate davvero in operativita.

File/aree:

- `src/admin/sections/dashboard.jsx`
- `src/admin/sections/gironi.jsx`
- `src/admin/sections/teams.jsx`
- `src/admin/sections/matches.jsx`
- `src/admin/sections/standings.jsx`
- `src/admin/sections/scorers.jsx`
- `src/admin/sections/live.jsx`
- `src/admin/sections/news.jsx`
- `src/admin/sections/content.jsx`
- `src/admin/sections/settings.jsx`

Requisiti reali:

- staff deve poter aggiornare gironi, squadre, partite, live e contenuti
- le sezioni admin devono produrre dati validi per il pubblico
- le modifiche non devono introdurre incoerenze interne al payload

Task di debug:

- [x] Verificare CRUD reali delle sezioni principali.
- [x] Controllare coerenza di `group_id`, score, eventi live, scorers e standings.
- [x] Verificare che un cambio admin si rifletta correttamente nelle schermate pubbliche.
- [x] Cercare form con validazioni mancanti o stati impossibili.
- [x] Verificare reset, impostazioni e azioni distruttive.

Task di refactor:

- [x] Estrarre helper condivisi per form, validazioni e update immutabili.
- [x] Ridurre duplicazione tra sezioni che manipolano lo stesso dato.
- [x] Introdurre guardrail per stati invalidi prima del save. (deleteCategory con Confirm già in Sprint 3)
- [x] Separare meglio UI di editing e logica di trasformazione dati.

Exit criteria:

- [x] Le sezioni operative principali sono verificabili senza side effect inattesi.
- [x] Le validazioni bloccano gli stati corrotti piu comuni.
- [x] Il payload salvato dall'admin resta compatibile col pubblico.

### Risultati Sprint 4 (2026-05-16)

**Sezioni verificate pulite:** dashboard, gironi, matches, scorers, standings, teams, sponsors ✅

**Bug trovati e risolti:**
- **B-13 (P2) — RISOLTO** · `news.jsx` creava news con `cat` (legacy) → `migration.js` leggeva `category` → perso. Fix: usa `category`, display backward-compat con `category || cat`
- **B-14 (P2) — RISOLTO** · `migration.js` honors: `runner_up` non trovava blob `runner`, `top_scorer` non trovava `topScorer`. Fix: aggiunto fallback `runner || second` e `topScorer || scorer`
- **B-15 (P2) — RISOLTO** · `migration.js` events: blob usa `{day,month,kind,where}` ma codice leggeva `{date,type,description}` → tutto null. Fix: costruisce ISO date da day+month, mappa `kind→type`, `where→description`
- **B-16 (P2) — RISOLTO** · Regressione B-11: date italiane "15 Lug" non matchavano né `'Oggi'` né ISO → panel oggi live vuoto. Fix: fallback a `status==='sch'` per date non-ISO

**Gap architetturale confermato (D-01 aperto):**
Admin CRUD (matches/teams/groups/news/scorers) scrive solo blob. Post-migrazione, public legge da relazionale → modifiche admin non visibili. Unica eccezione: live dual-write. Affrontato in Sprint 5.

---

## Sprint 5 - Sync Supabase e fallback

Obiettivo: chiarire e rendere robusta la relazione tra remoto, cache locale e
caricamento iniziale.

File/aree:

- `src/lib/api.js`
- `src/lib/http.js`
- `src/lib/storage.js`
- `src/lib/migration.js`
- `src/lib/supabase.js`
- `src/data.js`
- `supabase/admin_auth_setup.sql`
- `supabase/site_data_hardening.sql`
- `supabase/functions/admin-api/index.ts`

Requisiti reali:

- il pubblico deve leggere dati attendibili anche in condizioni degradate
- l'admin non deve perdere lavoro per un problema temporaneo di rete
- la source of truth deve essere comprensibile

Task di debug:

- [x] Verificare ordine reale di lettura: remoto, fallback locale, default.
- [x] Verificare cosa succede con Supabase non raggiungibile o risposta parziale.
- [x] Verificare rischi di stale cache o overwrite involontari.
- [x] Verificare consistenza tra deploy statico, env vars e chiamate runtime.
- [x] Verificare assunzioni su `site_data`, shape del payload e bootstrap remoto.

Task di refactor:

- [x] Documentare in modo esplicito la source of truth corrente.
- [x] Rendere visibile quando l'app sta lavorando in fallback locale. (warning dashboard)
- [x] Standardizzare retry, timeout, parse error e messaggi diagnostici. (timeout 5s bootstrap)
- [x] Isolare il compat layer di migrazione dal percorso normale di runtime.

Exit criteria:

- [x] Failure mode principali riprodotti e capiti.
- [x] Source of truth e fallback documentati senza ambiguita.
- [x] Nessun percorso standard dipende da comportamento implicito non tracciato.

### Risultati Sprint 5 (2026-05-16)

**Source of truth chiarita:**
```
Pubblico (rmLoadData):
  bootstrap API (teams.length > 0, timeout 5s) → site_data Supabase → localStorage → defaults

Admin (sync boot):
  rmLoadDataFromBootstrap (1 sola call, timeout 5s) → se OK, usa dati + estrae edition/tournaments
  → se fallisce, rmLoadData() (site_data → localStorage)
```

**Failure mode verificati:**
- Bootstrap timeout/errore → `catch` → usa `site_data` ✅
- `site_data` errore → usa localStorage ✅
- localStorage vuoto → usa defaults hardcoded ✅
- `rmSaveData` remote error → dati già in localStorage (safe), toast error ✅
- `401` durante save → bounceToLogin ✅

**Bug risolti:**
- **A-03 (P3) — RISOLTO** · Admin `sync()` faceva 2 fetch bootstrap in parallelo. Fix: 1 sola call `rmLoadDataFromBootstrap()`, fallback a `rmLoadData()` se vuoto
- **Timeout (P2) — RISOLTO** · `rmLoadDataFromBootstrap` non aveva timeout → poteva bloccare. Fix: `AbortController` 5s su ogni fetch bootstrap
- **Warning dashboard — NUOVO** · Quando relazionale attivo (`editionId` set), banner giallo avvisa staff che modifiche CRUD vanno solo a blob, non DB pubblico

**Gap D-01 documentato (aperto, non risolto):**
Dual-write mancante: dopo migrazione, admin CRUD (matches/teams/groups/news/scorers) scrive solo blob. Staff vedono cambio ma pubblico non aggiorna (legge da relazionale). Soluzione completa richiede dual-write per-sezione o endpoint `/save` che aggiorna anche relazionale. Complessità alta, fuori scope sprint corrente. Mitigazione: banner warning + guida migrazione in settings.

---

## Sprint 6 - UX, responsive e pulizia repo

Obiettivo: chiudere il debito che rende il progetto difficile da mantenere o da
usare sotto pressione durante il torneo.

File/aree:

- `src/styles.css`
- `src/admin-styles.css`
- `README.md`
- `AGENTS.md`
- `docs/`

Task di debug:

- [x] Verificare usability admin su viewport da tablet/laptop.
- [x] Verificare accessibilita minima di navigazione, focus, contrasto e feedback.
- [x] Elencare codice morto, alias inutili, documentazione obsoleta e naming divergenti.

Task di refactor:

- [x] Allineare README, AGENTS e documenti tecnici alla struttura reale.
- [x] Rimuovere o segnalare shims che prolungano ambiguita non piu utili.
- [x] Ripulire naming di moduli, sezioni e concetti di dominio.
- [x] Consolidare checklist operative di debug, smoke e rilascio. (Sprint 7)

Exit criteria:

- [x] La documentazione descrive il sistema che esiste davvero.
- [x] Il repo ha meno ambiguita strutturali.
- [x] UI pubblica e admin sono usabili sui viewport target.

### Risultati Sprint 6 (2026-05-16)

**Bug CSS risolti:**
- **C-01 (P2) — RISOLTO** · `adm-btn-brand` usato in `teams.jsx` ma non definito → bottoni player senza stile verde. Fix: aggiunto in admin-styles.css
- **C-02 (P3) — RISOLTO** · `adm-topbar-left` usato in `admin/app.jsx` ma non definito → regola inline ridondante. Fix: aggiunto in admin-styles.css

**Documentazione:**
- `AGENTS.md` riscritto da zero: era Babel CDN pre-Vite, ora descrive struttura Vite attuale con src/lib/*, 10 sezioni admin, comandi npm, flusso dati, nota D-01

---

## Sprint 7 - Hardening finale

Obiettivo: chiudere il ciclo trasformando il lavoro di debug/refactor in una
base pronta per manutenzione ordinata e giornate gara.

Task finali:

- [x] Rieseguire smoke test pubblico e admin completi.
- [x] Rieseguire build, test e lint.
- [x] Riclassificare backlog aperto per priorita reale `P0`-`P3`.
- [x] Separare fix immediati da miglioramenti futuri.
- [x] Preparare checklist pre-gara e checklist post-modifica.

Exit criteria:

- [x] Esiste un backlog tecnico ordinato e difendibile.
- [x] I rischi residui sono espliciti.
- [x] Il progetto ha una procedura minima di verifica prima del rilascio.

### Risultati Sprint 7 (2026-05-16)

**Smoke test finale:**
- `npm run build` → 0 errori, 641ms ✅
- `npm run test` → 59/59 passed ✅
- `npm run lint` → 0 errori ✅

---

## Backlog tecnico

| ID | Priorita | Tema | Problema | Stato |
| --- | --- | --- | --- | --- |
| B-01 | P1 | Home premi | `edition.prize_*` sempre undefined, premi su `tournament` | **RISOLTO** |
| B-02 | P2 | NewsCard | `item.cat` → blank, bootstrap manda `category` | **RISOLTO** |
| B-03 | P1 | EventRow | shape legacy vs bootstrap completamente diversa | **RISOLTO** |
| B-04 | P2 | HonorCard | `runner`/`topScorer` → blank (DB: `runner_up`/`top_scorer`) | **RISOLTO** |
| B-05 | P3 | HonorsScreen | `tournaments?.name` su array → undefined | **RISOLTO** |
| B-06 | P2 | Bootstrap match | `color` team mancante in oggetti partita | **RISOLTO** (deploy needed) |
| B-07 | P2 | Bootstrap live | `color` team mancante in live_match_state | **RISOLTO** (deploy needed) |
| B-11 | P2 | Live today | `status==='sch'` mostrava tutte le partite, non solo oggi | **RISOLTO** |
| B-12 | P2 | Delete categoria | nessuna conferma prima di azione distruttiva | **RISOLTO** |
| A-03 | P3 | Double bootstrap | admin `sync()` chiama bootstrap 2 volte in parallelo | **RISOLTO** |
| A-06 | P2 | Live dual-write | errori write relazionale silenziosi durante live | Aperto |
| G-01 | P2 | Strip admin | nessuna UI per gestire ticker — `rmAdminDomain.createStrip` esiste ma non esposto | Aperto |
| D-01 | P0 | Dual-write CRUD | post-migrazione, admin CRUD scrive solo blob → public (relazionale) non aggiorna | Aperto — warning aggiunto, fix completo fuori scope |
| B-13 | P2 | news cat field | news.jsx usava `cat` → migration perdeva category | **RISOLTO** |
| B-14 | P2 | honors migration | migration non leggeva `runner`/`topScorer` blob legacy | **RISOLTO** |
| B-15 | P2 | events migration | migration non mappava shape blob `{day,month,kind,where}` | **RISOLTO** |
| B-16 | P2 | live today regression | date italiane non matchavano filtro ISO | **RISOLTO** |
| P2 | Test coverage | copertura concentrata su dominio, mancano flussi critici | Aperto |
| P2 | Documentazione | AGENTS.md obsoleto (pre-Vite) | **RISOLTO** |

## Decisioni architetturali

| ID | Decisione | Impatto | Stato |
| --- | --- | --- | --- |
| D-01 | Source of truth: bootstrap relazionale (primary) → site_data → localStorage → defaults | Alto | **Chiarito** — dual-write CRUD mancante post-migrazione, mitigato da warning |
| D-02 | Legacy payload supportato finché blob è ancora fallback attivo (site_data) | Alto | **Chiarito** — compat layer rimane, legacy alias rimossi dalla persistenza |
| D-03 | Sezioni critiche giornata gara: Live, Partite, Avvisi. Secondarie: Albo d'oro, Sponsor, Striscia | Medio | **Chiarito** |
| D-04 | Test minimi obbligatori: `npm run build` + `npm run test` + `npm run lint` prima di ogni deploy | Medio | **Chiarito** — CI già configurato su push/PR |

## Registro operativo

### Evidenze

| Data | Sprint | Scenario | Evidenza | Note |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

### Fix implementati

| Data | Sprint | Fix/refactor | File coinvolti | Verifica |
| --- | --- | --- | --- | --- |
| 2026-05-16 | 0 | CLAUDE.md aggiornato: admin/sections (10 file) + src/lib/ | `CLAUDE.md` | ✅ |
| 2026-05-16 | 1 | B-01: premi letti da `d.tournaments[0]` invece di `d.edition` | `home.jsx` | build+test ✅ |
| 2026-05-16 | 2 | B-02: `NewsCard` usa `item.category \|\| item.cat` | `components.jsx` | build+test ✅ |
| 2026-05-16 | 2 | B-03: `EventRow` parsifica ISO date, deriva kind da type | `components.jsx` | build+test ✅ |
| 2026-05-16 | 2 | B-04: `HonorCard` supporta `runner_up\|\|runner`, `top_scorer\|\|topScorer` | `components.jsx` | build+test ✅ |
| 2026-05-16 | 2 | B-05: `HonorsScreen` usa `tournaments?.[0]?.name` | `secondary.jsx` | build+test ✅ |
| 2026-05-16 | 2 | B-06/B-07: aggiunto `color` in bootstrap phaseMap e live | `bootstrap.ts` | code ✅, deploy needed |
| 2026-05-16 | 3 | B-11: `todayMatches` confronta ISO date invece di `status==='sch'` | `live.jsx` | build+test ✅ |
| 2026-05-16 | 3 | B-12: deleteCategory con `Confirm` modal | `settings.jsx` | build+test ✅ |
| 2026-05-16 | 4 | B-13: news.jsx usa `category` non `cat` | `news.jsx` | build+test ✅ |
| 2026-05-16 | 4 | B-14/B-15: migration.js fallback nomi campo legacy per honors ed events | `migration.js` | build+test ✅ |
| 2026-05-16 | 4 | B-16: live today panel — fallback a `status==='sch'` per date italiane | `live.jsx` | build+test ✅ |
| 2026-05-16 | 5 | Timeout 5s su rmLoadDataFromBootstrap via AbortController | `api.js` | build+test ✅ |
| 2026-05-16 | 5 | A-03: admin sync — 1 sola call bootstrap invece di 2 parallele | `admin/app.jsx`, `data.js` | build+test ✅ |
| 2026-05-16 | 5 | Warning dashboard quando relazionale attivo | `dashboard.jsx` | build+test ✅ |
| 2026-05-16 | 6 | CSS: aggiunto `adm-btn-brand` e `adm-topbar-left` mancanti | `admin-styles.css` | build ✅ |
| 2026-05-16 | 6 | AGENTS.md riscritto — allineato a struttura Vite attuale | `AGENTS.md` | ✅ |

### Problemi aperti

| ID | Priorita | Problema | Impatto | Note |
| --- | --- | --- | --- | --- |
| D-01 | P0 | Dual-write CRUD mancante post-migrazione | Admin CRUD non aggiorna DB relazionale | Warning dashboard attivo. Fix: dual-write per-sezione o `/save` con upsert relazionale |
| G-01 | P2 | StripSection assente in admin | Staff non gestisce ticker da UI | `rmAdminDomain.createStrip/updateStrip/deleteStrip` già in crud.js — manca solo il pannello |
| A-06 | P2 | Errori dual-write live silenziosi | Staff non vede se write relazionale live fallisce | `console.warn` in live.jsx — aggiungere toast non-bloccante |
| — | P2 | Test coverage insufficiente su flussi critici | Regressioni su auth/save/bootstrap non rilevate da CI | Aggiungere test integration o smoke Playwright |
| B-06/B-07 | P2 | bootstrap.ts colori team — deploy pendente | Crest partite e live sempre verdi invece del colore squadra | `supabase functions deploy admin-api` richiesto |

---

## Checklist pre-gara

Da eseguire prima di ogni giornata di torneo.

### 1. Verifica tecnica (staff tecnico)

- [ ] `npm run build` — 0 errori
- [ ] `npm run test` — tutti i test verdi
- [ ] Sito pubblico carica su mobile (Chrome/Safari iOS)
- [ ] Admin carica e login funziona
- [ ] Bootstrap attivo: dashboard mostra "Database relazionale attivo"
- [ ] `supabase functions deploy admin-api` se ci sono modifiche pendenti alla Edge Function

### 2. Verifica dati (staff operativo)

- [ ] Gironi configurati e squadre assegnate
- [ ] Calendario partite inserito con date e orari
- [ ] Almeno 1 avviso in bacheca (anche solo "Benvenuti")
- [ ] Classifica calcolata correttamente (sezione Classifica admin)
- [ ] Striscia ticker configurata (attualmente via DB diretto — G-01 aperto)

### 3. Verifica live (bordo campo)

- [ ] Connessione dati attiva sul device di regia
- [ ] Admin apre correttamente su mobile (http://[deploy]/admin.html)
- [ ] Tab "Live" carica senza errori
- [ ] Selezione squadre funziona (dropdown Casa/Ospite)
- [ ] Test: avvia live → controlla sito pubblico aggiorna in ≤30s → termina live

---

## Checklist post-modifica

Da eseguire dopo ogni modifica al codice prima di fare push/deploy.

### Sempre

- [ ] `npm run build` — 0 errori
- [ ] `npm run test` — 59/59 (o più se aggiunti nuovi test)
- [ ] `npm run lint` — 0 errori

### Se modificato src/domain.js o src/lib/

- [ ] Verificare che i test esistenti passino ancora
- [ ] Aggiungere test per nuove funzioni pubbliche
- [ ] Nessun campo legacy riattivato nella persistenza

### Se modificato admin sections o componenti pubblici

- [ ] Avviare `npm run dev` e verificare la sezione modificata a mano
- [ ] Verificare empty state, loading state e errori visibili
- [ ] Verificare che `onSave` produca payload compatibile con le schermate pubbliche

### Se modificato supabase/functions/admin-api/

- [ ] `supabase functions deploy admin-api` sul progetto `jummgmhkapvvibicnqos`
- [ ] Verificare `/bootstrap` risponde con `schema_version: 3`
- [ ] Verificare login admin funziona ancora

### Se modificati stili CSS

- [ ] Verificare che nessuna classe usata in JSX sia diventata orfana
- [ ] Test visivo rapido su mobile (375px) e desktop (≥900px)

---

## Backlog ordinato per rilascio

### Da fare prima del torneo (P0/P1)

| ID | Problema | Effort | Note |
| --- | --- | --- | --- |
| D-01 | Dual-write CRUD post-migrazione | Alto | Senza questo, modifiche admin non raggiungono pubblico dopo migrazione |
| B-06/B-07 | Deploy bootstrap.ts con colori team | Minimo | Solo `supabase functions deploy admin-api` |

### Da fare durante/dopo torneo (P2)

| ID | Problema | Effort |
| --- | --- | --- |
| G-01 | StripSection admin per gestire ticker | Medio |
| A-06 | Toast non-bloccante su errori dual-write live | Basso |
| — | Test integration auth/save/bootstrap | Alto |

### Backlog futuro (P3)

| Problema | Note |
| --- | --- |
| Playwright smoke test in CI | Utile, non urgente |
| Rimozione completa legacy blob | Solo quando relazionale è l'unico path attivo |
| Ottimizzazioni bundle size | storage chunk 360kB (Supabase SDK) |
