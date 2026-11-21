import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, T } from '@/components/ui';
import {
  Activity,
  ActivityType,
  CardioPersonalRecords,
  deleteActivity,
  getCardioPersonalRecords,
  getWeeklyCardioStats,
  getWeeklyDailyKm,
  listActivities,
} from '@/db/activityRepo';
import { formatDuration, formatKm, formatPace } from '@/services/geo';
import { vibrateImpact } from '@/services/notifications';
import { useRunStore } from '@/stores/runStore';
import { C, F, R } from '@/theme';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

export default function CorrerTab() {
  const status = useRunStore((s) => s.status);
  const selectedType = useRunStore((s) => s.type);
  const liveAccuracy = useRunStore((s) => s.accuracy);
  const liveDistanceM = useRunStore((s) => s.distanceM);
  const setType = useRunStore((s) => s.setType);
  const autoPauseEnabled = useRunStore((s) => s.autoPauseEnabled);
  const setAutoPauseEnabled = useRunStore((s) => s.setAutoPauseEnabled);
  const startRun = useRunStore((s) => s.start);

  const [permStatus, setPermStatus] = useState<'checking' | 'granted' | 'denied' | 'web'>(
    Platform.OS === 'web' ? 'web' : 'checking'
  );
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [weekly, setWeekly] = useState({ totalDistanceM: 0, totalMovingSec: 0, count: 0 });
  const [dailyKm, setDailyKm] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [prs, setPrs] = useState<CardioPersonalRecords>({
    best1kSec: null,
    best5kSec: null,
    best10kSec: null,
    longestM: 0,
  });

  const loadData = useCallback(() => {
    setActivities(listActivities(30));
    setWeekly(getWeeklyCardioStats());
    setDailyKm(getWeeklyDailyKm());
    setPrs(getCardioPersonalRecords());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();

      if (Platform.OS === 'web') {
        setPermStatus('web');
        return;
      }

      let active = true;
      (async () => {
        try {
          const perm = await Location.getForegroundPermissionsAsync();
          if (!active) return;
          if (perm.status === 'granted') {
            setPermStatus('granted');
            const last = await Location.getLastKnownPositionAsync();
            if (active && last?.coords.accuracy != null) {
              setLastAccuracy(Math.round(last.coords.accuracy));
            }
          } else {
            setPermStatus('denied');
          }
        } catch {
          if (active) setPermStatus('denied');
        }
      })();

      return () => {
        active = false;
      };
    }, [loadData])
  );

  const handleSelectType = (next: ActivityType) => {
    vibrateImpact();
    setType(next);
  };

  const handleStart = async () => {
    if (status !== 'idle') {
      router.push('/carrera');
      return;
    }
    setStarting(true);
    const res = await startRun(selectedType);
    setStarting(false);

    if (!res.ok) {
      Alert.alert('GPS no disponible', res.error ?? 'No se pudo iniciar el seguimiento GPS.');
      return;
    }
    setPermStatus('granted');
    router.push('/carrera');
  };

  const handleDelete = (item: Activity) => {
    Alert.alert(
      'Eliminar actividad',
      `¿Querés eliminar esta ${item.type === 'run' ? 'carrera' : 'caminata'} de ${formatKm(item.distance_m)} km?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteActivity(item.id);
            loadData();
          },
        },
      ]
    );
  };

  const shownAccuracy = liveAccuracy != null ? Math.round(liveAccuracy) : lastAccuracy;
  const gpsLabel =
    permStatus === 'web'
      ? 'Solo móvil'
      : permStatus === 'checking'
        ? 'Verificando GPS...'
        : permStatus === 'granted'
          ? shownAccuracy != null
            ? `GPS listo · ±${shownAccuracy} m`
            : 'GPS listo'
          : 'Permiso GPS pendiente';

  const gpsDotColor =
    permStatus === 'granted' ? C.primary : permStatus === 'web' ? C.danger : '#F5C542';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {/* Cabecera */}
        <View style={s.header}>
          <View>
            <T size={24} bold>Correr</T>
            <T muted size={13}>Registrá tus salidas con GPS, ritmo y parciales</T>
          </View>
          <View style={s.gpsBadge}>
            <View style={[s.gpsDot, { backgroundColor: gpsDotColor }]} />
            <T size={11} bold style={{ color: C.text }}>{gpsLabel}</T>
          </View>
        </View>

        {/* Aviso Web */}
        {Platform.OS === 'web' && (
          <Card style={s.webNotice}>
            <Ionicons name="information-circle-outline" size={20} color="#F5C542" />
            <View style={{ flex: 1 }}>
              <T bold size={14}>Modo GPS exclusivo para Android</T>
              <T muted size={12}>
                La grabación de distancia y rutas por GPS requiere la app en el teléfono.
              </T>
            </View>
          </Card>
        )}

        {/* Banner de actividad activa */}
        {status !== 'idle' && (
          <Pressable onPress={() => router.push('/carrera')}>
            <Card style={s.activeBanner}>
              <View style={s.activePulse} />
              <View style={{ flex: 1 }}>
                <T bold size={15} style={{ color: C.onPrimary }}>
                  {status === 'paused' ? 'Actividad en pausa' : 'Actividad en curso'} · {formatKm(liveDistanceM)} km
                </T>
                <T size={12} style={{ color: C.onPrimary + 'cc' }}>
                  {status === 'paused'
                    ? 'Tocá acá para reanudar o guardar tu salida'
                    : 'Tocá acá para volver a la pantalla en vivo'}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.onPrimary} />
            </Card>
          </Pressable>
        )}

        {/* Card de inicio rápido */}
        <Card style={{ gap: 14 }}>
          <View style={s.segmented}>
            <Pressable
              onPress={() => handleSelectType('run')}
              style={[s.segBtn, selectedType === 'run' && s.segBtnActive]}
            >
              <Ionicons
                name="flash-outline"
                size={16}
                color={selectedType === 'run' ? C.onPrimary : C.muted}
              />
              <T
                size={14}
                bold
                style={{ color: selectedType === 'run' ? C.onPrimary : C.muted }}
              >
                Correr
              </T>
            </Pressable>

            <Pressable
              onPress={() => handleSelectType('walk')}
              style={[s.segBtn, selectedType === 'walk' && s.segBtnActive]}
            >
              <Ionicons
                name="walk-outline"
                size={16}
                color={selectedType === 'walk' ? C.onPrimary : C.muted}
              />
              <T
                size={14}
                bold
                style={{ color: selectedType === 'walk' ? C.onPrimary : C.muted }}
              >
                Caminar
              </T>
            </Pressable>
          </View>

          <View style={s.autoPauseRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <T size={13} bold>Auto-pausa al detenerse</T>
              <T muted size={11}>Pausa el tiempo en semáforos o frenadas</T>
            </View>
            <Switch
              value={autoPauseEnabled}
              onValueChange={(val) => {
                vibrateImpact();
                setAutoPauseEnabled(val);
              }}
              thumbColor={autoPauseEnabled ? C.primary : '#8A9099'}
              trackColor={{ false: '#262A30', true: 'rgba(198, 244, 50, 0.4)' }}
            />
          </View>

          <Pressable
            onPress={handleStart}
            disabled={starting || Platform.OS === 'web'}
            style={({ pressed }) => [
              s.startBtn,
              (starting || Platform.OS === 'web') && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
          >
            {starting ? (
              <ActivityIndicator color={C.onPrimary} />
            ) : (
              <>
                <Ionicons
                  name={status !== 'idle' ? 'arrow-forward' : 'play'}
                  size={20}
                  color={C.onPrimary}
                />
                <T size={16} bold style={{ color: C.onPrimary, letterSpacing: 0.5 }}>
                  {status !== 'idle'
                    ? 'VOLVER A LA ACTIVIDAD'
                    : `INICIAR · ${selectedType === 'run' ? 'CORRER' : 'CAMINAR'}`}
                </T>
              </>
            )}
          </Pressable>

          <T muted size={12} style={{ textAlign: 'center' }}>
            Grabación en segundo plano con pantalla bloqueada · Parciales cada 1 km
          </T>
        </Card>

        {/* Resumen semanal + barras por día */}
        <Card style={{ gap: 12 }}>
          <View style={s.rowBetween}>
            <T bold size={15}>Esta semana</T>
            <T muted size={12}>Lun – Dom</T>
          </View>
          <View style={s.weeklyGrid}>
            <View style={s.weeklyBox}>
              <T size={24} style={{ fontFamily: F.num, color: C.primary }}>
                {formatKm(weekly.totalDistanceM)}
              </T>
              <T muted size={11}>km totales</T>
            </View>
            <View style={s.weeklyBox}>
              <T size={24} style={{ fontFamily: F.num, color: C.text }}>
                {weekly.count}
              </T>
              <T muted size={11}>{weekly.count === 1 ? 'salida' : 'salidas'}</T>
            </View>
            <View style={s.weeklyBox}>
              <T size={24} style={{ fontFamily: F.num, color: C.text }}>
                {formatDuration(weekly.totalMovingSec)}
              </T>
              <T muted size={11}>tiempo activo</T>
            </View>
          </View>

          {(() => {
            const maxKm = Math.max(0.5, ...dailyKm);
            const todayIdx = (new Date().getDay() + 6) % 7;
            return (
              <View style={s.weekBarsWrap}>
                {dailyKm.map((km, idx) => {
                  const h = km > 0 ? Math.max(8, Math.round((km / maxKm) * 52)) : 4;
                  const isToday = idx === todayIdx;
                  return (
                    <View key={idx} style={s.weekBarCol}>
                      <View style={s.weekBarTrack}>
                        <View
                          style={[
                            s.weekBar,
                            {
                              height: h,
                              backgroundColor:
                                km > 0
                                  ? isToday
                                    ? C.primary
                                    : C.primary + '88'
                                  : C.border,
                            },
                          ]}
                        />
                      </View>
                      <T
                        size={10}
                        bold={isToday}
                        style={{ color: isToday ? C.primary : C.muted }}
                      >
                        {DAYS_SHORT[idx]}
                      </T>
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </Card>

        {/* Récords personales */}
        <View style={s.prRow}>
          <Card style={s.prBox}>
            <T muted size={10}>MEJOR 1K</T>
            <T size={17} style={{ fontFamily: F.num, color: prs.best1kSec != null ? C.primary : C.muted }}>
              {prs.best1kSec != null ? formatDuration(prs.best1kSec) : '--:--'}
            </T>
          </Card>

          <Card style={s.prBox}>
            <T muted size={10}>MEJOR 5K</T>
            <T size={17} style={{ fontFamily: F.num, color: prs.best5kSec != null ? C.primary : C.muted }}>
              {prs.best5kSec != null ? formatDuration(prs.best5kSec) : '--:--'}
            </T>
            {prs.best10kSec != null && (
              <T muted size={10}>10K {formatDuration(prs.best10kSec)}</T>
            )}
          </Card>

          <Card style={s.prBox}>
            <T muted size={10}>MÁS LARGA</T>
            <T size={17} style={{ fontFamily: F.num, color: prs.longestM > 0 ? C.text : C.muted }}>
              {prs.longestM > 0 ? `${formatKm(prs.longestM)} km` : '0,00 km'}
            </T>
          </Card>
        </View>

        {/* Historial reciente */}
        <View style={{ gap: 10 }}>
          <T size={13} bold muted style={{ letterSpacing: 0.6 }}>
            ACTIVIDADES RECIENTES
          </T>

          {activities.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
              <Ionicons name="navigate-outline" size={28} color={C.muted} />
              <T bold size={15}>Todavía no registraste salidas</T>
              <T muted size={13} style={{ textAlign: 'center' }}>
                Tocá &quot;INICIAR&quot; para grabar tu primera carrera o caminata con GPS.
              </T>
            </Card>
          ) : (
            activities.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/actividad/[id]', params: { id: String(item.id) } })}
              >
                <Card style={s.activityCard}>
                  <View style={s.activityIcon}>
                    <Ionicons
                      name={item.type === 'run' ? 'flash' : 'walk'}
                      size={20}
                      color={C.onPrimary}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T bold size={15} numberOfLines={1} style={{ flexShrink: 1 }}>
                        {item.title || (item.type === 'run' ? 'Carrera' : 'Caminata')}
                      </T>
                      <T size={11} muted>
                        · {item.type === 'run' ? 'Correr' : 'Caminar'}
                      </T>
                    </View>
                    <T muted size={12} style={{ marginTop: 2 }}>
                      {formatActivityDate(item.started_at)}
                    </T>
                    <View style={s.metricsInline}>
                      <T size={14} style={{ fontFamily: F.num, color: C.primary }}>
                        {formatKm(item.distance_m)} km
                      </T>
                      <T muted size={12}>·</T>
                      <T size={13} style={{ fontFamily: F.num }}>
                        {formatDuration(item.moving_sec)}
                      </T>
                      <T muted size={12}>·</T>
                      <T size={13} style={{ fontFamily: F.num }} muted>
                        {formatPace(item.avg_pace_sec_km)}/km
                      </T>
                    </View>
                  </View>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    hitSlop={10}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={C.muted} />
                  </Pressable>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F5C54266',
  },
  activeBanner: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  activePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.onPrimary,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: C.cardAlt,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: R.sm,
  },
  segBtnActive: {
    backgroundColor: C.primary,
  },
  autoPauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  startBtn: {
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  weeklyBox: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  weekBarsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 4,
  },
  weekBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  weekBarTrack: {
    height: 54,
    width: '100%',
    justifyContent: 'flex-end',
  },
  weekBar: {
    width: '100%',
    borderRadius: 6,
  },
  prRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 2,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
});
