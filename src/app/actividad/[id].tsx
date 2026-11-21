import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RouteMap } from '@/components/RouteMap';
import { Btn, Card, T } from '@/components/ui';
import {
  Activity,
  ActivityLap,
  ActivityPoint,
  deleteActivity,
  getActivityById,
  getActivityLaps,
  getActivityPoints,
} from '@/db/activityRepo';
import {
  computeElevationProfile,
  formatDuration,
  formatKm,
  formatPace,
} from '@/services/geo';
import { exportActivityGpx } from '@/services/gpx';
import { C, F, R, WEEKDAYS } from '@/theme';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

export default function ActividadDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityId = Number(id);

  const [activity, setActivity] = useState<Activity | null>(() =>
    Number.isFinite(activityId) ? getActivityById(activityId) : null
  );
  const [laps, setLaps] = useState<ActivityLap[]>(() =>
    Number.isFinite(activityId) ? getActivityLaps(activityId) : []
  );
  const [points, setPoints] = useState<ActivityPoint[]>(() =>
    Number.isFinite(activityId) ? getActivityPoints(activityId) : []
  );
  const [exportingGpx, setExportingGpx] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!Number.isFinite(activityId)) return;
      setActivity(getActivityById(activityId));
      setLaps(getActivityLaps(activityId));
      setPoints(getActivityPoints(activityId));
    }, [activityId])
  );

  const handleExportGpx = async () => {
    if (!activity || points.length === 0) return;
    setExportingGpx(true);
    const res = await exportActivityGpx(activity, points);
    setExportingGpx(false);
    if (!res.success) {
      Alert.alert('Exportar GPX', res.message);
    }
  };

  const handleDelete = () => {
    if (!activity) return;
    Alert.alert(
      'Eliminar actividad',
      '¿Seguro que querés eliminar esta actividad y sus parciales? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteActivity(activity.id);
            router.back();
          },
        },
      ]
    );
  };

  if (!activity) {
    return (
      <View style={s.empty}>
        <Stack.Screen options={{ title: 'Detalle de actividad' }} />
        <Ionicons name="alert-circle-outline" size={36} color={C.muted} />
        <T bold size={16}>Actividad no encontrada</T>
        <Btn title="Volver" variant="outline" small onPress={() => router.back()} />
      </View>
    );
  }

  // Calcular ritmo de cada parcial y barra proporcional (más rápido = barra más larga)
  const lapPaces = laps.map((l) =>
    l.distance_m >= 20 && l.duration_sec > 0 ? l.duration_sec / (l.distance_m / 1000) : null
  );
  const validPaces = lapPaces.filter((p): p is number => p != null);
  const fastestPace = validPaces.length > 0 ? Math.min(...validPaces) : null;
  const slowestPace = validPaces.length > 0 ? Math.max(...validPaces) : null;
  const elevationProfile = computeElevationProfile(points, 24);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
    >
      <Stack.Screen
        options={{
          title: activity.title || (activity.type === 'run' ? 'Carrera' : 'Caminata'),
        }}
      />

      {/* Cabecera */}
      <View style={s.headerRow}>
        <View style={s.badgeIcon}>
          <Ionicons
            name={activity.type === 'run' ? 'flash' : 'walk'}
            size={22}
            color={C.onPrimary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <T muted size={12}>{formatFullDate(activity.started_at)}</T>
          <T size={20} bold>
            {activity.title || (activity.type === 'run' ? 'Carrera' : 'Caminata')}
          </T>
        </View>
        <View style={s.typeTag}>
          <T size={11} bold style={{ color: C.primary }}>
            {activity.type === 'run' ? 'CORRER' : 'CAMINAR'}
          </T>
        </View>
      </View>

      {/* Mapa interactivo del recorrido */}
      {points.length > 0 ? (
        <RouteMap mode="summary" type={activity.type} points={points} height={290} />
      ) : (
        <Card style={s.mapPlaceholder}>
          <Ionicons name="map-outline" size={28} color={C.muted} />
          <View style={{ flex: 1 }}>
            <T bold size={14}>Sin puntos GPS registrados</T>
            <T muted size={12}>
              Esta salida no tuvo suficientes lecturas GPS para dibujar la ruta.
            </T>
          </View>
        </Card>
      )}

      {/* Métricas principales */}
      <View style={s.row3}>
        <Card style={s.statBox}>
          <T muted size={10}>DISTANCIA</T>
          <T size={24} style={{ fontFamily: F.num, color: C.primary }}>
            {formatKm(activity.distance_m)}
          </T>
          <T muted size={11}>km</T>
        </Card>

        <Card style={s.statBox}>
          <T muted size={10}>TIEMPO</T>
          <T size={22} style={{ fontFamily: F.num }}>
            {formatDuration(activity.moving_sec)}
          </T>
          <T muted size={11}>activo</T>
        </Card>

        <Card style={s.statBox}>
          <T muted size={10}>RITMO</T>
          <T size={22} style={{ fontFamily: F.num }}>
            {formatPace(activity.avg_pace_sec_km)}
          </T>
          <T muted size={11}>/km</T>
        </Card>
      </View>

      {/* Métricas secundarias */}
      <View style={s.row3}>
        <Card style={s.statBox}>
          <T muted size={10}>CALORÍAS</T>
          <T size={18} style={{ fontFamily: F.num }}>{activity.kcal}</T>
          <T muted size={11}>kcal</T>
        </Card>

        <Card style={s.statBox}>
          <T muted size={10}>DESNIVEL</T>
          <T size={18} style={{ fontFamily: F.num }}>+{Math.round(activity.elev_gain_m)}</T>
          <T muted size={11}>metros</T>
        </Card>

        <Card style={s.statBox}>
          <T muted size={10}>TOTAL</T>
          <T size={18} style={{ fontFamily: F.num }}>{formatDuration(activity.elapsed_sec)}</T>
          <T muted size={11}>con pausas</T>
        </Card>
      </View>

      {/* Parciales */}
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T bold size={15}>Parciales ({laps.length})</T>
          <T muted size={12}>Ritmo por tramo</T>
        </View>

        {laps.length === 0 ? (
          <T muted size={13}>
            No se completaron parciales de 1 km ni vueltas manuales en esta salida.
          </T>
        ) : (
          <View style={{ gap: 10 }}>
            {laps.map((lap, index) => {
              const pace = lapPaces[index];
              let barPct = 0.6;
              if (pace != null && fastestPace != null && slowestPace != null) {
                if (slowestPace === fastestPace) {
                  barPct = 0.9;
                } else {
                  barPct = 0.35 + 0.6 * ((slowestPace - pace) / (slowestPace - fastestPace));
                }
              }
              return (
                <View key={lap.id} style={{ gap: 4 }}>
                  <View style={s.lapHeader}>
                    <T size={13} bold style={{ width: 82 }}>
                      {lap.kind === 'auto_km' ? `Km ${lap.idx}` : `Vuelta ${lap.idx}`}
                    </T>
                    <T size={12} muted style={{ flex: 1 }}>
                      {formatKm(lap.distance_m)} km · {formatDuration(lap.duration_sec)}
                    </T>
                    <T size={14} style={{ fontFamily: F.num, color: C.primary }}>
                      {formatPace(pace)}/km
                    </T>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${Math.round(barPct * 100)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Perfil de elevación */}
      {elevationProfile && (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T bold size={15}>Perfil de elevación</T>
            <T muted size={12}>
              {elevationProfile.minM} m – {elevationProfile.maxM} m
            </T>
          </View>
          <View style={s.elevChart}>
            {elevationProfile.values.map((val, idx) => {
              const span = Math.max(1, elevationProfile.maxM - elevationProfile.minM);
              const pct = (val - elevationProfile.minM) / span;
              const barH = Math.max(6, Math.round(pct * 52) + 8);
              return (
                <View key={idx} style={s.elevBarWrap}>
                  <View style={[s.elevBar, { height: barH }]} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={12} style={{ color: C.primary }}>↑ {elevationProfile.gainM} m</T>
            <T size={12} muted>↓ {elevationProfile.lossM} m</T>
          </View>
        </Card>
      )}

      {/* Notas si existen */}
      {!!activity.notes && (
        <Card style={{ gap: 4 }}>
          <T muted size={12}>Notas</T>
          <T size={14}>{activity.notes}</T>
        </Card>
      )}

      {/* Exportar GPX */}
      <Pressable
        onPress={handleExportGpx}
        disabled={points.length === 0 || exportingGpx}
        style={({ pressed }) => [
          s.gpxBtn,
          (points.length === 0 || exportingGpx) && { opacity: 0.45 },
          pressed && { opacity: 0.75 },
        ]}
      >
        {exportingGpx ? (
          <ActivityIndicator color={C.primary} size="small" />
        ) : (
          <Ionicons name="share-outline" size={18} color={C.primary} />
        )}
        <T bold size={14} style={{ color: C.primary }}>
          Exportar recorrido GPX
        </T>
      </Pressable>

      {/* Eliminar */}
      <Pressable onPress={handleDelete} style={s.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={C.danger} />
        <T bold size={14} style={{ color: C.danger }}>Eliminar actividad</T>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  empty: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.primary + '1A',
    borderWidth: 1,
    borderColor: C.primary + '44',
  },
  mapPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  row3: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 2,
  },
  lapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.cardAlt,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  elevChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 62,
    gap: 3,
    paddingTop: 4,
  },
  elevBarWrap: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  elevBar: {
    width: '100%',
    borderRadius: 3,
    backgroundColor: C.primary + 'AA',
  },
  gpxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.primary + '55',
    backgroundColor: C.primary + '14',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.danger + '66',
    backgroundColor: C.danger + '14',
    marginTop: 6,
  },
});
