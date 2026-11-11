import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, shadow, useTheme } from '@/theme/colors';

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthFmt = new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' });
const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

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
  const t = useTheme();
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

  const title = monthFmt.format(month);

  return (
    <View style={[styles.card, shadow, { backgroundColor: t.card }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forrige måned"
          hitSlop={10}
          onPress={() => onMonthChange(-1)}
        >
          <SymbolView name="chevron.left" tintColor={t.tint} size={20} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Neste måned"
          hitSlop={10}
          onPress={() => onMonthChange(1)}
        >
          <SymbolView name="chevron.right" tintColor={t.tint} size={20} />
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={[styles.weekday, { color: t.textSecondary }]}>
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
                accessibilityLabel={`${day}. ${title}${count ? `, ${count} middag${count > 1 ? 'er' : ''}` : ''}`}
                onPress={() => onSelect(key)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: t.tint },
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: t.tint },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : t.text },
                      isToday && !isSelected && { color: t.tint, fontWeight: '800' },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: count ? t.tint : 'transparent' }]} />
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
