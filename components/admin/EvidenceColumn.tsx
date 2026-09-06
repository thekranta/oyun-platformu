import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { getMaarif } from '../../constants/maarifMap';
import { normalizeOyunTuru } from '../../lib/gameDisplay';
import { AyrisikAnaliz } from '../../lib/admin/parseAnalysis';
import { KuyrukKaydi } from '../../lib/admin/queueQuery';
import { C, F, S, R } from './theme';

type DrawingPoint = { x: number; y: number };
type DrawingStroke = { color: string; size: number; points: DrawingPoint[] };
type DrawingPayload = {
  strokes?: DrawingStroke[]; size?: { width: number; height: number };
  imageUrl?: string; imagePath?: string; imageFormat?: string;
  cizimResimBase64?: string; cizimResimFormat?: string;
};

/** Depo yolundan (veya eski public URL'den ayıklanan yoldan) imzalı URL üretip çizimi gösterir. */
function DrawingPreview({ data }: { data: string | null | undefined }) {
  const parsed = useMemo<DrawingPayload | null>(() => {
    try {
      if (!data) return null;
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      if (obj?.strokes || obj?.imageUrl || obj?.imagePath || obj?.cizimResimBase64) return obj as DrawingPayload;
      return null;
    } catch { return null; }
  }, [data]);

  const storagePath = useMemo(() => {
    if (!parsed) return null;
    if (parsed.imagePath) return parsed.imagePath;
    const m = parsed.imageUrl?.match(/\/object\/(?:public\/)?cizimler\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [parsed]);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!storagePath) { setSignedUrl(null); return; }
    supabase.storage.from('cizimler').createSignedUrl(storagePath, 3600)
      .then(({ data: signed }) => { if (!cancelled && signed?.signedUrl) setSignedUrl(signed.signedUrl); })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [storagePath]);

  if (!parsed) return <Text style={st.muted}>Çizim verisi yok</Text>;
  const uri = signedUrl || parsed.imageUrl || (parsed.cizimResimBase64 ? `data:image/${parsed.cizimResimFormat || 'png'};base64,${parsed.cizimResimBase64}` : null);
  if (!uri) return <Text style={st.muted}>Çizim yükleniyor…</Text>;
  return <Image source={{ uri }} style={{ width: '100%', height: 160, borderRadius: 8, backgroundColor: C.panelAlt }} resizeMode="contain" />;
}

function TelaffuzTablosu({ raw }: { raw: string }) {
  const data = useMemo(() => { try { return JSON.parse(raw); } catch { return null; } }, [raw]);
  if (!data?.results || !Array.isArray(data.results)) return null;
  return (
    <View>
      <View style={st.telRow}>
        <Text style={[st.telHead, { flex: 1 }]}>Beklenen</Text>
        <Text style={[st.telHead, { flex: 1 }]}>Algılanan</Text>
        <Text style={[st.telHead, { width: 24 }]}></Text>
      </View>
      {data.results.map((r: any, i: number) => (
        <View key={i} style={[st.telRow, st.telRowLine]}>
          <Text style={{ flex: 1, fontSize: F.small - 1 }}>{r.expected}</Text>
          <Text style={{ flex: 1, fontSize: F.small - 1, color: r.isCorrect ? C.ink : C.ret, fontStyle: 'italic' }}>{r.transcribed || '(Sessiz)'}</Text>
          <Text style={{ width: 24, textAlign: 'center', color: r.isCorrect ? C.onay : C.ret, fontWeight: '700' }}>{r.isCorrect ? '✓' : '✕'}</Text>
        </View>
      ))}
      <Text style={st.trend}>Doğruluk: %{data.accuracy} ({data.totalCorrect}/{data.totalStages})</Text>
    </View>
  );
}

interface Props {
  kayit: KuyrukKaydi;
  analiz: AyrisikAnaliz | null;
  sonUcKiyas: { created_at: string; sure?: number; hata_sayisi?: number }[];
  ayniHesap: { id: number; oyun_turu: string; created_at: string }[];
  agirAlanlar: { cizim_verisi?: string; algilanan_kelime?: string } | null;
  onAyniCocukMu: () => void;
}

