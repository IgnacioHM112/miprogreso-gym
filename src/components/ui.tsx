import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewProps } from 'react-native';

import { C, F, R } from '@/theme';

export const Card = ({ style, ...p }: ViewProps) => <View style={[s.card, style]} {...p} />;

export const T = ({ style, muted, size = 15, bold, ...p }: React.ComponentProps<typeof Text> & { muted?: boolean; size?: number; bold?: boolean }) => (
  <Text style={[{ color: muted ? C.muted : C.text, fontSize: size, fontFamily: bold ? F.bold : F.regular }, style]} {...p} />
);

export const Btn = ({ title, onPress, variant = 'primary', small }: { title: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger'; small?: boolean }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      s.btn, small && { paddingVertical: 8, paddingHorizontal: 14 },
      variant === 'primary' && { backgroundColor: C.primary },
      variant === 'outline' && { borderWidth: 1, borderColor: C.border },
      variant === 'danger' && { borderWidth: 1, borderColor: C.danger },
      pressed && { opacity: 0.7 },
    ]}>
    <Text style={{ fontFamily: F.bold, fontSize: small ? 14 : 16, color: variant === 'primary' ? C.onPrimary : variant === 'danger' ? C.danger : C.text }}>{title}</Text>
  </Pressable>
);

export const Input = (p: TextInputProps) => <TextInput placeholderTextColor={C.muted} {...p} style={[s.input, p.style]} />;

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16 },
  btn: { borderRadius: R.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: C.cardAlt, color: C.text, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.regular, fontSize: 15 },
});
