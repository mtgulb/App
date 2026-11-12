import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, ErrorText, Field, Heading } from '@/components/ui';
import {
  createHousehold,
  deleteAccount,
  joinHousehold,
  leaveHousehold,
  regenerateInviteCode,
  signIn,
  signOut,
  signUp,
  useCloud,
} from '@/lib/cloud/sync';
import { useTheme } from '@/theme/colors';
import { dateTag, t as tr } from '@/i18n';

const timeFmt = () => new Intl.DateTimeFormat(dateTag(), { hour: '2-digit', minute: '2-digit' });
const groupCode = (c: string) => (c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);

function confirmDeleteAccount() {
  Alert.alert(tr('family.deleteTitle'), tr('family.deleteBody'), [
    { text: tr('common.cancel'), style: 'cancel' },
    {
      text: tr('family.deleteConfirm'),
      style: 'destructive',
      onPress: async () => {
        if (await deleteAccount()) Alert.alert(tr('family.deletedTitle'), tr('family.deletedBody'));
      },
    },
  ]);
}

export default function FamilyScreen() {
  const cloud = useCloud();
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [houseName, setHouseName] = useState('');
  const [myName, setMyName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (cloud.status === 'off') {
    return (
      <Screen>
        <Card>
          <Heading>{tr('family.offTitle')}</Heading>
          <Body secondary>{tr('family.offBody')}</Body>
        </Card>
      </Screen>
    );
  }

  if (cloud.status === 'loading') {
    return (
      <Screen>
        <Body secondary>{tr('family.loading')}</Body>
      </Screen>
    );
  }

  if (cloud.status === 'signedOut') {
    return (
      <Screen>
        <Card>
          <Heading>{tr('family.signInTitle')}</Heading>
          <Body secondary>{tr('family.signInBody')}</Body>
          <Field
            label={tr('family.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label={tr('family.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
          <ErrorText>{cloud.error}</ErrorText>
          <Button
            title={tr('family.signIn')}
            loading={busy}
            disabled={!email.trim() || password.length < 6}
            onPress={() => run(() => signIn(email, password))}
          />
          <Button
            title={tr('family.signUp')}
            kind="secondary"
            disabled={busy || !email.trim() || password.length < 6}
            onPress={() => run(() => signUp(email, password))}
          />
        </Card>
      </Screen>
    );
  }

  if (cloud.status === 'noHousehold') {
    return (
      <Screen>
        <Body secondary>{tr('family.signedInAs', { email: cloud.email ?? '' })}</Body>
        <Card>
          <Heading>{tr('family.createTitle')}</Heading>
          <Body secondary>{tr('family.createBody')}</Body>
          <Field
            label={tr('family.houseName')}
            value={houseName}
            onChangeText={setHouseName}
            placeholder={tr('family.houseNamePlaceholder')}
          />
          <Field label={tr('family.yourName')} value={myName} onChangeText={setMyName} />
          <Button
            title={tr('family.create')}
            loading={busy}
            disabled={!houseName.trim()}
            onPress={() => run(() => createHousehold(houseName, myName))}
          />
        </Card>
        <Card>
          <Heading>{tr('family.joinTitle')}</Heading>
          <Field
            label={tr('family.inviteCode')}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ABCDE-12345"
          />
          <Field label={tr('family.yourName')} value={myName} onChangeText={setMyName} />
          <Button
            title={tr('family.join')}
            kind="secondary"
            disabled={busy || code.trim().length < 6}
            onPress={() => run(() => joinHousehold(code, myName))}
          />
        </Card>
        <ErrorText>{cloud.error}</ErrorText>
        <Button title={tr('family.signOut')} kind="secondary" onPress={() => run(signOut)} />
        <Button title={tr('family.deleteMine')} kind="destructive" onPress={confirmDeleteAccount} />
      </Screen>
    );
  }

  const h = cloud.household!;
  const isOwner = h.role === 'owner';
  const status = cloud.error
    ? cloud.error
    : cloud.syncing
      ? tr('family.syncing')
      : cloud.lastSync
        ? tr('family.syncedAt', { time: timeFmt().format(new Date(cloud.lastSync)) })
        : tr('family.syncWaiting');

  return (
    <Screen>
      <Card>
        <Heading>{h.name}</Heading>
        <Text style={{ color: cloud.error ? t.danger : t.textSecondary }}>{status}</Text>
      </Card>

      <Card>
        <Heading>{tr('family.inviteTitle')}</Heading>
        <Body secondary>{tr('family.inviteBody')}</Body>
        <Text
          style={[styles.code, { color: t.tint }]}
          selectable
          accessibilityLabel={tr('family.codeLabel', { code: groupCode(h.inviteCode) })}
        >
          {groupCode(h.inviteCode)}
        </Text>
        <Button
          title={tr('family.shareCode')}
          onPress={() =>
            Share.share({
              message: tr('family.shareMessage', { name: h.name, code: groupCode(h.inviteCode) }),
            })
          }
        />
        {isOwner ? (
          <Button
            title={tr('family.newCode')}
            kind="secondary"
            onPress={() =>
              Alert.alert(tr('family.newCodeTitle'), tr('family.newCodeBody'), [
                { text: tr('common.cancel'), style: 'cancel' },
                { text: tr('family.newCodeConfirm'), onPress: () => void regenerateInviteCode() },
              ])
            }
          />
        ) : null}
      </Card>

      <Card>
        <Heading>{tr('family.members', { count: cloud.members.length })}</Heading>
        {cloud.members.map((m) => (
          <View key={m.userId} style={styles.member}>
            <Text style={[styles.memberName, { color: t.text }]}>
              {m.displayName}
              {m.userId === cloud.userId ? tr('family.you') : ''}
            </Text>
            <Text style={{ color: t.textSecondary }}>
              {m.role === 'owner' ? tr('family.owner') : tr('family.member')}
            </Text>
          </View>
        ))}
      </Card>

      <Button
        title={tr('family.leave')}
        kind="destructive"
        onPress={() =>
          Alert.alert(tr('family.leaveTitle'), tr('family.leaveBody'), [
            { text: tr('common.cancel'), style: 'cancel' },
            {
              text: tr('family.leaveConfirm'),
              style: 'destructive',
              onPress: () => void leaveHousehold(),
            },
          ])
        }
      />
      <Button title={tr('family.signOut')} kind="secondary" onPress={() => run(signOut)} />
      <Button title={tr('family.deleteMine')} kind="destructive" onPress={confirmDeleteAccount} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 8,
  },
  member: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '600' },
});
