import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { radius, shadow, useTheme } from '@/theme/colors';

export function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={[styles.card, shadow, { backgroundColor: t.card }]}>{children}</View>;
}

export function Heading({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.heading, { color: t.text }]}>{children}</Text>;
}

export function Body({ children, secondary }: { children: ReactNode; secondary?: boolean }) {
  const t = useTheme();
  return (
    <Text style={[styles.body, { color: secondary ? t.textSecondary : t.text }]}>{children}</Text>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: t.tintSoft }]}>
      <Text style={[styles.chipText, { color: t.tint }]}>{children}</Text>
    </View>
  );
}

/** Stor sidetittel for faner (uten systemheader), med valgfri rund handlingsknapp. */
export function LargeTitle({
  title,
  actionIcon,
  actionLabel,
  onAction,
  secondaryIcon,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  actionIcon?: 'plus' | 'square.and.arrow.up';
  actionLabel?: string;
  onAction?: () => void;
  /** Valgfri andre knapp til venstre for hovedknappen. */
  secondaryIcon?: 'person.2';
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.titleRow, { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.largeTitle, { color: t.text }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.titleButtons}>
        {secondaryIcon && onSecondary ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            onPress={onSecondary}
            style={({ pressed }) => [
              styles.roundButton,
              { backgroundColor: t.tintSoft, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <SymbolView name={secondaryIcon} tintColor={t.tint} size={22} />
          </Pressable>
        ) : null}
        {actionIcon && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            style={({ pressed }) => [
              styles.roundButton,
              shadow,
              { backgroundColor: t.tint, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <SymbolView name={actionIcon} tintColor="#FFFFFF" size={22} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 50,
  label,
  compact,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  compact?: boolean;
}) {
  const t = useTheme();
  const size = compact ? 32 : 40;
  const btn = (name: 'minus' | 'plus', disabled: boolean, next: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name === 'minus' ? 'Færre' : 'Flere'} ${label}`}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(next)}
      style={[
        styles.stepBtn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.tintSoft },
        disabled && { opacity: 0.4 },
      ]}
    >
      <SymbolView name={name} tintColor={t.tint} size={compact ? 14 : 18} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('minus', value <= min, value - 1)}
      <Text
        accessibilityLabel={`${value} ${label}`}
        style={[styles.stepValue, { color: t.text }, compact && { fontSize: 15, minWidth: 24 }]}
      >
        {value}
      </Text>
      {btn('plus', value >= max, value + 1)}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: t.tintSoft }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && { backgroundColor: t.card }]}
          >
            <Text style={[styles.segmentText, { color: active ? t.tint : t.textSecondary }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  kind = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'destructive';
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.tint : kind === 'secondary' ? t.tintSoft : 'transparent';
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'destructive' ? t.danger : t.tint;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const t = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.textSecondary}
        {...rest}
        style={[
          styles.input,
          { color: t.text, backgroundColor: t.background, borderColor: t.border },
          rest.multiline && { minHeight: 120, textAlignVertical: 'top' },
          style,
        ]}
      />
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const t = useTheme();
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={[styles.body, { color: t.danger }]}>
      {children}
    </Text>
  );
}

export function EmptyState({
  emoji,
  title,
  text,
}: {
  emoji?: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      {emoji ? <Text style={styles.emptyEmoji}>{emoji}</Text> : null}
      <Heading>{title}</Heading>
      <Text style={[styles.body, styles.center, { color: useTheme().textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius, padding: 18, gap: 12 },
  heading: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23 },
  center: { textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16 },
  button: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  segmentItem: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 8 },
  segmentText: { fontSize: 15, fontWeight: '700' },
  chip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '600' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleButtons: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 32, gap: 10, alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 56 },
});
