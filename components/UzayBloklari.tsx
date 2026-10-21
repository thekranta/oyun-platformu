import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    GestureResponderEvent,
    ImageBackground,
    LayoutChangeEvent,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedbackService } from '../services/FeedbackService';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import { useSound } from './SoundContext';
import { asset } from '../lib/assetMap';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import {
    MAX_DIFFICULTY,
    bounds,
    buildOccupancy,
    computeLayout,
    generateLevel,
    hint as findHint,
    isDeadEnd,
    maxDim,
    rotateBy,
    snapPlacement,
    startDifficultyForAge,
    turnsBetween,
    type Cell,
    type Level,
    type Piece,
    type Placement,
} from '../lib/uzayBloklari';
import { COMPLETE_TEXT, DEAD_END_TEXT, HOW_TO_TEXT, INTRO_TEXT, WIN_TEXT } from '../constants/uzayBloklari';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';

// Uzay Blokları: Yıldız Mimarı — Matematik/MAB.2 (parça-bütün ilişkisi), uzamsal düşünme.
// Oyun mantığı lib/uzayBloklari.ts'te (poliomino parçalar, döndürme, çözülebilir tahta üretimi, çıkmaz
// algılama, ipucu, mıknatıslı yerleştirme, ekran düzeni), seslendirilen metinler constants/uzayBloklari.ts'te.
// Bu dosya yalnız görünüm ve etkileşimdir. Oyun_Test_Listesi #30 ("tetris gibi oynanmıyor, boşluk var ama
// yerleştirmiyor, çıkış butonu saatle çakışıyor, alttaki parçalar sürüklenmiyor") düzeltmeleri:
//  - parçalar sürükle-bırakla yerleşir, dokununca 90° döner (eski "Alanı Döndür" yalnız tahtayı çeviriyordu);
//  - yerleştirme mıknatıslı; sürüklenen parça parmağın ÜSTÜNDE ve tahtayla aynı boyda görünür;
//  - üç tahta, kademeli ve HER ZAMAN çözülebilir; çıkmaz (kalan parçalar sığmıyor) fark edilip yumuşakça söylenir;
//  - geri sayım ve çocuğa gösterilen Puan yok; yazısız ikon düğmeleri (geri al, ipucu, baştan);
//  - kaydırma yok (ScrollView iOS'ta sürüklemeyi çalıyordu): tek ekrana sığar; tek bir sürükleme yöneticisi var.

const BACKGROUND_IMAGE = asset('/backgrounds/games/uzay_bg.webp');
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const { height: screenH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
// Dokunmatikte parça parmağın altında kalıp görünmesin diye bu kadar yukarıda sürüklenir; fare imleciyle gerekmez.
const hasTouch = !isWeb || (typeof navigator !== 'undefined' && (navigator as any).maxTouchPoints > 0);
// Mobil tarayıcıda 100vh araç çubukları açıkken bile "büyük" görüntü alanıdır: alttaki düğme çubuğu tarayıcı çubuğunun
// altında kalabilir. Destekleniyorsa 100dvh (dinamik görüntü alanı) kullanılır.
const WEB_FULL_HEIGHT =
    typeof CSS !== 'undefined' && (CSS as any).supports?.('height', '100dvh') ? '100dvh' : '100vh';
const LIFT = hasTouch ? 56 : 0;
const DRAG_THRESHOLD = 8;
const BOARDS_PER_GAME = 3;
const IDLE_HINT_MS = 15000;
const MAX_LOGGED_MOVES = 120;
// Her tahtanın sonunda değerlendirilir (3 tahtalık oyunda kolaylaştırma/zorlaştırma hissedilsin).
const ADAPTIVE = { minDifficulty: 1, maxDifficulty: MAX_DIFFICULTY, checkpointEvery: 1, raiseThreshold: 0.8, lowerThreshold: 0.5 };

const PIECE_COLORS = ['#39FF14', '#BF40BF', '#FFE600', '#00E5FF', '#FF69B4', '#FF9F1C'];

// Sabit (render başına değişmeyen) yıldız alanı: eskiden her render'da Math.random ile yeniden dağılıp titriyordu.
const STARS = Array.from({ length: 30 }, (_, i) => ({
    top: `${(i * 37 + 11) % 100}%`,
    left: `${(i * 61 + 13) % 100}%`,
    low: 0.2 + (i % 5) * 0.1,
    high: 0.5 + (i % 3) * 0.1,
}));

interface UzayBloklariProps {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        hamle: number,
        hata: number,
        cizimVerisi?: any,
        ekstraVeri?: any
    ) => void;
    onExit: () => void;
    childName?: string;
    childAge?: number;
}

interface DragInfo {
    pieceId: number;
    source: 'tray' | 'board';
    cells: Cell[];
}

interface Snap {
    row: number;
    col: number;
    valid: boolean;
}

interface Gesture extends DragInfo {
    /** Sürüklemeyi başlatan parmağın kimliği: başka bir parmak (avuç içi, baş parmak) araya girerse yok sayılır. */
    touchId: number | string | undefined;
    startX: number;
    startY: number;
    /** Sürükleyen parmağın son bilinen konumu (kök alan koordinatı). */
    lastX: number;
    lastY: number;
    dragging: boolean;
    origin: Placement | null;
    originIndex: number;
    overBoard: boolean;
    lastSnap: Snap | null;
}

