import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import ScrollIfNeeded from './ScrollIfNeeded';
import GameExitButton from './GameExitButton';
import { speak, stopSpeech } from '../services/speechService';
import { Flag, FLAGS, FlagSpec } from './WorldFlag';
import ListenButton from './ListenButton';

// Bayrak Boya — çizim/sanat + kültür. Referans bayrağa bakarak boş şeritleri
// doğru renklerle boya. Montessori: referans görünür (kontrollü hata), ceza yok,
// çocuk istediği gibi yeniden boyayabilir. Maarif: TAEOB.6 (yazma öncesi/boyama)
// + kültürel farkındalık. Yalnızca şerit tipi bayraklar (dikey/yatay).

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
}

type StripeFlag = Extract<FlagSpec, { render: 'v' | 'h' }>;
export const STRIPE_FLAGS = FLAGS.filter((f): f is StripeFlag => f.render === 'v' || f.render === 'h');
const ROUNDS = 6;
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
export const EXTRA_COLORS = ['#000000', '#ffffff', '#0055A4', '#EF4135', '#FCD116', '#009246', '#7E57C2', '#FF9800'];

// Boyama başarısı BİREBİR hex eşitliğiyle ölçülür (fills[i] === spec.colors[i]). Palete katılan ek renk
// bayrağın kendi renginin neredeyse aynısıysa (#009246 / İtalya #008C45, #EF4135 / Avusturya #ED2939)
// çocuk "doğru" rengi seçip bayrağı bitiremez, üstelik hata sayılırdı. Yakın tonu "aynı say" yolu
// kırmızı/turuncu gibi gerçekten yanlış renkleri doğru sayma riski taşır; bu yüzden ek renkler
// bayrak renklerinden gözle AYIRT EDİLİR uzaklıkta seçilir ve eşitlik birebir kalır.
// Uzaklık CIE Lab ΔE76 (algısal): 45 ve üstü "açıkça başka renk". 45'te mevcut 19 çizgili bayrağın hepsinde
// havuz ihtiyaçtan en az 1 renk fazla kalıyor (ölçüm: lib/icerikDuzeltmeleriB.test.ts).
export const MIN_EXTRA_DISTANCE = 45;

const hexToRgb = (hex: string): [number, number, number] => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

