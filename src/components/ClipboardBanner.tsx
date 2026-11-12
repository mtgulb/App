import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { useStore } from '@/lib/store';
import { radius, shadow, useTheme } from '@/theme/colors';

/**
 * Foreslår å importere en lenke brukeren har kopiert. «Har lenke?» sjekkes uten å lese innholdet,
 * så iOS spør bare om tilgang når brukeren selv trykker «Importer».
 */
export function ClipboardBanner() {
  const t = useTheme();
  const router = useRouter();
  const { settings } = useStore();
  const [hasUrl, setHasUrl] = useState(false);

  useEffect(() => {
    if (!settings.clipboardHint) return;
    let alive = true;
    const check = async () => {
      try {
        const has = await Clipboard.hasUrlAsync();
        if (alive) setHasUrl(has);
      } catch {
        // Utklippstavlen er ikke tilgjengelig; ingen forslag.
      }
    };
    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [settings.clipboardHint]);

  if (!settings.clipboardHint || !hasUrl) return null;

  async function importIt() {
    try {
      const url = await Clipboard.getUrlAsync();
      setHasUrl(false);
      if (url) router.push({ pathname: '/import', params: { url } });
    } catch {
      setHasUrl(false);
    }
  }

  return (
    <View style={[styles.card, shadow, { backgroundColor: t.card }]}>
      <Text style={[styles.title, { color: t.text }]}>Du har kopiert en lenke</Text>
      <Text style={{ color: t.textSecondary }}>Er det en oppskrift du vil legge inn?</Text>
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button title="Importer" onPress={importIt} />
        </View>
        <View style={styles.flex}>
          <Button title="Ikke nå" kind="secondary" onPress={() => setHasUrl(false)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius, padding: 16, gap: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 6 },
});