export default function EvidenceColumn({ kayit, analiz, sonUcKiyas, ayniHesap, agirAlanlar, onAyniCocukMu }: Props) {
  const maarif = getMaarif(normalizeOyunTuru(kayit.oyun_turu));
  const beklenenKod = maarif.cikti;
  const yazilanKod = analiz?.metindekiKodlar[0];
  const kodEslesiyor = !yazilanKod || yazilanKod === beklenenKod;

  const trend = useMemo(() => {
    if (sonUcKiyas.length === 0) return null;
    const sonSure = sonUcKiyas[0]?.sure ?? 0;
    const sonHata = sonUcKiyas[0]?.hata_sayisi ?? 0;
    const dSure = sonSure - (kayit.sure || 0);
    const dHata = sonHata - (kayit.hata_sayisi || 0);
    return { dSure, dHata };
  }, [sonUcKiyas, kayit]);

  return (
    <ScrollView style={st.col} contentContainerStyle={{ paddingBottom: S.xl }}>
      <Text style={st.colHead}>KANIT</Text>

      <View style={st.block}>
        <Text style={st.bh}>① BU DENEME</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Text style={st.big}><Text style={st.bigLabel}>süre </Text>{kayit.sure ?? '—'} sn</Text>
          <Text style={st.big}><Text style={st.bigLabel}>hamle </Text>{kayit.hamle_sayisi}</Text>
          <Text style={st.big}><Text style={st.bigLabel}>hata </Text>{kayit.hata_sayisi}</Text>
        </View>
      </View>

      {sonUcKiyas.length > 0 && (
        <View style={st.block}>
          <Text style={st.bh}>② SON {sonUcKiyas.length} KIYAS</Text>
          {sonUcKiyas.map((s, i) => {
            const gun = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
            return (
              <View key={i} style={st.cmprow}>
                <Text style={st.cmpLabel}>{gun === 0 ? 'bugün' : `${gun}g önce`}</Text>
                <Text style={st.cmpVal}>{s.sure ?? '?'} sn · {s.hata_sayisi ?? 0} hata</Text>
              </View>
            );
          })}
          {trend && (
            <Text style={[st.trend, { color: trend.dSure <= 0 && trend.dHata <= 0 ? C.onay : C.inkMid }]}>
              {trend.dSure <= 0 ? '▼' : '▲'} {Math.abs(trend.dSure)} sn · {trend.dHata <= 0 ? '▼' : '▲'} {Math.abs(trend.dHata)} hata
            </Text>
          )}
        </View>
      )}

      <View style={[st.block, { borderLeftWidth: 3, borderLeftColor: C.mab }]}>
        <Text style={st.bh}>③ BEKLENEN KAZANIM</Text>
        <Text style={st.kodText}>{beklenenKod}</Text>
        <Text style={st.p}>{maarif.ciktiAciklama}</Text>
      </View>

      {yazilanKod && (
        <View style={st.block}>
          <Text style={st.bh}>④ AI'IN YAZDIĞI KOD</Text>
          <Text style={[st.p, { color: kodEslesiyor ? C.onay : C.danisma, fontWeight: '600' }]}>
            {kodEslesiyor ? `✓ ${yazilanKod} — eşleşiyor` : `⚠ AI "${yazilanKod}" yazmış — beklenen ${beklenenKod}`}
          </Text>
        </View>
      )}

      {(kayit.oyun_turu === 'yaratici-cizim' || agirAlanlar?.cizim_verisi) && (
        <View style={st.block}>
          <Text style={st.bh}>⑤ HAM KANIT · ÇİZİM</Text>
          <DrawingPreview data={agirAlanlar?.cizim_verisi} />
        </View>
      )}
      {kayit.oyun_turu === 'bunu-soyle' && agirAlanlar?.algilanan_kelime && (
        <View style={st.block}>
          <Text style={st.bh}>⑤ HAM KANIT · TELAFFUZ ANALİZİ</Text>
          <TelaffuzTablosu raw={agirAlanlar.algilanan_kelime} />
        </View>
      )}

      {ayniHesap.length > 0 && (
        <View style={st.block}>
          <Text style={st.bh}>⑥ AYNI HESABIN KAYITLARI</Text>
          {ayniHesap.slice(0, 4).map((s) => (
            <View key={s.id} style={st.siblingRow}>
              <Text style={st.cmpLabel}>{s.oyun_turu.replace(/-/g, ' ')}</Text>
              <Text style={st.cmpLabel}>{new Date(s.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={onAyniCocukMu}><Text style={st.link}>⧉ Aynı çocuk mu?</Text></TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  col: { width: 300, flexShrink: 0, borderRightWidth: 1, borderRightColor: C.line },
  colHead: { fontSize: F.meta, fontWeight: '700', letterSpacing: 0.6, color: C.inkLight, paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.sm },
  block: { marginHorizontal: S.lg, marginBottom: S.md, padding: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: R.card },
  bh: { fontSize: F.meta - 0.5, fontWeight: '700', color: C.inkLight, marginBottom: 6, letterSpacing: 0.3 },
  big: { fontSize: F.head, fontWeight: '600', color: C.ink },
  bigLabel: { fontSize: F.meta, fontWeight: '500', color: C.inkMid },
  cmprow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  cmpLabel: { fontSize: F.small - 0.5, color: C.inkMid },
  cmpVal: { fontSize: F.small - 0.5, color: C.ink, fontWeight: '600' },
  trend: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed', fontSize: F.small - 1, fontWeight: '600', color: C.onay },
  kodText: { fontFamily: undefined, fontSize: F.small - 0.5, fontWeight: '700', color: C.mab },
  p: { fontSize: F.small, lineHeight: 20, color: C.ink, marginTop: 6 },
  siblingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.line },
  link: { fontSize: F.meta, color: C.accent, fontWeight: '600', marginTop: 6 },
  muted: { fontSize: F.small - 1, color: C.inkLight, fontStyle: 'italic' },
  telRow: { flexDirection: 'row', paddingVertical: 3 },
  telHead: { fontSize: F.meta - 1, fontWeight: '600', color: C.inkLight },
  telRowLine: { borderTopWidth: 1, borderTopColor: C.line },
});
