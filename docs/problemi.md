# Problemi rilevati in produzione

Data analisi: 19 maggio 2026

Questo documento raccoglie i problemi osservati durante la verifica dell'app in produzione, con priorita, motivo probabile e possibile risoluzione. Le priorita sono:

- **Alta**: rischio di perdita dati, risultati/classifiche errate o funzionalita pubblica principale non affidabile.
- **Media**: problema importante di gestione o UX che puo creare errori operativi.
- **Bassa**: rifinitura, coerenza visiva o semplificazione.

## Riepilogo priorita

| ID | Area | Priorita | Problema |
| --- | --- | --- | --- |
| P-01 | Admin squadre/marcatori | Alta | Marcatori non rimossi quando viene rimossa una squadra |
| P-02 | Admin squadre | Alta | I calciatori inseriti durante la creazione immediata della squadra non vengono salvati |
| P-03 | Admin live/partite | Alta | Terminando la live non viene aggiornata automaticamente la partita come disputata |
| P-04 | Pubblico home/live | Alta | Le partite inserite compaiono nel calendario ma non nelle "partite di oggi" |
| P-05 | Pubblico categorie/gironi | Alta | Alcuni dati pubblici usano la prima categoria invece della categoria selezionata |
| P-06 | Admin live/marcatori | Alta | I marcatori aggiornati dalla live non sono sincronizzati con la tabella relazionale |
| P-07 | Admin live | Alta | Autogol mostrato dal lato sbagliato e rimozione autogol incompleta |
| P-08 | Admin live | Alta | La live non conserva il `match_id` della partita avviata |
| P-09 | Admin categorie/live | Media | Cambiando categoria, la view live puo mantenere dati della categoria precedente |
| P-10 | Admin giocatori | Media | Manca validazione formato giocatori lato JavaScript e backend |
| P-11 | Admin marcatori | Media | La voce per modificare i marcatori e poco evidente |
| P-12 | Admin gironi/squadre | Media | Mancano link rapidi fra gestione gironi e gestione squadre |
| P-13 | Admin partite | Media | Se una partita passa da "da giocare" a "giocata", i gol restano visibili/vuoti |
| P-14 | Pubblico squadre | Media | Le statistiche squadra senza partite devono mostrare 0 di default |
| P-15 | Pubblico squadre | Media | Click su una squadra non apre il dettaglio |
| P-22 | Admin squadre | Media | Possibile conflitto creando la stessa nazione in piu categorie |
| P-23 | Pubblico classifiche | Media | Le classifiche da SQL potrebbero non mostrare squadre a zero partite |
| P-16 | Admin giocatori | Bassa | Nel giocatore la voce "modifica" va sostituita con icona e hint sempre visibile |
| P-17 | Admin live | Bassa | Valutare rimozione o riduzione della durata partita |
| P-18 | Admin menu | Bassa | Icona impostazioni da sostituire con rotellina |
| P-19 | Admin dashboard | Bassa | Badge categoria non cliccabili da rimuovere |
| P-20 | Pubblico menu | Bassa | Icona classifica da cambiare |
| P-21 | Pubblico menu | Bassa | Il pulsante "Altro" non si evidenzia quando apre il drawer |
| P-24 | Admin categorie | Bassa | Ingrandire i badge delle categorie in alto |

---

## Dettaglio problemi

### P-01 - Marcatori non rimossi quando viene rimossa una squadra

**Priorita:** Alta

**Problema:** attualmente possono restare marcatori associati a una squadra cancellata o rimossa dal torneo. Questo produce dati fantasma nella classifica marcatori.

**Motivo probabile:** in `src/admin/sections/teams.jsx`, `deleteTeam()` elimina prima la registrazione e poi la squadra, ma non elimina esplicitamente i record in `scorers`. Nel backend `supabase/functions/admin-api/handlers/competition-handler.ts`, `DELETE /teams/:id` cancella solo da `teams`. Se il database non ha un `ON DELETE CASCADE` o `ON DELETE SET NULL` coerente, i marcatori restano.

