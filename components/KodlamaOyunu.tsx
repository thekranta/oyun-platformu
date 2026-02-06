import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/kodlama_bg.png');

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

const speakTeacher = async (text: string) => {
  if (Platform.OS !== 'web') return;
  try {
    await speak(text, { voice: 'nova', speed: 0.9 });
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
const BTN_SIZE = Math.min(width * 0.1, 40);
const DPAD_SIZE = Math.min(width * 0.14, 52);

// ============== ARKA PLAN MÜZİĞİ ==============
let bgMusic: HTMLAudioElement | null = null;

const startBgMusic = () => {
  if (Platform.OS !== 'web') return;
  if (bgMusic) return;

  // Ücretsiz çocuk müziği URL'si (royalty-free)
  bgMusic = new Audio('https://cdn.pixabay.com/audio/2022/01/18/audio_d0ef91aed6.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.3;
  bgMusic.play().catch(() => { });
};

const stopBgMusic = () => {
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
    bgMusic = null;
  }
};

const setBgMusicVolume = (on: boolean) => {
  if (bgMusic) {
    bgMusic.volume = on ? 0.3 : 0;
  }
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
  const [playerDir, setPlayerDir] = useState<string>('RIGHT');
  const [commands, setCommands] = useState<Direction[]>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.PLANNING);
  const [step, setStep] = useState(-1);
  const [soundOn, setSoundOn] = useState(true);
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

  const gridCells = mode === GameMode.EDIT ? 4 : level.gridSize;
  const GAP = 4;
  const CELL = (GRID_SIZE - GAP * (gridCells - 1)) / gridCells;
  const icons = getThemeIcons(level.theme || 'room');

  // Bounce anim
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: 1.15, duration: 400, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 400, useNativeDriver: true }),
    ])).start();
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
  useEffect(() => {
    if (!soundOn) return;
    if (mode === GameMode.PLAY && status === GameStatus.PLANNING && commands.length === 0) {
      setTimeout(() => speakTeacher(level.story || 'Hadi oynayalım!'), 300);
    }
  }, [level, status, soundOn, mode, commands.length]);

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
    if (soundOn) setTimeout(() => speakTeacher(next.story || 'Yeni bölüm!'), 300);
  }, [levelIdx, CELL, GAP, soundOn, startTime, moves, errors, onGameEnd]);

  useEffect(() => {
    if (status === GameStatus.WON && showWin) {
      const t = setTimeout(nextLevel, 2000);
      return () => clearTimeout(t);
    }
  }, [status, showWin, nextLevel]);

  const reset = useCallback(() => {
    setPlayerPos(level.startPos);
    setPlayerDir('RIGHT');
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

  const clear = () => { if (status !== GameStatus.RUNNING) { setCommands([]); reset(); } };
  const undo = () => { if (status !== GameStatus.RUNNING && commands.length > 0) setCommands(c => c.slice(0, -1)); };

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

  useEffect(() => {
    if (status !== GameStatus.RUNNING) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i >= commands.length) {
        clearInterval(iv);
        if (status !== GameStatus.WON) { setStatus(GameStatus.LOST); setErrors(e => e + 1); if (soundOn) speakTeacher('Tekrar dene!'); }
        return;
      }
      const d = commands[i];
      setStep(i);
      setPlayerDir(d);
      setPlayerPos(prev => {
        const n = nextPos(prev, d);
        if (isGoal(n)) {
          setTimeout(() => { setStatus(GameStatus.WON); setShowWin(true); confetti.current?.start(); if (soundOn) speakTeacher('Aferin!'); }, 150);
          return n;
        }
        if (valid(n)) return n;
        clearInterval(iv);
        setErrors(e => e + 1);
        setTimeout(() => { setStatus(GameStatus.LOST); if (soundOn) speakTeacher('Oops!'); }, 150);
        return prev;
      });
      i++;
    }, 500);
    return () => clearInterval(iv);
  }, [status]);

  const run = () => { if (commands.length === 0) return; reset(); setTimeout(() => setStatus(GameStatus.RUNNING), 50); };

  const selectLvl = (l: LevelConfig, idx: number) => {
    setLevel(l); setLevelIdx(idx); setMode(GameMode.PLAY); setCommands([]);
    setPlayerPos(l.startPos); setStatus(GameStatus.PLANNING); setShowWin(false);
  };

  const rot = () => ({ UP: '-90deg', DOWN: '90deg', LEFT: '180deg', RIGHT: '0deg' }[playerDir] || '0deg');
  const dirIcon = (d: Direction) => ({ UP: '⬆️', DOWN: '⬇️', LEFT: '⬅️', RIGHT: '➡️' }[d]);
  const dirColor = (d: Direction) => ({ UP: '#FF9800', DOWN: '#9C27B0', LEFT: '#E91E63', RIGHT: '#4CAF50' }[d]);

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
        } else if (type === CellType.START && mode === GameMode.EDIT) {
          bg = '#BBDEFB';
          content = <Text style={{ fontSize: CELL * 0.45, opacity: 0.5 }}>🐰</Text>;
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
          message="Kodlama Oyununa hoş geldin! Robotu hedefe götür!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}
      <View style={st.container}>
        {/* Top */}
        <View style={st.top}>
          <TouchableOpacity style={st.exitBtn} onPress={() => { stopBgMusic(); onExit?.(); }}><Text style={st.exitTxt}>✕</Text></TouchableOpacity>

          <View style={st.levels}>
            {LEVELS.map((l, i) => (
              <TouchableOpacity key={l.id} style={[st.lvlBtn, levelIdx === i && mode === GameMode.PLAY && st.lvlActive, i > levelIdx && st.lvlLock]} onPress={() => i <= levelIdx && selectLvl(l, i)} disabled={i > levelIdx}>
                <Text style={st.lvlEmoji}>{l.emoji}</Text>
                {i < levelIdx && <View style={st.check}><Text style={st.checkTxt}>✓</Text></View>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[st.lvlBtn, st.editBtn, mode === GameMode.EDIT && st.lvlActive]} onPress={() => { setMode(GameMode.EDIT); setGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY))); setCommands([]); }}>
              <Text style={st.lvlEmoji}>✏️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[st.soundBtn, !soundOn && st.soundOff]} onPress={() => { setSoundOn(!soundOn); if (soundOn) stopSpeech(); }}>
            <Text style={st.soundTxt}>{soundOn ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={st.dots}>
          {LEVELS.map((_, i) => <View key={i} style={[st.dot, i <= levelIdx && st.dotOn, i < levelIdx && st.dotDone]} />)}
        </View>

        {/* Grid - Büyütülmüş */}
        <View style={[st.gridWrap, { width: GRID_SIZE + 16, height: GRID_SIZE + 16, backgroundColor: getThemeBg(level.theme || 'room') }]}>
          <View style={[st.grid, { gap: GAP }]}>{renderGrid()}</View>
          {mode === GameMode.PLAY && (
            <Animated.View style={[st.player, { width: CELL, height: CELL, transform: [{ translateX: animX }, { translateY: animY }, { rotate: rot() }] }]}>
              <Text style={{ fontSize: CELL * 0.55 }}>🐰</Text>
            </Animated.View>
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
                <TouchableOpacity key={t.id} style={[st.toolBtn, { backgroundColor: t.bg }, tool === t.id && st.toolOn]} onPress={() => setTool(t.id)}>
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
      </View>
      <ConfettiCannon ref={confetti} count={60} origin={{ x: width / 2, y: 0 }} autoStart={false} fadeOut />
    </ImageBackground>
  );
}

// ============== STYLES ==============
const st = StyleSheet.create({
  bgContainer: { flex: 1 },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingTop: 30, paddingBottom: 10, paddingHorizontal: 6 },

  // Top
  top: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  exitBtn: { width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2, backgroundColor: '#EF5350', justifyContent: 'center', alignItems: 'center' },
  exitTxt: { color: '#FFF', fontSize: BTN_SIZE * 0.5, fontWeight: 'bold' },
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
  cell: { borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0' },
  player: { position: 'absolute', top: 8, left: 8, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
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
  playTxt: { fontSize: 22 },

  // Cmds - Kompakt
  cmds: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12, minHeight: 38, gap: 3 },
  cmdEmpty: { fontSize: 16, color: '#BDBDBD' },
  cmd: { width: 30, height: 30, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  cmdOn: { transform: [{ scale: 1.12 }], borderWidth: 2, borderColor: '#FFD700' },
  cmdDone: { opacity: 0.4 },
  cmdTxt: { fontSize: 14 },
  undoBtn: { marginLeft: 3, backgroundColor: '#FFCDD2', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  undoTxt: { fontSize: 12 },

  // DPad - Kompakt
  dpad: { gap: 3 },
  drow: { flexDirection: 'row', gap: 3 },
  dspace: { width: DPAD_SIZE, height: DPAD_SIZE },
  dbtn: { width: DPAD_SIZE, height: DPAD_SIZE, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  dtxt: { fontSize: DPAD_SIZE * 0.5 },

  // Acts - Kompakt
  acts: { flexDirection: 'row', gap: 8 },
  resetBtn: { width: DPAD_SIZE * 0.85, height: DPAD_SIZE * 0.85, borderRadius: 18, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#B0BEC5' },
  actTxt: { fontSize: 20 },
  goBtn: { paddingHorizontal: 28, height: DPAD_SIZE * 0.85, borderRadius: 18, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2E7D32' },
  goOff: { backgroundColor: '#BDBDBD', borderBottomColor: '#9E9E9E' },
  goTxt: { fontSize: 22 },
});

