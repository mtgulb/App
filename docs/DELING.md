# Dele en oppskrift fra en nettside til appen

Mål: på en nettside med oppskrift trykker du **Del** og velger appen, og oppskriften importeres.

## Hva som virker nå (Expo Go)

- **Kopier lenken** (Del → Kopier, eller hold på adressefeltet), og åpne appen. Øverst på Oppskrifter står det «Du har kopiert en lenke – importere?». Trykk **Importer**. Kan slås av under Innstillinger.
- Importen kjenner igjen en lenke du allerede har lagt inn og åpner den eksisterende i stedet for å lage en dublett.

## Hva som krever et ekte bygg (Apple Developer-konto)

Appen vises ikke i delingsmenyen før den er installert som en ekte app med en delingsutvidelse. Det kan ikke gjøres i Expo Go.

Slik gjøres det når kontoen finnes:

1. Opprett Apple Developer-konto og velg endelig bundle ID.
2. Bygg appen via GitHub («EAS Build (manuell)») og installer via TestFlight.
3. Legg til delingsutvidelsen (planlagt: biblioteket `expo-share-intent` som config-plugin). Den sender lenken til `oppskrifter://import?url=<lenke>`.

**Dypkoblingen er allerede på plass:** `oppskrifter://import?url=…` åpner importskjermen. Den virker i et ekte bygg, ikke i Expo Go.

## Midlertidig løsning uten delingsutvidelse (etter at appen er installert som ekte app)

I iPhone-appen **Snarveier**: ny snarvei → _Motta URL-er fra delingsmenyen_ → handlingen _Åpne URL_ med `oppskrifter://import?url=` etterfulgt av snarveiens inndata. Da dukker snarveien opp under Del i Safari.
