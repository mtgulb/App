# Testguide for Expo Go (Panful)

Mål: finne alt som er feil eller rart, før vi bygger for TestFlight. Ta ca. 45 minutter. Bruk telefonen, ikke PC.

## Før du starter

- Be Claude om «siste Expo-lenke». Åpne den i Safari på iPhone og velg **Åpne i Expo Go**. Lenken må kopieres hele, uten mellomrom.
- Første gang vises en introduksjon med fem sider. Sjekk at den virker (Neste, Hopp over, Kom i gang).
- Lukk og åpne appen på nytt. Introduksjonen skal ikke komme igjen. Den kan åpnes under Innstillinger → Vis introduksjon.

## Skriv ned funn slik

For hvert funn: **hvor** (skjerm), **hva du gjorde**, **hva som skjedde**, **hva du forventet**. Skjermbilde hvis mulig (sideknapp + volum opp). Send alle funn samlet.

## 1. Oppskrifter

1. Gå til Oppskrifter → **+** → lim inn en lenke til en oppskrift (prøv gjerne 3 forskjellige norske nettsteder, for eksempel Matprat, Tine, Godt.no, og ett engelsk). **Forventet:** tittel, bilde, ingredienser og steg kommer riktig. Bildet skal være av retten, ikke et ikon.
2. Prøv en lenke som ikke er en oppskrift. **Forventet:** en tydelig melding, ikke krasj.
3. Ta bilde av en oppskrift (fra en bok eller skjerm). **Forventet:** du kan rette tekst manuelt. Tekstgjenkjenning virker ikke i Expo Go, og det er normalt.
4. Skriv en oppskrift helt manuelt. Legg inn ingredienser med mengde/enhet/vare, og steg.
5. Åpne en oppskrift: endre porsjoner (mengdene skal skaleres), trykk hjerte, gi stjerner, skriv notat, trykk «Merk som laget».
6. Søk og filtrer på Oppskrifter-fanen (favoritter, tid, sortering).
7. Rediger en oppskrift og lagre. Slett en oppskrift og sjekk at den ligger i Innstillinger → **Nylig slettet**. Gjenopprett den.

## 2. Kokemodus

1. Åpne en oppskrift med tider i stegene (for eksempel «stek i 20 minutter») og trykk «Start kokemodus».
2. **Forventet:** store steg, skjermen blir på, tidtaker kan startes fra steget. La en tidtaker gå ut. Du skal få varsel hvis du har gitt tillatelse.

## 3. Middagsplan

1. Planlegg en middag (velg oppskrift, dag, antall porsjoner). Gi tilgang til kalender når den spør.
2. Åpne iPhone-kalenderen. **Forventet:** hendelsen finnes, med ingredienser i notatene.
3. Bytt mellom liste og måned. Endre porsjoner på en dag. Slett en middag.
4. Test å si **nei** til kalender. **Forventet:** forklaring og hjelp til å slå den på i Innstillinger.

## 4. Handleliste

1. Fra en oppskrift: «Legg alle ingredienser på handlelisten». Gjør det **to ganger** med samme oppskrift. **Forventet:** mengdene dobles, og oppskriften står som to oppføringer i oppsummeringen.
2. Legg til en annen oppskrift med noen felles ingredienser. **Forventet:** like varer slås sammen.
3. Legg til egne varer med feltet øverst (Enter legger til).
4. Sveip en vare til høyre (fjern/har fra før) og til venstre (rediger). Kryss av noen. Åpne «Handlet».
5. Bytt sortering (alfabetisk / etter avdeling). Lag en egen butikk under Innstillinger eller via butikk-valget, og flytt avdelinger.
6. «Tøm handleliste» (skal spørre først).
7. Planlagte middager skal **ikke** legge seg på handlelisten av seg selv.

## 5. Lager og Forslag

1. Lager: lag et eget lager (for eksempel «Fryser»), legg inn varer med og uten utløpsdato. Prøv å skanne en strekkode (tillat kamera). **Forventet:** varens navn blir til en råvare du kan rette, og appen husker valget.
2. Hvis varen ikke finnes: skriv navnet selv. Neste skanning går rett gjennom.
3. Forslag: legg inn noen varer, og se om oppskrifter som passer kommer opp. Prøv ord som «mel» mot «hvetemel», og «laks» mot «laksefilet».
4. Slå «Ta med lageret» av og på.

## 6. Innstillinger

- Antall voksne og barn: porsjonene i oppskrifter skal følge.
- Varsler: alle er av som standard. Slå på ett og se at det ber om tillatelse.
- Basisvarer: legg til og fjern.
- **Sikkerhetskopi:** «Lag sikkerhetskopi» åpner delingsmenyen. Lagre i Notater. Slett en oppskrift, kopier teksten fra Notater, og «Gjenopprett fra utklippstavlen». **Forventet:** en bekreftelse, så er oppskriften tilbake.
- **Om appen:** versjon, e-post, støtte og personvern-lenker (åpner nettsider), Open Food Facts-kreditering.
- Kontrollér at det **ikke** står noe om konto, innlogging, deling, «Familie» eller utviklertekst («Expo», «Supabase») noe sted.

## 7. Uten tilgang og uten nett

- Si nei til kamera og bilder. **Forventet:** forklaring og vei til Innstillinger, ingen krasj.
- Slå på flymodus: oppskrifter, plan og handleliste skal fungere. Import av lenke og strekkodeoppslag gir tydelig feilmelding.

## 8. Utseende og bruk

- Mørk modus (iPhone-innstillinger): tekst skal være lesbar overalt.
- Større tekst (Innstillinger → Skjerm og lysstyrke → Tekststørrelse): ingenting skal bli kuttet.
- Hold en oppskrift med langt navn og mange ingredienser. Se at layouten holder.
- Hastighet: legg inn 20+ oppskrifter. Merk om listen blir treg.

## Kjente begrensninger i Expo Go (ikke feil)

- Tekstgjenkjenning fra bilde virker ikke.
- Ikonet og navnet «Panful» vises ikke i Expo Go på samme måte som i en ferdig app.
- Deling fra Safari til appen finnes ikke ennå.
