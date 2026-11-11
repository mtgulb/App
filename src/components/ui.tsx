import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { radius, useTheme } from '@/theme/colors';

export function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card }]}>{children}</View>;
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
  const bg = kind === 'primary' ? t.tint : 'transparent';
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
        { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.7 : 1 },
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
          rest.multiline && { minHeight: 110, textAlignVertical: 'top' },
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

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Heading>{title}</Heading>
      <Body secondary>{text}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius, padding: 16, gap: 12 },
  heading: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 16 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  empty: { padding: 32, gap: 8, alignItems: 'center' },
});
