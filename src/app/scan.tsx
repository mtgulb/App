import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, ErrorText, Field } from '@/components/ui';
import { t as tr } from '@/i18n';
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
        <Body>{tr('scan.needCamera')}</Body>
        {permission.canAskAgain ? (
          <Button title={tr('scan.grantCamera')} onPress={requestPermission} />
        ) : (
          <Button title={tr('scan.openSettings')} onPress={() => Linking.openSettings()} />
        )}
        <Button title={tr('scan.close')} kind="secondary" onPress={() => router.back()} />
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
      ? tr('scan.addToShopping')
      : target === 'session'
        ? tr('scan.add')
        : tr('scan.addToStock');

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
        <Text style={styles.hint}>{tr('scan.holdInFrame')}</Text>
      </View>

      <View style={[styles.sheet, { backgroundColor: t.card }]}>
        {busy ? (
          <View style={styles.row}>
            <ActivityIndicator color={t.tint} />
            <Body secondary>{tr('scan.lookingUp')}</Body>
          </View>
        ) : scanned ? (
          <>
            {scanned.productText ? (
              <Text style={{ color: t.textSecondary, fontSize: 13 }} numberOfLines={2}>
                {tr('scan.product', { text: scanned.productText })}
                {scanned.source === 'found' ? `\n${tr('scan.source')}` : ''}
              </Text>
            ) : (
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>{tr('scan.notFound')}</Text>
            )}
            <ErrorText>{scanned.message}</ErrorText>
            <Field
              label={tr('scan.fieldLabel')}
              value={name}
              onChangeText={setName}
              placeholder={tr('scan.fieldPlaceholder')}
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
            <Button title={tr('scan.skip')} kind="secondary" onPress={next} />
          </>
        ) : (
          <Body secondary>
            {added.length > 0 ? tr('scan.added', { items: added.join(', ') }) : ''}
            {tr('scan.next')}
          </Body>
        )}
        <Button
          title={tr('scan.done')}
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
