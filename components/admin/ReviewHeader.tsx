import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getGameDisplay, normalizeOyunTuru } from '../../lib/gameDisplay';
import { getMaarif } from '../../constants/maarifMap';
import { KuyrukKaydi } from '../../lib/admin/queueQuery';
import { C, F, R, S, codeColor } from './theme';

interface Props {
  kayit: KuyrukKaydi;
  navIndex: number;
  navTotal: number;
  onPrev: () => void;
  onNext: () => void;
  onGizle: () => void;
  onHesabiGizle: () => void;
  onIstatistik: () => void;
  onMail: () => void;
}

export default function ReviewHeader({ kayit, navIndex, navTotal, onPrev, onNext, onGizle, onHesabiGizle, onIstatistik, onMail }: Props) {
  const gd = getGameDisplay(kayit.oyun_turu);
  const maarif = getMaarif(normalizeOyunTuru(kayit.oyun_turu));
  const tarih = new Date(kayit.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const gunSayisi = Math.floor((Date.now() - new Date(kayit.created_at).getTime()) / 86400000);

  return (
    <View style={st.wrap}>
      <View style={st.idcol}>
        <View style={st.titleRow}>
          <Text style={st.gname}>{gd.emoji} {gd.name}</Text>
          <Text style={[st.badge, { backgroundColor: codeColor(maarif.cikti) }]}>{maarif.cikti}</Text>
          <Text style={st.alan}>{maarif.alan}</Text>
        </View>
        <View style={st.metaRow}>
          <Text style={st.meta} numberOfLines={1}>
            {kayit.ogrenci_adi} · {kayit.ogrenci_yasi} ay
            {kayit.email ? ` · ${kayit.email}` : ''}
            {kayit.zorluk_seviyesi ? ` · Zorluk ${kayit.zorluk_seviyesi}` : ''}
            {kayit.deneme_no ? ` · Deneme ${kayit.deneme_no}` : ''}
            {kayit.mevcut_tur && kayit.toplam_tur_sayisi ? ` · Tur ${kayit.mevcut_tur}/${kayit.toplam_tur_sayisi}` : ''}
            {` · ${tarih}`}
          </Text>
          <TouchableOpacity onPress={onIstatistik}>
            <Text style={st.link}>📊 İstatistikler</Text>
          </TouchableOpacity>
          {kayit.email && (
            <TouchableOpacity onPress={onMail}>
              <Text style={st.link}>📧 Mail</Text>
            </TouchableOpacity>
          )}
          {kayit.email && (
            <TouchableOpacity onPress={onHesabiGizle}>
              <Text style={st.link}>Bu hesabı gizle</Text>
            </TouchableOpacity>
          )}
          {gunSayisi > 7 && <Text style={st.stalePill}>{gunSayisi} gündür bekliyor</Text>}
        </View>
      </View>
      <View style={st.nav}>
        <TouchableOpacity style={st.nkey} onPress={onPrev}><Text style={st.nkeyText}>◀ K</Text></TouchableOpacity>
        <Text style={st.navcount}>{navIndex} / {navTotal}</Text>
        <TouchableOpacity style={st.nkey} onPress={onNext}><Text style={st.nkeyText}>J ▶</Text></TouchableOpacity>
        <TouchableOpacity style={st.trash} onPress={onGizle}>
          <Ionicons name="trash-outline" size={13} color={C.inkMid} />
          <Text style={st.trashText}>Deneme kaydı</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { height: 92, flexShrink: 0, backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xl, gap: S.lg },
  idcol: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' },
  gname: { fontSize: F.screen, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  badge: { fontSize: F.meta, fontWeight: '700', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  alan: { fontSize: F.meta + 1, color: C.inkMid, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: F.meta + 1, color: C.inkMid, flexShrink: 1 },
  link: { fontSize: F.meta + 1, color: C.accent, fontWeight: '600' },
  stalePill: { fontSize: F.meta, fontWeight: '700', color: C.ret, backgroundColor: C.retBg, paddingHorizontal: 7, borderRadius: 100, overflow: 'hidden' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  nkey: { backgroundColor: C.panelAlt, borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  nkeyText: { fontSize: F.meta, color: C.inkMid, fontWeight: '600' },
  navcount: { fontSize: F.small - 0.5, fontWeight: '700', color: C.ink },
  trash: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.line, borderRadius: R.btn - 7, paddingHorizontal: 10, paddingVertical: 6 },
  trashText: { fontSize: F.meta + 0.5, fontWeight: '600', color: C.inkMid },
});
