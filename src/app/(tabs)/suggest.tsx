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
  View,
} from 'react-native';
import { AddRow } from '@/components/AddRow';
import { RecipeFitCard } from '@/components/RecipeFitCard';
import { Heading, LargeTitle } from '@/components/ui';
import { t as tr } from '@/i18n';
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
import { useTheme } from '@/theme/colors';

/**
 * «Hva kan jeg lage?» – en midlertidig økt. Det du skriver inn her lagres ikke på lageret,
 * og forsvinner når du avslutter økten. Lageret kan hentes inn, men endres ikke.
 */
export default function SuggestScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, fridge, settings } = useStore();
  const session = useSession();
  const [draft, setDraft] = useState('');

  const { names, soon } = suggestionBasis(fridge, session);
  const ranked = rankRecipes(recipes, names, fridge.assumeStaples, soon, settings.staples);

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
    const options = [
      ...fridge.storages.map((s) => tr('suggest.putOn', { name: s.name })),
      tr('suggest.remove'),
      tr('suggest.cancel'),
    ];
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
    Alert.alert(tr('suggest.endTitle'), tr('suggest.endMessage', { count: session.items.length }), [
      { text: tr('suggest.cancel'), style: 'cancel' },
      { text: tr('suggest.end'), style: 'destructive', onPress: endSession },
    ]);
  }

  const active = session.items.length > 0 || !session.useStock || session.excluded.length > 0;

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title={tr('suggest.title')} />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: t.textSecondary }]}>{tr('suggest.hint')}</Text>

        {/* Lageret: én linje */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: t.text }]}>
            {tr('suggest.includeStock', { count: fridge.items.length })}
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

        {/* Legg til: skriv + Enter, eller skann */}
        <AddRow
          value={draft}
          onChangeText={setDraft}
          onSubmit={submit}
          label={tr('suggest.addLabel')}
          placeholder={tr('suggest.addPlaceholder')}
          onScan={() => router.push({ pathname: '/scan', params: { target: 'session' } })}
        />

        {/* Midlertidige varer som små merker */}
        {session.items.length > 0 ? (
          <View style={styles.chips}>
            {session.items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={tr('suggest.itemTapForOptions', { name: item.name })}
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
            accessibilityLabel={tr('suggest.assumeStaplesLabel')}
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
              {fridge.assumeStaples ? '✓ ' : ''}
              {tr('suggest.staplesExist', { count: settings.staples.length })}
            </Text>
          </Pressable>
          {active ? (
            <Pressable accessibilityRole="button" onPress={confirmEnd}>
              <Text style={{ color: t.danger, fontWeight: '700', fontSize: 13 }}>
                {tr('suggest.endSession')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Heading>{tr('suggest.canMake')}</Heading>
        {recipes.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            {tr('suggest.addRecipesFirst')}
          </Text>
        ) : names.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            {tr('suggest.typeWhatYouHave')}
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
  pill: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
});
