import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';

// KulturEslestirme — MONTESSORI genel kültürel eşleştirme (emoji öğeler).
// Hedefteki öğenin (emoji + ad) aynısını koleksiyondan bul. Puan/yarış YOK,
// kendi kendini düzeltir (yanlış nazikçe titrer), bulununca öğenin ADI görünür
// (nomenklatür). Dünya Yapıları ve Dünya Yiyecekleri bu bileşeni paylaşır.
// Maarif: SAB.2 (kültürel unsurları tanıma).

export interface KItem { id: string; emoji: string; name: string; }

export const YAPILAR: KItem[] = [
    { id: 'kule', emoji: '🗼', name: 'Kule' },
    { id: 'ozgurluk', emoji: '🗽', name: 'Özgürlük Anıtı' },
    { id: 'tori', emoji: '⛩️', name: 'Tapınak Kapısı' },
    { id: 'cami', emoji: '🕌', name: 'Cami' },
    { id: 'tapinak', emoji: '🛕', name: 'Tapınak' },
    { id: 'moai', emoji: '🗿', name: 'Taş Heykel' },
    { id: 'sato', emoji: '🏰', name: 'Şato' },
    { id: 'dolap', emoji: '🎡', name: 'Dönme Dolap' },
    { id: 'kopru', emoji: '🌉', name: 'Köprü' },
    { id: 'antik', emoji: '🏛️', name: 'Antik Yapı' },
    { id: 'cesme', emoji: '⛲', name: 'Çeşme' },
    { id: 'sinagog', emoji: '🕍', name: 'Sinagog' },
    { id: 'japonsato', emoji: '🏯', name: 'Japon Şatosu' },
    { id: 'kilise', emoji: '⛪', name: 'Kilise' },
    { id: 'stadyum', emoji: '🏟️', name: 'Stadyum' },
    { id: 'atlikarinca', emoji: '🎠', name: 'Atlıkarınca' },
    { id: 'kulube', emoji: '🛖', name: 'Kulübe' },
    { id: 'gokdelen', emoji: '🏙️', name: 'Gökdelenler' },
];

export const YIYECEKLER: KItem[] = [
    { id: 'susi', emoji: '🍣', name: 'Suşi' },
    { id: 'taco', emoji: '🌮', name: 'Taco' },
    { id: 'kruvasan', emoji: '🥐', name: 'Kruvasan' },
    { id: 'pizza', emoji: '🍕', name: 'Pizza' },
    { id: 'manti', emoji: '🥟', name: 'Mantı' },
    { id: 'eriste', emoji: '🍜', name: 'Erişte' },
    { id: 'guvec', emoji: '🥘', name: 'Güveç' },
    { id: 'kofte', emoji: '🧆', name: 'Köfte' },
    { id: 'baget', emoji: '🥖', name: 'Baget' },
    { id: 'corba', emoji: '🍲', name: 'Çorba' },
    { id: 'simit', emoji: '🥯', name: 'Simit' },
    { id: 'pasta', emoji: '🍰', name: 'Pasta' },
    { id: 'kori', emoji: '🍛', name: 'Köri' },
    { id: 'durum', emoji: '🥙', name: 'Dürüm' },
    { id: 'waffle', emoji: '🧇', name: 'Waffle' },
    { id: 'onigiri', emoji: '🍙', name: 'Onigiri' },
    { id: 'krep', emoji: '🥞', name: 'Krep' },
    { id: 'fondu', emoji: '🫕', name: 'Fondü' },
];

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
        algilananKelime?: string,
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string },
    ) => void;
    onExit?: () => void;
    childName?: string;
    items: KItem[];
    oyunAdi: string;
    title: string;
    kazanimOdagi: string;
    introMessage: string;
    doneText: string;
}

