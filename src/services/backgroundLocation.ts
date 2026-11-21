import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { ActivityType } from '@/db/activityRepo';
import { useRunStore } from '@/stores/runStore';

export const BACKGROUND_LOCATION_TASK = 'miprogreso-background-location';

if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      const store = useRunStore.getState();
      if (store.status === 'idle') {
        await store.recoverUnfinishedActivity(true);
      }
      useRunStore.getState().ingestLocations(data.locations);
    }
  );
}

/** Indica si el servicio de ubicación en segundo plano ya está ejecutándose */
export async function hasBackgroundLocationRunning(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

/**
 * Inicia actualizaciones de GPS en segundo plano (Android foreground service con notificación).
 * Devuelve false si no hay permiso de fondo o no pudo iniciarse (para hacer fallback a primer plano).
 */
export async function startBackgroundLocationUpdates(type: ActivityType): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    let bgPerm = await Location.getBackgroundPermissionsAsync();
    if (bgPerm.status !== 'granted') {
      bgPerm = await Location.requestBackgroundPermissionsAsync();
    }
    if (bgPerm.status !== 'granted') {
      return false;
    }

    const alreadyStarted = await hasBackgroundLocationRunning();
    if (alreadyStarted) {
      return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: type === 'run' ? 'MiProgreso · Corriendo' : 'MiProgreso · Caminando',
        notificationBody: 'Registrando tu recorrido por GPS',
        notificationColor: '#C6F432',
        killServiceOnDestroy: false,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Detiene las actualizaciones de ubicación en segundo plano si están activas */
export async function stopBackgroundLocationUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (await hasBackgroundLocationRunning()) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    // ignorar si la tarea ya fue detenida
  }
}
