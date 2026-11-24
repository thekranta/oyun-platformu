import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { legalUrl, openExternalLink } from '../lib/externalLink';
import { supabase } from '../lib/supabase';
import {
    BOS_ALICI,
    MESAFELI_SATIS_URL,
    WEB_PAKET_LISTESI,
    aliciyiDogrula,
    fiyatMetni,
    isWebPaketId,
    odemeBaslat,
    odemeHataAnahtari,
    sozlesmeHazirMi,
    type AliciAlani,
    type AliciFormu,
    type WebPaketId,
} from '../lib/webOdeme';

/**
 * Web ödeme sayfası (İyzico, tek seferlik): paket seç → alıcı bilgileri → sözleşme onayı → İyzico'nun ödeme sayfasına git.
 * YALNIZ WEB: mobilde (iOS/Android) içerik çizilmez ve ana sayfaya dönülür; uygulamada bu sayfaya bağlantı YOKTUR
 * (Apple 3.1.1: uygulama içinde web fiyatı / web satın alma yönlendirmesi olmaz). Mantık: lib/webOdeme.ts.
 */
export default function Odeme() {
    // Kancalar OdemeWeb içinde: native'de hiç çalışmaz, koşullu kanca olmaz.
    if (Platform.OS !== 'web') return <Redirect href="/" />;
    return <OdemeWeb />;
}

const ALAN_SIRASI: AliciAlani[] = ['ad', 'soyad', 'telefon', 'tckn', 'adres', 'sehir'];