interface BoardLog {
    difficulty: number;
    pieces: number;
    invalid: number;
    deadEnds: number;
    hints: number;
    ms: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function UzayBloklari({ onGameEnd, onExit, childName = 'Tuna', childAge = 48 }: UzayBloklariProps) {
    const startDifficulty = startDifficultyForAge(childAge);
    const adaptive = useAdaptiveDifficulty({ ...ADAPTIVE, startDifficulty });

    const [level, setLevel] = useState<Level>(() => generateLevel(startDifficulty));
    const [placed, setPlaced] = useState<Record<number, Placement>>({});
    const [rot, setRot] = useState<Record<number, number>>({});
    const [drag, setDrag] = useState<DragInfo | null>(null);
    const [preview, setPreview] = useState<{ row: number; col: number; valid: boolean; cells: Cell[] } | null>(null);
    const [hintPlacement, setHintPlacement] = useState<Placement | null>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [gameReady, setGameReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [boardsDone, setBoardsDone] = useState(0);
    const [rocketLaunch, setRocketLaunch] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [idleTick, setIdleTick] = useState(0);

    // Durumun ref aynaları: sürükleme yöneticisi bir kez kurulur, her zaman güncel değeri bunlardan okur.
    const levelRef = useRef(level);
    const placedRef = useRef<Record<number, Placement>>({});
    const rotRef = useRef<Record<number, number>>({});
    const orderRef = useRef<number[]>([]);
    const gestureRef = useRef<Gesture | null>(null);
    const previewRef = useRef<string>('');
    const rootRef = useRef<any>(null);
    const rootRectRef = useRef({ x: 0, y: 0 });
    const busyRef = useRef(false);
    const readyRef = useRef(false);
    const returningRef = useRef(false);
    const completingRef = useRef(false);
    const mountedRef = useRef(true);
    const finishedRef = useRef(false);
    // Üç tahta bitti, kutlama ve 'Tebrikler!' sürüyor: bu sırada çıkılırsa oyun yine de kaydedilir.
    const finalPendingRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Sayaçlar (render dışı; kayıt ve tek seferlik sesler için)
    const startTimeRef = useRef(Date.now());
    const lastActionRef = useRef(Date.now());
    const boardStartRef = useRef(Date.now());
    const boardNoRef = useRef(0);
    const placementsRef = useRef(0);
    const invalidRef = useRef(0);
    const rotationsRef = useRef(0);
    const undoRef = useRef(0);
    const hintRef = useRef(0);
    const restartRef = useRef(0);
    const deadEndRef = useRef(0);
    const boardInvalidRef = useRef(0);
    const boardDeadEndsRef = useRef(0);
    const boardHintsRef = useRef(0);
    const spokeDeadEndRef = useRef(false);
    const responseTimesRef = useRef<number[]>([]);
    const boardsLogRef = useRef<BoardLog[]>([]);
    const movesLogRef = useRef<{ b: number; s: string; r: number; c: number; ok: boolean }[]>([]);

    // Animasyonlar
    const glowAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const rocketAnim = useRef(new Animated.Value(0)).current;
    const starAnim = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0.5)).current;
    // Her parçanın / yıldızın KENDİ animasyon değeri: tek ortak değer, yerel sürücüde bir önceki parçayı/yıldızı
    // bir iki kare küçültüp titretebiliyordu (setValue React yeniden hedeflemeden önce uygulanır).
    const popAnims = useRef<Record<number, Animated.Value>>({});
    const starPops = useRef(Array.from({ length: BOARDS_PER_GAME }, () => new Animated.Value(1))).current;
    const undoPulse = useRef(new Animated.Value(1)).current;
    const boardFade = useRef(new Animated.Value(1)).current;
    const ghostPos = useRef(new Animated.ValueXY({ x: -1000, y: -1000 })).current;
    const rotAnims = useRef<Record<number, Animated.Value>>({});

    // Ses efektleri SoundContext'ten: FeedbackService'in sesleri yalnız web'de çalıyordu (iOS/Android sessizdi).
    const { playSound } = useSound();

    const schedule = (fn: () => void, ms: number) => {
        const t = setTimeout(() => { if (mountedRef.current) fn(); }, ms);
        timersRef.current.push(t);
    };

    // ---- Düzen ----
    const layout = useMemo(
        () => (size.w > 0 && size.h > 0
            ? computeLayout(size.w, size.h, level.board, level.pieces.map((p) => maxDim(p.shapeId)))
            : null),
        [size, level],
    );
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    const occ = useMemo(() => buildOccupancy(level.board, placed), [level, placed]);
    const remaining = useMemo(() => level.pieces.filter((p) => !placed[p.id]), [level, placed]);
    // Kalan parçalar artık sığmıyorsa (tahtada boşluk olsa da) çıkmaz: geri al düğmesi nabız atar.
    const deadEnd = useMemo(
        () => !drag && remaining.length > 0 && Object.keys(placed).length > 0 && isDeadEnd(level.board, occ, remaining),
        [drag, remaining, placed, level, occ],
    );

