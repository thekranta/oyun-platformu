import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';
import ScrollIfNeeded from './ScrollIfNeeded';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import { fitRow } from '../lib/fitLayout';
import {
    EN_BOYA_KAZANIM_ODAGI,
    EN_BOYA_OYUN_ADI,
    TR_YONERGELER,
    alkisSec,
    buildRounds,
    degerlendir,
} from '../lib/enBoya';
import type { EnKelime } from '../constants/ingilizceKelimeler';

// ============================================
// 🎨 BOYA (Paint it!) — İngilizce EK ETKİNLİK (Maarif dışı; kod/kazanım iddiası yok)
// Ses "Paint the apple red." der; ekranda nesnenin altında 3 renk düğmesi vardır (YAZI yok). Çocuk dinleyip doğru
// rengin düğmesine dokunur: nesne o renkle dolar. Yanlış renkte nesne boyanmaz, hafifçe sarsılır, görev cümlesi tekrar
// söylenir (cezasız). Hedef renk ekranda ayrıca gösterilmez: yalnız ses. Puan/hata/doğru sayısı çocuğa gösterilmez.
//
// ETKİLEŞİM KARARI: TEK DOKUNUŞ (rengi seç → nesne boyanır). "Önce renk seç, sonra nesneye dokun" 3-4 yaş için iki adımdır;
// çocuk sırayı karıştırıp (önce nesneye dokunup) takılabilir ve yanlış renk sınaması da belirsizleşir. Tek dokunuşta
// sebep-sonuç anında görülür. Nesneye dokunmak ise görevi TEKRAR söyler (ek yardım; boyama yapmaz).
// ============================================

export { TR_YONERGELER };

const USE_NATIVE = Platform.OS !== 'web';

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
        algilananKelime?: string,
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
    ) => void;
    onExit?: () => void;
    childName?: string;
}

// ---------- SVG şekiller (viewBox 200x200; yalnız daire/elips/üçgen ve yumuşak eğriler) ----------
const BOS_DOLGU = '#F1F3F5';
const BOS_KENAR = '#90A4AE';
const BOYALI_KENAR = '#455A64';
const DETAY = '#37474F';

/** Güneş ışınları: 8 üçgen (tepe yarıçapı 92, taban yarıçapı 54, ±11°). */
const GUNES_ISINLARI: string[] = Array.from({ length: 8 }, (_, k) => {
    const nokta = (aci: number, r: number) => {
        const rad = (aci * Math.PI) / 180;
        return `${(100 + r * Math.cos(rad)).toFixed(1)} ${(100 + r * Math.sin(rad)).toFixed(1)}`;
    };
    const a = k * 45 - 90;
    return `M${nokta(a, 92)} L${nokta(a - 11, 54)} L${nokta(a + 11, 54)} Z`;
});

/** Çiçek yaprakları: 5 daire (merkez 100,92; uzaklık 42; yarıçap 26). */
const CICEK_YAPRAKLARI: { cx: number; cy: number }[] = Array.from({ length: 5 }, (_, k) => {
    const rad = ((-90 + k * 72) * Math.PI) / 180;
    return { cx: 100 + 42 * Math.cos(rad), cy: 92 + 42 * Math.sin(rad) };
});

type NesneId = string;

/** Boyanacak (renk alan) kısım. */
function Govde({ id, fill, stroke }: { id: NesneId; fill: string; stroke: string }) {
    const p = { fill, stroke, strokeWidth: 5, strokeLinejoin: 'round' as const };
    switch (id) {
        case 'apple':
            return <Path {...p} d="M100 58 C72 36 26 52 28 106 C30 152 66 186 100 178 C134 186 170 152 172 106 C174 52 128 36 100 58 Z" />;
        case 'ball':
            return <Circle {...p} cx={100} cy={100} r={78} />;
        case 'sun':
            return (
                <>
                    {GUNES_ISINLARI.map((d, i) => <Path key={i} {...p} d={d} />)}
                    <Circle {...p} cx={100} cy={100} r={42} />
                </>
            );
        case 'flower':
            return <>{CICEK_YAPRAKLARI.map((c, i) => <Circle key={i} {...p} cx={c.cx} cy={c.cy} r={26} />)}</>;
        case 'leaf':
            return <Path {...p} d="M100 20 C162 52 170 132 100 182 C30 132 38 52 100 20 Z" />;
        case 'fish':
            return (
                <>
                    <Path {...p} d="M138 100 L192 62 L192 138 Z" />
                    <Ellipse {...p} cx={88} cy={100} rx={64} ry={44} />
                </>
            );
        default:
            return null;
    }
}

