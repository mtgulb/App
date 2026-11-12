# CLAUDE.md

Eier jobber fra iPhone (ingen PC/Mac). Svar på norsk, som til en produkteier. Gjør arbeidet i repoet selv. Forklar blokkeringer presist og foreslå det enkleste gjennomførbare alternativet.

## Appen

Norsk familie-app for oppskrifter og middagsplanlegging (arbeidstittel «Oppskrifter»). Native iOS (Expo/React Native), lokal-først. Funksjoner: import av oppskrift (lenke, bilde/tekst, manuelt), strukturerte ingredienser, middagsplan med kalender (liste/måned), handleliste (sammenslått, avdelinger, egne butikker), lager i egne lager med valgfri utløpsdato, «Forslag» (midlertidig økt), kokemodus med tidtakere, favoritter/tagger/tid/vurdering/notater, strekkodeskanning, valgfrie varsler, voksne/barn → porsjoner, familiedeling (Supabase, **avslått til oppsett**).
Detaljer: `docs/MVP.md`. Status og plan: `docs/ROADMAP.md`.

## Stack

Expo SDK 58 · React Native 0.88 · TypeScript (strict) · Expo Router (`src/app`) · lokal lagring i `expo-sqlite/kv-store` · EAS Build/Submit/Update · GitHub Actions · Supabase (valgfritt, familiedeling).

## Kommandoer

- `npm run check` – typegen + tsc + lint + prettier + alle tester (**må være grønn før commit**)
- `npm test` – `tests/*.test.ts` (ren logikk) og `tests/rls.test.ts` (database + tilgangsregler i PGlite)
- `npx expo export --platform ios` – sjekker at iOS-bundlen bygger
- Denne skymiljøet når IKKE expo.dev/ngrok/mange nettsteder. Bygg og publisering kjøres i GitHub Actions; les resultat med GitHub-verktøyene (jobbloggen viser adressen).

## Arkitektur (`src/`)

- `app/` skjermer (tabs: Oppskrifter, Middagsplan, Handleliste, Lager, Forslag; modaler: recipe/*, settings, family, stores, scan, import)
- `lib/` ren logikk, **testbar uten React Native** (importer med `.ts`-endelse): `ingredients` (mengder, skalering, sammenslåing), `synonyms` + `pantry` (matching: synonymer, sammensatte ord, «lignende»), `departments`, `inventory`, `session`, `durations`, `reminders`, `recipeFilter`, `recipeParser`, `structureText`, `barcodeParse`, `urls`, `portions` (innstillinger)
- `lib/store.ts` lagring (kv-store) + `useStore`; `lib/cloud/` synk (model.ts er ren og testet; sync.ts og client.ts er ikke prøvd mot ekte server)
- `components/` delte UI-deler, `theme/` farger
- `supabase/migrations/` databaseskjema med RLS · `docs/` dokumentasjon

## Pipeline

- `ci.yml` (typesjekk, lint, format, tester) er en **port**: `eas-update.yml` og `eas-build.yml` kjører den først.
- `eas-update.yml`: push → kanal `preview` automatisk. `production` kun manuelt fra `main`, med skrevet **PUBLISER** og godkjenning i GitHub-miljøet `production`.
- `eas-build.yml`: TestFlight/internt. Krever Apple-konto. Production likt beskyttet.
- `runtimeVersion` = `fingerprint`: oppdateringer når bare kompatible bygg; nye native pakker/innstillinger krever nytt bygg.
- Prioritert testmetode uten Mac: **TestFlight-bygg** (når Apple-konto finnes). Til da: Expo Go via `preview`-oppdateringer (funksjoner med egne native moduler, f.eks. tekstgjenkjenning fra bilde, virker ikke der).
- `supabase-migrate.yml`: kjører databaseendringer (kun manuelt).

## Regler

- **Ikke publiser til produksjon eller send til App Store uten eierens uttrykkelige godkjenning.**
- Ingen hemmeligheter i kode/git. Alt som sendes til appen kan leses av brukeren; `EXPO_PUBLIC_*` er offentlig. Aldri `service_role` i appen.
- Ikke påstå at noe er testet/bygget/installert uten faktisk kjøring. Skille tydelig mellom _testet_, _kode skrevet men ikke prøvd på telefon_ og _ikke gjort_.
- Spør før: betalte tjenester, endelig bundle ID, appnavn, publisering, offentlige tekster.
- Tilgangsregler må håndheves på serveren (RLS) og testes (`tests/rls.test.ts`).
- Ny logikk skal ha test. Rene moduler får sin egen testfil.
- Ingen utviklertekst («Expo Go», «Supabase», «kommer senere»), ingen falske knapper eller «demo»-data i appen.
- Hold `CLAUDE.md`, `docs/ROADMAP.md`, `docs/APPLE.md`, `docs/LANSERING.md` oppdatert når noe endres.

## Kjente forhold

- Bundle ID `com.example.minapp` er en PLACEHOLDER (ikke reservert). Navn og ikon er foreløpige.
- Det meste av UI er skrevet uten å være sett på fysisk iPhone. Se `docs/LANSERING.md`.
- Familiedeling: databasen og reglene er testet lokalt; synkkoden er ikke prøvd mot ekte server.
- Strekkoder bruker Open Food Facts; dekningen av norske varer er ukjent og måles i appen (Innstillinger).
- Apple-krav: `docs/APPLE.md` (merket verifisert/ikke verifisert). Personvern: `docs/PERSONVERN.md` (utkast). Sikkerhet: `docs/SIKKERHET.md`.
