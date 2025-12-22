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

// ============== AUDIO - Gemini 2.5 Flash TTS ==============
// Doğal ve sıcak ses - Çocuklara uygun
// Mevcut Gemini API key ile çalışır

// Ses önbelleği
const audioCache: Map<string, string> = new Map();
let currentAudio: HTMLAudioElement | null = null;

const speakGemini = async (text: string) => {
  if (Platform.OS !== 'web') return;

  // Mevcut sesi durdur
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  // Önbellekte var mı kontrol et
  const cacheKey = text;
  let audioDataUrl = audioCache.get(cacheKey);

  if (!audioDataUrl) {
    try {
      const response = await fetch('/api/gemini-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: 'Kore', // Kore: yumuşak kadın sesi, Puck: enerjik
        }),
      });

      if (!response.ok) {
        console.warn('Gemini TTS error, falling back to Web Speech');
        fallbackToWebSpeech(text);
        return;
      }

      const data = await response.json();
      const mimeType = data.mimeType || 'audio/mp3';
      audioDataUrl = `data:${mimeType};base64,${data.audioContent}`;
      
      // Önbelleğe kaydet
      audioCache.set(cacheKey, audioDataUrl);
    } catch (error) {
      console.warn('Gemini TTS error, falling back to Web Speech:', error);
      fallbackToWebSpeech(text);
      return;
    }
  }

  // Sesi çal
  try {
    currentAudio = new Audio(audioDataUrl);
    currentAudio.volume = 1.0;
    await currentAudio.play();
  } catch (error) {
    console.warn('Audio play error:', error);
  }
};

// Yedek olarak Web Speech API
const fallbackToWebSpeech = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.pitch = 1.3;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

// Ana konuşma fonksiyonu
const speakTeacher = (text: string, _isShort = false) => {
  speakGemini(text);
};

const stopSpeech = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
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

// ============== RESPONSIVE SIZING ==============
const getResponsiveSizes = () => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // Ekranın en küçük boyutunu baz al
  const minDimension = Math.min(screenWidth, screenHeight);
  
  // Grid boyutu - ekranın %40'ı veya max 280px
  const gridSize = Math.min(minDimension * 0.42, 280);
  
  // Buton boyutları
  const btnSize = Math.min(minDimension * 0.12, 56);
  const dPadSize = Math.min(minDimension * 0.14, 60);
  
  return { gridSize, btnSize, dPadSize, screenHeight };
};

// ============== PROPS ==============
interface KodlamaOyunuProps {
  onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number) => void;
  onExit?: () => void;
}