function OdemeWeb() {
    const { t, i18n } = useTranslation();
    const params = useLocalSearchParams<{ paket?: string }>();
    const [paket, setPaket] = useState<WebPaketId | null>(isWebPaketId(params.paket) ? params.paket : null);
    const [form, setForm] = useState<AliciFormu>(BOS_ALICI);
    const [onay, setOnay] = useState(false);
    const [oturum, setOturum] = useState<'bakiliyor' | 'var' | 'yok'>('bakiliyor');
    const [hata, setHata] = useState<string | null>(null);
    const [hataliAlan, setHataliAlan] = useState<AliciAlani | null>(null);
    const [onayHatali, setOnayHatali] = useState(false);
    const [busy, setBusy] = useState(false);
    // Çift gönderim kilidi: state asenkron güncellenir, hızlı çift tıklamada ikinci istek geçmesin diye ref de tutulur.
    const kilit = useRef(false);
    // Sözleşme adresi yazılmadan ödeme kapalı: veli okuyamadığı sözleşmeyi onaylamasın (lib/webOdeme.ts MESAFELI_SATIS_URL).
    const odemeAcik = sozlesmeHazirMi();

    // Giriş ekranından geri dönülünce oturum yeniden okunur.
    useFocusEffect(
        useCallback(() => {
            let canli = true;
            supabase.auth.getSession()
                .then(({ data }) => { if (canli) setOturum(data.session ? 'var' : 'yok'); })
                .catch(() => { if (canli) setOturum('yok'); });
            return () => { canli = false; };
        }, []),
    );

    // İyzico sayfasından tarayıcının geri düğmesiyle dönülürse sayfa önbellekten gelir ve "yönlendiriliyor" kilidi açık kalırdı.
    useEffect(() => {
        const ac = (e: PageTransitionEvent) => {
            if (e.persisted) { kilit.current = false; setBusy(false); }
        };
        window.addEventListener('pageshow', ac);
        return () => window.removeEventListener('pageshow', ac);
    }, []);

    const alanDegis = (alan: AliciAlani, deger: string) => {
        setForm((f) => ({ ...f, [alan]: alan === 'tckn' ? deger.replace(/\D/g, '').slice(0, 11) : deger }));
        if (hataliAlan === alan) { setHataliAlan(null); setHata(null); }
    };

    const gonder = async () => {
        if (kilit.current || !odemeAcik) return;
        setHata(null);
        setHataliAlan(null);
        setOnayHatali(false);

        if (!paket) { setHata(t('webOdeme.paketSecilmedi')); return; }
        const dogru = aliciyiDogrula(form);
        if (!dogru.ok) {
            setHataliAlan(dogru.hata.alan);
            setHata(t(`webOdeme.formHata.${dogru.hata.alan}.${dogru.hata.neden}`));
            return;
        }
        if (!onay) { setOnayHatali(true); setHata(t('webOdeme.onay.gerekli')); return; }

        kilit.current = true;
        setBusy(true);
        const sonuc = await odemeBaslat(paket, dogru.alici);
        if (sonuc.ok) {
            // Başarıda kilit AÇILMAZ: tarayıcı İyzico'ya giderken ikinci sipariş doğmasın.
            window.location.assign(sonuc.odemeUrl);
            return;
        }
        kilit.current = false;
        setBusy(false);
        if (sonuc.kod === 'giris_gerekli') setOturum('yok');
        setHata(t(odemeHataAnahtari(sonuc.kod)));
    };

    const baglantiAc = (url: string) => { openExternalLink(url); };
    const dil = i18n.language;
    const secili = WEB_PAKET_LISTESI.find((p) => p.id === paket);

    const alanlar: { alan: AliciAlani; etiket: string; ipucu?: string; tur?: 'phone-pad' | 'number-pad'; tamamlama?: string; cokSatir?: boolean }[] = [
        { alan: 'ad', etiket: t('webOdeme.form.ad'), tamamlama: 'given-name' },
        { alan: 'soyad', etiket: t('webOdeme.form.soyad'), tamamlama: 'family-name' },
        { alan: 'telefon', etiket: t('webOdeme.form.telefon'), ipucu: t('webOdeme.form.telefonIpucu'), tur: 'phone-pad', tamamlama: 'tel' },
        { alan: 'tckn', etiket: t('webOdeme.form.tckn'), ipucu: t('webOdeme.form.tcknIpucu'), tur: 'number-pad' },
        { alan: 'adres', etiket: t('webOdeme.form.adres'), ipucu: t('webOdeme.form.adresIpucu'), tamamlama: 'street-address', cokSatir: true },
        { alan: 'sehir', etiket: t('webOdeme.form.sehir') },
    ];

    return (
        <SafeAreaView style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('webOdeme.geri')}>
                    <Ionicons name="chevron-back" size={24} color="#584B40" />
                </Pressable>
                <Text style={styles.headerTitle} accessibilityRole="header">{t('webOdeme.baslik')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.column}>
                        <Text style={styles.lead}>{t('webOdeme.altBaslik')}</Text>

                        {oturum === 'yok' && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t('webOdeme.giris.baslik')}</Text>
                                <Text style={styles.body}>{t('webOdeme.giris.metin')}</Text>
                                <Pressable onPress={() => router.push('/veli-dashboard')} accessibilityRole="button" style={styles.primary}>
                                    <Text style={styles.primaryText}>{t('webOdeme.giris.dugme')}</Text>
                                </Pressable>
                            </View>
                        )}

                        <View style={styles.packages} accessibilityRole="radiogroup">
                            {WEB_PAKET_LISTESI.map((p) => {
                                const aktif = p.id === paket;
                                return (
                                    <Pressable
                                        key={p.id}
                                        onPress={() => { setPaket(p.id); setHata(null); }}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: aktif }}
                                        style={[styles.package, aktif && styles.packageOn]}
                                    >
                                        <Text style={styles.packageName}>{t(`webOdeme.paket.${p.id}`)}</Text>
                                        <Text style={styles.packageDuration}>{t(`webOdeme.sure.ay${p.sureAy}`)}</Text>
                                        <Text style={styles.packagePrice}>{fiyatMetni(p.fiyat, dil)}</Text>
                                        <Text style={styles.packageNote}>{t('webOdeme.tekSefer')}</Text>
                                        <View style={[styles.packageBadge, aktif && styles.packageBadgeOn]}>
                                            {aktif && <Ionicons name="checkmark" size={14} color="#fff" />}
                                            <Text style={[styles.packageBadgeText, aktif && { color: '#fff' }]}>{aktif ? t('webOdeme.secili') : t('webOdeme.sec')}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{t('webOdeme.form.baslik')}</Text>
                            <Text style={styles.help}>{t('webOdeme.form.aciklama')}</Text>
                            {alanlar.map((a) => (
                                <View key={a.alan} style={{ marginTop: 12 }}>
                                    <Text style={styles.label}>{a.etiket}</Text>
                                    <View collapsable={false} style={[styles.inputBox, hataliAlan === a.alan && styles.inputBoxError]}>
                                        <TextInput
                                            style={[styles.input, a.cokSatir && { minHeight: 72, textAlignVertical: 'top' }]}
                                            value={form[a.alan]}
                                            onChangeText={(v) => alanDegis(a.alan, v)}
                                            placeholder={a.ipucu}
                                            placeholderTextColor="#9E9E9E"
                                            keyboardType={a.tur}
                                            multiline={a.cokSatir}
                                            maxLength={a.alan === 'tckn' ? 11 : a.cokSatir ? 250 : 60}
                                            autoCorrect={false}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            autoComplete={a.tamamlama as any}
                                            editable={!busy}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.card}>
                            <Pressable
                                onPress={() => { setOnay((v) => !v); setOnayHatali(false); setHata(null); }}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: onay }}
                                style={styles.checkRow}
                            >
                                <View style={[styles.checkbox, onay && styles.checkboxOn, onayHatali && !onay && styles.checkboxError]}>
                                    {onay && <Ionicons name="checkmark" size={16} color="#fff" />}
                                </View>
                                <Text style={styles.checkText}>
                                    {t('webOdeme.onay.bas')}{' '}
                                    {/* TODO: MESAFELI_SATIS_URL boşken sözleşme adı düz metin kalır; sayfa yayına girince lib/webOdeme.ts'ye adresi yazın. */}
                                    {MESAFELI_SATIS_URL ? (
                                        <Text style={styles.link} accessibilityRole="link" onPress={() => baglantiAc(MESAFELI_SATIS_URL)}>{t('webOdeme.onay.mesafeliSatis')}</Text>
                                    ) : (
                                        <Text>{t('webOdeme.onay.mesafeliSatis')}</Text>
                                    )}
                                    {', '}
                                    <Text style={styles.link} accessibilityRole="link" onPress={() => baglantiAc(legalUrl('terms', dil))}>{t('webOdeme.onay.kullanimSartlari')}</Text>
                                    {', '}
                                    <Text style={styles.link} accessibilityRole="link" onPress={() => baglantiAc(legalUrl('privacy', dil))}>{t('webOdeme.onay.gizlilik')}</Text>
                                </Text>
                            </Pressable>

                            {hata && (
                                <View style={styles.errorCard} accessibilityRole="alert" accessibilityLiveRegion="polite">
                                    <Ionicons name="alert-circle" size={20} color="#A5503F" />
                                    <Text style={styles.errorText}>{hata}</Text>
                                </View>
                            )}

                            {!odemeAcik && (
                                <View style={styles.noteCard} accessibilityRole="alert">
                                    <Ionicons name="information-circle" size={20} color="#8A6A2F" />
                                    <Text style={styles.noteText}>{t('webOdeme.sozlesmeHazirDegil')}</Text>
                                </View>
                            )}

                            <Pressable onPress={gonder} disabled={busy || !odemeAcik} accessibilityRole="button" style={[styles.primary, (busy || !odemeAcik) && styles.disabled]}>
                                {busy ? (
                                    <View style={styles.busyRow}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={styles.primaryText}>{t('webOdeme.yonlendiriliyor')}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.primaryText}>
                                        {secili ? t('webOdeme.odemeyeGecTutar', { tutar: fiyatMetni(secili.fiyat, dil) }) : t('webOdeme.odemeyeGec')}
                                    </Text>
                                )}
                            </Pressable>

                            <View style={styles.trustRow}>
                                <Ionicons name="lock-closed" size={14} color="#8A7A63" />
                                <Text style={styles.trust}>{t('webOdeme.guven')}</Text>
                            </View>
                            {/* iyzico ödeme kuruluşu şartı: "iyzico ile Öde", Visa ve Mastercard logoları (resmi logo paketi, değiştirilmeden). */}
                            <Image
                                source={require('../assets/images/iyzico-logo-band-colored.png')}
                                style={styles.payLogos}
                                resizeMode="contain"
                                accessibilityLabel={t('webOdeme.logoAlt')}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAF2E4' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#584B40' },
    content: { padding: 16, alignItems: 'center' },
    column: { width: '100%', maxWidth: 620, gap: 16 },
    lead: { fontSize: 15, color: '#584B40', lineHeight: 22, fontWeight: '600', textAlign: 'center' },
    packages: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    package: { flexGrow: 1, flexBasis: 240, backgroundColor: '#FFFCF5', borderRadius: 22, padding: 18, borderWidth: 2, borderColor: '#EADFCB', alignItems: 'flex-start' },
    packageOn: { borderColor: '#3F7D72', backgroundColor: '#F1F8F5' },
    packageName: { fontSize: 20, fontWeight: '800', color: '#584B40' },
    packageDuration: { fontSize: 14, fontWeight: '700', color: '#A27D59', marginTop: 2 },
    packagePrice: { fontSize: 30, fontWeight: '800', color: '#3F7D72', marginTop: 8 },
    packageNote: { fontSize: 12, color: '#8A7A63', marginTop: 2 },
    packageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: '#D7CBBA', backgroundColor: '#fff' },
    packageBadgeOn: { backgroundColor: '#3F7D72', borderColor: '#3F7D72' },
    packageBadgeText: { fontSize: 13, fontWeight: '800', color: '#756753' },
    card: { backgroundColor: '#FFFCF5', borderRadius: 26, padding: 22 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: '#584B40' },
    body: { fontSize: 14, color: '#756753', lineHeight: 21, marginTop: 6 },
    help: { fontSize: 13, color: '#8A7A63', lineHeight: 19, marginTop: 4 },
    label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: '#A27D59', marginBottom: 6 },
    inputBox: { borderWidth: 1.5, borderColor: '#D7CBBA', borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#fff' },
    inputBoxError: { borderColor: '#B3392B' },
    input: { fontSize: 16, color: '#263238', paddingVertical: 12 },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#3F7D72', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginTop: 1 },
    checkboxOn: { backgroundColor: '#3F7D72' },
    checkboxError: { borderColor: '#B3392B' },
    checkText: { flex: 1, fontSize: 14, color: '#584B40', lineHeight: 21 },
    link: { color: '#2E6F9E', textDecorationLine: 'underline', fontWeight: '700' },
    errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FBE9E5', borderRadius: 14, padding: 12, marginTop: 14 },
    errorText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#A5503F', lineHeight: 20 },
    noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF4D6', borderRadius: 14, padding: 12, marginTop: 14 },
    noteText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#6B5320', lineHeight: 20 },
    primary: { backgroundColor: '#3F7D72', paddingVertical: 15, borderRadius: 16, marginTop: 16, alignItems: 'center' },
    primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    disabled: { opacity: 0.7 },
    trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
    trust: { flex: 1, fontSize: 12, color: '#8A7A63', lineHeight: 18, textAlign: 'center' },
    payLogos: { width: 280, height: 21, alignSelf: 'center', marginTop: 12 },
});
