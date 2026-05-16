# Workflow operativo audit requisiti

Audit del documento `Rinascita_Monteforte_Cup_Analisi_Requisiti.docx`.

Questo file e un tracker operativo: serve per sapere cosa e stato verificato,
cosa manca, quali gap sono stati trovati e quali decisioni devono essere prese.
Il workflow e organizzato in sprint incrementali, separati per utenti del
sistema e per area funzionale. Lo sprint database e tenuto separato per poterlo
eseguire in modo indipendente.

## Regole di compilazione

- Una checkbox si spunta solo quando esiste un'evidenza verificabile.
- Ogni requisito deve avere stato, evidenza e, se necessario, gap/decisione.
- Se documento e implementazione non coincidono, usare `Contraddittorio`.
- Se serve una scelta del team, usare `Da decidere`.
- Se un requisito non e piu valido, usare `Non applicabile` e motivare.
- Lo sprint database non deve modificare dati o schema senza approvazione.

## Stati ammessi

| Stato | Significato |
| --- | --- |
| Non iniziato | Verifica non ancora partita |
| In corso | Verifica avviata ma incompleta |
| Conforme | Requisito presente e verificato |
| Parziale | Requisito presente solo in parte |
| Mancante | Requisito assente |
| Contraddittorio | Requisito in conflitto con codice, dati o documentazione |
| Da decidere | Serve decisione prodotto o tecnica |
| Non applicabile | Requisito escluso dal perimetro corrente |

## Tracker sprint

| Sprint | Area audit | Utente/owner principale | Stato | Evidenza principale | Note |
| --- | --- | --- | --- | --- | --- |
| 0 | Preparazione audit | Auditor / team progetto | Non iniziato |  |  |
| 1 | Portale pubblico | Utente pubblico | Non iniziato |  |  |
| 2 | Admin - accesso e sessioni | Staff admin | Non iniziato |  |  |
| 3 | Admin - struttura torneo | Staff admin | Non iniziato |  |  |
| 4 | Admin - live match | Staff admin giornata gara | Non iniziato |  |  |
| 5 | Admin - contenuti | Staff admin contenuti | Non iniziato |  |  |
| 6 | Admin - statistiche e audit log | Staff admin / organizzazione | Non iniziato |  |  |
| 7 | Database e Supabase | Operatore tecnico DB | Non iniziato |  | Sprint separato |
| 8 | Non funzionali | Tutti gli utenti | Non iniziato |  |  |
| 9 | Consolidamento finale | Team progetto | Non iniziato |  |  |

---

## Sprint 0 - Preparazione audit

Obiettivo: impostare il controllo prima di verificare pubblico, admin e DB.

Utenti/owner:

- Auditor tecnico
- Team progetto
- Referente prodotto/torneo

Checklist:

- [ ] Confermare documento sorgente: `Rinascita_Monteforte_Cup_Analisi_Requisiti.docx`.
- [ ] Confermare versione documento: `1.0 - Giugno 2025`.
- [ ] Preparare ambiente di verifica pubblico.
- [ ] Preparare ambiente di verifica admin.
- [ ] Preparare accesso Supabase in sola lettura per lo sprint DB.
- [ ] Definire formato evidenze: screenshot, file, query, log, note test.
- [ ] Definire severita gap: `Bloccante`, `Alta`, `Media`, `Bassa`.
- [ ] Registrare incoerenze macro gia note.

Incoerenze macro da controllare subito:

| Tema | Da verificare | Stato | Evidenza | Decisione |
| --- | --- | --- | --- | --- |
| Stack frontend | Il documento cita React 18 + Vite: verificare stack reale | Non iniziato |  |  |
| Modello dati | Il documento descrive DB relazionale: verificare se il prodotto usa ancora JSON `site_data` | Non iniziato |  |  |
| Categorie/gironi | Il documento prevede categorie e gironi: verificare modello reale | Non iniziato |  |  |
| Albo d'oro | Il documento dice che `honors` e rimosso: verificare se il sito lo mostra ancora | Non iniziato |  |  |
| Multi-admin | Il documento richiede multi-admin e audit log: verificare supporto reale | Non iniziato |  |  |

