import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/MonthCalendar';
import { ProgressionChartModal } from '@/components/ProgressionChartModal';
import { SessionDetailModal } from '@/components/SessionDetailModal';
import { Card, Input, T } from '@/components/ui';
import { ExercisePR, getExercisePRs, listSessions, SessionListItem } from '@/db/repo';
import { vibrateImpact } from '@/services/notifications';
import { C, F, R } from '@/theme';

type TabView = 'calendar' | 'records';
const GROUPS = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Core'];

export default function Progreso() {
  const [currentTab, setCurrentTab] = useState<TabView>('calendar');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [prs, setPrs] = useState<ExercisePR[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedPR, setSelectedPR] = useState<ExercisePR | null>(null);

  // Filtros de récords
  const [searchPR, setSearchPR] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos');

  const loadData = useCallback(() => {
    setSessions(listSessions(40));
    setPrs(getExercisePRs());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredPRs = useMemo(() => {
    return prs.filter((p) => {
      const matchGroup = selectedGroup === 'Todos' || p.muscle_group === selectedGroup;
      const matchSearch = p.exercise_name.toLowerCase().includes(searchPR.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [prs, selectedGroup, searchPR]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
        {/* Cabecera */}
        <View>
          <T size={24} bold>Progreso & Historial</T>
          <T muted size={13}>Evolución de tus entrenamientos, marcas y récords personales.</T>
        </View>

        {/* Selector de pestañas */}
        <View style={s.tabSwitch}>
          <Pressable
            onPress={() => {
              vibrateImpact();
              setCurrentTab('calendar');
            }}
            style={[s.tabBtn, currentTab === 'calendar' && s.tabBtnActive]}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={currentTab === 'calendar' ? C.onPrimary : C.muted}
            />
            <T size={13} bold style={{ color: currentTab === 'calendar' ? C.onPrimary : C.muted }}>
              Calendario & Historial
            </T>
          </Pressable>

          <Pressable
            onPress={() => {
              vibrateImpact();
              setCurrentTab('records');
            }}
            style={[s.tabBtn, currentTab === 'records' && s.tabBtnActive]}
          >
            <Ionicons
              name="trophy-outline"
              size={16}
              color={currentTab === 'records' ? C.onPrimary : C.muted}
            />
            <T size={13} bold style={{ color: currentTab === 'records' ? C.onPrimary : C.muted }}>
              Récords & 1RM
            </T>
          </Pressable>
        </View>

        {/* VISTA 1: CALENDARIO E HISTORIAL */}
        {currentTab === 'calendar' && (
          <View style={{ gap: 16 }}>
            {/* Calendario mensual interactivo */}
            <MonthCalendar onSelectDateSession={(id) => setSelectedSessionId(id)} />

            {/* Listado de sesiones pasadas */}
            <View style={{ gap: 10 }}>
              <T size={16} bold>Entrenamientos recientes ({sessions.length})</T>

              {sessions.length === 0 ? (
                <Card style={{ padding: 20, alignItems: 'center' }}>
                  <T muted size={13}>Todavía no completaste ningún entrenamiento.</T>
                </Card>
              ) : (
                sessions.map((sess) => {
                  const durationMin = Math.max(1, Math.round(sess.duration_sec / 60));
                  const dateStr = sess.date.substring(0, 10);

                  return (
                    <Pressable
                      key={sess.id}
                      onPress={() => {
                        vibrateImpact();
                        setSelectedSessionId(sess.id);
                      }}
                    >
                      <Card style={s.sessionCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <T size={11} muted style={{ textTransform: 'uppercase' }}>
                              {dateStr} · {durationMin} min
                            </T>
                            <T size={16} bold style={{ marginTop: 2 }}>
                              {sess.routine_name}
                            </T>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={C.muted} />
                        </View>

                        <View style={s.sessionCardFooter}>
                          <View style={s.chipStat}>
                            <T size={12} style={{ fontFamily: F.num, color: C.primary }}>
                              {sess.total_sets} series
                            </T>
                          </View>
                          {sess.total_weight_kg > 0 && (
                            <View style={s.chipStat}>
                              <T size={12} style={{ fontFamily: F.num, color: C.text }}>
                                {sess.total_weight_kg.toLocaleString()} kg levantados
                              </T>
                            </View>
                          )}
                        </View>
                      </Card>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* VISTA 2: RÉCORDS PERSONALES Y 1RM ESTIMADO */}
        {currentTab === 'records' && (
          <View style={{ gap: 12 }}>
            <Input
              placeholder="Buscar ejercicio en tus récords..."
              value={searchPR}
              onChangeText={setSearchPR}
            />

            {/* Filtros por grupo muscular */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {GROUPS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => {
                    vibrateImpact();
                    setSelectedGroup(g);
                  }}
                  style={[s.filterChip, selectedGroup === g && s.filterChipActive]}
                >
                  <T size={12} bold style={{ color: selectedGroup === g ? C.onPrimary : C.text }}>
                    {g}
                  </T>
                </Pressable>
              ))}
            </ScrollView>

            {/* Lista de PRs */}
            {filteredPRs.length === 0 ? (
              <Card style={{ padding: 24, alignItems: 'center' }}>
                <T muted size={13} style={{ textAlign: 'center' }}>
                  {prs.length === 0
                    ? 'Tus récords personales (PR) y cálculos de 1RM aparecerán acá a medida que completes entrenamientos.'
                    : 'No hay ejercicios con récords para este filtro.'}
                </T>
              </Card>
            ) : (
              filteredPRs.map((pr) => {
                const isTime = pr.type === 'time';
                return (
                  <Pressable
                    key={pr.exercise_id}
                    onPress={() => {
                      vibrateImpact();
                      setSelectedPR(pr);
                    }}
                  >
                    <Card style={s.prCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <T size={16} bold>{pr.exercise_name}</T>
                          <T muted size={12}>{pr.muscle_group} · {pr.total_sets_ever} series en total</T>
                        </View>
                        <Ionicons name="stats-chart" size={18} color={C.primary} />
                      </View>

                      <View style={s.prMetricsRow}>
                        {isTime ? (
                          <View style={s.prBox}>
                            <T size={11} muted>RÉCORD DE TIEMPO</T>
                            <T size={20} style={{ fontFamily: F.num, color: C.primary }}>
                              {pr.max_seconds ?? 0}s
                            </T>
                          </View>
                        ) : (
                          <>
                            <View style={s.prBox}>
                              <T size={11} muted>MAYOR PESO</T>
                              <T size={20} style={{ fontFamily: F.num, color: C.primary }}>
                                {pr.max_weight ?? 0} kg
                              </T>
                              <T size={11} muted>{pr.max_weight_reps ?? 0} reps</T>
                            </View>

                            <View style={s.prBox}>
                              <T size={11} muted>1RM ESTIMADO</T>
                              <T size={20} style={{ fontFamily: F.num, color: C.primary }}>
                                {pr.estimated_1rm ?? 0} kg
                              </T>
                              <T size={11} muted>Fórmula Epley</T>
                            </View>
                          </>
                        )}
                      </View>
                    </Card>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de Detalle de Sesión */}
      <SessionDetailModal
        sessionId={selectedSessionId}
        visible={!!selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
        onDeleted={loadData}
      />

      {/* Modal de Gráfico de Progresión */}
      <ProgressionChartModal
        pr={selectedPR}
        visible={!!selectedPR}
        onClose={() => setSelectedPR(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: C.cardAlt,
    borderRadius: R.md,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: R.sm,
  },
  tabBtnActive: {
    backgroundColor: C.primary,
  },
  sessionCard: {
    gap: 10,
  },
  sessionCardFooter: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.border + '55',
    paddingTop: 8,
  },
  chipStat: {
    backgroundColor: C.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  prCard: {
    gap: 12,
  },
  prMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  prBox: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    padding: 10,
    alignItems: 'center',
  },
});
