import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { RecordView } from '../../db/records';
import { formatPartialDate, isFullDate, notificationId, upcomingAnniversaries } from '../../lib/anniversary';
import { folderDisplayName } from '../../lib/format';
import type { Reminders } from '../../state/settings';

// Anniversary reminders are scheduled on the phone with Android's alarm
// service. No server is involved. They're rebuilt after each sync and whenever
// dates, shelf order or reminder settings change.

const native = Capacitor.isNativePlatform();
const CHANNEL = 'anniversaries';
const MILESTONE_CHANNEL = 'milestones';

export type PermissionResult = 'granted' | 'denied' | 'unsupported';

/** Ask for Android 13+ notification permission. Call only when the user turns reminders on. */
export async function ensureNotificationPermission(): Promise<PermissionResult> {
  if (!native) return 'unsupported';
  let { display } = await LocalNotifications.checkPermissions();
  if (display === 'prompt' || display === 'prompt-with-rationale') ({ display } = await LocalNotifications.requestPermissions());
  return display === 'granted' ? 'granted' : 'denied';
}

let channelsReady = false;
async function ensureChannels() {
  if (channelsReady || Capacitor.getPlatform() !== 'android') return;
  await LocalNotifications.createChannel({ id: CHANNEL, name: 'Release anniversaries', description: 'Albums in your collection turning another year older', importance: 3 });
  await LocalNotifications.createChannel({ id: MILESTONE_CHANNEL, name: 'Milestone anniversaries', description: '10, 25, 50, 60, 75 and 100 years', importance: 4 });
  channelsReady = true;
}

export function notificationText(r: RecordView, age: number, milestone: boolean) {
  const date = r.original && isFullDate(r.original.date) ? formatPartialDate(r.original.date) : '';
  const where = `${folderDisplayName(r.folderName)}, slot ${r.shelf.slot}`;
  const details = `Released ${date}. It's in ${where}.`;
  // Milestones get a headline of their own and a higher-importance channel.
  return milestone
    ? { title: `${age} years of ${r.title}`, body: `${r.title} turns ${age} today. ${details}` }
    : { title: `${r.title} turns ${age} today`, body: details };
}

export async function rescheduleAnniversaries(records: RecordView[], reminders: Reminders): Promise<number> {
  if (!native) return 0;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  if (!reminders.enabled) return 0;
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return 0;
  await ensureChannels();

  // One notification per release, even if you own two copies.
  const byRelease = new Map<number, RecordView>();
  for (const r of records) if (!byRelease.has(r.releaseId)) byRelease.set(r.releaseId, r);
  const occ = upcomingAnniversaries(
    [...byRelease.values()].filter((r) => r.original).map((r) => ({ releaseId: r.releaseId, date: r.original!.date })),
    new Date(),
    { hour: reminders.hour, minute: reminders.minute, milestonesOnly: reminders.milestonesOnly },
  );
  const notifications = occ.map((o) => {
    const r = byRelease.get(o.releaseId)!;
    const { title, body } = notificationText(r, o.age, o.milestone);
    return {
      id: notificationId(o.releaseId, o.at.getFullYear()),
      title,
      body,
      largeBody: body,
      channelId: o.milestone ? MILESTONE_CHANNEL : CHANNEL,
      schedule: { at: o.at, allowWhileIdle: true },
      extra: { instanceId: r.instanceId, releaseId: r.releaseId },
      smallIcon: 'ic_stat_crate',
    };
  });
  for (let i = 0; i < notifications.length; i += 50) {
    await LocalNotifications.schedule({ notifications: notifications.slice(i, i + 50) });
  }
  return notifications.length;
}

export function onNotificationTap(fn: (instanceId: number) => void): () => void {
  if (!native) return () => undefined;
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const id = Number(e.notification.extra?.instanceId);
    if (id) fn(id);
  });
  return () => { void handle.then((h) => h.remove()); };
}
