import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, ErrorText, Heading } from '@/components/ui';
import { ImportError, importRecipeFromUrl, normalizeUrl } from '@/lib/importFromUrl';
import { addRecipe, getState } from '@/lib/store';
import { useTheme } from '@/theme/colors';
import { t as tr } from '@/i18n';

/**
 * Importerer en lenke og åpner oppskriften. Brukes av «du har kopiert en lenke», og av dypkoblinger
 * (`oppskrifter://import?url=…`) fra f.eks. delingsmenyen når appen er installert som ekte app.
 */
export default function ImportScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const router = useRouter();
  const t = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const wanted = normalizeUrl(url);
        const existing = getState().recipes.find(
          (r) => r.sourceUrl && normalizeUrl(r.sourceUrl) === wanted,
        );
        if (existing) {
          router.replace({ pathname: '/recipe/[id]', params: { id: existing.id } });
          return;
        }
        const { data, needsReview } = await importRecipeFromUrl(url);
        const recipe = addRecipe(data);
        if (cancelled) return;
        if (needsReview)
          router.replace({ pathname: '/recipe/edit', params: { id: recipe.id, review: '1' } });
        else router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ImportError ? e.message : tr('import.failed'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, attempt, router]);

  if (!url) {
    return (
      <Screen>
        <Heading>{tr('import.noUrlTitle')}</Heading>
        <Body secondary>{tr('import.noUrlText')}</Body>
        <Button title={tr('import.close')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading>{tr('import.fetching')}</Heading>
      <Body secondary numberOfLines={2}>
        {url}
      </Body>
      {error ? (
        <>
          <ErrorText>{error}</ErrorText>
          <Button
            title={tr('import.retry')}
            onPress={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          />
          <Button
            title={tr('import.manual')}
            kind="secondary"
            onPress={() => router.replace('/recipe/new')}
          />
        </>
      ) : (
        <View style={{ paddingVertical: 24 }}>
          <ActivityIndicator color={t.tint} />
        </View>
      )}
    </Screen>
  );
}
