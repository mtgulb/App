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

- **Automatisk tolkning av bilde/skjermbilde** (krever AI/OCR via backend – avventer valg, se under).
- Innkjøpsliste, deling, søk/tagger, skalering av porsjoner, Android-finpuss.

## Åpen beslutning: lese oppskrift fra bilde

API-nøkkel kan ikke ligge i appen. Alternativer:

- **A. Liten backend (f.eks. Supabase Edge Function) som kaller Claude vision.** Best kvalitet, kan også tolke lenker uten schema.org. Løpende kostnad per bilde (typisk øre) + Supabase (gratisnivå finnes).
- **B. On-device tekstgjenkjenning (iOS Vision/Live Text via egen native modul).** Gratis, men krever mer native arbeid og gir rå tekst som må struktureres.
