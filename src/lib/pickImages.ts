import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { persistImage } from './images';

/** Ber om tilgang, åpner kamera/bildebibliotek og lagrer valgte bilder. Returnerer lagrede URI-er. */
export async function pickImages(source: 'camera' | 'library'): Promise<string[]> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Mangler tilgang', 'Gi tilgang i Innstillinger › appen.');
    return [];
  }
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: source === 'library',
  };
  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return [];
  return res.assets.map((a) => persistImage(a.uri));
}
