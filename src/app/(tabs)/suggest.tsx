import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RecipeFitCard } from '@/components/RecipeFitCard';
import { Heading, LargeTitle } from '@/components/ui';
import { rankRecipes } from '@/lib/pantry';
import {
  addSessionItems,
  endSession,
  removeSessionItem,
  setUseStock,
  suggestionBasis,
  toggleStorageIncluded,
  useSession,
  type SessionItem,
} from '@/lib/session';
import { addFridgeItems, setAssumeStaples, useStore } from '@/lib/store';
import { radius, shadow, useTheme } from '@/theme/colors';

/**
 * «Hva kan jeg lage?» – en midlertidig økt. Det du skriver inn her lagres ikke på lageret,
 * og forsvinner når du avslutter økten. Lageret kan hentes inn, men endres ikke.
 */
export default function SuggestScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, fridge } = useStore();
  const session = useSession();
  const [draft, setDraft] = useState('');

  const { names, soon } = suggestionBasis(fridge, session);
  const ranked = rankRecipes(recipes, names, fridge.assumeStaples, soon);

  function submit() {
    addSessionItems(draft);
    setDraft('');
  }

  /** Valg for en midlertidig vare: legg den på lageret (bevisst valg) eller fjern den. */
  function itemMenu(item: SessionItem) {
    const put = (storageId: string) => {
      addFridgeItems(item.name, { place: storageId });
      removeSessionItem(item.id);
    };
    if (Platform.OS !== 'ios') {
      removeSessionItem(item.id);
      return;
    }
    const options = [...fridge.storages.map((s) => `Legg på ${s.name}`), 'Fjern', 'Avbryt'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: item.name,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: options.length - 2,
      },
      (i) => {
        if (i < fridge.storages.length) put(fridge.storages[i].id);
        else if (i === fridge.storages.length) removeSessionItem(item.id);
      },
    );
  }

  function confirmEnd() {
    if (session.items.length === 0) {
      endSession();
      return;
    }
    Alert.alert(
      'Avslutte økten?',
      `De ${session.items.length} midlertidige varene fjernes. Lageret berøres ikke.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Avslutt', style: 'destructive', onPress: endSession },
      ],
    );
  }

  const active = session.items.length > 0 || !session.useStock || session.excluded.length > 0;

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Forslag" />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          Midlertidig – det du skriver inn lagres ikke på lageret.
        </Text>

        {/* Lageret: én linje */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: t.text }]}>
            Ta med lageret ({fridge.items.length})
          </Text>
          <Switch
            value={session.useStock}
            onValueChange={setUseStock}
            trackColor={{ true: t.tint }}
          />
        </View>
        {session.useStock && fridge.storages.length > 1 ? (
          <View style={styles.chips}>
            {fridge.storages.map((s) => {
              const on = !session.excluded.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggleStorageIncluded(s.id)}
                  style={[styles.chip, { backgroundColor: on ? t.tint : t.tintSoft }]}
                >
                  <Text style={{ color: on ? '#FFFFFF' : t.tint, fontWeight: '700', fontSize: 13 }}>
                    {on ? '✓ ' : ''}
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Legg til: tekst + skann */}
        <View style={[styles.addRow, shadow, { backgroundColor: t.card }]}>
          <TextInput
            accessibilityLabel="Skriv inn det du har nå"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Hva har du nå? F.eks. kylling, ris"
            placeholderTextColor={t.textSecondary}
            returnKeyType="done"
            autoCorrect={false}
            style={[styles.addInput, { color: t.text }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skann strekkode"
            hitSlop={8}
            onPress={() => router.push({ pathname: '/scan', params: { target: 'session' } })}
          >
            <SymbolView name="barcode.viewfinder" tintColor={t.textSecondary} size={24} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Legg til"
            onPress={submit}
            style={[styles.addBtn, { backgroundColor: t.tint }]}
          >
            <SymbolView name="plus" tintColor="#FFFFFF" size={16} />
          </Pressable>
        </View>

        {/* Midlertidige varer som små merker */}
        {session.items.length > 0 ? (
          <View style={styles.chips}>
            {session.items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, trykk for valg`}
                onPress={() => itemMenu(item)}
              >
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
                  ]}
                >
                  <Text style={{ color: t.text, fontSize: 14 }}>{item.name} ✕</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.row}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: fridge.assumeStaples }}
            accessibilityLabel="Anta at salt, pepper, vann og olje finnes"
            onPress={() => setAssumeStaples(!fridge.assumeStaples)}
            style={[styles.pill, { backgroundColor: fridge.assumeStaples ? t.tint : t.tintSoft }]}
          >
            <Text
              style={{
                color: fridge.assumeStaples ? '#FFFFFF' : t.tint,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              {fridge.assumeStaples ? '✓ ' : ''}Salt, pepper, vann og olje finnes
            </Text>
          </Pressable>
          {active ? (
            <Pressable accessibilityRole="button" onPress={confirmEnd}>
              <Text style={{ color: t.danger, fontWeight: '700', fontSize: 13 }}>Avslutt økt</Text>
            </Pressable>
          ) : null}
        </View>

        <Heading>Du kan lage</Heading>
        {recipes.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>Legg inn oppskrifter først.</Text>
        ) : names.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            Skriv inn hva du har, eller ta med lageret.
          </Text>
        ) : (
          ranked.map((fit) => (
            <RecipeFitCard
              key={fit.recipe.id}
              fit={fit}
              onPress={() =>
                router.push({ pathname: '/recipe/[id]', params: { id: fit.recipe.id } })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  hint: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { fontSize: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 12,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
});
