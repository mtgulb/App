/**
 * Tekster og språk. Norsk bokmål (`nb`) er kilden; andre språk legges til som egne mapper
 * (`src/i18n/en/…`) og trenger bare å oversette nøklene de har. Manglende nøkler faller tilbake til norsk.
 *
 * Bruk: `t('shopping.title')`, `t('shopping.recipes', { count: 2 })`.
 * Flertall: lag to nøkler, `x_one` og `x_other`, og kall `t('x', { count })`.
 * Parametre skrives `{navn}` i teksten.
 * Ren TypeScript uten React Native, så den kan testes i Node.
 */
import { nb, type Messages } from './nb/index.ts';
import { en } from './en/index.ts';

export type Locale = 'nb' | 'en';
type Key = keyof Messages;
type Base<K> = K extends `${infer B}_${'one' | 'other'}` ? B : K;
export type MessageKey = Base<Key>;
export type Params = Record<string, string | number>;

const dictionaries: Record<Locale, Partial<Record<string, string>>> = { nb, en };
/** Språk appen faktisk er oversatt til. Legg til `en` her når engelsk er ferdig. */
export const SUPPORTED: Locale[] = ['nb'];

/** Velger språk ut fra telefonens språkkode (f.eks. «nb-NO», «nn-NO», «en-GB»). */
export function pickLocale(tag: string | undefined, supported: Locale[] = SUPPORTED): Locale {
  const lang = (tag ?? '').toLowerCase().split(/[-_]/)[0];
  const mapped: Locale | undefined =
    lang === 'nb' || lang === 'nn' || lang === 'no' ? 'nb' : lang === 'en' ? 'en' : undefined;
  return mapped && supported.includes(mapped) ? mapped : 'nb';
}

function deviceTag(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

let current: Locale = pickLocale(deviceTag());

export const getLocale = (): Locale => current;
export function setLocale(l: Locale) {
  current = l;
}
/** Språkkode for dato- og tallformat (`toLocaleDateString(dateTag(), …)`). */
export const dateTag = (): string => (current === 'nb' ? 'nb-NO' : 'en-GB');

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

function lookup(locale: Locale, key: string): string | undefined {
  return dictionaries[locale][key];
}

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const count = params && typeof params.count === 'number' ? params.count : undefined;
  const forms = count === undefined ? [] : [count === 1 ? `${key}_one` : `${key}_other`];
  for (const l of locale === 'nb' ? (['nb'] as Locale[]) : [locale, 'nb' as Locale]) {
    for (const k of [...forms, key]) {
      const text = lookup(l, k);
      if (text !== undefined) return fill(text, params);
    }
  }
  return key;
}

export const t = (key: MessageKey, params?: Params): string => translate(current, key, params);
