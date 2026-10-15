import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RestTimerBar } from '@/components/RestTimerBar';
import { Btn, Card, T } from '@/components/ui';
import { PickerType, ValuePickerSheet } from '@/components/ValuePickerSheet';
import { ActiveExercise, useWorkoutStore, WorkoutSet } from '@/stores/workoutStore';
import { C, F, R } from '@/theme';

export default function EntrenamientoActivo() {
  const isActive = useWorkoutStore((s) => s.isActive);
  const routineName = useWorkoutStore((s) => s.routineName);
  const startTime = useWorkoutStore((s) => s.startTime);
  const exercises = useWorkoutStore((s) => s.exercises);
  const notes = useWorkoutStore((s) => s.notes);

  const setNotes = useWorkoutStore((s) => s.setNotes);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const toggleSetCompleted = useWorkoutStore((s) => s.toggleSetCompleted);
  const toggleWarmup = useWorkoutStore((s) => s.toggleWarmup);
  const addSet = useWorkoutStore((s) => s.addSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const removeExerciseFromWorkout = useWorkoutStore((s) => s.removeExerciseFromWorkout);
  const cancelWorkout = useWorkoutStore((s) => s.cancelWorkout);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);

  // Cronómetro continuo
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<{ durationMin: number; totalSets: number; totalKg: number } | null>(null);

  // Estado del selector táctil de peso / reps
  const [pickerState, setPickerState] = useState<{
    type: PickerType;
    title: string;
    subtitle?: string;
    currentValue: string;
    previousValue?: string;
    onConfirm: (val: string) => void;
  } | null>(null);

  useEffect(() => {
    if (!startTime) return;
    const updateTime = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Si no está activo y no estamos mostrando el modal de resumen, volver a Hoy
  useEffect(() => {
    if (!isActive && !showSummaryModal) {
      router.replace('/(tabs)');
    }
  }, [isActive, showSummaryModal]);

  // Métricas en tiempo real
  const totalCompletedSets = useMemo(() => {
    let count = 0;
    exercises.forEach((ex) => {
      count += ex.sets.filter((s) => s.completed).length;
    });
    return count;
  }, [exercises]);

  const totalSetsCount = useMemo(() => {
    let count = 0;
    exercises.forEach((ex) => { count += ex.sets.length; });
    return count;
  }, [exercises]);

  const formatElapsedTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar entrenamiento',
      '¿Estás seguro de que querés salir? Se descartarán las series registradas en esta sesión.',
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleFinish = () => {
    const completedSets = exercises.flatMap((ex) => ex.sets.filter((s) => s.completed));

    const promptFinish = () => {
      let totalKg = 0;
      exercises.forEach((ex) => {
        if (ex.type === 'weight') {
          ex.sets.forEach((s) => {
            if (s.completed && s.weight && s.reps) {
              const w = parseFloat(s.weight.replace(',', '.')) || 0;
              const r = parseInt(s.reps, 10) || 0;
              totalKg += w * r;
            }
          });
        }
      });

      const durationMin = Math.max(1, Math.round(elapsedSec / 60));
      setSummaryData({
        durationMin,
        totalSets: completedSets.length,
        totalKg: Math.round(totalKg),
      });

      // Guardar en SQLite
      finishWorkout().then(() => {
        setShowSummaryModal(true);
      });
    };

    if (completedSets.length === 0) {
      Alert.alert(
        'Sin series completadas',
        'No marcaste ninguna serie como completada (✓). ¿Querés finalizar igual?',
        [
          { text: 'Volver', style: 'cancel' },
          { text: 'Finalizar', style: 'destructive', onPress: promptFinish },
        ]
      );
      return;
    }

    promptFinish();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Barra superior con cronómetro y acciones */}
        <View style={s.topBar}>
          <Pressable onPress={handleCancel} hitSlop={10} style={s.cancelBtn}>
            <Ionicons name="close" size={24} color={C.muted} />
          </Pressable>

          <View style={s.timerContainer}>
            <View style={s.pulsingDot} />
            <T size={18} style={{ fontFamily: F.num, color: C.primary }}>
              {formatElapsedTime(elapsedSec)}
            </T>
          </View>

          <Pressable onPress={handleFinish} style={s.finishBtn}>
            <T bold size={14} style={{ color: C.onPrimary }}>Terminar</T>
          </Pressable>
        </View>

        {/* Lista de ejercicios del entrenamiento */}
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cabecera del entrenamiento */}
          <View>
            <T size={22} bold>{routineName}</T>
            <T muted size={13}>
              {totalCompletedSets} de {totalSetsCount} series completadas
            </T>
          </View>

          {exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={`${ex.exerciseId}_${exIdx}`}
              exercise={ex}
              exerciseIndex={exIdx}
              onUpdateSet={(sIdx, f) => updateSet(exIdx, sIdx, f)}
              onToggleComplete={(sIdx) => toggleSetCompleted(exIdx, sIdx)}
              onToggleWarmup={(sIdx) => toggleWarmup(exIdx, sIdx)}
              onAddSet={() => addSet(exIdx)}
              onRemoveSet={(sIdx) => removeSet(exIdx, sIdx)}
              onRemoveExercise={() => removeExerciseFromWorkout(exIdx)}
              onOpenPicker={setPickerState}
            />
          ))}

          {/* Botón para agregar ejercicio extra en vivo */}
          <Btn
            variant="outline"
            title="+ Agregar otro ejercicio a esta sesión"
            onPress={() => router.push({ pathname: '/biblioteca' })}
          />

          {/* Notas de la sesión */}
          <Card style={{ gap: 8, marginTop: 4 }}>
            <T muted size={12}>Notas de la sesión (opcional)</T>
            <TextInput
              placeholder="¿Cómo te sentiste hoy? Sensaciones, pesos, molestias..."
              placeholderTextColor={C.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              style={s.notesInput}
            />
          </Card>
        </ScrollView>

        {/* Temporizador de descanso flotante */}
        <View style={s.floatingRestContainer}>
          <RestTimerBar />
        </View>
      </KeyboardAvoidingView>

      {/* Modal Resumen de Felicitación al terminar */}
      <Modal visible={showSummaryModal} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.celebrateIcon}>
              <Ionicons name="trophy" size={36} color={C.onPrimary} />
            </View>
            <T size={22} bold style={{ textAlign: 'center', marginTop: 12 }}>
              ¡Entrenamiento listo! 🔥
            </T>
            <T muted size={14} style={{ textAlign: 'center', marginTop: 4 }}>
              Excelente trabajo en {routineName}
            </T>

            <View style={s.metricsRow}>
              <View style={s.metricBox}>
                <T size={24} style={{ fontFamily: F.num, color: C.primary }}>
                  {summaryData?.durationMin ?? 0}m
                </T>
                <T muted size={12}>Duración</T>
              </View>
              <View style={s.metricBox}>
                <T size={24} style={{ fontFamily: F.num, color: C.primary }}>
                  {summaryData?.totalSets ?? 0}
                </T>
                <T muted size={12}>Series hechas</T>
              </View>
              <View style={s.metricBox}>
                <T size={24} style={{ fontFamily: F.num, color: C.primary }}>
                  {summaryData?.totalKg ?? 0}
                </T>
                <T muted size={12}>Kg totales</T>
              </View>
            </View>

            <View style={{ marginTop: 24 }}>
              <Btn
                title="Volver al inicio"
                onPress={() => {
                  setShowSummaryModal(false);
                  router.replace('/(tabs)');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Selector táctil sin teclado */}
      {pickerState && (
        <ValuePickerSheet
          visible={!!pickerState}
          type={pickerState.type}
          title={pickerState.title}
          subtitle={pickerState.subtitle}
          currentValue={pickerState.currentValue}
          previousValue={pickerState.previousValue}
          onConfirm={pickerState.onConfirm}
          onClose={() => setPickerState(null)}
        />
      )}
    </SafeAreaView>
  );
}