**Possibile risoluzione:**

- nel backend, rendere `DELETE /teams/:id` una cancellazione coordinata: eliminare prima i marcatori del team nel torneo corrente, poi registrazioni, live state/eventi collegati se necessario, infine la squadra;
- in alternativa, se il team puo essere condiviso fra categorie, cancellare solo `team_registrations` e i marcatori della coppia `team_id + tournament_id`, senza cancellare la riga globale in `teams`;
- aggiungere vincoli DB espliciti su `scorers.team_id` con comportamento deciso (`cascade` o `set null`) e testare il caso.

### P-02 - Calciatori non salvati alla creazione immediata della squadra

**Priorita:** Alta

**Problema:** creando una nuova squadra e inserendo subito i calciatori nella modale, la rosa non viene salvata.

**Motivo probabile:** in `src/admin/sections/teams.jsx`, ramo nuova squadra di `saveItem()`: dopo `createTeam()`, viene chiamato `upsertRegistration({ team_id, tournament_id, group_id })`, ma non vengono passati `players` e `captain`. Nel ramo modifica, invece, `updateRegistration()` passa correttamente `players`.

**Possibile risoluzione:**

- includere `players: item.players || []` e `captain: item.captain || null` anche nella `upsertRegistration()` della nuova squadra;
- dopo salvataggio, fare `onRefresh()` e verificare che il bootstrap ritorni `team_registrations.players`;
- aggiungere un test manuale o automatico: crea squadra con due giocatori, salva, refresh, riapri squadra.

### P-03 - Terminando la live non viene aggiornata la partita come disputata

**Priorita:** Alta

**Problema:** alla chiusura della live il risultato resta nello stato live, ma la partita di calendario non viene salvata automaticamente come disputata.

**Motivo probabile:** in `src/admin/sections/live.jsx`, `doTerminate()` chiama solo `persistLm({ active: false, ... })`. `persistLm()` aggiorna `live_match_state` tramite `rmAdminDomain.updateLive()`, ma non chiama `rmAdminDomain.updateMatch()` sulla partita originaria.

**Possibile risoluzione:**

- salvare nell'oggetto live il `match_id` della partita selezionata quando si avvia la diretta;
- a `TERMINA`, chiamare una operazione backend atomica che:
  - imposta `matches.status = 'ft'`;
  - copia `home_score` e `away_score` dal live;
  - salva eventuali eventi collegati alla partita;
  - spegne `live_match_state.active`;
- idealmente creare un endpoint dedicato, ad esempio `POST /live/finish`, per evitare salvataggi parziali.

### P-04 - Partite nel calendario ma non nelle "partite di oggi"

**Priorita:** Alta

**Problema:** una partita inserita compare nel calendario pubblico, ma non nella sezione "Partite di oggi".

**Motivo probabile:** ci sono due cause nel codice:

- `src/domain.js`, `rmDeriveMatchesToday()` filtra solo `match.date === 'Oggi'` o `status === 'live'`, ma il bootstrap relazionale usa date ISO (`YYYY-MM-DD`);
- `src/public/screens/live.jsx` legge `tournament.matches`, ma nel bootstrap `matches` e un array raw DB con campi `match_date`, `home_team`, `away_team`, mentre `MatchRow` si aspetta `date`, `home`, `away`. Il calendario invece usa `matches_giornata`, gia normalizzato.

**Possibile risoluzione:**

- aggiornare `rmDeriveMatchesToday()` per confrontare anche la data ISO con `new Date().toISOString().slice(0, 10)`;
- nella `LiveScreen`, usare `tournament.matches_giornata` come fa il calendario, oppure normalizzare `tournament.matches` nel bootstrap;
- evitare stringhe speciali come `"Oggi"` nel dato persistito: meglio salvare sempre ISO e formattare solo in UI.

