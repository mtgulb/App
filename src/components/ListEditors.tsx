import { SymbolView } from 'expo-symbols';
import {
  ActionSheetIOS,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  lineFromRow,
  newRowId,
  rowFromLine,
  UNIT_OPTIONS,
  type IngredientRow,
} from '@/lib/ingredients';
import { useTheme } from '@/theme/colors';
import { t as tr } from '@/i18n';

export { lineFromRow, rowFromLine };
export type { IngredientRow };

export type StepRow = { id: string; text: string };

export const stepsFromLines = (lines: string[]): StepRow[] =>
  lines.map((text) => ({ id: newRowId(), text }));

export const emptyIngredientRow = (): IngredientRow => ({
  id: newRowId(),
  qty: '',
  unit: '',
  name: '',
});

function RemoveButton({ onPress, label }: { onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress}>
      <SymbolView name="xmark.circle.fill" tintColor={t.textSecondary} size={22} />
    </Pressable>
  );
}

function AddButton({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.add,
        { backgroundColor: t.tintSoft, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <SymbolView name="plus" tintColor={t.tint} size={16} />
      <Text style={[styles.addText, { color: t.tint }]}>{title}</Text>
    </Pressable>
  );
}

/** Velger enhet. På iOS som handlingsark; ellers bla gjennom enhetene. */
function pickUnit(current: string, onPick: (unit: string) => void) {
  if (Platform.OS === 'ios') {
    const options = [tr('editors.noUnit'), ...UNIT_OPTIONS, tr('editors.cancel')];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, title: tr('editors.unit') },
      (i) => {
        if (i === options.length - 1) return;
        onPick(i === 0 ? '' : options[i]);
      },
    );
    return;
  }
  const all = ['', ...UNIT_OPTIONS];
  onPick(all[(all.indexOf(current) + 1) % all.length]);
}

export function IngredientEditor({
  rows,
  onChange,
}: {
  rows: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
}) {
  const t = useTheme();
  const update = (id: string, patch: Partial<IngredientRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const inputStyle = [
    styles.input,
    { color: t.text, backgroundColor: t.background, borderColor: t.border },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.head, styles.qtyCol, { color: t.textSecondary }]}>
          {tr('editors.qty')}
        </Text>
        <Text style={[styles.head, styles.unitCol, { color: t.textSecondary }]}>
          {tr('editors.unit')}
        </Text>
        <Text style={[styles.head, styles.flex, { color: t.textSecondary }]}>
          {tr('editors.what')}
        </Text>
        <View style={styles.removeCol} />
      </View>
      {rows.map((r, n) => (
        <View key={r.id} style={styles.row}>
          <TextInput
            accessibilityLabel={tr('editors.qtyLabel', { n: n + 1 })}
            value={r.qty}
            onChangeText={(qty) => update(r.id, { qty })}
            placeholder="2"
            placeholderTextColor={t.textSecondary}
            keyboardType="numbers-and-punctuation"
            style={[...inputStyle, styles.qtyCol]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('editors.unitLabel', {
              n: n + 1,
              unit: r.unit || tr('editors.none'),
            })}
            onPress={() => pickUnit(r.unit, (unit) => update(r.id, { unit }))}
            style={[...inputStyle, styles.unitCol, styles.unitBtn]}
          >
            <Text style={{ color: r.unit ? t.text : t.textSecondary, fontSize: 16 }}>
              {r.unit || '–'}
            </Text>
          </Pressable>
          <TextInput
            accessibilityLabel={tr('editors.whatLabel', { n: n + 1 })}
            value={r.name}
            onChangeText={(name) => update(r.id, { name })}
            placeholder={tr('editors.namePlaceholder')}
            placeholderTextColor={t.textSecondary}
            style={[...inputStyle, styles.flex]}
          />
          <View style={styles.removeCol}>
            <RemoveButton
              label={tr('editors.removeIngredient', { n: n + 1 })}
              onPress={() => onChange(rows.filter((x) => x.id !== r.id))}
            />
          </View>
        </View>
      ))}
      <AddButton
        title={tr('editors.addIngredient')}
        onPress={() => onChange([...rows, emptyIngredientRow()])}
      />
    </View>
  );
}

export function StepEditor({
  rows,
  onChange,
}: {
  rows: StepRow[];
  onChange: (rows: StepRow[]) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      {rows.map((r, n) => (
        <View key={r.id} style={styles.stepRow}>
          <View style={[styles.badge, { backgroundColor: t.tintSoft }]}>
            <Text style={[styles.badgeText, { color: t.tint }]}>{n + 1}</Text>
          </View>
          <TextInput
            accessibilityLabel={tr('editors.stepLabel', { n: n + 1 })}
            value={r.text}
            onChangeText={(text) => onChange(rows.map((x) => (x.id === r.id ? { ...x, text } : x)))}
            multiline
            placeholder={tr('editors.stepPlaceholder')}
            placeholderTextColor={t.textSecondary}
            style={[
              styles.input,
              styles.flex,
              styles.stepInput,
              { color: t.text, backgroundColor: t.background, borderColor: t.border },
            ]}
          />
          <RemoveButton
            label={tr('editors.removeStep', { n: n + 1 })}
            onPress={() => onChange(rows.filter((x) => x.id !== r.id))}
          />
        </View>
      ))}
      <AddButton
        title={tr('editors.addStep')}
        onPress={() => onChange([...rows, { id: newRowId(), text: '' }])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', gap: 8, paddingRight: 0 },
  head: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  qtyCol: { width: 64 },
  unitCol: { width: 64 },
  removeCol: { width: 24, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
  },
  unitBtn: { alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  stepInput: { minHeight: 44, textAlignVertical: 'top' },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  badgeText: { fontSize: 14, fontWeight: '700' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 22,
    paddingVertical: 11,
  },
  addText: { fontSize: 15, fontWeight: '600' },
});
