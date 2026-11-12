import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { Body, Button, EmptyState, SegmentedControl } from '@/components/ui';
import { findTimers, formatClock } from '@/lib/durations';
import { scaledLines } from '@/lib/ingredients';
import {
  cancelNotification,
  notificationsAllowed,
  requestNotifications,
  scheduleTimerNotification,
} from '@/lib/notifications';
import { defaultServings } from '@/lib/portions';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme/colors';
import { t as tr } from '@/i18n';

/** Klokken hentes utenfor komponenten, siden den ikke skal kalles under rendering. */
const clock = () => Date.now();

type Timer = { key: string; label: string; endAt: number; notificationId: string | null };

/** Kokemodus: ett steg om gangen med store bokstaver, skjermen på og tidtakere. */
export default function CookMode() {
  useKeepAwake();
  const t = useTheme();
  const router = useRouter();
  const { id, servings: servingsParam } = useLocalSearchParams<{ id: string; servings?: string }>();
  const { recipes, settings } = useStore();
  const recipe = recipes.find((r) => r.id === id);

  const [index, setIndex] = useState(0);
  const [view, setView] = useState<'steps' | 'ingredients'>('steps');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const timersRef = useRef<Timer[]>([]);

  const setAllTimers = (next: Timer[]) => {
    timersRef.current = next;
    setTimers(next);
  };

  // Teller ned og varsler når en tidtaker er ferdig.
  const running = timers.length > 0;
  useEffect(() => {
    if (!running) return;
    const handle = setInterval(() => {
      const t0 = Date.now();
      setNow(t0);
      const finished = timersRef.current.filter((x) => x.endAt <= t0);
      if (finished.length > 0) {
        setAllTimers(timersRef.current.filter((x) => x.endAt > t0));
        Vibration.vibrate([0, 600, 300, 600]);
        Alert.alert(tr('cook.timerDone'), finished.map((f) => f.label).join(', '));
      }
    }, 1000);
    return () => clearInterval(handle);
  }, [running]);

  // Rydd opp planlagte varsler når man forlater kokemodus.
  useEffect(
    () => () => {
      for (const tm of timersRef.current) void cancelNotification(tm.notificationId);
    },
    [],
  );

  if (!recipe)
    return (
      <EmptyState emoji="🤷" title={tr('cook.notFoundTitle')} text={tr('cook.notFoundText')} />
    );
  if (recipe.steps.length === 0) {
    return <EmptyState emoji="📝" title={tr('cook.noStepsTitle')} text={tr('cook.noStepsText')} />;
  }

  const servings = parseInt(servingsParam ?? '', 10) || defaultServings(settings, recipe);
  const steps = recipe.steps;
  const step = steps[index];
  const stepTimers = findTimers(step);
  const lines = scaledLines(recipe, servings);

  async function start(label: string, seconds: number) {
    let notificationId: string | null = null;
    if (settings.timerAlerts) {
      // Spørres først når du starter en tidtaker, og bare hvis du ikke har slått det av.
      if (!(await notificationsAllowed())) await requestNotifications();
      notificationId = await scheduleTimerNotification(
        seconds,
        tr('cook.timerDone'),
        `${recipe!.title}: ${label}`,
      );
    }
    setNow(clock());
    setAllTimers([
      ...timersRef.current,
      { key: `${clock()}-${label}`, label, endAt: clock() + seconds * 1000, notificationId },
    ]);
  }

  function stop(tm: Timer) {
    void cancelNotification(tm.notificationId);
    setAllTimers(timersRef.current.filter((x) => x.key !== tm.key));
  }

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: recipe.title }} />
      <View style={styles.top}>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'steps', label: tr('cook.tabSteps') },
            { value: 'ingredients', label: tr('cook.tabIngredients') },
          ]}
        />
      </View>

      {view === 'steps' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.progress, { color: t.textSecondary }]}>
            {tr('cook.progress', { n: index + 1, total: steps.length })}
          </Text>
          <Text style={[styles.step, { color: t.text }]} accessibilityRole="text">
            {step}
          </Text>
          {stepTimers.map((tm) => (
            <Button
              key={tm.label}
              kind="secondary"
              title={tr('cook.startTimer', { label: tm.label })}
              onPress={() => start(tm.label, tm.seconds)}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Body secondary>{tr('cook.ingredientsHelp', { servings })}</Body>
          {lines.map((line, i) => (
            <Pressable
              key={i}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checked.has(i) }}
              onPress={() => toggle(i)}
              style={[styles.ingredient, { backgroundColor: t.card, borderColor: t.border }]}
            >
              <Text
                style={[
                  styles.ingredientText,
                  { color: checked.has(i) ? t.textSecondary : t.text },
                  checked.has(i) && { textDecorationLine: 'line-through' },
                ]}
              >
                {checked.has(i) ? '✓  ' : '○  '}
                {line}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {timers.length > 0 ? (
        <View style={[styles.timers, { backgroundColor: t.card, borderColor: t.border }]}>
          {timers.map((tm) => (
            <View key={tm.key} style={styles.timerRow}>
              <Text style={[styles.timerClock, { color: t.tint }]}>
                {formatClock((tm.endAt - now) / 1000)}
              </Text>
              <Text style={[styles.timerLabel, { color: t.text }]} numberOfLines={1}>
                {tm.label}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr('cook.stopLabel', { label: tm.label })}
                onPress={() => stop(tm)}
              >
                <Text style={{ color: t.danger, fontWeight: '700' }}>{tr('cook.stop')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {view === 'steps' ? (
        <View style={styles.nav}>
          <View style={styles.flex}>
            <Button
              title={tr('cook.prev')}
              kind="secondary"
              disabled={index === 0}
              onPress={() => setIndex(index - 1)}
            />
          </View>
          <View style={styles.flex}>
            {index < steps.length - 1 ? (
              <Button title={tr('cook.next')} onPress={() => setIndex(index + 1)} />
            ) : (
              <Button title={tr('cook.done')} onPress={() => router.back()} />
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingTop: 12 },
  body: { padding: 20, gap: 16 },
  progress: { fontSize: 15, fontWeight: '700' },
  step: { fontSize: 28, lineHeight: 38, fontWeight: '600', letterSpacing: -0.3 },
  ingredient: { borderRadius: 14, borderWidth: 1, padding: 16 },
  ingredientText: { fontSize: 20, lineHeight: 28 },
  timers: { borderTopWidth: 1, padding: 12, gap: 8 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timerClock: { fontSize: 26, fontWeight: '800', minWidth: 90, fontVariant: ['tabular-nums'] },
  timerLabel: { flex: 1, fontSize: 15 },
  nav: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28 },
});
