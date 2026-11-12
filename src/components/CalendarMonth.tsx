import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, dateTag } from '@/i18n';
import { radius, shadow, useTheme } from '@/theme/colors';

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthFmt = (): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(dateTag(), { month: 'long', year: 'numeric' });
/** Ukedagsnavn (mandag først) fra Intl, uten avsluttende punktum. */
const weekdays = (): string[] => {
  const f = new Intl.DateTimeFormat(dateTag(), { weekday: 'short' });
  // 1. januar 2024 var en mandag.
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i)).replace(/\.$/, ''));
};

/** Månedsvisning med prikk på dager som har middag. Uke starter på mandag. */
export function CalendarMonth({
  month,
  selected,
  marked,
  onSelect,
  onMonthChange,
}: {
  /** En dato i måneden som vises. */
  month: Date;
  /** Valgt dag som `dayKey`. */
  selected: string;
  /** Antall middager per dag (`dayKey` → antall). */
  marked: Map<string, number>;
  onSelect: (key: string) => void;
  onMonthChange: (delta: number) => void;
}) {
  const th = useTheme();
  const year = month.getFullYear();
  const m = month.getMonth();
  const offset = (new Date(year, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayKey = dayKey(new Date());

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const title = monthFmt().format(month);

  return (
    <View style={[styles.card, shadow, { backgroundColor: th.card }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('calendar.prevMonth')}
          hitSlop={10}
          onPress={() => onMonthChange(-1)}
        >
          <SymbolView name="chevron.left" tintColor={th.tint} size={20} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]} accessibilityRole="header">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('calendar.nextMonth')}
          hitSlop={10}
          onPress={() => onMonthChange(1)}
        >
          <SymbolView name="chevron.right" tintColor={th.tint} size={20} />
        </Pressable>
      </View>

      <View style={styles.row}>
        {weekdays().map((w) => (
          <Text key={w} style={[styles.weekday, { color: th.textSecondary }]}>
            {w}
          </Text>
        ))}
      </View>

      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((day, c) => {
            if (day === null) return <View key={c} style={styles.cell} />;
            const key = dayKey(new Date(year, m, day));
            const isSelected = key === selected;
            const isToday = key === todayKey;
            const count = marked.get(key) ?? 0;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={
                  count
                    ? t('calendar.dayLabelDinners', { day, month: title, count })
                    : t('calendar.dayLabel', { day, month: title })
                }
                onPress={() => onSelect(key)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: th.tint },
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: th.tint },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : th.text },
                      isToday && !isSelected && { color: th.tint, fontWeight: '800' },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: count ? th.tint : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius, padding: 14, gap: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingBottom: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 16, fontWeight: '500' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});
