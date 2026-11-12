# Bruksanvisning til eier (alt gjøres fra iPhone)

Sist oppdatert 2026-11-12. Punkter merket _ikke verifisert_ har jeg ikke kunnet prøve selv.

## 1. Test appen i Expo Go (gjør dette først)

1. Be Claude om «siste Expo-adresse». Du får en lenke som starter med `exp://u.expo.dev/…`.
2. Åpne lenken i **Safari** (lim inn i adressefeltet) og velg **Åpne i Expo Go**.
3. Gå gjennom hele appen og skriv ned alt som er rart. Bruk sjekklisten under.
4. Send meg funnene som korte punkter, gjerne med skjermbilde (hold inne sideknapp + volum opp).

### Sjekkliste

- **Oppskrifter:** lim inn en lenke til en oppskrift. Ta bilde av en oppskrift. Skriv en manuelt. Sjekk at bilde, ingredienser og steg er riktige.
- **Oppskriftsside:** endre porsjoner, favoritt, stjerner, notat, «Merk som laget», kokemodus med tidtaker.
- **Middagsplan:** planlegg en middag. Se at den kommer i iPhone-kalenderen med ingredienser. Bytt mellom liste og måned.
- **Handleliste:** legg alle ingredienser fra en oppskrift. Legg samme oppskrift to ganger (mengdene skal dobles). Sveip høyre/venstre. Kryss av. «Tøm handleliste».
- **Lager:** lag et eget lager, legg inn varer (med og uten dato), skann en strekkode.
- **Forslag:** skriv inn noen varer, se om oppskrifter som passer kommer opp.
- **Innstillinger:** voksne/barn, varsler (av som standard), basisvarer, **Sikkerhetskopi**, **Nylig slettet**, **Om appen**.
- **Uten tilgang:** nei til kamera/kalender/varsler. Appen skal fortsatt fungere og forklare hvordan du slår det på.
- **Uten nett:** skru på flymodus. Oppskrifter, plan og handleliste skal fungere. Import og strekkode gir en tydelig melding.

## 2. Opprett e-posten

Opprett `panful@tande-gulbrandsen.no` hos den som driver domenet `tande-gulbrandsen.no` (typisk som alias til en eksisterende innboks). Adressen står i appen og på støttesiden, så den må finnes. Send deg selv en testmelding.

## 3. Sjekk navnet Panful

1. Åpne `panful.com` i Safari. Er det et selskap som driver med mat, matlevering eller apper? Si fra hvis ja.
2. Søk på «Panful» på **search.patentstyret.no** (varemerker) og **euipo.europa.eu → eSearch plus**. Se etter treff innen programvare og mat.
3. Skriv ned hva du fant, så vurderer vi.

## 4. Apple Developer-konto (blokkerer TestFlight og App Store)

- Pris: 99 dollar per år. Det er ikke gratis.
- Du trenger en Apple-ID med tofaktor og betalingskort.
- Enkeltperson går raskest. Skal appen eies av et firma, trengs organisasjonskonto med D-U-N-S-nummer (tar lengre tid).
- Fremgangsmåte (_ikke verifisert i detalj_): last ned appen **Apple Developer** fra App Store, logg inn, velg **Account** → **Enroll**, og følg stegene. Godkjenning kan ta fra noen timer til noen dager.
- Når den er godkjent: si fra, så setter vi opp App Store Connect og første TestFlight-bygg. Jeg sier da nøyaktig hva du skal trykke.

## 5. Valg som venter på deg

- Første versjon **uten** innlogging og familiedeling (anbefalt)?
- Prismodell: gratis, engangskjøp eller abonnement?
- Skal vi legge sidene på eget domene senere? (ikke nødvendig nå)

## 6. Apple-nøkkel og første TestFlight-bygg (gjør dette etter at Apple-kontoen er godkjent)

