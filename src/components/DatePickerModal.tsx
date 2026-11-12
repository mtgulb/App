import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { radius, useTheme } from '@/theme/colors';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const labelFmt = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
export const formatDateLabel = (s: string) => labelFmt.format(parseYmd(s));

/** Velg en egen dato. Monteres bare mens den skal vises, og starter da på `value`. */
export function DatePickerModal({
  title,
  value,
  onConfirm,
  onClear,
  onCancel,
}: {
  title: string;
  /** Forhåndsvalgt dato (YYYY-MM-DD). */
  value?: string;
  onConfirm: (date: string) => void;
  /** Gir mulighet til å fjerne en eksisterende dato. */
  onClear?: () => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  const [date, setDate] = useState(() => (value ? parseYmd(value) : new Date()));

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Lukk" />
      <View style={[styles.sheet, { backgroundColor: t.card }]}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          accentColor={t.tint}
          locale="nb-NO"
          onChange={(_, d) => d && setDate(d)}
        />
        <Button title={`Bruk ${formatDateLabel(ymd(date))}`} onPress={() => onConfirm(ymd(date))} />
        {onClear ? <Button title="Fjern dato" kind="destructive" onPress={onClear} /> : null}
        <Button title="Avbryt" kind="secondary" onPress={onCancel} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    padding: 20,
    gap: 10,
    paddingBottom: 36,
  },
  title: { fontSize: 18, fontWeight: '700' },
});
