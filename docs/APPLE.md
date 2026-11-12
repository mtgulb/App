# App Store: krav, avvisningsrisikoer og status

Sist gjennomgått 12. november 2026. Kilder: Apples egne sider (lenker nederst), lest av en researcher uten full nettilgang.
**Merking:** `[verifisert]` = lest på Apples side. `[ikke verifisert]` = trolig riktig, men ikke bekreftet fra primærkilde – sjekk i App Store Connect før innsending.
Å bruke React Native/Expo gir **ikke** automatisk godkjenning. Appen vurderes etter de samme reglene som alle andre.

## 1. Det som blokkerer innsending nå (krever deg)

| #   | Hva                                                                                                                                    | Hvorfor                                                    | Status                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| 1   | **Apple Developer Program** (99 USD/år)                                                                                                | Uten dette finnes ingen TestFlight/App Store. [verifisert] | Ikke opprettet                                            |
| 2   | **Endelig bundle ID** (nå `no.tande-gulbrandsen.panful`, ikke registrert)                                                              | Kan ikke endres etter publisering                          | Må velges av deg                                          |
| 3   | **Unikt appnavn** (nå «Oppskrifter», trolig opptatt; 2–30 tegn [verifisert])                                                           | Navn må være ledig i App Store                             | Må velges av deg                                          |
| 4   | **Kontaktinfo og support-URL**                                                                                                         | Regel 1.5, og påkrevd i metadata [verifisert]              | Mangler                                                   |
| 5   | **Personvernerklæring på en offentlig URL**                                                                                            | Påkrevd i metadata og i appen (5.1.1(i)) [verifisert]      | Utkast i `docs/PERSONVERN.md`, mangler kontakt og hosting |
| 6   | **Skjermbilder** fra en ekte iPhone (6,9"-klasse: 1179×2556 eller 1206×2622) [verifisert]                                              | Påkrevd                                                    | Må tas fra TestFlight-bygg                                |
| 7   | **EU DSA-«trader»-status** for enkeltpersoner som distribuerer i EU (adresse og telefon vises offentlig) [verifisert at kravet finnes] | Uten dette fjernes appen fra EU App Store                  | Du må velge: oppgi eller ikke distribuere i EU            |
| 8   | **Test på fysisk iPhone**                                                                                                              | Se `docs/LANSERING.md`                                     | Ikke gjort                                                |

## 2. Anbefaling som reduserer risikoen mest: v1 uten innlogging

Familiedeling krever konto, og dermed **kontosletting i appen (5.1.1(v))**, demokonto til reviewer, personvernopplysninger om e-post og bruker-ID, og en serverdel som må drives. Uten Supabase-nøklene i bygget er alt dette **av** (appen viser ingenting om det).
Forslag: send v1 uten familiedeling, og slå den på i v1.1 når alt er testet mot en ekte server. Kontosletting er likevel bygget og testet (se under).

## 3. Avvisningsrisikoer og tiltak

| Risiko                                                                         | Regel                                                      | Tiltak / status                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Krasj, ufullstendig app, placeholder-tekst, døde lenker                        | 2.1(a) [verifisert]                                        | Utviklertekst («Expo Go», «Supabase», «kommer senere») er fjernet fra appen. **Må bekreftes på fysisk iPhone.**                                                                                                                                        |
| Konto kan opprettes, men ikke slettes i appen                                  | 5.1.1(v) [verifisert]                                      | `delete_my_account()` i databasen (testet mot lokal Postgres) + knappen «Slett kontoen min». Sletter innlogging, medlemskap og «endret av». Er andre med i husholdningen, beholder de delte oppskrifter. **Ikke prøvd mot ekte server.**               |
| Mangler personvernerklæring                                                    | 5.1.1(i) [verifisert]                                      | Utkast skrevet. Må ha kontakt og URL.                                                                                                                                                                                                                  |
| Mangler demokonto/review-notater                                               | 2.1, 2.3.1(a) [delvis verifisert]                          | Mal under. Unngås helt hvis v1 har ingen innlogging.                                                                                                                                                                                                   |
| Uklare tillatelsestekster                                                      | 5.1.1 [ikke verifisert ordlyd]                             | Kamera, bilder og kalender har egne, konkrete tekster. Varsler spørres kontekstuelt og er valgfrie.                                                                                                                                                    |
| Krever tillatelser for å fungere                                               | 5.1.2(i) [verifisert]                                      | Alt fungerer uten varsler, kamera og kalender.                                                                                                                                                                                                         |
| Import fra nettsider oppfattes som opphavsrettsbrudd eller «samling av lenker» | 5.2.1, 4.2.2 [verifisert regelteksten; vurderingen er min] | Kun bruker-initiert import. Kildelenke lagres og vises («Åpne original»). Ingen innhold følger med appen. Planlegger, kalender, handleliste, lager og tidtakere gjør appen klart mer enn en lenkesamling. Content Rights-erklæring må besvares riktig. |
| Metadata, personvernsvar eller aldersgrense stemmer ikke med appen             | 2.3                                                        | Gå gjennom `docs/LANSERING.md` punkt «App Store Connect». Aldersvurdering bruker Apples nye spørreskjema [verifisert].                                                                                                                                 |
| Bygget med for gammel Xcode/SDK                                                | Krav fra 28.04.2026: Xcode 26+ og iOS 26 SDK [verifisert]  | **Sjekk i EAS-byggloggen** at bildet bruker Xcode 26 eller nyere. Sett `image` i `eas.json` om nødvendig.                                                                                                                                              |
| Personvernmanifest/«required reason APIs»                                      | Krav fra 01.05.2024 [verifisert]                           | `ios.privacyManifests` satt for File timestamp (C617.1), UserDefaults (CA92.1), System boot time (35F9.1), Disk space (E174.1). **Ikke verifisert**; Apple varsler per e-post hvis noe mangler ved opplasting.                                         |
| Eksportkontroll (kryptering)                                                   | [ikke verifisert]                                          | `ITSAppUsesNonExemptEncryption = false` (bare standard HTTPS).                                                                                                                                                                                         |
| Tracking                                                                       | ATT kun ved sporing på tvers [verifisert]                  | Appen sporer ikke. Ingen reklame, ingen analyseverktøy.                                                                                                                                                                                                |
| Betaling                                                                       | 3.1.1/3.1.2 [verifisert]                                   | v1 er gratis uten kjøp. Betalt funksjonalitet senere må gå via kjøp i appen.                                                                                                                                                                           |
| Innlogging                                                                     | 4.8 [verifisert]                                           | Bare egen e-post/passord, så «Logg inn med Apple» er ikke påkrevd. Legger vi til Google/Facebook senere, blir det påkrevd.                                                                                                                             |
| UGC                                                                            | 1.2 [tolkning]                                             | Deling er privat innen en husholdning, ikke offentlig. Sannsynligvis ikke UGC-plattform, men ikke bekreftet.                                                                                                                                           |

## 4. App Privacy («næringsdeklarasjon») – utkast

Uten innlogging: **ingen data samles inn av oss.** Alt lagres på enheten.
Med innlogging (familiedeling): e-post, bruker-ID og brukerinnhold (oppskrifter, plan, handleliste, lager, bilder) – koblet til brukeren, ikke brukt til sporing. [ikke verifisert; svar riktig i App Store Connect]
Tredjeparter: strekkodenummer sendes til Open Food Facts (ingen kontoinformasjon). Oppskriftssider hentes direkte fra nettsiden brukeren oppgir. Oppdateringer lastes fra Expo (IP-adresse).

## 5. Notes for Review (mal)

> «Oppskrifter» lar brukeren samle oppskrifter (fra lenke, bilde eller manuelt), planlegge middager i kalenderen, lage handleliste, holde oversikt over lager og få forslag. Kamera brukes til å skanne strekkoder og ta bilde av oppskrifter, bildebiblioteket for å legge bilder ved, og kalenderen til å legge inn middager. Alle tillatelser er valgfrie. Varsler er av som standard.
> **Import fra lenke:** hent en oppskrift ved å lime inn en lenke, f.eks. fra en oppskriftsside. Siden vises alltid med kilde og lenke til originalen.
> **Innlogging (kun hvis familiedeling er slått på):** demokonto `[e-post]` / `[passord]`. Kontosletting finnes under Innstillinger → Familie og deling → «Slett kontoen min».

## 6. Teknisk: EAS og Apple

- `eas.json` har kanalene `preview` og `production` og `autoIncrement` for production.
- `runtimeVersion` bruker `fingerprint`: oppdateringer (EAS Update) når bare bygg med samme native innhold. Nye native pakker eller native konfigurasjon gir nytt fingeravtrykk og krever **nytt bygg**.
- Første iOS-bygg krever sertifikater. `--non-interactive` kan ikke sette opp en App Store Connect API-nøkkel selv [ikke verifisert, forumkilde]; veien uten Mac er å opprette en API-nøkkel i App Store Connect og legge den inn via `eas credentials` (kan gjøres fra en nettleser-terminal) eller som `ascApiKey…` i `eas.json`.
- TestFlight: opptil 100 interne testere og 10 000 eksterne. Første bygg til ekstern gruppe går gjennom Beta App Review. Bygg kan testes i 90 dager. [verifisert]

## Kilder

- https://developer.apple.com/news/upcoming-requirements/
- https://developer.apple.com/programs/enroll/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview
