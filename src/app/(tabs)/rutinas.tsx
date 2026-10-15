import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, Card, Input, T } from '@/components/ui';
import { createRoutine, listPlan, listRoutines, parseDays, Routine } from '@/db/repo';
import { C, WEEKDAYS } from '@/theme';

export default function Rutinas() {
  const [items, setItems] = useState<(Routine & { count: number })[]>([]);
  const [name, setName] = useState('');

  const load = () => setItems(listRoutines().map((r) => ({ ...r, count: listPlan(r.id).length })));
  useFocusEffect(useCallback(load, []));

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = createRoutine(n);
    setName('');
    router.push(`/rutina/${id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <T size={24} bold>Mis rutinas</T>
        <T muted size={13}>Creá todas las que necesites y asignales días sugeridos (opcional).</T>

        <Card style={{ gap: 10 }}>
          <Input placeholder='Nueva rutina, ej. "Pecho y bíceps"' value={name} onChangeText={setName} onSubmitEditing={add} />
          <Btn title="+ Crear rutina" onPress={add} />
        </Card>

        {items.map((r) => {
          const days = parseDays(r.weekdays).map((d) => WEEKDAYS[d].slice(0, 3)).join(' · ');
          return (
            <Pressable key={r.id} onPress={() => router.push(`/rutina/${r.id}`)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <T size={17} bold>{r.name}</T>
                  <T muted size={13}>{r.count} ejercicios{days ? `  ·  ${days}` : ''}</T>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.muted} />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
