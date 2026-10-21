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
    routineId, exercise.id, pos, isTime ? 1 : 3, isTime ? null : '8-12', isTime ? 60 : null, isTime ? 30 : getDefaultRestSeconds());
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

// ---------- Fase 3: Historial, Calendario, PRs y Progresión ----------
export type SessionListItem = {
  id: number;
  date: string;
  duration_sec: number;
  notes: string | null;
  routine_id: number | null;
  routine_name: string | null;
  total_sets: number;
  total_weight_kg: number;
};

export const listSessions = (limit = 50): SessionListItem[] => {
  return db.getAllSync<SessionListItem>(
    `SELECT 
       s.id,
       s.date,
       s.duration_sec,
       s.notes,
       s.routine_id,
       COALESCE(r.name, 'Entrenamiento libre') AS routine_name,
       COUNT(ss.id) AS total_sets,
       ROUND(COALESCE(SUM(CASE WHEN ss.weight IS NOT NULL AND ss.reps IS NOT NULL THEN ss.weight * ss.reps ELSE 0 END), 0)) AS total_weight_kg
     FROM session s
     LEFT JOIN routine r ON r.id = s.routine_id
     LEFT JOIN session_set ss ON ss.session_id = s.id
     GROUP BY s.id
     ORDER BY s.date DESC, s.id DESC
     LIMIT ?`,
    limit
  );
};

export const deleteSession = (id: number) => {
  db.runSync('DELETE FROM session WHERE id = ?', id);
};

export const getMonthSessions = (year: number, month: number) => {
  // month: 1..12
  const mStr = `${year}-${String(month).padStart(2, '0')}`;
  return db.getAllSync<{ id: number; date: string; routine_name: string | null }>(
    `SELECT s.id, s.date, COALESCE(r.name, 'Entrenamiento') AS routine_name
     FROM session s
     LEFT JOIN routine r ON r.id = s.routine_id
     WHERE substr(s.date, 1, 7) = ?
     ORDER BY s.date ASC`,
    mStr
  );
};

export type SessionDetail = {
  session: SessionListItem;
  exercises: {
    exercise_id: number;
    exercise_name: string;
    muscle_group: string;
    type: 'weight' | 'time';
    sets: {
      set_number: number;
      weight: number | null;
      reps: number | null;
      seconds: number | null;
      is_warmup: number;
      notes: string | null;
    }[];
  }[];
};

export const getSessionDetail = (sessionId: number): SessionDetail | null => {
  const session = db.getFirstSync<SessionListItem>(
    `SELECT 
       s.id,
       s.date,
       s.duration_sec,
       s.notes,
       s.routine_id,
       COALESCE(r.name, 'Entrenamiento libre') AS routine_name,
       COUNT(ss.id) AS total_sets,
       ROUND(COALESCE(SUM(CASE WHEN ss.weight IS NOT NULL AND ss.reps IS NOT NULL THEN ss.weight * ss.reps ELSE 0 END), 0)) AS total_weight_kg
     FROM session s
     LEFT JOIN routine r ON r.id = s.routine_id
     LEFT JOIN session_set ss ON ss.session_id = s.id
     WHERE s.id = ?
     GROUP BY s.id`,
    sessionId
  );
  if (!session) return null;

  const rawSets = db.getAllSync<{
    exercise_id: number;
    exercise_name: string;
    muscle_group: string;
    type: 'weight' | 'time';
    set_number: number;
    weight: number | null;
    reps: number | null;
    seconds: number | null;
    is_warmup: number;
    notes: string | null;
  }>(
    `SELECT 
       e.id AS exercise_id,
       e.name AS exercise_name,
       e.muscle_group,
       e.type,
       ss.set_number,
       ss.weight,
       ss.reps,
       ss.seconds,
       ss.is_warmup,
       ss.notes
     FROM session_set ss
     JOIN exercise e ON e.id = ss.exercise_id
     WHERE ss.session_id = ?
     ORDER BY ss.id ASC`,
    sessionId
  );

  const exMap = new Map<number, SessionDetail['exercises'][0]>();
  for (const s of rawSets) {
    if (!exMap.has(s.exercise_id)) {
      exMap.set(s.exercise_id, {
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        muscle_group: s.muscle_group,
        type: s.type,
        sets: [],
      });
    }
    exMap.get(s.exercise_id)!.sets.push({
      set_number: s.set_number,
      weight: s.weight,
      reps: s.reps,
      seconds: s.seconds,
      is_warmup: s.is_warmup,
      notes: s.notes,
    });
  }

  return {
    session,
    exercises: Array.from(exMap.values()),
  };
};

