import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, T } from '@/components/ui';
import { C } from '@/theme';

// Fase 3: historial, resumen semanal, calendario mensual, gráficos, PR y 1RM
export default function Progreso() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <T size={24} bold>Progreso</T>
        <Card><T muted>Próximamente: calendario de entrenamientos, resumen semanal, gráficos y récords.</T></Card>
      </ScrollView>
    </SafeAreaView>
  );
}
