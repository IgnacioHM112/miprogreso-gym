import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { getHapticsEnabled } from '@/db/repo';

// En Expo Go (Android), expo-notifications intenta cargar 'ExpoTopicSubscriptionModule'
// que no está compilado en Expo Go desde SDK 53+.
// Envolvemos la carga en try/catch para que la app no crashee en Expo Go y funcione
// fluidamente con Haptics y la cuenta regresiva en pantalla,
// y se active automáticamente cuando se genere el APK/build de desarrollo.
let NotificationsModule: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NotificationsModule = require('expo-notifications');
  if (NotificationsModule && typeof NotificationsModule.setNotificationHandler === 'function') {
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (err) {
  // En Expo Go el módulo nativo no existe; se ignora sin romper la app
  NotificationsModule = null;
}

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web' || !NotificationsModule) return false;
  try {
    const { status } = await NotificationsModule.getPermissionsAsync();
    if (status !== 'granted') {
      const res = await NotificationsModule.requestPermissionsAsync();
      return res.status === 'granted';
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function scheduleRestNotification(seconds: number, exerciseName?: string): Promise<string | null> {
  if (Platform.OS === 'web' || !NotificationsModule || seconds <= 0) return null;
  try {
    const id = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: '⏰ ¡Descanso finalizado!',
        body: exerciseName ? `Momento de la siguiente serie en ${exerciseName} 💪` : 'Momento de la siguiente serie 💪',
        sound: true,
        vibrate: [0, 300, 150, 300],
      },
      trigger: {
        type: NotificationsModule.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    return id;
  } catch (e) {
    return null;
  }
}

export async function cancelRestNotification(notificationId: string | null) {
  if (!notificationId || Platform.OS === 'web' || !NotificationsModule) return;
  try {
    await NotificationsModule.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // ignorar
  }
}

/** Configurar o actualizar recordatorios semanales de entrenamiento */
export async function syncWorkoutReminders(enabled: boolean, timeStr: string, days: number[]) {
  if (Platform.OS === 'web' || !NotificationsModule) return;
  try {
    // Cancelar recordatorios previos
    await NotificationsModule.cancelAllScheduledNotificationsAsync();
    if (!enabled || days.length === 0) return;

    const granted = await requestNotificationPermissions();
    if (!granted) return;

    const [hour, minute] = timeStr.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return;

    for (const d of days) {
      // expo-notifications SchedulableTriggerInputTypes.WEEKLY usa weekday 1=Domingo .. 7=Sábado
      const weekday = d + 1;
      await NotificationsModule.scheduleNotificationAsync({
        content: {
          title: '🏋️‍♂️ ¡Hora de entrenar!',
          body: 'Tu sesión de hoy te está esperando en MiProgreso Gym.',
          sound: true,
        },
        trigger: {
          type: NotificationsModule.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        },
      });
    }
  } catch (e) {
    // Ignorar defensivamente en Expo Go
  }
}

export function vibrateSuccess() {
  if (Platform.OS !== 'web' && getHapticsEnabled()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

export function vibrateImpact() {
  if (Platform.OS !== 'web' && getHapticsEnabled()) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

export function vibrateTimerDone() {
  if (Platform.OS !== 'web' && getHapticsEnabled()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 400);
  }
}

