# Roadmap

## Status

- [x] Expo + TS + Router-grunnmur, lint/format/typecheck, CI
- [x] iOS-bundle verifisert (`expo export`)
- [x] Appidé avklart: oppskrifter + middagsplan i kalender (se `docs/MVP.md`)
- [x] MVP-skjermer og logikk skrevet (lenke-import testet med enhetstest; resten **ikke** kjørt på enhet)
- [ ] Beslutning: bildegjenkjenning (A/B i `docs/MVP.md`)
- [ ] Development build + test på iPhone
- [ ] Apple Developer-konto, endelig bundle ID, ikon/splash
- [ ] TestFlight → App Store (personvern, aldersgrense, tekster – godkjennes av eier)

## Testveier på iPhone

1. **Installert build via GitHub Actions + EAS** (preview/development) – krever Expo-konto, `EXPO_TOKEN`, Apple Developer.
2. **EAS Update** på installert build for raske JS-endringer.
3. Expo Go + Metro krever kjørende server nåbar fra telefonen – ikke tilgjengelig i denne skyøkten (tunnel blokkert).
