# Alt som gjenstår før publisering i App Store

Samlet 12. november 2026. Dette er den ene listen vi jobber ned. Detaljer og kilder: `docs/APPLE.md`, `docs/LANSERING.md`, `docs/SIKKERHET.md`, `docs/PERSONVERN.md`, `docs/SUPABASE.md`.
Ansvar: **[Eier]** kun du kan gjøre det · **[Claude]** jeg kan gjøre det nå · **[Begge]** vi må samarbeide.
Prioritet: 🔴 blokkerer innsending · 🟠 bør være på plass før publisering · 🟢 kan vente til etter første versjon.

## A. Beslutninger (styrer resten)

- [ ] 🔴 **[Eier]** **v1 med eller uten innlogging/familiedeling?** _Anbefaling: uten._ Det fjerner kontosletting, demokonto, e-postbekreftelse, Supabase-drift og mye personvernarbeid fra første innsending. Familiedeling kommer i 1.1.
- [ ] 🔴 **[Eier]** **Appnavn.** Må være ledig i App Store (2–30 tegn). «Oppskrifter» er trolig opptatt. Gi 3 forslag, så sjekker vi tilgjengelighet i App Store Connect.
- [ ] 🔴 **[Eier]** **Endelig bundle ID**, f.eks. `no.dittnavn.appnavn`. Kan ikke endres etter publisering.
- [ ] 🔴 **[Eier]** **Prismodell.** v1 forutsettes gratis uten kjøp. (Betalt senere = kjøp i appen via Apple.)
- [ ] 🔴 **[Eier]** **Distribusjon i EU?** Som enkeltperson må du oppgi adresse og telefon som vises offentlig (DSA-«trader»), eller ikke tilby appen i EU.
- [ ] 🟠 **[Eier]** Godkjenne ikon og farger (nåværende ikon er et enkelt generert utkast).

## B. Kontoer og tilganger

- [ ] 🔴 **[Eier]** **Apple Developer Program** (99 USD/år): opprett som enkeltperson med eget juridisk navn, to-faktor på, og vent på verifisering (ventetid ukjent).
- [ ] 🔴 **[Eier]** Opprett appoppføring i **App Store Connect** (navn + bundle ID).
- [ ] 🔴 **[Begge]** **App Store Connect API-nøkkel** for innsending fra GitHub (lages i nettleser; jeg legger den inn som secret, og kjører første bygg).
- [x] Expo-konto og `EXPO_TOKEN` finnes.
- [ ] 🟠 **[Eier]** Legg «Required reviewers» på GitHub-miljøet `production` (Settings → Environments).
- [ ] 🟠 **[Begge]** Slå sammen arbeidsgrenen til `main` (production kan bare bygges/publiseres fra main).

## C. Kontaktinfo og rettslig

- [ ] 🔴 **[Eier]** Kontakt-e-post (foreløpig `panful@tande-gulbrandsen.no`) og **support-URL** (påkrevd i metadata; mangler fortsatt).
- [ ] 🔴 **[Begge]** **Personvernerklæring på en offentlig URL.** Utkast finnes i `docs/PERSONVERN.md`. Du gir kontaktinfo og godkjenner; jeg setter den opp som en enkel nettside (f.eks. GitHub Pages, krever at repoet er offentlig eller betalt plan) og legger **lenke i appen**.
- [x] 🟠 **[Claude]** «Om appen»-skjerm med kilder og lisenser (Open Food Facts krever kreditering), versjon og personvernlenke.
- [ ] 🟠 **[Eier]** Vurdere enkle brukervilkår (valgfritt).
- [ ] 🔴 **[Eier]** Besvare Content Rights (appen viser importerte oppskrifter med kilde og lenke).

## D. Test på fysisk iPhone (hele matrisen i `docs/LANSERING.md`)

- [ ] 🔴 **[Eier]** Gå gjennom alle funksjoner i Expo Go nå, og meld fra om feil. Mye kode er aldri sett på en telefon.
- [ ] 🔴 **[Eier]** Test uten internett, med avslått kamera/bilder/kalender/varsler, og med ugyldige oppskriftslenker.
- [ ] 🔴 **[Begge]** Første **TestFlight-bygg** (krever konto, bundle ID og API-nøkkel). Tekstgjenkjenning fra bilde og andre native deler testes først da.
- [ ] 🔴 **[Eier]** Minst to personer tester i TestFlight i noen dager. Ingen krasj.
- [ ] 🟠 **[Claude]** Rette alt som kommer ut av testene.
- [ ] 🟠 **[Claude]** Gå systematisk gjennom tilgjengelighet: VoiceOver-etiketter, stor tekst, kontrast, mørk modus. (Gjort stikkprøvevis, ikke systematisk.)
- [ ] 🟠 **[Claude]** Test med mange oppskrifter (ytelse), og rydde bort ubrukte bilder.

## E. Teknisk før innsending

