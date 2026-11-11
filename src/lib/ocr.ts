import { structureRecipeText, type StructuredText } from './structureText';

type Extractor = {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
};

// Lastes kun ved behov: modulen finnes ikke i Expo Go, og appen skal ikke krasje uten den.
function loadExtractor(): Extractor | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-text-extractor') as Extractor;
    return mod.isSupported ? mod : null;
  } catch {
    return null;
  }
}

export const ocrAvailable = () => loadExtractor() !== null;

/** Leser tekst fra bilder på enheten (Apple Vision) og strukturerer den. */
export async function recipeFromImages(uris: string[]): Promise<StructuredText | null> {
  const ex = loadExtractor();
  if (!ex) return null;
  const lines: string[] = [];
  for (const uri of uris) lines.push(...(await ex.extractTextFromImage(uri)));
  if (lines.length === 0) return { title: '', ingredients: [], steps: [] };
  return structureRecipeText(lines);
}
