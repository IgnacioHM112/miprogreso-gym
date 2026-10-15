import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { useWorkoutStore } from '@/stores/workoutStore';
import { C, F, R } from '@/theme';

export function RestTimerBar() {
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const addRestSeconds = useWorkoutStore((s) => s.addRestSeconds);
  const notifyTimerFinished = useWorkoutStore((s) => s.notifyTimerFinished);

  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!restTimer.isActive || !restTimer.endsAt) {
      setRemaining(0);
      return;
    }

    const check = () => {
      const diff = Math.max(0, Math.ceil((restTimer.endsAt! - Date.now()) / 1000));
      setRemaining(diff);

      if (diff <= 0) {
        notifyTimerFinished();
      }
    };

    check();
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, [restTimer.isActive, restTimer.endsAt, notifyTimerFinished]);

  if (!restTimer.isActive || remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const progress = restTimer.totalSeconds > 0
    ? Math.min(1, Math.max(0, remaining / restTimer.totalSeconds))
    : 0;

  return (
    <View style={s.container}>
      {/* Barra de progreso superior */}
      <View style={s.progressBarBg}>
        <View style={[s.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      <View style={s.content}>
        <View style={s.left}>
          <View style={s.iconWrapper}>
            <Ionicons name="timer-outline" size={20} color={C.onPrimary} />
          </View>
          <View>
            <T size={12} muted style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Descanso {restTimer.exerciseName ? `· ${restTimer.exerciseName}` : ''}
            </T>
            <T size={26} style={{ fontFamily: F.num, color: C.primary, lineHeight: 30 }}>
              {timeFormatted}
            </T>
          </View>
        </View>

        <View style={s.actions}>
          <Pressable onPress={() => addRestSeconds(-15)} hitSlop={6} style={s.adjustBtn}>
            <T size={12} bold style={{ color: C.text }}>-15s</T>
          </Pressable>
          <Pressable onPress={() => addRestSeconds(15)} hitSlop={6} style={s.adjustBtn}>
            <T size={12} bold style={{ color: C.text }}>+15s</T>
          </Pressable>
          <Pressable onPress={stopRestTimer} hitSlop={8} style={s.skipBtn}>
            <Ionicons name="close" size={18} color={C.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: C.cardAlt,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.primary + '66',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: C.card,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: C.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustBtn: {
    backgroundColor: C.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  skipBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
});