Exit criteria:

- [ ] Fonti e ambienti confermati.
- [ ] Stati e severita definiti.
- [ ] Tracker pronto per gli sprint successivi.

---

## Sprint 1 - Utente pubblico

Obiettivo: verificare tutto cio che un visitatore anonimo puo visualizzare.

Utente principale:

- Utente pubblico anonimo

Ambito:

- Home
- Live
- Calendario
- Classifica
- Squadre
- Marcatori
- Avvisi/news
- Sponsor
- Ticker
- Refresh dati
- Navigazione responsive

### Requisiti pubblici

| ID | Requisito | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- | --- |
| PUB-01 | Home | Hero, countdown, stato torneo, live in evidenza, partite del giorno, classifica sintetica, marcatori, sponsor | Non iniziato |  |  |
| PUB-02 | Live | Punteggio corrente, minuto gara, lista eventi, marcatore, tempo evento | Non iniziato |  |  |
| PUB-03 | Calendario | Lista partite, filtri categoria/fase/girone, data/ora, campo, risultato, stato | Non iniziato |  |  |
| PUB-04 | Classifica | Classifica per girone/categoria, G/V/N/P/GF/GS/diff/punti, calcolo automatico | Non iniziato |  |  |
| PUB-05 | Squadre | Filtro categoria/girone, nome, sigla, nazione, flag, colori, capitano, giocatori | Non iniziato |  |  |
| PUB-06 | Marcatori | Classifica globale e per categoria, gol, rigori, autogol | Non iniziato |  |  |
| PUB-07 | Avvisi | Ordinamento per data, pin in cima, contenuto rich text o alternativa prevista | Non iniziato |  |  |
| PUB-08 | Sponsor | Logo, nome, link, tier, `sort_order` | Non iniziato |  |  |
| PUB-09 | Ticker | Striscia scorrevole superiore con messaggi staff | Non iniziato |  |  |
| PUB-10 | Refresh | Aggiornamento ogni 30 secondi e refresh su ritorno tab | Non iniziato |  |  |

### Navigazione e responsive

- [ ] Mobile: bottom nav con Home, Live, Calendario, Classifica, Altro.
- [ ] Mobile: drawer Altro con sezioni secondarie.
- [ ] Desktop: header con navigazione orizzontale.
- [ ] Desktop: bottom nav nascosta.
- [ ] Nessuna funzione di modifica dati accessibile al pubblico.
- [ ] Link admin discreto nel footer, se previsto.

Exit criteria:

- [ ] Ogni requisito `PUB-*` ha stato compilato.
- [ ] Ogni schermata pubblica ha almeno un'evidenza.
- [ ] Gap pubblici classificati per severita.

---

## Sprint 2 - Staff admin: accesso, sessioni e ruoli

Obiettivo: verificare autenticazione, sessioni, logout, cambio credenziali e
ruoli staff.

Utente principale:

- Utente staff admin

Ambito:

- Login
- Sessione
- Logout
- Cambio credenziali
- Gestione utenti staff
- Ruolo `super_admin`

### Requisiti admin auth

| ID | Requisito | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- | --- |
| ADM-01 | Login | Username/password, password hashata, token, scadenza default 12h, sessionStorage | Non iniziato |  |  |
| ADM-02 | Multi-admin | Login simultanei, sessioni indipendenti, tracciamento operazioni | Non iniziato |  |  |
| ADM-03 | Logout | Invalidazione token lato server e pulizia sessionStorage | Non iniziato |  |  |
| ADM-04 | Cambio credenziali | Cambio username/password da Settings o area equivalente | Non iniziato |  |  |
| ADM-05 | Gestione utenti staff | Super admin crea, disabilita e modifica altri account | Non iniziato |  |  |

### Casi di test

