import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { create } from 'zustand';

import {
  ActivityLapKind,
  ActivityType,
  createActivity,
  deleteActivity,
  finishActivity,
  getActivityLaps,
  getActivityPoints,
  getUnfinishedActivity,
  insertActivityLap,
  insertActivityPoint,
  updateActivityProgress,
} from '@/db/activityRepo';
import { getAutoPauseEnabled, getLatestBodyWeight, setAutoPauseEnabled as persistAutoPauseEnabled } from '@/db/repo';
import {
  hasBackgroundLocationRunning,
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
} from '@/services/backgroundLocation';
import {
  estimateKcal,
  GpsSample,
  haversineMeters,
  isValidGpsPoint,
} from '@/services/geo';
import { vibrateImpact, vibrateSuccess } from '@/services/notifications';

export type RunStatus = 'idle' | 'recording' | 'paused';
export type TrackingMode = 'none' | 'background' | 'foreground';

export type LiveLap = {
  idx: number;
  kind: ActivityLapKind;
  distance_m: number;
  duration_sec: number;
};

export type LiveCoord = {
  lat: number;
  lng: number;
  segment: number;
};

type RunState = {
  status: RunStatus;
  activityId: number | null;
  type: ActivityType;
  startedAtMs: number | null;
  accumulatedMovingMs: number;
  segmentStartMs: number | null;
  segment: number;
  distanceM: number;
  elevGainM: number;
  currentPaceSecKm: number | null;
  accuracy: number | null;
  laps: LiveLap[];
  liveCoords: LiveCoord[];
  nextAutoKm: number;
  lastLapDistM: number;
  lastLapMovingSec: number;
  autoPauseEnabled: boolean;
  isAutoPaused: boolean;
  trackingMode: TrackingMode;

  setType: (type: ActivityType) => void;
  setAutoPauseEnabled: (enabled: boolean) => void;
  ingestLocations: (locations: Location.LocationObject[]) => void;
  recoverUnfinishedActivity: (fromBackgroundTask?: boolean) => Promise<boolean>;
  start: (type?: ActivityType) => Promise<{ ok: boolean; error?: string }>;
  pause: () => void;
  resume: () => Promise<void>;
  addManualLap: () => void;
  finish: (overrideType?: ActivityType, title?: string, notes?: string) => number | null;
  discard: () => void;
  getMovingSeconds: () => number;
};

let locationSub: Location.LocationSubscription | null = null;
let watcherToken = 0;
let lastAcceptedPoint: (GpsSample & { alt: number | null; segment: number }) | null = null;

function stopWatcher() {
  watcherToken++;
  if (locationSub) {
    try {
      locationSub.remove();
    } catch {
      // ignorar si ya fue removida
    }
    locationSub = null;
  }
}

async function startWatcher(
  onLocation: (loc: Location.LocationObject) => void
): Promise<boolean> {
  stopWatcher();
  const token = watcherToken;
  try {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      onLocation
    );
    if (token !== watcherToken) {
      sub.remove();
      return false;
    }
    locationSub = sub;
    return true;
  } catch {
    return false;
  }
}

const INITIAL_STATE = {
  status: 'idle' as RunStatus,
  activityId: null as number | null,
  startedAtMs: null as number | null,
  accumulatedMovingMs: 0,
  segmentStartMs: null as number | null,
  segment: 0,
  distanceM: 0,
  elevGainM: 0,
  currentPaceSecKm: null as number | null,
  accuracy: null as number | null,
  laps: [] as LiveLap[],
  liveCoords: [] as LiveCoord[],
  nextAutoKm: 1,
  lastLapDistM: 0,
  lastLapMovingSec: 0,
  isAutoPaused: false,
  trackingMode: 'none' as TrackingMode,
};

