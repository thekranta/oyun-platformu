import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useSound } from './SoundContext';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import { EN_ALKISLAR } from '../constants/ingilizceKelimeler';
import {
    bellekHatasiMi,
    bittiMi,
    ciftMi,
    CIFT_SAYISI,
    izgaraDuzeni,
    KAZANIM_ODAGI,
    yeniOyun,
    type KonusanKart,
} from '../lib/enKonusanCiftler';

// ============================================
// 🐾 KONUŞAN ÇİFTLER (İngilizce ek etkinlik — Maarif dışı)
// Hayvan çiftleri hafıza oyunu: kart çevrilince hayvanın İngilizce adı söylenir; iki kart eşleşince ad bir kez daha
// söylenir. Çocuğa YAZI gösterilmez (yalnız resim + dinleme), puan/hata gösterilmez. Sabit zorluk: 6 çift (12 kart).
// Mantık: lib/enKonusanCiftler.ts (test: lib/enKonusanCiftler.test.ts).
// ============================================

const USE_NATIVE = Platform.OS !== 'web';
const GAP = 10;
const CHROME_PAD_TOP = 44;

/** Giriş (CountdownOverlay) Türkçe yönergesi: konuşma klibi bu metinle üretilir. */
const GIRIS_MESAJI = 'Kartları çevir ve hayvanların İngilizce adlarını dinle. Aynı olan iki kartı bul!';

/** Bu oyunun söylediği TÜM Türkçe metinler (klipleri ayrıca üretilir). */
export const TR_YONERGELER: string[] = [GIRIS_MESAJI];

const { width: SCREEN_W } = Dimensions.get('window');

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

interface KartAnim {
    flip: Animated.Value;
    shake: Animated.Value;
    scale: Animated.Value;
}