export type ExercisePR = {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  type: 'weight' | 'time';
  max_weight: number | null;
  max_weight_reps: number | null;
  max_weight_date: string | null;
  estimated_1rm: number | null;
  max_seconds: number | null;
  max_seconds_date: string | null;
  total_sets_ever: number;
};

export const getExercisePRs = (): ExercisePR[] => {
  const rows = db.getAllSync<{
    exercise_id: number;
    exercise_name: string;
    muscle_group: string;
    type: 'weight' | 'time';
    max_weight: number | null;
    max_seconds: number | null;
    total_sets_ever: number;
  }>(
    `SELECT 
       e.id AS exercise_id,
       e.name AS exercise_name,
       e.muscle_group,
       e.type,
       MAX(ss.weight) AS max_weight,
       MAX(ss.seconds) AS max_seconds,
       COUNT(ss.id) AS total_sets_ever
     FROM exercise e
     JOIN session_set ss ON ss.exercise_id = e.id
     JOIN session s ON s.id = ss.session_id
     GROUP BY e.id
     ORDER BY e.muscle_group, e.name`
  );

  return rows.map((r) => {
    let maxReps: number | null = null;
    let maxDate: string | null = null;
    let best1RM: number | null = null;

    if (r.type === 'weight' && r.max_weight != null) {
      // Buscar la sesión y reps con ese peso máximo
      const setInfo = db.getFirstSync<{ reps: number | null; date: string }>(
        `SELECT ss.reps, s.date FROM session_set ss
         JOIN session s ON s.id = ss.session_id
         WHERE ss.exercise_id = ? AND ss.weight = ?
         ORDER BY ss.reps DESC, s.date DESC LIMIT 1`,
        r.exercise_id, r.max_weight
      );
      if (setInfo) {
        maxReps = setInfo.reps;
        maxDate = setInfo.date;
      }

      // Buscar el mejor 1RM histórico de cualquier serie realizada
      const allSets = db.getAllSync<{ weight: number; reps: number }>(
        `SELECT weight, reps FROM session_set
         WHERE exercise_id = ? AND weight > 0 AND reps > 0`,
        r.exercise_id
      );
      let highest1RM = 0;
      allSets.forEach((s) => {
        const est = s.reps <= 1 ? s.weight : s.weight * (1 + s.reps / 30);
        if (est > highest1RM) highest1RM = est;
      });
      best1RM = highest1RM > 0 ? Math.round(highest1RM) : null;
    } else if (r.type === 'time' && r.max_seconds != null) {
      const setInfo = db.getFirstSync<{ date: string }>(
        `SELECT s.date FROM session_set ss
         JOIN session s ON s.id = ss.session_id
         WHERE ss.exercise_id = ? AND ss.seconds = ?
         ORDER BY s.date DESC LIMIT 1`,
        r.exercise_id, r.max_seconds
      );
      if (setInfo) maxDate = setInfo.date;
    }

    return {
      exercise_id: r.exercise_id,
      exercise_name: r.exercise_name,
      muscle_group: r.muscle_group,
      type: r.type,
      max_weight: r.max_weight,
      max_weight_reps: maxReps,
      max_weight_date: maxDate,
      estimated_1rm: best1RM,
      max_seconds: r.max_seconds,
      max_seconds_date: maxDate,
      total_sets_ever: r.total_sets_ever,
    };
  });
};

export type ProgressionPoint = {
  session_id: number;
  date: string; // YYYY-MM-DD
  max_weight: number | null;
  best_reps: number | null;
  estimated_1rm: number | null;
  max_seconds: number | null;
};

export const getExerciseProgression = (exerciseId: number): ProgressionPoint[] => {
  const sessions = db.getAllSync<{ session_id: number; date: string }>(
    `SELECT DISTINCT s.id AS session_id, substr(s.date, 1, 10) AS date
     FROM session s
     JOIN session_set ss ON ss.session_id = s.id
     WHERE ss.exercise_id = ?
     ORDER BY s.date ASC`,
    exerciseId
  );

  return sessions.map((sess) => {
    const sets = db.getAllSync<{ weight: number | null; reps: number | null; seconds: number | null }>(
      `SELECT weight, reps, seconds FROM session_set
       WHERE session_id = ? AND exercise_id = ?`,
      sess.session_id, exerciseId
    );

    let maxWeight: number | null = null;
    let bestReps: number | null = null;
    let best1RM: number | null = null;
    let maxSecs: number | null = null;

    sets.forEach((s) => {
      if (s.weight != null) {
        if (maxWeight == null || s.weight > maxWeight) {
          maxWeight = s.weight;
          bestReps = s.reps;
        }
        if (s.weight > 0 && s.reps != null && s.reps > 0) {
          const est = s.reps <= 1 ? s.weight : s.weight * (1 + s.reps / 30);
          if (best1RM == null || est > best1RM) best1RM = est;
        }
      }
      if (s.seconds != null) {
        if (maxSecs == null || s.seconds > maxSecs) maxSecs = s.seconds;
      }
    });

    return {
      session_id: sess.session_id,
      date: sess.date,
      max_weight: maxWeight,
      best_reps: bestReps,
      estimated_1rm: best1RM != null ? Math.round(best1RM) : null,
      max_seconds: maxSecs,
    };
  });
};

