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
| 0 | Baseline e strumenti | rendere visibili problemi, flussi e mismatch | Non iniziato | checklist tecnica condivisa |
| 1 | Dati e dominio | stabilizzare payload, normalizzazione e derivazioni | Non iniziato | contratto dati reale + test |
| 2 | Portale pubblico | eliminare rotture UI e incoerenze di navigazione/dati | Non iniziato | smoke test pubblico pulito |
| 3 | Auth e salvataggio admin | rendere affidabili login, sessione, save e recovery errori | Non iniziato | flusso admin stabile |
| 4 | Moduli admin torneo | ripulire CRUD e calcoli nelle sezioni operative | Non iniziato | admin coerente per giornata gara |
| 5 | Sync Supabase e fallback | chiarire source of truth e gestire failure mode reali | Non iniziato | strategia sync/fallback documentata |
| 6 | UX, responsive e pulizia repo | chiudere debito UI/DX/documentazione | Non iniziato | repo allineato al runtime reale |
| 7 | Hardening finale | congelare backlog, checklist gara e regressioni | Non iniziato | piano rilascio/refreeze |

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

- [ ] Verificare che `npm run dev`, `npm run build`, `npm run test` e `npm run lint` siano eseguibili.
- [ ] Mappare i flussi runtime reali: bootstrap pubblico, bootstrap admin, save, refresh, fallback.
- [ ] Registrare mismatch tra documentazione e codebase reale.
- [ ] Elencare schermate e moduli davvero in uso, distinguendo legacy e codice attivo.
- [ ] Definire una checklist smoke minima per pubblico e admin.

Task di refactor:

- [ ] Allineare la documentazione tecnica alla struttura reale del repo.
- [ ] Ridurre o segnalare shim/alias residui che confondono ownership dei moduli.
- [ ] Stabilire una sola fonte di verita per la descrizione dell'architettura corrente.

Exit criteria:

- [ ] Comandi di sviluppo e verifica tracciati.
- [ ] Mismatch documentali principali noti e registrati.
- [ ] Checklist smoke pronta per gli sprint successivi.

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

- [ ] Tracciare tutti i punti in cui il payload viene letto, normalizzato o mutato.
- [ ] Verificare differenze tra dato remoto, cache locale e shape attesa dalle schermate.
- [ ] Cercare campi legacy che possono riattivare bug silenziosi.
- [ ] Validare le funzioni di calcolo su risultati, live ed empty state.

Task di refactor:

- [ ] Centralizzare normalizzazione e default in un solo layer chiaro.
- [ ] Esplicitare invarianti minime del payload con helper dedicati.
- [ ] Separare meglio dati persistiti, dati derivati e compat layer legacy.
- [ ] Espandere i test su standings, scorers, fallback e migrazione shape.

Exit criteria:

- [ ] Il contratto dati reale e documentato.
- [ ] Nessuna schermata critica legge campi ambigui o duplicati.
- [ ] Test dominio coprono i calcoli piu sensibili.

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

- [ ] Smoke test di tutte le route/schermate pubbliche.
- [ ] Verificare coerenza tra Home, Live, Calendario, Classifica e schermate secondarie.
- [ ] Verificare filtri, empty state, contenuti mancanti e fallback visuali.
- [ ] Verificare refresh, ritorno su tab e ricarica pagina.
- [ ] Verificare comportamento responsive su breakpoints principali.

Task di refactor:

- [ ] Ridurre logica duplicata di selezione/filtraggio nelle schermate.
- [ ] Isolare trasformazioni dati UI-specifiche in helper leggibili.
- [ ] Migliorare gestione degli stati vuoti e degli errori non bloccanti.
- [ ] Pulire componenti condivisi con responsabilita troppo miste.

Exit criteria:

- [ ] Tutte le schermate pubbliche hanno una checklist passata.
- [ ] Non emergono mismatch visibili tra sezioni che leggono gli stessi dati.
- [ ] Navigazione e refresh risultano stabili.

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

- [ ] Riprodurre login valido, login invalido, token scaduto e sessione corrotta.
- [ ] Verificare bootstrap admin con sessione presente e assente.
- [ ] Verificare il flusso di save locale + remoto e la propagazione errori.
- [ ] Verificare logout e recovery dopo `401` o fallimento Edge Function.
- [ ] Verificare che i messaggi di errore siano utili per lo staff.

Task di refactor:

- [ ] Centralizzare la gestione della sessione e degli errori auth.
- [ ] Ridurre duplicazioni tra layer HTTP, API e auth guards.
- [ ] Rendere piu esplicito il contratto delle chiamate `login`, `save`, `credentials`, `logout`.
- [ ] Uniformare toast, fallback e redirect nelle failure mode ricorrenti.

Exit criteria:

- [ ] Login e salvataggio hanno scenari felici e scenari di errore verificati.
- [ ] Nessun errore auth lascia l'admin in stato ambiguo.
- [ ] Il flusso di save e comprensibile e tracciabile.

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

- [ ] Verificare CRUD reali delle sezioni principali.
- [ ] Controllare coerenza di `group_id`, score, eventi live, scorers e standings.
- [ ] Verificare che un cambio admin si rifletta correttamente nelle schermate pubbliche.
- [ ] Cercare form con validazioni mancanti o stati impossibili.
- [ ] Verificare reset, impostazioni e azioni distruttive.

