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
assert.equal(r.imageUrls[0], 'https://x/y.jpg');
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

// --- Bildevalg ---
import { cleanImageCandidates, extractMetaImages } from '../src/lib/recipeParser.ts';
{
  const html = `<html><head>
    <meta property="og:image" content="/img/kylling-1200.jpg">
    <meta name="twitter:image" content='https://cdn.x/y/twitter.jpg'>
    <link rel="image_src" href="https://cdn.x/y/linked.jpg">
    <meta property="og:title" content="Ikke et bilde">
  </head></html>`;
  assert.deepEqual(extractMetaImages(html), [
    '/img/kylling-1200.jpg',
    'https://cdn.x/y/twitter.jpg',
    'https://cdn.x/y/linked.jpg',
  ]);
  // Ikoner/logoer/svg fjernes, relative blir absolutte, duplikater slås sammen
  assert.deepEqual(
    cleanImageCandidates(
      [
        '/favicon.ico',
        '/img/site-logo.png',
        '/a/icon-192.png',
        '/hero.svg',
        '/img/kylling-1200.jpg',
        'https://x.no/img/kylling-1200.jpg',
        'data:image/png;base64,AAA',
      ],
      'https://x.no/oppskrift/1',
    ),
    ['https://x.no/img/kylling-1200.jpg'],
  );
  // JSON-LD: størst oppgitt bilde først
  const r2 = parseRecipeFromHtml(
    `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Recipe',
      name: 'Test',
      recipeIngredient: ['1 egg'],
      image: [
        { '@type': 'ImageObject', url: 'https://x/small.jpg', width: 100, height: 100 },
        { '@type': 'ImageObject', url: 'https://x/big.jpg', width: 1200, height: 800 },
        'https://x/plain.jpg',
      ],
    })}</script>`,
  );
  assert.deepEqual(r2?.imageUrls, [
    'https://x/big.jpg',
    'https://x/small.jpg',
    'https://x/plain.jpg',
  ]);
}
console.log('image candidates OK');
