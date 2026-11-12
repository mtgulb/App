import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Heading, SegmentedControl, Stepper } from '@/components/ui';
import { getBarcodeStats } from '@/lib/barcode';
import { isCloudConfigured } from '@/lib/cloud/config';
import { requestNotifications } from '@/lib/notifications';
import { parseHm } from '@/lib/reminders';
import { householdLabel, householdPortions } from '@/lib/portions';
import { addStaples, removeStaple, resetStaples, updateSettings, useStore } from '@/lib/store';
import { useTheme } from '@/theme/colors';

function Row({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: t.text }]}>{title}</Text>
        {detail ? <Text style={{ color: t.textSecondary }}>{detail}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.tint }} />
    </View>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hm: string) => void;
}) {
  const t = useTheme();
  const [h, m] = parseHm(value, [12, 0]);
  const date = new Date(2000, 0, 1, h, m);
  return (
    <View style={styles.row}>
      <Text style={[styles.sub, { color: t.textSecondary }]}>{label}</Text>
      <DateTimePicker
        value={date}
        mode="time"
        display="compact"
        accentColor={t.tint}
        locale="nb-NO"
        minuteInterval={5}
        onChange={(_, d) =>
          d &&
          onChange(
            `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          )
        }
      />
    </View>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { settings } = useStore();
  const portions = householdPortions(settings);
  const [stapleDraft, setStapleDraft] = useState('');

  async function toggleReminder(
    key: 'remindEvening' | 'remindToday' | 'remindExpiry',
    on: boolean,
  ) {
    if (on && !(await requestNotifications())) {
      Alert.alert(
        'Varsler er slått av',
        'Slå på varsler for appen i iPhone-innstillinger for å få påminnelser.',
      );
      return;
    }
    updateSettings({ [key]: on });
  }

  return (
    <Screen>
      <Card>
        <Heading>Husholdning</Heading>
        <Body secondary>
          Alle oppskrifter tilpasser seg dette automatisk. Du kan fortsatt justere én oppskrift
          eller én dag når det trengs.
        </Body>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: t.text }]}>Voksne</Text>
          <Stepper
            value={settings.adults}
            min={0}
            max={12}
            label="voksne"
            onChange={(adults) => updateSettings({ adults, configured: true })}
          />
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: t.text }]}>Barn</Text>
          <Stepper
            value={settings.children}
            min={0}
            max={12}
            label="barn"
            onChange={(children) => updateSettings({ children, configured: true })}
          />
        </View>
        <Text style={{ color: t.textSecondary }}>
          {settings.configured
            ? `${householdLabel(settings)} = ${portions} porsjoner (et barn regnes som en halv voksen).`
            : 'Ikke satt ennå – oppskriftene bruker sine egne porsjoner.'}
        </Text>
        {settings.configured ? (
          <Button
            title="Bruk oppskriftenes egne porsjoner"
            kind="secondary"
            onPress={() => updateSettings({ configured: false })}
          />
        ) : null}
      </Card>

      <Card>
        <Heading>Handleliste</Heading>
        <Text style={[styles.rowTitle, { color: t.text }]}>Sorter varene</Text>
        <SegmentedControl
          value={settings.shoppingSort}
          onChange={(shoppingSort) => updateSettings({ shoppingSort })}
          options={[
            { value: 'recipe', label: 'Alfabetisk' },
            { value: 'department', label: 'Etter avdeling' },
          ]}
        />
      </Card>

      <Card>
        <Heading>Varsler</Heading>
        <Body secondary>
          Du bestemmer selv hva du vil varsles om. Alt er av som standard, og du får aldri varsler
          du ikke har bedt om.
        </Body>
        <Row
          title="Kvelden før middag"
          detail="Hva er til middag i morgen, og husk å ta ut fra fryseren."
          value={settings.remindEvening}
          onChange={(v) => toggleReminder('remindEvening', v)}
        />
        {settings.remindEvening ? (
          <TimeRow
            label="Klokkeslett"
            value={settings.remindEveningTime}
            onChange={(remindEveningTime) => updateSettings({ remindEveningTime })}
          />
        ) : null}
        <Row
          title="Samme dag som middagen"
          detail="Påminnelse på dagen (en time før hvis middagen er tidlig)."
          value={settings.remindToday}
          onChange={(v) => toggleReminder('remindToday', v)}
        />
        {settings.remindToday ? (
          <TimeRow
            label="Klokkeslett"
            value={settings.remindTodayTime}
            onChange={(remindTodayTime) => updateSettings({ remindTodayTime })}
          />
        ) : null}
        <Row
          title="Varer som snart går ut"
          detail="Bare varer der du selv har lagt inn utløpsdato."
          value={settings.remindExpiry}
          onChange={(v) => toggleReminder('remindExpiry', v)}
        />
        {settings.remindExpiry ? (
          <>
            <View style={styles.row}>
              <Text style={[styles.sub, { color: t.textSecondary }]}>Dager før utløp</Text>
              <Stepper
                value={settings.expiryDays}
                min={0}
                max={14}
                label="dager"
                onChange={(expiryDays) => updateSettings({ expiryDays })}
              />
            </View>
            <TimeRow
              label="Klokkeslett"
              value={settings.expiryTime}
              onChange={(expiryTime) => updateSettings({ expiryTime })}
            />
          </>
        ) : null}
        <Row
          title="Tidtakere i kokemodus"
          detail="Varsel når en tidtaker er ferdig, også hvis du har lukket appen."
          value={settings.timerAlerts}
          onChange={(timerAlerts) => updateSettings({ timerAlerts })}
        />
      </Card>

      <Card>
        <Heading>Basisvarer</Heading>
        <Body secondary>
          Ting du alltid har hjemme, for eksempel salt eller smør. De regnes som tilstede i
          oppskriftsforslag når «Basisvarer finnes» er på.
        </Body>
        <View style={styles.chips}>
          {settings.staples.map((st) => (
            <Pressable
              key={st}
              accessibilityRole="button"
              accessibilityLabel={`Fjern ${st} som basisvare`}
              onPress={() => removeStaple(st)}
              style={[styles.chip, { backgroundColor: t.tintSoft }]}
            >
              <Text style={{ color: t.tint, fontWeight: '600', fontSize: 14 }}>{st} ✕</Text>
            </Pressable>
          ))}
          {settings.staples.length === 0 ? (
            <Text style={{ color: t.textSecondary }}>Ingen basisvarer.</Text>
          ) : null}
        </View>
        <TextInput
          accessibilityLabel="Legg til basisvare"
          value={stapleDraft}
          onChangeText={setStapleDraft}
          onSubmitEditing={() => {
            addStaples(stapleDraft);
            setStapleDraft('');
          }}
          submitBehavior="submit"
          placeholder="Legg til, f.eks. smør, mel (trykk Enter)"
          placeholderTextColor={t.textSecondary}
          returnKeyType="done"
          autoCorrect={false}
          style={[
            styles.stapleInput,
            { color: t.text, backgroundColor: t.background, borderColor: t.border },
          ]}
        />
        <Button title="Tilbakestill til standard" kind="secondary" onPress={resetStaples} />
      </Card>

      <Card>
        <Heading>Lager</Heading>
        <Row
          title="Foreslå oppskrifter ut fra lageret"
          detail="Gjelder fanen Lager og oppskriftssiden. Fanen Forslag virker uansett."
          value={settings.stockSuggestions}
          onChange={(stockSuggestions) => updateSettings({ stockSuggestions })}
        />
        {(() => {
          const b = getBarcodeStats();
          return b.scans > 0 ? (
            <Body secondary>
              Strekkoder: {b.scans} skannet. {b.found} funnet i databasen, {b.learned} husket fra
              før, {b.notFound} ikke funnet. Dette viser hvor godt databasen dekker dine varer.
            </Body>
          ) : (
            <Body secondary>
              Prøv å skanne noen varer fra skapet (📷 på Lager). Da ser du her hvor mange som finnes
              i databasen.
            </Body>
          );
        })()}
      </Card>

      <Card>
        <Heading>Import</Heading>
        <Row
          title="Foreslå import av kopierte lenker"
          detail="Når du har kopiert en lenke, spør appen om den skal importeres som oppskrift."
          value={settings.clipboardHint}
          onChange={(clipboardHint) => updateSettings({ clipboardHint })}
        />
      </Card>

      {isCloudConfigured ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/family')}
          style={[styles.link, { backgroundColor: t.card, borderColor: t.border }]}
        >
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: t.text }]}>Familie og deling</Text>
            <Text style={{ color: t.textSecondary }}>Logg inn og del med familien</Text>
          </View>
          <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  sub: { fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 7 },
  stapleInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