// ---------- Peso Corporal ----------
export type BodyWeightEntry = {
  id: number;
  date: string; // YYYY-MM-DD
  kg: number;
};

export const listBodyWeights = (): BodyWeightEntry[] =>
  db.getAllSync<BodyWeightEntry>('SELECT id, substr(date, 1, 10) AS date, kg FROM body_weight ORDER BY date DESC, id DESC');

export const addBodyWeight = (kg: number, date?: string) => {
  const targetDate = date ?? ymd(new Date());
  // Si ya hay un peso registrado en esa fecha, lo actualizamos; sino, insertamos uno nuevo
  const existing = db.getFirstSync<{ id: number }>('SELECT id FROM body_weight WHERE substr(date, 1, 10) = ?', targetDate);
  if (existing) {
    db.runSync('UPDATE body_weight SET kg = ?, date = ? WHERE id = ?', kg, targetDate, existing.id);
    return existing.id;
  }
  return db.runSync('INSERT INTO body_weight (date, kg) VALUES (?, ?)', targetDate, kg).lastInsertRowId;
};

export const deleteBodyWeight = (id: number) =>
  db.runSync('DELETE FROM body_weight WHERE id = ?', id);

export const getLatestBodyWeight = (): BodyWeightEntry | null =>
  db.getFirstSync<BodyWeightEntry>('SELECT id, substr(date, 1, 10) AS date, kg FROM body_weight ORDER BY date DESC, id DESC LIMIT 1') ?? null;

export const getBodyWeightProgression = (): BodyWeightEntry[] =>
  db.getAllSync<BodyWeightEntry>('SELECT id, substr(date, 1, 10) AS date, kg FROM body_weight ORDER BY date ASC, id ASC');

export type BodyWeightStats = {
  latest: number | null;
  latestDate: string | null;
  previous: number | null;
  diff: number | null; // latest - previous
  min: number | null;
  max: number | null;
  totalEntries: number;
};

export const getBodyWeightStats = (): BodyWeightStats => {
  const all = listBodyWeights();
  if (all.length === 0) {
    return { latest: null, latestDate: null, previous: null, diff: null, min: null, max: null, totalEntries: 0 };
  }
  const latest = all[0].kg;
  const latestDate = all[0].date;
  const previous = all.length > 1 ? all[1].kg : null;
  const diff = previous != null ? Math.round((latest - previous) * 10) / 10 : null;

  let min = latest;
  let max = latest;
  all.forEach((e) => {
    if (e.kg < min) min = e.kg;
    if (e.kg > max) max = e.kg;
  });

  return {
    latest,
    latestDate,
    previous,
    diff,
    min,
    max,
    totalEntries: all.length,
  };
};

// ---------- Ajustes Específicos ----------
export const getDefaultRestSeconds = (): number =>
  Number(getSetting('default_rest_seconds', '90'));

export const setDefaultRestSeconds = (sec: number) =>
  setSetting('default_rest_seconds', String(sec));

export const getHapticsEnabled = (): boolean =>
  getSetting('haptics_enabled', 'true') === 'true';

export const setHapticsEnabled = (enabled: boolean) =>
  setSetting('haptics_enabled', enabled ? 'true' : 'false');

export const getReminderSettings = () => ({
  enabled: getSetting('reminder_enabled', 'false') === 'true',
  time: getSetting('reminder_time', '19:00'),
  days: parseDays(getSetting('reminder_days', '1,2,3,4,5')), // Lun a Vie por defecto
});

export const setReminderSettings = (s: { enabled: boolean; time: string; days: number[] }) => {
  setSetting('reminder_enabled', s.enabled ? 'true' : 'false');
  setSetting('reminder_time', s.time);
  setSetting('reminder_days', s.days.sort().join(','));
};

// ---------- Backup & Restore (JSON) ----------
export type GymBackupPayload = {
  version: number;
  app: string;
  exported_at: string;
  exercises: Exercise[];
  routines: Routine[];
  plan_exercises: any[];
  sessions: any[];
  session_sets: any[];
  body_weights: BodyWeightEntry[];
  settings: { key: string; value: string }[];
};

