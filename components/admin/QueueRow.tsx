import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getGameDisplay, normalizeOyunTuru } from '../../lib/gameDisplay';
import { getMaarif } from '../../constants/maarifMap';
import { esikDurumu } from '../../lib/admin/flags';
import { KuyrukKaydi, supheliMi } from '../../lib/admin/queueQuery';
import { C, F, codeColor } from './theme';

interface Props {
  kayit: KuyrukKaydi;
  secili: boolean;
  benimAdim: string;
  onPress: () => void;
}

function QueueRowBase({ kayit, secili, benimAdim, onPress }: Props) {
  const gd = getGameDisplay(kayit.oyun_turu);
  const maarif = getMaarif(normalizeOyunTuru(kayit.oyun_turu));
  const kod = maarif.cikti;
  const durum = esikDurumu(kayit.uzman_oylamalari, 3);
  const oySayisi = durum.tur === 'beklemede' ? durum.toplamOy : durum.tur === 'kilitli'
    ? Object.keys(kayit.uzman_oylamalari || {}).length : 3;
  const gunSayisi = Math.floor((Date.now() - new Date(kayit.created_at).getTime()) / 86400000);

  let durumMetni = 'Oy bekleniyor';
  if (durum.tur === 'kilitli') durumMetni = `${durum.revizeVeren} revize istedi`;
  else if (durum.tur === 'beklemede' && durum.toplamOy > 0) {
    durumMetni = benimAdim in (kayit.uzman_oylamalari || {}) ? 'Başkasını bekliyor' : (durum.toplamOy === 2 ? 'Senin oyun bekleniyor' : 'Oy bekleniyor');
  }

  return (
    <TouchableOpacity
      style={[st.row, secili && st.rowSecili]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={st.r1}>
        <Text style={st.gameName} numberOfLines={1}>{gd.emoji} {gd.name}</Text>
        {supheliMi(kayit) && <Text style={st.supheli}>⚠</Text>}
        <Text style={[st.code, { backgroundColor: codeColor(kod) + '26', color: codeColor(kod) }]}>{kod}</Text>
      </View>
      <Text style={st.r2} numberOfLines={1}>{kayit.ogrenci_adi} · {kayit.ogrenci_yasi} ay</Text>
      <View style={st.r3}>
        <View style={st.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[st.dot, i < oySayisi && st.dotFilled, durum.tur === 'kilitli' && i < oySayisi && st.dotRevize]} />
          ))}
        </View>
        <Text style={st.durumMetni} numberOfLines={1}>{durumMetni}</Text>
        {gunSayisi > 7 && <Text style={st.stale}>{gunSayisi}g</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(QueueRowBase);

const st = StyleSheet.create({
  row: { height: 84, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, borderLeftWidth: 3, borderLeftColor: 'transparent', justifyContent: 'center', gap: 4 },
  rowSecili: { backgroundColor: C.accentSoft, borderLeftColor: C.accent },
  r1: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  gameName: { flex: 1, fontSize: F.small + 1, fontWeight: '700', color: C.ink },
  code: { fontSize: F.meta - 0.5, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' },
  supheli: { fontSize: F.small - 1, color: C.danisma },
  r2: { fontSize: F.meta + 1, color: C.inkMid },
  r3: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotFilled: { backgroundColor: C.onay },
  dotRevize: { backgroundColor: C.revize },
  durumMetni: { flex: 1, fontSize: F.meta, color: C.inkLight },
  stale: { fontSize: F.meta - 1, fontWeight: '700', color: C.ret },
});
