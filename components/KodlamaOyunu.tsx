import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useSound } from './SoundContext';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/kodlama_bg.webp');

const { width, height } = Dimensions.get('window');

// ============== TYPES ==============
enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

enum GameStatus {
  PLANNING = 'PLANNING',
  RUNNING = 'RUNNING',
  WON = 'WON',
  LOST = 'LOST',
}

enum CellType {
  EMPTY = 'EMPTY',
  WALL = 'WALL',
  START = 'START',
  GOAL = 'GOAL',
  OBSTACLE = 'OBSTACLE',
}

enum GameMode {
  PLAY = 'PLAY',
  EDIT = 'EDIT',
}

type EditorTool = CellType.WALL | CellType.START | CellType.GOAL | 'ERASER';

interface Position { x: number; y: number; }

interface LevelConfig {
  id: number | string;
  name: string;
  gridSize: number;
  startPos: Position;
  goalPos: Position;
  obstacles: Position[];
  story?: string;
  theme?: 'room' | 'garden' | 'park';
  emoji: string;
}

// ============== LEVELS ==============
const LEVELS: LevelConfig[] = [
  {
    id: 1, name: 'Odam', gridSize: 4, emoji: '🏠', theme: 'room',
    startPos: { x: 0, y: 0 }, goalPos: { x: 3, y: 2 },
    obstacles: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
    story: 'Tavşanı oyuncağına götür!',
    // Çözüm: → → ↓ ↓ →
  },
  {
    id: 2, name: 'Bahçe', gridSize: 4, emoji: '🌳', theme: 'garden',
    startPos: { x: 0, y: 3 }, goalPos: { x: 3, y: 0 },
    obstacles: [{ x: 1, y: 2 }, { x: 2, y: 1 }],
    story: 'Tavşanı çiçeğe götür!',
    // Çözüm: ↑ ↑ ↑ → → →
  },
  {
    id: 3, name: 'Park', gridSize: 4, emoji: '🎡', theme: 'park',
    startPos: { x: 0, y: 3 }, goalPos: { x: 3, y: 0 },
    obstacles: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
    story: 'Tavşanı dönme dolaba götür!',
    // Çözüm: → → → ↑ ↑ ↑
  },
];

// ============== AUDIO - Use unified speechService ==============
import { speak, stopSpeech as stopSpeechService } from '../services/speechService';
import { asset } from '../lib/assetMap';
import ListenButton from './ListenButton';

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const speakTeacher = async (text: string) => {
  if (Platform.OS !== 'web') return;
  try {
    await speak(text, { instructions: HAPPY_VOICE });
  } catch (e) {
    console.log('TTS error:', e);
  }
};

const stopSpeech = () => {
  stopSpeechService();
};

// ============== THEME ==============
const getThemeIcons = (theme: string) => {
  switch (theme) {
    case 'garden': return { obstacle: '🌳', goal: '🌻' };
    case 'park': return { obstacle: '🎪', goal: '🎡' };
    default: return { obstacle: '📦', goal: '🧸' };
  }
};

const getThemeBg = (theme: string) => {
  switch (theme) {
    case 'garden': return '#C8E6C9';
    case 'park': return '#FFE0B2';
    default: return '#E3F2FD';
  }
};

// ============== RESPONSIVE - Büyütülmüş Grid ==============
const GRID_SIZE = Math.min(width * 0.85, height * 0.45, 340);  // Daha büyük grid
const BTN_SIZE = Math.min(width * 0.13, 48);
const DPAD_SIZE = Math.min(width * 0.18, 68);

// ============== ARKA PLAN MÜZİĞİ ==============
let bgMusic: Audio.Sound | null = null;
let bgMusicLoadToken = 0;

const startBgMusic = async () => {
  if (Platform.OS !== 'web') return;
  if (bgMusic) return;

  const token = ++bgMusicLoadToken;
  try {
    const { sound } = await Audio.Sound.createAsync(asset('/sounds/background.mp3'), { shouldPlay: true, isLooping: true, volume: 0.3 });
    if (token !== bgMusicLoadToken) {
      sound.unloadAsync();
      return;
    }
    bgMusic = sound;
  } catch { }
};

