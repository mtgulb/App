# Familiedeling med Supabase

Status: **ferdig forberedt, men skrudd av** til du setter opp prosjektet. Uten oppsett fungerer appen som før.

Databaseskjemaet og tilgangsreglene er testet (`npm test`, filen `tests/rls.test.ts`). **Synkkoden i appen er ikke prøvd mot en ekte server ennå** – regn med å finne og rette feil første gang.

## Oppsett (alt kan gjøres i Safari på iPhone)

1. **Supabase-prosjekt:** `supabase.com` → Sign up → _New project_. Velg gratis plan, region nær Norge (Stockholm eller Frankfurt) og et **databasepassord du lagrer** (brukes i steg 4).
2. **Slå av e-postbekreftelse:** _Authentication → Sign In / Providers → Email → Confirm email_ av. (Ellers må hver bruker bekrefte via e-post, og gratis e-posttjeneste har lav grense.)
3. **Token:** `supabase.com/dashboard/account/tokens` → _Generate new token_. Kopier den.
4. **GitHub-secrets** (`github.com/mtgulb/App` → Settings → Secrets and variables → Actions → _New repository secret_):
   - `SUPABASE_ACCESS_TOKEN` – tokenet fra steg 3
   - `SUPABASE_DB_PASSWORD` – passordet fra steg 1
   - `SUPABASE_PROJECT_REF` – teksten `xxxx` i `https://xxxx.supabase.co` (fra _Project Settings → API_)
5. **GitHub-variabler** (samme side, fanen _Variables_ – disse er offentlige, ikke hemmelige):
   - `SUPABASE_URL` – _Project URL_
   - `SUPABASE_ANON_KEY` – _anon public key_
     **Aldri** `service_role`-nøkkelen.
6. **Opprett databasen:** Actions → _Supabase – kjør databaseendringer_ → Run workflow. Kjør først med «dry_run» på, deretter av.
7. **Publiser appen på nytt** (Actions → _Publiser til Expo Go_ → Run workflow). Da får appen nøklene, og personikonet øverst på Oppskrifter-siden åpner Familie.

## Slik fungerer det

- Logg inn med e-post og passord, opprett en husholdning, og del den 10-tegns koden. De andre velger «Bli med».
- Oppskrifter, middagsplan, handleliste og kjøleskap deles. Bilder lagres privat per husholdning.
- Endringer sendes etter ca. 1 sekund og vises hos de andre i sanntid. Uten nett lagres alt lokalt og sendes senere.
- Sist skrevet vinner per rad (én vare, én oppskrift). To som krysser av ulike varer samtidig, overskriver ikke hverandre.
- Kalenderhendelser er personlige: hver legger middagen i sin egen kalender.
- Når du blir med i en husholdning, slås dine eksisterende data sammen med de som finnes.
- Forlater du husholdningen, beholder du din egen kopi.

## Sikkerhet

- Appen inneholder bare URL og anon-nøkkel. All tilgang håndheves av radnivå-sikkerhet i databasen.
- Test dekker blant annet: utenforstående ser ingenting, ikke-innloggede har ingen tilgang, ingen kan slette rader direkte, klienten kan ikke forfalske hvem som endret, bare eier kan bytte kode, og gjetting av koder stenges etter 10 forsøk i timen.
- Invitasjonskoden gir full tilgang til husholdningen. Bytt den hvis den kommer på avveie.

## Begrensninger

- Én husholdning per bruker.
- Gratisplanen på Supabase pauses ved lang inaktivitet.
- Ingen innlogging med Apple/Google ennå (krever eget bygg).
- Passord kan ikke tilbakestilles fra appen ennå.
