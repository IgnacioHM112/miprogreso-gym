import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/RouteMap';
import { Card, T } from '@/components/ui';
import { ActivityType } from '@/db/activityRepo';
import { getLatestBodyWeight } from '@/db/repo';
import {
  estimateKcal,
  formatDuration,
  formatKm,
  formatPace,
  suggestActivityType,
} from '@/services/geo';
import { useRunStore } from '@/stores/runStore';
import { C, F } from '@/theme';

export default function CarreraEnVivo() {
  const insets = useSafeAreaInsets();
  const status = useRunStore((s) => s.status);
  const type = useRunStore((s) => s.type);
  const distanceM = useRunStore((s) => s.distanceM);
  const elevGainM = useRunStore((s) => s.elevGainM);
  const currentPaceSecKm = useRunStore((s) => s.currentPaceSecKm);
  const accuracy = useRunStore((s) => s.accuracy);
  const laps = useRunStore((s) => s.laps);
  const liveCoords = useRunStore((s) => s.liveCoords);
  const isAutoPaused = useRunStore((s) => s.isAutoPaused);
  const trackingMode = useRunStore((s) => s.trackingMode);
  const getMovingSeconds = useRunStore((s) => s.getMovingSeconds);
  const pause = useRunStore((s) => s.pause);
  const resume = useRunStore((s) => s.resume);
  const addManualLap = useRunStore((s) => s.addManualLap);
  const finish = useRunStore((s) => s.finish);
  const discard = useRunStore((s) => s.discard);

  const [movingSec, setMovingSec] = useState(0);
  const [expandedMap, setExpandedMap] = useState(false);
  const [weightKg] = useState(() => getLatestBodyWeight()?.kg ?? 75);
  const finishedRef = useRef(false);

  useEffect(() => {
    const sync = () => setMovingSec(getMovingSeconds());
    sync();
    const timer = setInterval(sync, 500);
    return () => clearInterval(timer);
  }, [status, getMovingSeconds]);

  useEffect(() => {
    if (status === 'idle' && !finishedRef.current) {
      router.replace('/(tabs)/correr');
    }
  }, [status]);

  const distKm = distanceM / 1000;
  const avgPaceSecKm = distanceM >= 20 && movingSec > 0 ? movingSec / distKm : null;
  const kcal = estimateKcal(type, distKm, weightKg);

  const completeAndNavigate = (finalType?: ActivityType) => {
    finishedRef.current = true;
    const id = finish(finalType);
    if (id != null) {
      router.replace({ pathname: '/actividad/[id]', params: { id: String(id) } });
    } else {
      router.replace('/(tabs)/correr');
    }
  };

  const handleFinish = () => {
    const wasRecording = status === 'recording';
    if (wasRecording) {
      pause();
    }

    Alert.alert(
      'Finalizar actividad',
      `Registraste ${formatKm(distanceM)} km en ${formatDuration(movingSec)}.`,
      [
        {
          text: 'Seguir',
          style: 'cancel',
          onPress: () => {
            if (wasRecording) resume();
          },
        },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            finishedRef.current = true;
            discard();
            router.replace('/(tabs)/correr');
          },
        },
        {
          text: 'Guardar',
          onPress: () => {
            const suggested = suggestActivityType(avgPaceSecKm, type);
            if (suggested) {
              const suggestedLabel = suggested === 'walk' ? 'Caminar' : 'Correr';
              const currentLabel = type === 'run' ? 'Correr' : 'Caminar';
              Alert.alert(
                'Tipo de actividad sugerido',
                `Tu ritmo medio fue ${formatPace(avgPaceSecKm)}/km. ¿Querés guardarla como ${suggestedLabel}?`,
                [
                  {
                    text: `Mantener ${currentLabel}`,
                    onPress: () => completeAndNavigate(type),
                  },
                  {
                    text: `Guardar como ${suggestedLabel}`,
                    onPress: () => completeAndNavigate(suggested),
                  },
                ]
              );
              return;
            }
            completeAndNavigate(type);
          },
        },
      ]
    );
  };

  const statusLabel =
    status === 'paused'
      ? '❚❚ EN PAUSA'
      : isAutoPaused
        ? 'AUTO-PAUSA'
        : type === 'run'
          ? '● CORRIENDO'
          : '● CAMINANDO';

  const recentLaps = [...laps].reverse().slice(0, 5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.minimizeBtn}>
          <Ionicons name="chevron-down" size={22} color={C.muted} />
        </Pressable>

        <View
          style={[
            s.statusPill,
            status === 'paused' && s.statusPillPaused,
            status === 'recording' && isAutoPaused && s.statusPillAutoPaused,
          ]}
        >
          <T size={12} bold style={{ color: status === 'paused' ? C.text : C.onPrimary }}>
            {statusLabel}
          </T>
        </View>

        <View style={s.gpsPill}>
          <T size={11} muted>
            {accuracy != null ? `GPS ±${Math.round(accuracy)} m` : 'Buscando GPS'}
          </T>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140, gap: 18 }}
      >
        {/* Métrica principal: Distancia */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <T muted size={12} style={{ letterSpacing: 1.5 }}>
            DISTANCIA (KM)
          </T>
          <T
            style={{
              fontFamily: F.num,
              fontSize: 72,
              lineHeight: 80,
              color: C.primary,
            }}
          >
            {formatKm(distanceM)}
          </T>
        </View>

        {/* Grid 2x2 de métricas en vivo */}
        <View style={s.grid}>
          <Card style={s.metricCard}>
            <T muted size={11} style={{ letterSpacing: 0.6 }}>TIEMPO</T>
            <T size={28} style={{ fontFamily: F.num }}>
              {formatDuration(movingSec)}
            </T>
          </Card>

          <Card style={s.metricCard}>
            <T muted size={11} style={{ letterSpacing: 0.6 }}>RITMO ACTUAL</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <T size={28} style={{ fontFamily: F.num }}>
                {formatPace(currentPaceSecKm)}
              </T>
              <T muted size={12}>/km</T>
            </View>
          </Card>

          <Card style={s.metricCard}>
            <T muted size={11} style={{ letterSpacing: 0.6 }}>RITMO MEDIO</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <T size={24} style={{ fontFamily: F.num }}>
                {formatPace(avgPaceSecKm)}
              </T>
              <T muted size={12}>/km</T>
            </View>
          </Card>

          <Card style={s.metricCard}>
            <T muted size={11} style={{ letterSpacing: 0.6 }}>KCAL · DESNIVEL</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <T size={24} style={{ fontFamily: F.num }}>{kcal}</T>
              <T muted size={12}>+{Math.round(elevGainM)} m</T>
            </View>
          </Card>
        </View>

        {/* Mapa en vivo */}
        <View style={{ position: 'relative' }}>
          <RouteMap
            mode="live"
            type={type}
            liveCoords={liveCoords}
            height={expandedMap ? 320 : 190}
          />
          <Pressable
            onPress={() => setExpandedMap((v) => !v)}
            hitSlop={8}
            style={s.mapExpandBtn}
          >
            <Ionicons
              name={expandedMap ? 'contract-outline' : 'expand-outline'}
              size={16}
              color={C.text}
            />
          </Pressable>
        </View>

        {trackingMode !== 'none' && (
          <View style={s.trackingHint}>
            <Ionicons
              name={trackingMode === 'background' ? 'lock-closed-outline' : 'alert-circle-outline'}
              size={14}
              color={trackingMode === 'background' ? C.primary : '#F5C542'}
            />
            <T size={11} muted style={{ flex: 1 }}>
              {trackingMode === 'background'
                ? 'Segundo plano activo · podés bloquear la pantalla'
                : "Solo primer plano · activá ubicación 'Permitir siempre' para bloquear"}
            </T>
          </View>
        )}

        {/* Parciales recientes */}
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T bold size={14}>Parciales ({laps.length})</T>
            <T muted size={12}>Auto cada 1 km</T>
          </View>

          {recentLaps.length === 0 ? (
            <T muted size={13}>
              Los parciales aparecerán automáticamente cada 1 km o cuando toques &quot;VUELTA&quot;.
            </T>
          ) : (
            <View style={{ gap: 8 }}>
              {recentLaps.map((lap) => {
                const lapPace =
                  lap.distance_m >= 20 && lap.duration_sec > 0
                    ? lap.duration_sec / (lap.distance_m / 1000)
                    : null;
                return (
                  <View key={lap.idx} style={s.lapRow}>
                    <T size={13} bold style={{ width: 78 }}>
                      {lap.kind === 'auto_km' ? `Km ${lap.idx}` : `Vuelta ${lap.idx}`}
                    </T>
                    <T size={13} muted style={{ flex: 1 }}>
                      {formatKm(lap.distance_m)} km
                    </T>
                    <T size={14} style={{ fontFamily: F.num, width: 64, textAlign: 'right' }}>
                      {formatDuration(lap.duration_sec)}
                    </T>
                    <T size={13} style={{ fontFamily: F.num, color: C.primary, width: 58, textAlign: 'right' }}>
                      {formatPace(lapPace)}
                    </T>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Controles inferiores */}
      <View style={[s.controlsBar, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <Pressable
          onPress={addManualLap}
          style={({ pressed }) => [s.sideBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="flag-outline" size={20} color={C.text} />
          <T size={11} bold>VUELTA</T>
        </Pressable>

        <Pressable
          onPress={() => (status === 'paused' ? resume() : pause())}
          style={({ pressed }) => [s.mainBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons
            name={status === 'paused' ? 'play' : 'pause'}
            size={32}
            color={C.onPrimary}
          />
        </Pressable>

        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [s.sideBtn, s.finishBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="stop" size={20} color={C.danger} />
          <T size={11} bold style={{ color: C.danger }}>FIN</T>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  minimizeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillPaused: {
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusPillAutoPaused: {
    backgroundColor: '#F5C542',
  },
  mapExpandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg + 'DD',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: -10,
  },
  gpsPill: {
    backgroundColor: C.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  lapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  controlsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    backgroundColor: C.bg + 'F2',
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  sideBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  finishBtn: {
    borderColor: C.danger + '66',
    backgroundColor: C.danger + '14',
  },
  mainBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