### P-05 - Dati pubblici legati alla prima categoria invece della categoria selezionata

**Priorita:** Alta

**Problema:** lato pubblico alcuni dati sembrano riferirsi alla categoria iniziale anche dopo aver selezionato un'altra categoria. Questo puo spiegare incongruenze su gironi, partite di oggi, live e marcatori.

**Motivo probabile:** in `src/public/app.jsx` esiste `activeTournament`, ma `HomeScreen` usa quasi sempre `data` top-level invece di `tournament`: `live_match`, `matches_today`, `standings_groups`, `scorers`, `teams`, `groups`. Inoltre `hasLive` viene calcolato da `data.live_match`, non da `activeTournament.live_match`.

**Possibile risoluzione:**

- in `HomeScreen`, preferire sempre `tournament?.live_match`, `tournament?.matches_giornata`, `tournament?.standings_groups`, `tournament?.scorers`, `tournament?.teams`, `tournament?.groups`;
- calcolare `matches_today` per la categoria selezionata;
- in `App`, calcolare `hasLive` dalla categoria attiva;
- testare cambio categoria su Home, Live, Calendario, Classifica e Squadre.

### P-06 - Marcatori live non sincronizzati con il relazionale

**Priorita:** Alta

**Problema:** i gol assegnati durante la live aggiornano apparentemente la lista marcatori, ma possono non restare corretti dopo refresh/bootstrap.

**Motivo probabile:** in `src/admin/sections/live.jsx`, `updateScorer()` aggiorna una lista `data.scorers` locale e poi `onSave()` passa dal salvataggio legacy blob. Il pubblico pero legge i marcatori dal bootstrap relazionale (`scorers` table), e `persistLm()` non chiama `createScorer()` o `updateScorer()`.

**Possibile risoluzione:**

- spostare l'aggiornamento marcatori in backend, legato agli eventi gol;
- quando si aggiunge/rimuove un gol, aggiornare `match_events` e ricalcolare/upsertare `scorers`;
- evitare doppia sorgente di verita tra blob legacy e tabelle relazionali.

### P-07 - Autogol mostrato dal lato sbagliato e rimozione incompleta

**Priorita:** Alta

**Problema:** nel live, l'autogol va mostrato dal lato della squadra che beneficia della rete, non dal lato della squadra del giocatore che ha segnato nella propria porta. Inoltre rimuovere un autogol non sembra decrementare il punteggio.

**Motivo probabile:** in `pickGoalPlayer()`, per autogol viene salvato `_ts` come squadra del giocatore che ha fatto autogol (`autogolFromShort`). Le UI usano `_ts` per decidere il lato da mostrare. In `removeEvent()`, il punteggio viene decrementato solo se `ev.type === 'goal' && !ev._autogol`.

**Possibile risoluzione:**

- separare `player_team_short` da `scoring_team_short`;
- usare `scoring_team_short` per visualizzazione e decremento score;
- mantenere `player_team_short` solo per indicare chi ha fatto autogol;
- aggiornare sia admin live sia pubblico `LiveBoard`.

### P-08 - La live non conserva il `match_id`

**Priorita:** Alta

**Problema:** una live viene avviata da una partita esistente, ma lo stato live non conserva l'identificativo della partita. Senza questo collegamento e difficile salvare il risultato finale nella partita corretta.

**Motivo probabile:** `selectedMatchObj` contiene `id`, e l'endpoint `/live` accetta `match_id`, ma `persistLm()` non lo invia e `doStartLive()` non lo copia in `lm`.

**Possibile risoluzione:**

- in `doStartLive()`, includere `match_id: selectedMatchObj.id`;
- in `persistLm()`, passare `match_id: newLm.match_id || null` a `rmAdminDomain.updateLive()`;
- usare quel `match_id` nel finish live.

### P-09 - Cambiando categoria, la live puo mantenere dati precedenti

**Priorita:** Media

