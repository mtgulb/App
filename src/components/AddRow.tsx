import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { radius, shadow, useTheme } from '@/theme/colors';

/** Rund/firkantet knapp med stor trykkflate (44 pt, Apples anbefaling). */
export function IconButton({
  name,
  label,
  onPress,
  filled,
  active,
}: {
  name: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  /** Fylt (hovedhandling). */
  filled?: boolean;
  /** Uthevet (f.eks. dato valgt). */
  active?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        filled && { backgroundColor: t.tint },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <SymbolView
        name={name}
        tintColor={filled ? '#FFFFFF' : active ? t.tint : t.textSecondary}
        size={filled ? 26 : 24}
      />
    </Pressable>
  );
}

/**
 * Inntastingsrad: skriv og trykk Enter for å legge til (tastaturet blir stående, så du kan skrive flere).
 * Én stor knapp for strekkodeskanning, pluss valgfrie ekstra knapper (f.eks. dato).
 */
export function AddRow({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  label,
  onScan,
  extra,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  label: string;
  onScan: () => void;
  extra?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[styles.row, shadow, { backgroundColor: t.card }]}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        submitBehavior="submit"
        placeholder={placeholder}
        placeholderTextColor={t.textSecondary}
        returnKeyType="done"
        autoCorrect={false}
        style={[styles.input, { color: t.text }]}
      />
      {extra}
      <IconButton name="barcode.viewfinder" label="Skann strekkode" onPress={onScan} filled />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 4,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