Task di refactor:

- [ ] Estrarre helper condivisi per form, validazioni e update immutabili.
- [ ] Ridurre duplicazione tra sezioni che manipolano lo stesso dato.
- [ ] Introdurre guardrail per stati invalidi prima del save.
- [ ] Separare meglio UI di editing e logica di trasformazione dati.

Exit criteria:

- [ ] Le sezioni operative principali sono verificabili senza side effect inattesi.
- [ ] Le validazioni bloccano gli stati corrotti piu comuni.
- [ ] Il payload salvato dall'admin resta compatibile col pubblico.

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

- [ ] Verificare ordine reale di lettura: remoto, fallback locale, default.
- [ ] Verificare cosa succede con Supabase non raggiungibile o risposta parziale.
- [ ] Verificare rischi di stale cache o overwrite involontari.
- [ ] Verificare consistenza tra deploy statico, env vars e chiamate runtime.
- [ ] Verificare assunzioni su `site_data`, shape del payload e bootstrap remoto.

Task di refactor:

- [ ] Documentare in modo esplicito la source of truth corrente.
- [ ] Rendere visibile quando l'app sta lavorando in fallback locale.
- [ ] Standardizzare retry, timeout, parse error e messaggi diagnostici.
- [ ] Isolare il compat layer di migrazione dal percorso normale di runtime.

Exit criteria:

- [ ] Failure mode principali riprodotti e capiti.
- [ ] Source of truth e fallback documentati senza ambiguita.
- [ ] Nessun percorso standard dipende da comportamento implicito non tracciato.

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

- [ ] Verificare usability admin su viewport da tablet/laptop.
- [ ] Verificare accessibilita minima di navigazione, focus, contrasto e feedback.
- [ ] Elencare codice morto, alias inutili, documentazione obsoleta e naming divergenti.

Task di refactor:

- [ ] Allineare README, AGENTS e documenti tecnici alla struttura reale.
- [ ] Rimuovere o segnalare shims che prolungano ambiguita non piu utili.
- [ ] Ripulire naming di moduli, sezioni e concetti di dominio.
- [ ] Consolidare checklist operative di debug, smoke e rilascio.

Exit criteria:

- [ ] La documentazione descrive il sistema che esiste davvero.
- [ ] Il repo ha meno ambiguita strutturali.
- [ ] UI pubblica e admin sono usabili sui viewport target.

---

## Sprint 7 - Hardening finale

Obiettivo: chiudere il ciclo trasformando il lavoro di debug/refactor in una
base pronta per manutenzione ordinata e giornate gara.

Task finali:

- [ ] Rieseguire smoke test pubblico e admin completi.
- [ ] Rieseguire build, test e lint.
- [ ] Riclassificare backlog aperto per priorita reale `P0`-`P3`.
- [ ] Separare fix immediati da miglioramenti futuri.
- [ ] Preparare checklist pre-gara e checklist post-modifica.

Exit criteria:

- [ ] Esiste un backlog tecnico ordinato e difendibile.
- [ ] I rischi residui sono espliciti.
- [ ] Il progetto ha una procedura minima di verifica prima del rilascio.

---

## Backlog tecnico iniziale da confermare

| Priorita | Tema | Problema da chiudere | Stato |
| --- | --- | --- | --- |
| P0 | Source of truth dati | remoto, cache locale e compat layer non sono ancora abbastanza espliciti | Aperto |
| P0 | Flusso admin | auth, save e recovery errori vanno verificati end-to-end | Aperto |
| P1 | Dominio dati | rischio campi legacy o shape ambigue tra moduli | Aperto |
| P1 | Moduli admin | validazioni e CRUD da consolidare | Aperto |
| P1 | Portale pubblico | coerenza inter-schermata e refresh da stressare | Aperto |
| P2 | Test coverage | copertura troppo concentrata sul dominio, poco su flussi critici | Aperto |
| P2 | Documentazione | README, AGENTS e piani tecnici vanno riallineati | Aperto |
| P3 | Cleanup generale | naming, alias e shims da ridurre quando non servono piu | Aperto |

## Decisioni architetturali da chiudere

| ID | Decisione | Impatto | Stato |
| --- | --- | --- | --- |
| D-01 | Qual e oggi la vera source of truth: payload remoto, cache locale o bootstrap ibrido? | Alto | Da decidere |
| D-02 | Quanto legacy va ancora supportato nel payload prima di poterlo rimuovere? | Alto | Da decidere |
| D-03 | Quali sezioni admin sono critiche per giornata gara e quali possono restare secondarie? | Medio | Da decidere |
| D-04 | Quale livello minimo di test automatici deve diventare obbligatorio prima di ogni rilascio? | Medio | Da decidere |

## Registro operativo

### Evidenze

| Data | Sprint | Scenario | Evidenza | Note |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

### Fix implementati

| Data | Sprint | Fix/refactor | File coinvolti | Verifica |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

### Problemi aperti

| ID | Sprint | Problema | Impatto | Owner | Stato |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