function ExerciseCard({
  exercise,
  onUpdateSet,
  onToggleComplete,
  onToggleWarmup,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onOpenPicker,
}: {
  exercise: ActiveExercise;
  exerciseIndex: number;
  onUpdateSet: (setIdx: number, fields: Partial<WorkoutSet>) => void;
  onToggleComplete: (setIdx: number) => void;
  onToggleWarmup: (setIdx: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onRemoveExercise: () => void;
  onOpenPicker: (params: {
    type: PickerType;
    title: string;
    subtitle?: string;
    currentValue: string;
    previousValue?: string;
    onConfirm: (val: string) => void;
  }) => void;
}) {
  const isTime = exercise.type === 'time';

  return (
    <Card style={{ gap: 12 }}>
      {/* Encabezado del ejercicio */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T size={17} bold>{exercise.name}</T>
          <T muted size={12}>
            {exercise.muscle_group} {isTime ? '· Por tiempo' : ''} · {exercise.rest_seconds}s descanso
          </T>
        </View>

        <Pressable
          hitSlop={8}
          onPress={() => {
            Alert.alert('Quitar ejercicio', `¿Eliminar "${exercise.name}" de esta sesión?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Quitar', style: 'destructive', onPress: onRemoveExercise },
            ]);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={C.muted} />
        </Pressable>
      </View>

      {/* Encabezados de columnas */}
      <View style={s.setRowHeader}>
        <T muted size={11} style={{ width: 44, textAlign: 'center' }}>SERIE</T>
        <T muted size={11} style={{ flex: 1.2, textAlign: 'center' }}>ANTERIOR</T>
        <T muted size={11} style={{ flex: 1, textAlign: 'center' }}>{isTime ? 'SEGS' : 'KG'}</T>
        <T muted size={11} style={{ flex: 1, textAlign: 'center' }}>{isTime ? 'SERIE' : 'REPS'}</T>
        <T muted size={11} style={{ width: 44, textAlign: 'center' }}>✓</T>
      </View>

      {/* Filas de series */}
      {exercise.sets.map((set, setIdx) => {
        const prev = exercise.previousSets[setIdx];
        const prevText = prev
          ? isTime
            ? `${prev.seconds ?? '-'}s`
            : `${prev.weight ?? 0}k × ${prev.reps ?? 0}`
          : '—';

        return (
          <View
            key={set.id}
            style={[
              s.setRow,
              set.completed && { backgroundColor: C.primary + '12', borderColor: C.primary + '33' },
            ]}
          >
            {/* Número de serie o Calentamiento */}
            <Pressable
              onPress={() => onToggleWarmup(setIdx)}
              hitSlop={6}
              style={[
                s.setNumBadge,
                set.is_warmup && { backgroundColor: '#FFAA00' },
              ]}
            >
              <T
                size={12}
                bold
                style={{
                  color: set.is_warmup ? '#121417' : C.muted,
                  fontFamily: F.num,
                }}
              >
                {set.is_warmup ? 'C' : set.set_number}
              </T>
            </Pressable>

            {/* Datos de la última vez */}
            <View style={{ flex: 1.2, alignItems: 'center' }}>
              <T size={12} muted style={{ fontFamily: F.num }}>
                {prevText}
              </T>
            </View>

            {/* Celda táctil de Peso o Tiempo */}
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Pressable
                onPress={() => onOpenPicker({
                  type: isTime ? 'time' : 'weight',
                  title: exercise.name,
                  subtitle: `Serie ${set.set_number} · ${isTime ? 'Tiempo' : 'Carga'}`,
                  currentValue: isTime ? set.seconds : set.weight,
                  previousValue: isTime
                    ? (prev?.seconds != null ? String(prev.seconds) : undefined)
                    : (prev?.weight != null ? String(prev.weight) : undefined),
                  onConfirm: (val) => {
                    if (isTime) onUpdateSet(setIdx, { seconds: val });
                    else onUpdateSet(setIdx, { weight: val });
                  },
                })}
                style={[s.setInputBtn, set.completed && s.setInputCompleted]}
              >
                <T
                  style={[
                    s.setInputText,
                    (isTime ? set.seconds : set.weight)
                      ? { color: set.completed ? C.primary : C.text }
                      : { color: C.muted + '88' },
                  ]}
                >
                  {(isTime ? set.seconds : set.weight)
                    ? (isTime ? `${set.seconds}s` : set.weight)
                    : prev?.weight != null
                    ? String(prev.weight)
                    : isTime
                    ? '60s'
                    : '0'}
                </T>
              </Pressable>
            </View>

            {/* Celda táctil de Reps */}
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Pressable
                onPress={() => onOpenPicker({
                  type: 'reps',
                  title: exercise.name,
                  subtitle: `Serie ${set.set_number} · Repeticiones`,
                  currentValue: set.reps,
                  previousValue: prev?.reps != null ? String(prev.reps) : undefined,
                  onConfirm: (val) => onUpdateSet(setIdx, { reps: val }),
                })}
                style={[s.setInputBtn, set.completed && s.setInputCompleted]}
              >
                <T
                  style={[
                    s.setInputText,
                    set.reps ? { color: set.completed ? C.primary : C.text } : { color: C.muted + '88' },
                  ]}
                >
                  {set.reps || (prev?.reps != null ? String(prev.reps) : '10')}
                </T>
              </Pressable>
            </View>

            {/* Botón de Completado ✓ */}
            <Pressable
              onPress={() => onToggleComplete(setIdx)}
              hitSlop={6}
              style={[
                s.checkBtn,
                set.completed && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={20}
                color={set.completed ? C.onPrimary : C.border}
              />
            </Pressable>

            {/* Eliminar serie */}
            {exercise.sets.length > 1 && !set.completed && (
              <Pressable
                onPress={() => onRemoveSet(setIdx)}
                hitSlop={6}
                style={{ marginLeft: 2 }}
              >
                <Ionicons name="trash-outline" size={16} color={C.muted} />
              </Pressable>
            )}
          </View>
        );
      })}

      {/* Botón agregar serie */}
      <Pressable onPress={onAddSet} style={s.addSetBtn}>
        <Ionicons name="add" size={18} color={C.primary} />
        <T size={13} bold style={{ color: C.primary }}>Agregar serie</T>
      </Pressable>
    </Card>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cancelBtn: {
    padding: 6,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  finishBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.sm,
  },
  notesInput: {
    backgroundColor: C.cardAlt,
    color: C.text,
    borderRadius: R.sm,
    padding: 12,
    fontFamily: F.regular,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  floatingRestContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
  setRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  setNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setInputBtn: {
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border + '55',
  },
  setInputText: {
    fontFamily: F.num,
    fontSize: 15,
    textAlign: 'center',
  },
  setInputCompleted: {
    backgroundColor: C.card,
    borderColor: C.primary + '44',
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.cardAlt,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: R.sm,
    backgroundColor: C.primary + '14',
    borderWidth: 1,
    borderColor: C.primary + '33',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000c',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: C.border,
  },
  celebrateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    padding: 12,
    alignItems: 'center',
  },
});
