import { deleteImage, downloadImage, imageSize } from './images';
import { normalizeUrl } from './urls';
import { cleanImageCandidates, extractMetaImages, parseRecipeFromPage } from './recipeParser';
import type { Recipe } from './types';

export class ImportError extends Error {}

export type ImportResult = {
  data: Omit<Recipe, 'id' | 'createdAt'>;
  /** Oppskriften er gjettet ut fra sidens tekst og må sjekkes av brukeren. */
  needsReview: boolean;
};

export async function importRecipeFromUrl(rawUrl: string): Promise<ImportResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    new URL(url);
  } catch {
    throw new ImportError('Dette ser ikke ut som en gyldig lenke.');
  }

  let html: string;
  try {
    const res = await fetch(url, { headers: { Accept: 'text/html' } });
    if (!res.ok) throw new ImportError(`Siden svarte med feil (${res.status}).`);
    html = await res.text();
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError('Kunne ikke hente siden. Sjekk nettverket og lenken.');
  }

  const parsed = parseRecipeFromPage(html);
  if (!parsed) {
    throw new ImportError(
      'Fant ingen oppskrift på siden. Du kan legge den inn manuelt eller fra bilde.',
    );
  }

  const images = await pickBestImage(
    cleanImageCandidates([...parsed.imageUrls, ...extractMetaImages(html)], url),
  );
  return {
    needsReview: parsed.quality === 'text',
    data: {
      title: parsed.title,
      sourceUrl: url,
      servings: parsed.servings,
      minutes: parsed.minutes,
      tags: parsed.tags && parsed.tags.length ? parsed.tags : undefined,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      images,
    },
  };
}

/** Under denne størrelsen er et bilde sannsynligvis et ikon eller en miniatyr. */
const MIN_IMAGE_BYTES = 12_000;
const MAX_CANDIDATES = 4;

/** Laster ned de beste kandidatene og beholder det største (et ikon er alltid lite). */
async function pickBestImage(candidates: string[]): Promise<string[]> {
  const downloaded: { uri: string; size: number }[] = [];
  for (const c of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const uri = await downloadImage(c);
      downloaded.push({ uri, size: imageSize(uri) });
    } catch {
      // Hopp over bilder som ikke lar seg hente.
    }
  }
  downloaded.sort((a, b) => b.size - a.size);
  const best = downloaded[0];
  for (const d of downloaded) if (d !== best || d.size < MIN_IMAGE_BYTES) deleteImage(d.uri);
  return best && best.size >= MIN_IMAGE_BYTES ? [best.uri] : [];
}

export { normalizeUrl };