export const useRunStore = create<RunState>((set, get) => {
  const processSingleLocation = (loc: Location.LocationObject) => {
    const state = get();
    if (state.status !== 'recording' || state.activityId == null) return;

    const { latitude: lat, longitude: lng, altitude, accuracy, speed } = loc.coords;
    const alt = altitude ?? null;
    const acc = accuracy ?? null;
    const spd = speed != null && speed >= 0 ? speed : null;
    const ts = loc.timestamp || Date.now();

    set({ accuracy: acc });

    const sample: GpsSample = { lat, lng, ts, accuracy: acc };

    const syncProgressToDb = (distanceM: number, elevGainM: number, movingSec: number) => {
      if (state.activityId == null) return;
      const elapsedSec =
        state.startedAtMs != null
          ? Math.max(movingSec, Math.floor((Date.now() - state.startedAtMs) / 1000))
          : movingSec;
      updateActivityProgress(state.activityId, {
        status: 'recording',
        distanceM,
        movingSec,
        elapsedSec,
        elevGainM: Math.round(elevGainM),
      });
    };

    // Lógica de auto-pausa al detenerse (semáforos / pausas involuntarias)
    if (state.autoPauseEnabled && lastAcceptedPoint) {
      const distFromLast = haversineMeters(lastAcceptedPoint.lat, lastAcceptedPoint.lng, lat, lng);
      const dtFromLastSec = (ts - lastAcceptedPoint.ts) / 1000;

      if (!state.isAutoPaused) {
        const isStopped =
          (spd != null && spd < 0.55) || (dtFromLastSec > 6 && distFromLast < 2);
        if (isStopped) {
          const extra = state.segmentStartMs != null ? Date.now() - state.segmentStartMs : 0;
          const nextAccumMs = state.accumulatedMovingMs + extra;
          set({
            isAutoPaused: true,
            accumulatedMovingMs: nextAccumMs,
            segmentStartMs: null,
            currentPaceSecKm: null,
            segment: state.segment + 1,
          });
          syncProgressToDb(
            state.distanceM,
            state.elevGainM,
            Math.max(0, Math.floor(nextAccumMs / 1000))
          );
          return;
        }
      } else {
        const hasResumed =
          (spd != null && spd >= 0.75) ||
          (distFromLast >= 4 && (acc == null || acc <= 25));
        if (!hasResumed) {
          return;
        }
        if (acc != null && acc > 25) return;

        insertActivityPoint({
          activity_id: state.activityId,
          ts,
          lat,
          lng,
          alt,
          accuracy: acc,
          speed: spd,
          segment: state.segment,
        });
        lastAcceptedPoint = { ...sample, alt, segment: state.segment };
        set({
          isAutoPaused: false,
          segmentStartMs: Date.now(),
          liveCoords: [...state.liveCoords, { lat, lng, segment: state.segment }],
        });
        syncProgressToDb(state.distanceM, state.elevGainM, get().getMovingSeconds());
        return;
      }
    }

    // Primer punto del segmento actual (inicio o tras reanudar pausa): no suma salto de distancia
    if (!lastAcceptedPoint || lastAcceptedPoint.segment !== state.segment) {
      if (acc != null && acc > 25) return;

      insertActivityPoint({
        activity_id: state.activityId,
        ts,
        lat,
        lng,
        alt,
        accuracy: acc,
        speed: spd,
        segment: state.segment,
      });
      lastAcceptedPoint = { ...sample, alt, segment: state.segment };
      set({
        liveCoords: [...state.liveCoords, { lat, lng, segment: state.segment }],
      });
      syncProgressToDb(state.distanceM, state.elevGainM, get().getMovingSeconds());
      return;
    }

    if (!isValidGpsPoint(lastAcceptedPoint, sample)) {
      return;
    }

    const stepDist = haversineMeters(lastAcceptedPoint.lat, lastAcceptedPoint.lng, lat, lng);
    const newDist = state.distanceM + stepDist;

    let elevDelta = 0;
    if (alt != null && lastAcceptedPoint.alt != null) {
      const diff = alt - lastAcceptedPoint.alt;
      if (diff > 0.5 && diff < 15) {
        elevDelta = diff;
      }
    }

    const dtSec = Math.max(0.5, (ts - lastAcceptedPoint.ts) / 1000);
    const effectiveSpeed = spd != null && spd > 0.4 ? spd : stepDist / dtSec;
    let nextPace = state.currentPaceSecKm;
    if (effectiveSpeed > 0.4) {
      const instantPace = 1000 / effectiveSpeed;
      nextPace = nextPace != null ? nextPace * 0.65 + instantPace * 0.35 : instantPace;
    }

    insertActivityPoint({
      activity_id: state.activityId,
      ts,
      lat,
      lng,
      alt,
      accuracy: acc,
      speed: spd,
      segment: state.segment,
    });
    lastAcceptedPoint = { ...sample, alt, segment: state.segment };

    // Verificar parciales automáticos por km
    const movingSecNow = state.getMovingSeconds();
    let nextAutoKm = state.nextAutoKm;
    let lastLapDistM = state.lastLapDistM;
    let lastLapMovingSec = state.lastLapMovingSec;
    const newLaps = [...state.laps];
    let hitNewKm = false;

    while (newDist >= nextAutoKm * 1000) {
      const targetDistM = nextAutoKm * 1000;
      const lapDist = Math.max(0, targetDistM - lastLapDistM);
      const lapDuration = Math.max(1, movingSecNow - lastLapMovingSec);
      const idx = newLaps.length + 1;

      insertActivityLap({
        activity_id: state.activityId,
        idx,
        kind: 'auto_km',
        distance_m: lapDist,
        duration_sec: lapDuration,
      });

      newLaps.push({
        idx,
        kind: 'auto_km',
        distance_m: lapDist,
        duration_sec: lapDuration,
      });

      lastLapDistM = targetDistM;
      lastLapMovingSec = movingSecNow;
      nextAutoKm += 1;
      hitNewKm = true;
    }

    if (hitNewKm) {
      vibrateSuccess();
    }

    const nextElev = state.elevGainM + elevDelta;
    set({
      distanceM: newDist,
      elevGainM: nextElev,
      currentPaceSecKm: nextPace,
      laps: newLaps,
      liveCoords: [...state.liveCoords, { lat, lng, segment: state.segment }],
      nextAutoKm,
      lastLapDistM,
      lastLapMovingSec,
    });
    syncProgressToDb(newDist, nextElev, movingSecNow);
  };

  return {
    ...INITIAL_STATE,
    type: 'run',
    autoPauseEnabled: getAutoPauseEnabled(),

    setType: (type) => set({ type }),

    setAutoPauseEnabled: (enabled) => {
      persistAutoPauseEnabled(enabled);
      set({ autoPauseEnabled: enabled });
    },

    ingestLocations: (locations) => {
      const ordered = [...locations].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      for (const loc of ordered) {
        processSingleLocation(loc);
      }
    },

    recoverUnfinishedActivity: async (fromBackgroundTask = false) => {
      if (get().status !== 'idle') return false;
      const act = getUnfinishedActivity();
      if (!act) return false;

      const points = getActivityPoints(act.id);
      const dbLaps = getActivityLaps(act.id);
      const liveCoords: LiveCoord[] = points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        segment: p.segment,
      }));

      if (points.length > 0) {
        const last = points[points.length - 1];
        lastAcceptedPoint = {
          lat: last.lat,
          lng: last.lng,
          ts: last.ts,
          accuracy: last.accuracy,
          alt: last.alt,
          segment: last.segment,
        };
      } else {
        lastAcceptedPoint = null;
      }

      const lastSegment = points.length > 0 ? points[points.length - 1].segment : 0;
      const laps: LiveLap[] = dbLaps.map((l) => ({
        idx: l.idx,
        kind: l.kind,
        distance_m: l.distance_m,
        duration_sec: l.duration_sec,
      }));
      const lastLapDistM = dbLaps.reduce((sum, l) => sum + l.distance_m, 0);
      const lastLapMovingSec = dbLaps.reduce((sum, l) => sum + l.duration_sec, 0);
      const nextAutoKm = Math.floor(act.distance_m / 1000) + 1;
      const parsedStart = new Date(act.started_at).getTime();
      const startedAtMs = Number.isFinite(parsedStart) ? parsedStart : Date.now();

      const bgRunning = fromBackgroundTask || (await hasBackgroundLocationRunning());
      if (bgRunning && act.status === 'recording') {
        set({
          ...INITIAL_STATE,
          type: act.type,
          status: 'recording',
          trackingMode: 'background',
          activityId: act.id,
          startedAtMs,
          accumulatedMovingMs: act.moving_sec * 1000,
          segmentStartMs: Date.now(),
          segment: lastSegment,
          distanceM: act.distance_m,
          elevGainM: act.elev_gain_m,
          laps,
          liveCoords,
          nextAutoKm,
          lastLapDistM,
          lastLapMovingSec,
        });
      } else {
        updateActivityProgress(act.id, {
          status: 'paused',
          distanceM: act.distance_m,
          movingSec: act.moving_sec,
          elapsedSec: act.elapsed_sec,
          elevGainM: Math.round(act.elev_gain_m),
        });
        set({
          ...INITIAL_STATE,
          type: act.type,
          status: 'paused',
          trackingMode: 'none',
          activityId: act.id,
          startedAtMs,
          accumulatedMovingMs: act.moving_sec * 1000,
          segmentStartMs: null,
          segment: lastSegment + 1,
          distanceM: act.distance_m,
          elevGainM: act.elev_gain_m,
          laps,
          liveCoords,
          nextAutoKm,
          lastLapDistM,
          lastLapMovingSec,
        });
      }
      return true;
    },

    getMovingSeconds: () => {
      const s = get();
      const extra =
        s.status === 'recording' && !s.isAutoPaused && s.segmentStartMs != null
          ? Date.now() - s.segmentStartMs
          : 0;
      return Math.max(0, Math.floor((s.accumulatedMovingMs + extra) / 1000));
    },

    start: async (chosenType) => {
      if (Platform.OS === 'web') {
        return {
          ok: false,
          error: 'El registro GPS no está disponible en la versión web.',
        };
      }
      const current = get();
      if (current.status !== 'idle') {
        return { ok: true };
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return {
          ok: false,
          error: 'Se necesita permiso de ubicación para medir tu distancia y ritmo.',
        };
      }

      const finalType = chosenType ?? current.type;
      const now = Date.now();
      const activityId = createActivity(finalType, new Date(now).toISOString());
      lastAcceptedPoint = null;

      set({
        ...INITIAL_STATE,
        type: finalType,
        status: 'recording',
        activityId,
        startedAtMs: now,
        segmentStartMs: now,
      });

      const bgStarted = await startBackgroundLocationUpdates(finalType);
      if (bgStarted) {
        set({ trackingMode: 'background' });
      } else {
        const fgStarted = await startWatcher((loc) => get().ingestLocations([loc]));
        if (!fgStarted) {
          deleteActivity(activityId);
          lastAcceptedPoint = null;
          set({ ...INITIAL_STATE });
          return {
            ok: false,
            error: 'No se pudo iniciar el GPS. Verificá que la ubicación del teléfono esté activada.',
          };
        }
        set({ trackingMode: 'foreground' });
      }

      vibrateImpact();
      return { ok: true };
    },

    pause: () => {
      const s = get();
      if (s.status !== 'recording') return;
      stopWatcher();
      void stopBackgroundLocationUpdates();
      const extra = !s.isAutoPaused && s.segmentStartMs != null ? Date.now() - s.segmentStartMs : 0;
      const nextAccumMs = s.accumulatedMovingMs + extra;
      const movingSec = Math.max(0, Math.floor(nextAccumMs / 1000));
      const elapsedSec =
        s.startedAtMs != null
          ? Math.max(movingSec, Math.floor((Date.now() - s.startedAtMs) / 1000))
          : movingSec;

      if (s.activityId != null) {
        updateActivityProgress(s.activityId, {
          status: 'paused',
          distanceM: s.distanceM,
          movingSec,
          elapsedSec,
          elevGainM: Math.round(s.elevGainM),
        });
      }

      vibrateImpact();
      set({
        status: 'paused',
        trackingMode: 'none',
        isAutoPaused: false,
        accumulatedMovingMs: nextAccumMs,
        segmentStartMs: null,
        currentPaceSecKm: null,
      });
    },

    resume: async () => {
      const s = get();
      if (s.status !== 'paused') return;
      vibrateImpact();
      const nextSegment = s.segment + 1;
      const now = Date.now();
      const movingSec = Math.max(0, Math.floor(s.accumulatedMovingMs / 1000));
      const elapsedSec =
        s.startedAtMs != null
          ? Math.max(movingSec, Math.floor((now - s.startedAtMs) / 1000))
          : movingSec;

      if (s.activityId != null) {
        updateActivityProgress(s.activityId, {
          status: 'recording',
          distanceM: s.distanceM,
          movingSec,
          elapsedSec,
          elevGainM: Math.round(s.elevGainM),
        });
      }

      set({
        status: 'recording',
        isAutoPaused: false,
        segment: nextSegment,
        segmentStartMs: now,
      });

      const bgStarted = await startBackgroundLocationUpdates(s.type);
      if (bgStarted) {
        set({ trackingMode: 'background' });
      } else {
        const fgStarted = await startWatcher((loc) => get().ingestLocations([loc]));
        set({ trackingMode: fgStarted ? 'foreground' : 'none' });
      }
    },

    addManualLap: () => {
      const s = get();
      if (s.status === 'idle' || s.activityId == null) return;
      const movingSecNow = s.getMovingSeconds();
      const lapDist = Math.max(0, s.distanceM - s.lastLapDistM);
      const lapDuration = Math.max(0, movingSecNow - s.lastLapMovingSec);
      const idx = s.laps.length + 1;

      insertActivityLap({
        activity_id: s.activityId,
        idx,
        kind: 'manual',
        distance_m: lapDist,
        duration_sec: lapDuration,
      });

      vibrateImpact();
      set({
        laps: [
          ...s.laps,
          { idx, kind: 'manual', distance_m: lapDist, duration_sec: lapDuration },
        ],
        lastLapDistM: s.distanceM,
        lastLapMovingSec: movingSecNow,
      });
    },

    finish: (overrideType, title, notes) => {
      const s = get();
      if (s.activityId == null || s.startedAtMs == null) return null;

      stopWatcher();
      void stopBackgroundLocationUpdates();
      const movingSec = s.getMovingSeconds();
      const elapsedSec = Math.max(movingSec, Math.floor((Date.now() - s.startedAtMs) / 1000));
      const finalType = overrideType ?? s.type;
      const distKm = s.distanceM / 1000;
      const avgPaceSecKm =
        s.distanceM >= 20 && movingSec > 0 ? movingSec / distKm : null;
      const weightKg = getLatestBodyWeight()?.kg ?? 75;
      const kcal = estimateKcal(finalType, distKm, weightKg);
      const defaultTitle = finalType === 'run' ? 'Carrera' : 'Caminata';

      finishActivity(s.activityId, {
        type: finalType,
        endedAt: new Date().toISOString(),
        status: 'done',
        distanceM: s.distanceM,
        movingSec,
        elapsedSec,
        avgPaceSecKm,
        elevGainM: Math.round(s.elevGainM),
        kcal,
        title: title?.trim() || defaultTitle,
        notes: notes?.trim() || null,
      });

      const finishedId = s.activityId;
      lastAcceptedPoint = null;
      vibrateSuccess();
      set({ ...INITIAL_STATE });
      return finishedId;
    },

    discard: () => {
      const s = get();
      stopWatcher();
      void stopBackgroundLocationUpdates();
      if (s.activityId != null) {
        deleteActivity(s.activityId);
      }
      lastAcceptedPoint = null;
      vibrateImpact();
      set({ ...INITIAL_STATE });
    },
  };
});