Alt gjøres i Safari på iPhone. Be om «desktop-versjon av nettstedet» (trykk på «aA» i adressefeltet) hvis en side ser trang ut.

**A. Finn Team ID og kontotype**

1. Gå til developer.apple.com → logg inn → **Account** → **Membership details**.
2. Skriv ned **Team ID** (10 tegn) og om kontoen er **Individual** eller **Organization**.

**B. Lag en API-nøkkel**

1. Gå til appstoreconnect.apple.com → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys**.
2. Trykk **+** (eller «Generate API Key»). Navn: `GitHub Panful`. Tilgang: **Admin** (_ikke verifisert at «App Manager» holder_).
3. **Last ned nøkkelfilen (.p8) med en gang.** Den kan bare lastes ned én gang. Lagre den i Filer-appen.
4. Skriv ned **Key ID** og **Issuer ID** (står øverst på siden).

**C. Legg dem inn i GitHub (som hemmeligheter, aldri i chat)**

1. github.com/mtgulb/App → **Settings** → **Environments** → **production** (opprett hvis den ikke finnes).
2. Slå på **Required reviewers** og velg deg selv. Da kan ingen produksjonsbygg starte uten at du godkjenner.
3. Under **Environment secrets**, legg til fire secrets:
   - `ASC_KEY_P8`: åpne .p8-filen i Filer, kopier **hele** innholdet (inkludert linjene `-----BEGIN PRIVATE KEY-----` og `-----END PRIVATE KEY-----`).
   - `ASC_KEY_ID`: Key ID.
   - `ASC_ISSUER_ID`: Issuer ID.
   - `APPLE_TEAM_ID`: Team ID.
4. Under **Environment variables**, legg til `APPLE_TEAM_TYPE` = `INDIVIDUAL` (enkeltperson) eller `COMPANY_OR_ORGANIZATION`.

**D. Si fra til Claude.** Skriv «Apple-nøkkelen er lagt inn», så starter jeg første bygg og sier hva som skjer videre. Du får aldri sende selve nøkkelen i chat.

**E. App-oppføring i App Store Connect** (etter at første bygg har registrert bundle ID-en):
App Store Connect → **Apple Apps** → **+** → **New App**: plattform iOS, navn **Panful**, språk **Norwegian (Bokmål)**, bundle ID `no.tande-gulbrandsen.panful`, SKU `panful-1`.

## 7. Engangsoppsett av Apple-sertifikater (må gjøres interaktivt én gang)

Første automatiske bygg stoppet med «Credentials are not set up». Sertifikatene settes opp med ett interaktivt kall. Det gjøres på PC i nettleseren, uten å installere noe:

1. Gå til github.com/mtgulb/App → grønn **Code**-knapp → fanen **Codespaces** → **Create codespace on main**. Vent til en kodeeditor åpner (1–2 minutter).
2. Åpne terminalen nederst (meny ☰ → Terminal → New Terminal).
3. Kjør disse én og én:
   - `npm ci`
   - `npx eas-cli login` (Expo-brukernavn og passord)
   - `npx eas-cli build --platform ios --profile production`
4. Svar på spørsmålene:
   - «Do you want to log in to your Apple account?» → **Yes**. Skriv Apple-ID og passord, og tofaktorkoden. Dette skrives bare i terminalen, aldri i chat.
   - Hvis den spør om team: velg Team ID `7SW398GGKL`.
   - «Generate a new Apple Distribution Certificate?» → **Yes**. «Generate a new Apple Provisioning Profile?» → **Yes**. Bundle-ID-en `no.tande-gulbrandsen.panful` registreres automatisk.
5. Når den begynner å bygge (viser en lenke til expo.dev), er oppsettet ferdig. Du kan avbryte med **Ctrl+C**, eller la bygget gå. Sertifikatene ligger nå hos Expo.
6. Slett codespacet: github.com/codespaces → «⋯» → Delete.
7. Skriv til Claude: «Sertifikater er satt opp».
