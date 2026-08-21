import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { C, F, R } from './theme';

interface Props {
  mesaj: string | null;
  onGeriAl: () => void;
  onKapan: () => void;
  sureMs?: number;
}

export default function UndoStrip({ mesaj, onGeriAl, onKapan, sureMs = 6000 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mesaj) {
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timerRef.current = setTimeout(onKapan, sureMs);
    } else {
      Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaj]);

  if (!mesaj) return null;
  return (
    <Animated.View style={[st.wrap, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <Text style={st.text} numberOfLines={1}>{mesaj}</Text>
      <TouchableOpacity onPress={onGeriAl}><Text style={st.link}>Geri Al</Text></TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', right: 20, bottom: 112, backgroundColor: C.ink, borderRadius: R.card, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 380, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 50 },
  text: { color: '#fff', fontSize: F.meta + 1, flexShrink: 1 },
  link: { color: '#fff', fontWeight: '700', fontSize: F.meta + 1, textDecorationLine: 'underline' },
});