- [ ] Login con credenziali valide.
- [ ] Login con password errata.
- [ ] Login con utente inesistente.
- [ ] Login con utente disabilitato, se previsto.
- [ ] Refresh admin con sessione valida.
- [ ] Token scaduto.
- [ ] Logout e riuso token precedente.
- [ ] Due admin collegati contemporaneamente.
- [ ] Cambio credenziali e nuovo login.

Exit criteria:

- [ ] Requisiti `ADM-01` - `ADM-05` verificati.
- [ ] Rischi sicurezza annotati.
- [ ] Ruoli admin chiariti.

---

## Sprint 3 - Staff admin: struttura torneo

Obiettivo: verificare configurazione torneo, categorie, gironi, squadre,
giocatori e partite.

Utente principale:

- Utente staff admin

Ambito:

- Torneo
- Categorie
- Gironi
- Squadre
- Giocatori
- Calendario

### Requisiti struttura torneo

| ID | Requisito | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- | --- |
| ADM-10 | Torneo | Nome, stagione, location, date inizio/fine, logo, stato, descrizione | Non iniziato |  |  |
| ADM-11 | Categorie | CRUD categorie, ordine, colore, attivazione/disattivazione | Non iniziato |  |  |
| ADM-12 | Gironi | Gironi per categoria, nome, colore, fase, ordinamento | Non iniziato |  |  |
| ADM-13 | Squadre | CRUD squadre, sigla, nazione, flag, logo, colori, capitano, assegnazione | Non iniziato |  |  |
| ADM-14 | Giocatori | Roster, nome, numero maglia, ruolo, capitano | Non iniziato |  |  |
| ADM-15 | Calendario | Creazione/modifica partite, categoria, girone, fase, squadre, campo, data/ora, giornata, stato | Non iniziato |  |  |

### Casi di test

- [ ] Creare o modificare metadati torneo.
- [ ] Creare categoria.
- [ ] Disattivare categoria.
- [ ] Creare girone.
- [ ] Cambiare colore/ordine girone.
- [ ] Creare squadra.
- [ ] Assegnare squadra a categoria/girone.
- [ ] Inserire giocatore in roster.
- [ ] Creare partita di girone.
- [ ] Creare partita fase finale.
- [ ] Cambiare stato partita.

### Decisioni richieste

| Tema | Domanda | Stato | Decisione |
| --- | --- | --- | --- |
| Categorie | Le categorie sono ancora richieste o il dominio usa solo gironi? | Da decidere |  |
| Giocatori | Il roster e obbligatorio per MVP o opzionale? | Da decidere |  |
| Multi-categoria | Una squadra puo iscriversi a piu categorie? | Da decidere |  |
| Fasi knockout | Le fasi finali sono gestite come gironi/fasi o come bracket dedicato? | Da decidere |  |

Exit criteria:

- [ ] Requisiti `ADM-10` - `ADM-15` verificati.
- [ ] Contraddizioni modello dominio registrate.
- [ ] Decisioni prodotto aperte identificate.

---

## Sprint 4 - Staff admin: live match

Obiettivo: verificare gestione live della partita durante una giornata di gara.

Utente principale:

- Staff admin operativo sul campo

Ambito:

- Dashboard giornata
- Avvio live
- Timer
- Pausa/ripresa
- Multi-tempo
- Gol
- Eventi
- Annullamenti
- Fine partita
- Aggiornamento classifiche

### Requisiti live match

