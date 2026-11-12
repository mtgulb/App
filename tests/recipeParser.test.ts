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

// --- Tid, tagger og reserver ---
import { parseDuration, parseRecipeFromPage } from '../src/lib/recipeParser.ts';
assert.equal(parseDuration('PT1H30M'), 90);
assert.equal(parseDuration('PT45M'), 45);
assert.equal(parseDuration('P0DT20M'), 20);
assert.equal(parseDuration('PT0S'), undefined);
assert.equal(parseDuration('45 min'), undefined);
{
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@type': 'Recipe',
    name: 'Fiskesuppe',
    prepTime: 'PT15M',
    cookTime: 'PT25M',
    recipeCategory: ['Middag', 'Suppe'],
    keywords: 'fisk, hverdag',
    recipeIngredient: ['400 g torsk'],
    recipeInstructions: 'Kok.',
  })}</script>`;
  const r = parseRecipeFromPage(ld)!;
  assert.equal(r.minutes, 40); // forberedelse + steking
  assert.deepEqual(r.tags, ['middag', 'suppe', 'fisk', 'hverdag']);
  assert.equal(r.quality, 'structured');
}
{
  // Eldre microdata uten JSON-LD
  const md = `<div itemscope itemtype="http://schema.org/Recipe">
    <h1 itemprop="name">Pannekaker</h1>
    <meta itemprop="totalTime" content="PT20M">
    <span itemprop="recipeYield">4</span>
    <ul><li itemprop="recipeIngredient">3 egg</li><li itemprop="recipeIngredient">5 dl melk</li></ul>
    <div itemprop="recipeInstructions"><p>Visp alt.</p><p>Stek i panne.</p></div>
  </div>`;
  const r = parseRecipeFromPage(md)!;
  assert.equal(r.title, 'Pannekaker');
  assert.deepEqual(r.ingredients, ['3 egg', '5 dl melk']);
  assert.equal(r.minutes, 20);
  assert.equal(r.servings, '4');
  assert.deepEqual(r.steps, ['Visp alt.', 'Stek i panne.']);
}
{
  // Ren tekstside uten oppskriftsdata: leses som siste utvei og merkes «text»
  const page = `<html><head><meta property="og:title" content="Kyllinggryte"></head><body>
    <nav><a>Hjem</a><a>Oppskrifter</a></nav>
    <h1>Kyllinggryte</h1>
    <h2>Ingredienser</h2><ul><li>500 g kyllingfilet</li><li>2 dl fløte</li><li>1 løk</li></ul>
    <h2>Fremgangsmåte</h2><ol><li>Brun kyllingen.</li><li>Tilsett fløte og kok i 15 minutter.</li></ol>
    <h3>Kommentarer</h3><p>Så godt!</p>
  </body></html>`;
  const r = parseRecipeFromPage(page)!;
  assert.equal(r.quality, 'text');
  assert.equal(r.title, 'Kyllinggryte');
  assert.deepEqual(r.ingredients, ['500 g kyllingfilet', '2 dl fløte', '1 løk']);
  assert.deepEqual(r.steps, ['Brun kyllingen.', 'Tilsett fløte og kok i 15 minutter.']); // kommentarer kuttet
}
// Sider uten oppskrift gir null (aldri tull)
assert.equal(
  parseRecipeFromPage('<html><body><h1>Nyheter</h1><p>Ingredienser i politikken</p></body></html>'),
  null,
);
assert.equal(parseRecipeFromPage('<h2>Ingredienser</h2><p>mel</p>'), null); // mangler fremgangsmåte
console.log('import fallbacks OK');
