import { bestEffortForDistance } from '@/services/geo';

import { db } from './database';

export type ActivityType = 'run' | 'walk';
export type ActivityStatus = 'recording' | 'paused' | 'done';
export type ActivityLapKind = 'auto_km' | 'manual';

export type Activity = {
  id: number;
  type: ActivityType;
  started_at: string;
  ended_at: string | null;
  status: ActivityStatus;
  distance_m: number;
  moving_sec: number;
  elapsed_sec: number;
  avg_pace_sec_km: number | null;
  elev_gain_m: number;
  kcal: number;
  title: string | null;
  notes: string | null;
};

export type ActivityPoint = {
  id: number;
  activity_id: number;
  ts: number;
  lat: number;
  lng: number;
  alt: number | null;
  accuracy: number | null;
  speed: number | null;
  segment: number;
};

export type ActivityLap = {
  id: number;
  activity_id: number;
  idx: number;
  kind: ActivityLapKind;
  distance_m: number;
  duration_sec: number;
};

export type FinishActivityInput = {
  type?: ActivityType;
  endedAt: string;
  status?: ActivityStatus;
  distanceM: number;
  movingSec: number;
  elapsedSec: number;
  avgPaceSecKm: number | null;
  elevGainM: number;
  kcal: number;
  title?: string | null;
  notes?: string | null;
};

/** Crea una nueva actividad GPS en estado recording */
export const createActivity = (type: ActivityType, startedAt: string): number =>
  db.runSync(
    `INSERT INTO activity (type, started_at, status, distance_m, moving_sec, elapsed_sec, elev_gain_m, kcal)
     VALUES (?, ?, 'recording', 0, 0, 0, 0, 0)`,
    type,
    startedAt
  ).lastInsertRowId;