/** Boyanmayan, hep sabit arka parçalar (sap, gövde...). Boyanacak kısmın ARKASINA çizilir. */
function Arka({ id }: { id: NesneId }) {
    switch (id) {
        case 'flower':
            return (
                <>
                    <Path d="M100 120 C100 150 98 172 100 196" stroke="#43A047" strokeWidth={9} strokeLinecap="round" fill="none" />
                    <Path d="M100 172 C120 150 146 154 152 162 C140 182 114 184 100 172 Z" fill="#66BB6A" stroke="#2E7D32" strokeWidth={3} strokeLinejoin="round" />
                </>
            );
        case 'leaf':
            return <Path d="M100 174 L100 198" stroke="#8D6E63" strokeWidth={7} strokeLinecap="round" fill="none" />;
        default:
            return null;
    }
}

/** Boyanmayan, hep sabit ön detaylar (sap, göz, damar...). Boyanacak kısmın ÜSTÜNE çizilir. */
function Detay({ id }: { id: NesneId }) {
    const cizgi = { fill: 'none', stroke: DETAY, strokeOpacity: 0.35, strokeWidth: 4, strokeLinecap: 'round' as const };
    switch (id) {
        case 'apple':
            return (
                <>
                    <Path d="M60 92 C60 78 70 70 80 68" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={7} strokeLinecap="round" fill="none" />
                    <Path d="M100 58 C100 46 102 36 108 26" stroke="#8D6E63" strokeWidth={7} strokeLinecap="round" fill="none" />
                    <Path d="M106 40 C118 20 142 20 150 30 C138 48 118 50 106 40 Z" fill="#66BB6A" stroke="#2E7D32" strokeWidth={3} strokeLinejoin="round" />
                </>
            );
        case 'ball':
            return (
                <>
                    <Path d="M100 22 C62 58 62 142 100 178" {...cizgi} />
                    <Path d="M100 22 C138 58 138 142 100 178" {...cizgi} />
                    <Path d="M22 100 C60 120 140 120 178 100" {...cizgi} />
                </>
            );
        case 'sun':
            return (
                <>
                    <Circle cx={84} cy={92} r={5} fill={DETAY} />
                    <Circle cx={116} cy={92} r={5} fill={DETAY} />
                    <Path d="M82 112 Q100 128 118 112" stroke={DETAY} strokeWidth={4} strokeLinecap="round" fill="none" />
                </>
            );
        case 'flower':
            return <Circle cx={100} cy={92} r={17} fill="#FFB74D" stroke="#EF6C00" strokeWidth={3} />;
        case 'leaf':
            return (
                <>
                    <Path d="M100 40 L100 176" {...cizgi} />
                    <Path d="M100 92 L72 70" {...cizgi} strokeWidth={3} />
                    <Path d="M100 92 L128 70" {...cizgi} strokeWidth={3} />
                    <Path d="M100 132 L70 108" {...cizgi} strokeWidth={3} />
                    <Path d="M100 132 L130 108" {...cizgi} strokeWidth={3} />
                </>
            );
        case 'fish':
            return (
                <>
                    <Path d="M88 78 Q102 100 88 122" {...cizgi} strokeWidth={3} />
                    <Path d="M108 80 Q122 100 108 120" {...cizgi} strokeWidth={3} />
                    <Circle cx={58} cy={90} r={9} fill="#FFFFFF" stroke={DETAY} strokeWidth={3} />
                    <Circle cx={56} cy={90} r={4} fill={DETAY} />
                    <Path d="M32 110 Q40 116 48 110" stroke={DETAY} strokeWidth={3} strokeLinecap="round" fill="none" />
                </>
            );
        default:
            return null;
    }
}

function Katman({ boyut, children }: { boyut: number; children: React.ReactNode }) {
    return (
        <Svg width={boyut} height={boyut} viewBox="0 0 200 200" style={StyleSheet.absoluteFill} pointerEvents="none">
            {children}
        </Svg>
    );
}

