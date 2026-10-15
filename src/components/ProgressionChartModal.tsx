import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Btn, Card, T } from '@/components/ui';
import { ExercisePR, getExerciseProgression, ProgressionPoint } from '@/db/repo';
import { vibrateImpact } from '@/services/notifications';
import { C, F, R } from '@/theme';

export function ProgressionChartModal({
  pr,
  visible,
  onClose,
}: {
  pr: ExercisePR | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [selectedPoint, setSelectedPoint] = useState<ProgressionPoint | null>(null);

  const points = useMemo(() => {
    if (!pr) return [];
    return getExerciseProgression(pr.exercise_id);
  }, [pr]);

  if (!visible || !pr) return null;

  const isTime = pr.type === 'time';

  // Cálculos de progreso
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const firstVal = isTime ? firstPoint?.max_seconds ?? 0 : firstPoint?.max_weight ?? 0;
  const lastVal = isTime ? lastPoint?.max_seconds ?? 0 : lastPoint?.max_weight ?? 0;
  const diffVal = lastVal - firstVal;

  const maxChartVal = useMemo(() => {
    let max = 0;
    points.forEach((p) => {
      const v = isTime ? p.max_seconds ?? 0 : p.max_weight ?? 0;
      if (v > max) max = v;
    });
    return Math.max(max, 10);
  }, [points, isTime]);

  const activePoint = selectedPoint || lastPoint;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.modalCard}>
        <View style={s.handle} />

        {/* Cabecera */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <T size={12} muted style={{ textTransform: 'uppercase' }}>
              {pr.muscle_group} · PROGRESIÓN
            </T>
            <T size={20} bold>{pr.exercise_name}</T>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={C.text} />
          </Pressable>
        </View>

        {/* Métricas clave */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <T size={11} muted>RÉCORD MÁXIMO</T>
            <T size={20} style={{ fontFamily: F.num, color: C.primary }}>
              {isTime ? `${pr.max_seconds ?? 0}s` : `${pr.max_weight ?? 0} kg`}
            </T>
            <T size={11} muted>
              {isTime ? 'Duración' : `${pr.max_weight_reps ?? 0} reps`}
            </T>
          </View>

          {!isTime && (
            <View style={s.statBox}>
              <T size={11} muted>1RM ESTIMADO</T>
              <T size={20} style={{ fontFamily: F.num, color: C.primary }}>
                {pr.estimated_1rm ?? 0} kg
              </T>
              <T size={11} muted>Fórmula Epley</T>
            </View>
          )}

          <View style={s.statBox}>
            <T size={11} muted>EVOLUCIÓN</T>
            <T
              size={18}
              style={{
                fontFamily: F.num,
                color: diffVal >= 0 ? C.primary : C.danger,
              }}
            >
              {diffVal >= 0 ? `+${diffVal}` : diffVal} {isTime ? 's' : 'kg'}
            </T>
            <T size={11} muted>{points.length} sesiones</T>
          </View>
        </View>

        {/* Punto seleccionado / Detalle interactivo */}
        {activePoint && (
          <Card style={s.activePointCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <T size={11} muted>SESIÓN DEL {activePoint.date}</T>
                <T size={17} bold style={{ fontFamily: F.num, color: C.text }}>
                  {isTime
                    ? `${activePoint.max_seconds} segs`
                    : `${activePoint.max_weight} kg × ${activePoint.best_reps ?? 0} reps`}
                </T>
              </View>
              {!isTime && activePoint.estimated_1rm && (
                <View style={s.pill1RM}>
                  <T size={12} bold style={{ color: C.onPrimary, fontFamily: F.num }}>
                    1RM: {activePoint.estimated_1rm} kg
                  </T>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Gráfico de barras interactivo */}
        <View style={s.chartContainer}>
          <T size={11} muted style={{ textTransform: 'uppercase', marginBottom: 8 }}>
            HISTORIAL DE CARGA POR SESIÓN (TOCÁ UNA BARRA)
          </T>

          {points.length <= 1 ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <T muted size={13}>
                Completá más entrenamientos con este ejercicio para ver tu gráfico de evolución.
              </T>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chartScroll}>
              {points.map((p, idx) => {
                const val = isTime ? p.max_seconds ?? 0 : p.max_weight ?? 0;
                const heightPct = Math.max(12, Math.round((val / maxChartVal) * 120));
                const isSelected = activePoint?.session_id === p.session_id;

                const shortDate = p.date.substring(5); // MM-DD

                return (
                  <Pressable
                    key={p.session_id}
                    onPress={() => {
                      vibrateImpact();
                      setSelectedPoint(p);
                    }}
                    style={s.barColumn}
                  >
                    <T size={10} style={{ fontFamily: F.num, color: isSelected ? C.primary : C.muted }}>
                      {val}
                    </T>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          { height: heightPct },
                          isSelected && { backgroundColor: C.primary, borderColor: '#fff', borderWidth: 1 },
                        ]}
                      />
                    </View>
                    <T size={10} muted style={{ marginTop: 4 }}>
                      {shortDate}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <Btn variant="outline" title="Cerrar" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0009',
  },
  modalCard: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.muted + '66',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeBtn: {
    padding: 8,
    borderRadius: R.sm,
    backgroundColor: C.cardAlt,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    padding: 10,
    alignItems: 'center',
  },
  activePointCard: {
    padding: 12,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.primary + '55',
    marginBottom: 12,
  },
  pill1RM: {
    backgroundColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.sm,
  },
  chartContainer: {
    backgroundColor: C.cardAlt,
    borderRadius: R.md,
    padding: 14,
  },
  chartScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    paddingVertical: 8,
    minHeight: 160,
  },
  barColumn: {
    alignItems: 'center',
    width: 38,
  },
  barTrack: {
    height: 120,
    width: 18,
    justifyContent: 'flex-end',
    backgroundColor: C.bg,
    borderRadius: 9,
    overflow: 'hidden',
    marginVertical: 4,
  },
  barFill: {
    width: '100%',
    backgroundColor: C.primary + 'aa',
    borderRadius: 9,
  },
});
