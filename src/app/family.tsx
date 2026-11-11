import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, ErrorText, Field, Heading } from '@/components/ui';
import {
  createHousehold,
  joinHousehold,
  leaveHousehold,
  regenerateInviteCode,
  signIn,
  signOut,
  signUp,
  useCloud,
} from '@/lib/cloud/sync';
import { useTheme } from '@/theme/colors';

const timeFmt = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' });
const groupCode = (c: string) => (c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);

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
          <Heading>Familiedeling er ikke satt opp ennå</Heading>
          <Body secondary>
            Når familiedeling er koblet til, kan hele familien se de samme oppskriftene,
            handlelisten, kjøleskapet og middagsplanen, og endringer vises hos alle med en gang. Alt
            fungerer som vanlig på din telefon i mellomtiden.
          </Body>
        </Card>
      </Screen>
    );
  }

  if (cloud.status === 'loading') {
    return (
      <Screen>
        <Body secondary>Laster …</Body>
      </Screen>
    );
  }

  if (cloud.status === 'signedOut') {
    return (
      <Screen>
        <Card>
          <Heading>Logg inn eller opprett konto</Heading>
          <Body secondary>
            Kontoen brukes bare til å dele data med familien din. Oppskriftene på telefonen din
            beholdes.
          </Body>
          <Field
            label="E-post"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label="Passord (minst 6 tegn)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
          <ErrorText>{cloud.error}</ErrorText>
          <Button
            title="Logg inn"
            loading={busy}
            disabled={!email.trim() || password.length < 6}
            onPress={() => run(() => signIn(email, password))}
          />
          <Button
            title="Opprett konto"
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
        <Body secondary>Innlogget som {cloud.email}</Body>
        <Card>
          <Heading>Opprett en husholdning</Heading>
          <Body secondary>
            De som får koden din kan dele alt: oppskrifter, handleliste, kjøleskap og plan. Det du
            har fra før lastes opp.
          </Body>
          <Field
            label="Navn på husholdningen"
            value={houseName}
            onChangeText={setHouseName}
            placeholder="F.eks. Familien Hansen"
          />
          <Field label="Ditt navn" value={myName} onChangeText={setMyName} />
          <Button
            title="Opprett"
            loading={busy}
            disabled={!houseName.trim()}
            onPress={() => run(() => createHousehold(houseName, myName))}
          />
        </Card>
        <Card>
          <Heading>Bli med med kode</Heading>
          <Field
            label="Invitasjonskode"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ABCDE-12345"
          />
          <Field label="Ditt navn" value={myName} onChangeText={setMyName} />
          <Button
            title="Bli med"
            kind="secondary"
            disabled={busy || code.trim().length < 6}
            onPress={() => run(() => joinHousehold(code, myName))}
          />
        </Card>
        <ErrorText>{cloud.error}</ErrorText>
        <Button title="Logg ut" kind="destructive" onPress={() => run(signOut)} />
      </Screen>
    );
  }

  const h = cloud.household!;
  const isOwner = h.role === 'owner';
  const status = cloud.error
    ? cloud.error
    : cloud.syncing
      ? 'Synkroniserer …'
      : cloud.lastSync
        ? `Synkronisert kl. ${timeFmt.format(new Date(cloud.lastSync))}`
        : 'Venter på synk';

  return (
    <Screen>
      <Card>
        <Heading>{h.name}</Heading>
        <Text style={{ color: cloud.error ? t.danger : t.textSecondary }}>{status}</Text>
      </Card>

      <Card>
        <Heading>Inviter familien</Heading>
        <Body secondary>
          Del koden. Den som skriver den inn under «Bli med» får tilgang til alt.
        </Body>
        <Text
          style={[styles.code, { color: t.tint }]}
          selectable
          accessibilityLabel={`Kode ${groupCode(h.inviteCode)}`}
        >
          {groupCode(h.inviteCode)}
        </Text>
        <Button
          title="Del koden"
          onPress={() =>
            Share.share({
              message: `Bli med i «${h.name}» i oppskriftsappen vår. Kode: ${groupCode(h.inviteCode)}`,
            })
          }
        />
        {isOwner ? (
          <Button
            title="Lag ny kode (den gamle slutter å virke)"
            kind="secondary"
            onPress={() =>
              Alert.alert(
                'Lage ny kode?',
                'Den gamle koden slutter å virke. De som allerede er med, beholder tilgangen.',
                [
                  { text: 'Avbryt', style: 'cancel' },
                  { text: 'Lag ny', onPress: () => void regenerateInviteCode() },
                ],
              )
            }
          />
        ) : null}
      </Card>

      <Card>
        <Heading>Medlemmer ({cloud.members.length})</Heading>
        {cloud.members.map((m) => (
          <View key={m.userId} style={styles.member}>
            <Text style={[styles.memberName, { color: t.text }]}>
              {m.displayName}
              {m.userId === cloud.userId ? ' (deg)' : ''}
            </Text>
            <Text style={{ color: t.textSecondary }}>{m.role === 'owner' ? 'Eier' : 'Medlem'}</Text>
          </View>
        ))}
      </Card>

      <Button
        title="Forlat husholdningen"
        kind="destructive"
        onPress={() =>
          Alert.alert(
            'Forlate husholdningen?',
            'Du beholder din egen kopi av oppskriftene, men slutter å dele med familien.',
            [
              { text: 'Avbryt', style: 'cancel' },
              { text: 'Forlat', style: 'destructive', onPress: () => void leaveHousehold() },
            ],
          )
        }
      />
      <Button title="Logg ut" kind="secondary" onPress={() => run(signOut)} />
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