**Problema:** in admin, cambiando categoria/torneo, la sezione live puo continuare a usare lo stato e la lista squadre iniziali.

**Motivo probabile:** `src/admin/sections/live.jsx` inizializza `lm` e `teams` con `useState(data.live_match)` e `useState(data.teams)`, ma non sincronizza questi stati quando `data` cambia dopo il cambio categoria.

**Possibile risoluzione:**

- aggiungere `useEffect()` su `data.live_match` e `data.teams` per riallineare lo stato locale;
- evitare di mettere `teams` in `useState` se non viene modificato localmente: usare direttamente `data.teams || []`.

### P-10 - Validazione formato giocatori mancante

**Priorita:** Media

**Problema:** l'aggiunta dei giocatori non controlla in modo robusto formato, lunghezza e caratteri ammessi.

**Motivo probabile:** in `TeamForm.addPlayer()` e `saveEditPlayer()` viene solo fatto `trim()`. Nel backend `/registrations` accetta `players` senza validazione.

**Possibile risoluzione:**

- frontend: validare nome e cognome prima di aggiungere/salvare;
- backend: validare `players` in `POST/PUT /registrations` con schema esplicito;
- regola consigliata: nome e cognome obbligatori, 2-40 caratteri ciascuno, lettere unicode, spazi, apostrofo e trattino ammessi;
- normalizzare spazi doppi e salvare sempre `{ id, nome, cognome, name }`.

### P-11 - Voce per modificare i marcatori poco evidente

**Priorita:** Media

**Problema:** esiste una sezione `ScorersSection`, ma dalla dashboard/menu principale non sembra esserci una voce chiara per raggiungerla e modificare i marcatori.

**Motivo probabile:** `src/admin/app.jsx` supporta il tab `scorers`, ma `DashboardSection` non include un pulsante "Marcatori" nel setup o nella regia. La bottom nav contiene solo Torneo, Live, Avvisi, Impostazioni.

**Possibile risoluzione:**

- aggiungere un link/pulsante "Marcatori" nella dashboard, vicino a Partite o Regia;
- eventualmente aggiungere scorciatoia anche nella sezione live dopo i gol;
- mantenere il tab `#scorers` esistente.

### P-12 - Link rapidi fra gironi e squadre mancanti

**Priorita:** Media

**Problema:** dalla gestione gironi manca un link rapido per creare una squadra; inoltre serve passaggio rapido gironi -> squadre e squadre -> gironi.

**Motivo probabile:** `GironiSection` non riceve `setTab` e non puo navigare direttamente; `TeamsSection` idem. La dashboard ha i link, ma nelle viste operative non ci sono scorciatoie.

**Possibile risoluzione:**

- passare `setTab`/`navigateTo` alle sezioni interessate;
- in `GironiSection`, aggiungere `+ Squadra` che apre `teams` o, meglio, apre direttamente la modale nuova squadra;
- in `TeamsSection`, aggiungere "Vai ai gironi";
- in `GironiSection`, se non ci sono squadre libere, mostrare CTA "Crea nuova squadra".

### P-13 - Stato partita "giocata" con gol vuoti

**Priorita:** Media

**Problema:** al cambio di stato da "Da giocare" a "Giocata", i campi gol restano visibili e possono restare vuoti; la richiesta e nasconderli quando non servono e impostare default 0-0.

**Motivo probabile:** `MatchForm` mostra sempre i campi `Gol Casa` e `Gol Ospite`, e `saveMatch()` salva `null` se i campi sono vuoti anche con `status === 'ft'`.

**Possibile risoluzione:**

- quando `status` passa a `ft`, valorizzare `hs` e `as` a `0` se sono `null`;
- mostrare i campi gol solo per `status === 'ft'` oppure mantenerli disabilitati/nascosti per `sch`;
- lato backend, se `status === 'ft'` e i punteggi sono null, normalizzare a `0-0` o rifiutare con errore chiaro.

