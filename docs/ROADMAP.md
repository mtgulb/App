# Roadmap

## Ferdig (kode skrevet og testet lokalt; ikke prøvd på fysisk iPhone der det ikke er sagt)

- Grunnmur: Expo + TS + Router, lint/format/typer/tester, CI som port, EAS Update til preview
- Oppskrifter: import (lenke med reserver, lim inn/skann tekst, bilde, manuelt), strukturerte ingredienser, favoritter, tid, tagger, vurdering, notater, filter og sortering, «laget sist»
- Middagsplan (liste/kalender) med kalenderhendelser og ingredienser, porsjoner per dag, voksne/barn
- Handleliste: sammenslåing, datoperiode, «legg alle ingredienser», sortering etter avdeling med egne butikker, sveip, redigering
- Lager i egne lager med valgfri dato; Forslag (midlertidig økt); synonymer og sammensatte ord i matching
- Kokemodus med tidtakere; strekkodeskanning (Open Food Facts + lært lokalt)
- Valgfrie varsler (kvelden før, samme dag, utløp, tidtakere) med egne klokkeslett
- Familiedeling forberedt (avslått): database + RLS testet, synkmotor, kontosletting
- Dokumentasjon: Apple-gjennomgang, personvern (utkast), sikkerhet, lanseringssjekkliste

## Blokkert på eier (se `docs/LANSERING.md` §3)

- Apple Developer-konto, bundle ID, appnavn, personvern-URL, kontaktinfo
- Test på fysisk iPhone, TestFlight
- Skjermbilder, App Store-tekster, aldersgrense, privacy-svar, EU-trader-status

## Neste

1. Test alt på iPhone (Expo Go nå, TestFlight senere) og rett funn
2. Backup/eksport og «angre/papirkurv»
3. Førstegangsveiledning
4. Familiedeling: Supabase-oppsett (`docs/SUPABASE.md`), Keychain for økt, test mot ekte server, separate miljøer
5. Deling fra Safari (delingsutvidelse, `docs/DELING.md`), widget, tekstgjenkjenning fra bilde — krever ekte bygg
6. Vurder: gratis nettsøk etter oppskrifter, forslag til ukeplan, allergier per medlem

## Beslutninger som venter

- v1 uten innlogging (anbefalt, `docs/APPLE.md` §2) eller med familiedeling
- Prismodell (gratis / engangskjøp / abonnement)
- Nettsøk etter oppskrifter (ingen gratis, pålitelig API funnet)
