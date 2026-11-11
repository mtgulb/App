# CLAUDE.md

Produkteier jobber fra iPhone. Svar på norsk. Gjør arbeidet i repoet selv.

## Stack

Expo SDK 58 · React Native · TypeScript (strict) · Expo Router (`src/app`) · EAS Build/Submit.

## Kommandoer

- `npm run check` – typecheck + lint + format (må være grønn før commit)
- `npx expo export --platform ios` – verifiserer at iOS-bundlen bygger
- Denne skyøkten når IKKE expo.dev/ngrok: EAS kjøres via GitHub Actions (`.github/workflows/eas-build.yml`).

## Regler

- Ingen hemmeligheter i kode/git. `EXPO_PUBLIC_*` er offentlig.
- Ikke påstå at noe er testet/bygget uten faktisk kjøring.
- Spør før: betalte tjenester, endelig bundle ID, publisering til App Store.
- Demo-data må være synlig merket «Demo».
- Bundle ID `com.example.minapp` er en PLACEHOLDER (ikke reservert).
