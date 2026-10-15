import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('gym.db');

const SEED: [string, string][] = [
  ['Press banca plano', 'Pecho'], ['Press banca inclinado', 'Pecho'], ['Aperturas con mancuernas', 'Pecho'], ['Fondos', 'Pecho'],
  ['Dominadas', 'Espalda'], ['Remo con barra', 'Espalda'], ['Jalón al pecho', 'Espalda'], ['Remo en polea baja', 'Espalda'], ['Peso muerto', 'Espalda'],
  ['Sentadilla', 'Piernas'], ['Prensa', 'Piernas'], ['Extensión de cuádriceps', 'Piernas'], ['Curl femoral', 'Piernas'], ['Peso muerto rumano', 'Piernas'], ['Pantorrillas', 'Piernas'],
  ['Press militar', 'Hombros'], ['Elevaciones laterales', 'Hombros'], ['Face pull', 'Hombros'],
  ['Curl con barra', 'Bíceps'], ['Curl martillo', 'Bíceps'],
  ['Extensión en polea', 'Tríceps'], ['Press francés', 'Tríceps'],
  ['Crunch en polea', 'Core'],
];

const SEED_TIME: [string, string][] = [
  ['Cinta / caminata', 'Calentamiento'], ['Bicicleta', 'Calentamiento'], ['Elíptico', 'Calentamiento'], ['Movilidad articular', 'Calentamiento'], ['Saltar la soga', 'Calentamiento'],
  ['Elongación isquiotibiales', 'Elongación'], ['Elongación cuádriceps', 'Elongación'], ['Elongación pecho', 'Elongación'], ['Elongación hombros', 'Elongación'], ['Elongación espalda baja', 'Elongación'],
  ['Plancha', 'Core'],
];

export function initDb() {
  db.execSync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS exercise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'weight', -- 'weight' | 'time'
      is_custom INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS routine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,          -- "Pecho y tríceps"
      weekdays TEXT,               -- días sugeridos CSV "1,4" (0=Dom..6=Sáb), opcional
      position INTEGER NOT NULL DEFAULT 0,
      color TEXT
    );
    CREATE TABLE IF NOT EXISTS plan_exercise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL REFERENCES routine(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      target_sets INTEGER NOT NULL DEFAULT 3,
      target_reps TEXT DEFAULT '8-12',
      target_seconds INTEGER,
      rest_seconds INTEGER NOT NULL DEFAULT 90
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      routine_id INTEGER REFERENCES routine(id) ON DELETE SET NULL,
      duration_sec INTEGER,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS session_set (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercise(id),
      set_number INTEGER NOT NULL,
      weight REAL,
      reps INTEGER,
      seconds INTEGER,
      is_warmup INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS body_weight (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      kg REAL NOT NULL
    );
  `);

  const count = db.getFirstSync<{ c: number }>('SELECT COUNT(*) c FROM exercise');
  if (!count?.c) {
    for (const [name, group] of SEED) {
      db.runSync('INSERT INTO exercise (name, muscle_group, type) VALUES (?, ?, ?)', name, group, 'weight');
    }
    for (const [name, group] of SEED_TIME) {
      db.runSync('INSERT INTO exercise (name, muscle_group, type) VALUES (?, ?, ?)', name, group, 'time');
    }
    db.runSync("INSERT OR IGNORE INTO settings (key, value) VALUES ('weekly_goal', '3')");
  }
}

/** 1RM estimado (Epley) */
export const estimate1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));