- [ ] 🔴 **[Claude]** Bekrefte i byggloggen at **Xcode 26 / iOS 26 SDK** brukes (krav fra 28.04.2026); sett `image` i `eas.json` hvis ikke.
- [ ] 🔴 **[Claude]** Sjekke at **tillatelsestekstene** og **personvernmanifestet** kommer riktig ut i bygget, og rette ved Apples opplastingsvarsler.
- [ ] 🔴 **[Claude]** Sette versjon `1.0.0` og byggnummer, og kjøre `npm run check` og siste CI grønn.
- [ ] 🔴 **[Claude]** Siste søk etter utviklertekst, døde lenker og placeholder i appen.
- [ ] 🟠 **[Claude]** Verifisere iOS-minimumsversjon i bygget.
- [ ] 🟠 **[Claude]** Oppdatere avhengigheter med kjente sårbarheter (`npm audit`: 3 moderate i Expos verktøykjede) når Expo tilbyr oppdatering.
- [ ] 🟠 **[Claude]** Feilhåndtering: gå gjennom alle nettverkskall for tidsavbrudd og tydelige meldinger.

## F. Produktgap jeg anbefaler å lukke før publisering

- [x] 🟠 **[Claude]** **Backup og eksport/import** (gjort via del-meny og utklippstavle; bilder tatt på telefonen følger ikke med; ikke prøvd på telefon) (i dag finnes alt bare på telefonen; slettes appen, er det borte).
- [x] 🟠 **[Claude]** **Nylig slettet** for oppskrifter (30 dager, Innstillinger → Nylig slettet). Lister har fortsatt «Angre» der det finnes. Ikke prøvd på telefon.
- [ ] 🟠 **[Claude]** **Førstegangsveiledning** (i dag møter nye brukere tomme skjermer).
- [ ] 🟠 **[Claude]** **Strekkodedatabase**: avgjøres av dekningstest (se strekkoderapporten), evt. flere kilder.
- [ ] 🟢 **[Claude]** Deling fra Safari til appen (krever ekte bygg), widget, tekstgjenkjenning fra bilde (krever ekte bygg).
- [ ] 🟢 Foreslå ukeplan, allergier per medlem, avstemning i familien.

## G. App Store Connect-metadata (jeg lager utkast, du godkjenner)

- [ ] 🔴 Undertittel (≤30 tegn), beskrivelse, nøkkelord, «hva er nytt», kategori (Mat og drikke), copyright.
- [ ] 🔴 **Skjermbilder** fra ekte iPhone (6,9"-klasse), minst ett sett. Tas fra TestFlight-bygget.
- [ ] 🔴 **Aldersgrense** (Apples nye spørreskjema).
- [ ] 🔴 **Personvernsvar** («næringsdeklarasjon») i tråd med `docs/APPLE.md` §4.
- [ ] 🔴 Eksportkontroll (kryptering): kun standard HTTPS.
- [ ] 🔴 **Notes for Review** og kontaktinfo for review. Demokonto kun hvis innlogging er med.
- [ ] 🟠 Utgivelsesmetode: **manuell** (så ingenting går live uten din godkjenning).
- [ ] 🟠 Pris: gratis. Land/regioner.

## H. Bare hvis v1 har familiedeling

- [ ] 🔴 **[Begge]** To Supabase-prosjekter (test og produksjon), kjør migreringene via GitHub, variabler per miljø.
- [ ] 🔴 **[Claude]** Teste synkkoden mot ekte server og rette feil (aldri prøvd).
- [ ] 🔴 **[Claude]** Teste **kontosletting** mot ekte server.
- [ ] 🔴 **[Claude]** Flytte innloggingsøkta til **Keychain** (`docs/SIKKERHET.md` punkt 1).
- [ ] 🔴 **[Begge]** E-postbekreftelse og e-posttjeneste (Supabase sin innebygde har lav grense), demokonto til Apple, oppdatert personvernerklæring.
- [ ] 🟠 Passord-tilbakestilling i appen.

## I. Innsending og lansering

- [ ] 🔴 **[Eier]** Godkjenne alt over eksplisitt (skriv «PUBLISER»).
- [ ] 🔴 **[Begge]** Bygg `production` fra main, send til TestFlight/App Store Connect, legg ved metadata, send til gjennomgang.
- [ ] 🔴 **[Begge]** Rette eventuelle avvisninger (vanlige årsaker i `docs/APPLE.md` §3).
- [ ] 🟠 **[Eier]** Etter godkjenning: frigi manuelt, og følg med på tilbakemeldinger.

## Hva jeg kan starte på med en gang (ingen konto nødvendig)

Backup/eksport og angre, førstegangsveiledning, «Om appen» med kilder, tilgjengelighetsgjennomgang, strekkodeforbedringer, ytelsestest, feilhåndteringsgjennomgang, og utkast til alle App Store-tekster.

- [ ] 🔴 **[Eier]** Navn **Panful** valgt. Sjekk: Patentstyret + EUIPO (klasse 9/42), hva som ligger på panful.com, reserver navnet i App Store Connect, opprett `panful@tande-gulbrandsen.no`, velg bundle ID (forslag `no.tande-gulbrandsen.panful`).
