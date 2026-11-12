import assert from 'node:assert/strict';
import {
  isValidGtin,
  normalizeGtin,
  parseOffProduct,
  suggestedName,
} from '../src/lib/barcodeParse.ts';

// Sjekksiffer (kjente gyldige koder)
assert.ok(isValidGtin('7038010000256')); // EAN-13
assert.ok(isValidGtin('4006381333931')); // EAN-13
assert.ok(isValidGtin('96385074')); // EAN-8
assert.ok(isValidGtin('036000291452')); // UPC-A
assert.ok(!isValidGtin('7038010000257')); // feil sjekksiffer
assert.ok(!isValidGtin('12345')); // feil lengde
assert.ok(!isValidGtin('abc'));
assert.ok(isValidGtin('7038 0100 00256')); // mellomrom ignoreres

// Normalisering
assert.equal(normalizeGtin('036000291452'), '0036000291452'); // UPC-A → EAN-13
assert.equal(normalizeGtin('00036000291452'), '0036000291452'); // EAN-14 med 0
assert.equal(normalizeGtin('7038010000256'), '7038010000256');
assert.equal(normalizeGtin('7038 0100 00256'), '7038010000256');

// Open Food Facts-svar
assert.equal(parseOffProduct({ status: 0 }), null); // ikke funnet
assert.equal(parseOffProduct(null), null);
assert.equal(parseOffProduct({ status: 1, product: { brands: 'Tine' } }), null); // uten navn
const found = parseOffProduct({
  status: 1,
  product: {
    product_name: 'Whole milk',
    product_name_no: 'Lettmelk',
    brands: 'Tine, Tine Norge',
    quantity: '1 l',
  },
});
assert.deepEqual(found, { name: 'Lettmelk', brand: 'Tine', quantity: '1 l' });
assert.deepEqual(
  parseOffProduct({
    status: 1,
    product: { product_name: 'Sweet corn', categories_tags: ['en:sweet-corn', 'en:vegetables'] },
  })?.categories,
  ['en:sweet-corn', 'en:vegetables'],
); // norsk navn foretrekkes
assert.equal(parseOffProduct({ status: 1, product: { generic_name: 'Smør' } })?.name, 'Smør');

// Foreslått navn uten merkenavn først
assert.equal(suggestedName({ name: 'Tine Lettmelk', brand: 'Tine' }), 'Lettmelk');
assert.equal(suggestedName({ name: 'Lettmelk', brand: 'Tine' }), 'Lettmelk');
assert.equal(suggestedName({ name: 'Tine', brand: 'Tine' }), 'Tine'); // ingenting igjen: behold
assert.equal(suggestedName({ name: 'Egg' }), 'Egg');
console.log('barcode OK');