| ID | Requisito | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- | --- |
| ADM-20 | Dashboard giornata | Partite della giornata e avvio live con un click | Non iniziato |  |  |
| ADM-21 | Avvio live | Match in stato live, timer automatico, visibilita pubblica | Non iniziato |  |  |
| ADM-22 | Timer automatico | Calcolo minuto da timestamp start e pause accumulate | Non iniziato |  |  |
| ADM-23 | Pausa/ripresa | Pausa timer, accumulo pausa, ripresa corretta | Non iniziato |  |  |
| ADM-24 | Multi-tempo | Primo tempo, secondo tempo, supplementari, rigori | Non iniziato |  |  |
| ADM-25 | Aggiunta gol | Squadra, giocatore/nome libero, minuto, score aggiornato | Non iniziato |  |  |
| ADM-26 | Rimozione gol | Soft-delete evento, ricalcolo score, storico visibile | Non iniziato |  |  |
| ADM-27 | Marcatori | Gol registrato confluisce nella classifica marcatori | Non iniziato |  |  |
| ADM-28 | Altri eventi | Giallo, rosso, rigore, autogol, sostituzione, VAR/note | Non iniziato |  |  |
| ADM-29 | Terminazione | Stato completed, timer fermo, match rimosso da live board | Non iniziato |  |  |
| ADM-30 | Auto classifiche | Classifiche ricalcolate dai risultati finali | Non iniziato |  |  |
| ADM-31 | Modifiche retroattive | Risultati, eventi e punteggi modificabili dopo fine partita | Non iniziato |  |  |

### Casi di test live

- [ ] Avviare live da partita programmata.
- [ ] Registrare gol casa.
- [ ] Registrare gol ospite.
- [ ] Registrare marcatore da roster.
- [ ] Registrare marcatore libero.
- [ ] Annullare gol.
- [ ] Registrare cartellino giallo.
- [ ] Registrare cartellino rosso.
- [ ] Registrare autogol.
- [ ] Registrare rigore.
- [ ] Mettere in pausa.
- [ ] Riprendere.
- [ ] Passare a secondo tempo.
- [ ] Terminare partita.
- [ ] Modificare risultato post partita.
- [ ] Verificare pubblico dopo ogni cambio rilevante.

Exit criteria:

- [ ] Requisiti `ADM-20` - `ADM-31` verificati.
- [ ] Score, eventi, marcatori e classifiche coerenti.
- [ ] Tutti i gap operativi live classificati.

---

## Sprint 5 - Staff admin: contenuti e comunicazioni

Obiettivo: verificare gestione comunicazioni, sponsor, ticker ed eventi.

Utente principale:

- Staff admin contenuti

Ambito:

- Avvisi/news
- Pin avvisi
- Sponsor
- Ticker
- Eventi torneo

### Requisiti contenuti

| ID | Requisito | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- | --- |
| ADM-40 | Avvisi | CRUD titolo, contenuto, categoria, pubblicazione, scadenza | Non iniziato |  |  |
| ADM-41 | Evidenza avvisi | Pin/depinnaggio e priorita in bacheca/homepage | Non iniziato |  |  |
| ADM-42 | Sponsor | Logo, link, tier, ordine, attivo/disattivo | Non iniziato |  |  |
| ADM-43 | Ticker | Testo, priorita, date attivazione/scadenza | Non iniziato |  |  |
| ADM-44 | Eventi torneo | Titolo, descrizione, data/ora, luogo | Non iniziato |  |  |

### Casi di test

- [ ] Creare avviso.
- [ ] Modificare avviso.
- [ ] Pinnare avviso.
- [ ] Depinnare avviso.
- [ ] Impostare scadenza avviso.
- [ ] Creare sponsor main/gold/silver/bronze.
- [ ] Ordinare sponsor nello stesso tier.
- [ ] Disattivare sponsor.
- [ ] Creare messaggio ticker.
- [ ] Programmare messaggio ticker.
- [ ] Creare evento torneo.

### Decisioni richieste

| Tema | Domanda | Stato | Decisione |
| --- | --- | --- | --- |
| Rich text | Avvisi in Markdown, HTML sanitizzato o testo semplice? | Da decidere |  |
| Loghi sponsor | Logo come URL, upload asset locale o testo? | Da decidere |  |
| Albo d'oro | Mantenerlo o rimuoverlo dal perimetro? | Da decidere |  |

Exit criteria:

