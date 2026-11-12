import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/ui';
import { RecipeImage } from '@/components/RecipeImage';
import { parseIngredient } from '@/lib/ingredients';
import type { RecipeFit } from '@/lib/pantry';
import { radius, shadow, useTheme } from '@/theme/colors';

const nameOf = (l: string) => parseIngredient(l).name.split(',')[0];

/** Oppskriftsforslag med hva du har, hva som mangler og hva som er lignende. */
export function RecipeFitCard({ fit, onPress }: { fit: RecipeFit; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fit.recipe.title}, ${fit.missing.length === 0 ? 'alt finnes' : `mangler ${fit.missing.length}`}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadow,
        { backgroundColor: t.card, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <RecipeImage uri={fit.recipe.images[0]} style={styles.thumb} />
      <View style={styles.flex}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {fit.recipe.title}
        </Text>
        <View style={styles.chipRow}>
          <Chip>
            {fit.missing.length === 0 && fit.similar.length === 0
              ? 'Alt du trenger!'
              : fit.missing.length === 0
                ? `Nesten alt (${fit.similar.length} lignende)`
                : `Mangler ${fit.missing.length} av ${fit.total}`}
          </Chip>
        </View>
        {fit.usesSoon.length > 0 ? (
          <Text style={{ color: t.tint, fontWeight: '600' }}>
            Bruker opp: {fit.usesSoon.join(', ')}
          </Text>
        ) : null}
        {fit.missing.length > 0 ? (
          <Text style={{ color: t.textSecondary }} numberOfLines={2}>
            {fit.missing.map(nameOf).join(', ')}
          </Text>
        ) : null}
        {fit.similar.length > 0 ? (
          <Text style={{ color: t.textSecondary }} numberOfLines={2}>
            Lignende: {fit.similar.map((x) => nameOf(x.line)).join(', ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    borderRadius: radius,
    overflow: 'hidden',
    gap: 12,
    alignItems: 'center',
  },
  thumb: { width: 84, height: 84 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  chipRow: { flexDirection: 'row', marginVertical: 4 },
});