### P-14 - Statistiche squadra senza partite non inizializzate a 0

**Priorita:** Media

**Problema:** nella lista squadre pubblica, se una squadra non ha partite o statistiche, alcuni valori possono risultare vuoti invece di `0`.

**Motivo probabile:** `TeamCard` legge `team.played`, `team.won`, `team.goals`, `team.points`, ma le squadre dal bootstrap hanno `group_id`, `players`, ecc. e non sempre questi campi statistici.

**Possibile risoluzione:**

- in `TeamCard`, usare fallback `team.played ?? 0`, `team.won ?? 0`, `team.goals ?? 0`, `team.points ?? 0`;
- valutare di arricchire `teams` dal bootstrap con statistiche aggregate o derivarle da `standings_groups`.

### P-15 - Click su squadra senza dettaglio

**Priorita:** Media

**Problema:** dalla sezione pubblica Squadre non e possibile aprire una squadra in dettaglio.

**Motivo probabile:** `TeamsScreen` renderizza solo una griglia di `TeamCard` statiche. Non c'e stato `selectedTeam`, route/hash dedicata o modale dettaglio.

**Possibile risoluzione:**

- rendere `TeamCard` cliccabile;
- aprire una modale/scheda dettaglio con rosa, girone, partite della squadra e statistiche;
- se si vuole deep-link, usare hash tipo `#teams/team-short` o query param.

### P-22 - Possibile conflitto creando la stessa nazione in piu categorie

**Priorita:** Media

**Problema:** se la tabella `teams` e globale e ha vincoli univoci su `short` o `name`, creare la stessa nazionale in due categorie diverse puo fallire o generare duplicati indesiderati.

**Motivo probabile:** `TeamsSection.saveItem()` per una nuova squadra chiama sempre `createTeam()`, poi registra la squadra nel torneo. Non prova a riusare una squadra esistente.

**Possibile risoluzione:**

- decidere se `teams` e globale o per torneo;
- se globale, cercare/riusare il team esistente per `short` e creare solo la registrazione;
- se per torneo, spostare l'unicita su `team_registrations` o introdurre un campo torneo/team coerente.

### P-23 - Classifiche SQL potrebbero non mostrare squadre a zero partite

**Priorita:** Media

**Problema:** le classifiche pubbliche/admin dipendono da `standings_view`. Se la vista SQL aggrega solo partite disputate, i gironi appena creati o squadre senza partite potrebbero non comparire.

**Motivo probabile:** il bootstrap legge `standings_view` e non ricostruisce fallback da `groups + teams` quando la vista ritorna zero righe. In `src/domain.js` la classifica JS invece inizializza correttamente tutte le squadre del girone a zero.

**Possibile risoluzione:**

- aggiornare `standings_view` affinche parta da `team_registrations` e faccia `LEFT JOIN` sulle partite;
- oppure nel bootstrap, se la vista e vuota, derivare `standings_groups` da `groups` e `teams` con valori a zero;
- aggiungere test su girone con squadre ma nessuna partita disputata.

### P-16 - UX modifica giocatori e hint sempre visibile

**Priorita:** Bassa

**Problema:** nella rosa giocatori, la voce testuale "modifica" puo essere meno chiara; il suggerimento "Inserisci nome e cognome, poi premi +" sparisce appena ci sono giocatori.

**Motivo probabile:** in `TeamForm`, l'hint e renderizzato solo quando `editing.players.length === 0`; la riga giocatore mostra uno span testuale `modifica`.

**Possibile risoluzione:**

- sostituire `modifica` con `EditIcon`;
- lasciare sempre visibile una microcopy sotto gli input, ad esempio "Nome e cognome, poi premi +";
- mantenere il click sulla riga per modifica rapida.

### P-17 - Durata partita nella live

**Priorita:** Bassa

**Problema:** la durata partita puo essere superflua se la live viene gestita manualmente e il risultato viene salvato al termine.