// sRGB -> CIE Lab (D65). Küçük ve bağımlılıksız; yalnız renk uzaklığı için.
const hexToLab = (hex: string): [number, number, number] => {
    const [r, g, b] = hexToRgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
    const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

export function colorDistance(a: string, b: string): number {
    const [l1, a1, b1] = hexToLab(a);
    const [l2, a2, b2] = hexToLab(b);
    return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const shuffle = <T,>(arr: T[], rng: () => number = Math.random): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// Palet = bayrağın kendi renkleri + ek renkler (toplam en az 5 düğme). Ek renkler yalnız bayrak
// renklerinin hepsinden MIN_EXTRA_DISTANCE kadar uzak olanlardan seçilir. Havuz yetmezse (çok renkli yeni
// bir bayrak eklenirse) palet boyutu sabit kalsın diye en uzaktan başlayarak doldurulur; birebir aynı
// renk ASLA eklenmez (aynı anahtarlı çift düğme olurdu). Sonsuz döngü yok: tek geçişli süzme + sıralama.
export function buildPalette(colors: string[], rng: () => number = Math.random): string[] {
    const uniq = Array.from(new Set(colors));
    const taken = new Set(uniq.map(c => c.toLowerCase()));
    const scored = EXTRA_COLORS
        .filter(c => !taken.has(c.toLowerCase()))
        .map(c => ({ c, d: Math.min(...uniq.map(u => colorDistance(c, u))) }));
    const far = shuffle(scored.filter(s => s.d >= MIN_EXTRA_DISTANCE), rng).map(s => s.c);
    const near = scored.filter(s => s.d < MIN_EXTRA_DISTANCE).sort((x, y) => y.d - x.d).map(s => s.c);
    const extras = [...far, ...near].slice(0, Math.max(1, 5 - uniq.length));
    return shuffle([...uniq, ...extras], rng);
}

export default function BayrakBoya({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const flags = useMemo(() => shuffle(STRIPE_FLAGS).slice(0, ROUNDS), []);

    const [round, setRound] = useState(0);
    const spec = flags[round];
    const [fills, setFills] = useState<(string | null)[]>(() => spec.colors.map(() => null));
    // Palet ve ilk seçili renk TEK paletten gelir: eskiden iki ayrı buildPalette çağrısı vardı, ilk seçili renk
    // (ek renkse) ekrandaki paletin dışında kalabiliyordu.
    const [initialPalette] = useState<string[]>(() => buildPalette(spec.colors));
    const [palette, setPalette] = useState<string[]>(initialPalette);
    const [selected, setSelected] = useState<string>(initialPalette[0]);
    const [solved, setSolved] = useState(false);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const bump = useRef(new Animated.Value(1)).current;

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); stopSpeech(); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const setupRound = (r: number) => {
        const s = flags[r];
        const pal = buildPalette(s.colors);
        setFills(s.colors.map(() => null));
        setPalette(pal);
        setSelected(pal[0]);
        setSolved(false);
        lockRef.current = false;
    };

    const paintZone = (i: number) => {
        if (lockRef.current) return;
        movesRef.current += 1;
        // yanlış renk (hedefle uymuyorsa) nazik hata sayımı — ama serbestçe düzeltilebilir
        if (selected !== spec.colors[i]) errorsRef.current += 1;

        const next = [...fills];
        next[i] = selected;
        setFills(next);

        if (next.every((c, idx) => c === spec.colors[idx])) {
            lockRef.current = true;
            setSolved(true);
            speak('Harika!');
            Animated.sequence([
                Animated.timing(bump, { toValue: 1.12, duration: 160, useNativeDriver: true }),
                Animated.timing(bump, { toValue: 1, duration: 160, useNativeDriver: true }),
            ]).start();
            startTimer(setTimeout(() => {
                if (round >= ROUNDS - 1) {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('bayrak-boya', duration, movesRef.current, errorsRef.current, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi: 'TAEOB.6 Boyama + kültürel farkındalık (bayraklar)',
                    });
                } else {
                    const nr = round + 1;
                    setRound(nr);
                    setupRound(nr);
                }
            }, 1300));
        }
    };

    const zoneW = 240, zoneH = 160;

    return (
        <DynamicBackground>
            <ScrollIfNeeded contentStyle={styles.container}>
                <View style={styles.header}>
                    <GameExitButton onPress={onExit ?? (() => {})} style={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }} />
                    <Text style={styles.title}>🎨 Bayrak Boya</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{round + 1}/{ROUNDS}</Text>
                    </View>
                </View>

                {/* Referans */}
                <View style={styles.refRow}>
                    <Text style={styles.refLabel}>Örnek:</Text>
                    <Flag spec={spec} w={64} />
                    <Text style={styles.refName}>{spec.name}</Text>
                </View>

                <ListenButton onPress={() => speak('Örnek bayrağa bak, renkleri seçip şeritleri doğru boya! Acele yok.', { instructions: HAPPY_VOICE })} color="#00796B" style={{ marginTop: 4, marginBottom: 16 }} />

                {/* Boyanacak boş bayrak */}
                <Animated.View style={[styles.canvas, { width: zoneW, height: zoneH, flexDirection: spec.render === 'v' ? 'row' : 'column', transform: [{ scale: bump }] }]}>
                    {spec.colors.map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.zone, { flex: 1, backgroundColor: fills[i] || '#ECEFF1' }]}
                            onPress={() => paintZone(i)}
                            activeOpacity={0.8}
                            disabled={solved}
                        >
                            {!fills[i] && <Text style={styles.zoneQ}>?</Text>}
                        </TouchableOpacity>
                    ))}
                </Animated.View>

                {solved && <Text style={styles.solvedText}>Harika! {spec.name} bayrağı hazır 🎉</Text>}

                {/* Renk paleti */}
                <Text style={styles.paletteLabel}>Renk seç, sonra şeride dokun</Text>
                <View style={styles.palette}>
                    {palette.map((c) => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.swatch, { backgroundColor: c }, selected === c && styles.swatchSelected]}
                            onPress={() => setSelected(c)}
                            activeOpacity={0.8}
                        >
                            {selected === c && <Ionicons name="checkmark" size={20} color={c === '#ffffff' || c === '#FCD116' ? '#333' : '#fff'} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollIfNeeded>

            {!gameReady && (
                <CountdownOverlay
                    interaction="tap"
                    message="Örnek bayrağa bak, renkleri seçip şeritleri doğru boya! Acele yok."
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
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingRight: 44, paddingLeft: 52 },   // sol 52: çıkış düğmesinin altında kalmasın
    title: { fontSize: 19, fontWeight: 'bold', color: '#263238' },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    countText: { fontSize: 14, fontWeight: 'bold', color: '#00796B' },

    refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, marginBottom: 16 },
    refLabel: { fontSize: 13, color: '#607D8B', fontWeight: '700' },
    refName: { fontSize: 16, fontWeight: '800', color: '#263238' },

    canvas: {
        borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#B0BEC5', elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
    zone: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)' },
    zoneQ: { fontSize: 30, color: '#B0BEC5', fontWeight: '900' },

    solvedText: { fontSize: 16, fontWeight: '800', color: '#2E7D32', marginTop: 14, textAlign: 'center' },

    paletteLabel: { fontSize: 13, color: '#546E7A', fontWeight: '600', marginTop: 22, marginBottom: 10 },
    palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    swatch: {
        width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)',
        alignItems: 'center', justifyContent: 'center', elevation: 3,
    },
    swatchSelected: { borderWidth: 4, borderColor: '#37474F', transform: [{ scale: 1.12 }] },
});