/** Inserta un punto GPS filtrado para una actividad */
export const insertActivityPoint = (p: Omit<ActivityPoint, 'id'>): number =>
  db.runSync(
    `INSERT INTO activity_point (activity_id, ts, lat, lng, alt, accuracy, speed, segment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    p.activity_id,
    p.ts,
    p.lat,
    p.lng,
    p.alt,
    p.accuracy,
    p.speed,
    p.segment
  ).lastInsertRowId;

/** Inserta un parcial (automático por km o manual) */
export const insertActivityLap = (lap: Omit<ActivityLap, 'id'>): number =>
  db.runSync(
    `INSERT INTO activity_lap (activity_id, idx, kind, distance_m, duration_sec)
     VALUES (?, ?, ?, ?, ?)`,
    lap.activity_id,
    lap.idx,
    lap.kind,
    lap.distance_m,
    lap.duration_sec
  ).lastInsertRowId;

/** Finaliza y guarda las métricas agregadas de la actividad */
export const finishActivity = (id: number, data: FinishActivityInput): void => {
  db.runSync(
    `UPDATE activity
     SET type = COALESCE(?, type),
         ended_at = ?,
         status = ?,
         distance_m = ?,
         moving_sec = ?,
         elapsed_sec = ?,
         avg_pace_sec_km = ?,
         elev_gain_m = ?,
         kcal = ?,
         title = COALESCE(?, title),
         notes = COALESCE(?, notes)
     WHERE id = ?`,
    data.type ?? null,
    data.endedAt,
    data.status ?? 'done',
    data.distanceM,
    data.movingSec,
    data.elapsedSec,
    data.avgPaceSecKm,
    data.elevGainM,
    data.kcal,
    data.title ?? null,
    data.notes ?? null,
    id
  );
};

/** Elimina una actividad y en cascada sus puntos y parciales */
export const deleteActivity = (id: number): void => {
  db.runSync('DELETE FROM activity WHERE id = ?', id);
};

/** Lista actividades finalizadas ordenadas de más reciente a más antigua */
export const listActivities = (limit = 50): Activity[] =>
  db.getAllSync<Activity>(
    `SELECT * FROM activity
     WHERE status = 'done'
     ORDER BY started_at DESC, id DESC
     LIMIT ?`,
    limit
  );

/** Obtiene una actividad por su ID */
export const getActivityById = (id: number): Activity | null =>
  db.getFirstSync<Activity>('SELECT * FROM activity WHERE id = ?', id) ?? null;

/** Obtiene todos los puntos GPS de una actividad ordenados cronológicamente */
export const getActivityPoints = (activityId: number): ActivityPoint[] =>
  db.getAllSync<ActivityPoint>(
    'SELECT * FROM activity_point WHERE activity_id = ? ORDER BY ts ASC, id ASC',
    activityId
  );

/** Obtiene los parciales de una actividad ordenados */
export const getActivityLaps = (activityId: number): ActivityLap[] =>
  db.getAllSync<ActivityLap>(
    'SELECT * FROM activity_lap WHERE activity_id = ? ORDER BY id ASC',
    activityId
  );

/** Estadísticas semanales (lunes a domingo de la semana actual) para actividades finalizadas */
export const getWeeklyCardioStats = (): {
  totalDistanceM: number;
  totalMovingSec: number;
  count: number;
} => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const row = db.getFirstSync<{
    totalDistanceM: number | null;
    totalMovingSec: number | null;
    count: number | null;
  }>(
    `SELECT
       COALESCE(SUM(distance_m), 0) AS totalDistanceM,
       COALESCE(SUM(moving_sec), 0) AS totalMovingSec,
       COUNT(*) AS count
     FROM activity
     WHERE status = 'done' AND started_at >= ?`,
    monday.toISOString()
  );

  return {
    totalDistanceM: row?.totalDistanceM ?? 0,
    totalMovingSec: row?.totalMovingSec ?? 0,
    count: row?.count ?? 0,
  };
};

/** Busca la última actividad sin terminar (recording o paused) para recuperarla tras un cierre */
export const getUnfinishedActivity = (): Activity | null =>
  db.getFirstSync<Activity>(
    "SELECT * FROM activity WHERE status IN ('recording', 'paused') ORDER BY id DESC LIMIT 1"
  ) ?? null;

/** Actualiza el progreso acumulado de la actividad en curso para evitar pérdidas si se cierra la app */
export const updateActivityProgress = (
  id: number,
  data: {
    status: ActivityStatus;
    distanceM: number;
    movingSec: number;
    elapsedSec: number;
    elevGainM: number;
  }
): void => {
  db.runSync(
    `UPDATE activity
     SET status = ?,
         distance_m = ?,
         moving_sec = ?,
         elapsed_sec = ?,
         elev_gain_m = ?
     WHERE id = ?`,
    data.status,
    data.distanceM,
    data.movingSec,
    data.elapsedSec,
    data.elevGainM,
    id
  );
};

const localYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type CardioPersonalRecords = {
  best1kSec: number | null;
  best5kSec: number | null;
  best10kSec: number | null;
  longestM: number;
};

/** Calcula récords personales (1K, 5K, 10K con ventana deslizante y mayor distancia) */
export const getCardioPersonalRecords = (): CardioPersonalRecords => {
  const acts = db.getAllSync<Activity>(
    "SELECT * FROM activity WHERE status = 'done' ORDER BY distance_m DESC"
  );

  let best1kSec: number | null = null;
  let best5kSec: number | null = null;
  let best10kSec: number | null = null;
  let longestM = 0;

  for (const act of acts) {
    if (act.distance_m > longestM) longestM = act.distance_m;
    if (act.distance_m < 1000) continue;

    const pts = getActivityPoints(act.id);

    const e1k =
      bestEffortForDistance(pts, 1000) ??
      (act.avg_pace_sec_km != null ? Math.round(act.avg_pace_sec_km) : null);
    if (e1k != null && (best1kSec == null || e1k < best1kSec)) {
      best1kSec = e1k;
    }

    if (act.distance_m >= 5000) {
      const e5k =
        bestEffortForDistance(pts, 5000) ??
        (act.avg_pace_sec_km != null ? Math.round(act.avg_pace_sec_km * 5) : null);
      if (e5k != null && (best5kSec == null || e5k < best5kSec)) {
        best5kSec = e5k;
      }
    }

    if (act.distance_m >= 10000) {
      const e10k =
        bestEffortForDistance(pts, 10000) ??
        (act.avg_pace_sec_km != null ? Math.round(act.avg_pace_sec_km * 10) : null);
      if (e10k != null && (best10kSec == null || e10k < best10kSec)) {
        best10kSec = e10k;
      }
    }
  }

  return { best1kSec, best5kSec, best10kSec, longestM };
};

/** Kilómetros por cada día (Lunes..Domingo) de la semana actual en hora local */
export const getWeeklyDailyKm = (): number[] => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const rows = db.getAllSync<{ started_at: string; distance_m: number }>(
    "SELECT started_at, distance_m FROM activity WHERE status = 'done' AND started_at >= ?",
    monday.toISOString()
  );

  const daily = [0, 0, 0, 0, 0, 0, 0];
  for (const row of rows) {
    const d = new Date(row.started_at);
    if (Number.isNaN(d.getTime()) || d < monday) continue;
    const idx = (d.getDay() + 6) % 7;
    daily[idx] += row.distance_m / 1000;
  }
  return daily;
};

export type MonthActivitySummary = {
  id: number;
  dateKey: string;
  type: ActivityType;
  title: string | null;
  distance_m: number;
  moving_sec: number;
};

/** Actividades finalizadas de un mes calendario (1-12) agrupables por fecha local YYYY-MM-DD */
export const getMonthActivities = (year: number, month: number): MonthActivitySummary[] => {
  const start = new Date(year, month - 1, 1);
  start.setDate(start.getDate() - 1);
  const end = new Date(year, month, 2);
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;

  const rows = db.getAllSync<Activity>(
    `SELECT * FROM activity
     WHERE status = 'done' AND started_at >= ? AND started_at <= ?
     ORDER BY started_at ASC, id ASC`,
    start.toISOString(),
    end.toISOString()
  );

  const out: MonthActivitySummary[] = [];
  for (const r of rows) {
    const d = new Date(r.started_at);
    if (Number.isNaN(d.getTime())) continue;
    const dateKey = localYmd(d);
    if (!dateKey.startsWith(prefix)) continue;
    out.push({
      id: r.id,
      dateKey,
      type: r.type,
      title: r.title,
      distance_m: r.distance_m,
      moving_sec: r.moving_sec,
    });
  }
  return out;
};