**Motivo probabile:** `LiveSection` usa `data.match_settings?.half_duration || 30` per timer e fasi. Se gli operatori aggiornano manualmente il risultato, questo dato puo generare confusione.

**Possibile risoluzione:**

- valutare modalita manuale: minuto inseribile/aggiornabile manualmente, senza dipendere da durata tempi;
- oppure mantenere la durata come impostazione avanzata nascosta, non centrale nella UX.

### P-18 - Icona impostazioni nel menu admin

**Priorita:** Bassa

**Problema:** nel menu admin la voce impostazioni usa l'icona menu, ma sarebbe piu coerente una rotellina.

**Motivo probabile:** `src/admin/app.jsx` usa `MenuIcon` per `settings`.

**Possibile risoluzione:**

- aggiungere `SettingsIcon` in `src/admin/shared.jsx`;
- sostituire `MenuIcon` con `SettingsIcon` nella bottom nav admin.

### P-19 - Badge categoria non cliccabili nella dashboard

**Priorita:** Bassa

**Problema:** in dashboard appare un badge/pill della categoria gestita, ma non e cliccabile. La richiesta e lasciare solo "Stai gestendo: X".

**Motivo probabile:** `DashboardSection` mostra sia la frase "Stai gestendo" sia una lista di `span` per tutte le categorie, mentre la vera selezione cliccabile e gia nella barra categoria superiore.

**Possibile risoluzione:**

- rimuovere la lista di `span` non cliccabili;
- mantenere solo la riga testuale con la categoria attiva.

### P-20 - Icona classifica pubblica

**Priorita:** Bassa

**Problema:** cambiare l'icona della classifica nel menu pubblico.

**Motivo probabile:** `BottomNav` usa `GridIcon` per `table`, mentre la classifica potrebbe essere comunicata meglio con icona tipo trophy/list/chart.

**Possibile risoluzione:**

- aggiungere o riusare un'icona piu adatta, ad esempio `TrophyIcon` o nuova `BarChartIcon`;
- sostituire l'icona per la voce `Classifica`.

### P-21 - Focus "Altro" nel menu pubblico

**Priorita:** Bassa

**Problema:** premendo "Altro", si apre il drawer ma l'icona non si colora di verde se la pagina corrente non e una delle sezioni secondarie.

**Motivo probabile:** `isMoreActive` e calcolato solo con `['teams','events','news','honors'].includes(current)`, ignorando `drawerOpen`.

**Possibile risoluzione:**

- cambiare in `const isMoreActive = drawerOpen || ['teams','events','news','honors'].includes(current);`;
- verificare che il colore torni normale alla chiusura drawer.

### P-24 - Ingrandire i badge delle categorie in alto

**Priorita:** Bassa

**Problema:** i badge/pulsanti delle categorie nella barra superiore sono poco evidenti e possono risultare difficili da premere, soprattutto da mobile.

**Motivo probabile:** le classi dei pill categoria (`adm-cat-pill` lato admin e `rm-cat-pill` lato pubblico) usano dimensioni compatte. Questo rende la selezione categoria meno leggibile quando ci sono piu tornei/categorie.

**Possibile risoluzione:**

- aumentare padding orizzontale e verticale dei badge;
- alzare leggermente font-size e area cliccabile minima;
- verificare che la barra resti scrollabile o vada a capo correttamente su mobile.

## Ordine consigliato di intervento

1. Risolvere P-02, P-03, P-04, P-05, P-06, P-07 e P-08: sono i punti che possono alterare dati o risultato pubblico.
2. Sistemare P-01 e P-10 con una strategia backend chiara su cancellazioni e validazione.
3. Migliorare navigazione admin: P-11 e P-12.
4. Rifinire UX e coerenza: P-13, P-14, P-15, P-16, P-18, P-19, P-20, P-21, P-24.
5. Verificare gli scenari multi-categoria e SQL: P-22 e P-23.