// ============== MAIN COMPONENT ==============
export default function KodlamaOyunu({ onGameEnd, onExit }: KodlamaOyunuProps) {
  const [mode, setMode] = useState<GameMode>(GameMode.PLAY);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [level, setLevel] = useState<LevelConfig>(INITIAL_LEVELS[0]);
  const [playerPos, setPlayerPos] = useState<Position>(INITIAL_LEVELS[0].startPos);
  const [playerDirection, setPlayerDirection] = useState<string>('RIGHT');
  const [commands, setCommands] = useState<Direction[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLANNING);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWinMessage, setShowWinMessage] = useState(false);

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
  const winScaleAnim = useRef(new Animated.Value(0)).current;

  const confettiRef = useRef<ConfettiCannon>(null);

  // Responsive sizes
  const sizes = getResponsiveSizes();
  const gridSize = mode === GameMode.EDIT ? 4 : level.gridSize;
  const CELL_GAP = 5;
  const CELL_SIZE = (sizes.gridSize - CELL_GAP * (gridSize - 1)) / gridSize;

  const themeIcons = getThemeIcons(level.theme || 'room');

  // Bounce animation for goal
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  // Player position animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(playerAnimX, { toValue: playerPos.x * (CELL_SIZE + CELL_GAP), useNativeDriver: true, friction: 5 }),
      Animated.spring(playerAnimY, { toValue: playerPos.y * (CELL_SIZE + CELL_GAP), useNativeDriver: true, friction: 5 }),
    ]).start();
  }, [playerPos, CELL_SIZE]);

  // Voice on level start
  useEffect(() => {
    if (!soundEnabled) return;
    if (mode === GameMode.PLAY && gameStatus === GameStatus.PLANNING && commands.length === 0) {
      speakTeacher(level.story || 'Hadi oynayalım!');
    }
  }, [level, gameStatus, soundEnabled, mode, commands.length]);

  // ============== OTOMATİK SEVİYE GEÇİŞİ ==============
  const goToNextLevel = useCallback(() => {
    const nextIndex = currentLevelIndex + 1;
    
    if (nextIndex >= INITIAL_LEVELS.length) {
      // Tüm seviyeler bitti - oyunu bitir
      const time = Math.round((new Date().getTime() - startTime.getTime()) / 1000);
      onGameEnd('Kodlama Oyunu', time, moves, errors);
      return;
    }

    // Sonraki seviyeye geç
    const nextLevel = INITIAL_LEVELS[nextIndex];
    setCurrentLevelIndex(nextIndex);
    setLevel(nextLevel);
    setPlayerPos(nextLevel.startPos);
    setCommands([]);
    setGameStatus(GameStatus.PLANNING);
    setCurrentStep(-1);
    setShowWinMessage(false);
    
    // Animasyonu sıfırla
    playerAnimX.setValue(nextLevel.startPos.x * (CELL_SIZE + CELL_GAP));
    playerAnimY.setValue(nextLevel.startPos.y * (CELL_SIZE + CELL_GAP));
    
    if (soundEnabled) {
      setTimeout(() => speakTeacher(nextLevel.story || 'Yeni bölüm!'), 300);
    }
  }, [currentLevelIndex, CELL_SIZE, CELL_GAP, soundEnabled, startTime, moves, errors, onGameEnd]);

  // Kazanınca otomatik geçiş
  useEffect(() => {
    if (gameStatus === GameStatus.WON && showWinMessage) {
      // 2 saniye bekle, sonra otomatik geç
      const timer = setTimeout(() => {
        goToNextLevel();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, showWinMessage, goToNextLevel]);

  const resetLevel = useCallback(() => {
    setPlayerPos(level.startPos);
    setPlayerDirection('RIGHT');
    setGameStatus(GameStatus.PLANNING);
    setCurrentStep(-1);
    setShowWinMessage(false);
    playerAnimX.setValue(level.startPos.x * (CELL_SIZE + CELL_GAP));
    playerAnimY.setValue(level.startPos.y * (CELL_SIZE + CELL_GAP));
  }, [level, CELL_SIZE, CELL_GAP]);

  const addCommand = (cmd: Direction) => {
    if (gameStatus === GameStatus.RUNNING || commands.length >= 10) return;
    setCommands((prev: Direction[]) => [...prev, cmd]);
    setMoves((m: number) => m + 1);
    if (soundEnabled) {
      const shorts: Record<Direction, string> = {
        [Direction.UP]: 'Yukarı!',
        [Direction.DOWN]: 'Aşağı!',
        [Direction.LEFT]: 'Sol!',
        [Direction.RIGHT]: 'Sağ!',
      };
      speakTeacher(shorts[cmd], true);
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
    const m: Record<Direction, Position> = {
      [Direction.UP]: { x: pos.x, y: pos.y - 1 },
      [Direction.DOWN]: { x: pos.x, y: pos.y + 1 },
      [Direction.LEFT]: { x: pos.x - 1, y: pos.y },
      [Direction.RIGHT]: { x: pos.x + 1, y: pos.y },
    };
    return m[dir];
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
          if (soundEnabled) speakTeacher('Tekrar dene!');
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
            setShowWinMessage(true);
            confettiRef.current?.start();
            if (soundEnabled) speakTeacher('Aferin!');
            // Win animasyonu
            Animated.spring(winScaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }).start();
          }, 150);
          return next;
        }
        if (isValid(next)) return next;
        clearInterval(interval);
        setErrors((e: number) => e + 1);
        setTimeout(() => {
          setGameStatus(GameStatus.LOST);
          if (soundEnabled) speakTeacher('Oops!');
        }, 150);
        return prev;
      });
      step++;
    }, 500);
    return () => clearInterval(interval);
  }, [gameStatus]);

  const handleRun = () => {
    if (commands.length === 0) return;
    resetLevel();
    setTimeout(() => setGameStatus(GameStatus.RUNNING), 50);
  };

  const selectLevel = (lvl: LevelConfig, index: number) => {
    setLevel(lvl);
    setCurrentLevelIndex(index);
    setMode(GameMode.PLAY);
    setCommands([]);
    setPlayerPos(lvl.startPos);
    setGameStatus(GameStatus.PLANNING);
    setShowWinMessage(false);
    winScaleAnim.setValue(0);
  };

  const getRotation = () => {
    const r: Record<string, string> = { UP: '-90deg', DOWN: '90deg', LEFT: '180deg', RIGHT: '0deg' };
    return r[playerDirection] || '0deg';
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
          content = <Text style={[s.cellEmoji, { fontSize: CELL_SIZE * 0.55 }]}>{themeIcons.obstacle}</Text>;
        } else if (type === CellType.GOAL) {
          bg = '#FFF9C4';
          content = <Animated.Text style={[s.cellEmoji, { fontSize: CELL_SIZE * 0.55, transform: [{ scale: bounceAnim }] }]}>{themeIcons.goal}</Animated.Text>;
        } else if (type === CellType.START && mode === GameMode.EDIT) {
          bg = '#BBDEFB';
          content = <Text style={[s.cellEmoji, { fontSize: CELL_SIZE * 0.5, opacity: 0.5 }]}>🐰</Text>;
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
        {/* Top Bar */}
        <View style={s.topBar}>
          <TouchableOpacity style={[s.exitBtn, { width: sizes.btnSize, height: sizes.btnSize, borderRadius: sizes.btnSize / 2 }]} onPress={onExit}>
            <Text style={[s.exitBtnText, { fontSize: sizes.btnSize * 0.4 }]}>✕</Text>
          </TouchableOpacity>
          
          <View style={s.levelPicker}>
            {INITIAL_LEVELS.map((lvl, idx) => (
              <TouchableOpacity
                key={lvl.id}
                style={[
                  s.levelBtn, 
                  { width: sizes.btnSize, height: sizes.btnSize, borderRadius: sizes.btnSize / 2 },
                  currentLevelIndex === idx && mode === GameMode.PLAY && s.levelBtnActive,
                  idx > currentLevelIndex && s.levelBtnLocked,
                ]}
                onPress={() => idx <= currentLevelIndex && selectLevel(lvl, idx)}
                disabled={idx > currentLevelIndex}
              >
                <Text style={[s.levelBtnEmoji, { fontSize: sizes.btnSize * 0.45 }]}>{lvl.emoji}</Text>
                {idx <= currentLevelIndex && idx < currentLevelIndex && (
                  <View style={s.checkMark}><Text style={s.checkMarkText}>✓</Text></View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.levelBtn, s.editBtn, { width: sizes.btnSize, height: sizes.btnSize, borderRadius: sizes.btnSize / 2 }, mode === GameMode.EDIT && s.levelBtnActive]}
              onPress={() => { setMode(GameMode.EDIT); setCustomGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY))); setCommands([]); }}
            >
              <Text style={[s.levelBtnEmoji, { fontSize: sizes.btnSize * 0.45 }]}>✏️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.soundBtn, { width: sizes.btnSize, height: sizes.btnSize, borderRadius: sizes.btnSize / 2 }, !soundEnabled && s.soundBtnOff]} onPress={() => setSoundEnabled(!soundEnabled)}>
            <Text style={[s.soundBtnText, { fontSize: sizes.btnSize * 0.4 }]}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Dots */}
        <View style={s.progressDots}>
          {INITIAL_LEVELS.map((_, idx) => (
            <View key={idx} style={[s.dot, idx <= currentLevelIndex && s.dotActive, idx < currentLevelIndex && s.dotComplete]} />
          ))}
        </View>

        {/* Game Grid */}
        <View style={[s.gridWrap, { width: sizes.gridSize + 16, height: sizes.gridSize + 16, backgroundColor: getThemeBg(level.theme || 'room') }]}>
          <View style={[s.grid, { gap: CELL_GAP }]}>{renderGrid()}</View>
          {mode === GameMode.PLAY && (
            <Animated.View style={[s.player, { width: CELL_SIZE, height: CELL_SIZE, transform: [{ translateX: playerAnimX }, { translateY: playerAnimY }, { rotate: getRotation() }] }]}>
              <Text style={[s.playerEmoji, { fontSize: CELL_SIZE * 0.6 }]}>🐰</Text>
            </Animated.View>
          )}
          
          {/* Win Overlay */}
          {showWinMessage && (
            <Animated.View style={[s.winOverlay, { transform: [{ scale: winScaleAnim }] }]}>
              <Text style={s.winEmoji}>🎉</Text>
            </Animated.View>
          )}
        </View>

        {/* Status - Sadece Lose göster */}
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
                  style={[s.toolBtn, { width: sizes.dPadSize, height: sizes.dPadSize, backgroundColor: t.bg }, selectedTool === t.id && s.toolBtnActive]}
                  onPress={() => setSelectedTool(t.id)}
                >
                  <Text style={[s.toolEmoji, { fontSize: sizes.dPadSize * 0.45 }]}>{t.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.editorActions}>
              <TouchableOpacity style={[s.clearBtn, { width: sizes.dPadSize, height: sizes.dPadSize }]} onPress={() => setCustomGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY)))}><Text style={s.actionEmoji}>🗑️</Text></TouchableOpacity>
              <TouchableOpacity style={[s.playBtn, { height: sizes.dPadSize }]} onPress={saveCustomLevel}><Text style={s.playBtnEmoji}>▶️</Text></TouchableOpacity>
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

            {/* D-Pad */}
            <View style={s.dPad}>
              <View style={s.dRow}>
                <View style={{ width: sizes.dPadSize, height: sizes.dPadSize }} />
                <TouchableOpacity style={[s.dBtn, { width: sizes.dPadSize, height: sizes.dPadSize, backgroundColor: '#FF9800' }]} onPress={() => addCommand(Direction.UP)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={[s.dBtnText, { fontSize: sizes.dPadSize * 0.45 }]}>⬆️</Text>
                </TouchableOpacity>
                <View style={{ width: sizes.dPadSize, height: sizes.dPadSize }} />
              </View>
              <View style={s.dRow}>
                <TouchableOpacity style={[s.dBtn, { width: sizes.dPadSize, height: sizes.dPadSize, backgroundColor: '#E91E63' }]} onPress={() => addCommand(Direction.LEFT)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={[s.dBtnText, { fontSize: sizes.dPadSize * 0.45 }]}>⬅️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dBtn, { width: sizes.dPadSize, height: sizes.dPadSize, backgroundColor: '#9C27B0' }]} onPress={() => addCommand(Direction.DOWN)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={[s.dBtnText, { fontSize: sizes.dPadSize * 0.45 }]}>⬇️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dBtn, { width: sizes.dPadSize, height: sizes.dPadSize, backgroundColor: '#4CAF50' }]} onPress={() => addCommand(Direction.RIGHT)} disabled={gameStatus === GameStatus.RUNNING}>
                  <Text style={[s.dBtnText, { fontSize: sizes.dPadSize * 0.45 }]}>➡️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions */}
            <View style={s.actions}>
              <TouchableOpacity style={[s.resetBtn, { width: sizes.dPadSize, height: sizes.dPadSize }]} onPress={clearCommands}><Text style={s.actionEmoji}>🔄</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.goBtn, { height: sizes.dPadSize }, (gameStatus === GameStatus.RUNNING || commands.length === 0) && s.goBtnOff]}
                onPress={handleRun}
                disabled={gameStatus === GameStatus.RUNNING || commands.length === 0}
              >
                <Text style={s.goBtnText}>{gameStatus === GameStatus.RUNNING ? '🏃' : '▶️'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <ConfettiCannon ref={confettiRef} count={60} origin={{ x: width / 2, y: 0 }} autoStart={false} fadeOut />
    </DynamicBackground>
  );
}

