import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button } from '@/components/ui';
import { updateSettings } from '@/lib/store';
import { t } from '@/i18n';
import { useTheme } from '@/theme/colors';

const SLIDES = [
  { n: 1, emoji: '🍳' },
  { n: 2, emoji: '📖' },
  { n: 3, emoji: '🛒' },
  { n: 4, emoji: '🥕' },
  { n: 5, emoji: '🔒' },
] as const;

/** Kort introduksjon som vises første gang appen åpnes, og kan åpnes igjen fra Innstillinger. */
export default function Intro() {
  const th = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  function finish() {
    updateSettings({ introSeen: true });
    router.back();
  }

  function next() {
    if (last) return finish();
    scroll.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
      <View style={styles.top}>
        {!last ? (
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
            <Text style={{ color: th.tint, fontSize: 16, fontWeight: '600' }}>
              {t('intro.skip')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        accessibilityLabel={t('intro.page', { n: page + 1, total: SLIDES.length })}
      >
        {SLIDES.map((s) => (
          <View key={s.n} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{s.emoji}</Text>
            <Text style={[styles.title, { color: th.text }]}>{t(`intro.${s.n}.title`)}</Text>
            <Text style={[styles.text, { color: th.textSecondary }]}>{t(`intro.${s.n}.text`)}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View
            key={s.n}
            style={[styles.dot, { backgroundColor: i === page ? th.tint : th.border }]}
          />
        ))}
      </View>
      <View style={styles.bottom}>
        <Button title={last ? t('intro.start') : t('intro.next')} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 20, paddingBottom: 32 },
  top: { height: 40, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 24 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  text: { fontSize: 18, lineHeight: 26, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bottom: { paddingHorizontal: 24 },
});
