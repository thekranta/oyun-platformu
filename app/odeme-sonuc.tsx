import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { emitPackageChanged } from '../lib/packageSync';
import {
    DESTEK_EPOSTA,
    bitisMetni,
    durumuBekle,
    isWebPaketId,
    sonucEkraniniSec,
    type DurumSonucu,
} from '../lib/webOdeme';

/**
 * Web ödeme sonucu: İyzico dönüşünden sonra sunucu bu sayfaya `?durum=basarili|basarisiz|beklemede&siparis=<id>` ile
 * yönlendirir. Adresteki "durum" yalnız bir ipucudur ve ekranı BELİRLEMEZ (adres elle değiştirilebilir): paket ve sonuç
 * her zaman sunucudan (/api/iyzico-durum) sorulur. YALNIZ WEB: mobilde içerik çizilmez, ana sayfaya dönülür.
 */
export default function OdemeSonuc() {
    // Kancalar OdemeSonucWeb içinde: native'de hiç çalışmaz, koşullu kanca olmaz.
    if (Platform.OS !== 'web') return <Redirect href="/" />;
    return <OdemeSonucWeb />;
}

function OdemeSonucWeb() {
    const { t, i18n } = useTranslation();
    const params = useLocalSearchParams<{ durum?: string; siparis?: string }>();
    const siparis = typeof params.siparis === 'string' && params.siparis ? params.siparis : null;

    const [sonuc, setSonuc] = useState<DurumSonucu | null>(null);
    const [zamanAsimi, setZamanAsimi] = useState(false);
    const [tur, setTur] = useState(0); // "Yeniden kontrol et" için sayaç

    useEffect(() => {
        if (!siparis) return;
        let iptal = false;
        setSonuc(null);
        setZamanAsimi(false);
        durumuBekle(siparis, {
            iptal: () => iptal,
            ara: (s) => { if (!iptal) setSonuc(s); },
        }).then((r) => {
            if (iptal) return;
            setSonuc(r.son);
            setZamanAsimi(r.zamanAsimi);
            if (r.son?.ok && r.son.durum === 'odendi') emitPackageChanged();
        });
        return () => { iptal = true; };
    }, [siparis, tur]);

    const ekran = siparis ? sonucEkraniniSec(sonuc, zamanAsimi) : 'siparisYok';
    const dil = i18n.language;
    const email = DESTEK_EPOSTA;

    const anaSayfa = () => router.replace('/');
    const girisYap = () => router.push('/veli-dashboard');

    let govde: React.ReactNode;
    if (ekran === 'yukleniyor') {
        govde = (
            <Kutu ikon={<ActivityIndicator size="large" color="#3F7D72" />} baslik={t('webOdeme.sonuc.yukleniyorBaslik')} metin={t('webOdeme.sonuc.yukleniyorMetin')} />
        );
    } else if (ekran === 'basarili') {
        const paket = sonuc?.ok && isWebPaketId(sonuc.paket) ? t(`webOdeme.paket.${sonuc.paket}`) : null;
        const tarih = sonuc?.ok ? bitisMetni(sonuc.bitis, dil) : null;
        govde = (
            <Kutu ikon={<Text style={styles.emoji}>🎉</Text>} baslik={t('webOdeme.sonuc.basariliBaslik')}>
                {paket && <Text style={styles.strong}>{t('webOdeme.sonuc.basariliPaket', { paket })}</Text>}
                {tarih && <Text style={styles.body}>{t('webOdeme.sonuc.basariliBitis', { tarih })}</Text>}
                <Text style={styles.body}>{t('webOdeme.sonuc.basariliNot')}</Text>
                <Dugme etiket={t('webOdeme.sonuc.cocukOdasi')} onPress={anaSayfa} />
            </Kutu>
        );
    } else if (ekran === 'basarisiz') {
        govde = (
            <Kutu ikon={<Text style={styles.emoji}>😕</Text>} baslik={t('webOdeme.sonuc.basarisizBaslik')} metin={t('webOdeme.sonuc.basarisizMetin', { email })}>
                <Dugme etiket={t('webOdeme.sonuc.tekrarDene')} onPress={() => router.replace('/odeme' as never)} />
            </Kutu>
        );
    } else if (ekran === 'atama') {
        govde = (
            <Kutu ikon={<Text style={styles.emoji}>✅</Text>} baslik={t('webOdeme.sonuc.atamaBaslik')} metin={t('webOdeme.sonuc.atamaMetin', { email })}>
                <Dugme etiket={t('webOdeme.sonuc.yenile')} onPress={() => setTur((n) => n + 1)} />
                <Dugme etiket={t('webOdeme.sonuc.cocukOdasi')} onPress={anaSayfa} ikincil />
            </Kutu>
        );
    } else if (ekran === 'bekliyor') {
        govde = (
            <Kutu ikon={<Text style={styles.emoji}>⏳</Text>} baslik={t('webOdeme.sonuc.bekliyorBaslik')} metin={t('webOdeme.sonuc.bekliyorMetin', { email })}>
                <Dugme etiket={t('webOdeme.sonuc.yenile')} onPress={() => setTur((n) => n + 1)} />
                <Dugme etiket={t('webOdeme.sonuc.cocukOdasi')} onPress={anaSayfa} ikincil />
            </Kutu>
        );
    } else if (ekran === 'giris') {
        govde = (
            <Kutu ikon={<Ionicons name="lock-closed" size={40} color="#A27D59" />} baslik={t('webOdeme.sonuc.girisBaslik')} metin={t('webOdeme.sonuc.girisMetin')}>
                <Dugme etiket={t('webOdeme.sonuc.girisDugme')} onPress={girisYap} />
            </Kutu>
        );
    } else if (ekran === 'hata') {
        govde = (
            <Kutu ikon={<Text style={styles.emoji}>📡</Text>} baslik={t('webOdeme.sonuc.hataBaslik')} metin={t('webOdeme.sonuc.hataMetin', { email })}>
                <Dugme etiket={t('webOdeme.sonuc.yenile')} onPress={() => setTur((n) => n + 1)} />
                <Dugme etiket={t('webOdeme.sonuc.cocukOdasi')} onPress={anaSayfa} ikincil />
            </Kutu>
        );
    } else {
        govde = (
            <Kutu ikon={<Text style={styles.emoji}>🔎</Text>} baslik={t('webOdeme.sonuc.siparisYokBaslik')} metin={t('webOdeme.sonuc.siparisYokMetin')}>
                <Dugme etiket={t('webOdeme.baslik')} onPress={() => router.replace('/odeme' as never)} />
            </Kutu>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={styles.content}>{govde}</ScrollView>
        </SafeAreaView>
    );
}

function Kutu({ ikon, baslik, metin, children }: { ikon: React.ReactNode; baslik: string; metin?: string; children?: React.ReactNode }) {
    return (
        <View style={styles.card} accessibilityLiveRegion="polite">
            <View style={styles.iconBox}>{ikon}</View>
            <Text style={styles.title} accessibilityRole="header">{baslik}</Text>
            {metin ? <Text style={styles.body}>{metin}</Text> : null}
            {children}
        </View>
    );
}

function Dugme({ etiket, onPress, ikincil }: { etiket: string; onPress: () => void; ikincil?: boolean }) {
    return (
        <Pressable onPress={onPress} accessibilityRole="button" style={[styles.btn, ikincil && styles.btnSecondary]}>
            <Text style={[styles.btnText, ikincil && styles.btnTextSecondary]}>{etiket}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAF2E4' },
    content: { flexGrow: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
    card: { width: '100%', maxWidth: 480, backgroundColor: '#FFFCF5', borderRadius: 26, padding: 26, alignItems: 'center' },
    iconBox: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 50 },
    title: { fontSize: 22, fontWeight: '800', color: '#584B40', marginTop: 10, textAlign: 'center' },
    strong: { fontSize: 17, fontWeight: '800', color: '#3F7D72', marginTop: 12, textAlign: 'center' },
    body: { fontSize: 15, color: '#756753', lineHeight: 22, marginTop: 10, textAlign: 'center' },
    btn: { alignSelf: 'stretch', backgroundColor: '#3F7D72', paddingVertical: 14, borderRadius: 16, marginTop: 20, alignItems: 'center' },
    btnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D7CBBA', marginTop: 10 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    btnTextSecondary: { color: '#584B40' },
});
