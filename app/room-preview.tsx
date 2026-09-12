import React, { useState } from 'react';
import { Redirect, Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import ToyRoom from '@/components/ToyRoom';
import { GAME_CATALOG } from '@/constants/gameCatalog';
import { GAME_CARD_META } from '@/lib/menuHelpers';

// Local design sandbox: does not authenticate, run games, or write scores.
export default function RoomPreview() {
  const [muted, setMuted] = useState(true);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  if (!__DEV__) return <Redirect href="/"/>;
  const game = GAME_CATALOG.find(g => g.routeKey === selected);
  if (selected) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF2E4', padding: 24 }}>
    <Text style={{ fontSize: 26, color: '#584B40', textAlign: 'center' }}>{game ? GAME_CARD_META[game.id]?.displayTitle || game.title : selected}</Text>
    <Text style={{ marginVertical: 20, textAlign: 'center' }}>Oyuncak bağlantısı çalışıyor. Bu tasarım önizlemesinde oyun açılmaz ve sonuç kaydedilmez.</Text>
    <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={{ padding: 20, borderRadius: 24, backgroundColor: '#6EABA0' }}><Text style={{ color: 'white', fontSize: 18 }}>Odaya dön</Text></Pressable>
  </View>;
  return <><Stack.Screen options={{ headerShown: false }}/><ToyRoom name="Deniz" round={round} onShuffle={() => setRound(r => r + 1)} muted={muted} onMute={() => setMuted(v => !v)} onGame={setSelected} onLogout={() => setSelected('Çıkış yap')}/></>;
}
