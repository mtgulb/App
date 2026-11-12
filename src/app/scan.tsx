import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Body, Button, ErrorText, Field } from '@/components/ui';
import { lookupBarcode, rememberBarcode } from '@/lib/barcode';
import { isValidGtin, suggestedName } from '@/lib/barcodeParse';
import { addExtra, addFridgeItems, getState } from '@/lib/store';
import { radius, useTheme } from '@/theme/colors';

type Scanned = {
  code: string;
  name: string;
  source: 'learned' | 'found' | 'notFound' | 'error';
  message?: string;
  detail?: string;
};

/**
 * Skann strekkoden på en vare. `target=stock` legger varen på lageret (i lageret gitt av `place`),
 * `target=shopping` legger den på handlelisten. Fortsetter å skanne til du lukker.
 */
export default function ScanScreen() {
  const t = useTheme();
  const router = useRouter();
  const { target, place } = useLocalSearchParams<{ target?: string; place?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<Scanned | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const lock = useRef(false);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Body>Appen trenger kameraet for å skanne strekkoder.</Body>
        {permission.canAskAgain ? (
          <Button title="Gi tilgang til kamera" onPress={requestPermission} />
        ) : (
          <Button title="Åpne Innstillinger" onPress={() => Linking.openSettings()} />
        )}
        <Button title="Lukk" kind="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  async function onScan(code: string) {
    if (lock.current || !isValidGtin(code)) return;
    lock.current = true;
    setBusy(true);
    const result = await lookupBarcode(code);
    setBusy(false);
    if (result.status === 'found' || result.status === 'learned') {
      const n = result.status === 'found' ? suggestedName(result.product) : result.product.name;
      setName(n);
      setScanned({
        code,
        name: n,
        source: result.status,
        detail:
          [result.product.brand, result.product.quantity].filter(Boolean).join(' · ') || undefined,
      });
    } else {
      setName('');
      setScanned({
        code,
        name: '',
        source: result.status === 'error' ? 'error' : 'notFound',
        message: result.status === 'error' ? result.message : undefined,
      });
    }
  }

  function confirm() {
    if (!scanned || !name.trim()) return;
    const n = name.trim();
    // Husk navnet så neste skanning av samme vare går rett gjennom.
    if (scanned.source !== 'learned' || n !== scanned.name)
      rememberBarcode(scanned.code, { name: n });
    if (target === 'shopping') addExtra(n);
    else addFridgeItems(n, { place: place || getState().fridge.storages[0].id });
    setAdded((a) => [...a, n]);
    next();
  }

  function next() {
    setScanned(null);
    setName('');
    // Kort pause så samme kode ikke leses på nytt med en gang.
    setTimeout(() => {
      lock.current = false;
    }, 1200);
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanned || busy ? undefined : (r) => void onScan(r.data)}
      />
      <View pointerEvents="none" style={styles.frameWrap}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Hold strekkoden innenfor rammen</Text>
      </View>

      <View style={[styles.sheet, { backgroundColor: t.card }]}>
        {busy ? (
          <View style={styles.row}>
            <ActivityIndicator color={t.tint} />
            <Body secondary>Slår opp varen …</Body>
          </View>
        ) : scanned ? (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 13 }}>
              {scanned.source === 'found'
                ? 'Funnet i Open Food Facts'
                : scanned.source === 'learned'
                  ? 'Du har skannet denne før'
                  : 'Fant ikke varen. Skriv navnet, så husker appen den.'}
              {scanned.detail ? ` · ${scanned.detail}` : ''}
            </Text>
            <ErrorText>{scanned.message}</ErrorText>
            <Field label="Navn" value={name} onChangeText={setName} placeholder="F.eks. lettmelk" />
            <Button
              title={target === 'shopping' ? 'Legg på handlelisten' : 'Legg på lager'}
              onPress={confirm}
              disabled={!name.trim()}
            />
            <Button title="Hopp over" kind="secondary" onPress={next} />
          </>
        ) : (
          <Body secondary>
            {added.length > 0 ? `Lagt til: ${added.join(', ')}. ` : ''}
            Skann neste vare, eller lukk når du er ferdig.
          </Body>
        )}
        <Button
          title="Ferdig"
          kind={scanned ? 'destructive' : 'secondary'}
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  frame: { width: 280, height: 160, borderRadius: 16, borderWidth: 3, borderColor: '#FFFFFF' },
  hint: { color: '#FFFFFF', fontWeight: '600' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 34,
    gap: 10,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
  },
});
