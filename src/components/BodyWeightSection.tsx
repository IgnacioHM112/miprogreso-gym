import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { AddWeightModal } from '@/components/AddWeightModal';
import { Btn, Card, T } from '@/components/ui';
import {
  BodyWeightEntry,
  deleteBodyWeight,
  getBodyWeightProgression,
  getBodyWeightStats,
  listBodyWeights,
} from '@/db/repo';
import { vibrateImpact, vibrateSuccess } from '@/services/notifications';
import { C, F, R } from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function BodyWeightSection() {
  const [modalVisible, setModalVisible] = useState(false);
  const [history, setHistory] = useState<BodyWeightEntry[]>([]);
  const [progression, setProgression] = useState<BodyWeightEntry[]>([]);
  const [stats, setStats] = useState(getBodyWeightStats());
  const [selectedEntry, setSelectedEntry] = useState<BodyWeightEntry | null>(null);

  const reload = useCallback(() => {
    setHistory(listBodyWeights());
    const prog = getBodyWeightProgression();
    setProgression(prog);
    setStats(getBodyWeightStats());
    if (prog.length > 0) {
      setSelectedEntry(prog[prog.length - 1]);
    } else {
      setSelectedEntry(null);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const handleDelete = (id: number, kg: number, date: string) => {
    Alert.alert(
      'Eliminar registro',
      `¿Deseas eliminar el pesaje de ${kg} kg del día ${date}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteBodyWeight(id);
            vibrateImpact();
            reload();
          },
        },
      ]
    );
  };

  // Puntos para el gráfico (últimos 14 registros para que entren cómodamente)
  const chartData = progression.slice(-14);
  const minVal = chartData.length > 0 ? Math.min(...chartData.map((d) => d.kg)) - 1 : 60;
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map((d) => d.kg)) + 1 : 100;
  const range = Math.max(1, maxVal - minVal);

  return (
    <View style={{ gap: 16 }}>
      {/* Tarjeta de Resumen */}
      <Card style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <T muted size={12} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Último Peso Registrado
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <T size={36} bold style={{ fontFamily: F.num, color: C.text }}>
                {stats.latest != null ? stats.latest.toFixed(1) : '−−'}
              </T>
              <T size={20} bold style={{ color: C.primary }}>
                kg
              </T>
            </View>
            {stats.latestDate && (
              <T muted size={12} style={{ marginTop: 2 }}>
                Registrado el {stats.latestDate}
              </T>
            )}
          </View>

          {/* Tarjeta de Diferencia */}
          {stats.diff != null && (
            <View
              style={[
                s.diffBadge,
                { backgroundColor: stats.diff <= 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 146, 60, 0.15)' },
              ]}
            >
              <Ionicons
                name={stats.diff <= 0 ? 'arrow-down' : 'arrow-up'}
                size={14}
                color={stats.diff <= 0 ? '#4ADE80' : '#FB923C'}
              />
              <T
                size={13}
                bold
                style={{
                  fontFamily: F.num,
                  color: stats.diff <= 0 ? '#4ADE80' : '#FB923C',
                }}
              >
                {stats.diff > 0 ? `+${stats.diff.toFixed(1)}` : stats.diff.toFixed(1)} kg
              </T>
            </View>
          )}
        </View>

        {/* Métricas secundarias */}
        {stats.totalEntries > 0 && (
          <View style={s.metricsRow}>
            <View style={s.metricItem}>
              <T muted size={11}>MÍNIMO</T>
              <T size={15} bold style={{ fontFamily: F.num }}>
                {stats.min?.toFixed(1)} kg
              </T>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <T muted size={11}>MÁXIMO</T>
              <T size={15} bold style={{ fontFamily: F.num }}>
                {stats.max?.toFixed(1)} kg
              </T>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <T muted size={11}>REGISTROS</T>
              <T size={15} bold style={{ fontFamily: F.num }}>
                {stats.totalEntries}
              </T>
            </View>
          </View>
        )}

        {/* Botón rápido para registrar */}
        <Btn
          title="+ Registrar Peso Corporal"
          variant="primary"
          onPress={() => setModalVisible(true)}
        />
      </Card>

      {/* Gráfico de Evolución */}
      {chartData.length > 1 ? (
        <Card style={{ padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <T size={16} bold>Evolución de Peso</T>
              <T muted size={12}>Historial de pesajes recientes</T>
            </View>
            {selectedEntry && (
              <View style={s.chartHighlight}>
                <T size={13} bold style={{ color: C.primary, fontFamily: F.num }}>
                  {selectedEntry.kg.toFixed(1)} kg
                </T>
                <T muted size={10}>{selectedEntry.date.slice(5)}</T>
              </View>
            )}
          </View>

          {/* Gráfico de Barras Relativas */}
          <View style={s.chartContainer}>
            {chartData.map((d) => {
              const heightPct = Math.max(15, Math.min(100, ((d.kg - minVal) / range) * 100));
              const isSelected = selectedEntry?.id === d.id;

              return (
                <Pressable
                  key={d.id}
                  style={s.barCol}
                  onPress={() => {
                    vibrateImpact();
                    setSelectedEntry(d);
                  }}
                >
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.barFill,
                        { height: `${heightPct}%` },
                        isSelected && s.barFillActive,
                      ]}
                    />
                  </View>
                  <T size={10} muted style={[s.barDateLabel, isSelected && { color: C.primary, fontWeight: '700' }]}>
                    {d.date.slice(8)}/{d.date.slice(5, 7)}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* Historial de Pesajes */}
      <Card style={{ padding: 18, gap: 12 }}>
        <T size={16} bold>Historial de Registros</T>
        {history.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: 'center', gap: 6 }}>
            <Ionicons name="scale-outline" size={36} color={C.muted} />
            <T muted size={13} style={{ textAlign: 'center' }}>
              Aún no has registrado tu peso corporal.{'\n'}¡Empieza hoy para seguir tu progreso!
            </T>
          </View>
        ) : (
          history.map((item, index) => {
            const nextItem = history[index + 1];
            const change = nextItem ? Math.round((item.kg - nextItem.kg) * 10) / 10 : null;

            return (
              <View key={item.id} style={s.historyRow}>
                <View style={{ gap: 2 }}>
                  <T size={14} bold>{item.date}</T>
                  {change != null ? (
                    <T size={11} style={{ color: change <= 0 ? '#4ADE80' : '#FB923C' }}>
                      {change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1)} kg vs anterior
                    </T>
                  ) : (
                    <T muted size={11}>Primer registro</T>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <T size={17} bold style={{ fontFamily: F.num, color: C.text }}>
                    {item.kg.toFixed(1)} <T size={13} style={{ color: C.primary }}>kg</T>
                  </T>
                  <Pressable
                    hitSlop={10}
                    onPress={() => handleDelete(item.id, item.kg, item.date)}
                    style={s.trashBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color={C.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <AddWeightModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={reload}
      />
    </View>
  );
}

const s = StyleSheet.create({
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: R.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.border,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 12,
    height: '80%',
    backgroundColor: C.bg,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: 'rgba(198, 244, 50, 0.45)',
    borderRadius: 6,
  },
  barFillActive: {
    backgroundColor: C.primary,
  },
  barDateLabel: {
    marginTop: 6,
    fontSize: 9,
    fontFamily: F.num,
  },
  chartHighlight: {
    backgroundColor: C.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: C.border,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  trashBtn: {
    padding: 4,
  },
});
