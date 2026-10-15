import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Btn, Card, T } from '@/components/ui';
import { deleteSession, getSessionDetail, SessionDetail } from '@/db/repo';
import { vibrateImpact, vibrateSuccess } from '@/services/notifications';
import { C, F, R } from '@/theme';

export function SessionDetailModal({
  sessionId,
  visible,
  onClose,
  onDeleted,
}: {
  sessionId: number | null;
  visible: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    if (visible && sessionId) {
      setDetail(getSessionDetail(sessionId));
    } else {
      setDetail(null);
    }
  }, [visible, sessionId]);

  if (!visible || !detail) return null;

  const durationMin = Math.max(1, Math.round(detail.session.duration_sec / 60));
  const dateStr = detail.session.date.substring(0, 10);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar entrenamiento',
      '¿Deseás borrar este registro permanentemente del historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            vibrateImpact();
            if (sessionId) deleteSession(sessionId);
            vibrateSuccess();
            onDeleted?.();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.modalCard}>
        <View style={s.handle} />

        {/* Cabecera */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <T size={12} muted style={{ textTransform: 'uppercase' }}>
              {dateStr} · {durationMin} MINUTOS
            </T>
            <T size={20} bold>{detail.session.routine_name}</T>
          </View>
          <Pressable onPress={handleDelete} hitSlop={8} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={C.danger} />
          </Pressable>
        </View>

        {/* Métricas destacadas */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <T size={20} style={{ fontFamily: F.num, color: C.primary }}>
              {detail.session.total_sets}
            </T>
            <T muted size={11}>Series hechas</T>
          </View>
          <View style={s.statBox}>
            <T size={20} style={{ fontFamily: F.num, color: C.primary }}>
              {detail.session.total_weight_kg.toLocaleString()} kg
            </T>
            <T muted size={11}>Volumen total</T>
          </View>
        </View>

        {/* Desglose de ejercicios y series */}
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
          {detail.exercises.map((ex) => (
            <Card key={ex.exercise_id} style={{ gap: 8, padding: 12 }}>
              <T size={15} bold>{ex.exercise_name}</T>
              <View style={s.tableHeader}>
                <T muted size={11} style={{ width: 44 }}>SERIE</T>
                <T muted size={11} style={{ flex: 1 }}>{ex.type === 'time' ? 'DURACIÓN' : 'CARGA / PESO'}</T>
                <T muted size={11} style={{ width: 60, textAlign: 'right' }}>{ex.type === 'time' ? '' : 'REPS'}</T>
              </View>
              {ex.sets.map((set) => (
                <View key={set.set_number} style={s.tableRow}>
                  <View style={[s.badge, set.is_warmup ? s.badgeWarmup : undefined]}>
                    <T size={11} bold style={{ color: set.is_warmup ? '#121417' : C.muted, fontFamily: F.num }}>
                      {set.is_warmup ? 'C' : set.set_number}
                    </T>
                  </View>
                  <T size={14} style={{ flex: 1, fontFamily: F.num }}>
                    {ex.type === 'time' ? `${set.seconds ?? 0} segs` : `${set.weight ?? 0} kg`}
                  </T>
                  <T size={14} bold style={{ width: 60, textAlign: 'right', fontFamily: F.num, color: C.primary }}>
                    {ex.type === 'time' ? '' : `${set.reps ?? 0} reps`}
                  </T>
                </View>
              ))}
            </Card>
          ))}

          {/* Notas de la sesión */}
          {detail.session.notes && (
            <Card style={{ gap: 6, padding: 12 }}>
              <T size={12} muted bold>NOTAS DE LA SESIÓN</T>
              <T size={13}>{detail.session.notes}</T>
            </Card>
          )}
        </ScrollView>

        <View style={{ marginTop: 14 }}>
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
  deleteBtn: {
    padding: 8,
    borderRadius: R.sm,
    backgroundColor: C.cardAlt,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    padding: 10,
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border + '55',
    paddingBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeWarmup: {
    backgroundColor: '#FFAA00',
  },
});
