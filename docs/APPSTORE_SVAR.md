# Svar i App Store Connect (arbeidsnotat, ikke tekst til butikken)

Må sjekkes av eier. Punkter merket _ikke verifisert_ er ikke bekreftet mot Apples skjema.

- **Aldersgrense:** ingen støtende innhold, ingen nettlesing som ikke er knyttet til oppskrifter. Forventet laveste klasse.
- **Personvern («App Privacy»):** foreslått «Data Not Collected». Appen har ingen konto, og strekkodenummer sendes bare for et oppslag. Kontroller mot Apples definisjon før du svarer.
- **Eksport (kryptering):** `ITSAppUsesNonExemptEncryption = false` er satt (bruker bare standard HTTPS).
- **Content Rights:** appen viser oppskrifter brukeren selv har hentet, med kilde og lenke.
- **Pris:** gratis i 1.0 (se `docs/PRIS.md`).
- **Utgiver (individuell konto):** ditt fulle navn vises offentlig som selger.
- **EU-trader (DSA):** eier har svart at hen ikke regner seg som næringsdrivende (gratis hobbyapp, 2026-11-12). Endres hvis appen begynner å selge: da blir navn, adresse, telefon og e-post offentlig i EU.
- **Skjermbilder:** 6,9″ (iPhone) kreves. Tas fra TestFlight-bygget, ikke fra Expo Go.
