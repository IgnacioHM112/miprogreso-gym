import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Btn, T } from '@/components/ui';
import { addBodyWeight, getLatestBodyWeight, ymd } from '@/db/repo';
import { vibrateSuccess } from '@/services/notifications';
import { C, F, R } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddWeightModal({ visible, onClose, onSaved }: Props) {
  const latest = getLatestBodyWeight();
  const initialWeight = latest?.kg ? String(latest.kg) : '75.0';

  const [weightStr, setWeightStr] = useState(initialWeight);
  const [dateStr, setDateStr] = useState(ymd(new Date()));

  React.useEffect(() => {
    if (visible) {
      const cur = getLatestBodyWeight();
      setWeightStr(cur?.kg ? String(cur.kg) : '75.0');
      setDateStr(ymd(new Date()));
    }
  }, [visible]);

  const numWeight = parseFloat(weightStr.replace(',', '.')) || 0;

  const adjustWeight = (delta: number) => {
    const cur = parseFloat(weightStr.replace(',', '.')) || 70;
    const next = Math.max(20, Math.min(300, Math.round((cur + delta) * 10) / 10));
    setWeightStr(next.toFixed(1));
  };

  const handleSave = () => {
    if (numWeight > 0) {
      addBodyWeight(numWeight, dateStr);
      vibrateSuccess();
      onSaved();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <T size={18} bold>Registrar Peso</T>
              <T muted size={13}>Seguimiento de tu evolución física</T>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={C.muted} />
            </Pressable>
          </View>

          {/* Display central de peso */}
          <View style={s.displayBox}>
            <View style={s.inputRow}>
              <TextInput
                style={s.weightInput}
                keyboardType="numeric"
                value={weightStr}
                onChangeText={setWeightStr}
                selectTextOnFocus
                maxLength={6}
              />
              <T size={24} bold style={{ color: C.primary, marginLeft: 6 }}>kg</T>
            </View>
            <T muted size={12} style={{ marginTop: 4 }}>
              Fecha: {dateStr === ymd(new Date()) ? `Hoy (${dateStr})` : dateStr}
            </T>
          </View>

          {/* Botones de ajuste rápido */}
          <View style={s.adjustRow}>
            <Pressable style={s.adjBtn} onPress={() => adjustWeight(-1)}>
              <T size={13} bold style={{ color: C.text }}>−1</T>
            </Pressable>
            <Pressable style={s.adjBtn} onPress={() => adjustWeight(-0.5)}>
              <T size={13} bold style={{ color: C.text }}>−0.5</T>
            </Pressable>
            <Pressable style={s.adjBtn} onPress={() => adjustWeight(-0.1)}>
              <T size={13} bold style={{ color: C.text }}>−0.1</T>
            </Pressable>
            <Pressable style={s.adjBtn} onPress={() => adjustWeight(+0.1)}>
              <T size={13} bold style={{ color: C.text }}>+0.1</T>
            </Pressable>
            <Pressable style={s.adjBtn} onPress={() => adjustWeight(+0.5)}>
              <T size={13} bold style={{ color: C.text }}>+0.5</T>
            </Pressable>
            <Pressable style={s.adjBtn} onPress={() => adjustWeight(+1)}>
              <T size={13} bold style={{ color: C.text }}>+1</T>
            </Pressable>
          </View>

          {/* Selector de fecha rápido */}
          <View style={s.dateRow}>
            <Pressable
              style={[s.dateChip, dateStr === ymd(new Date()) && s.dateChipActive]}
              onPress={() => setDateStr(ymd(new Date()))}
            >
              <T size={12} bold style={{ color: dateStr === ymd(new Date()) ? C.bg : C.muted }}>
                Hoy
              </T>
            </Pressable>
            <Pressable
              style={[
                s.dateChip,
                (() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  return dateStr === ymd(y) ? s.dateChipActive : null;
                })(),
              ]}
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setDateStr(ymd(y));
              }}
            >
              <T size={12} bold style={{ color: C.muted }}>
                Ayer
              </T>
            </Pressable>
          </View>

          {/* Botón Guardar */}
          <Btn
            title={`Guardar Peso (${numWeight.toFixed(1)} kg)`}
            variant="primary"
            onPress={handleSave}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayBox: {
    backgroundColor: C.bg,
    borderRadius: R.md,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  weightInput: {
    fontFamily: F.num,
    fontSize: 48,
    color: C.text,
    textAlign: 'center',
    minWidth: 140,
    fontWeight: '700',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  adjBtn: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: R.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
});
