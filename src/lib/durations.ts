import { t } from '../i18n/index.ts';

export type StepTimer = { seconds: number; label: string };

const UNIT_SECONDS: Record<string, number> = {
  sek: 1,
  sekund: 1,
  sekunder: 1,
  min: 60,
  minutt: 60,
  minutter: 60,
  time: 3600,
  timer: 3600,
  timen: 3600,
};

const NUM = '\\d+(?:[.,]\\d+)?';
// «10 min», «10–15 minutter», «1,5 time». Kun tidsenheter, så «200 grader» og «5 dl» ignoreres.
const PATTERN = new RegExp(
  `(${NUM})(?:\\s*[-–]\\s*${NUM})?\\s*(sekunder|sekund|sek|minutter|minutt|min|timer|timen|time)(?![a-zæøå])`,
  'gi',
);

const toNum = (s: string) => parseFloat(s.replace(',', '.'));

/** Finner tidsangivelser i et steg, f.eks. «Stek i 10–15 minutter» → 10 min. Ved intervall brukes laveste verdi. */
export function findTimers(step: string): StepTimer[] {
  const found: (StepTimer & { start: number; end: number })[] = [];
  for (const m of step.matchAll(PATTERN)) {
    const seconds = Math.round(toNum(m[1]) * UNIT_SECONDS[m[2].toLowerCase()]);
    if (seconds > 0) {
      found.push({ seconds, label: m[0].trim(), start: m.index!, end: m.index! + m[0].length });
    }
  }
  // «1 time og 30 minutter» slås sammen til én tidtaker.
  const merged: StepTimer[] = [];
  for (let i = 0; i < found.length; i++) {
    const cur = found[i];
    const next = found[i + 1];
    if (next && /^\s*(og|,)\s*$/i.test(step.slice(cur.end, next.start))) {
      merged.push({
        seconds: cur.seconds + next.seconds,
        label: t('lib.timerJoin', { a: cur.label, b: next.label }),
      });
      i++;
    } else {
      merged.push({ seconds: cur.seconds, label: cur.label });
    }
  }
  return merged;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}
