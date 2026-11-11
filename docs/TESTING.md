# Test appen på iPhone – uten PC

Du trenger ingen Mac/PC. GitHub Codespaces er en gratis nettleserbasert «PC» (gratiskvote: ca. 60 timer/mnd).
Tips i Safari: trykk **aA** i adressefeltet → **Be om skrivebordsside** hvis GitHub ser trangt ut.

## Nivå 1 – Expo Go (gratis, ingen Apple-konto)

Gir: oppskriftsliste, lenke-import, kamera/bildevalg, kalender, middagsplan.
Gir **ikke**: automatisk tekstlesing fra bilde (krever Nivå 2).

1. Installer **Expo Go** fra App Store.
2. Safari → `github.com/mtgulb/App` → grønn **Code**-knapp → fanen **Codespaces** → **Create codespace on claude/ios-app-expo-setup-n6xmpi**.
3. Vent til terminalen vises nederst (første gang tar det noen minutter). Skriv: `npm run go`
4. Når du ser en linje som `Metro waiting on exp://….exp.direct`: hold fingeren på lenken i terminalen, kopier den, lim den inn i Safari-adressefeltet og trykk Gå → **Åpne i Expo Go**.
5. Godkjenn tilgang til kamera/bilder/kalender når appen spør.
6. Avslutt Codespace når du er ferdig (Ctrl+C, og stopp det på github.com/codespaces) for å spare kvote.

Status: Metro-serveren i Go-modus er verifisert i skymiljøet. **Tunnelen og selve åpningen i Expo Go er ikke prøvd** (skymiljøet når ikke Expo). Støtter App Store-versjonen av Expo Go SDK 58? Hvis Expo Go klager på versjon, si fra.

## Nivå 2 – TestFlight (ekte app, alt fungerer inkl. tekstlesing)

Krever Apple Developer Program (ca. 1 000 kr/år) og at bundle ID er valgt (nå placeholder `com.example.minapp`).

I samme Codespace-terminal:

1. `npx eas-cli login` (gratis Expo-konto) og `npx eas-cli init`
2. `npx eas-cli build -p ios --profile production` – logg inn med Apple-ID når du blir spurt (dette oppretter sertifikater; må gjøres interaktivt første gang)
3. `npx eas-cli submit -p ios --latest`
4. Installer **TestFlight** fra App Store og åpne invitasjonen fra App Store Connect.

Når kontoene er satt opp, kan senere bygg startes fra GitHub → Actions → «EAS Build (manuell)» (krever repo-secret `EXPO_TOKEN`).
