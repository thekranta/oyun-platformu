import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Responsive sizing
const SCREEN_HEIGHT = height;
const COMPACT_MODE = SCREEN_HEIGHT < 700;

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

interface Position {
  x: number;
  y: number;
}

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

// ============== CONSTANTS ==============
const INITIAL_LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Odam',
    gridSize: 4,
    startPos: { x: 0, y: 0 },
    goalPos: { x: 3, y: 2 },
    obstacles: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
    story: 'Tavşanı oyuncağına götür!',
    theme: 'room',
    emoji: '🏠',
  },
  {
    id: 2,
    name: 'Bahçe',
    gridSize: 4,
    startPos: { x: 0, y: 3 },
    goalPos: { x: 3, y: 0 },
    obstacles: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 3 }],
    story: 'Tavşanı çiçeğe götür!',
    theme: 'garden',
    emoji: '🌳',
  },
  {
    id: 3,
    name: 'Park',
    gridSize: 4,
    startPos: { x: 0, y: 3 },
    goalPos: { x: 3, y: 0 },
    obstacles: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }],
    story: 'Tavşanı dönme dolaba götür!',
    theme: 'park',
    emoji: '🎡',
  },
];

// ============== IMPROVED AUDIO ==============
const speakTeacher = (text: string, isChild = false) => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    
    // Daha doğal, çocuk dostu ses ayarları
    utterance.pitch = isChild ? 1.4 : 1.2; // Daha yüksek pitch = daha tatlı ses
    utterance.rate = 0.85; // Yavaş ve anlaşılır
    utterance.volume = 1.0;
    
    // En iyi Türkçe sesi bul
    const voices = window.speechSynthesis.getVoices();
    const turkishVoice = voices.find(
      (v) => v.lang.includes('tr') && (v.name.includes('Female') || v.name.includes('Yelda') || v.name.includes('Filiz'))
    );
    
    if (turkishVoice) {
      utterance.voice = turkishVoice;
    }
    
    // Sesleri yükle ve konuş
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const newVoices = window.speechSynthesis.getVoices();
        const newTurkishVoice = newVoices.find(
          (v) => v.lang.includes('tr') && (v.name.includes('Female') || v.name.includes('Yelda') || v.name.includes('Filiz'))
        );
        if (newTurkishVoice) utterance.voice = newTurkishVoice;
        window.speechSynthesis.speak(utterance);
      };
    } else {
      window.speechSynthesis.speak(utterance);
    }
  }
};

const stopSpeech = () => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

// Kısa sesli tepkiler
const playSound = (type: 'tap' | 'win' | 'lose' | 'move') => {
  const sounds: Record<string, string> = {
    tap: 'Tık!',
    win: 'Yaşasın!',
    lose: 'Oops!',
    move: '',
  };
  if (sounds[type]) speakTeacher(sounds[type], true);
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

// ============== PROPS ==============
interface KodlamaOyunuProps {
  onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number) => void;
  onExit?: () => void;
}

