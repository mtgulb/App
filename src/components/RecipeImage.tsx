import { Image } from 'expo-image';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useTheme } from '@/theme/colors';

/** Viser oppskriftsbildet, eller en pen plassholder når bilde mangler. */
export function RecipeImage({
  uri,
  style,
}: {
  uri?: string;
  style?: { width?: DimensionValue; height?: DimensionValue; aspectRatio?: number };
}) {
  const t = useTheme();
  if (uri) return <Image source={uri} style={style} contentFit="cover" transition={150} />;
  return (
    <View style={[styles.placeholder, { backgroundColor: t.placeholder }, style]}>
      <Text style={styles.emoji}>🍽️</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 40, opacity: 0.6 },
});
