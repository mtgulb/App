import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { BackupCard } from '@/components/BackupCard';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Heading, SegmentedControl, Stepper } from '@/components/ui';
import { getBarcodeStats } from '@/lib/barcode';
import { isCloudConfigured } from '@/lib/cloud/config';
import { requestNotifications } from '@/lib/notifications';
import { parseHm } from '@/lib/reminders';
import { householdLabel, householdPortions } from '@/lib/portions';
import { addStaples, removeStaple, resetStaples, updateSettings, useStore } from '@/lib/store';
import { dateTag, t as tr } from '@/i18n';
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
        locale={dateTag()}
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
      Alert.alert(tr('settings.notificationsOffTitle'), tr('settings.notificationsOffBody'));
      return;
    }
    updateSettings({ [key]: on });
  }

  return (
    <Screen>
      <Card>
        <Heading>{tr('settings.household')}</Heading>
        <Body secondary>{tr('settings.householdInfo')}</Body>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: t.text }]}>{tr('settings.adults')}</Text>
          <Stepper
            value={settings.adults}
            min={0}
            max={12}
            label={tr('settings.adultsLabel')}
            onChange={(adults) => updateSettings({ adults, configured: true })}
          />
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: t.text }]}>{tr('settings.children')}</Text>
          <Stepper
            value={settings.children}
            min={0}
            max={12}
            label={tr('settings.childrenLabel')}
            onChange={(children) => updateSettings({ children, configured: true })}
          />
        </View>
        <Text style={{ color: t.textSecondary }}>
          {settings.configured
            ? tr('settings.portionsSummary', { label: householdLabel(settings), portions })
            : tr('settings.notConfigured')}
        </Text>
        {settings.configured ? (
          <Button
            title={tr('settings.useRecipePortions')}
            kind="secondary"
            onPress={() => updateSettings({ configured: false })}
          />
        ) : null}
      </Card>

      <Card>
        <Heading>{tr('settings.shopping')}</Heading>
        <Text style={[styles.rowTitle, { color: t.text }]}>{tr('settings.sortItems')}</Text>
        <SegmentedControl
          value={settings.shoppingSort}
          onChange={(shoppingSort) => updateSettings({ shoppingSort })}
          options={[
            { value: 'recipe', label: tr('settings.sortAlpha') },
            { value: 'department', label: tr('settings.sortDepartment') },
          ]}
        />
      </Card>

      <Card>
        <Heading>{tr('settings.notifications')}</Heading>
        <Body secondary>{tr('settings.notificationsInfo')}</Body>
        <Row
          title={tr('settings.remindEvening')}
          detail={tr('settings.remindEveningDetail')}
          value={settings.remindEvening}
          onChange={(v) => toggleReminder('remindEvening', v)}
        />
        {settings.remindEvening ? (
          <TimeRow
            label={tr('settings.time')}
            value={settings.remindEveningTime}
            onChange={(remindEveningTime) => updateSettings({ remindEveningTime })}
          />
        ) : null}
        <Row
          title={tr('settings.remindToday')}
          detail={tr('settings.remindTodayDetail')}
          value={settings.remindToday}
          onChange={(v) => toggleReminder('remindToday', v)}
        />
        {settings.remindToday ? (
          <TimeRow
            label={tr('settings.time')}
            value={settings.remindTodayTime}
            onChange={(remindTodayTime) => updateSettings({ remindTodayTime })}
          />
        ) : null}
        <Row
          title={tr('settings.remindExpiry')}
          detail={tr('settings.remindExpiryDetail')}
          value={settings.remindExpiry}
          onChange={(v) => toggleReminder('remindExpiry', v)}
        />
        {settings.remindExpiry ? (
          <>
            <View style={styles.row}>
              <Text style={[styles.sub, { color: t.textSecondary }]}>
                {tr('settings.expiryDaysBefore')}
              </Text>
              <Stepper
                value={settings.expiryDays}
                min={0}
                max={14}
                label={tr('settings.daysLabel')}
                onChange={(expiryDays) => updateSettings({ expiryDays })}
              />
            </View>
            <TimeRow
              label={tr('settings.time')}
              value={settings.expiryTime}
              onChange={(expiryTime) => updateSettings({ expiryTime })}
            />
          </>
        ) : null}
        <Row
          title={tr('settings.timerAlerts')}
          detail={tr('settings.timerAlertsDetail')}
          value={settings.timerAlerts}
          onChange={(timerAlerts) => updateSettings({ timerAlerts })}
        />
      </Card>

      <Card>
        <Heading>{tr('settings.staples')}</Heading>
        <Body secondary>{tr('settings.staplesInfo')}</Body>
        <View style={styles.chips}>
          {settings.staples.map((st) => (
            <Pressable
              key={st}
              accessibilityRole="button"
              accessibilityLabel={tr('settings.stapleRemove', { name: st })}
              onPress={() => removeStaple(st)}
              style={[styles.chip, { backgroundColor: t.tintSoft }]}
            >
              <Text style={{ color: t.tint, fontWeight: '600', fontSize: 14 }}>
                {tr('settings.stapleChip', { name: st })}
              </Text>
            </Pressable>
          ))}
          {settings.staples.length === 0 ? (
            <Text style={{ color: t.textSecondary }}>{tr('settings.stapleNone')}</Text>
          ) : null}
        </View>
        <TextInput
          accessibilityLabel={tr('settings.stapleAdd')}
          value={stapleDraft}
          onChangeText={setStapleDraft}
          onSubmitEditing={() => {
            addStaples(stapleDraft);
            setStapleDraft('');
          }}
          submitBehavior="submit"
          placeholder={tr('settings.stapleAddPlaceholder')}
          placeholderTextColor={t.textSecondary}
          returnKeyType="done"
          autoCorrect={false}
          style={[
            styles.stapleInput,
            { color: t.text, backgroundColor: t.background, borderColor: t.border },
          ]}
        />
        <Button title={tr('settings.stapleReset')} kind="secondary" onPress={resetStaples} />
      </Card>

      <Card>
        <Heading>{tr('settings.stock')}</Heading>
        <Row
          title={tr('settings.stockSuggestions')}
          detail={tr('settings.stockSuggestionsDetail')}
          value={settings.stockSuggestions}
          onChange={(stockSuggestions) => updateSettings({ stockSuggestions })}
        />
        {(() => {
          const b = getBarcodeStats();
          return b.scans > 0 ? (
            <Body secondary>
              {tr('settings.barcodeStats', {
                scans: b.scans,
                found: b.found,
                learned: b.learned,
                notFound: b.notFound,
              })}
            </Body>
          ) : (
            <Body secondary>{tr('settings.barcodeTry')}</Body>
          );
        })()}
      </Card>

      <Card>
        <Heading>{tr('settings.import')}</Heading>
        <Row
          title={tr('settings.clipboardHint')}
          detail={tr('settings.clipboardHintDetail')}
          value={settings.clipboardHint}
          onChange={(clipboardHint) => updateSettings({ clipboardHint })}
        />
      </Card>

      <BackupCard />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/trash')}
        style={[styles.link, { backgroundColor: t.card, borderColor: t.border }]}
      >
        <View style={styles.flex}>
          <Text style={[styles.rowTitle, { color: t.text }]}>{tr('trash.title')}</Text>
          <Text style={{ color: t.textSecondary }}>{tr('trash.subtitle')}</Text>
        </View>
        <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/about')}
        style={[styles.link, { backgroundColor: t.card, borderColor: t.border }]}
      >
        <View style={styles.flex}>
          <Text style={[styles.rowTitle, { color: t.text }]}>{tr('settings.aboutLink')}</Text>
          <Text style={{ color: t.textSecondary }}>{tr('settings.aboutLinkDetail')}</Text>
        </View>
        <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
      </Pressable>

      {isCloudConfigured ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/family')}
          style={[styles.link, { backgroundColor: t.card, borderColor: t.border }]}
        >
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: t.text }]}>{tr('settings.familyLink')}</Text>
            <Text style={{ color: t.textSecondary }}>{tr('settings.familyLinkDetail')}</Text>
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
