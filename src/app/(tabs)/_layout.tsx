import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';

import { C, F } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.medium },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Hoy', tabBarIcon: icon('flash') }} />
      <Tabs.Screen name="rutinas" options={{ title: 'Rutinas', tabBarIcon: icon('list') }} />
      <Tabs.Screen name="progreso" options={{ title: 'Progreso', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
