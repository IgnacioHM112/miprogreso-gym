import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, T } from '@/components/ui';
import {
  getDefaultRestSeconds,
  getHapticsEnabled,
  getReminderSettings,
  getSetting,
  setDefaultRestSeconds,
  setHapticsEnabled,
  setReminderSettings,
  setSetting,
} from '@/db/repo';
import { exportBackup, importBackup } from '@/services/backup';
import { syncWorkoutReminders, vibrateImpact, vibrateSuccess } from '@/services/notifications';
import { C, F, R } from '@/theme';

const REST_PRESETS = [45, 60, 90, 120, 180];
const WEEKDAY_NAMES = [
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'M' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
  { id: 0, label: 'D' },
];
const TIME_PRESETS = ['07:00', '08:30', '18:00', '19:30', '20:30'];

export default function Ajustes() {
  // 1. Meta semanal
  const [goal, setGoal] = useState(Number(getSetting('weekly_goal', '3')));

  // 2. Descanso predeterminado
  const [defaultRest, setDefaultRest] = useState(getDefaultRestSeconds());

  // 3. Vibración / Haptics
  const [haptics, setHaptics] = useState(getHapticsEnabled());

  // 4. Recordatorios locales
  const reminderInitial = getReminderSettings();
  const [reminderEnabled, setReminderEnabled] = useState(reminderInitial.enabled);
  const [reminderTime, setReminderTime] = useState(reminderInitial.time);
  const [reminderDays, setReminderDays] = useState<number[]>(reminderInitial.days);

  // Estados de carga para backup
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Manejo de Meta semanal
  const changeGoal = (n: number) => {
    const v = Math.max(1, Math.min(7, n));
    vibrateImpact();
    setGoal(v);
    setSetting('weekly_goal', String(v));
  };

  // Manejo de Descanso por defecto
  const handleSelectRest = (sec: number) => {
    vibrateImpact();
    setDefaultRest(sec);
    setDefaultRestSeconds(sec);
  };

  // Manejo de Hápticos
  const handleToggleHaptics = (val: boolean) => {
    setHaptics(val);
    setHapticsEnabled(val);
    if (val) vibrateSuccess();
  };

  // Manejo de Recordatorios
  const handleToggleReminder = async (val: boolean) => {
    vibrateImpact();
    setReminderEnabled(val);
    setReminderSettings({ enabled: val, time: reminderTime, days: reminderDays });
    await syncWorkoutReminders(val, reminderTime, reminderDays);
  };

  const handleToggleDay = async (dayId: number) => {
    vibrateImpact();
    const updated = reminderDays.includes(dayId)
      ? reminderDays.filter((d) => d !== dayId)
      : [...reminderDays, dayId];
    setReminderDays(updated);
    setReminderSettings({ enabled: reminderEnabled, time: reminderTime, days: updated });
    if (reminderEnabled) {
      await syncWorkoutReminders(reminderEnabled, reminderTime, updated);
    }
  };

  const handleSelectTime = async (time: string) => {
    vibrateImpact();
    setReminderTime(time);
    setReminderSettings({ enabled: reminderEnabled, time, days: reminderDays });
    if (reminderEnabled) {
      await syncWorkoutReminders(reminderEnabled, time, reminderDays);
    }
  };

  // Manejo de Exportar Backup
  const handleExport = async () => {
    try {
      setIsExporting(true);
      vibrateImpact();
      const res = await exportBackup();
      if (res.success) {
        vibrateSuccess();
        Alert.alert('Copia generada', 'Tu archivo de respaldo JSON está listo para guardarse o compartirse.');
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo generar la copia.');
    } finally {
      setIsExporting(false);
    }
  };

  // Manejo de Importar Backup
  const handleImport = async () => {
    Alert.alert(
      'Restaurar copia de seguridad',
      '¿Deseas restaurar tus datos desde un archivo JSON? Esta acción reemplazará los datos actuales por los del respaldo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar y elegir archivo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsImporting(true);
              const res = await importBackup();
              if (res.success) {
                vibrateSuccess();
                const counts = res.counts;
                Alert.alert(
                  'Restauración exitosa',
                  `Datos recuperados correctamente:\n• ${counts?.rutinas ?? 0} rutinas\n• ${counts?.sesiones ?? 0} sesiones\n• ${counts?.pesos ?? 0} registros de peso`
                );
              } else if (res.message !== 'No se seleccionó ningún archivo.') {
                Alert.alert('Error al restaurar', res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'No se pudo restaurar la copia.');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
        {/* Cabecera */}
        <View>
          <T size={24} bold>Ajustes</T>
          <T muted size={13}>Configuración personal, descansos y respaldo de datos.</T>
        </View>

        {/* 1. Meta Semanal */}
        <Card style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <T bold size={16}>Meta semanal</T>
              <T muted size={13}>Objetivo de entrenamientos por semana</T>
            </View>
            <View style={s.stepper}>
              <Pressable onPress={() => changeGoal(goal - 1)} hitSlop={10} style={s.stepBtn}>
                <T size={22} bold style={{ color: C.primary }}>−</T>
              </Pressable>
              <T size={20} bold style={{ fontFamily: F.num, minWidth: 28, textAlign: 'center' }}>
                {goal}
              </T>
              <Pressable onPress={() => changeGoal(goal + 1)} hitSlop={10} style={s.stepBtn}>
                <T size={22} bold style={{ color: C.primary }}>+</T>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* 2. Tiempo de descanso por defecto */}
        <Card style={s.card}>
          <View style={{ gap: 4 }}>
            <T bold size={16}>Descanso predeterminado</T>
            <T muted size={13}>Tiempo de recuperación asignado al terminar cada serie</T>
          </View>

          <View style={s.chipsRow}>
            {REST_PRESETS.map((sec) => {
              const active = defaultRest === sec;
              return (
                <Pressable
                  key={sec}
                  onPress={() => handleSelectRest(sec)}
                  style={[s.chip, active && s.chipActive]}
                >
                  <T size={13} bold style={{ color: active ? C.bg : C.text, fontFamily: F.num }}>
                    {sec}s
                  </T>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 3. Vibración & Hápticos */}
        <Card style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <T bold size={16}>Respuesta táctil (Vibración)</T>
              <T muted size={13}>Vibrar al marcar series y cuando finaliza el descanso</T>
            </View>
            <Switch
              value={haptics}
              onValueChange={handleToggleHaptics}
              thumbColor={haptics ? C.primary : '#8A9099'}
              trackColor={{ false: '#262A30', true: 'rgba(198, 244, 50, 0.4)' }}
            />
          </View>
        </Card>

        {/* 4. Recordatorios de entrenamiento */}
        <Card style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <T bold size={16}>Recordatorios de entreno</T>
              <T muted size={13}>Aviso en tu teléfono para no saltarte el gimnasio</T>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              thumbColor={reminderEnabled ? C.primary : '#8A9099'}
              trackColor={{ false: '#262A30', true: 'rgba(198, 244, 50, 0.4)' }}
            />
          </View>

          {reminderEnabled && (
            <View style={{ gap: 12, marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
              {/* Selector de días */}
              <View style={{ gap: 6 }}>
                <T size={13} muted>Días a recordar:</T>
                <View style={s.daysRow}>
                  {WEEKDAY_NAMES.map((w) => {
                    const active = reminderDays.includes(w.id);
                    return (
                      <Pressable
                        key={w.id}
                        onPress={() => handleToggleDay(w.id)}
                        style={[s.dayCircle, active && s.dayCircleActive]}
                      >
                        <T size={13} bold style={{ color: active ? C.bg : C.muted }}>
                          {w.label}
                        </T>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Selector de horario rápido */}
              <View style={{ gap: 6 }}>
                <T size={13} muted>Hora del recordatorio:</T>
                <View style={s.chipsRow}>
                  {TIME_PRESETS.map((t) => {
                    const active = reminderTime === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => handleSelectTime(t)}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <T size={12} bold style={{ color: active ? C.bg : C.text, fontFamily: F.num }}>
                          {t}
                        </T>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* 5. Copia de Seguridad & Restauración */}
        <Card style={s.card}>
          <View style={{ gap: 4 }}>
            <T bold size={16}>Copia de seguridad (Backup)</T>
            <T muted size={13}>
              Tus datos se guardan 100% en tu teléfono. Exporta una copia para guardarla en la nube o transferirla a otro equipo.
            </T>
          </View>

          <View style={{ gap: 10, marginTop: 4 }}>
            <Pressable
              onPress={handleExport}
              disabled={isExporting}
              style={[s.actionBtn, { backgroundColor: C.primary }]}
            >
              {isExporting ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={C.bg} />
                  <T size={15} bold style={{ color: C.bg }}>Exportar datos (JSON)</T>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleImport}
              disabled={isImporting}
              style={[s.actionBtn, { borderWidth: 1, borderColor: C.border }]}
            >
              {isImporting ? (
                <ActivityIndicator color={C.text} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color={C.text} />
                  <T size={15} bold>Restaurar copia (JSON)</T>
                </>
              )}
            </Pressable>
          </View>
        </Card>

        {/* 6. Acerca de la aplicación */}
        <Card style={[s.card, { alignItems: 'center', gap: 8, paddingVertical: 20 }]}>
          <T size={17} bold>MiProgreso Gym</T>
          <T muted size={12} style={{ textAlign: 'center' }}>
            Versión 1.0.0 • Gratuita, Offline & Open Source
          </T>
          <Pressable
            onPress={() => Linking.openURL('https://github.com/IgnacioHM112/miprogreso-gym')}
            style={s.repoLink}
          >
            <Ionicons name="logo-github" size={18} color={C.primary} />
            <T size={13} bold style={{ color: C.primary }}>
              Ver repositorio en GitHub
            </T>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 18,
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    padding: 4,
  },
  stepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.sm,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  dayCircleActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  repoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: 'rgba(198, 244, 50, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionBtn: {
    borderRadius: R.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
