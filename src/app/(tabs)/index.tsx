import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, Card, T } from '@/components/ui';
import { tipOfTheDay } from '@/data/tips';
import {
  daysSinceLastSession, getSetting, listPlan, listRoutines, parseDays, PlanExercise, Routine,
  routineForWeekday, trainedDaysThisWeek, ymd,
} from '@/db/repo';
import { requestNotificationPermissions } from '@/services/notifications';
import { useWorkoutStore } from '@/stores/workoutStore';
import { C, F, WEEKDAYS, WEEKDAYS_SHORT } from '@/theme';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function Hoy() {
  const today = new Date();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selected, setSelected] = useState<Routine | null>(null);
  const [plan, setPlan] = useState<PlanExercise[]>([]);
  const [week, setWeek] = useState<{ monday: Date; dates: Set<string> }>({ monday: today, dates: new Set() });
  const [goal, setGoal] = useState(3);
  const [since, setSince] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);

  // Estado del entrenamiento activo
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const pick = (r: Routine | null) => { setSelected(r); setPlan(r ? listPlan(r.id) : []); };

  useFocusEffect(useCallback(() => {
    const all = listRoutines();
    setRoutines(all);
    setWeek(trainedDaysThisWeek());
    setGoal(Number(getSetting('weekly_goal', '3')));
    setSince(daysSinceLastSession());
    // mantener la selección si sigue existiendo; si no, sugerir la del día
    setSelected((prev) => {
      const r = (prev && all.find((x) => x.id === prev.id)) || routineForWeekday(today.getDay()) || all[0] || null;
      setPlan(r ? listPlan(r.id) : []);
      return r;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const handleStartWorkout = async () => {
    await requestNotificationPermissions();
    if (isWorkoutActive) {
      router.push('/entrenamiento');
      return;
    }
    startWorkout(selected, plan);
    router.push('/entrenamiento');
  };

  const done = week.dates.size;
  const pct = Math.min(1, done / Math.max(goal, 1));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Header */}
        <View>
          <T muted size={13}>{WEEKDAYS[today.getDay()]} {today.getDate()} {MONTHS[today.getMonth()]}</T>
          <T size={24} bold>Mi<T size={24} bold style={{ color: C.primary }}>Progreso</T> Gym</T>
        </View>

        {/* Banner de entrenamiento en curso si está activo */}
        {isWorkoutActive && (
          <Pressable onPress={() => router.push('/entrenamiento')}>
            <Card style={s.activeBanner}>
              <View style={s.activeIndicator} />
              <View style={{ flex: 1 }}>
                <T bold size={15} style={{ color: C.onPrimary }}>Entrenamiento en curso</T>
                <T size={12} style={{ color: C.onPrimary + 'cc' }}>Tocá acá para volver a tu sesión activa</T>
              </View>
              <Ionicons name="arrow-forward" size={20} color={C.onPrimary} />
            </Card>
          </Pressable>
        )}

        {/* Mini semana */}
        <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(week.monday); d.setDate(week.monday.getDate() + i);
            const key = ymd(d);
            const trained = week.dates.has(key);
            const isToday = key === ymd(today);
            return (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <T size={12} muted={!isToday} style={isToday ? { color: C.primary, fontFamily: F.bold } : undefined}>{WEEKDAYS_SHORT[d.getDay()]}</T>
                <View style={[s.dot, trained && { backgroundColor: C.primary, borderColor: C.primary }, isToday && !trained && { borderColor: C.primary }]}>
                  {trained && <Ionicons name="checkmark" size={14} color={C.onPrimary} />}
                </View>
              </View>
            );
          })}
        </Card>

        {/* Meta semanal + días desde último */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <T muted size={12}>Meta semanal</T>
            <T size={26} style={{ fontFamily: F.num, color: C.primary }}>{done}/{goal}</T>
            <View style={s.barBg}><View style={[s.bar, { width: `${pct * 100}%` }]} /></View>
          </Card>
          <Card style={{ flex: 1 }}>
            <T muted size={12}>Último entrenamiento</T>
            <T size={26} style={{ fontFamily: F.num, color: C.primary }}>
              {since === null ? '—' : since === 0 ? 'Hoy' : `${since} d`}
            </T>
            <T muted size={12}>{since === null ? 'Todavía no entrenaste' : since === 0 ? '¡Bien ahí!' : since === 1 ? 'ayer' : 'días atrás'}</T>
          </Card>
        </View>

        {/* Rutina seleccionada */}
        {routines.length === 0 ? (
          <Card style={{ gap: 12 }}>
            <T size={18} bold>Creá tu primera rutina</T>
            <T muted>Armá tus rutinas (ej. "Pecho y tríceps") con los ejercicios, series y descansos que quieras.</T>
            <Btn title="+ Crear rutina" onPress={() => router.push('/rutinas')} />
          </Card>
        ) : (
          <>
            <Card style={{ gap: 10 }}>
              <T muted size={12} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {selected && parseDays(selected.weekdays).includes(today.getDay()) ? 'Rutina de hoy' : 'Rutina elegida'}
              </T>
              <T size={22} bold>{selected?.name ?? 'Elegí una rutina'}</T>
              <T muted size={13}>{plan.length} ejercicios</T>
              {plan.map((p) => (
                <View key={p.id} style={s.row}>
                  <T style={{ flex: 1, fontFamily: F.medium }}>{p.name}</T>
                  <View style={s.pill}>
                    <T size={12} style={{ color: C.primary, fontFamily: F.num }}>
                      {p.type === 'time' ? `${p.target_sets} × ${p.target_seconds}s` : `${p.target_sets} × ${p.target_reps}`}
                    </T>
                  </View>
                </View>
              ))}
              {selected && plan.length === 0 && <Btn small variant="outline" title="+ Agregar ejercicios" onPress={() => router.push(`/rutina/${selected.id}`)} />}
            </Card>
            <Btn
              title={isWorkoutActive ? '▶  Continuar entrenamiento en curso' : '▶  Empezar entrenamiento'}
              onPress={handleStartWorkout}
            />
            <Btn variant="outline" title="⇄  Cambiar rutina" onPress={() => setSheet(true)} />
          </>
        )}

        {/* Consejo del día */}
        <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Ionicons name="bulb-outline" size={20} color={C.primary} />
          <View style={{ flex: 1 }}>
            <T muted size={12}>Consejo del día</T>
            <T size={14}>{tipOfTheDay()}</T>
          </View>
        </Card>
      </ScrollView>

      {/* Bottom sheet: elegir rutina */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={s.backdrop} onPress={() => setSheet(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <T size={18} bold style={{ marginBottom: 8 }}>¿Qué entrenás hoy?</T>
          <ScrollView style={{ maxHeight: 420 }}>
            {routines.map((r) => {
              const active = selected?.id === r.id;
              const days = parseDays(r.weekdays).map((d) => WEEKDAYS[d].slice(0, 3)).join(', ');
              return (
                <Pressable key={r.id} onPress={() => { pick(r); setSheet(false); }} style={[s.option, active && { backgroundColor: C.primary + '22' }]}>
                  <View style={{ flex: 1 }}>
                    <T bold style={active ? { color: C.primary } : undefined}>{r.name}</T>
                    {!!days && <T muted size={12}>{days}</T>}
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  barBg: { height: 6, borderRadius: 3, backgroundColor: C.cardAlt, marginTop: 8, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  backdrop: { flex: 1, backgroundColor: '#0008' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.muted, alignSelf: 'center', marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 4 },
  activeBanner: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.onPrimary,
  },
});
