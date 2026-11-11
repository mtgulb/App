# MVP – Oppskrifts- og middagsapp

**Idé:** Samle oppskrifter fra lenke, bilde eller manuelt – ryddig og automatisk – og knytte middager til iPhone-kalenderen, med ingrediensene i kalenderoppføringen.

## Kjernefunksjoner (v1)

1. **Importer fra lenke** – leser schema.org/Recipe (tittel, ingredienser, steg, bilde). _Bygget._
2. **Legg til fra bilde/kamera og manuelt** – bilder lagres, tekst skrives inn. _Bygget._
3. **Oppskriftsbibliotek** – liste og detaljside, sletting. _Bygget._
4. **Planlegg middag → kalender** – dato/tid, hendelse i enhetens kalender (synkes via iCloud/Google) med ingredienser og kildelenke i notatfeltet. _Bygget._
5. **Middagsplan** – oversikt per dag, fjerne (fjerner også kalenderhendelsen). _Bygget._

## Skjermer

Oppskrifter (liste) · Ny oppskrift · Oppskrift (detalj) · Planlegg middag · Middagsplan

## Utsatt

- Innkjøpsliste, deling, søk/tagger, skalering av porsjoner, Android-finpuss.

## Beslutning: lese oppskrift fra bilde

Valgt **B**: tekstgjenkjenning på enheten (Apple Vision via `expo-text-extractor`), deretter enkel strukturering til tittel/ingredienser/fremgangsmåte (`src/lib/structureText.ts`). Gratis og bildet forlater ikke telefonen. Krever ekte bygg (ikke Expo Go). Kvaliteten avhenger av bildet – brukeren kan rette opp før lagring. Alternativ A (Claude via backend) kan legges til senere.
