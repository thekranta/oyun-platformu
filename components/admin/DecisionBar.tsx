import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { esikDurumu, normalizeVotes, OySonucu } from '../../lib/admin/flags';
import { KuyrukKaydi } from '../../lib/admin/queueQuery';
import { C, F, S } from './theme';

const HIZLI_GEREKCELER = ['Kazanım kodu yanlış', 'Veriyle çelişiyor', 'Veli dili fazla teknik', 'Dayanaksız iddia', 'Format bozuk'];

interface Props {
  kayit: KuyrukKaydi;
  benimAdim: string;
  isleniyor: boolean;
  onOy: (oy: OySonucu, gerekce?: string) => void;
  onItirazEt: () => void;
}

export default function DecisionBar({ kayit, benimAdim, isleniyor, onOy, onItirazEt }: Props) {
  const [revizeAcik, setRevizeAcik] = useState(false);
  const [gerekceMetni, setGerekceMetni] = useState('');
  const [onayTeyit, setOnayTeyit] = useState(false);
  const [itirazTeyit, setItirazTeyit] = useState(false);

  const votes = normalizeVotes(kayit.uzman_oylamalari);
  const durum = esikDurumu(kayit.uzman_oylamalari, 3);
  const benimOyum = votes[benimAdim];

  const gonderRevize = () => {
    if (gerekceMetni.trim().length < 10) return;
    onOy('revize', gerekceMetni.trim());
    setRevizeAcik(false);
    setGerekceMetni('');
  };

  if (kayit.onay_durumu === 'onaylandi') {
    return (
      <View style={st.wrap}>
        <View style={st.onaylandiRow}>
          <Text style={st.onaylandiText}>✅ Onaylandı · Veliye görünür</Text>
          <TouchableOpacity
            style={[st.itirazBtn, itirazTeyit && { backgroundColor: C.ret }]}
            onPress={() => {
              if (itirazTeyit) { onItirazEt(); setItirazTeyit(false); }
              else setItirazTeyit(true);
            }}
          >
            <Text style={[st.itirazBtnText, itirazTeyit && { color: '#fff' }]}>
              {itirazTeyit ? '⚠️ Emin misin? Rapor veliden kaybolur — tekrar bas' : 'İtiraz Et / Kilidi Aç'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={st.wrap}>
      <View style={st.main}>
        <View style={st.slots}>
          {Object.entries(votes).map(([ad, v]) => (
            <View key={ad} style={[st.slot, v.oy === 'onay' ? st.slotOnay : v.oy === 'revize' ? st.slotRevize : st.slotRet]}>
              <Text style={[st.slotName, { color: v.oy === 'onay' ? C.onay : v.oy === 'revize' ? C.revize : C.ret }]}>
                {v.oy === 'onay' ? '✓' : v.oy === 'revize' ? '✎' : '✕'} {ad}
              </Text>
            </View>
          ))}
          {Object.keys(votes).length < 3 && (
            <View style={[st.slot, st.slotBos]}>
              <Text style={st.slotBosText}>⬚ {Object.keys(votes).length < 3 && !benimOyum ? 'SEN' : '…'}</Text>
            </View>
          )}
        </View>

        <View style={st.mid}>
          {durum.tur === 'kilitli' ? (
            <>
              <Text style={st.lockMsg}>🔒 Kilitli: {durum.revizeVeren} revize istedi</Text>
              {durum.gerekce ? <Text style={st.quote} numberOfLines={1}>"{durum.gerekce}"</Text> : null}
            </>
          ) : durum.tur === 'beklemede' ? (
            <Text style={st.thresholdMsg}>
              {durum.toplamOy === 0
                ? 'Henüz oy yok. Sonuç için 3 uzmanın tamamı oy vermeli.'
                : `Onay için ${durum.kalan} oy daha bekleniyor.`}
            </Text>
          ) : (
            <Text style={st.thresholdMsg}>Oylar tamamlandı — sonuç hesaplanıyor…</Text>
          )}
        </View>

        <View style={st.actions}>
          <TouchableOpacity
            style={[st.dbtn, st.ghostRevize]}
            onPress={() => setRevizeAcik((v) => !v)}
            disabled={isleniyor}
          >
            <Text style={[st.dbtnText, { color: C.revize }]}>✎ Revize</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.dbtn, st.ghostRet]}
            onPress={() => onOy('reddet')}
            disabled={isleniyor}
          >
            <Text style={[st.dbtnText, { color: C.ret }]}>✕ Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.dbtn, st.solidOnay, onayTeyit && { backgroundColor: '#245A28' }]}
            onPress={() => {
              if (onayTeyit) { onOy('onay'); setOnayTeyit(false); }
              else setOnayTeyit(true);
            }}
            disabled={isleniyor}
          >
            {isleniyor ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={[st.dbtnText, { color: '#fff' }]}>
                {onayTeyit ? '⚠️ Emin misin? Tekrar bas' : (benimOyum?.oy === 'onay' ? '✓ Onayın kayıtlı' : '✅ Onayla')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {revizeAcik && (
        <View style={st.composer}>
          <View style={st.rchips}>
            {HIZLI_GEREKCELER.map((c) => (
              <TouchableOpacity key={c} style={st.rchip} onPress={() => setGerekceMetni((prev) => (prev ? prev + ' · ' + c : c))}>
                <Text style={st.rchipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={st.rareaRow}>
            <TextInput
              style={st.rarea}
              placeholder="Neden revize? (en az 10 karakter — gerekçe yeniden analize eklenir)"
              placeholderTextColor={C.inkLight}
              value={gerekceMetni}
              onChangeText={setGerekceMetni}
              multiline
            />
            <TouchableOpacity
              style={[st.rsend, gerekceMetni.trim().length < 10 && { opacity: 0.4 }]}
              onPress={gonderRevize}
              disabled={gerekceMetni.trim().length < 10 || isleniyor}
            >
              <Text style={st.rsendText}>Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexShrink: 0, backgroundColor: C.panel, borderTopWidth: 1, borderTopColor: C.line },
  main: { minHeight: 96, flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xl, gap: S.lg, paddingVertical: 10, flexWrap: 'wrap' },
  slots: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  slot: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, minWidth: 100 },
  slotOnay: { backgroundColor: C.onayBg },
  slotRevize: { backgroundColor: C.revizeBg },
  slotRet: { backgroundColor: C.retBg },
  slotBos: { backgroundColor: C.panelAlt, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed' },
  slotName: { fontSize: F.meta + 0.5, fontWeight: '700' },
  slotBosText: { fontSize: F.meta + 0.5, fontWeight: '700', color: C.inkLight },
  mid: { flex: 1, minWidth: 160 },
  lockMsg: { fontSize: F.small, fontWeight: '700', color: C.revize },
  quote: { fontSize: F.meta + 1, fontStyle: 'italic', color: C.inkMid, marginTop: 2 },
  thresholdMsg: { fontSize: F.small, color: C.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  dbtn: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: 'transparent' },
  dbtnText: { fontSize: F.small, fontWeight: '700' },
  ghostRevize: { backgroundColor: C.revizeBg },
  ghostRet: { backgroundColor: C.retBg },
  solidOnay: { backgroundColor: C.onay, marginLeft: 6 },
  onaylandiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.xl, paddingVertical: 16 },
  onaylandiText: { fontSize: F.small + 1, fontWeight: '700', color: C.onay },
  itirazBtn: { borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  itirazBtnText: { fontSize: F.meta + 1, fontWeight: '600', color: C.inkMid },
  composer: { borderTopWidth: 1, borderTopColor: C.line, padding: S.lg, gap: S.sm },
  rchips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rchip: { backgroundColor: C.revizeBg, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  rchipText: { fontSize: F.meta, fontWeight: '600', color: C.revize },
  rareaRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  rarea: { flex: 1, minHeight: 40, maxHeight: 70, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 8, fontSize: F.small, backgroundColor: C.panelAlt, color: C.ink },
  rsend: { backgroundColor: C.revize, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  rsendText: { fontSize: F.meta + 1, fontWeight: '700', color: '#fff' },
});
