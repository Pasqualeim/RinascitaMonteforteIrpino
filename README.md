# Rinascita Monteforte Cup

Sito ufficiale statico per il torneo amatoriale "Rinascita Monteforte Cup" di Monteforte Irpino, con una parte pubblica per gli utenti e un pannello admin riservato allo staff organizzativo.

Il progetto e' pensato per pubblicare rapidamente calendario, risultati, classifica, live match, avvisi, sponsor e contenuti editoriali del torneo, mantenendo un frontend completamente client-side e una persistenza dati appoggiata a Supabase.

## Indice

- [Panoramica](#panoramica)
- [Funzionalita](#funzionalita)
- [Stack tecnologico](#stack-tecnologico)
- [Architettura applicativa](#architettura-applicativa)
- [Struttura del progetto](#struttura-del-progetto)
- [Modello dati e persistenza](#modello-dati-e-persistenza)
- [Database Supabase](#database-supabase)
- [Edge Function `admin-api`](#edge-function-admin-api)
- [Variabili d'ambiente](#variabili-dambiente)
- [Avvio locale](#avvio-locale)
- [Build, preview e deploy](#build-preview-e-deploy)
- [Testing e qualita](#testing-e-qualita)
- [Estensione del progetto](#estensione-del-progetto)
- [Crediti](#crediti)

## Panoramica

L'applicazione e' composta da due entrypoint principali:

- `index.html`: portale pubblico consultabile dagli utenti.
- `admin.html`: area staff protetta da login.

Lato frontend, il progetto usa React 18 con moduli ES e Vite come runtime di sviluppo e build tool. Lato backend non esiste un server applicativo dedicato: la parte remota e' delegata a Supabase tramite lettura dati, autenticazione staff e una Edge Function custom.

## Funzionalita

### Area pubblica

La parte pubblica espone le principali informazioni del torneo:

- `Home`: hero, countdown, stato del torneo, live match in evidenza, partite del giorno, classifica, marcatori, sponsor e contenuti di contesto.
- `Live`: tabellone della partita in diretta con punteggio, minuto, eventi e risultati rilevanti.
- `Calendario`: elenco partite con filtri dinamici per fase e girone.
- `Classifica`: classifiche per girone calcolate automaticamente dai risultati finali.
- `Squadre`: elenco squadre filtrabile per girone, con nazione, flag e metadati squadra.
- `Eventi`: timeline di eventi del torneo.
- `Avvisi`: bacheca news e comunicazioni organizzative.
- `Albo d'oro`: storico edizioni precedenti.

Funzionalita trasversali lato pubblico:

- refresh automatico dei dati ogni 30 secondi;
- refresh on-visibility quando l'utente torna sulla tab;
- navigazione responsive:
  - header desktop con voci orizzontali;
  - bottom navigation mobile con drawer "Altro";
- striscia ticker superiore con messaggi dinamici;
- accesso discreto all'area staff da mobile e footer.

### Area admin

L'area staff e' pensata per gestire il torneo durante setup, giornata e post-partita:

- login staff via Supabase Edge Function;
- dashboard iniziale con checklist operativa;
- gestione gironi con colore e ordinamento;
- gestione squadre con sigla, nazione, flag, capitano e giocatori;
- gestione partite con fase, stato, campo, data, ora e punteggio;
- bracket view per le fasi a eliminazione;
- classifica per girone auto-calcolata;
- gestione marcatori;
- gestione live match con punteggio, minuto ed eventi;
- gestione news e avvisi;
- gestione eventi, albo d'oro e sponsor;
- gestione impostazioni staff:
  - cambio credenziali;
  - lettura edizioni/categorie torneo;
  - migrazione dati dal blob legacy al modello relazionale.

## Stack tecnologico

- `React 18`
- `React DOM 18`
- `Vite`
- `@supabase/supabase-js`
- `Vitest`
- `ESLint`
- `Prettier`
- `Netlify` per build/deploy statico

## Architettura applicativa

L'architettura e' divisa in quattro livelli principali.

### 1. Entry HTML

- `index.html` monta l'app pubblica caricando `src/public/app.jsx`
- `admin.html` monta l'app admin caricando `src/admin/app.jsx`

Entrambi condividono il design system base tramite `colors_and_type.css`.

### 2. Layer di presentazione

- `src/public/*`: schermate e shell del sito pubblico
- `src/admin/*`: schermate e shell del pannello staff
- `src/components.jsx`: componenti condivisi, header, footer, bottom nav, live board, strip, icone
- `src/styles.css`: stile pubblico
- `src/admin-styles.css`: stile admin

### 3. Layer dominio

`src/domain.js` contiene la logica pura e riusabile:

- normalizzazione del payload torneo;
- compatibilita con il vecchio schema;
- calcolo classifiche;
- derivazione di partite del giorno e ticker;
- gestione e validazione minima della sessione admin.

E' il layer piu importante da testare e infatti i test automatici sono concentrati qui.

### 4. Layer dati

`src/data.js` gestisce:

- default locali dell'app;
- caricamento dati da Supabase e fallback locale;
- persistenza in `localStorage`;
- autenticazione admin;
- salvataggio remoto via `admin-api`;
- bootstrap schema relazionale;
- metodi CRUD admin verso la Edge Function.

## Struttura del progetto

```text
.
├── index.html
├── admin.html
├── colors_and_type.css
├── netlify.toml
├── vite.config.js
├── src/
│   ├── components.jsx
│   ├── styles.css
│   ├── admin-styles.css
│   ├── domain.js
│   ├── data.js
│   ├── public/
│   │   ├── app.jsx
│   │   └── screens/
│   │       ├── home.jsx
│   │       ├── live.jsx
│   │       ├── calendar.jsx
│   │       ├── table.jsx
│   │       ├── teams.jsx
│   │       └── secondary.jsx
│   ├── admin/
│   │   ├── app.jsx
│   │   ├── auth.jsx
│   │   ├── shared.jsx
│   │   └── sections/
│   │       ├── competition.jsx
│   │       ├── live-news.jsx
│   │       ├── content.jsx
│   │       └── settings.jsx
│   └── __tests__/
│       └── domain.test.js
├── supabase/
│   ├── admin_auth_setup.sql
│   ├── site_data_hardening.sql
│   └── functions/
│       └── admin-api/
│           └── index.ts
└── assets/
```

## Modello dati e persistenza

Il progetto oggi vive in una modalita ibrida: supporta sia il vecchio blob JSON singolo, sia un nuovo modello relazionale in Supabase.

### Ordine di lettura dati

La funzione `rmLoadData()` segue questa strategia:

1. prova il bootstrap relazionale via `admin-api/bootstrap`;
2. se il bootstrap non e' disponibile o non e' ancora popolato, legge `public.site_data`;
3. se la lettura remota fallisce, usa `localStorage`;
4. se non trova nulla, usa i default hardcoded in `src/data.js`.

### Ordine di salvataggio dati

La funzione `rmSaveData()`:

1. normalizza i dati;
2. salva subito in `localStorage` per feedback immediato;
3. se la pagina e' `admin.html` e la sessione e' valida, invia il payload a `admin-api/save`.

### Storage browser

- `localStorage.rm_data_v2`: cache e fallback dati torneo
- `localStorage.rm_team_id_map_v1`: mapping team short -> id relazionale usato in migrazione
- `sessionStorage.rm_admin_session_v1`: sessione staff breve con token ed expiry

### Schema dati applicativo

Il payload principale gestito dal frontend contiene, in forma semplificata:

```js
{
  schema_version,
  edition,
  tournaments,
  teams,
  groups,
  standings_groups,
  live_match,
  matches,
  matches_giornata,
  scorers,
  news,
  events,
  honors,
  sponsors,
  strip_items,
  updated_at
}
```

Note importanti:

- `matches_today` e `strip_items` possono essere derivati a runtime.
- il frontend mantiene alias legacy come `standings_a`, `standings_o40`, `standings_jr` per retrocompatibilita.
- quando il bootstrap relazionale e' disponibile, il primo torneo viene esposto anche a top-level per non rompere le schermate esistenti.

## Database Supabase

### Progetto previsto

Il progetto e' collegato al tenant Supabase:

- project id: `jummgmhkapvvibicnqos`
- region: `eu-west-1`

### Modello attuale

Dal codice emerge un doppio livello di persistenza.

#### 1. Blob legacy

Tabella:

- `public.site_data`

Uso:

- contiene una singola riga `id = 1`;
- salva l'intero contenuto del sito come `jsonb`;
- resta il fallback compatibile con il vecchio frontend.

Colonne minime attese:

- `id bigint primary key`
- `content jsonb`
- `updated_at timestamptz`

#### 2. Modello relazionale

La Edge Function `admin-api` legge e scrive sulle seguenti entita:

- `editions`: contenitore annuale del torneo
- `tournaments`: categorie o tornei interni a una edizione
- `groups`: gironi per torneo
- `teams`: anagrafica squadra
- `team_registrations`: iscrizione squadra a torneo e girone
- `matches`: calendario e risultati
- `match_events`: eventi minuto per minuto
- `live_match_state`: stato della diretta
- `scorers`: classifica marcatori
- `news`: bacheca avvisi
- `edition_events`: timeline eventi
- `honors`: albo d'oro
- `sponsors`: sponsor
- `strip_messages`: messaggi per la striscia superiore
- `standings_view`: vista usata dal bootstrap per leggere classifiche aggregate

### Tabelle auth staff

Nel repository sono presenti gli script SQL per il setup delle tabelle staff:

- `public.admin_users`
- `public.admin_sessions`

Lo script `supabase/admin_auth_setup.sql` crea:

- struttura tabelle;
- indici base;
- trigger `updated_at`;
- RLS con blocco totale per `anon` e `authenticated`.

### Sicurezza e RLS

Nel repository e' presente anche `supabase/site_data_hardening.sql`, che imposta:

- `SELECT` pubblico su `site_data` limitato alla riga `id = 1`;
- blocco totale di `INSERT`, `UPDATE`, `DELETE` lato client;
- scrittura consentita solo tramite service role, quindi via Edge Function.

### Nota importante sullo schema relazionale

Il repository include:

- SQL per auth staff;
- SQL di hardening per `site_data`;
- Edge Function TypeScript che usa il modello relazionale.

Non include invece, almeno in questo stato del codice, tutti gli script SQL completi per creare le tabelle relazionali principali come `editions`, `tournaments`, `matches`, `scorers`, `standings_view`, ecc. Questo significa che tali oggetti devono gia esistere nel progetto Supabase oppure vanno provisionati separatamente.

## Edge Function `admin-api`

La funzione `supabase/functions/admin-api/index.ts` gestisce:

### Endpoint pubblici

- `GET /bootstrap`
- `GET /editions`

### Endpoint auth

- `POST /login`
- `GET /me`
- `POST /logout`
- `POST /credentials`

### Endpoint salvataggio legacy

- `POST /save`

Aggiorna il blob `site_data.content` dopo aver validato la sessione staff.

### Endpoint CRUD dominio

La funzione espone CRUD per:

- edizioni;
- categorie torneo;
- gironi;
- squadre;
- registrazioni;
- partite;
- eventi partita;
- live state;
- marcatori;
- news;
- eventi;
- albo d'oro;
- sponsor;
- messaggi striscia.

### Meccanismo di sessione

La sessione staff non usa Supabase Auth standard. Il flusso e' custom:

1. login con `username` e `password`;
2. verifica password hashata in `admin_users`;
3. emissione token random;
4. salvataggio dell'hash token in `admin_sessions`;
5. invio token raw al browser;
6. persistenza del token in `sessionStorage`.

## Variabili d'ambiente

### Frontend Vite

Copiare `.env.example` in `.env` e valorizzare:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
VITE_ADMIN_API_URL=https://your-project.supabase.co/functions/v1/admin-api
```

Note:

- `VITE_SUPABASE_KEY` e' la chiave anon pubblica del progetto.
- senza queste variabili il sito puo comunque mostrare i default locali, ma autenticazione admin e sync remoto non funzionano correttamente.

### Variabili Edge Function

La funzione `admin-api` richiede:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_SESSION_SECRET=...
ADMIN_SESSION_HOURS=12
ADMIN_ALLOWED_ORIGIN=https://your-domain.example
```

Significato:

- `SUPABASE_URL`: URL progetto
- `SUPABASE_SERVICE_ROLE_KEY`: service role usato per scritture protette
- `ADMIN_SESSION_SECRET`: segreto usato per hashare i token di sessione
- `ADMIN_SESSION_HOURS`: durata sessione admin
- `ADMIN_ALLOWED_ORIGIN`: origin ammessa per le mutazioni CORS

## Avvio locale

### Prerequisiti

- Node.js 20+
- npm

### 1. Installazione dipendenze

```bash
npm install
```

### 2. Configurazione ambiente

```bash
cp .env.example .env
```

Compilare `.env` con le variabili Vite corrette.

### 3. Avvio sviluppo

```bash
npm run dev
```

Di default Vite espone il progetto in locale. Le due entrypoint da usare sono:

- sito pubblico: `http://localhost:5173/index.html`
- area admin: `http://localhost:5173/admin.html`

### 4. Requisiti per un avvio davvero completo

Per una esperienza completa servono anche:

- progetto Supabase attivo;
- Edge Function `admin-api` deployata;
- tabelle `admin_users` e `admin_sessions` create;
- almeno un utente staff inserito;
- schema relazionale gia presente, se si vuole usare il bootstrap v3.

Se queste parti non sono disponibili:

- il pubblico continuera a funzionare con dati locali/default;
- il login admin e il salvataggio remoto non saranno disponibili.

## Build, preview e deploy

### Build produzione

```bash
npm run build
```

Output in:

- `dist/`

Vite costruisce entrambe le pagine:

- `dist/index.html`
- `dist/admin.html`

### Preview locale buildata

```bash
npm run preview
```

### Deploy

Il progetto include `netlify.toml` con:

- comando build: `npm run build`
- publish directory: `dist`
- Node version: `20`

Questo lo rende adatto a deploy statico su Netlify o piattaforme equivalenti.

## Testing e qualita

Script disponibili:

```bash
npm run test
npm run test:watch
npm run test:ui
npm run lint
npm run format
```

Copertura attuale dei test:

- normalizzazione team e gironi;
- compatibilita schema;
- calcolo classifica;
- derivazione match del giorno e ticker;
- validazione sessione admin.

## Crediti

Made with ❤️ by Pasquale Ercolino, Emanuele Iovane e Matteo Ercolino.
