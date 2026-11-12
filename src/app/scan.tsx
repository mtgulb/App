import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, ErrorText, Field } from '@/components/ui';
import { lookupBarcode, rememberBarcode } from '@/lib/barcode';
import { isValidGtin, suggestedName } from '@/lib/barcodeParse';
import { displayIngredient, identifyIngredient } from '@/lib/productName';
import { addSessionItems } from '@/lib/session';
import { addExtra, addFridgeItems, getState } from '@/lib/store';
import { radius, useTheme } from '@/theme/colors';

type Scanned = {
  code: string;
  /** Produktnavnet slik det står i databasen (til visning), evt. tomt. */
  productText: string;
  source: 'learned' | 'found' | 'notFound' | 'error';
  candidates: string[];
  message?: string;
};

/**
 * Skann strekkoden på en vare. Produktnavn («Green Giant Sweet Corn 200 g») gjøres om til råvare («Mais»),
 * slik at varen kan knyttes til oppskrifter. Du kan rette forslaget, og appen husker valget.
 * `target`: `stock` (lager, gitt av `place`), `shopping` (handleliste) eller `session` (Forslag-fanen).
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

    if (result.status === 'learned') {
      // Brukeren har valgt råvare for denne varen før: gå rett til bekreftelse.
      setName(displayIngredient(result.product.name));
      setScanned({
        code,
        productText: result.productText ?? '',
        source: 'learned',
        candidates: [],
      });
    } else if (result.status === 'found') {
      const id = identifyIngredient({
        name: result.product.name,
        brand: result.product.brand,
        categories: result.product.categories,
      });
      const productText = [result.product.brand, result.product.name, result.product.quantity]
        .filter(Boolean)
        .join(' ');
      setName(id.ingredient ? displayIngredient(id.ingredient) : suggestedName(result.product));
      setScanned({ code, productText, source: 'found', candidates: id.candidates });
    } else {
      setName('');
      setScanned({
        code,
        productText: '',
        source: result.status === 'error' ? 'error' : 'notFound',
        candidates: [],
        message: result.status === 'error' ? result.message : undefined,
      });
    }
  }

  function confirm() {
    if (!scanned || !name.trim()) return;
    const n = name.trim();
    // Husk valget (råvare + produkttekst), så neste skanning av samme vare går rett gjennom.
    rememberBarcode(scanned.code, {
      name: n.toLowerCase(),
      productText: scanned.productText || undefined,
    });
    if (target === 'shopping') addExtra(n);
    else if (target === 'session') addSessionItems(n);
    else {
      addFridgeItems(n, {
        place: place || getState().fridge.storages[0].id,
        product: scanned.productText || undefined,
      });
    }
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

  const verb =
    target === 'shopping'
      ? 'Legg på handlelisten'
      : target === 'session'
        ? 'Legg til'
        : 'Legg på lager';

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
            {scanned.productText ? (
              <Text style={{ color: t.textSecondary, fontSize: 13 }} numberOfLines={2}>
                Produkt: {scanned.productText}
              </Text>
            ) : (
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                Fant ikke varen. Skriv hva det er, så husker appen den.
              </Text>
            )}
            <ErrorText>{scanned.message}</ErrorText>
            <Field
              label="Legg til som (råvare, slik den står i oppskrifter)"
              value={name}
              onChangeText={setName}
              placeholder="F.eks. mais"
            />
            {scanned.candidates.length > 1 ? (
              <View style={styles.chips}>
                {scanned.candidates.map((c) => (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    onPress={() => setName(displayIngredient(c))}
                  >
                    <View style={[styles.chip, { backgroundColor: t.tintSoft }]}>
                      <Text style={{ color: t.tint, fontWeight: '600', fontSize: 13 }}>
                        {displayIngredient(c)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Button title={verb} onPress={confirm} disabled={!name.trim()} />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 300,
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
