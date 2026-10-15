import { create } from 'zustand';

import {
  Exercise,
  getLastExerciseSets,
  PlanExercise,
  PreviousSet,
  Routine,
  saveSession,
} from '@/db/repo';
import {
  cancelRestNotification,
  scheduleRestNotification,
  vibrateImpact,
  vibrateSuccess,
  vibrateTimerDone,
} from '@/services/notifications';

export type WorkoutSet = {
  id: string;
  set_number: number;
  weight: string;
  reps: string;
  seconds: string;
  is_warmup: boolean;
  completed: boolean;
};

export type ActiveExercise = {
  exerciseId: number;
  name: string;
  muscle_group: string;
  type: 'weight' | 'time';
  rest_seconds: number;
  target_sets: number;
  target_reps: string | null;
  target_seconds: number | null;
  previousSets: PreviousSet[];
  sets: WorkoutSet[];
};

export type RestTimerState = {
  isActive: boolean;
  totalSeconds: number;
  endsAt: number | null;
  notificationId: string | null;
  exerciseName?: string;
};

export type WorkoutStore = {
  isActive: boolean;
  routineId: number | null;
  routineName: string;
  startTime: number | null;
  notes: string;
  exercises: ActiveExercise[];
  restTimer: RestTimerState;

  // Acciones principales
  startWorkout: (routine: Routine | null, planExercises: PlanExercise[]) => void;
  cancelWorkout: () => void;
  finishWorkout: () => Promise<number | null>;

  // Edición de ejercicios y series
  updateSet: (exerciseIndex: number, setIndex: number, fields: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (exerciseIndex: number, setIndex: number) => void;
  toggleWarmup: (exerciseIndex: number, setIndex: number) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  addExerciseToWorkout: (exercise: Exercise) => void;
  removeExerciseFromWorkout: (exerciseIndex: number) => void;
  setNotes: (notes: string) => void;

  // Temporizador de descanso
  startRestTimer: (seconds: number, exerciseName?: string) => Promise<void>;
  addRestSeconds: (delta: number) => Promise<void>;
  stopRestTimer: () => Promise<void>;
  notifyTimerFinished: () => void;
};

const makeSet = (num: number, prev?: PreviousSet, defaultReps = '10', defaultSeconds = '60'): WorkoutSet => ({
  id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  set_number: num,
  weight: prev?.weight != null ? String(prev.weight) : '',
  reps: prev?.reps != null ? String(prev.reps) : (defaultReps || '10'),
  seconds: prev?.seconds != null ? String(prev.seconds) : (defaultSeconds || '60'),
  is_warmup: !!prev?.is_warmup,
  completed: false,
});

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  isActive: false,
  routineId: null,
  routineName: '',
  startTime: null,
  notes: '',
  exercises: [],
  restTimer: {
    isActive: false,
    totalSeconds: 0,
    endsAt: null,
    notificationId: null,
  },

  startWorkout: (routine, planExercises) => {
    const exercises: ActiveExercise[] = planExercises.map((pe) => {
      const prev = getLastExerciseSets(pe.exercise_id);
      const setsCount = Math.max(1, pe.target_sets || 3);
      const sets: WorkoutSet[] = [];

      for (let i = 1; i <= setsCount; i++) {
        const prevSet = prev[i - 1];
        sets.push(makeSet(i, prevSet, pe.target_reps?.split('-')[0] || '10', pe.target_seconds ? String(pe.target_seconds) : '60'));
      }

      return {
        exerciseId: pe.exercise_id,
        name: pe.name,
        muscle_group: pe.muscle_group,
        type: pe.type,
        rest_seconds: pe.rest_seconds || 90,
        target_sets: pe.target_sets || 3,
        target_reps: pe.target_reps,
        target_seconds: pe.target_seconds,
        previousSets: prev,
        sets,
      };
    });

    set({
      isActive: true,
      routineId: routine?.id ?? null,
      routineName: routine?.name ?? 'Entrenamiento libre',
      startTime: Date.now(),
      notes: '',
      exercises,
      restTimer: { isActive: false, totalSeconds: 0, endsAt: null, notificationId: null },
    });
  },

  cancelWorkout: () => {
    const { restTimer } = get();
    cancelRestNotification(restTimer.notificationId);
    set({
      isActive: false,
      routineId: null,
      routineName: '',
      startTime: null,
      notes: '',
      exercises: [],
      restTimer: { isActive: false, totalSeconds: 0, endsAt: null, notificationId: null },
    });
  },

  finishWorkout: async () => {
    const { isActive, routineId, startTime, notes, exercises, restTimer } = get();
    if (!isActive || !startTime) return null;

    cancelRestNotification(restTimer.notificationId);

    const now = new Date();
    const duration_sec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    // Recopilar sets (priorizando completados; si ninguno está completado pero hay datos, los tomamos)
    const setsToSave: {
      exercise_id: number;
      set_number: number;
      weight: number | null;
      reps: number | null;
      seconds: number | null;
      is_warmup: number;
    }[] = [];

    exercises.forEach((ex) => {
      const validSets = ex.sets.filter((s) => s.completed || (s.weight && s.reps) || s.seconds);
      validSets.forEach((s, idx) => {
        setsToSave.push({
          exercise_id: ex.exerciseId,
          set_number: idx + 1,
          weight: s.weight ? parseFloat(s.weight.replace(',', '.')) || null : null,
          reps: s.reps ? parseInt(s.reps, 10) || null : null,
          seconds: s.seconds ? parseInt(s.seconds, 10) || null : null,
          is_warmup: s.is_warmup ? 1 : 0,
        });
      });
    });

    const sessionId = saveSession({
      routine_id: routineId,
      date: now.toISOString(),
      duration_sec,
      notes: notes.trim() || null,
      sets: setsToSave,
    });

    set({
      isActive: false,
      routineId: null,
      routineName: '',
      startTime: null,
      notes: '',
      exercises: [],
      restTimer: { isActive: false, totalSeconds: 0, endsAt: null, notificationId: null },
    });

    return sessionId;
  },

  updateSet: (exerciseIndex, setIndex, fields) => {
    set((state) => {
      const exercises = [...state.exercises];
      const ex = exercises[exerciseIndex];
      if (!ex) return state;
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], ...fields };
      exercises[exerciseIndex] = { ...ex, sets };
      return { exercises };
    });
  },

  toggleSetCompleted: (exerciseIndex, setIndex) => {
    const state = get();
    const ex = state.exercises[exerciseIndex];
    if (!ex) return;
    const targetSet = ex.sets[setIndex];
    if (!targetSet) return;

    const willBeCompleted = !targetSet.completed;

    set((curr) => {
      const exercises = [...curr.exercises];
      const currentEx = exercises[exerciseIndex];
      const sets = [...currentEx.sets];
      sets[setIndex] = { ...sets[setIndex], completed: willBeCompleted };
      exercises[exerciseIndex] = { ...currentEx, sets };
      return { exercises };
    });

    if (willBeCompleted) {
      vibrateSuccess();
      if (ex.rest_seconds > 0) {
        get().startRestTimer(ex.rest_seconds, ex.name);
      }
    }
  },

  toggleWarmup: (exerciseIndex, setIndex) => {
    vibrateImpact();
    set((state) => {
      const exercises = [...state.exercises];
      const ex = exercises[exerciseIndex];
      if (!ex) return state;
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], is_warmup: !sets[setIndex].is_warmup };
      exercises[exerciseIndex] = { ...ex, sets };
      return { exercises };
    });
  },

  addSet: (exerciseIndex) => {
    vibrateImpact();
    set((state) => {
      const exercises = [...state.exercises];
      const ex = exercises[exerciseIndex];
      if (!ex) return state;

      const lastSet = ex.sets[ex.sets.length - 1];
      const newNum = ex.sets.length + 1;
      const newSet: WorkoutSet = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        set_number: newNum,
        weight: lastSet?.weight || '',
        reps: lastSet?.reps || '10',
        seconds: lastSet?.seconds || '60',
        is_warmup: false,
        completed: false,
      };

      exercises[exerciseIndex] = { ...ex, sets: [...ex.sets, newSet] };
      return { exercises };
    });
  },

  removeSet: (exerciseIndex, setIndex) => {
    vibrateImpact();
    set((state) => {
      const exercises = [...state.exercises];
      const ex = exercises[exerciseIndex];
      if (!ex || ex.sets.length <= 1) return state;

      const sets = ex.sets
        .filter((_, idx) => idx !== setIndex)
        .map((s, idx) => ({ ...s, set_number: idx + 1 }));

      exercises[exerciseIndex] = { ...ex, sets };
      return { exercises };
    });
  },

  addExerciseToWorkout: (exercise) => {
    vibrateImpact();
    const prev = getLastExerciseSets(exercise.id);
    const sets: WorkoutSet[] = [];
    const count = exercise.type === 'time' ? 1 : 3;

    for (let i = 1; i <= count; i++) {
      const p = prev[i - 1];
      sets.push(makeSet(i, p, '10', '60'));
    }

    const newEx: ActiveExercise = {
      exerciseId: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      type: exercise.type,
      rest_seconds: exercise.type === 'time' ? 30 : 90,
      target_sets: count,
      target_reps: exercise.type === 'time' ? null : '10',
      target_seconds: exercise.type === 'time' ? 60 : null,
      previousSets: prev,
      sets,
    };

    set((state) => ({ exercises: [...state.exercises, newEx] }));
  },

  removeExerciseFromWorkout: (exerciseIndex) => {
    vibrateImpact();
    set((state) => ({
      exercises: state.exercises.filter((_, idx) => idx !== exerciseIndex),
    }));
  },

  setNotes: (notes) => set({ notes }),

  startRestTimer: async (seconds, exerciseName) => {
    const { restTimer } = get();
    await cancelRestNotification(restTimer.notificationId);

    const notificationId = await scheduleRestNotification(seconds, exerciseName);
    set({
      restTimer: {
        isActive: true,
        totalSeconds: seconds,
        endsAt: Date.now() + seconds * 1000,
        notificationId,
        exerciseName,
      },
    });
  },

  addRestSeconds: async (delta) => {
    vibrateImpact();
    const { restTimer } = get();
    if (!restTimer.isActive || !restTimer.endsAt) return;

    const remainingSec = Math.max(0, Math.round((restTimer.endsAt - Date.now()) / 1000));
    const newRemaining = Math.max(5, remainingSec + delta);
    const newEndsAt = Date.now() + newRemaining * 1000;

    await cancelRestNotification(restTimer.notificationId);
    const notificationId = await scheduleRestNotification(newRemaining, restTimer.exerciseName);

    set({
      restTimer: {
        ...restTimer,
        totalSeconds: Math.max(restTimer.totalSeconds, newRemaining),
        endsAt: newEndsAt,
        notificationId,
      },
    });
  },

  stopRestTimer: async () => {
    vibrateImpact();
    const { restTimer } = get();
    await cancelRestNotification(restTimer.notificationId);
    set({
      restTimer: {
        isActive: false,
        totalSeconds: 0,
        endsAt: null,
        notificationId: null,
      },
    });
  },

  notifyTimerFinished: () => {
    vibrateTimerDone();
    set((state) => ({
      restTimer: {
        ...state.restTimer,
        isActive: false,
        endsAt: null,
        notificationId: null,
      },
    }));
  },
}));
