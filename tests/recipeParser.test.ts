import assert from 'node:assert/strict';
import { parseRecipeFromHtml } from '../src/lib/recipeParser.ts';
const wrap = (j: unknown) =>
  `<html><script type="application/ld+json">${JSON.stringify(j)}</script></html>`;
// 1: @graph + HowToSection + entities
let r = parseRecipeFromHtml(
  wrap({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite' },
      {
        '@type': ['Recipe'],
        name: 'Kj&oslash;ttkaker &amp; saus',
        recipeYield: ['4', '4 porsjoner'],
        image: { url: 'https://x/y.jpg' },
        recipeIngredient: ['500 g kj&#248;ttdeig', ' 1 ts salt '],
        recipeInstructions: [
          {
            '@type': 'HowToSection',
            itemListElement: [
              { '@type': 'HowToStep', text: 'Bland.' },
              { '@type': 'HowToStep', text: 'Stek.' },
            ],
          },
        ],
      },
    ],
  }),
);
assert.ok(r);
assert.equal(r.title, 'Kjøttkaker & saus');
assert.deepEqual(r.ingredients, ['500 g kjøttdeig', '1 ts salt']);
assert.deepEqual(r.steps, ['Bland.', 'Stek.']);
assert.equal(r.servings, '4');
assert.equal(r.imageUrl, 'https://x/y.jpg');
// 2: string instructions, array root
r = parseRecipeFromHtml(
  wrap([
    {
      '@type': 'Recipe',
      name: 'Suppe',
      recipeIngredient: ['vann'],
      recipeInstructions: '<p>Kok.</p><p>Server.</p>',
    },
  ]),
);
assert.deepEqual(r?.steps, ['Kok.', 'Server.']);
// 3: ingen oppskrift / ugyldig JSON
assert.equal(parseRecipeFromHtml('<html></html>'), null);
assert.equal(parseRecipeFromHtml('<script type="application/ld+json">{bad</script>'), null);
console.log('parser OK');