const BOARD_SIZE = 8;

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export default function KulturEslestirme({ onGameEnd, onExit, childName = 'Küçük Kaşif', items, oyunAdi, title, kazanimOdagi, introMessage, doneText }: Props) {
    const board = useMemo(() => shuffle(items).slice(0, Math.min(BOARD_SIZE, items.length)), [items]);
    const targetOrder = useMemo(() => shuffle(board.map((_, i) => i)), [board]);

    const [found, setFound] = useState<Set<string>>(new Set());
    const [wrongId, setWrongId] = useState<string | null>(null);
    const [justFound, setJustFound] = useState<string | null>(null);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const shakeMap = useRef<Record<string, Animated.Value>>({});

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };
    const shakeFor = (id: string) => {
        if (!shakeMap.current[id]) shakeMap.current[id] = new Animated.Value(0);
        return shakeMap.current[id];
    };

    const targetIndex = targetOrder.find(i => !found.has(board[i].id));
    const target = targetIndex !== undefined ? board[targetIndex] : null;
    const allDone = target === null;

    const handleTap = (id: string) => {
        if (lockRef.current || allDone || !target) return;
        if (found.has(id)) return;
        movesRef.current += 1;

        if (id === target.id) {
            const nf = new Set(found); nf.add(id);
            setFound(nf);
            setJustFound(id);
            startTimer(setTimeout(() => setJustFound(null), 900));

            if (nf.size === board.length) {
                lockRef.current = true;
                startTimer(setTimeout(() => {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd(oyunAdi, duration, movesRef.current, errorsRef.current, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi,
                    });
                }, 1500));
            }
        } else {
            errorsRef.current += 1;
            setWrongId(id);
            const sh = shakeFor(id);
            Animated.sequence([
                Animated.timing(sh, { toValue: 7, duration: 55, useNativeDriver: true }),
                Animated.timing(sh, { toValue: -7, duration: 55, useNativeDriver: true }),
                Animated.timing(sh, { toValue: 0, duration: 55, useNativeDriver: true }),
            ]).start();
            startTimer(setTimeout(() => setWrongId(null), 500));
        }
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#37474F" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{found.size}/{board.length}</Text>
                    </View>
                </View>

                {target && !allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.targetLabel}>Bunun aynısını bul</Text>
                        <Text style={styles.targetEmoji}>{target.emoji}</Text>
                        <Text style={styles.targetName}>{target.name}</Text>
                    </View>
                )}
                {allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.targetEmoji}>🌍✨</Text>
                        <Text style={styles.doneText}>{doneText}</Text>
                    </View>
                )}

                <View style={styles.grid}>
                    {board.map((item) => {
                        const isFound = found.has(item.id);
                        const isJust = justFound === item.id;
                        const isWrong = wrongId === item.id;
                        return (
                            <Animated.View key={item.id} style={{ transform: [{ translateX: shakeFor(item.id) }] }}>
                                <TouchableOpacity
                                    style={[styles.slot, isFound && styles.slotFound, isJust && styles.slotJust, isWrong && styles.slotWrong]}
                                    onPress={() => handleTap(item.id)}
                                    activeOpacity={0.9}
                                    disabled={isFound || allDone}
                                >
                                    <Text style={styles.slotEmoji}>{item.emoji}</Text>
                                    {isFound
                                        ? <Text style={styles.slotName}>{item.name}</Text>
                                        : <Text style={styles.slotNamePlaceholder}> </Text>}
                                    {isFound && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>

                <Text style={styles.hint}>
                    {allDone ? 'Dünyayı keşfettin! 🌏' : 'Yukarıdakinin aynısına dokun — acele yok'}
                </Text>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="tap"
                    message={introMessage}
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => { startTimeRef.current = Date.now(); setGameReady(true); }}
                />
            )}
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, alignItems: 'center' },
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    exitBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    title: { fontSize: 19, fontWeight: 'bold', color: '#263238' },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    countText: { fontSize: 14, fontWeight: 'bold', color: '#00796B' },

    targetCard: {
        alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 24,
        marginBottom: 18, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    targetLabel: { fontSize: 12, color: '#78909C', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
    targetEmoji: { fontSize: 72 },
    targetName: { fontSize: 20, fontWeight: '800', color: '#263238', marginTop: 6 },
    doneText: { fontSize: 17, fontWeight: '800', color: '#2E7D32', marginTop: 8, textAlign: 'center' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 520 },
    slot: {
        width: 96, height: 96, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderColor: '#E0E0E0',
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    slotFound: { borderColor: '#66BB6A', backgroundColor: '#F1F8E9' },
    slotJust: { borderColor: '#43A047', backgroundColor: '#E8F5E9' },
    slotWrong: { borderColor: '#EF9A9A' },
    slotEmoji: { fontSize: 42 },
    slotName: { fontSize: 11, fontWeight: '700', color: '#33691E', marginTop: 4, textAlign: 'center' },
    slotNamePlaceholder: { fontSize: 11, marginTop: 4 },
    check: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center', elevation: 3 },
    checkText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    hint: { fontSize: 14, color: '#455A64', marginTop: 20, fontWeight: '600', textAlign: 'center' },
});