export const exportDatabaseToJson = (): string => {
  const exercises = db.getAllSync<Exercise>('SELECT * FROM exercise');
  const routines = db.getAllSync<Routine>('SELECT * FROM routine');
  const plan_exercises = db.getAllSync<any>('SELECT * FROM plan_exercise');
  const sessions = db.getAllSync<any>('SELECT * FROM session');
  const session_sets = db.getAllSync<any>('SELECT * FROM session_set');
  const body_weights = db.getAllSync<BodyWeightEntry>('SELECT * FROM body_weight');
  const settings = db.getAllSync<{ key: string; value: string }>('SELECT * FROM settings');

  const payload: GymBackupPayload = {
    version: 1,
    app: 'MiProgreso Gym',
    exported_at: new Date().toISOString(),
    exercises,
    routines,
    plan_exercises,
    sessions,
    session_sets,
    body_weights,
    settings,
  };

  return JSON.stringify(payload, null, 2);
};

export const importDatabaseFromJson = (jsonStr: string): { success: boolean; message: string; counts?: any } => {
  try {
    const data = JSON.parse(jsonStr) as GymBackupPayload;
    if (!data || !Array.isArray(data.exercises) || !Array.isArray(data.routines)) {
      return { success: false, message: 'El archivo no contiene un formato de respaldo válido de MiProgreso Gym.' };
    }

    db.withTransactionSync(() => {
      // 1. Limpiar datos existentes en orden de FK
      db.runSync('DELETE FROM session_set');
      db.runSync('DELETE FROM session');
      db.runSync('DELETE FROM plan_exercise');
      db.runSync('DELETE FROM routine');
      db.runSync('DELETE FROM exercise');
      db.runSync('DELETE FROM body_weight');
      db.runSync('DELETE FROM settings');

      // 2. Insertar ejercicios
      for (const e of data.exercises) {
        db.runSync(
          'INSERT INTO exercise (id, name, muscle_group, type, is_custom, notes) VALUES (?, ?, ?, ?, ?, ?)',
          e.id, e.name, e.muscle_group, e.type ?? 'weight', e.is_custom ?? 0, e.notes ?? null
        );
      }

      // 3. Insertar rutinas
      for (const r of data.routines) {
        db.runSync(
          'INSERT INTO routine (id, name, weekdays, position, color) VALUES (?, ?, ?, ?, ?)',
          r.id, r.name, r.weekdays ?? null, r.position ?? 0, r.color ?? null
        );
      }

      // 4. Insertar plan_exercise
      if (Array.isArray(data.plan_exercises)) {
        for (const pe of data.plan_exercises) {
          db.runSync(
            'INSERT INTO plan_exercise (id, routine_id, exercise_id, position, target_sets, target_reps, target_seconds, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            pe.id, pe.routine_id, pe.exercise_id, pe.position, pe.target_sets ?? 3, pe.target_reps ?? '8-12', pe.target_seconds ?? null, pe.rest_seconds ?? 90
          );
        }
      }

      // 5. Insertar sesiones
      if (Array.isArray(data.sessions)) {
        for (const s of data.sessions) {
          db.runSync(
            'INSERT INTO session (id, date, routine_id, duration_sec, notes) VALUES (?, ?, ?, ?, ?)',
            s.id, s.date, s.routine_id ?? null, s.duration_sec ?? null, s.notes ?? null
          );
        }
      }

      // 6. Insertar series de sesiones
      if (Array.isArray(data.session_sets)) {
        for (const ss of data.session_sets) {
          db.runSync(
            'INSERT INTO session_set (id, session_id, exercise_id, set_number, weight, reps, seconds, is_warmup, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ss.id, ss.session_id, ss.exercise_id, ss.set_number, ss.weight ?? null, ss.reps ?? null, ss.seconds ?? null, ss.is_warmup ?? 0, ss.notes ?? null
          );
        }
      }

      // 7. Insertar peso corporal
      if (Array.isArray(data.body_weights)) {
        for (const bw of data.body_weights) {
          db.runSync(
            'INSERT INTO body_weight (id, date, kg) VALUES (?, ?, ?)',
            bw.id, bw.date, bw.kg
          );
        }
      }

      // 8. Insertar settings
      if (Array.isArray(data.settings)) {
        for (const st of data.settings) {
          db.runSync(
            'INSERT INTO settings (key, value) VALUES (?, ?)',
            st.key, st.value
          );
        }
      }
    });

    return {
      success: true,
      message: 'Copia de seguridad restaurada exitosamente.',
      counts: {
        ejercicios: data.exercises.length,
        rutinas: data.routines.length,
        sesiones: data.sessions?.length ?? 0,
        series: data.session_sets?.length ?? 0,
        pesos: data.body_weights?.length ?? 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error al procesar el archivo de copia: ${err?.message || 'Formato incorrecto'}`,
    };
  }
};

export { ymd };


