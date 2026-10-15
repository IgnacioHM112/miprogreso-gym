import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Btn, Card, Input, T } from '@/components/ui';
import {
  deleteRoutine, getRoutine, listPlan, movePlanItem, parseDays, PlanExercise, removePlanItem,
  updatePlanItem, updateRoutine,
} from '@/db/repo';
import { C, F, WEEKDAYS_SHORT } from '@/theme';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lunes primero

function Stepper({ label, value, onChange, step = 1, min = 0, suffix = '' }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; suffix?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <T muted size={12}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable hitSlop={8} onPress={() => onChange(Math.max(min, value - step))}><T size={22} style={s.step}>−</T></Pressable>
        <T style={{ fontFamily: F.num, fontSize: 17, minWidth: 40, textAlign: 'center' }}>{value}{suffix}</T>
        <Pressable hitSlop={8} onPress={() => onChange(value + step)}><T size={22} style={s.step}>+</T></Pressable>
      </View>
    </View>
  );
}

export default function EditRoutine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rid = Number(id);
  const [name, setName] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [plan, setPlan] = useState<PlanExercise[]>([]);

  const reload = () => setPlan(listPlan(rid));
  useFocusEffect(useCallback(() => {
    const r = getRoutine(rid);
    if (!r) return;
    setName(r.name); setDays(parseDays(r.weekdays)); reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]));

  const save = (n = name, d = days) => { if (n.trim()) updateRoutine(rid, n.trim(), d); };
  const toggleDay = (d: number) => { const nd = days.includes(d) ? days.filter((x) => x !== d) : [...days, d]; setDays(nd); save(name, nd); };
  const patch = (p: PlanExercise, f: Partial<PlanExercise>) => { const m = { ...p, ...f }; updatePlanItem(p.id, m); reload(); };

  const confirmDelete = () => Alert.alert('Eliminar rutina', `¿Eliminar "${name}"? El historial se conserva.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => { deleteRoutine(rid); router.back(); } },
  ]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: name || 'Editar rutina' }} />
      <Card style={{ gap: 12 }}>
        <T muted size={12}>Nombre</T>
        <Input value={name} onChangeText={setName} onEndEditing={() => save()} />
        <T muted size={12}>Días sugeridos (opcional)</T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {ORDER.map((d) => {
            const on = days.includes(d);
            return (
              <Pressable key={d} onPress={() => toggleDay(d)} style={[s.day, on && { backgroundColor: C.primary, borderColor: C.primary }]}>
                <T bold style={{ color: on ? C.onPrimary : C.text }}>{WEEKDAYS_SHORT[d]}</T>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <T size={18} bold style={{ marginTop: 4 }}>Ejercicios ({plan.length})</T>

      {plan.map((p, i) => (
        <Card key={p.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <T bold>{p.name}</T>
              <T muted size={12}>{p.muscle_group}{p.type === 'time' ? ' · por tiempo' : ''}</T>
            </View>
            <Pressable disabled={i === 0} onPress={() => { movePlanItem(rid, p.id, -1); reload(); }} hitSlop={6}>
              <Ionicons name="chevron-up" size={22} color={i === 0 ? C.border : C.muted} />
            </Pressable>
            <Pressable disabled={i === plan.length - 1} onPress={() => { movePlanItem(rid, p.id, 1); reload(); }} hitSlop={6}>
              <Ionicons name="chevron-down" size={22} color={i === plan.length - 1 ? C.border : C.muted} />
            </Pressable>
            <Pressable onPress={() => { removePlanItem(p.id); reload(); }} hitSlop={6}>
              <Ionicons name="trash-outline" size={20} color={C.danger} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Stepper label="Series" value={p.target_sets} min={1} onChange={(v) => patch(p, { target_sets: v })} />
            {p.type === 'time' ? (
              <Stepper label="Tiempo" value={p.target_seconds ?? 60} step={15} min={15} suffix="s" onChange={(v) => patch(p, { target_seconds: v })} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T muted size={12}>Reps</T>
                <Input
                  defaultValue={p.target_reps ?? ''}
                  onEndEditing={(e) => patch(p, { target_reps: e.nativeEvent.text.trim() || null })}
                  style={{ width: 70, textAlign: 'center', paddingVertical: 6, fontFamily: F.num }}
                />
              </View>
            )}
            <Stepper label="Descanso" value={p.rest_seconds} step={15} suffix="s" onChange={(v) => patch(p, { rest_seconds: v })} />
          </View>
        </Card>
      ))}

      <Btn title="+ Agregar ejercicio" onPress={() => router.push({ pathname: '/biblioteca', params: { routineId: rid } })} />
      <View style={{ height: 12 }} />
      <Btn variant="danger" title="Eliminar rutina" onPress={confirmDelete} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  day: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  step: { color: C.primary, paddingHorizontal: 8 },
});
