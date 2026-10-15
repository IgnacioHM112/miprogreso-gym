import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Btn, Card, Input, T } from '@/components/ui';
import { addToPlan, createExercise, deleteExercise, Exercise, listExercises } from '@/db/repo';
import { useWorkoutStore } from '@/stores/workoutStore';
import { C } from '@/theme';

const GROUPS = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Calentamiento', 'Elongación', 'Otro'];

export default function Biblioteca() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);
  const addExerciseToWorkout = useWorkoutStore((s) => s.addExerciseToWorkout);

  const [all, setAll] = useState<Exercise[]>(listExercises());
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('Pecho');
  const [newType, setNewType] = useState<'weight' | 'time'>('weight');
  const [added, setAdded] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => all.filter((e) =>
    (!group || e.muscle_group === group) && e.name.toLowerCase().includes(q.toLowerCase())), [all, q, group]);

  const select = (e: Exercise) => {
    if (routineId) {
      addToPlan(Number(routineId), e);
      setAdded(new Set(added).add(e.id));
    } else if (isWorkoutActive) {
      addExerciseToWorkout(e);
      setAdded(new Set(added).add(e.id));
    }
  };

  const create = () => {
    if (!newName.trim()) return;
    createExercise(newName.trim(), newGroup, newType);
    setAll(listExercises()); setNewName(''); setCreating(false);
  };

  const remove = (e: Exercise) => Alert.alert('Eliminar ejercicio', `¿Eliminar "${e.name}"?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => { deleteExercise(e.id); setAll(listExercises()); } },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <Input placeholder="Buscar ejercicio…" value={q} onChangeText={setQ} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[null, ...GROUPS].map((g) => (
            <Pressable key={g ?? 'all'} onPress={() => setGroup(g)} style={[s.chip, group === g && s.chipOn]}>
              <T size={13} style={{ color: group === g ? C.onPrimary : C.text }}>{g ?? 'Todos'}</T>
            </Pressable>
          ))}
        </ScrollView>

        {creating ? (
          <Card style={{ gap: 10 }}>
            <T bold>Nuevo ejercicio</T>
            <Input placeholder="Nombre" value={newName} onChangeText={setNewName} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {GROUPS.map((g) => (
                <Pressable key={g} onPress={() => setNewGroup(g)} style={[s.chip, newGroup === g && s.chipOn]}>
                  <T size={12} style={{ color: newGroup === g ? C.onPrimary : C.text }}>{g}</T>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['weight', 'time'] as const).map((t) => (
                <Pressable key={t} onPress={() => setNewType(t)} style={[s.chip, { flex: 1, alignItems: 'center' }, newType === t && s.chipOn]}>
                  <T size={13} style={{ color: newType === t ? C.onPrimary : C.text }}>{t === 'weight' ? 'Peso × reps' : 'Por tiempo'}</T>
                </Pressable>
              ))}
            </View>
            <Btn title="Guardar" onPress={create} />
          </Card>
        ) : (
          <Btn variant="outline" small title="+ Crear ejercicio propio" onPress={() => setCreating(true)} />
        )}

        {filtered.map((e) => {
          const isAdded = added.has(e.id);
          return (
            <Pressable key={e.id} onPress={() => select(e)} onLongPress={() => e.is_custom && remove(e)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ flex: 1 }}>
                  <T>{e.name}</T>
                  <T muted size={12}>{e.muscle_group}{e.type === 'time' ? ' · tiempo' : ''}{e.is_custom ? ' · propio' : ''}</T>
                </View>
                {(routineId || isWorkoutActive) && (
                  <Ionicons name={isAdded ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={C.primary} />
                )}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
      {(routineId || isWorkoutActive) && (
        <View style={s.footer}>
          <Btn title={added.size ? `Listo (${added.size} agregados)` : 'Listo'} onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 24 },
});