- [ ] Requisiti `ADM-40` - `ADM-44` verificati.
- [ ] Pubblicazione contenuti admin visibile sul pubblico.
- [ ] Decisioni editoriali registrate.

---

## Sprint 6 - Staff admin: statistiche, report e audit log

Obiettivo: verificare dati derivati, riepiloghi partita e tracciabilita.

Utente principale:

- Staff admin
- Organizzazione torneo

Ambito:

- Classifica live
- Marcatori live
- Statistiche partita
- Audit log

### Requisiti statistiche/report

| ID | Requisito | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- | --- |
| ADM-50 | Classifica live | Classifica aggiornata anche durante match live | Non iniziato |  |  |
| ADM-51 | Marcatori | Classifica marcatori aggiornata in tempo reale da eventi gol | Non iniziato |  |  |
| ADM-52 | Statistiche partita | Eventi, riepilogo score, marcatori, durata effettiva per periodo | Non iniziato |  |  |
| ADM-53 | Audit log | Storico modifiche con entita, azione, old/new, admin, timestamp | Non iniziato |  |  |

### Casi di test

- [ ] Gol live aggiorna classifica parziale.
- [ ] Gol live aggiorna marcatori.
- [ ] Gol annullato rimuove effetto da marcatori.
- [ ] Gol annullato rimuove effetto da score/classifica.
- [ ] Fine partita consolida statistiche.
- [ ] Modifica retroattiva genera audit log.
- [ ] Audit log conserva dati precedenti e successivi.

Exit criteria:

- [ ] Requisiti `ADM-50` - `ADM-53` verificati.
- [ ] Calcoli derivati riproducibili.
- [ ] Tracciabilita sufficiente o gap documentato.

---

## Sprint 7 - Database e Supabase

Obiettivo: verificare database, schema, RLS, view ed Edge Function in uno sprint
separato e autonomo.

Utente/owner:

- Operatore tecnico database

Ambito:

- Progetto Supabase `jummgmhkapvvibicnqos`
- Tabelle relazionali
- View
- RLS
- Edge Function `admin-api`
- Fallback `site_data`

Regole sprint:

- [ ] Solo query read-only finche non c'e approvazione esplicita.
- [ ] Nessuna modifica schema senza decisione registrata.
- [ ] Nessuna modifica dati senza decisione registrata.
- [ ] Separare sempre: richiesto dal documento, presente nel DB, gap.

### 7.1 Tabelle richieste dal documento

| Tabella | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- |
| `admin_users` | PK UUID, username unique, password hash, role, `is_active`, timestamp | Non iniziato |  |  |
| `admin_sessions` | FK user, token hash, IP, user agent, expiry, last activity | Non iniziato |  |  |
| `tournament` | Riga torneo, nome, stagione, logo, date, stato, descrizione | Non iniziato |  |  |
| `categories` | FK tournament, slug, colore, sort order, `is_active` | Non iniziato |  |  |
| `groups` | FK category, slug, stage, colore, sort order, `is_active` | Non iniziato |  |  |
| `teams` | Nome, short, country, flag/logo, colori, capitano, note, `is_active` | Non iniziato |  |  |
| `team_registrations` | FK team/category/group, iscrizione squadra a categoria/girone | Non iniziato |  |  |
| `players` | FK team, nome, numero, ruolo, capitano, `is_active` | Non iniziato |  |  |
| `matches` | FK group/team, schedule, phase, status, score, winner, note | Non iniziato |  |  |
| `match_periods` | FK match, periodo, durata, start/end, pause, status | Non iniziato |  |  |
| `live_match_state` | FK match unique, periodo corrente, score live, status, manager | Non iniziato |  |  |
| `match_events` | FK match/period/team/player, tipo evento, minuto, score snapshot, cancellazione | Non iniziato |  |  |
| `news` | Titolo, contenuto, categoria, pin, attivo, publish/expire, author | Non iniziato |  |  |
| `sponsors` | Nome, logo, link, tier, sort, attivo | Non iniziato |  |  |
| `strip_messages` | Messaggio, priorita, attivo, start/end, author | Non iniziato |  |  |
| `tournament_events` | Titolo, descrizione, data, ora, luogo, icona, attivo | Non iniziato |  |  |
| `match_audit_log` | Entita, azione, old/new jsonb, admin, IP, note, created_at immutabile | Non iniziato |  |  |
| `site_data` | Riga `id=1`, `content jsonb`, `updated_at`, fallback legacy | Non iniziato |  |  |

