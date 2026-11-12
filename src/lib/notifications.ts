/**
 * Lokale varsler: tidtakere i kokemodus og valgfrie påminnelser om middag.
 * Ingenting planlegges eller spørres om før brukeren selv slår det på eller starter en tidtaker.
 */
import * as Notifications from 'expo-notifications';
import { getState, onStateChange } from './store';
import { planReminders } from './reminders';

const PREFIX = 'rem-';
let handlerSet = false;

function ensureHandler() {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function notificationsAllowed(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Ber iOS om lov. Returnerer om det ble gitt. */
export async function requestNotifications(): Promise<boolean> {
  try {
    ensureHandler();
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Planlegger et varsel om `seconds` sekunder. Returnerer id, eller null hvis varsler ikke er tillatt. */
export async function scheduleTimerNotification(
  seconds: number,
  title: string,
  body: string,
): Promise<string | null> {
  try {
    ensureHandler();
    if (!(await notificationsAllowed())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + seconds * 1000),
      },
    });
  } catch {
    return null;
  }
}

export async function cancelNotification(id: string | null | undefined) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Varselet kan allerede være levert.
  }
}

/** Legger påminnelser klare i tråd med innstillinger og middagsplan. Tidtakere berøres ikke. */
export async function syncReminders() {
  try {
    ensureHandler();
    const s = getState();
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (n.identifier.startsWith(PREFIX))
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (!s.settings.remindEvening && !s.settings.remindToday) return;
    if (!(await notificationsAllowed())) return;
    const reminders = planReminders({
      plan: s.plan,
      recipes: s.recipes,
      inventory: s.fridge.items,
      settings: s.settings,
    });
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: PREFIX + r.id,
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
    }
  } catch {
    // Påminnelser er en bonus; feil skal aldri påvirke resten av appen.
  }
}

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Holder påminnelsene oppdatert når plan, oppskrifter, lager eller innstillinger endres. */
export function initReminders() {
  if (started) return;
  started = true;
  onStateChange((prev, next) => {
    if (
      prev.plan === next.plan &&
      prev.recipes === next.recipes &&
      prev.fridge === next.fridge &&
      prev.settings === next.settings
    ) {
      return;
    }
    if (
      !next.settings.remindEvening &&
      !next.settings.remindToday &&
      !prev.settings.remindEvening &&
      !prev.settings.remindToday
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncReminders(), 1000);
  });
  void syncReminders();
}