// ============== MAIN COMPONENT ==============
export default function KodlamaOyunu({ onGameEnd, onExit }: KodlamaOyunuProps) {
  const [mode, setMode] = useState<GameMode>(GameMode.PLAY);
  const [level, setLevel] = useState<LevelConfig>(INITIAL_LEVELS[0]);
  const [playerPos, setPlayerPos] = useState<Position>(INITIAL_LEVELS[0].startPos);
  const [playerDirection, setPlayerDirection] = useState<string>('RIGHT');
  const [commands, setCommands] = useState<Direction[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLANNING);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Editor
  const [selectedTool, setSelectedTool] = useState<EditorTool>(CellType.WALL);
  const [customGrid, setCustomGrid] = useState<CellType[][]>(
    Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY))
  );

  // Stats
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime] = useState<Date>(new Date());

  // Animation
  const playerAnimX = useRef(new Animated.Value(0)).current;
  const playerAnimY = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const confettiRef = useRef<ConfettiCannon>(null);

  // Grid sizing - responsive
  const gridSize = mode === GameMode.EDIT ? 4 : level.gridSize;
  const GRID_SIZE = Math.min(width * 0.85, height * 0.35, 320);
  const CELL_GAP = 6;
  const CELL_SIZE = (GRID_SIZE - CELL_GAP * (gridSize - 1)) / gridSize;

  const themeIcons = getThemeIcons(level.theme || 'room');

  // Bounce animation
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  // Player position animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(playerAnimX, { toValue: playerPos.x * (CELL_SIZE + CELL_GAP), useNativeDriver: true, friction: 6 }),
      Animated.spring(playerAnimY, { toValue: playerPos.y * (CELL_SIZE + CELL_GAP), useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [playerPos, CELL_SIZE]);

  // Voice on status change
  useEffect(() => {
    if (!soundEnabled) return;
    if (mode === GameMode.PLAY && gameStatus === GameStatus.PLANNING && commands.length === 0) {
      speakTeacher(level.story || 'Hadi oynayalım!');
    } else if (gameStatus === GameStatus.WON) {
      speakTeacher('Aferin sana! Harikasın!');
    } else if (gameStatus === GameStatus.LOST) {
      speakTeacher('Tekrar dene!');
    }
  }, [level, gameStatus, soundEnabled, mode]);

  const resetLevel = useCallback(() => {
    setPlayerPos(level.startPos);
    setPlayerDirection('RIGHT');
    setGameStatus(GameStatus.PLANNING);
    setCurrentStep(-1);
    playerAnimX.setValue(level.startPos.x * (CELL_SIZE + CELL_GAP));
    playerAnimY.setValue(level.startPos.y * (CELL_SIZE + CELL_GAP));
  }, [level, CELL_SIZE, CELL_GAP]);

  const addCommand = (cmd: Direction) => {
    if (gameStatus === GameStatus.RUNNING || commands.length >= 12) return;
    setCommands((prev: Direction[]) => [...prev, cmd]);
    setMoves((m: number) => m + 1);
    if (soundEnabled) {
      const dirSounds: Record<Direction, string> = {
        [Direction.UP]: 'Yukarı!',
        [Direction.DOWN]: 'Aşağı!',
        [Direction.LEFT]: 'Sol!',
        [Direction.RIGHT]: 'Sağ!',
      };
      speakTeacher(dirSounds[cmd], true);
    }
  };

  const clearCommands = () => {
    if (gameStatus === GameStatus.RUNNING) return;
    setCommands([]);
    resetLevel();
  };

  const removeLastCommand = () => {
    if (gameStatus === GameStatus.RUNNING || commands.length === 0) return;
    setCommands((prev: Direction[]) => prev.slice(0, -1));
  };

  // Editor
  const handleCellClick = (x: number, y: number) => {
    if (mode !== GameMode.EDIT) return;
    const newGrid = customGrid.map((row: CellType[]) => [...row]);
    
    if (selectedTool === CellType.START) {
      newGrid.forEach((row: CellType[], ry: number) => row.forEach((_: CellType, rx: number) => {
        if (newGrid[ry][rx] === CellType.START) newGrid[ry][rx] = CellType.EMPTY;
      }));
      newGrid[y][x] = CellType.START;
    } else if (selectedTool === CellType.GOAL) {
      newGrid.forEach((row: CellType[], ry: number) => row.forEach((_: CellType, rx: number) => {
        if (newGrid[ry][rx] === CellType.GOAL) newGrid[ry][rx] = CellType.EMPTY;
      }));
      newGrid[y][x] = CellType.GOAL;
    } else if (selectedTool === 'ERASER') {
      newGrid[y][x] = CellType.EMPTY;
    } else {
      newGrid[y][x] = CellType.WALL;
    }
    setCustomGrid(newGrid);
  };

  const saveCustomLevel = () => {
    let start: Position | null = null;
    let goal: Position | null = null;
    const obstacles: Position[] = [];

    customGrid.forEach((row: CellType[], y: number) => row.forEach((cell: CellType, x: number) => {
      if (cell === CellType.START) start = { x, y };
      if (cell === CellType.GOAL) goal = { x, y };
      if (cell === CellType.WALL) obstacles.push({ x, y });
    }));

    if (!start || !goal) {
      if (soundEnabled) speakTeacher('Tavşan ve hedef koy!');
      return;
    }

    const custom: LevelConfig = {
      id: 'custom', name: 'Benim Haritam', gridSize: 4,
      startPos: start, goalPos: goal, obstacles,
      story: 'Kendi haritanda oyna!', theme: 'room', emoji: '✨',
    };
    setLevel(custom);
    setMode(GameMode.PLAY);
    setPlayerPos(start);
    setCommands([]);
    setGameStatus(GameStatus.PLANNING);
  };

  // Game logic
  const getNextPos = (pos: Position, dir: Direction): Position => {
    const moves: Record<Direction, Position> = {
      [Direction.UP]: { x: pos.x, y: pos.y - 1 },
      [Direction.DOWN]: { x: pos.x, y: pos.y + 1 },
      [Direction.LEFT]: { x: pos.x - 1, y: pos.y },
      [Direction.RIGHT]: { x: pos.x + 1, y: pos.y },
    };
    return moves[dir];
  };

  const isBlocked = (pos: Position) => level.obstacles.some((o: Position) => o.x === pos.x && o.y === pos.y);
  const isGoal = (pos: Position) => level.goalPos.x === pos.x && level.goalPos.y === pos.y;
  const isValid = (pos: Position) => pos.x >= 0 && pos.x < level.gridSize && pos.y >= 0 && pos.y < level.gridSize && !isBlocked(pos);

  useEffect(() => {
    if (gameStatus !== GameStatus.RUNNING) return;
    let step = 0;
    const interval = setInterval(() => {
      if (step >= commands.length) {
        clearInterval(interval);
        if (gameStatus !== GameStatus.WON) {
          setGameStatus(GameStatus.LOST);
          setErrors((e: number) => e + 1);
        }
        return;
      }
      const cmd = commands[step];
      setCurrentStep(step);
      setPlayerDirection(cmd);
      setPlayerPos((prev: Position) => {
        const next = getNextPos(prev, cmd);
        if (isGoal(next)) {
          setTimeout(() => {
            setGameStatus(GameStatus.WON);
            confettiRef.current?.start();
          }, 200);
          return next;
        }
        if (isValid(next)) return next;
        clearInterval(interval);
        setErrors((e: number) => e + 1);
        setTimeout(() => setGameStatus(GameStatus.LOST), 200);
        return prev;
      });
      step++;
    }, 600);
    return () => clearInterval(interval);
  }, [gameStatus]);

  const handleRun = () => {
    if (commands.length === 0) return;
    resetLevel();
    setTimeout(() => setGameStatus(GameStatus.RUNNING), 50);
  };

  const selectLevel = (lvl: LevelConfig) => {
    setLevel(lvl);
    setMode(GameMode.PLAY);
    setCommands([]);
    setPlayerPos(lvl.startPos);
    setGameStatus(GameStatus.PLANNING);
  };

  const finishGame = () => {
    const time = Math.round((new Date().getTime() - startTime.getTime()) / 1000);
    onGameEnd('Kodlama Oyunu', time, moves, errors);
  };

  const getRotation = () => {
    const rotations: Record<string, string> = { UP: '-90deg', DOWN: '90deg', LEFT: '180deg', RIGHT: '0deg' };
    return rotations[playerDirection] || '0deg';
  };

  const getDirIcon = (d: Direction) => ({ UP: '⬆️', DOWN: '⬇️', LEFT: '⬅️', RIGHT: '➡️' }[d]);
  const getDirColor = (d: Direction) => ({ UP: '#FF9800', DOWN: '#9C27B0', LEFT: '#E91E63', RIGHT: '#4CAF50' }[d]);

  // ============== RENDER ==============
  const renderGrid = () => {
    const size = mode === GameMode.EDIT ? 4 : level.gridSize;
    const cells = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let type = CellType.EMPTY;
        if (mode === GameMode.PLAY) {
          if (level.obstacles.some((o: Position) => o.x === x && o.y === y)) type = CellType.OBSTACLE;
          if (level.goalPos.x === x && level.goalPos.y === y) type = CellType.GOAL;
          if (level.startPos.x === x && level.startPos.y === y) type = CellType.START;
        } else {
          type = customGrid[y][x];
        }

        let bg = '#FFF';
        let content = null;
        if (type === CellType.OBSTACLE || type === CellType.WALL) {
          bg = '#78909C';
          content = <Text style={s.cellEmoji}>{themeIcons.obstacle}</Text>;
        } else if (type === CellType.GOAL) {
          bg = '#FFF9C4';
          content = <Animated.Text style={[s.cellEmoji, { transform: [{ scale: bounceAnim }] }]}>{themeIcons.goal}</Animated.Text>;
        } else if (type === CellType.START && mode === GameMode.EDIT) {
          bg = '#BBDEFB';
          content = <Text style={[s.cellEmoji, { opacity: 0.5 }]}>🐰</Text>;
        }

        cells.push(
          <TouchableOpacity
            key={`${x}-${y}`}
            style={[s.cell, { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: bg }]}
            onPress={() => handleCellClick(x, y)}
            disabled={mode !== GameMode.EDIT}
            activeOpacity={0.7}
          >
            {content}
          </TouchableOpacity>
        );
      }
    }
    return cells;
  };

  return (
    <DynamicBackground>
      <View style={s.container}>
        {/* Top Bar - Minimal */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.exitBtn} onPress={onExit}>
            <Text style={s.exitBtnText}>✕</Text>
          </TouchableOpacity>
          
          <View style={s.levelPicker}>
            {INITIAL_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl.id}
                style={[s.levelBtn, level.id === lvl.id && mode === GameMode.PLAY && s.levelBtnActive]}
                onPress={() => selectLevel(lvl)}
              >
                <Text style={s.levelBtnEmoji}>{lvl.emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.levelBtn, s.editBtn, mode === GameMode.EDIT && s.levelBtnActive]}
              onPress={() => { setMode(GameMode.EDIT); setCustomGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY))); setCommands([]); }}
            >
              <Text style={s.levelBtnEmoji}>✏️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.soundBtn, !soundEnabled && s.soundBtnOff]} onPress={() => setSoundEnabled(!soundEnabled)}>
            <Text style={s.soundBtnText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        {/* Game Grid */}
        <View style={[s.gridWrap, { width: GRID_SIZE + 20, height: GRID_SIZE + 20, backgroundColor: getThemeBg(level.theme || 'room') }]}>
          <View style={[s.grid, { gap: CELL_GAP }]}>{renderGrid()}</View>
          {mode === GameMode.PLAY && (
            <Animated.View style={[s.player, { width: CELL_SIZE, height: CELL_SIZE, transform: [{ translateX: playerAnimX }, { translateY: playerAnimY }, { rotate: getRotation() }] }]}>
              <Text style={s.playerEmoji}>🐰</Text>
            </Animated.View>
          )}
        </View>

        {/* Status */}
        {gameStatus === GameStatus.WON && (
          <View style={s.statusWin}>
            <Text style={s.statusEmoji}>🎉</Text>
            <TouchableOpacity style={s.finishBtn} onPress={finishGame}><Text style={s.finishBtnText}>⭐</Text></TouchableOpacity>
          </View>
        )}
        {gameStatus === GameStatus.LOST && (
          <View style={s.statusLose}><Text style={s.statusEmoji}>😢</Text></View>
        )}

        {/* Editor Tools */}
        {mode === GameMode.EDIT ? (
          <View style={s.editorPanel}>
            <View style={s.toolRow}>
              {[
                { id: CellType.WALL, icon: '📦', bg: '#78909C' },
                { id: CellType.START, icon: '🐰', bg: '#64B5F6' },
                { id: CellType.GOAL, icon: '🧸', bg: '#FFD54F' },
                { id: 'ERASER' as EditorTool, icon: '🧹', bg: '#E0E0E0' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.toolBtn, { backgroundColor: t.bg }, selectedTool === t.id && s.toolBtnActive]}
                  onPress={() => setSelectedTool(t.id)}
                >
                  <Text style={s.toolEmoji}>{t.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.editorActions}>
              <TouchableOpacity style={s.clearBtn} onPress={() => setCustomGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY)))}><Text style={s.actionEmoji}>🗑️</Text></TouchableOpacity>
              <TouchableOpacity style={s.playBtn} onPress={saveCustomLevel}><Text style={s.playBtnEmoji}>▶️</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Command Queue - Compact */}
            <View style={s.cmdQueue}>
              {commands.length === 0 ? (
                <Text style={s.cmdEmpty}>👇</Text>
              ) : (
                commands.map((c: Direction, i: number) => (
                  <View key={i} style={[s.cmdItem, { backgroundColor: getDirColor(c) }, currentStep === i && s.cmdItemActive, currentStep > i && s.cmdItemDone]}>
                    <Text style={s.cmdEmoji}>{getDirIcon(c)}</Text>
                  </View>
                ))
              )}
              {commands.length > 0 && gameStatus !== GameStatus.RUNNING && (
                <TouchableOpacity style={s.cmdClear} onPress={removeLastCommand}><Text style={s.cmdClearText}>⌫</Text></TouchableOpacity>
              )}
            </View>

            {/* Direction Pad */}
            <View style={s.dPad}>
              <View style={s.dRow}>
                <View style={s.dSpace} />
                <TouchableOpacity style={[s.dBtn, { backgroundColor: '#FF9800' }]} onPress={() => addCommand(Direction.UP)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={s.dBtnText}>⬆️</Text>
                </TouchableOpacity>
                <View style={s.dSpace} />
              </View>
              <View style={s.dRow}>
                <TouchableOpacity style={[s.dBtn, { backgroundColor: '#E91E63' }]} onPress={() => addCommand(Direction.LEFT)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={s.dBtnText}>⬅️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dBtn, { backgroundColor: '#9C27B0' }]} onPress={() => addCommand(Direction.DOWN)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={s.dBtnText}>⬇️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dBtn, { backgroundColor: '#4CAF50' }]} onPress={() => addCommand(Direction.RIGHT)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={s.dBtnText}>➡️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={s.actions}>
              <TouchableOpacity style={s.resetBtn} onPress={clearCommands}><Text style={s.actionEmoji}>🔄</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.goBtn, (gameStatus === GameStatus.RUNNING || commands.length === 0) && s.goBtnOff]}
                onPress={handleRun}
                disabled={gameStatus === GameStatus.RUNNING || commands.length === 0}
              >
                <Text style={s.goBtnText}>{gameStatus === GameStatus.RUNNING ? '🏃' : '▶️'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <ConfettiCannon ref={confettiRef} count={80} origin={{ x: width / 2, y: 0 }} autoStart={false} fadeOut />
    </DynamicBackground>
  );
}

