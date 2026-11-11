import { downloadImage } from './images';
import { parseRecipeFromHtml } from './recipeParser';
import type { Recipe } from './types';

export class ImportError extends Error {}

export async function importRecipeFromUrl(
  rawUrl: string,
): Promise<Omit<Recipe, 'id' | 'createdAt'>> {
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

  const parsed = parseRecipeFromHtml(html);
  if (!parsed) {
    throw new ImportError(
      'Fant ingen oppskrift på siden. Du kan legge den inn manuelt eller fra bilde.',
    );
  }

  const images: string[] = [];
  if (parsed.imageUrl) {
    try {
      images.push(await downloadImage(new URL(parsed.imageUrl, url).toString()));
    } catch {
      // Bilde er valgfritt – oppskriften importeres uten.
    }
  }
  return {
    title: parsed.title,
    sourceUrl: url,
    servings: parsed.servings,
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    images,
  };
}