    // ---- Durum yardımcıları ----
    const commitPlaced = (next: Record<number, Placement>) => { placedRef.current = next; setPlaced(next); };
    const commitRot = (next: Record<number, number>) => { rotRef.current = next; setRot(next); };
    const markInteraction = () => setIdleTick((n) => n + 1);
    const pieceById = (id: number): Piece => levelRef.current.pieces.find((p) => p.id === id)!;
    const cellsOf = (piece: Piece): Cell[] => rotateBy(piece.cells, rotRef.current[piece.id] ?? 0);
    const occWithout = (omitId: number) => {
        const rest = { ...placedRef.current };
        delete rest[omitId];
        return buildOccupancy(levelRef.current.board, rest);
    };
    const rotAnimOf = (id: number) => (rotAnims.current[id] ??= new Animated.Value(0));
    const popAnimOf = (id: number) => (popAnims.current[id] ??= new Animated.Value(1));
    const spinPiece = (id: number) => {
        const v = rotAnimOf(id);
        v.setValue(-90);
        Animated.timing(v, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    };
    const logMove = (shapeId: string, row: number, col: number, ok: boolean) => {
        if (movesLogRef.current.length < MAX_LOGGED_MOVES) {
            movesLogRef.current.push({ b: boardNoRef.current + 1, s: shapeId, r: row, c: col, ok });
        }
    };

    // ---- Başlangıç / temizlik ----
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(starAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(starAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [starAnim]);

    // İpucu halkası yanıp söner
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.45, duration: 500, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    // Çıkmazda geri al düğmesi nabız atar ("buraya dokun" demenin yazısız yolu)
    useEffect(() => {
        if (!deadEnd) { undoPulse.setValue(1); return; }
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(undoPulse, { toValue: 1.18, duration: 450, useNativeDriver: true }),
            Animated.timing(undoPulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [deadEnd, undoPulse]);

    useEffect(() => {
        // Fast Refresh (geliştirme) efekti yeniden çalıştırır: bayrak yeniden kurulmazsa zamanlayıcılar ve
        // sonraki tahtaya geçiş sessizce işlevsiz kalırdı.
        mountedRef.current = true;
        const timers = timersRef.current; // aynı dizi (yalnız push edilir): sonradan eklenenler de temizlenir
        return () => {
            mountedRef.current = false;
            timers.forEach(clearTimeout);
            stopSpeech();
        };
    }, []);

    // Geri sayım bitince oyun başlar: süre BURADAN sayılır; nasıl oynandığı bir kez sesle anlatılır.
    const handleReady = () => {
        if (readyRef.current) return; // geri sayım hem süre bitince hem dokunuşla bitirilebilir: yönerge bir kez çalar
        const now = Date.now();
        startTimeRef.current = now;
        boardStartRef.current = now;
        lastActionRef.current = now;
        readyRef.current = true;
        setGameReady(true);
        speak(HOW_TO_TEXT, { instructions: HAPPY_VOICE });
    };

    // ---- Kök alanın ekrandaki konumu (sürükleme koordinatları için) ----
    const syncRootRect = () => {
        const node = rootRef.current;
        if (!node) return;
        if (isWeb && typeof node.getBoundingClientRect === 'function') {
            // Web'de eşzamanlı ve her sürüklemede güncel okunur (pageX/pageY kaydırmayı da içerir).
            const r = node.getBoundingClientRect();
            rootRectRef.current = { x: r.left + (window.scrollX || 0), y: r.top + (window.scrollY || 0) };
            return;
        }
        node.measure?.((_x: number, _y: number, _w: number, _h: number, pageX: number, pageY: number) => {
            if (Number.isFinite(pageX) && Number.isFinite(pageY)) rootRectRef.current = { x: pageX, y: pageY };
        });
    };
    const handleRootLayout = (e: LayoutChangeEvent) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
        syncRootRect();
        // Ana yerleşim oturduktan sonra yeniden ölç (üst başlık/güvenli alan sonradan değişebilir).
        schedule(syncRootRect, 80);
        schedule(syncRootRect, 500);
    };

    const toRoot = (e: GestureResponderEvent) => ({
        x: e.nativeEvent.pageX - rootRectRef.current.x,
        y: e.nativeEvent.pageY - rootRectRef.current.y,
    });

    // ---- Vuruş testi: dokunulan parça (tepsiden ya da tahtadan) ----
    const hitPiece = (x: number, y: number): { pieceId: number; source: 'tray' | 'board'; placement?: Placement } | null => {
        const lay = layoutRef.current;
        if (!lay) return null;
        const b = lay.board;
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
            const col = Math.floor((x - b.x) / lay.cell);
            const row = Math.floor((y - b.y) / lay.cell);
            for (const p of Object.values(placedRef.current)) {
                if (p.cells.some(([r, c]) => p.row + r === row && p.col + c === col)) {
                    return { pieceId: p.pieceId, source: 'board', placement: p };
                }
            }
            return null;
        }
        const pieces = levelRef.current.pieces;
        const SLOP = 6; // parmak için yuvayı biraz büyüt
        for (let i = 0; i < pieces.length; i++) {
            if (placedRef.current[pieces[i].id]) continue;
            const s = lay.slots[i];
            if (s && x >= s.x - SLOP && x < s.x + s.w + SLOP && y >= s.y - SLOP && y < s.y + s.h + SLOP) {
                return { pieceId: pieces[i].id, source: 'tray' };
            }
        }
        return null;
    };

    const setPreviewIfChanged = (next: { row: number; col: number; valid: boolean; cells: Cell[] } | null) => {
        const key = next ? `${next.row},${next.col},${next.valid}` : '';
        if (key === previewRef.current) return;
        previewRef.current = key;
        setPreview(next);
    };

    // ---- Dönme ----
    const rotatePiece = (id: number) => {
        markInteraction();
        setHintPlacement(null);
        rotationsRef.current += 1;
        commitRot({ ...rotRef.current, [id]: ((rotRef.current[id] ?? 0) + 1) % 4 });
        spinPiece(id);
        lastActionRef.current = Date.now();
    };

    // ---- Sürükleme ----
    const beginDrag = (g: Gesture) => {
        g.dragging = true;
        markInteraction();
        setHintPlacement(null);
        if (g.source === 'board' && g.origin) {
            // Tahtadaki parça yakalandı: tahtadan alınır, sürüklenirken tepsiye benzer yönelimini korur.
            g.originIndex = orderRef.current.indexOf(g.pieceId);
            const rest = { ...placedRef.current };
            delete rest[g.pieceId];
            commitPlaced(rest);
            orderRef.current = orderRef.current.filter((id) => id !== g.pieceId);
            const k = turnsBetween(pieceById(g.pieceId).cells, g.origin.cells);
            if (k >= 0) commitRot({ ...rotRef.current, [g.pieceId]: k });
        }
        setDrag({ pieceId: g.pieceId, source: g.source, cells: g.cells });
    };

    const updateDrag = (g: Gesture, x: number, y: number) => {
        const lay = layoutRef.current;
        if (!lay) return;
        const { rows, cols } = bounds(g.cells);
        const cx = x;
        const cy = y - LIFT;
        const left = cx - (cols * lay.cell) / 2;
        const top = cy - (rows * lay.cell) / 2;
        ghostPos.setValue({ x: left, y: top });
        const b = lay.board;
        const over = cx > b.x - lay.cell && cx < b.x + b.w + lay.cell && cy > b.y - lay.cell && cy < b.y + b.h + lay.cell;
        g.overBoard = over;
        if (!over) {
            g.lastSnap = null;
            setPreviewIfChanged(null);
            return;
        }
        const snap = snapPlacement(levelRef.current.board, occWithout(g.pieceId), g.cells, (left - b.x) / lay.cell, (top - b.y) / lay.cell);
        g.lastSnap = snap;
        setPreviewIfChanged({ row: snap.row, col: snap.col, valid: snap.valid, cells: g.cells });
    };

    // Hayalet parçayı bir yere uçurup sonra kaldırır (geçersiz bırakışta yumuşak geri dönüş).
    const returnGhost = (left: number, top: number, after?: () => void) => {
        returningRef.current = true;
        Animated.timing(ghostPos, { toValue: { x: left, y: top }, duration: 180, useNativeDriver: false }).start(() => {
            returningRef.current = false;
            setDrag(null);
            after?.();
        });
    };
    const slotTarget = (g: Gesture) => {
        const lay = layoutRef.current;
        const idx = levelRef.current.pieces.findIndex((p) => p.id === g.pieceId);
        const s = lay?.slots[idx];
        if (!lay || !s) return { left: -1000, top: -1000 };
        const { rows, cols } = bounds(g.cells);
        return { left: s.x + s.w / 2 - (cols * lay.cell) / 2, top: s.y + s.h / 2 - (rows * lay.cell) / 2 };
    };

    const onDeadEnd = () => {
        deadEndRef.current += 1;
        boardDeadEndsRef.current += 1;
        FeedbackService.animateError({ shake: shakeAnim });
        if (!spokeDeadEndRef.current) {
            spokeDeadEndRef.current = true;
            speak(DEAD_END_TEXT, { instructions: HAPPY_VOICE });
        }
    };

    const placePiece = (pieceId: number, cells: Cell[], row: number, col: number) => {
        const piece = pieceById(pieceId);
        const lv = levelRef.current;
        const placement: Placement = { pieceId, shapeId: piece.shapeId, cells, row, col };
        const next = { ...placedRef.current, [pieceId]: placement };
        commitPlaced(next);
        orderRef.current = [...orderRef.current.filter((id) => id !== pieceId), pieceId];
        placementsRef.current += 1;
        const now = Date.now();
        responseTimesRef.current.push(now - lastActionRef.current);
        lastActionRef.current = now;
        logMove(piece.shapeId, row, col, true);
        markInteraction();
        FeedbackService.playSuccess({ intensity: 'light' });
        playSound('correct').catch(() => { });
        const pop = popAnimOf(pieceId);
        pop.setValue(0.6);
        Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();

        if (Object.keys(next).length === lv.pieces.length) {
            handleBoardComplete();
            return;
        }
        const rest = lv.pieces.filter((p) => !next[p.id]);
        if (isDeadEnd(lv.board, buildOccupancy(lv.board, next), rest)) onDeadEnd();
    };

    const endDrag = (g: Gesture) => {
        setPreviewIfChanged(null);
        const snap = g.lastSnap;
        if (snap?.valid) {
            setDrag(null);
            placePiece(g.pieceId, g.cells, snap.row, snap.col);
            return;
        }
        const piece = pieceById(g.pieceId);
        if (g.overBoard) {
            // Tahta üzerinde sığmayan bırakış: hata sayılır, parça yumuşakça yerine döner.
            invalidRef.current += 1;
            boardInvalidRef.current += 1;
            logMove(piece.shapeId, snap?.row ?? -1, snap?.col ?? -1, false);
            FeedbackService.playError({ sound: false });
            playSound('wrong').catch(() => { });
            FeedbackService.animateError({ shake: shakeAnim });
            const lay = layoutRef.current;
            if (g.source === 'board' && g.origin && lay) {
                // Tahtadan alınan parça sığmayan yere bırakıldı: eski yerine döner.
                const origin = g.origin;
                returnGhost(lay.board.x + origin.col * lay.cell, lay.board.y + origin.row * lay.cell, () => {
                    commitPlaced({ ...placedRef.current, [g.pieceId]: origin });
                    const order = [...orderRef.current];
                    order.splice(Math.max(0, g.originIndex), 0, g.pieceId);
                    orderRef.current = order;
                });
                return;
            }
            const t = slotTarget(g);
            returnGhost(t.left, t.top);
            return;
        }
        // Tahtanın dışına bırakıldı: parça tepsiye döner (tahtadan sürüklendiyse tahtadan alınmış olur).
        const t = slotTarget(g);
        returnGhost(t.left, t.top);
    };

    const cancelDrag = (g: Gesture) => {
        setPreviewIfChanged(null);
        if (g.source === 'board' && g.origin) {
            commitPlaced({ ...placedRef.current, [g.pieceId]: g.origin });
            const order = [...orderRef.current];
            order.splice(Math.max(0, g.originIndex), 0, g.pieceId);
            orderRef.current = order;
        }
        setDrag(null);
    };

    // Parmak kalktığında hareketi bitirir: kısa dokunuş = döndür, sürükleme = bırak.
    const finishGesture = (g: Gesture, x: number, y: number) => {
        if (!g.dragging) {
            // Kısa dokunuş: tepsideki parça döner (tahtadaki parçaya dokunmak bir şey yapmaz).
            if (g.source === 'tray') rotatePiece(g.pieceId);
            return;
        }
        updateDrag(g, x, y);
        endDrag(g);
    };
    // Aynı hareketin parmağı mı? Kimlik yoksa (bazı ortamlarda) hepsi aynı sayılır.
    const sameTouch = (g: Gesture, e: GestureResponderEvent) => {
        const id = (e.nativeEvent as any).identifier;
        return g.touchId == null || id == null || id === g.touchId;
    };

    // Tek sürükleme yöneticisi: işleyiciler her render'da yenilenen H.current üzerinden çalışır (bayat closure yok).
    const H = useRef<{
        start: (e: GestureResponderEvent) => boolean;
        grant: (e: GestureResponderEvent) => void;
        move: (e: GestureResponderEvent) => void;
        end: (e: GestureResponderEvent) => void;
        release: () => void;
        terminate: () => void;
    }>(null as any);
    H.current = {
        start: (e) => {
            if (!readyRef.current || busyRef.current || returningRef.current) return false;
            syncRootRect();
            const p = toRoot(e);
            return hitPiece(p.x, p.y) !== null;
        },
        grant: (e) => {
            const p = toRoot(e);
            const hit = hitPiece(p.x, p.y);
            if (!hit) { gestureRef.current = null; return; }
            const cells = hit.source === 'board' && hit.placement ? hit.placement.cells : cellsOf(pieceById(hit.pieceId));
            gestureRef.current = {
                pieceId: hit.pieceId,
                source: hit.source,
                cells,
                touchId: (e.nativeEvent as any).identifier,
                startX: p.x,
                startY: p.y,
                lastX: p.x,
                lastY: p.y,
                dragging: false,
                origin: hit.placement ?? null,
                originIndex: -1,
                overBoard: false,
                lastSnap: null,
            };
        },
        move: (e) => {
            const g = gestureRef.current;
            // Her parmak ayrı hareket olayı üretir: sürükleyen parmak dışındakiler (dinlenen avuç içi, baş parmak) hayaleti titretmesin.
            if (!g || !sameTouch(g, e)) return;
            const p = toRoot(e);
            g.lastX = p.x;
            g.lastY = p.y;
            if (!g.dragging) {
                if (Math.hypot(p.x - g.startX, p.y - g.startY) < DRAG_THRESHOLD) return;
                beginDrag(g);
            }
            updateDrag(g, p.x, p.y);
        },
        // Sürükleyen parmak kalkınca bırakılır; başka bir parmak hâlâ ekrandaysa 'release' beklenmez
        // (o yalnız TÜM parmaklar kalkınca gelir ve konumu yanlış parmağınki olurdu).
        end: (e) => {
            const g = gestureRef.current;
            if (!g || !sameTouch(g, e)) return;
            gestureRef.current = null;
            const p = toRoot(e);
            finishGesture(g, p.x, p.y);
        },
        // Tüm parmaklar kalktı ve 'end' bu hareketi kapatmadıysa son bilinen konumla bitir.
        release: () => {
            const g = gestureRef.current;
            gestureRef.current = null;
            if (g) finishGesture(g, g.lastX, g.lastY);
        },
        terminate: () => {
            const g = gestureRef.current;
            gestureRef.current = null;
            if (g?.dragging) cancelDrag(g);
        },
    };
    const responder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: (e) => H.current.start(e),
        onMoveShouldSetPanResponder: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => H.current.grant(e),
        onPanResponderMove: (e) => H.current.move(e),
        onPanResponderEnd: (e) => H.current.end(e),
        onPanResponderRelease: () => H.current.release(),
        onPanResponderTerminate: () => H.current.terminate(),
    })).current;

    // ---- Düğmeler ----
    const showHint = (auto = false) => {
        if (busyRef.current || gestureRef.current?.dragging) return;
        const lv = levelRef.current;
        const left = lv.pieces.filter((p) => !placedRef.current[p.id]);
        const h = findHint(lv.board, buildOccupancy(lv.board, placedRef.current), left);
        if (!h) return; // çıkmazda ipucu yok: geri al düğmesi zaten nabız atıyor
        if (!auto) {
            hintRef.current += 1;
            boardHintsRef.current += 1;
        }
        // İpucundaki parça doğru yönelime çevrilir ki çocuk yalnız sürüklesin.
        const k = turnsBetween(pieceById(h.pieceId).cells, h.cells);
        if (k >= 0 && k !== (rotRef.current[h.pieceId] ?? 0)) {
            commitRot({ ...rotRef.current, [h.pieceId]: k });
            spinPiece(h.pieceId);
        }
        setHintPlacement(h);
    };
    const showHintRef = useRef(showHint);
    showHintRef.current = showHint;

    // 15 sn hareketsizlikte otomatik ipucu (sayılmaz); her dokunuşta zamanlayıcı sıfırlanır.
    useEffect(() => {
        if (!gameReady || busy || drag || hintPlacement) return;
        const t = setTimeout(() => showHintRef.current(true), IDLE_HINT_MS);
        return () => clearTimeout(t);
    }, [gameReady, busy, drag, hintPlacement, idleTick, placed]);

    const handleUndo = () => {
        if (busyRef.current || gestureRef.current?.dragging) return;
        const last = orderRef.current[orderRef.current.length - 1];
        if (last === undefined) return;
        markInteraction();
        const rest = { ...placedRef.current };
        delete rest[last];
        commitPlaced(rest);
        orderRef.current = orderRef.current.slice(0, -1);
        setHintPlacement(null);
        undoRef.current += 1;
        lastActionRef.current = Date.now();
    };

    // Baştan: AYNI tahta yeniden başlar (tepsi de ilk yönelimine döner).
    const handleRestart = () => {
        if (busyRef.current || gestureRef.current?.dragging) return;
        markInteraction();
        commitPlaced({});
        commitRot({});
        orderRef.current = [];
        setHintPlacement(null);
        restartRef.current += 1;
        lastActionRef.current = Date.now();
    };

    // ---- Tahta bitti / sıradaki tahta / oyun sonu ----
    const nextBoard = (difficulty: number) => {
        const lv = generateLevel(difficulty);
        Animated.timing(boardFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            if (!mountedRef.current) return;
            levelRef.current = lv;
            setLevel(lv);
            commitPlaced({});
            commitRot({});
            orderRef.current = [];
            setHintPlacement(null);
            setPreview(null);
            previewRef.current = '';
            setDrag(null);
            boardNoRef.current += 1;
            boardInvalidRef.current = 0;
            boardDeadEndsRef.current = 0;
            boardHintsRef.current = 0;
            spokeDeadEndRef.current = false;
            const now = Date.now();
            boardStartRef.current = now;
            lastActionRef.current = now;
            completingRef.current = false;
            busyRef.current = false;
            setBusy(false);
            Animated.timing(boardFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
        });
    };

    const finishGame = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const placements = placementsRef.current;
        const invalid = invalidRef.current;
        const boards = boardsLogRef.current;
        const pieceTotal = boards.reduce((s, b) => s + b.pieces, 0);
        const times = responseTimesRef.current;
        const avgResponse = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : 0;
        // Görsel dikkat: bırakışların kaçı tahtaya oturdu (sığmayan bırakışlar ve ipuçları düşürür).
        const accuracy = placements + invalid > 0 ? placements / (placements + invalid) : 1;
        const visualAttention = clamp(Math.round(accuracy * 100) - hintRef.current * 5, 0, 100);
        // Verimlilik: gereken parça sayısının yaptığı yerleştirme sayısına oranı (tahtadan alıp yeniden koymak düşürür).
        const efficiency = Math.round(100 * Math.min(1, pieceTotal / Math.max(1, placements)));
        onGameEnd('uzay-bloklari', duration, placements + invalid, invalid, undefined, {
            zorlukSeviyesi: boards[boards.length - 1]?.difficulty ?? startDifficulty,
            kazanimOdagi: 'Parça-Bütün İlişkisi ve Uzamsal Düşünme (MAB.2)',
            response_time: avgResponse,
            correct_answers: pieceTotal,
            cognitive_speed_score: Math.max(0, efficiency - hintRef.current * 5),
            visual_attention_score: visualAttention,
            // Nesne olarak verilir: services/gameResults.ts kaydederken JSON.stringify eder.
            round_history: {
                boards,
                placements,
                invalid_drops: invalid,
                rotations: rotationsRef.current,
                undo_count: undoRef.current,
                hint_count: hintRef.current,
                restart_count: restartRef.current,
                dead_ends: deadEndRef.current,
                difficulty_path: boards.map((b) => b.difficulty),
                moves: movesLogRef.current,
            },
        });
    };

    const handleFinal = () => {
        finalPendingRef.current = true;
        setRocketLaunch(true);
        rocketAnim.setValue(0);
        Animated.timing(rocketAnim, { toValue: -screenH, duration: 2000, useNativeDriver: true }).start(() => setShowConfetti(true));
        if (Platform.OS !== 'web') Vibration.vibrate([0, 100, 100, 200, 100, 300]);
        const finish = async () => {
            await speakThenWait(WIN_TEXT, 2800, { instructions: HAPPY_VOICE }).catch(() => undefined);
            if (!mountedRef.current) return;
            finishGame();
        };
        finish();
    };

    const popStar = (index: number) => {
        const v = starPops[index];
        if (!v) return;
        v.setValue(0.4);
        Animated.spring(v, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    function handleBoardComplete() {
        if (completingRef.current) return;
        completingRef.current = true;
        busyRef.current = true;
        setBusy(true);
        setHintPlacement(null);
        const lv = levelRef.current;
        const ms = Date.now() - boardStartRef.current;
        boardsLogRef.current.push({
            difficulty: lv.difficulty,
            pieces: lv.pieces.length,
            invalid: boardInvalidRef.current,
            deadEnds: boardDeadEndsRef.current,
            hints: boardHintsRef.current,
            ms,
        });
        // Zorluk yalnız doğruluğa bakar (süre baskısı yok): geçersiz bırakış + çıkmaz + ipucu hata sayılır.
        const next = adaptive.recordLevel({
            correct: lv.pieces.length,
            total: lv.pieces.length,
            errors: boardInvalidRef.current + boardDeadEndsRef.current + boardHintsRef.current,
            timeMs: ms,
        });
        setBoardsDone((n) => n + 1);
        popStar(boardNoRef.current);
        FeedbackService.animateSuccess({ glow: glowAnim });
        if (boardNoRef.current + 1 >= BOARDS_PER_GAME) {
            handleFinal();
            return;
        }
        speak(COMPLETE_TEXT, { instructions: HAPPY_VOICE });
        schedule(() => nextBoard(next), 1900);
    }

    const handleExit = () => {
        stopSpeech();
        // Oyun tamamlandıysa (kutlama sürerken) çıkış sonucu kaybettirmesin: kayıt gönderilir, sonuç ekranına geçilir.
        if (finalPendingRef.current) {
            finishGame();
            return;
        }
        onExit();
    };

    // ---- Görünüm ----
    const cellRadius = (px: number) => Math.max(3, Math.round(px * 0.2));

    const renderCells = (cells: Cell[], cellPx: number, color: string) => {
        const { rows, cols } = bounds(cells);
        return (
            <View style={{ width: cols * cellPx, height: rows * cellPx }}>
                {cells.map(([r, c], i) => (
                    <View key={i} style={[styles.pieceCell, { left: c * cellPx, top: r * cellPx, width: cellPx, height: cellPx }]}>
                        <View style={[styles.pieceCellInner, { backgroundColor: color, borderRadius: cellRadius(cellPx) }]}>
                            <View style={styles.pieceShine} />
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderBoard = () => {
        if (!layout) return null;
        const { cell, board: b } = layout;
        const cells: React.ReactNode[] = [];
        for (let r = 0; r < level.board.rows; r++) {
            for (let c = 0; c < level.board.cols; c++) {
                if (!level.board.playable[r][c]) continue;
                const owner = occ[r][c];
                const piece = owner !== null ? level.pieces.find((p) => p.id === owner) : undefined;
                cells.push(
                    <Animated.View
                        key={`${r}-${c}`}
                        style={[
                            styles.boardCell,
                            { left: b.x + c * cell, top: b.y + r * cell, width: cell, height: cell },
                            owner !== null && { transform: [{ scale: popAnimOf(owner) }] },
                        ]}
                    >
                        {piece ? (
                            <View style={[styles.pieceCellInner, { backgroundColor: PIECE_COLORS[piece.color % PIECE_COLORS.length], borderRadius: cellRadius(cell) }]}>
                                <View style={styles.pieceShine} />
                            </View>
                        ) : (
                            <View style={[styles.emptyCell, { borderRadius: cellRadius(cell) }]} />
                        )}
                    </Animated.View>,
                );
            }
        }
        const overlay = (cellsToDraw: Cell[], row: number, col: number, style: any, key: string) =>
            cellsToDraw
                .filter(([r, c]) => row + r >= 0 && col + c >= 0 && row + r < level.board.rows && col + c < level.board.cols)
                .map(([r, c], i) => (
                    <Animated.View
                        key={`${key}-${i}`}
                        pointerEvents="none"
                        style={[
                            styles.boardCell,
                            { left: b.x + (col + c) * cell, top: b.y + (row + r) * cell, width: cell, height: cell },
                        ]}
                    >
                        <Animated.View style={[styles.overlayCell, { borderRadius: cellRadius(cell) }, style]} />
                    </Animated.View>
                ));
        return (
            <>
                <View style={[styles.boardFrame, { left: b.x - 10, top: b.y - 10, width: b.w + 20, height: b.h + 20 }]} />
                <Animated.View style={[styles.boardGlow, { left: b.x - 10, top: b.y - 10, width: b.w + 20, height: b.h + 20, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) }]} />
                {cells}
                {hintPlacement && overlay(hintPlacement.cells, hintPlacement.row, hintPlacement.col, [styles.hintCell, { opacity: pulse }], 'h')}
                {preview && overlay(preview.cells, preview.row, preview.col, preview.valid ? styles.previewValid : styles.previewInvalid, 'p')}
            </>
        );
    };

    const renderTray = () => {
        if (!layout) return null;
        return level.pieces.map((piece, i) => {
            const slot = layout.slots[i];
            if (!slot) return null;
            const isPlaced = !!placed[piece.id];
            // Tahtadan yakalanan parça da tepsideki yuvasında soluk görünür (hayaletle yan yana tam opaklık çift görünüyordu).
            const lifted = drag?.pieceId === piece.id;
            const isHint = hintPlacement?.pieceId === piece.id;
            const cells = rotateBy(piece.cells, rot[piece.id] ?? 0);
            const spin = rotAnimOf(piece.id).interpolate({ inputRange: [-90, 0], outputRange: ['-90deg', '0deg'] });
            return (
                <View key={piece.id} pointerEvents="none" style={[styles.slot, { left: slot.x, top: slot.y, width: slot.w, height: slot.h }, isHint && styles.slotHint]}>
                    {isHint && <Animated.View style={[styles.slotHintRing, { opacity: pulse }]} />}
                    {!isPlaced && (
                        <Animated.View style={[styles.slotPiece, { opacity: lifted ? 0.25 : 1, transform: [{ rotate: spin }] }]}>
                            {renderCells(cells, layout.trayCell, PIECE_COLORS[piece.color % PIECE_COLORS.length])}
                        </Animated.View>
                    )}
                    {!isPlaced && !lifted && level.difficulty >= 3 && (
                        <View style={styles.rotateBadge}>
                            <Ionicons name="refresh" size={13} color="rgba(255,255,255,0.85)" />
                        </View>
                    )}
                </View>
            );
        });
    };

    const renderGhost = () => {
        if (!drag || !layout) return null;
        const piece = pieceById(drag.pieceId);
        return (
            <Animated.View
                pointerEvents="none"
                style={[styles.ghost, { transform: [{ translateX: ghostPos.x }, { translateY: ghostPos.y }] }]}
            >
                {renderCells(drag.cells, layout.cell, PIECE_COLORS[piece.color % PIECE_COLORS.length])}
            </Animated.View>
        );
    };

    const canUndo = Object.keys(placed).length > 0 && !busy && !drag;
    const controlsOff = busy || !!drag;

    const starLayer = useMemo(() => (
        <View style={styles.starsLayer} pointerEvents="none">
            {STARS.map((s, i) => (
                <Animated.View
                    key={i}
                    style={[styles.star, { top: s.top as any, left: s.left as any, opacity: starAnim.interpolate({ inputRange: [0, 1], outputRange: [s.low, s.high] }) }]}
                />
            ))}
        </View>
    ), [starAnim]);

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.container} resizeMode="cover">
            <View style={styles.darkOverlay} />
            {!gameReady && (
                <CountdownOverlay
                    message={INTRO_TEXT}
                    childName={childName}
                    countdownSeconds={5}
                    interaction="drag"
                    onComplete={handleReady}
                />
            )}
            {starLayer}

            {/* Başlık: çıkış butonu satırın İÇİNDE ve güvenli alanın altında (iOS saatiyle ve web zamanlayıcısıyla çakışmaz) */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <GameExitButton onPress={handleExit} />
                    <View style={styles.starsRow} accessibilityLabel={`${boardsDone} yıldız`}>
                        {Array.from({ length: BOARDS_PER_GAME }, (_, i) => {
                            const lit = i < boardsDone;
                            return (
                                <Animated.View key={i} style={{ transform: [{ scale: starPops[i] }] }}>
                                    <Ionicons name={lit ? 'star' : 'star-outline'} size={30} color={lit ? '#FFD700' : 'rgba(255,255,255,0.45)'} />
                                </Animated.View>
                            );
                        })}
                    </View>
                    <ListenButton onPress={() => speak(HOW_TO_TEXT, { instructions: HAPPY_VOICE })} color="#BF40BF" />
                </View>
            </SafeAreaView>

            {/* Oyun alanı: tahta + parça tepsisi; kaydırma yok, tek sürükleme yöneticisi */}
            <View ref={rootRef} collapsable={false} style={styles.play} onLayout={handleRootLayout} {...responder.panHandlers}>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: boardFade, transform: [{ translateX: shakeAnim }] }]}>
                    {renderBoard()}
                    {renderTray()}
                    {deadEnd && layout && (
                        <View style={[styles.thinkBubble, { left: layout.board.x + layout.board.w - 26, top: Math.max(2, layout.board.y - 34) }]}>
                            <Text style={styles.thinkEmoji}>🤔</Text>
                        </View>
                    )}
                </Animated.View>
                {renderGhost()}
            </View>

            {/* Yazısız ikon düğmeleri: Geri al · İpucu · Baştan */}
            <SafeAreaView edges={['bottom']} style={styles.actionSafe}>
                <View style={styles.actionBar}>
                    <Animated.View style={{ transform: [{ scale: undoPulse }] }}>
                        <TouchableOpacity
                            style={[styles.actionBtn, deadEnd && styles.actionBtnAlert, !canUndo && styles.actionBtnOff]}
                            onPress={handleUndo}
                            disabled={!canUndo}
                            accessibilityRole="button"
                            accessibilityLabel="Geri al"
                        >
                            <Ionicons name="arrow-undo" size={28} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FFB300' }, controlsOff && styles.actionBtnOff]}
                        onPress={() => showHint(false)}
                        disabled={controlsOff}
                        accessibilityRole="button"
                        accessibilityLabel="İpucu"
                    >
                        <Text style={styles.actionEmoji}>💡</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FF7043' }, controlsOff && styles.actionBtnOff]}
                        onPress={handleRestart}
                        disabled={controlsOff}
                        accessibilityRole="button"
                        accessibilityLabel="Baştan başla"
                    >
                        <Ionicons name="refresh" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Oyun sonu: roket fırlar, konfeti, kutlama kartı ('Tebrikler!' bitince sonuç ekranına geçilir) */}
            {rocketLaunch && (
                <Animated.View pointerEvents="none" style={[styles.rocketContainer, { transform: [{ translateY: rocketAnim }] }]}>
                    <Text style={styles.rocketEmoji}>🚀</Text>
                    <Text style={styles.flameEmoji}>🔥</Text>
                </Animated.View>
            )}
            {showConfetti && <ConfettiCannon count={200} origin={{ x: size.w / 2, y: 0 }} fallSpeed={3000} fadeOut />}
            {rocketLaunch && (
                <View style={styles.completeOverlay} pointerEvents="none">
                    <View style={styles.completeCard}>
                        <Text style={styles.completeEmoji}>🌌🎉</Text>
                        <View style={styles.completeStars}>
                            {Array.from({ length: BOARDS_PER_GAME }, (_, i) => (
                                <Ionicons key={i} name="star" size={38} color="#FFD700" />
                            ))}
                        </View>
                        <Text style={styles.completeTitle}>{childName}, Harika Bir Mimarsın!</Text>
                    </View>
                </View>
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...(isWeb ? { height: WEB_FULL_HEIGHT as any } : {}),
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 26, 0.5)',
    },
    starsLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    star: {
        position: 'absolute',
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#FFF',
    },
    headerSafe: { zIndex: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: isWeb ? 14 : 8,
        paddingBottom: 8,
    },
    starsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    play: {
        flex: 1,
        ...(isWeb ? { touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } : {}),
    } as any,
    // Arka plan görseli (kokpit) parlak: tahta ve tepsi koyu bir panelin üstüne oturur, hücre çizgileri belirgin.
    boardFrame: {
        position: 'absolute',
        borderRadius: 18,
        backgroundColor: 'rgba(6, 6, 30, 0.6)',
        borderWidth: 2,
        borderColor: 'rgba(191, 64, 191, 0.75)',
    },
    boardGlow: { position: 'absolute', borderRadius: 18, backgroundColor: '#39FF14' },
    boardCell: { position: 'absolute', padding: 1.5 },
    emptyCell: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.30)',
    },
    pieceCell: { position: 'absolute', padding: 1.5 },
    pieceCellInner: {
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    pieceShine: {
        position: 'absolute',
        left: '14%',
        top: '12%',
        width: '36%',
        height: '18%',
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.38)',
    },
    overlayCell: { flex: 1 },
    previewValid: { backgroundColor: 'rgba(57,255,20,0.40)', borderWidth: 2, borderColor: '#39FF14' },
    previewInvalid: { backgroundColor: 'rgba(255,82,82,0.40)', borderWidth: 2, borderColor: '#FF5252' },
    hintCell: { borderWidth: 3, borderColor: '#29B6F6', backgroundColor: 'rgba(41,182,246,0.25)' },
    slot: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: 'rgba(6, 6, 30, 0.5)',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    slotHint: { borderColor: '#29B6F6' },
    slotHintRing: { ...StyleSheet.absoluteFillObject, borderRadius: 14, borderWidth: 3, borderColor: '#29B6F6' },
    slotPiece: { alignItems: 'center', justifyContent: 'center' },
    rotateBadge: {
        position: 'absolute',
        right: 3,
        top: 3,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ghost: { position: 'absolute', left: 0, top: 0, zIndex: 500, opacity: 0.92 },
    thinkBubble: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thinkEmoji: { fontSize: 24 },
    actionSafe: { zIndex: 20 },
    actionBar: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingBottom: 14, paddingTop: 8 },
    actionBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#5C6BC0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 5,
    },
    actionBtnAlert: { backgroundColor: '#FF5252' },
    actionBtnOff: { opacity: 0.4 },
    actionEmoji: { fontSize: 30 },
    rocketContainer: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        alignItems: 'center',
        zIndex: 60,
    },
    rocketEmoji: { fontSize: 60 },
    flameEmoji: { fontSize: 40, marginTop: -10 },
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    completeCard: {
        backgroundColor: '#1a1a2e',
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#BF40BF',
        maxWidth: 340,
    },
    completeEmoji: { fontSize: 56, marginBottom: 10 },
    completeStars: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    completeTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
});
