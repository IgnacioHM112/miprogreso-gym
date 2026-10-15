import { db } from './database';

export type Exercise = { id: number; name: string; muscle_group: string; type: 'weight' | 'time'; is_custom: number; notes: string | null };
export type Routine = { id: number; name: string; weekdays: string | null; position: number; color: string | null };
export type PlanExercise = {
  id: number; routine_id: number; exercise_id: number; position: number;
  target_sets: number; target_reps: string | null; target_seconds: number | null; rest_seconds: number;
  name: string; muscle_group: string; type: 'weight' | 'time';
};

export const parseDays = (csv: string | null) => (csv ? csv.split(',').filter(Boolean).map(Number) : []);

// ---------- Ejercicios ----------
export const listExercises = () => db.getAllSync<Exercise>('SELECT * FROM exercise ORDER BY muscle_group, name');
export const createExercise = (name: string, muscle_group: string, type: 'weight' | 'time') =>
  db.runSync('INSERT INTO exercise (name, muscle_group, type, is_custom) VALUES (?,?,?,1)', name, muscle_group, type).lastInsertRowId;
export const deleteExercise = (id: number) => db.runSync('DELETE FROM exercise WHERE id=? AND is_custom=1', id);

// ---------- Rutinas ----------
export const listRoutines = () => db.getAllSync<Routine>('SELECT * FROM routine ORDER BY position, id');
export const getRoutine = (id: number) => db.getFirstSync<Routine>('SELECT * FROM routine WHERE id=?', id);
export const createRoutine = (name: string) => {
  const pos = db.getFirstSync<{ p: number }>('SELECT COALESCE(MAX(position),-1)+1 p FROM routine')!.p;
  return db.runSync('INSERT INTO routine (name, position) VALUES (?,?)', name, pos).lastInsertRowId;
};
export const updateRoutine = (id: number, name: string, weekdays: number[]) =>
  db.runSync('UPDATE routine SET name=?, weekdays=? WHERE id=?', name, weekdays.sort().join(','), id);
export const deleteRoutine = (id: number) => db.runSync('DELETE FROM routine WHERE id=?', id);
export const routineForWeekday = (wd: number) =>
  listRoutines().find((r) => parseDays(r.weekdays).includes(wd)) ?? null;

// ---------- Ejercicios de una rutina ----------
export const listPlan = (routineId: number) =>
  db.getAllSync<PlanExercise>(
    `SELECT pe.*, e.name, e.muscle_group, e.type FROM plan_exercise pe
     JOIN exercise e ON e.id = pe.exercise_id WHERE pe.routine_id=? ORDER BY pe.position`, routineId);

export const addToPlan = (routineId: number, exercise: Exercise) => {
  const pos = db.getFirstSync<{ p: number }>('SELECT COALESCE(MAX(position),-1)+1 p FROM plan_exercise WHERE routine_id=?', routineId)!.p;
  const isTime = exercise.type === 'time';
  db.runSync(
    'INSERT INTO plan_exercise (routine_id, exercise_id, position, target_sets, target_reps, target_seconds, rest_seconds) VALUES (?,?,?,?,?,?,?)',
    routineId, exercise.id, pos, isTime ? 1 : 3, isTime ? null : '8-12', isTime ? 60 : null, isTime ? 30 : 90);
};

export const updatePlanItem = (id: number, f: { target_sets: number; target_reps: string | null; target_seconds: number | null; rest_seconds: number }) =>
  db.runSync('UPDATE plan_exercise SET target_sets=?, target_reps=?, target_seconds=?, rest_seconds=? WHERE id=?',
    f.target_sets, f.target_reps, f.target_seconds, f.rest_seconds, id);

export const removePlanItem = (id: number) => db.runSync('DELETE FROM plan_exercise WHERE id=?', id);

export const movePlanItem = (routineId: number, id: number, dir: -1 | 1) => {
  const items = listPlan(routineId);
  const i = items.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  db.withTransactionSync(() => items.forEach((it, k) => db.runSync('UPDATE plan_exercise SET position=? WHERE id=?', k, it.id)));
};

// ---------- Settings ----------
export const getSetting = (key: string, def: string) =>
  db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key=?', key)?.value ?? def;
export const setSetting = (key: string, value: string) =>
  db.runSync('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, value);

// ---------- Estadísticas para "Hoy" ----------
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Fechas (YYYY-MM-DD) entrenadas en la semana actual (lunes a domingo) */
export const trainedDaysThisWeek = () => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const rows = db.getAllSync<{ d: string }>('SELECT DISTINCT substr(date,1,10) d FROM session WHERE substr(date,1,10) >= ?', ymd(monday));
  return { monday, dates: new Set(rows.map((r) => r.d)) };
};

export const daysSinceLastSession = (): number | null => {
  const r = db.getFirstSync<{ d: string | null }>('SELECT MAX(substr(date,1,10)) d FROM session');
  if (!r?.d) return null;
  const [y, m, d] = r.d.split('-').map(Number);
  const last = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - last.getTime()) / 86400000);
};

// ---------- Historial de última vez y sesiones ----------
export type PreviousSet = {
  set_number: number;
  weight: number | null;
  reps: number | null;
  seconds: number | null;
  is_warmup: number;
};

export const getLastExerciseSets = (exerciseId: number): PreviousSet[] => {
  const lastSession = db.getFirstSync<{ id: number }>(
    `SELECT s.id FROM session s
     JOIN session_set ss ON ss.session_id = s.id
     WHERE ss.exercise_id = ?
     ORDER BY s.date DESC, s.id DESC LIMIT 1`,
    exerciseId
  );
  if (!lastSession) return [];

  return db.getAllSync<PreviousSet>(
    `SELECT set_number, weight, reps, seconds, is_warmup
     FROM session_set
     WHERE session_id = ? AND exercise_id = ?
     ORDER BY set_number ASC`,
    lastSession.id, exerciseId
  );
};

export type SaveSessionInput = {
  routine_id: number | null;
  date: string;
  duration_sec: number;
  notes?: string | null;
  sets: {
    exercise_id: number;
    set_number: number;
    weight: number | null;
    reps: number | null;
    seconds: number | null;
    is_warmup: number;
    notes?: string | null;
  }[];
};

export const saveSession = (input: SaveSessionInput): number => {
  let sessionId = 0;
  db.withTransactionSync(() => {
    const res = db.runSync(
      'INSERT INTO session (date, routine_id, duration_sec, notes) VALUES (?, ?, ?, ?)',
      input.date, input.routine_id, input.duration_sec, input.notes ?? null
    );
    sessionId = res.lastInsertRowId;

    for (const s of input.sets) {
      db.runSync(
        `INSERT INTO session_set (session_id, exercise_id, set_number, weight, reps, seconds, is_warmup, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        sessionId, s.exercise_id, s.set_number, s.weight, s.reps, s.seconds, s.is_warmup, s.notes ?? null
      );
    }
  });
  return sessionId;
};

export { ymd };
