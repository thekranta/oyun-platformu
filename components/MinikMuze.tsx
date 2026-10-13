import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { MUSEUM_DONE, MUSEUM_INTRO, PAINTINGS, Painting } from '../constants/minikMuze';
import { getHunt } from '../constants/minikMuzeHunt';
import { lazyWithReload } from '../lib/lazyWithReload';
import { isPaintingOpenForTier, paintingTierName, sortPaintingsByTier } from '../lib/minikMuzeAccess';
import { focusTransform, fitContain } from '../lib/minikMuzeMath';
import { openPricing } from '../lib/openPricing';
import type { VeliTier } from '../lib/subscriptionTiers';
import { consumeAudioBlocked, speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';
import CreditsModal from './minikMuze/CreditsModal';
import DetayAvi from './minikMuze/DetayAvi';
import { PAINTING_IMAGES } from './minikMuze/paintingImages';

// ============================================
// 🏛️ MİNİK MÜZE — dünyaca ünlü tabloları tam ekranda göster, sade bir dille sesli anlat
// (Sanat: SNAB.2 sanat eseri inceleme / SNAB.3 sanat eserlerine ve sanatçılara değer verme).
// Çocuk bir tabloya dokunur; ses parça parça anlatılırken tablo anlatılan ayrıntıya yakınlaşır.
// Otomatik ilerler; duraklat / önceki / sonraki / "Tekrar Dinle" ile çocuk ya da veli yönlendirebilir.
// Veri ve anlatım metinleri: constants/minikMuze.ts (her metnin VoiceBox klibi vardır).
// ============================================

const USE_NATIVE = Platform.OS !== 'web';
// "Sen de çiz": mevcut Yaratıcı Çizim oyunu, köşede tablo referansıyla açılır (tembel yüklenir).
const YaraticiCizim = lazyWithReload(() => import('./YaraticiCizim'));
const HAPPY_VOICE = 'Speak in Turkish like a warm, gentle museum guide for small children. Calm and friendly.';
const WALL = '#2B2119';
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Props {
    onGameEnd: (
        oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
        algilananKelime?: string,
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
    ) => void;
    onExit?: () => void;
    childName?: string;
    /** Oyun erişim paketi; ücretsizde yalnız vitrin tablosu (Mona Lisa) açılır. Verilmezse (eski çağrı) tümü açık sayılır. */
    tier?: VeliTier;
}

export default function MinikMuze({ onGameEnd, onExit, childName, tier = 'orman' }: Props) {
    const { width: W, height: H } = useWindowDimensions();
    // Kısa yatay ekran (telefon yan): tablo solda, altyazı + düğmeler sağda; aksi hâlde tablo üstte, altyazı altta.
    const sideBySide = W > H && H < 620;
    const [gameReady, setGameReady] = useState(false);
    const [selected, setSelected] = useState<Painting | null>(null);
    const [seg, setSeg] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [finished, setFinished] = useState(false);
    const [stage, setStage] = useState({ w: 0, h: 0 });
    const [viewed, setViewed] = useState<string[]>([]);
    const [lockedPainting, setLockedPainting] = useState<Painting | null>(null);
    const [drawingFor, setDrawingFor] = useState<Painting | null>(null);
    const [huntFor, setHuntFor] = useState<Painting | null>(null);
    // Mobil tarayici sesi engellediyse (dokunus gerekir) anlatim sessizce hizla ilerlemesin; cocuk dokunsun.
    const [needsTap, setNeedsTap] = useState(false);
    const [creditsOpen, setCreditsOpen] = useState(false);

    const startRef = useRef(Date.now());
    const runRef = useRef(0);
    const mountedRef = useRef(true);
    const sizeRef = useRef({ w: 0, h: 0 });
    const viewedRef = useRef<Set<string>>(new Set());
    const finishedRef = useRef(false);

    const scaleV = useRef(new Animated.Value(1)).current;
    const txV = useRef(new Animated.Value(0)).current;
    const tyV = useRef(new Animated.Value(0)).current;

    useEffect(() => () => { mountedRef.current = false; runRef.current++; stopSpeech(); }, []);

    const img = selected ? fitContain(stage.w - 24, stage.h - 24, selected.aspect) : { w: 0, h: 0 };
    sizeRef.current = img;

    const animateFocus = useCallback((focus: Painting['segments'][number]['focus'], instant = false) => {
        const { w, h } = sizeRef.current;
        const t = focusTransform(w, h, focus);
        if (instant) { scaleV.setValue(t.scale); txV.setValue(t.tx); tyV.setValue(t.ty); return; }
        const cfg = { duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: USE_NATIVE };
        Animated.parallel([
            Animated.timing(scaleV, { toValue: t.scale, ...cfg }),
            Animated.timing(txV, { toValue: t.tx, ...cfg }),
            Animated.timing(tyV, { toValue: t.ty, ...cfg }),
        ]).start();
    }, [scaleV, txV, tyV]);

    // Pencere/sahne boyutu değişince (döndürme vb.) geçerli yakınlaşmayı anında yeniden uygula.
    useEffect(() => {
        if (selected) animateFocus(selected.segments[seg]?.focus ?? null, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [img.w, img.h]);

    const playSegment = useCallback((p: Painting, index: number) => {
        const run = ++runRef.current;
        stopSpeech();
        setSeg(index);
        setFinished(false);
        setNeedsTap(false);
        setPlaying(true);
        const s = p.segments[index];
        animateFocus(s.focus);
        (async () => {
            await speakThenWait(s.text, 900, { instructions: HAPPY_VOICE });
            if (run !== runRef.current || !mountedRef.current) return;
            if (consumeAudioBlocked()) {
                // Ses engellendi: otomatik ilerlemeyi durdur, dokunusla (play dugmesi) bu parcadan devam edilir.
                setPlaying(false);
                setNeedsTap(true);
                return;
            }
            await wait(s.pauseAfterMs ?? 700);
            if (run !== runRef.current || !mountedRef.current) return;
            if (index < p.segments.length - 1) {
                playSegment(p, index + 1);
            } else {
                viewedRef.current.add(p.id);
                setViewed(Array.from(viewedRef.current));
                setPlaying(false);
                setFinished(true);
                animateFocus(null);
                speak(MUSEUM_DONE, { instructions: HAPPY_VOICE });
            }
        })();
    }, [animateFocus]);

    const openPainting = (p: Painting) => {
        if (!isPaintingOpenForTier(tier, p)) { setLockedPainting(p); return; }
        scaleV.setValue(1); txV.setValue(0); tyV.setValue(0);
        setSelected(p);
        playSegment(p, 0);
    };

    const backToGallery = () => {
        runRef.current++;
        stopSpeech();
        setPlaying(false);
        setFinished(false);
        setSelected(null);
    };

    const pause = () => { runRef.current++; stopSpeech(); setPlaying(false); };
    const go = (delta: number) => {
        if (!selected) return;
        const next = Math.min(selected.segments.length - 1, Math.max(0, seg + delta));
        playSegment(selected, next);
    };

    const finishAndExit = () => {
        if (finishedRef.current) return;
        runRef.current++;
        stopSpeech();
        if (viewedRef.current.size === 0) { onExit?.(); return; }
        finishedRef.current = true;
        const duration = Math.floor((Date.now() - startRef.current) / 1000);
        onGameEnd('minik-muze', duration, viewedRef.current.size, 0, Array.from(viewedRef.current).join(','), {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'Sanat: Sanat Eseri İnceleme ve Sanatçılara Değer Verme (SNAB.2, SNAB.3)',
            correct_answers: viewedRef.current.size,
        });
    };

    const onStageLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setStage((prev) => (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    };

    // ------------------------------------------------------------ DETAY AVI (tabloda söylenen ayrıntıyı bul)
    if (huntFor) {
        const targets = getHunt(huntFor.id);
        if (targets) {
            return (
                <DetayAvi
                    key={'hunt-' + huntFor.id}
                    painting={huntFor}
                    targets={targets}
                    onExit={() => setHuntFor(null)}
                    onCompleted={(id) => {
                        // Avı bitiren çocuk tabloyu da incelemiş sayılır (müze kaydı ve veli notu için).
                        viewedRef.current.add(id);
                        setViewed(Array.from(viewedRef.current));
                    }}
                />
            );
        }
    }

    // ------------------------------------------------------------ TABLODAN İLHAM AL (çizim)
    if (drawingFor) {
        return (
            <View key="draw" style={styles.container}>
                <React.Suspense fallback={<View style={styles.drawLoading}><ActivityIndicator size="large" color="#F4E7CF" /></View>}>
                    <YaraticiCizim
                        onGameEnd={onGameEnd}
                        onExit={() => setDrawingFor(null)}
                        reference={{ source: PAINTING_IMAGES[drawingFor.id], title: drawingFor.title, artist: drawingFor.artist, aspect: drawingFor.aspect }}
                    />
                </React.Suspense>
            </View>
        );
    }

    // ------------------------------------------------------------ GALERİ
    if (!selected) {
        const cols = W >= 900 ? 3 : W >= 560 ? 2 : 1;
        const cardW = Math.min(340, (W - 32 - (cols - 1) * 16) / cols);
        return (
            <View key="gallery" style={styles.container}>
                {!gameReady && (
                    <CountdownOverlay message={MUSEUM_INTRO} childName={childName} countdownSeconds={5} interaction="tap" onComplete={() => setGameReady(true)} />
                )}
                <View style={styles.header}>
                    <GameExitButton onPress={finishAndExit} />
                    <Text style={styles.headerTitle}>🏛️ Minik Müze</Text>
                    <TouchableOpacity onPress={() => setCreditsOpen(true)} style={styles.infoBtn} accessibilityRole="button" accessibilityLabel="Künye ve kaynaklar">
                        <Ionicons name="information-circle-outline" size={26} color="#F4E7CF" />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.gallery} showsVerticalScrollIndicator={false}>
                    {sortPaintingsByTier(PAINTINGS).map((p) => {
                        const done = viewed.includes(p.id);
                        const locked = !isPaintingOpenForTier(tier, p);
                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.frame, { width: cardW, borderColor: p.accent }]}
                                onPress={() => openPainting(p)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel={locked ? `${p.title}, ${p.artist}, ${paintingTierName(p)} paketiyle açılır` : `${p.title}, ${p.artist}`}
                            >
                                <View style={styles.thumbBox}>
                                    <Image source={PAINTING_IMAGES[p.id]} style={[styles.thumb, locked && styles.thumbLocked]} resizeMode="contain" />
                                    {locked && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={22} color="#F4E7CF" /></View>}
                                </View>
                                <Text style={styles.frameTitle} numberOfLines={1}>{p.title}</Text>
                                <Text style={styles.frameArtist} numberOfLines={1}>{p.artist}</Text>
                                {done && <View style={styles.doneBadge}><Ionicons name="checkmark" size={18} color="#fff" /></View>}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <CreditsModal visible={creditsOpen} onClose={() => setCreditsOpen(false)} />
                {lockedPainting && (
                    <View style={styles.lockOverlay}>
                        <View style={styles.lockCard} accessibilityViewIsModal>
                            <Ionicons name="lock-closed" size={30} color="#B5742F" />
                            <Text style={styles.lockTitle}>{lockedPainting.title}</Text>
                            <Text style={styles.lockText}>Bu tablo {paintingTierName(lockedPainting)} paketiyle açılır. {lockedPainting.tier === 'fidan' ? 'Fidan paketinde müzedeki tüm tablolar çocukla birlikte dinlenebilir.' : 'Tohum paketinde müzedeki ilk altı tablo açılır.'}</Text>
                            <TouchableOpacity style={styles.lockPrimary} onPress={() => { setLockedPainting(null); openPricing(); }} accessibilityRole="link">
                                <Text style={styles.lockPrimaryText}>Paketleri Gör</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.lockSecondary} onPress={() => setLockedPainting(null)} accessibilityRole="button">
                                <Text style={styles.lockSecondaryText}>Şimdi Değil</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    // ------------------------------------------------------------ İZLEYİCİ
    const segment = selected.segments[seg];
    // key: galeri ve izleyici aynı konumda View olduğundan React sahneyi yeniden kullanıp onLayout'u kaçırıyordu.
    return (
        <View key="viewer" style={styles.container}>
            <View style={styles.header}>
                <GameExitButton onPress={backToGallery} accessibilityLabel="Galeriye dön" />
                <View style={styles.plaque}>
                    <Text style={styles.plaqueTitle} numberOfLines={1}>{selected.title}</Text>
                    <Text style={styles.plaqueArtist} numberOfLines={1}>{selected.artist} · {selected.yearLabel}</Text>
                </View>
                {getHunt(selected.id) && (
                    <TouchableOpacity onPress={() => { runRef.current++; stopSpeech(); setPlaying(false); setHuntFor(selected); }} style={styles.infoBtn} accessibilityRole="button" accessibilityLabel="Detay Avı">
                        <Ionicons name="search" size={24} color="#F4E7CF" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setCreditsOpen(true)} style={styles.infoBtn} accessibilityRole="button" accessibilityLabel="Tablo künyesi">
                    <Ionicons name="information-circle-outline" size={26} color="#F4E7CF" />
                </TouchableOpacity>
            </View>

            <View style={[styles.body, sideBySide && styles.bodyRow]}>
            <View key={selected.id} style={styles.stage} onLayout={onStageLayout}>
                {img.w > 0 && (
                    <Animated.View
                        style={[
                            styles.paintingWrap,
                            { width: img.w, height: img.h, borderColor: selected.accent, transform: [{ translateX: txV }, { translateY: tyV }, { scale: scaleV }] },
                        ]}
                    >
                        <Image source={PAINTING_IMAGES[selected.id]} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`${selected.title} tablosu`} />
                    </Animated.View>
                )}
            </View>

            <View style={[styles.bottom, sideBySide && { ...styles.bottomSide, width: Math.min(380, W * 0.4) }]}>
                <View style={[styles.subtitle, sideBySide && styles.subtitleSide]}>
                    <Text style={[styles.subtitleText, sideBySide && styles.subtitleTextSide]}>{segment.text}</Text>
                </View>

                {needsTap && (
                    <Text style={styles.tapHint} accessibilityLiveRegion="polite">Sesi duymak için ▶ düğmesine dokun</Text>
                )}

                <View style={styles.dots}>
                    {selected.segments.map((_, i) => (
                        <View key={i} style={[styles.dot, i === seg && { backgroundColor: '#FFD27A', width: 22 }, i < seg && { backgroundColor: '#B79B6B' }]} />
                    ))}
                </View>

                {finished && (
                    <View style={styles.artistCard}>
                        <Text style={styles.artistName}>🎨 {selected.artist}</Text>
                        <Text style={styles.artistMeta}>{selected.country} · {selected.credit.museum}</Text>
                    </View>
                )}

                {finished ? (
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.bigBtn} onPress={() => playSegment(selected, 0)} accessibilityRole="button" accessibilityLabel="Tekrar izle">
                            <Ionicons name="refresh" size={26} color="#fff" />
                            <Text style={styles.bigBtnText}>Tekrar izle</Text>
                        </TouchableOpacity>
                        {getHunt(selected.id) && (
                            <TouchableOpacity
                                style={[styles.bigBtn, { backgroundColor: '#2F7F86' }]}
                                onPress={() => { runRef.current++; stopSpeech(); setHuntFor(selected); }}
                                accessibilityRole="button"
                                accessibilityLabel="Detay Avı"
                            >
                                <Ionicons name="search" size={26} color="#fff" />
                                <Text style={styles.bigBtnText}>Detay Avı</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.bigBtn, { backgroundColor: '#8E5BA8' }]}
                            onPress={() => { runRef.current++; stopSpeech(); setDrawingFor(selected); }}
                            accessibilityRole="button"
                            accessibilityLabel="Sen de çiz"
                        >
                            <Ionicons name="brush" size={26} color="#fff" />
                            <Text style={styles.bigBtnText}>Sen de çiz!</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#6A8F5B' }]} onPress={backToGallery} accessibilityRole="button" accessibilityLabel="Başka tablo">
                            <Ionicons name="images" size={26} color="#fff" />
                            <Text style={styles.bigBtnText}>Başka tablo</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.controls}>
                        <TouchableOpacity style={[styles.roundBtn, seg === 0 && styles.disabled]} onPress={() => go(-1)} disabled={seg === 0} accessibilityRole="button" accessibilityLabel="Önceki">
                            <Ionicons name="play-skip-back" size={26} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.roundBtn, styles.mainBtn]} onPress={() => (playing ? pause() : playSegment(selected, seg))} accessibilityRole="button" accessibilityLabel={playing ? 'Duraklat' : 'Devam et'}>
                            <Ionicons name={playing ? 'pause' : 'play'} size={32} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.roundBtn} onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Sonraki">
                            <Ionicons name="play-skip-forward" size={26} color="#fff" />
                        </TouchableOpacity>
                        <ListenButton onPress={() => playSegment(selected, seg)} color="#8D6E63" />
                    </View>
                )}
            </View>
            </View>
            <CreditsModal visible={creditsOpen} onClose={() => setCreditsOpen(false)} only={selected} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: WALL },
    drawLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 44, paddingBottom: 8 },
    infoBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#F4E7CF' },
    plaque: { flex: 1, marginHorizontal: 12, alignItems: 'center', backgroundColor: '#3C2F23', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#6B5538' },
    plaqueTitle: { fontSize: 17, fontWeight: '900', color: '#F4E7CF' },
    plaqueArtist: { fontSize: 12, color: '#CDB892', marginTop: 1, fontWeight: '600' },

    gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, padding: 16, paddingBottom: 40 },
    frame: { backgroundColor: '#3C2F23', borderRadius: 18, borderWidth: 4, padding: 12, alignItems: 'center' },
    thumbBox: { width: '100%', height: 200, backgroundColor: '#1E1711', borderRadius: 8, overflow: 'hidden' },
    thumb: { width: '100%', height: '100%' },
    thumbLocked: { opacity: 0.45 },
    lockBadge: { position: 'absolute', top: '50%', left: '50%', marginTop: -24, marginLeft: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(43,33,25,0.85)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#B5742F' },
    lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    lockCard: { width: '100%', maxWidth: 380, backgroundColor: '#3C2F23', borderRadius: 20, borderWidth: 2, borderColor: '#6B5538', padding: 22, alignItems: 'center', gap: 10 },
    lockTitle: { fontSize: 20, fontWeight: '900', color: '#F4E7CF' },
    lockText: { fontSize: 15, lineHeight: 22, color: '#E3D3B5', textAlign: 'center', fontWeight: '600' },
    lockPrimary: { alignSelf: 'stretch', backgroundColor: '#B5742F', borderRadius: 22, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
    lockPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    lockSecondary: { paddingVertical: 8, paddingHorizontal: 16 },
    lockSecondaryText: { color: '#CDB892', fontSize: 14, fontWeight: '700' },
    frameTitle: { fontSize: 18, fontWeight: '900', color: '#F4E7CF', marginTop: 10 },
    frameArtist: { fontSize: 13, color: '#CDB892', marginTop: 2, fontWeight: '600' },
    doneBadge: { position: 'absolute', top: -10, right: -10, width: 30, height: 30, borderRadius: 15, backgroundColor: '#6A8F5B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: WALL },

    body: { flex: 1 },
    bodyRow: { flexDirection: 'row', alignItems: 'stretch' },
    stage: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, borderRadius: 14, backgroundColor: '#1E1711' },
    paintingWrap: { borderWidth: 6, borderRadius: 2, overflow: 'hidden', backgroundColor: '#000' },

    bottom: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 16 : 26, alignItems: 'center', gap: 10 },
    bottomSide: { justifyContent: 'center', paddingHorizontal: 10, paddingTop: 0, paddingBottom: 12 },
    subtitleSide: { minHeight: 0, paddingVertical: 10, paddingHorizontal: 12 },
    subtitleTextSide: { fontSize: 16, lineHeight: 22 },
    subtitle: { width: '100%', maxWidth: 760, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, minHeight: 74, justifyContent: 'center' },
    subtitleText: { color: '#FFF8EA', fontSize: 19, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
    artistCard: { alignItems: 'center', backgroundColor: '#3C2F23', borderRadius: 14, borderWidth: 1, borderColor: '#6B5538', paddingVertical: 8, paddingHorizontal: 16 },
    artistName: { fontSize: 16, fontWeight: '900', color: '#F4E7CF' },
    artistMeta: { fontSize: 12, color: '#CDB892', fontWeight: '600', marginTop: 2, textAlign: 'center' },
    tapHint: { color: '#FFD27A', fontSize: 15, fontWeight: '800', textAlign: 'center' },
    dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5B4A35' },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' },
    roundBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#6B5538', alignItems: 'center', justifyContent: 'center' },
    mainBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#B5742F' },
    disabled: { opacity: 0.35 },
    bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#B5742F', borderRadius: 26, paddingVertical: 14, paddingHorizontal: 24 },
    bigBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