### 7.2 Vincoli e integrita

- [ ] PK corretti.
- [ ] FK coerenti con documento.
- [ ] `created_at` presente dove richiesto.
- [ ] `updated_at` presente dove richiesto.
- [ ] Trigger `updated_at` funzionanti.
- [ ] Soft-delete tramite `is_active` o `is_cancelled`.
- [ ] Nessun requisito richiede delete fisico.
- [ ] Unique constraint su campi critici: username, slug, live match.
- [ ] Check constraint o equivalenti per campi status/stage/role/event_type.
- [ ] Indici per query frequenti pubbliche/admin.

### 7.3 View e logica derivata

| View | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- |
| `standings_view` | Calcolo da match completed, punti, diff reti, gol fatti, ordinamento | Non iniziato |  |  |
| `scorers_view` | Goal e penalty validi, esclusione eventi cancellati, raggruppamento corretto | Non iniziato |  |  |
| `today_matches_view` | Partite di oggi con join squadre/gironi | Non iniziato |  |  |
| `live_snapshot_view` | Stato live, eventi non cancellati, periodi attivi in snapshot unico | Non iniziato |  |  |

### 7.4 RLS e permessi

| Area | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- |
| Tabelle pubbliche | `anon` legge solo dati attivi/visibili | Non iniziato |  |  |
| `matches` | `anon` legge stati previsti dal documento | Non iniziato |  |  |
| `match_events` | `anon` non legge eventi cancellati | Non iniziato |  |  |
| `admin_users` | Nessun accesso anon | Non iniziato |  |  |
| `admin_sessions` | Nessun accesso anon | Non iniziato |  |  |
| `match_audit_log` | Nessun accesso anon | Non iniziato |  |  |
| Scritture | Scrittura solo via Edge Function/service role | Non iniziato |  |  |
| `site_data` | `anon` legge solo riga `id=1`, non scrive | Non iniziato |  |  |

### 7.5 Edge Function `admin-api`

| Flusso | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- |
| Login | Verifica credenziali, bcrypt, utente attivo, creazione sessione | Non iniziato |  |  |
| Save | Validazione token, salvataggio dati, gestione errori | Non iniziato |  |  |
| Credentials | Cambio username/password protetto | Non iniziato |  |  |
| Logout | Invalidazione sessione lato server | Non iniziato |  |  |
| Token validation | Hash token, scadenza, last activity | Non iniziato |  |  |
| Audit | Log per modifiche rilevanti | Non iniziato |  |  |

### 7.6 Fallback e migrazione dati

- [ ] Chiarire se `site_data` e fonte primaria, cache o fallback.
- [ ] Chiarire se il frontend legge il modello relazionale o il blob JSON.
- [ ] Verificare compatibilita tra `content jsonb` e struttura documento.
- [ ] Definire gap migrazione da JSON a relazionale.
- [ ] Definire rollback/fallback in caso Supabase non disponibile.

Exit criteria:

- [ ] Schema richiesto confrontato con schema reale.
- [ ] RLS verificata.
- [ ] View verificate.
- [ ] Edge Function verificata.
- [ ] Gap DB consegnati come backlog separato.

---

## Sprint 8 - Requisiti non funzionali

Obiettivo: verificare qualita operativa del sistema oltre alle funzioni.

Utenti coinvolti:

- Utente pubblico
- Staff admin
- Operatore tecnico

### Requisiti non funzionali