// ---------- Oyun ----------
export default function EnglishBoya({ onGameEnd, onExit, childName }: Props) {
    const { width, height } = useWindowDimensions();
    const turlar = useMemo(() => buildRounds(), []);
    const [gameReady, setGameReady] = useState(false);
    const [idx, setIdx] = useState(0);
    const [boyaRengi, setBoyaRengi] = useState<string | null>(null);
    const [secilenId, setSecilenId] = useState<string | null>(null);
    const [yanlisId, setYanlisId] = useState<string | null>(null);
    const [kilitli, setKilitli] = useState(false);
    const [konfeti, setKonfeti] = useState(false);
    const [azHareket, setAzHareket] = useState(false);

    const [startTime] = useState(Date.now());
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const correctRef = useRef(0);
    const finishedRef = useRef(false);
    const mountedRef = useRef(true);
    const lockRef = useRef(false); // eşzamanlı kilit: state gecikmeli, çift dokunuş/çift ilerleme bununla engellenir
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Hepsi yerel sürücülü, ayrı Animated.View katmanlarında.
    const sarsin = useRef(new Animated.Value(0)).current;
    const nabiz = useRef(new Animated.Value(1)).current;
    const boyaOpak = useRef(new Animated.Value(0)).current;

    const tur = turlar[idx];

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            timersRef.current.forEach(clearTimeout);
            if (!finishedRef.current) stopSpeech();
        };
    }, []);

    useEffect(() => {
        let aktif = true;
        AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (aktif) setAzHareket(!!v); }).catch(() => {});
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setAzHareket(!!v));
        return () => { aktif = false; sub?.remove?.(); };
    }, []);

    // Yeni tur: görseli sıfırla, kilidi aç, görevi söyle.
    useEffect(() => {
        if (!gameReady) return;
        boyaOpak.setValue(0);
        nabiz.setValue(1);
        sarsin.setValue(0);
        setBoyaRengi(null);
        setSecilenId(null);
        setYanlisId(null);
        setKilitli(false);
        setKonfeti(false);
        lockRef.current = false;
        speak(tur.gorev, { lang: 'en' }).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, gameReady]);

    const bitir = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const sure = Math.floor((Date.now() - startTime) / 1000);
        onGameEnd(EN_BOYA_OYUN_ADI, sure, movesRef.current, errorsRef.current, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: EN_BOYA_KAZANIM_ODAGI,
            correct_answers: correctRef.current,
        });
    };

    const renkSec = (renk: EnKelime) => {
        if (!gameReady || lockRef.current || finishedRef.current) return;
        lockRef.current = true; // ilk await'ten ÖNCE kapanır
        movesRef.current += 1;

        if (degerlendir(tur, renk.id) === 'dogru') {
            correctRef.current += 1;
            setKilitli(true);
            setSecilenId(renk.id);
            setBoyaRengi(renk.hex ?? '#999999');
            setKonfeti(true);
            if (azHareket) {
                boyaOpak.setValue(1);
            } else {
                boyaOpak.setValue(0);
                Animated.timing(boyaOpak, { toValue: 1, duration: 450, useNativeDriver: USE_NATIVE }).start();
                Animated.sequence([
                    Animated.timing(nabiz, { toValue: 1.07, duration: 220, useNativeDriver: USE_NATIVE }),
                    Animated.timing(nabiz, { toValue: 1, duration: 220, useNativeDriver: USE_NATIVE }),
                ]).start();
            }
            const bu = idx;
            const bitisSirasi = bu + 1 >= turlar.length;
            // Olumlu cümle + renk adı; nesne boyalı olarak ekranda kalır (en az ~2,2 sn), sonra sıradaki tur.
            speakThenWait(alkisSec(), 900, { lang: 'en' })
                .then(() => (mountedRef.current ? speakThenWait(tur.hedef.en, 1300, { lang: 'en' }) : undefined))
                .then(() => {
                    if (!mountedRef.current || finishedRef.current) return;
                    setKonfeti(false);
                    if (bitisSirasi) bitir();
                    else setIdx(bu + 1);
                })
                .catch(() => {});
            return;
        }

        // Yanlış renk: nesne boyanmaz; sarsılma (az hareket: yalnız düğme solar) + görev tekrar; cezasız, hemen tekrar denenir.
        errorsRef.current += 1;
        setYanlisId(renk.id);
        if (!azHareket) {
            Animated.sequence([
                Animated.timing(sarsin, { toValue: 9, duration: 60, useNativeDriver: USE_NATIVE }),
                Animated.timing(sarsin, { toValue: -9, duration: 60, useNativeDriver: USE_NATIVE }),
                Animated.timing(sarsin, { toValue: 6, duration: 60, useNativeDriver: USE_NATIVE }),
                Animated.timing(sarsin, { toValue: 0, duration: 60, useNativeDriver: USE_NATIVE }),
            ]).start();
        }
        const t = setTimeout(() => {
            if (!mountedRef.current || finishedRef.current) return;
            setYanlisId(null);
            lockRef.current = false;
            speak(tur.gorev, { lang: 'en' }).catch(() => {});
        }, 700);
        timersRef.current.push(t);
    };

    const gorevTekrar = () => {
        if (!gameReady || lockRef.current) return;
        speak(tur.gorev, { lang: 'en' }).catch(() => {});
    };

    // ---- ölçüler (360x640 dp'de de sığar; taşarsa ScrollIfNeeded kaydırır) ----
    const palet = fitRow(width - 32, tur.secenekler.length, 16, 88, 64, 64);
    const nesneBoyut = Math.max(130, Math.min(280, width - 56, height - 372));

    return (
        <View style={styles.container}>
            {konfeti && !azHareket && <ConfettiCannon count={90} origin={{ x: width / 2, y: 0 }} fadeOut />}
            {!gameReady && (
                <CountdownOverlay
                    message="Dinle ve doğru rengi seç. Resmi birlikte boyayalım!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}

            <View style={styles.header}>
                <GameExitButton onPress={onExit ?? (() => {})} />
                <View style={styles.dots}>
                    {turlar.map((_, i) => (
                        <View key={i} style={[styles.dot, i < idx || (i === idx && kilitli) ? styles.dotDone : i === idx ? styles.dotNow : null]} />
                    ))}
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollIfNeeded contentStyle={styles.body}>
                <TouchableOpacity activeOpacity={0.9} onPress={gorevTekrar} accessibilityRole="button" style={styles.card}>
                    <Animated.View style={{ transform: [{ translateX: sarsin }] }}>
                        <Animated.View style={{ width: nesneBoyut, height: nesneBoyut, transform: [{ scale: nabiz }] }}>
                            <Katman boyut={nesneBoyut}>
                                <Arka id={tur.nesne.id} />
                                <Govde id={tur.nesne.id} fill={BOS_DOLGU} stroke={BOS_KENAR} />
                            </Katman>
                            {boyaRengi != null && (
                                <Animated.View style={[StyleSheet.absoluteFill, { opacity: boyaOpak }]} pointerEvents="none">
                                    <Katman boyut={nesneBoyut}>
                                        <Govde id={tur.nesne.id} fill={boyaRengi} stroke={BOYALI_KENAR} />
                                    </Katman>
                                </Animated.View>
                            )}
                            <Katman boyut={nesneBoyut}>
                                <Detay id={tur.nesne.id} />
                            </Katman>
                        </Animated.View>
                    </Animated.View>
                    {kilitli && azHareket && <Text style={styles.yildiz}>⭐</Text>}
                </TouchableOpacity>

                <View style={styles.palet}>
                    {tur.secenekler.map((r) => {
                        const secili = secilenId === r.id;
                        const soluk = (kilitli && !secili) || yanlisId === r.id;
                        return (
                            <TouchableOpacity
                                key={r.id}
                                activeOpacity={0.8}
                                onPress={() => renkSec(r)}
                                accessibilityRole="button"
                                style={[
                                    styles.renk,
                                    { width: palet.size, height: palet.size, borderRadius: palet.size / 2, backgroundColor: r.hex },
                                    secili && styles.renkSecili,
                                    soluk && { opacity: 0.3 },
                                ]}
                            />
                        );
                    })}
                </View>

                <ListenButton onPress={gorevTekrar} color="#1E88E5" style={styles.dinle} />
            </ScrollIfNeeded>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF5FF', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2, borderColor: '#B0BEC5' },
    dotNow: { borderColor: '#1E88E5', backgroundColor: '#BBDEFB' },
    dotDone: { borderColor: '#43A047', backgroundColor: '#66BB6A' },

    body: { alignItems: 'center', justifyContent: 'center', paddingBottom: 16 },
    card: { backgroundColor: '#fff', borderRadius: 32, padding: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5 },
    yildiz: { position: 'absolute', top: 8, right: 14, fontSize: 40 },
    palet: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 22, paddingHorizontal: 16 },
    renk: { borderWidth: 5, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 3, elevation: 4 },
    renkSecili: { borderColor: '#455A64' },
    dinle: { marginTop: 18, minHeight: 52, paddingHorizontal: 28 },
});