// ============== STYLES ==============
const s = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'space-evenly', // Eşit dağılım
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  
  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 8 },
  exitBtn: { backgroundColor: '#EF5350', justifyContent: 'center', alignItems: 'center' },
  exitBtnText: { color: '#FFF', fontWeight: 'bold' },
  levelPicker: { flexDirection: 'row', gap: 6 },
  levelBtn: { backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'transparent' },
  levelBtnActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  levelBtnLocked: { opacity: 0.4 },
  levelBtnEmoji: {},
  editBtn: { backgroundColor: '#FFF8E1' },
  soundBtn: { backgroundColor: '#64B5F6', justifyContent: 'center', alignItems: 'center' },
  soundBtnOff: { backgroundColor: '#BDBDBD' },
  soundBtnText: {},
  checkMark: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#4CAF50', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  checkMarkText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // Progress Dots
  progressDots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E0E0E0' },
  dotActive: { backgroundColor: '#64B5F6' },
  dotComplete: { backgroundColor: '#4CAF50' },

  // Grid
  gridWrap: { borderRadius: 16, padding: 8, position: 'relative' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E0E0E0' },
  cellEmoji: {},
  player: { position: 'absolute', top: 8, left: 8, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  playerEmoji: {},
  winOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 16 },
  winEmoji: { fontSize: 60 },

  // Status
  statusLose: { backgroundColor: '#FFCDD2', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 },
  statusEmoji: { fontSize: 28 },

  // Editor
  editorPanel: { alignItems: 'center', gap: 10 },
  toolRow: { flexDirection: 'row', gap: 8 },
  toolBtn: { borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'transparent' },
  toolBtnActive: { borderColor: '#7B1FA2', transform: [{ scale: 1.1 }] },
  toolEmoji: {},
  editorActions: { flexDirection: 'row', gap: 10 },
  clearBtn: { borderRadius: 28, backgroundColor: '#FFCDD2', justifyContent: 'center', alignItems: 'center' },
  playBtn: { paddingHorizontal: 30, borderRadius: 28, backgroundColor: '#7B1FA2', justifyContent: 'center', alignItems: 'center' },
  playBtnEmoji: { fontSize: 26 },
  actionEmoji: { fontSize: 24 },

  // Command Queue
  cmdQueue: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, minHeight: 48, gap: 5 },
  cmdEmpty: { fontSize: 20, color: '#BDBDBD' },
  cmdItem: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cmdItemActive: { transform: [{ scale: 1.2 }], borderWidth: 2, borderColor: '#FFD700' },
  cmdItemDone: { opacity: 0.4 },
  cmdEmoji: { fontSize: 18 },
  cmdClear: { marginLeft: 6, backgroundColor: '#FFCDD2', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cmdClearText: { fontSize: 16 },

  // D-Pad
  dPad: { gap: 6 },
  dRow: { flexDirection: 'row', gap: 6 },
  dBtn: { borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 },
  dBtnText: {},

  // Actions
  actions: { flexDirection: 'row', gap: 12 },
  resetBtn: { borderRadius: 28, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#B0BEC5' },
  goBtn: { paddingHorizontal: 40, borderRadius: 28, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#2E7D32' },
  goBtnOff: { backgroundColor: '#BDBDBD', borderBottomColor: '#9E9E9E' },
  goBtnText: { fontSize: 28 },
});