| Area | Requisito | Sotto-task di verifica | Stato | Evidenza | Gap/Decisione |
| --- | --- | --- | --- | --- | --- |
| Disponibilita | Pubblico H24, admin operativo durante gare | Verificare dipendenze e fallback | Non iniziato |  |  |
| Aggiornamento live | Polling 30s e timer client-side da timestamp server | Verificare frequenza e correttezza timer | Non iniziato |  |  |
| Multi-admin | Sessioni simultanee senza conflitti critici | Test due sessioni e last-write-wins | Non iniziato |  |  |
| Responsive | Pubblico mobile/desktop, admin tablet/laptop | Test viewport principali | Non iniziato |  |  |
| Performance | No query pesanti a ogni refresh | Verificare payload, query, cache/view | Non iniziato |  |  |
| Sicurezza | RLS, password bcrypt, no anon write | Collegare evidenze Sprint 2 e 7 | Non iniziato |  |  |
| Fallback | Supabase offline -> localStorage/default | Simulare errore remoto | Non iniziato |  |  |
| Auditabilita | Ogni modifica admin loggata, soft-delete | Collegare evidenze Sprint 6 e 7 | Non iniziato |  |  |
| Estensibilita | Supporto futuro multi-torneo | Valutare modello senza implementare | Non iniziato |  |  |

Exit criteria:

- [ ] Tutte le aree non funzionali hanno stato.
- [ ] Rischi classificati per impatto in giornata gara.
- [ ] Dipendenze da database e sicurezza esplicitate.

---

## Sprint 9 - Consolidamento finale

Obiettivo: trasformare le verifiche in un report finale e in un backlog
operativo.

Utenti/owner:

- Team progetto
- Referente torneo
- Operatore tecnico

Checklist:

- [ ] Raccogliere tutti i gap dagli sprint 1-8.
- [ ] Classificare ogni requisito come conforme/parziale/mancante/ecc.
- [ ] Separare gap per area: pubblico, admin, live, contenuti, DB, sicurezza.
- [ ] Evidenziare contraddizioni tra documento e implementazione.
- [ ] Definire backlog prioritizzato.
- [ ] Confermare cosa entra nella prossima fase di sviluppo.
- [ ] Confermare cosa viene escluso o rimandato.

### Matrice finale gap

| ID/Area | Gap | Severita | Sprint origine | Decisione richiesta | Owner | Stato |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

### Backlog finale

| Priorita | Intervento | Motivo | Dipendenze | Stato |
| --- | --- | --- | --- | --- |
| P0 |  | Blocca gara, sicurezza o accesso admin |  | Non iniziato |
| P1 |  | Funzionalita principale incompleta |  | Non iniziato |
| P2 |  | Miglioramento importante ma non bloccante |  | Non iniziato |
| P3 |  | Futuro o nice to have |  | Non iniziato |

Exit criteria:

- [ ] Tutti i requisiti del documento sono stati mappati.
- [ ] Tutti i gap hanno owner o decisione.
- [ ] Sprint database consegnato separatamente.
- [ ] Backlog pronto per pianificazione sviluppo.

---

## Registro evidenze

| Data | Sprint | Requisito | Evidenza | Link/file/query/screenshot | Note |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Registro decisioni

| Data | Tema | Decisione | Motivazione | Owner |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Domande aperte

| ID | Domanda | Area | Impatto | Risposta/Decisione |
| --- | --- | --- | --- | --- |
| Q-01 | Il sistema deve migrare davvero al modello relazionale completo o restare su `site_data` JSON? | Database | Alto |  |
| Q-02 | Le categorie sono ancora parte del dominio o sono state sostituite dai gironi? | Admin/Pubblico | Alto |  |
| Q-03 | L'Albo d'oro va mantenuto o rimosso? | Pubblico/Contenuti | Medio |  |
| Q-04 | Il roster giocatori e obbligatorio nella prima release? | Admin/Live | Medio |  |
| Q-05 | Il multi-admin richiede gestione conflitti o basta last-write-wins con audit log? | Admin/Sicurezza | Alto |  |
