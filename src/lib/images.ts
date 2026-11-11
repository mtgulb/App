import { Directory, File, Paths } from 'expo-file-system';
import { newId } from './store';

/** Kopierer et bilde fra midlertidig plassering til appens permanente mappe. */
export function persistImage(sourceUri: string): string {
  const dir = new Directory(Paths.document, 'recipe-images');
  if (!dir.exists) dir.create();
  const ext = sourceUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const dest = new File(dir, `${newId()}.${ext.length <= 4 ? ext : 'jpg'}`);
  new File(sourceUri).copy(dest);
  return dest.uri;
}

/** Laster ned et bilde fra nett til appens permanente mappe. */
export async function downloadImage(url: string): Promise<string> {
  const dir = new Directory(Paths.document, 'recipe-images');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${newId()}.jpg`);
  const file = await File.downloadFileAsync(url, dest);
  return file.uri;
}

export function imageSize(uri: string): number {
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

export function deleteImage(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Opprydding er best effort.
  }
}