const stopBgMusic = () => {
  bgMusicLoadToken++;
  if (bgMusic) {
    bgMusic.unloadAsync().catch(() => { });
    bgMusic = null;
  }
};

const setBgMusicVolume = (on: boolean) => {
  bgMusic?.setVolumeAsync(on ? 0.3 : 0).catch(() => { });
};

// ============== COMPONENT ==============
interface Props {
  onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
  onExit?: () => void;
  childName?: string;
}

export default function KodlamaOyunu({ onGameEnd, onExit, childName = 'Kodlamacı' }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [mode, setMode] = useState<GameMode>(GameMode.PLAY);
  const [levelIdx, setLevelIdx] = useState(0);
  const [level, setLevel] = useState<LevelConfig>(LEVELS[0]);
  const [playerPos, setPlayerPos] = useState<Position>(LEVELS[0].startPos);
  const [commands, setCommands] = useState<Direction[]>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.PLANNING);
  const [step, setStep] = useState(-1);
  // Oyun seçme menüsündeki genel ses aç/kapa durumunu başlangıç değeri olarak kullan —
  // önceden her zaman true ile başlıyordu, menüde sessize alınmış olsa bile oyuna girince
  // arka plan müziği yeniden çalmaya başlıyordu.
  const { isMuted: globalMuted } = useSound();
  const [soundOn, setSoundOn] = useState(!globalMuted);
  const [showWin, setShowWin] = useState(false);

  // Editor
  const [tool, setTool] = useState<EditorTool>(CellType.WALL);
  const [grid, setGrid] = useState<CellType[][]>(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY)));

  // Stats
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime] = useState(new Date());

  // Anim
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const confetti = useRef<ConfettiCannon>(null);

  // Unmount temizligi icin bekleyen setTimeout id'leri
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const gridCells = mode === GameMode.EDIT ? 4 : level.gridSize;
  const GAP = 4;
  const CELL = (GRID_SIZE - GAP * (gridCells - 1)) / gridCells;
  const icons = getThemeIcons(level.theme || 'room');

  // Bounce anim
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: 1.15, duration: 400, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // Unmount'ta bekleyen setTimeout'lari + o an calan sesi temizle (bkz. OdaminKrokisi/RenkAtolyesi
  // deseni: cikista stopSpeech() cagrilmazsa X'e basip menuye donulse bile ses calmaya devam eder)
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    stopSpeech();
  }, []);

  // Arka plan müziği başlat
  useEffect(() => {
    if (soundOn) {
      startBgMusic();
    }
    return () => { stopBgMusic(); };
  }, []);

  // Ses açıp kapatınca müzik
  useEffect(() => {
    setBgMusicVolume(soundOn);
  }, [soundOn]);

  // Player position
  useEffect(() => {
    Animated.parallel([
      Animated.spring(animX, { toValue: playerPos.x * (CELL + GAP), useNativeDriver: true, friction: 5 }),
      Animated.spring(animY, { toValue: playerPos.y * (CELL + GAP), useNativeDriver: true, friction: 5 }),
    ]).start();
  }, [playerPos, CELL]);

  // Voice
  // Bu zamanlanmis cagri, kosul degisince (ör. cocuk hemen bir komut eklerse commands.length
  // 0'dan 1'e cikar) iptal edilmezse 300ms sonra yine de calar ve o an calan komut sesiyle
  // ust uste biner ("2 komut ayni anda caliyor") — cleanup ile iptal ediyoruz.
  // !gameReady kontrolü: CountdownOverlay kendi "hoş geldin" mesajını zaten sesli okuyor
  // (bkz. CountdownOverlay.tsx speak(message)); gameReady henüz false iken bu efekt de
  // level.story'yi seslendirirse ikisi aynı anda çalışıp birbirine biniyordu ve çocuk hangisinin
  // çaldığına göre YANLIŞ (eski) metni duyabiliyordu — Oyun_Test_Listesi geri bildirimiyle
  // doğrulandı: ekranda doğru yönerge yazarken sesli olarak hâlâ eski seviye hikayesi çalıyordu.
  useEffect(() => {
    if (!soundOn || !gameReady) return;
    if (mode === GameMode.PLAY && status === GameStatus.PLANNING && commands.length === 0) {
      const t = setTimeout(() => speakTeacher(level.story || 'Hadi oynayalım!'), 300);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
  }, [level, status, soundOn, mode, commands.length, gameReady]);

  // Auto next level
  const nextLevel = useCallback(() => {
    if (levelIdx >= LEVELS.length - 1) {
      const time = Math.round((Date.now() - startTime.getTime()) / 1000);
      onGameEnd('Kodlama Oyunu', time, moves, errors, undefined, {
        zorlukSeviyesi: levelIdx + 1,
        kazanimOdagi: 'Algoritmik Düşünme ve Problem Çözme',
      });
      return;
    }
    const next = LEVELS[levelIdx + 1];
    setLevelIdx(levelIdx + 1);
    setLevel(next);
    setPlayerPos(next.startPos);
    setCommands([]);
    setStatus(GameStatus.PLANNING);
    setStep(-1);
    setShowWin(false);
    animX.setValue(next.startPos.x * (CELL + GAP));
    animY.setValue(next.startPos.y * (CELL + GAP));
    // Not: yeni seviyenin hikayesi burada ayrıca seslendirilmiyor — yukarıdaki genel
    // "level story" efekti (level/status/commands.length değişince tetiklenir) zaten
    // bunu yapıyor; burada da çağrılırsa aynı metin iki kez üst üste çalardı.
  }, [levelIdx, CELL, GAP, startTime, moves, errors, onGameEnd]);

  useEffect(() => {
    // Sadece kampanya (PLAY) modunda otomatik ilerle. EDIT modunda ozel harita kazanmak
    // kampanya ilerlemesini degistirmemeli / oyunu erken bitirmemeli.
    if (status === GameStatus.WON && showWin && mode === GameMode.PLAY) {
      const t = setTimeout(nextLevel, 2000);
      return () => clearTimeout(t);
    }
  }, [status, showWin, nextLevel, mode]);

  const reset = useCallback(() => {
    setPlayerPos(level.startPos);
    setStatus(GameStatus.PLANNING);
    setStep(-1);
    setShowWin(false);
    animX.setValue(level.startPos.x * (CELL + GAP));
    animY.setValue(level.startPos.y * (CELL + GAP));
  }, [level, CELL, GAP]);

  const addCmd = (d: Direction) => {
    if (status === GameStatus.RUNNING || commands.length >= 10) return;
    setCommands(c => [...c, d]);
    setMoves(m => m + 1);
    if (soundOn) {
      const txt: Record<Direction, string> = { UP: 'Yukarı!', DOWN: 'Aşağı!', LEFT: 'Sol!', RIGHT: 'Sağ!' };
      speakTeacher(txt[d]);
    }
  };

  // moves eklenen komutlari sayar; undo/clear ile geri alinan komutlar dusulmezse
  // hamle sayisi denemeler boyunca sisip yanlis raporlaniyordu.
  const clear = () => { if (status !== GameStatus.RUNNING) { setMoves(m => Math.max(0, m - commands.length)); setCommands([]); reset(); } };
  const undo = () => { if (status !== GameStatus.RUNNING && commands.length > 0) { setCommands(c => c.slice(0, -1)); setMoves(m => Math.max(0, m - 1)); } };

  // Editor
  const cellClick = (x: number, y: number) => {
    if (mode !== GameMode.EDIT) return;
    const g = grid.map(r => [...r]);
    if (tool === CellType.START) {
      g.forEach((r, ry) => r.forEach((_, rx) => { if (g[ry][rx] === CellType.START) g[ry][rx] = CellType.EMPTY; }));
      g[y][x] = CellType.START;
    } else if (tool === CellType.GOAL) {
      g.forEach((r, ry) => r.forEach((_, rx) => { if (g[ry][rx] === CellType.GOAL) g[ry][rx] = CellType.EMPTY; }));
      g[y][x] = CellType.GOAL;
    } else if (tool === 'ERASER') {
      g[y][x] = CellType.EMPTY;
    } else {
      g[y][x] = CellType.WALL;
    }
    setGrid(g);
  };

  const saveCustom = () => {
    let s: Position | null = null, g: Position | null = null;
    const obs: Position[] = [];
    grid.forEach((r, y) => r.forEach((c, x) => {
      if (c === CellType.START) s = { x, y };
      if (c === CellType.GOAL) g = { x, y };
      if (c === CellType.WALL) obs.push({ x, y });
    }));
    if (!s || !g) { if (soundOn) speakTeacher('Tavşan ve hedef koy!'); return; }
    const custom: LevelConfig = { id: 'custom', name: 'Haritam', gridSize: 4, startPos: s, goalPos: g, obstacles: obs, story: 'Kendi haritanda oyna!', theme: 'room', emoji: '✨' };
    setLevel(custom);
    setMode(GameMode.PLAY);
    setPlayerPos(s);
    setCommands([]);
    setStatus(GameStatus.PLANNING);
  };

  // Game
  const nextPos = (p: Position, d: Direction): Position => {
    const m: Record<Direction, Position> = { UP: { x: p.x, y: p.y - 1 }, DOWN: { x: p.x, y: p.y + 1 }, LEFT: { x: p.x - 1, y: p.y }, RIGHT: { x: p.x + 1, y: p.y } };
    return m[d];
  };
  const blocked = (p: Position) => level.obstacles.some(o => o.x === p.x && o.y === p.y);
  const isGoal = (p: Position) => level.goalPos.x === p.x && level.goalPos.y === p.y;
  const valid = (p: Position) => p.x >= 0 && p.x < level.gridSize && p.y >= 0 && p.y < level.gridSize && !blocked(p);

  // "Çok belirsiz, kör planlama yapıyorum" geri bildirimi (Oyun_Test_Listesi.docx, #10)
  // üzerine: çocuk komut eklerken tavşanın o anki planına göre NEREYE varacağını canlı
  // görsün diye yarı saydam bir "hayalet" tavşan + ayak izi — kör planlama yerine her
  // adımı görerek ekliyor. Bir komut ızgara dışına/engele çarpıyorsa yol orada durur ve
  // "blocked" true olur (gerçek koşu sırasındaki ▶️ davranışıyla birebir aynı mantık).
  const computeGhostPath = (cmds: Direction[]): { path: Position[]; blockedAt: number | null } => {
    const path: Position[] = [level.startPos];
    let cur = level.startPos;
    for (let i = 0; i < cmds.length; i++) {
      const n = nextPos(cur, cmds[i]);
      if (isGoal(n) || valid(n)) {
        path.push(n);
        cur = n;
        if (isGoal(n)) break;
      } else {
        return { path, blockedAt: i };
      }
    }
    return { path, blockedAt: null };
  };

  useEffect(() => {
    if (status !== GameStatus.RUNNING) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i >= commands.length) {
        clearInterval(iv);
        setStatus(GameStatus.LOST); setErrors(e => e + 1); if (soundOn) speakTeacher('Tekrar dene!');
        return;
      }
      const d = commands[i];
      setStep(i);
      setPlayerPos(prev => {
        const n = nextPos(prev, d);
        if (isGoal(n)) {
          timersRef.current.push(setTimeout(() => { setStatus(GameStatus.WON); setShowWin(true); confetti.current?.start(); if (soundOn) speakTeacher('Aferin!'); }, 150));
          return n;
        }
        if (valid(n)) return n;
        clearInterval(iv);
        setErrors(e => e + 1);
        timersRef.current.push(setTimeout(() => { setStatus(GameStatus.LOST); if (soundOn) speakTeacher('Tekrar dene!'); }, 150));
        return prev;
      });
      i++;
    }, 500);
    return () => clearInterval(iv);
  }, [status]);

  const run = () => { if (commands.length === 0) return; reset(); timersRef.current.push(setTimeout(() => setStatus(GameStatus.RUNNING), 50)); };

  const selectLvl = (l: LevelConfig, idx: number) => {
    setLevel(l); setLevelIdx(idx); setMode(GameMode.PLAY); setCommands([]);
    setPlayerPos(l.startPos); setStatus(GameStatus.PLANNING); setShowWin(false);
  };

  const dirIcon = (d: Direction) => ({ UP: '⬆️', DOWN: '⬇️', LEFT: '⬅️', RIGHT: '➡️' }[d]);
  const dirColor = (d: Direction) => ({ UP: '#FF9800', DOWN: '#9C27B0', LEFT: '#E91E63', RIGHT: '#4CAF50' }[d]);

  // Planlama sırasında (koşu başlamadan önce) canlı "hayalet" önizleme — bkz. computeGhostPath.
  const ghost = mode === GameMode.PLAY && status === GameStatus.PLANNING && commands.length > 0
    ? computeGhostPath(commands)
    : null;
  const ghostEnd = ghost ? ghost.path[ghost.path.length - 1] : null;

  // ============== RENDER ==============
  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < gridCells; y++) {
      for (let x = 0; x < gridCells; x++) {
        let type = CellType.EMPTY;
        if (mode === GameMode.PLAY) {
          if (level.obstacles.some(o => o.x === x && o.y === y)) type = CellType.OBSTACLE;
          if (level.goalPos.x === x && level.goalPos.y === y) type = CellType.GOAL;
          if (level.startPos.x === x && level.startPos.y === y) type = CellType.START;
        } else {
          type = grid[y][x];
        }
        let bg = '#FFF', content = null;
        if (type === CellType.OBSTACLE || type === CellType.WALL) {
          bg = '#78909C';
          content = <Text style={{ fontSize: CELL * 0.5 }}>{icons.obstacle}</Text>;
        } else if (type === CellType.GOAL) {
          bg = '#FFF9C4';
          content = <Animated.Text style={{ fontSize: CELL * 0.5, transform: [{ scale: bounce }] }}>{icons.goal}</Animated.Text>;
        } else if (type === CellType.START) {
          // Başlangıç karesi artık PLAY modunda da (tavşan oradan uzaklaşınca bile)
          // hafif mavi tonla belli oluyor — önceden sadece EDIT modunda görünüyordu.
          bg = '#BBDEFB';
          if (mode === GameMode.EDIT) {
            content = <Text style={{ fontSize: CELL * 0.45, opacity: 0.5 }}>🐰</Text>;
          }
        }
        cells.push(
          <TouchableOpacity key={`${x}-${y}`} style={[st.cell, { width: CELL, height: CELL, backgroundColor: bg }]} onPress={() => cellClick(x, y)} disabled={mode !== GameMode.EDIT} activeOpacity={0.7}>
            {content}
          </TouchableOpacity>
        );
      }
    }
    return cells;
  };

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={st.bgContainer} resizeMode="cover">
      <View style={st.darkOverlay} />
      {/* Countdown Overlay */}
      {!gameReady && (
        <CountdownOverlay
          message="Minik Kaşif'e hoş geldin! Önce ok tuşlarına dokunarak tavşana yol göster, sonra ▶️ tuşuna bas ve tavşanın yürüyüşünü izle!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}
      <ScrollView style={st.scroll} contentContainerStyle={st.container} showsVerticalScrollIndicator={false}>
        {/* Top */}
        <View style={st.top}>
          <GameExitButton
            onPress={() => { stopBgMusic(); stopSpeech(); onExit?.(); }}
            style={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }}
          />

          <View style={st.levels}>
            {LEVELS.map((l, i) => (
              <TouchableOpacity key={l.id} style={[st.lvlBtn, levelIdx === i && mode === GameMode.PLAY && st.lvlActive, i > levelIdx && st.lvlLock]} onPress={() => i <= levelIdx && selectLvl(l, i)} disabled={i > levelIdx}>
                <Text style={st.lvlEmoji}>{l.emoji}</Text>
                {i < levelIdx && <View style={st.check}><Text style={st.checkTxt}>✓</Text></View>}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[st.soundBtn, !soundOn && st.soundOff]} onPress={() => { setSoundOn(!soundOn); if (soundOn) stopSpeech(); }}>
            <Text style={st.soundTxt}>{soundOn ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={st.dots}>
          {LEVELS.map((_, i) => <View key={i} style={[st.dot, i <= levelIdx && st.dotOn, i < levelIdx && st.dotDone]} />)}
        </View>

        {mode === GameMode.PLAY && (
          <ListenButton onPress={() => speak(level.story || 'Hadi oynayalım!', { instructions: HAPPY_VOICE })} color="#64B5F6" style={{ marginTop: 12 }} />
        )}

        {/* Grid - Büyütülmüş */}
        <View style={[st.gridWrap, { width: GRID_SIZE + 16, height: GRID_SIZE + 16, backgroundColor: getThemeBg(level.theme || 'room') }]}>
          <View style={[st.grid, { gap: GAP }]}>{renderGrid()}</View>
          {mode === GameMode.PLAY && (
            <Animated.View style={[st.player, { width: CELL, height: CELL, transform: [{ translateX: animX }, { translateY: animY }] }]}>
              <Text style={{ fontSize: CELL * 0.55 }}>🐰</Text>
            </Animated.View>
          )}
          {/* Hayalet önizleme: ara adımlarda ayak izi, plan sonunda yarı saydam tavşan —
              engele çarpıyorsa kırmızı ⚠️ ile işaretlenir (bkz. computeGhostPath). */}
          {ghost && ghost.path.slice(1, -1).map((p, i) => (
            <View key={`fp-${i}`} style={[st.footprint, { width: CELL, height: CELL, left: 8 + p.x * (CELL + GAP), top: 8 + p.y * (CELL + GAP) }]}>
              <Text style={{ fontSize: CELL * 0.3 }}>👣</Text>
            </View>
          ))}
          {ghostEnd && (ghostEnd.x !== level.startPos.x || ghostEnd.y !== level.startPos.y || ghost!.blockedAt !== null) && (
            <View style={[st.ghost, { width: CELL, height: CELL, left: 8 + ghostEnd.x * (CELL + GAP), top: 8 + ghostEnd.y * (CELL + GAP) }]}>
              <Text style={{ fontSize: CELL * 0.55, opacity: 0.45 }}>🐰</Text>
              {ghost!.blockedAt !== null && <Text style={st.ghostWarn}>⚠️</Text>}
            </View>
          )}
          {showWin && <View style={st.winBox}><Text style={st.winTxt}>🎉</Text></View>}
        </View>

        {/* Lose */}
        {status === GameStatus.LOST && <View style={st.loseBox}><Text style={st.loseTxt}>😢</Text></View>}

        {/* Controls */}
        {mode === GameMode.EDIT ? (
          <View style={st.editor}>
            <View style={st.tools}>
              {[{ id: CellType.WALL, icon: '📦', bg: '#78909C' }, { id: CellType.START, icon: '🐰', bg: '#64B5F6' }, { id: CellType.GOAL, icon: '🧸', bg: '#FFD54F' }, { id: 'ERASER' as EditorTool, icon: '🧹', bg: '#E0E0E0' }].map(t => (
                <TouchableOpacity key={t.id} style={[st.toolBtn, { backgroundColor: t.bg }, tool === t.id && st.toolOn]} onPress={() => setTool(t.id as EditorTool)}>
                  <Text style={st.toolTxt}>{t.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.editorActs}>
              <TouchableOpacity style={st.clearBtn} onPress={() => setGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY)))}><Text style={st.actTxt}>🗑️</Text></TouchableOpacity>
              <TouchableOpacity style={st.playBtn} onPress={saveCustom}><Text style={st.playTxt}>▶️</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Cmds */}
            <View style={st.cmds}>
              {commands.length === 0 ? <Text style={st.cmdEmpty}>👇</Text> : commands.map((c, i) => (
                <View key={i} style={[st.cmd, { backgroundColor: dirColor(c) }, step === i && st.cmdOn, step > i && st.cmdDone]}><Text style={st.cmdTxt}>{dirIcon(c)}</Text></View>
              ))}
              {commands.length > 0 && status !== GameStatus.RUNNING && <TouchableOpacity style={st.undoBtn} onPress={undo}><Text style={st.undoTxt}>⌫</Text></TouchableOpacity>}
            </View>

            {/* DPad */}
            <View style={st.dpad}>
              <View style={st.drow}>
                <View style={st.dspace} />
                <TouchableOpacity style={[st.dbtn, { backgroundColor: '#FF9800' }]} onPress={() => addCmd(Direction.UP)} disabled={status === GameStatus.RUNNING}><Text style={st.dtxt}>⬆️</Text></TouchableOpacity>
                <View style={st.dspace} />
              </View>
              <View style={st.drow}>
                <TouchableOpacity style={[st.dbtn, { backgroundColor: '#E91E63' }]} onPress={() => addCmd(Direction.LEFT)} disabled={status === GameStatus.RUNNING}><Text style={st.dtxt}>⬅️</Text></TouchableOpacity>
                <TouchableOpacity style={[st.dbtn, { backgroundColor: '#9C27B0' }]} onPress={() => addCmd(Direction.DOWN)} disabled={status === GameStatus.RUNNING}><Text style={st.dtxt}>⬇️</Text></TouchableOpacity>
                <TouchableOpacity style={[st.dbtn, { backgroundColor: '#4CAF50' }]} onPress={() => addCmd(Direction.RIGHT)} disabled={status === GameStatus.RUNNING}><Text style={st.dtxt}>➡️</Text></TouchableOpacity>
              </View>
            </View>

            {/* Acts */}
            <View style={st.acts}>
              <TouchableOpacity style={st.resetBtn} onPress={clear}><Text style={st.actTxt}>🔄</Text></TouchableOpacity>
              <TouchableOpacity style={[st.goBtn, (status === GameStatus.RUNNING || commands.length === 0) && st.goOff]} onPress={run} disabled={status === GameStatus.RUNNING || commands.length === 0}>
                <Text style={st.goTxt}>{status === GameStatus.RUNNING ? '🏃' : '▶️'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      <ConfettiCannon ref={confetti} count={60} origin={{ x: width / 2, y: 0 }} autoStart={false} fadeOut />
    </ImageBackground>
  );
}

// ============== STYLES ==============
const st = StyleSheet.create({
  bgContainer: { flex: 1, width: '100%', ...(Platform.OS === 'web' ? { height: '100vh' as any } : {}) },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  scroll: { flex: 1, width: '100%' },
  // flexGrow (flex degil): ScrollView'un contentContainerStyle'i icin — icerik viewport'a
  // sigdigi surece eskisi gibi (space-evenly) dagitilir, sigmadigi dar/kisa ekranlarda ise
  // elemanlar sikisip ust uste binmek yerine kaydirilabilir olur.
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingTop: 30, paddingBottom: 10, paddingHorizontal: 6 },

  // Top
  top: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  levels: { flexDirection: 'row', gap: 4 },
  lvlBtn: { width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  lvlActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  lvlLock: { opacity: 0.4 },
  lvlEmoji: { fontSize: BTN_SIZE * 0.5 },
  editBtn: { backgroundColor: '#FFF8E1' },
  soundBtn: { width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2, backgroundColor: '#64B5F6', justifyContent: 'center', alignItems: 'center' },
  soundOff: { backgroundColor: '#BDBDBD' },
  soundTxt: { fontSize: BTN_SIZE * 0.5 },
  check: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#4CAF50', width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  checkTxt: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },

  // Dots - Küçük
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotOn: { backgroundColor: '#64B5F6' },
  dotDone: { backgroundColor: '#4CAF50' },

  // Grid - Büyük
  gridWrap: { borderRadius: 16, padding: 8, position: 'relative' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#90A4AE' },
  player: { position: 'absolute', top: 8, left: 8, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  footprint: { position: 'absolute', justifyContent: 'center', alignItems: 'center', zIndex: 5, opacity: 0.55 },
  ghost: { position: 'absolute', justifyContent: 'center', alignItems: 'center', zIndex: 8 },
  ghostWarn: { position: 'absolute', top: -6, right: -6, fontSize: 16 },
  winBox: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14 },
  winTxt: { fontSize: 50 },

  // Lose
  loseBox: { backgroundColor: '#FFCDD2', paddingHorizontal: 20, paddingVertical: 6, borderRadius: 16 },
  loseTxt: { fontSize: 24 },

  // Editor
  editor: { alignItems: 'center', gap: 8 },
  tools: { flexDirection: 'row', gap: 6 },
  toolBtn: { width: DPAD_SIZE * 0.9, height: DPAD_SIZE * 0.9, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  toolOn: { borderColor: '#7B1FA2', transform: [{ scale: 1.08 }] },
  toolTxt: { fontSize: DPAD_SIZE * 0.4 },
  editorActs: { flexDirection: 'row', gap: 8 },
  clearBtn: { width: DPAD_SIZE * 0.85, height: DPAD_SIZE * 0.85, borderRadius: 20, backgroundColor: '#FFCDD2', justifyContent: 'center', alignItems: 'center' },
  playBtn: { paddingHorizontal: 24, height: DPAD_SIZE * 0.85, borderRadius: 20, backgroundColor: '#7B1FA2', justifyContent: 'center', alignItems: 'center' },
  playTxt: { fontSize: DPAD_SIZE * 0.35 },

  // Cmds
  cmds: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12, minHeight: 44, gap: 4 },
  cmdEmpty: { fontSize: 16, color: '#BDBDBD' },
  cmd: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cmdOn: { transform: [{ scale: 1.12 }], borderWidth: 2, borderColor: '#FFD700' },
  cmdDone: { opacity: 0.4 },
  cmdTxt: { fontSize: 16 },
  undoBtn: { marginLeft: 4, backgroundColor: '#FFCDD2', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  undoTxt: { fontSize: 14 },

  // DPad - net kenarlıklı, ferah aralıklı büyük dokunma hedefleri
  dpad: { gap: 10 },
  drow: { flexDirection: 'row', gap: 10 },
  dspace: { width: DPAD_SIZE, height: DPAD_SIZE },
  dbtn: { width: DPAD_SIZE, height: DPAD_SIZE, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 3, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  dtxt: { fontSize: DPAD_SIZE * 0.5 },

  // Acts
  acts: { flexDirection: 'row', gap: 8 },
  resetBtn: { width: DPAD_SIZE * 0.85, height: DPAD_SIZE * 0.85, borderRadius: 18, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#B0BEC5' },
  actTxt: { fontSize: DPAD_SIZE * 0.35 },
  goBtn: { paddingHorizontal: 28, height: DPAD_SIZE * 0.85, borderRadius: 18, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2E7D32' },
  goOff: { backgroundColor: '#BDBDBD', borderBottomColor: '#9E9E9E' },
  goTxt: { fontSize: DPAD_SIZE * 0.35 },
});
