# Sikkerhetsgjennomgang

Gjennomført 12. november 2026 av utvikler (Claude Code). Ikke en uavhengig revisjon.

## Prinsipper

- Alt som sendes til appen kan leses av brukeren. Appen inneholder derfor **kun offentlige verdier** (`EXPO_PUBLIC_*`): Supabase-URL og anon-nøkkel. `service_role` og andre hemmeligheter skal aldri inn i appen eller git.
- All tilgang håndheves **på serveren** med radnivå-sikkerhet (RLS). Appen stoler ikke på klientsjekker.
- Hemmeligheter (Expo-token, Supabase-token, databasepassord) ligger i GitHub-secrets, aldri i filer.

## Gjennomgått

| Område                                        | Resultat                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hemmeligheter i filer og git-historikk        | Skannet etter nøkler, tokens, sertifikater og passord. **Ingen funnet.** Eneste sporede miljøfil er `.env.example` (kun kommentarer).                                                                                                                                                                                   |
| Tilgang til andres data                       | `tests/rls.test.ts` kjører skjemaet i en lokal Postgres og prøver å bryte reglene som tre ulike brukere og som uinnlogget. Utenforstående ser og skriver ingenting, anonyme har ingen tilgang, ingen kan slette rader direkte, klienten kan ikke forfalske «endret av», bare eier kan bytte invitasjonskode eller navn. |
| Gjetting av invitasjonskoder                  | Kode med 40 tilfeldige biter. Maks 10 forsøk per time per bruker (testet). Funn under testing: forsøk ble rullet tilbake ved feil, så begrensningen virket ikke. **Rettet.**                                                                                                                                            |
| Direkte skriving til husholdninger/medlemskap | Ikke mulig. Kun via funksjoner som sjekker innlogget bruker.                                                                                                                                                                                                                                                            |
| Kontosletting                                 | `delete_my_account()` testet. Funn: «endret av» ble skrevet tilbake av triggeren. **Rettet.**                                                                                                                                                                                                                           |
| Bilder                                        | Privat lagring, én mappe per husholdning, med regler testet.                                                                                                                                                                                                                                                            |
| Ødelagte eller uventede data fra server       | Rader valideres før de brukes (`isRecipeData`, `isPlanData`); ugyldige hoppes over.                                                                                                                                                                                                                                     |
| Import fra vilkårlige nettsider               | Sidestørrelse begrenset til 3 MB. Kun `http(s)`. Ingen kjøring av innhold fra siden, kun lesing av tekst og JSON.                                                                                                                                                                                                       |
| Dypkobling `oppskrifter://import?url=…`       | Kan utløse import av en lenke fra en annen app. Importen er skrivebeskyttet mot nettsiden og lagrer bare en oppskrift lokalt. Lav risiko.                                                                                                                                                                               |
| GitHub Actions                                | Bekreftelsesfelt sendes via miljøvariabel (ikke inn i skallkommando). Production krever skrevet bekreftelse, main-gren og godkjenning i miljøet «production».                                                                                                                                                           |
| `npm audit`                                   | 3 moderate funn i `minimatch` via Expos verktøykjede (`@expo/fingerprint`). Gjelder byggverktøy, ikke koden som kjører i appen. Løses ved oppgradering av Expo.                                                                                                                                                         |

## Kjente svakheter og anbefalte tiltak før familiedeling slås på

1. **Innloggingsøkta lagres i app-lagringen (SQLite), ikke i iOS Keychain.** Anbefalt: flytt til `expo-secure-store` (med oppdeling i biter, siden økta er større enn grensen på 2 KB). _Ikke gjort._
2. **Separate miljøer.** Opprett to Supabase-prosjekter (test og produksjon) og legg `SUPABASE_URL`/`SUPABASE_ANON_KEY` som variabler per GitHub-miljø (`preview`, `production`). _Beskrevet i `docs/SUPABASE.md`, ikke opprettet._
3. **Sletting av bilder** i fillagringen når oppskrifter slettes lokalt/eksternt er ikke implementert. (Plass, ikke sikkerhet.)
4. **Synkkoden er ikke prøvd mot en ekte server.** Regn med feil første gang.
5. **E-postbekreftelse** er av i oppsettet for enkel testing. Vurder på for produksjon, med egen e-posttjeneste (Supabase sin innebygde har lav grense).
6. **Eksplisitt penetrasjonstest** er ikke gjort.
