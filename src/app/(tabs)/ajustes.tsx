import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, T } from '@/components/ui';
import { getSetting, setSetting } from '@/db/repo';
import { C, F } from '@/theme';

// Fase 4: recordatorios, backup, descanso por defecto
export default function Ajustes() {
  const [goal, setGoal] = useState(Number(getSetting('weekly_goal', '3')));
  const change = (n: number) => { const v = Math.max(1, Math.min(7, n)); setGoal(v); setSetting('weekly_goal', String(v)); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <T size={24} bold>Ajustes</T>
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T bold>Meta semanal</T>
            <T muted size={13}>Entrenamientos por semana</T>
          </View>
          <Pressable onPress={() => change(goal - 1)} hitSlop={10}><T size={26} style={{ color: C.primary, paddingHorizontal: 12 }}>−</T></Pressable>
          <T size={22} style={{ fontFamily: F.num, minWidth: 24, textAlign: 'center' }}>{goal}</T>
          <Pressable onPress={() => change(goal + 1)} hitSlop={10}><T size={26} style={{ color: C.primary, paddingHorizontal: 12 }}>+</T></Pressable>
        </Card>
        <Card><T muted>Próximamente: recordatorios, descanso por defecto, backup.</T></Card>
      </ScrollView>
    </SafeAreaView>
  );
}