const bekle = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function EnglishKonusanCiftler({ onGameEnd, onExit, childName }: Props) {
    const { playSound } = useSound();
    const [gameReady, setGameReady] = useState(false);
    const [kartlar] = useState<KonusanKart[]>(() => yeniOyun());
    const [anims] = useState<Record<number, KartAnim>>(() => {
        const m: Record<number, KartAnim> = {};
        for (let i = 0; i < CIFT_SAYISI * 2; i++) m[i] = { flip: new Animated.Value(0), shake: new Animated.Value(0), scale: new Animated.Value(1) };
        return m;
    });
    const [acik, setAcik] = useState<number[]>([]);                 // çevrili (henüz eşleşmemiş) kartlar — yalnız çizim için
    const [bulunan, setBulunan] = useState<Set<string>>(new Set()); // eşleşen çiftler
    const [showConfetti, setShowConfetti] = useState(false);
    const [alan, setAlan] = useState({ w: 0, h: 0 });

    const [startTime] = useState(Date.now());
    const acikRef = useRef<number[]>([]);
    const bulunanRef = useRef<Set<string>>(new Set());
    const gorulenRef = useRef<Set<number>>(new Set());
    const busyRef = useRef(false);
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const finishedRef = useRef(false);
    const isMountedRef = useRef(true);
    const reduceMotionRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotionRef.current = !!v; }).catch(() => { });
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => { reduceMotionRef.current = !!v; });
        return () => {
            isMountedRef.current = false;
            sub?.remove?.();
            // Bitişte (onGameEnd çağrıldıktan sonra) tebrik sonuç ekranında sürsün; erken çıkışta konuşma kesilir.
            if (!finishedRef.current) stopSpeech();
        };
    }, []);

    const cevir = (id: number, ac: boolean) => {
        const v = anims[id].flip;
        if (reduceMotionRef.current) { v.setValue(ac ? 1 : 0); return; }
        Animated.spring(v, { toValue: ac ? 1 : 0, friction: 8, tension: 10, useNativeDriver: USE_NATIVE }).start();
    };

    const salla = (id: number) => {
        if (reduceMotionRef.current) return;
        const s = anims[id].shake;
        Animated.sequence([
            Animated.timing(s, { toValue: 8, duration: 55, useNativeDriver: USE_NATIVE }),
            Animated.timing(s, { toValue: -8, duration: 55, useNativeDriver: USE_NATIVE }),
            Animated.timing(s, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
        ]).start();
    };

    const zipla = (id: number) => {
        if (reduceMotionRef.current) return;
        const s = anims[id].scale;
        Animated.sequence([
            Animated.timing(s, { toValue: 1.15, duration: 140, useNativeDriver: USE_NATIVE }),
            Animated.timing(s, { toValue: 1, duration: 140, useNativeDriver: USE_NATIVE }),
        ]).start();
    };

    const bitir = () => {
        if (finishedRef.current) return;
        setShowConfetti(!reduceMotionRef.current);
        const alkis = EN_ALKISLAR[0]; // 'Good job!'
        speakThenWait(alkis, 1800, { lang: 'en' }).then(() => {
            if (!isMountedRef.current || finishedRef.current) return;
            finishedRef.current = true;
            const sure = Math.floor((Date.now() - startTime) / 1000);
            onGameEnd('en-konusan-ciftler', sure, movesRef.current, errorsRef.current, undefined, {
                zorlukSeviyesi: 1,
                kazanimOdagi: KAZANIM_ODAGI,
                correct_answers: CIFT_SAYISI,
            });
        });
    };

    const handlePress = async (kart: KonusanKart) => {
        if (!gameReady || busyRef.current || finishedRef.current) return;

        // Eşleşmiş karta dokunmak adını yeniden dinletir.
        if (bulunanRef.current.has(kart.pairId)) {
            stopSpeech();
            speak(kart.en, { lang: 'en' });
            return;
        }
        if (acikRef.current.includes(kart.id)) return;

        cevir(kart.id, true);
        acikRef.current = [...acikRef.current, kart.id];
        setAcik(acikRef.current);

        // Art arda çevirmede önceki konuşma kesilir (üst üste binmesin).
        stopSpeech();
        const soyleniyor = speak(kart.en, { lang: 'en' });

        if (acikRef.current.length < 2) return;

        busyRef.current = true;
        movesRef.current += 1;
        const [a, b] = acikRef.current.map((id) => kartlar.find((k) => k.id === id) as KonusanKart);

        if (ciftMi(a, b)) {
            // İkinci kartın adı duyulsun, sonra olumlu ses + ad bir kez daha.
            await Promise.all([soyleniyor, bekle(550)]);
            if (!isMountedRef.current) return;
            playSound('correct');
            zipla(a.id);
            zipla(b.id);
            const yeni = new Set(bulunanRef.current).add(a.pairId);
            bulunanRef.current = yeni;
            setBulunan(yeni);
            acikRef.current = [];
            setAcik([]);
            await speakThenWait(a.en, 900, { lang: 'en' });
            if (!isMountedRef.current) return;
            if (bittiMi(kartlar, yeni)) { bitir(); return; }
            busyRef.current = false;
        } else {
            if (bellekHatasiMi(a, b, gorulenRef.current)) errorsRef.current += 1;
            gorulenRef.current.add(a.id);
            gorulenRef.current.add(b.id);
            // Nazik geri bildirim: kısa sarsılma (hata sesi/ceza yok), sonra kartlar kapanır.
            salla(a.id);
            salla(b.id);
            await Promise.all([soyleniyor, bekle(1100)]);
            if (!isMountedRef.current) return;
            cevir(a.id, false);
            cevir(b.id, false);
            acikRef.current = [];
            setAcik([]);
            busyRef.current = false;
        }
    };

    const onAlan = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setAlan((p) => (Math.abs(p.w - width) < 1 && Math.abs(p.h - height) < 1 ? p : { w: width, h: height }));
    };

    // Ölçülen alan padding'i (yatay 12+12, alt 16) İÇERİR: kartlar kenara yapışmasın diye padding düşülür.
    const duzen = izgaraDuzeni(Math.max(0, alan.w - 24), Math.max(0, alan.h - 16), kartlar.length, GAP);
    const ilerleme = Array.from({ length: CIFT_SAYISI }, (_, i) => i < bulunan.size);

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
            {!gameReady && (
                <CountdownOverlay
                    message={GIRIS_MESAJI}
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}

            <View style={styles.header}>
                <GameExitButton onPress={onExit ?? (() => { })} />
                {/* Yazısız ilerleme: bulunan her çift için bir yıldız yanar */}
                <View style={styles.progress}>
                    {ilerleme.map((dolu, i) => (
                        <View key={i} style={[styles.progressDot, dolu && styles.progressDotOn]}>
                            {dolu ? <Text style={styles.progressStar}>⭐</Text> : null}
                        </View>
                    ))}
                </View>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.alan} onLayout={onAlan}>
                {duzen.size > 0 && (
                    <View style={[styles.grid, { width: duzen.cols * duzen.size + GAP * (duzen.cols - 1), gap: GAP }]}>
                        {kartlar.map((kart) => {
                            const an = anims[kart.id];
                            const cevrili = acik.includes(kart.id);
                            const eslesti = bulunan.has(kart.pairId);
                            const frontRot = an.flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
                            const backRot = an.flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
                            const donus = { scale: an.scale };
                            const sars = { translateX: an.shake };
                            return (
                                <View key={kart.id} style={{ width: duzen.size, height: duzen.size }}>
                                    <Animated.View style={[styles.face, styles.front, eslesti && styles.frontMatched, { transform: [{ rotateY: frontRot }, donus, sars] }]}>
                                        <Text style={{ fontSize: duzen.size * 0.55 }}>{kart.emoji}</Text>
                                    </Animated.View>
                                    <Animated.View style={[styles.face, styles.back, { transform: [{ rotateY: backRot }, donus, sars] }]}>
                                        <Text style={{ fontSize: duzen.size * 0.45 }}>🐾</Text>
                                    </Animated.View>
                                    <TouchableOpacity
                                        style={styles.touch}
                                        activeOpacity={1}
                                        onPress={() => handlePress(kart)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Kart"
                                        accessibilityState={{ selected: cevrili || eslesti }}
                                    />
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E8F5E9', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: CHROME_PAD_TOP, paddingBottom: 8 },
    progress: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
    progressDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#C8E6C9', alignItems: 'center', justifyContent: 'center' },
    progressDotOn: { backgroundColor: '#FFF8E1' },
    progressStar: { fontSize: 14 },
    alan: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    face: {
        position: 'absolute', width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        backfaceVisibility: 'hidden', borderWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
    },
    front: { backgroundColor: '#fff', borderColor: '#A5D6A7' },
    frontMatched: { borderColor: '#43A047', backgroundColor: '#F1F8E9' },
    back: { backgroundColor: '#42A5F5', borderColor: '#1E88E5' },
    touch: { position: 'absolute', width: '100%', height: '100%', zIndex: 10 },
});
