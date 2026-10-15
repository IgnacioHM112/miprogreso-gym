import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Btn, T } from '@/components/ui';
import { vibrateImpact, vibrateSuccess } from '@/services/notifications';
import { C, F, R } from '@/theme';

export type PickerType = 'weight' | 'reps' | 'time';

export type ValuePickerConfig = {
  visible: boolean;
  type: PickerType;
  title: string;
  subtitle?: string;
  currentValue: string;
  previousValue?: string;
  onConfirm: (val: string) => void;
  onClose: () => void;
};

const WEIGHT_PLATES = [1.25, 2.5, 5, 10, 20];
const COMMON_REPS = [5, 6, 8, 10, 12, 15, 20];
const TIME_PRESETS = [15, 30, 45, 60, 90, 120];

export function ValuePickerSheet({
  visible,
  type,
  title,
  subtitle,
  currentValue,
  previousValue,
  onConfirm,
  onClose,
}: ValuePickerConfig) {
  const [val, setVal] = useState<number>(0);
  const [manualInput, setManualInput] = useState(false);
  const [textVal, setTextVal] = useState('');

  useEffect(() => {
    if (visible) {
      setManualInput(false);
      const parsed = parseFloat((currentValue || '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        setVal(parsed);
        setTextVal(String(parsed));
      } else if (previousValue) {
        const prev = parseFloat(previousValue.replace(',', '.'));
        const init = !isNaN(prev) && prev > 0 ? prev : type === 'weight' ? 20 : type === 'reps' ? 10 : 60;
        setVal(init);
        setTextVal(String(init));
      } else {
        const def = type === 'weight' ? 20 : type === 'reps' ? 10 : 60;
        setVal(def);
        setTextVal(String(def));
      }
    }
  }, [visible, currentValue, previousValue, type]);

  const adjustValue = (delta: number) => {
    vibrateImpact();
    setVal((prev) => {
      const next = Math.max(0, parseFloat((prev + delta).toFixed(2)));
      setTextVal(String(next));
      return next;
    });
  };

  const setValueDirectly = (newVal: number) => {
    vibrateImpact();
    setVal(newVal);
    setTextVal(String(newVal));
  };

  const handleConfirm = () => {
    vibrateSuccess();
    if (manualInput) {
      const parsed = parseFloat(textVal.replace(',', '.')) || 0;
      onConfirm(parsed > 0 ? String(parsed) : '');
    } else {
      onConfirm(val > 0 ? String(val) : '');
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        {/* Encabezado */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <T size={17} bold>{title}</T>
            {subtitle && <T muted size={12}>{subtitle}</T>}
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => setManualInput(!manualInput)}
            style={[s.modeToggle, manualInput && { backgroundColor: C.primary }]}
          >
            <Ionicons
              name={manualInput ? 'options' : 'keypad-outline'}
              size={18}
              color={manualInput ? C.onPrimary : C.text}
            />
          </Pressable>
        </View>

        {/* Display del valor principal */}
        <View style={s.displayBox}>
          {manualInput ? (
            <TextInput
              style={s.manualTextInput}
              keyboardType="decimal-pad"
              autoFocus
              value={textVal}
              onChangeText={(txt) => {
                setTextVal(txt);
                const p = parseFloat(txt.replace(',', '.'));
                if (!isNaN(p)) setVal(p);
              }}
            />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T size={48} style={{ fontFamily: F.num, color: C.primary }}>
                {type === 'weight' ? (val % 1 === 0 ? val : val.toFixed(2)) : Math.round(val)}
              </T>
              <T size={18} bold style={{ color: C.muted }}>
                {type === 'weight' ? 'kg' : type === 'reps' ? 'reps' : 'segs'}
              </T>
            </View>
          )}

          {previousValue && (
            <Pressable
              onPress={() => {
                const prev = parseFloat(previousValue.replace(',', '.'));
                if (!isNaN(prev)) setValueDirectly(prev);
              }}
              style={s.previousPill}
            >
              <Ionicons name="refresh-outline" size={13} color={C.primary} />
              <T size={11} style={{ color: C.primary, fontFamily: F.num }}>
                Última vez: {previousValue} {type === 'weight' ? 'kg' : type === 'reps' ? 'reps' : 's'}
              </T>
            </Pressable>
          )}
        </View>

        {/* Controles táctiles sin escribir */}
        {!manualInput && (
          <View style={{ gap: 14 }}>
            {/* Si es PESO: Botones de Discos de Gimnasio */}
            {type === 'weight' && (
              <>
                <View>
                  <T muted size={11} style={s.sectionLabel}>SUMAR DISCOS (+KG)</T>
                  <View style={s.platesRow}>
                    {WEIGHT_PLATES.map((p) => (
                      <Pressable
                        key={`plus_${p}`}
                        onPress={() => adjustValue(p)}
                        style={({ pressed }) => [s.plateBtn, pressed && { opacity: 0.6 }]}
                      >
                        <T size={14} bold style={{ color: C.primary, fontFamily: F.num }}>
                          +{p}
                        </T>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View>
                  <T muted size={11} style={s.sectionLabel}>RESTAR DISCOS (-KG)</T>
                  <View style={s.platesRow}>
                    {WEIGHT_PLATES.slice(0, 4).map((p) => (
                      <Pressable
                        key={`minus_${p}`}
                        onPress={() => adjustValue(-p)}
                        style={({ pressed }) => [s.plateBtn, s.plateBtnMinus, pressed && { opacity: 0.6 }]}
                      >
                        <T size={13} bold style={{ color: C.muted, fontFamily: F.num }}>
                          -{p}
                        </T>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setValueDirectly(0)}
                      style={[s.plateBtn, s.plateBtnMinus]}
                    >
                      <T size={12} bold style={{ color: C.danger }}>Reset</T>
                    </Pressable>
                  </View>
                </View>

                {/* Accesos rápidos de peso común */}
                <View>
                  <T muted size={11} style={s.sectionLabel}>PESOS RÁPIDOS</T>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {[20, 30, 40, 50, 60, 70, 80, 90, 100, 120].map((kg) => (
                      <Pressable
                        key={`preset_${kg}`}
                        onPress={() => setValueDirectly(kg)}
                        style={[s.chipPreset, val === kg && { backgroundColor: C.primary + '33', borderColor: C.primary }]}
                      >
                        <T size={13} style={{ fontFamily: F.num, color: val === kg ? C.primary : C.text }}>
                          {kg}k
                        </T>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}

            {/* Si es REPS: Botones clásicos y presets */}
            {type === 'reps' && (
              <>
                <View style={s.stepperRow}>
                  <Pressable onPress={() => adjustValue(-5)} style={s.stepLarge}>
                    <T size={16} bold style={{ color: C.text }}>-5</T>
                  </Pressable>
                  <Pressable onPress={() => adjustValue(-1)} style={s.stepLarge}>
                    <T size={20} bold style={{ color: C.text }}>-1</T>
                  </Pressable>
                  <Pressable onPress={() => adjustValue(1)} style={[s.stepLarge, { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
                    <T size={20} bold style={{ color: C.primary }}>+1</T>
                  </Pressable>
                  <Pressable onPress={() => adjustValue(5)} style={[s.stepLarge, { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
                    <T size={16} bold style={{ color: C.primary }}>+5</T>
                  </Pressable>
                </View>

                <View>
                  <T muted size={11} style={s.sectionLabel}>RANGO COMÚN</T>
                  <View style={s.platesRow}>
                    {COMMON_REPS.map((r) => (
                      <Pressable
                        key={`rep_${r}`}
                        onPress={() => setValueDirectly(r)}
                        style={[s.chipPreset, { flex: 1, alignItems: 'center' }, val === r && { backgroundColor: C.primary, borderColor: C.primary }]}
                      >
                        <T size={15} bold style={{ color: val === r ? C.onPrimary : C.text, fontFamily: F.num }}>
                          {r}
                        </T>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Si es TIEMPO: Botones de segundos */}
            {type === 'time' && (
              <>
                <View style={s.stepperRow}>
                  <Pressable onPress={() => adjustValue(-15)} style={s.stepLarge}>
                    <T size={14} bold style={{ color: C.text }}>-15s</T>
                  </Pressable>
                  <Pressable onPress={() => adjustValue(-5)} style={s.stepLarge}>
                    <T size={14} bold style={{ color: C.text }}>-5s</T>
                  </Pressable>
                  <Pressable onPress={() => adjustValue(5)} style={[s.stepLarge, { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
                    <T size={14} bold style={{ color: C.primary }}>+5s</T>
                  </Pressable>
                  <Pressable onPress={() => adjustValue(15)} style={[s.stepLarge, { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
                    <T size={14} bold style={{ color: C.primary }}>+15s</T>
                  </Pressable>
                </View>

                <View>
                  <T muted size={11} style={s.sectionLabel}>DURACIÓN RÁPIDA</T>
                  <View style={s.platesRow}>
                    {TIME_PRESETS.map((sec) => (
                      <Pressable
                        key={`sec_${sec}`}
                        onPress={() => setValueDirectly(sec)}
                        style={[s.chipPreset, { flex: 1, alignItems: 'center' }, val === sec && { backgroundColor: C.primary, borderColor: C.primary }]}
                      >
                        <T size={13} bold style={{ color: val === sec ? C.onPrimary : C.text, fontFamily: F.num }}>
                          {sec}s
                        </T>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Botón de Confirmación */}
        <View style={{ marginTop: 18 }}>
          <Btn title="✓ Listo" onPress={handleConfirm} />
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
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.muted + '66',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayBox: {
    backgroundColor: C.cardAlt,
    borderRadius: R.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  manualTextInput: {
    fontFamily: F.num,
    fontSize: 44,
    color: C.primary,
    textAlign: 'center',
    minWidth: 140,
  },
  previousPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  platesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  plateBtn: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.primary + '55',
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateBtnMinus: {
    borderColor: C.border,
  },
  chipPreset: {
    backgroundColor: C.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepLarge: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
