import assert from 'node:assert/strict';
import { displayIngredient, identifyIngredient, stripQuantities } from '../src/lib/productName.ts';
import { matches } from '../src/lib/pantry.ts';

const id = (name: string, brand?: string, categories?: string[]) =>
  identifyIngredient({ name, brand, categories });

// Mengder og tall fjernes
assert.equal(stripQuantities('Sweet Corn 200 g'), 'Sweet Corn');
assert.equal(stripQuantities('Lettmelk 1,5 l'), 'Lettmelk');
assert.equal(stripQuantities('Egg 12 stk'), 'Egg');
assert.equal(stripQuantities('Yoghurt 3.5%'), 'Yoghurt');

// Eksempelet fra brukeren: maisboks → mais
const corn = id('Green Giant Sweet Corn 200 g', 'Green Giant');
assert.equal(corn.ingredient, 'mais');
assert.equal(corn.cleaned, 'Sweet Corn');
assert.ok(matches('mais', corn.ingredient!)); // og kobles dermed til «mais» i oppskrifter
assert.ok(matches('1 boks mais', corn.ingredient!));

// Norske produktnavn
assert.equal(id('Tine Lettmelk 1 l', 'Tine').ingredient, 'melk');
assert.equal(id('Gilde Kjøttdeig av storfe 400 g', 'Gilde').ingredient, 'kjøttdeig');
assert.equal(id('Coop Økologisk Hakkede Tomater 400g', 'Coop').ingredient, 'tomat');
assert.equal(id('Mills Majones').ingredient, 'majones');
assert.equal(id('Q Cottage Cheese 200 g').ingredient, 'cottage');
assert.equal(id('Philadelphia Cream Cheese').ingredient, 'kremost'); // ikke «fløte» eller «ost»
assert.equal(id('Kellogg’s Corn Flakes').ingredient, 'cornflakes'); // ikke «mais»
assert.equal(id('Kidney Beans in tomato sauce').ingredient, 'bønner');
assert.equal(id('Freia Melkesjokolade').ingredient, 'sjokolade'); // hoveddelen av sammensatt ord, ikke «melk»
assert.equal(id('Findus Frosne erter 500 g').ingredient, 'erter');
assert.equal(id('Soy sauce Kikkoman').ingredient, 'soyasaus');

// Merke fjernes uten å tømme navnet
assert.equal(id('Tine', 'Tine').ingredient, null);
// Ukjent vare: ingen gjetning, men tom liste (appen ber brukeren skrive)
const unknown = id('Ryvita Original 200 g', 'Ryvita');
assert.equal(unknown.ingredient, null);
assert.deepEqual(unknown.candidates, []);
// Kategorier fra databasen støtter når navnet ikke sier det
assert.equal(id('Premium Nr 1 200 g', undefined, ['en:sweet-corn']).ingredient, 'mais');
// Navnet går foran kategorien
assert.equal(id('Tine Lettmelk', 'Tine', ['en:yogurts']).ingredient, 'melk');
assert.deepEqual(id('Tine Lettmelk', 'Tine', ['en:yogurts']).candidates, ['melk', 'yoghurt']);

assert.equal(displayIngredient('mais'), 'Mais');
console.log('product names OK');
