# Test appen på iPhone – uten PC

Ingen PC, terminal eller server. GitHub bygger og publiserer appen til Expo, og du åpner den i **Expo Go**.

## Engangsoppsett (alt i Safari på iPhone, ca. 5 min, gratis)

1. **Expo-konto:** gå til `expo.dev` → Sign up.
2. **Token:** `expo.dev/settings/access-tokens` → Create token → kopier den.
3. **GitHub-secret:** `github.com/mtgulb/App` → Settings → Secrets and variables → Actions → New repository secret. Navn: `EXPO_TOKEN`, verdi: token fra steg 2.
4. Installer **Expo Go** fra App Store.

(Aldri send tokenet i chat – bare lim det inn i GitHub-secret.)

## Kanaler

- `preview`: publiseres automatisk ved hver endring (etter at CI er grønn). Brukes i Expo Go nå, og av TestFlight-bygg på preview-kanalen senere.
- `production`: aldri automatisk. Krever manuell start fra `main`, skrevet **PUBLISER** og godkjenning i GitHub-miljøet `production`.

## Hver gang du vil teste

Appen publiseres automatisk ved hver endring (GitHub → Actions → «Publiser til Expo Go»).
Åpne den siste kjøringen → **Summary** → kopier `exp://…`-adressen → lim inn i Safari → **Åpne i Expo Go**.

## Begrensninger

- Expo Go viser alt unntatt **automatisk tekstlesing fra bilde** (krever eget bygg, se under).
- Ikke verifisert ennå: at Expo Go i App Store åpner SDK 58-prosjektet, og at publiseringsflyten går gjennom (skymiljøet når ikke Expo).

## Praktisk testmetode uten Mac: TestFlight (anbefalt så snart Apple-kontoen finnes)

De fleste funksjoner (tekstgjenkjenning fra bilde, deling fra Safari, widgets) virker bare i et ekte bygg. Se `docs/LANSERING.md`.

## Detaljer om TestFlight (ekte app, inkl. tekstlesing)

Krever Apple Developer Program (ca. 1 000 kr/år) og endelig bundle ID. Bygg startes fra GitHub → Actions → «EAS Build (manuell)».
Første gangs Apple-sertifikater krever vanligvis interaktiv innlogging; mulig vei uten PC er en App Store Connect API-nøkkel som secret (undersøkes når kontoen finnes).
