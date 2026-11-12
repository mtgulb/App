# Lanseringskontroll

Brukes før hver innsending. **Ingenting publiseres til produksjon uten eierens godkjenning.**
Tegn: ✅ dekket i kode og automatiske tester · 🔶 løst i kode, **ikke prøvd på fysisk iPhone** · ⛔ ikke gjort

## 1. Sentrale funksjoner på fysisk iPhone (alt må avkrysses av eier eller testperson)

| Funksjon                                 | Normal                         | Uten internett                  | Tillatelse avslått                                               | Ugyldige data                                                        | Utløpt økt                       |
| ---------------------------------------- | ------------------------------ | ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| Importer fra lenke                       | 🔶                             | ✅ melding, ingenting lagres    | –                                                                | ✅ side uten oppskrift gir tydelig feil; tekstreserve merkes «sjekk» | –                                |
| Bilder (kamera/bibliotek)                | 🔶                             | –                               | 🔶 melding «mangler tilgang»                                     | –                                                                    | –                                |
| Strekkodeskanning                        | 🔶                             | 🔶 feilmelding, skriv navn selv | 🔶 «Åpne Innstillinger»                                          | ✅ ugyldig sjekksiffer ignoreres                                     | –                                |
| Kalender (middag med ingredienser)       | 🔶                             | –                               | 🔶 melding, «Åpne Innstillinger», «legg bare i planen»           | –                                                                    | –                                |
| Middagsplan, handleliste, lager, forslag | 🔶                             | ✅ helt lokal                   | –                                                                | ✅ lagrede data migreres/valideres                                   | –                                |
| Kokemodus og tidtakere                   | 🔶                             | ✅                              | 🔶 uten varsel: nedtelling i appen + vibrasjon                   | –                                                                    | –                                |
| Varsler (valgfrie)                       | 🔶                             | ✅ lokale                       | 🔶 bryteren slås ikke på uten tillatelse; appen krever dem aldri | ✅ planlegger testet                                                 | –                                |
| Familiedeling (kun hvis slått på)        | ⛔ aldri prøvd mot ekte server | 🔶 jobber lokalt, prøver igjen  | –                                                                | ✅ ødelagte serverrader hoppes over                                  | 🔶 faller tilbake til «logg inn» |
| Kontosletting (kun hvis familiedeling)   | ⛔ aldri prøvd mot ekte server | 🔶 feilmelding                  | –                                                                | –                                                                    | –                                |
| Oppdatering (EAS Update)                 | 🔶                             | 🔶 bruker siste lastede         | –                                                                | –                                                                    | –                                |

## 2. Før innsending

- [ ] Apple Developer-konto, **endelig bundle ID**, **unikt appnavn**, versjon `1.0.0` og byggnummer
- [ ] Bygget med Xcode 26+ / iOS 26 SDK (sjekk byggloggen) · `docs/APPLE.md` §3
- [ ] Ekte ikon godkjent av eier (nåværende er et enkelt generert ikon) og splash
- [ ] Alle tekster i appen gjennomgått: ingen utviklertekst, ingen «demo», ingen døde lenker
- [ ] Testet i TestFlight av minst to personer i noen dager; ingen krasj
- [ ] Personvernerklæring på offentlig URL **og** lenke i appen (Innstillinger) · `docs/PERSONVERN.md`
- [ ] Support-URL og kontaktinfo
- [ ] App Privacy-svar stemmer med `docs/APPLE.md` §4
- [ ] Aldersgrense (Apples nye spørreskjema) besvart riktig
- [ ] Skjermbilder fra ekte iPhone (6,9"), tekster og nøkkelord godkjent av eier
- [ ] Content Rights besvart (importerte oppskrifter vises med kilde og lenke)
- [ ] EU DSA-trader-status avklart
- [ ] Review-notater og eventuell demokonto (`docs/APPLE.md` §5)
- [ ] Hvis familiedeling er med: kontosletting prøvd, e-postbekreftelse og e-posttjeneste avklart, separate miljøer (test/prod), sikkerhetspunkt 1 i `docs/SIKKERHET.md` utbedret
- [ ] `npm run check` grønn, og siste CI-kjøring grønn
- [ ] Eier har eksplisitt godkjent: «PUBLISER»

## 3. Avvik som må rettes før innsending (per 12. november 2026)

1. Apple Developer-konto, bundle ID og appnavn finnes ikke.
2. Personvernerklæring mangler kontaktinfo og offentlig URL. Lenke fra appen mangler.
3. Ikke prøvd på fysisk iPhone: se alle 🔶/⛔ over.
4. Familiedeling er aldri kjørt mot ekte server (databasen og tilgangsreglene er testet lokalt).
5. Innloggingsøkta bør flyttes til Keychain før familiedeling slås på.
6. Skjermbilder, App Store-tekster, aldersgrense og privacy-svar er ikke laget.
7. Ikonet er et enkelt generert utkast.
8. Ikke verifisert: personvernmanifest-detaljer og tillatelsestekstenes ordlyd mot Apples krav.