// ============== STYLES ==============
const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 10 },
  
  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  exitBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EF5350', justifyContent: 'center', alignItems: 'center' },
  exitBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  levelPicker: { flexDirection: 'row', gap: 8 },
  levelBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'transparent' },
  levelBtnActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  levelBtnEmoji: { fontSize: 24 },
  editBtn: { backgroundColor: '#FFF8E1' },
  soundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#64B5F6', justifyContent: 'center', alignItems: 'center' },
  soundBtnOff: { backgroundColor: '#BDBDBD' },
  soundBtnText: { fontSize: 20 },

  // Grid
  gridWrap: { borderRadius: 20, padding: 10, marginBottom: 10, position: 'relative' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E0E0E0' },
  cellEmoji: { fontSize: COMPACT_MODE ? 22 : 28 },
  player: { position: 'absolute', top: 10, left: 10, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  playerEmoji: { fontSize: COMPACT_MODE ? 26 : 32 },

  // Status
  statusWin: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C8E6C9', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 30, marginBottom: 8, gap: 12 },
  statusLose: { backgroundColor: '#FFCDD2', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 30, marginBottom: 8 },
  statusEmoji: { fontSize: 32 },
  finishBtn: { backgroundColor: '#4CAF50', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  finishBtnText: { fontSize: 28 },

  // Editor
  editorPanel: { alignItems: 'center', gap: 12 },
  toolRow: { flexDirection: 'row', gap: 10 },
  toolBtn: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'transparent' },
  toolBtnActive: { borderColor: '#7B1FA2', transform: [{ scale: 1.1 }] },
  toolEmoji: { fontSize: 28 },
  editorActions: { flexDirection: 'row', gap: 12 },
  clearBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFCDD2', justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: 80, height: 56, borderRadius: 28, backgroundColor: '#7B1FA2', justifyContent: 'center', alignItems: 'center' },
  playBtnEmoji: { fontSize: 28 },

  // Command Queue
  cmdQueue: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginBottom: 10, minHeight: 56, gap: 6 },
  cmdEmpty: { fontSize: 24, color: '#BDBDBD' },
  cmdItem: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cmdItemActive: { transform: [{ scale: 1.2 }], borderWidth: 3, borderColor: '#FFD700' },
  cmdItemDone: { opacity: 0.4 },
  cmdEmoji: { fontSize: 20 },
  cmdClear: { marginLeft: 8, backgroundColor: '#FFCDD2', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cmdClearText: { fontSize: 18 },

  // D-Pad
  dPad: { marginBottom: 10 },
  dRow: { flexDirection: 'row', gap: 8 },
  dSpace: { width: COMPACT_MODE ? 56 : 64, height: COMPACT_MODE ? 56 : 64 },
  dBtn: { width: COMPACT_MODE ? 56 : 64, height: COMPACT_MODE ? 56 : 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  dBtnText: { fontSize: COMPACT_MODE ? 26 : 30 },

  // Actions
  actions: { flexDirection: 'row', gap: 16 },
  resetBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#B0BEC5' },
  actionEmoji: { fontSize: 28 },
  goBtn: { width: 100, height: 60, borderRadius: 30, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#2E7D32' },
  goBtnOff: { backgroundColor: '#BDBDBD', borderBottomColor: '#9E9E9E' },
  goBtnText: { fontSize: 32 },
});
