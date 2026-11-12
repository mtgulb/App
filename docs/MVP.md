# MVP – Oppskrifts- og middagsapp

**Idé:** Samle oppskrifter fra lenke, bilde eller manuelt – ryddig og automatisk – og knytte middager til iPhone-kalenderen, med ingrediensene i kalenderoppføringen.

## Kjernefunksjoner (v1)

1. **Importer fra lenke** – leser schema.org/Recipe (tittel, ingredienser, steg, bilde). _Bygget._
2. **Legg til fra bilde/kamera og manuelt** – bilder lagres, tekst skrives inn. _Bygget._
3. **Oppskriftsbibliotek** – liste og detaljside, sletting. _Bygget._
4. **Planlegg middag → kalender** – dato/tid, hendelse i enhetens kalender (synkes via iCloud/Google) med ingredienser og kildelenke i notatfeltet. _Bygget._
5. **Handleliste** – velg fra/til-dato; alle middager i perioden samles, like varer slås sammen og mengder summeres (g/kg, dl/l, ss/ts regnes om). _Skrevet, ikke kjørt på enhet._
6. **Porsjoner** – justerbart i oppskriften og per planlagt dag; mengder skaleres, og kalenderhendelsen oppdateres. _Skrevet, ikke kjørt på enhet._
7. **Redigerbar handleliste** – egne varer, rediger/«har fra før», avkryssede varer i lukket «Handlet»-seksjon med Angre-knapp. _Skrevet, ikke kjørt på enhet._
8. **Strukturert ingrediensredigering** – felt for mengde, enhet og hva (og ett felt per steg) i stedet for ren tekst. _Skrevet, ikke kjørt på enhet._
9. **Kjøleskap og forslag** – legg inn hva du har; oppskrifter rangeres etter færrest manglende ingredienser, med «legg manglende på handlelisten». Synonymer (mel/mjøl/hvetemel/flour …) brukes både her og ved sammenslåing. _Skrevet, ikke kjørt på enhet._
10. **Sveip i lister** – høyre fjerner, venstre redigerer (handleliste og kjøleskap). _Ikke kjørt på enhet._
11. **Lim inn / skann tekst** – iPhones «Skann tekst» i tastaturet fyller inn teksten; appen deler den opp. _Ikke kjørt på enhet._
12. **Familiedeling (Supabase)** – forberedt, avslått til oppsett (`docs/SUPABASE.md`). Database og tilgangsregler er testet; synkkoden er ikke prøvd mot ekte server.
13. **Lager** (kjøleskap/fryser/skap) med valgfri utløpsdato og «bruk opp snart». _Ikke kjørt på enhet._
14. **Innstillinger**: voksne/barn (alle oppskrifter tilpasser seg), sortering av handleliste etter avdeling (valg), valgfrie påminnelser (av som standard). _Ikke kjørt på enhet._
15. **Kokemodus** med steg for steg, skjerm på, tidtakere fra stegene. _Ikke kjørt på enhet._
16. **Kopiert lenke → importer** og dypkobling `oppskrifter://import`. Deling fra Safari krever ekte bygg (`docs/DELING.md`).
17. **Middagsplan** (liste eller månedskalender) – oversikt per dag, fjerne (fjerner også kalenderhendelsen). _Bygget._

## Skjermer

Oppskrifter (liste) · Ny oppskrift · Oppskrift (detalj) · Planlegg middag · Middagsplan

## Utsatt

- Innkjøpsliste, deling, søk/tagger, skalering av porsjoner, Android-finpuss.

## Beslutning: lese oppskrift fra bilde

Valgt **B**: tekstgjenkjenning på enheten (Apple Vision via `expo-text-extractor`), deretter enkel strukturering til tittel/ingredienser/fremgangsmåte (`src/lib/structureText.ts`). Gratis og bildet forlater ikke telefonen. Krever ekte bygg (ikke Expo Go). Kvaliteten avhenger av bildet – brukeren kan rette opp før lagring. Alternativ A (Claude via backend) kan legges til senere.
