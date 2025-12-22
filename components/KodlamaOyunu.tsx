import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

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
}

// ============== CONSTANTS ==============
const INITIAL_LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Odam: Oyuncak Sepeti',
    gridSize: 4,
    startPos: { x: 0, y: 0 },
    goalPos: { x: 3, y: 2 },
    obstacles: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    story:
      'Merhaba minik kaşif! Burası senin odan. Yerdeki oyuncakların üzerinden atlayamazsın. Sepetine (🧸) ulaşmak için yolu çizer misin?',
    theme: 'room',
  },
  {
    id: 2,
    name: 'Bahçe: Çiçek Yolu',
    gridSize: 4,
    startPos: { x: 0, y: 3 },
    goalPos: { x: 3, y: 0 },
    obstacles: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
    ],
    story:
      'Şimdi bahçedeyiz! Çiçeklerin ve ağaçların etrafından dolaşarak gizli hazineye (🌻) gitmemiz gerekiyor. En güvenli yol hangisi?',
    theme: 'garden',
  },
  {
    id: 3,
    name: 'Oyun Parkı: Kaydırak',
    gridSize: 5,
    startPos: { x: 2, y: 4 },
    goalPos: { x: 2, y: 0 },
    obstacles: [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ],
    story:
      'Oyun parkında kaydırağa (🎡) gitmek istiyorsun ama kum havuzunun etrafından dolaşmalısın. Hadi planını yap!',
    theme: 'park',
  },
];

// ============== AUDIO UTILS ==============
const speakTeacher = (text: string) => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.pitch = 1.1;
    utterance.rate = 0.9;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

const stopSpeech = () => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

// ============== THEME ICONS ==============
const getThemeIcons = (theme: string) => {
  switch (theme) {
    case 'garden':
      return { obstacle: '🌳', goal: '🌻' };
    case 'park':
      return { obstacle: '🛝', goal: '🎡' };
    default:
      return { obstacle: '🪑', goal: '🧸' };
  }
};

const getThemeBackground = (theme: string) => {
  switch (theme) {
    case 'garden':
      return '#E8F5E9';
    case 'park':
      return '#FFF3E0';
    default:
      return '#ECEFF1';
  }
};

// ============== COMPONENT PROPS ==============
interface KodlamaOyunuProps {
  onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number) => void;
  onExit?: () => void;
}

// ============== MAIN COMPONENT ==============
export default function KodlamaOyunu({ onGameEnd, onExit }: KodlamaOyunuProps) {
  // --- State ---
  const [mode, setMode] = useState<GameMode>(GameMode.PLAY);
  const [level, setLevel] = useState<LevelConfig>(INITIAL_LEVELS[0]);
  const [playerPos, setPlayerPos] = useState<Position>(INITIAL_LEVELS[0].startPos);
  const [playerDirection, setPlayerDirection] = useState<string>('RIGHT');
  const [commands, setCommands] = useState<Direction[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLANNING);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Editor State
  const [selectedTool, setSelectedTool] = useState<EditorTool>(CellType.WALL);
  const [customLevelGrid, setCustomLevelGrid] = useState<CellType[][]>(
    Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY))
  );

  // Stats
  const [totalMoves, setTotalMoves] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [levelsCompleted, setLevelsCompleted] = useState(0);

  // Animation
  const playerAnimX = useRef(new Animated.Value(0)).current;
  const playerAnimY = useRef(new Animated.Value(0)).current;

  // Confetti
  const confettiRef = useRef<ConfettiCannon>(null);

  // Calculate grid dimensions
  const GRID_CONTAINER_SIZE = Math.min(width - 40, 380);
  const gridSize = mode === GameMode.EDIT ? 4 : level.gridSize;
  const CELL_GAP = 8;
  const CELL_SIZE = (GRID_CONTAINER_SIZE - CELL_GAP * (gridSize - 1) - 20) / gridSize;

  // Theme icons
  const themeIcons = getThemeIcons(level.theme || 'room');

  useEffect(() => {
    setStartTime(new Date());
  }, []);

  // Update player animation position
  useEffect(() => {
    Animated.parallel([
      Animated.spring(playerAnimX, {
        toValue: playerPos.x * (CELL_SIZE + CELL_GAP),
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(playerAnimY, {
        toValue: playerPos.y * (CELL_SIZE + CELL_GAP),
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [playerPos, CELL_SIZE, CELL_GAP]);

  // Voice effects
  useEffect(() => {
    if (!soundEnabled) {
      stopSpeech();
      return;
    }

    if (mode === GameMode.PLAY) {
      if (gameStatus === GameStatus.PLANNING && commands.length === 0) {
        speakTeacher(level.story || 'Hadi başlayalım!');
      } else if (gameStatus === GameStatus.WON) {
        speakTeacher('Harikasın! Yolu buldun. Bir sonraki maceraya hazır mısın?');
      } else if (gameStatus === GameStatus.LOST) {
        speakTeacher('Aaa, bir engele takıldık. Tekrar deneyelim mi?');
      }
    } else if (mode === GameMode.EDIT) {
      speakTeacher('Şimdi kendi haritanı tasarla. Eşyaları odaya yerleştir.');
    }
  }, [level, gameStatus, mode, soundEnabled]);

  // --- Helpers ---
  const resetLevel = useCallback(() => {
    setPlayerPos(level.startPos);
    setPlayerDirection('RIGHT');
    setGameStatus(GameStatus.PLANNING);
    setCurrentStep(-1);
    playerAnimX.setValue(level.startPos.x * (CELL_SIZE + CELL_GAP));
    playerAnimY.setValue(level.startPos.y * (CELL_SIZE + CELL_GAP));
    stopSpeech();
  }, [level, CELL_SIZE, CELL_GAP]);

  const clearCommands = () => {
    if (gameStatus === GameStatus.RUNNING) return;
    setCommands([]);
    resetLevel();
    if (soundEnabled) speakTeacher('Hepsini sildim. Baştan başlayalım!');
  };

  const addCommand = (cmd: Direction) => {
    if (gameStatus === GameStatus.RUNNING) return;
    if (commands.length >= 20) return;
    setCommands((prev: Direction[]) => [...prev, cmd]);
    setTotalMoves((m: number) => m + 1);

    if (soundEnabled) {
      const dirTexts: Record<Direction, string> = {
        [Direction.UP]: 'Yukarı gidiyoruz',
        [Direction.DOWN]: 'Aşağı iniyoruz',
        [Direction.LEFT]: 'Sola dönüyoruz',
        [Direction.RIGHT]: 'Sağa dönüyoruz',
      };
      speakTeacher(dirTexts[cmd]);
    }
  };

  const removeLastCommand = () => {
    if (gameStatus === GameStatus.RUNNING) return;
    setCommands((prev: Direction[]) => prev.slice(0, -1));
    if (soundEnabled) speakTeacher('Son hareketi sildim.');
  };

  // --- Editor Logic ---
  const handleEditorCellClick = (x: number, y: number) => {
    if (mode !== GameMode.EDIT) return;

    const newGrid = [...customLevelGrid.map((row: CellType[]) => [...row])];

    if (selectedTool === CellType.START) {
      for (let ry = 0; ry < 4; ry++) {
        for (let rx = 0; rx < 4; rx++) {
          if (newGrid[ry][rx] === CellType.START) newGrid[ry][rx] = CellType.EMPTY;
        }
      }
      newGrid[y][x] = CellType.START;
    } else if (selectedTool === CellType.GOAL) {
      for (let ry = 0; ry < 4; ry++) {
        for (let rx = 0; rx < 4; rx++) {
          if (newGrid[ry][rx] === CellType.GOAL) newGrid[ry][rx] = CellType.EMPTY;
        }
      }
      newGrid[y][x] = CellType.GOAL;
    } else if (selectedTool === 'ERASER') {
      newGrid[y][x] = CellType.EMPTY;
    } else {
      newGrid[y][x] = CellType.WALL;
    }

    setCustomLevelGrid(newGrid);
  };

  const handleSaveCustomLevel = () => {
    let start: Position | null = null;
    let goal: Position | null = null;
    const obstacles: Position[] = [];

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (customLevelGrid[y][x] === CellType.START) start = { x, y };
        if (customLevelGrid[y][x] === CellType.GOAL) goal = { x, y };
        if (customLevelGrid[y][x] === CellType.WALL || customLevelGrid[y][x] === CellType.OBSTACLE) {
          obstacles.push({ x, y });
        }
      }
    }

    if (!start || !goal) {
      if (soundEnabled) speakTeacher('Haritada bir başlangıç tavşanı ve bir hedef oyuncak olmalı.');
      return;
    }

    const newLevel: LevelConfig = {
      id: 'custom',
      name: 'Senin Haritan',
      gridSize: 4,
      startPos: start,
      goalPos: goal,
      obstacles: obstacles,
      story: 'Kendi çizdiğin haritada yolunu bulabilir misin?',
      theme: 'room',
    };

    setLevel(newLevel);
    setMode(GameMode.PLAY);
    setPlayerPos(start);
    setCommands([]);
    setGameStatus(GameStatus.PLANNING);
    if (soundEnabled) speakTeacher('Harita hazır! Hadi şimdi yolu planlayalım.');
  };

  const initEditor = () => {
    setMode(GameMode.EDIT);
    setCustomLevelGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY)));
    setGameStatus(GameStatus.PLANNING);
    setCommands([]);
  };

  // --- Game Loop Logic ---
  const getNextPosition = (pos: Position, dir: Direction): Position => {
    let { x, y } = pos;
    switch (dir) {
      case Direction.UP: y -= 1; break;
      case Direction.DOWN: y += 1; break;
      case Direction.LEFT: x -= 1; break;
      case Direction.RIGHT: x += 1; break;
    }
    return { x, y };
  };

  const isObstacle = (pos: Position) => {
    return level.obstacles.some((o: Position) => o.x === pos.x && o.y === pos.y);
  };

  const isGoal = (pos: Position) => {
    return level.goalPos.x === pos.x && level.goalPos.y === pos.y;
  };

  const isValidMove = (pos: Position) => {
    return (
      pos.x >= 0 &&
      pos.x < level.gridSize &&
      pos.y >= 0 &&
      pos.y < level.gridSize &&
      !isObstacle(pos)
    );
  };

  useEffect(() => {
    if (gameStatus !== GameStatus.RUNNING) return;

    let step = 0;
    const intervalId = setInterval(() => {
      if (step >= commands.length) {
        clearInterval(intervalId);
        if (gameStatus !== GameStatus.WON) {
          setGameStatus(GameStatus.LOST);
          setTotalErrors((e: number) => e + 1);
        }
        return;
      }

      const cmd = commands[step];
      setCurrentStep(step);
      setPlayerDirection(cmd);

      setPlayerPos((prevPos: Position) => {
        const nextPos = getNextPosition(prevPos, cmd);

        if (isGoal(nextPos)) {
          setTimeout(() => {
            setGameStatus(GameStatus.WON);
            setLevelsCompleted((l: number) => l + 1);
            confettiRef.current?.start();
          }, 300);
          return nextPos;
        }

        if (isValidMove(nextPos)) {
          return nextPos;
        } else {
          clearInterval(intervalId);
          setTotalErrors((e: number) => e + 1);
          setTimeout(() => setGameStatus(GameStatus.LOST), 300);
          return prevPos;
        }
      });

      step++;
    }, 800);

    return () => clearInterval(intervalId);
  }, [gameStatus, commands]);

  // --- Handlers ---
  const handleRun = () => {
    if (commands.length === 0) return;
    resetLevel();
    setTimeout(() => {
      setGameStatus(GameStatus.RUNNING);
    }, 100);
  };

  const selectLevel = (lvl: LevelConfig) => {
    setLevel(lvl);
    setMode(GameMode.PLAY);
    setCommands([]);
    setPlayerPos(lvl.startPos);
    setGameStatus(GameStatus.PLANNING);
    playerAnimX.setValue(lvl.startPos.x * (CELL_SIZE + CELL_GAP));
    playerAnimY.setValue(lvl.startPos.y * (CELL_SIZE + CELL_GAP));
  };

  const handleFinishGame = () => {
    const endTime = new Date();
    const totalTime = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : 0;
    onGameEnd('Kodlama Oyunu', totalTime, totalMoves, totalErrors);
  };

  // --- Direction helpers ---
  const getDirectionIcon = (dir: Direction) => {
    switch (dir) {
      case Direction.UP: return '⬆️';
      case Direction.DOWN: return '⬇️';
      case Direction.LEFT: return '⬅️';
      case Direction.RIGHT: return '➡️';
    }
  };

  const getDirectionColor = (dir: Direction) => {
    switch (dir) {
      case Direction.UP: return '#FFB74D';
      case Direction.DOWN: return '#9C27B0';
      case Direction.LEFT: return '#E91E63';
      case Direction.RIGHT: return '#4CAF50';
    }
  };

  const getPlayerRotation = () => {
    switch (playerDirection) {
      case 'UP': return '-90deg';
      case 'DOWN': return '90deg';
      case 'LEFT': return '180deg';
      default: return '0deg';
    }
  };

  // --- Render Grid ---
  const renderGrid = () => {
    const size = mode === GameMode.EDIT ? 4 : level.gridSize;
    const cells = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let cellType = CellType.EMPTY;

        if (mode === GameMode.PLAY) {
          if (level.obstacles.some((o: Position) => o.x === x && o.y === y)) cellType = CellType.OBSTACLE;
          if (level.goalPos.x === x && level.goalPos.y === y) cellType = CellType.GOAL;
          if (level.startPos.x === x && level.startPos.y === y) cellType = CellType.START;
        } else {
          cellType = customLevelGrid[y][x];
        }

        let cellStyle: any = [styles.cell, { width: CELL_SIZE, height: CELL_SIZE }];
        let content = null;

        if (cellType === CellType.WALL || cellType === CellType.OBSTACLE) {
          cellStyle = [...cellStyle, styles.obstacleCell];
          content = <Text style={styles.cellIcon}>{themeIcons.obstacle}</Text>;
        } else if (cellType === CellType.GOAL) {
          cellStyle = [...cellStyle, styles.goalCell];
          content = <Text style={[styles.cellIcon, styles.bounceIcon]}>{themeIcons.goal}</Text>;
        } else if (cellType === CellType.START) {
          cellStyle = [...cellStyle, styles.startCell];
          if (mode === GameMode.EDIT) {
            content = <Text style={[styles.cellIcon, { opacity: 0.6 }]}>🐰</Text>;
          }
        }

        cells.push(
          <TouchableOpacity
            key={`${x}-${y}`}
            style={cellStyle}
            onPress={() => handleEditorCellClick(x, y)}
            disabled={mode !== GameMode.EDIT}
            activeOpacity={mode === GameMode.EDIT ? 0.7 : 1}
          >
            {content}
          </TouchableOpacity>
        );
      }
    }
    return cells;
  };

  // --- Render Editor Tools ---
  const renderEditorTools = () => {
    const tools: { id: EditorTool; label: string; icon: string; color: string }[] = [
      { id: CellType.WALL, label: 'Engel', icon: '🪑', color: '#607D8B' },
      { id: CellType.START, label: 'Başla', icon: '🐰', color: '#2196F3' },
      { id: CellType.GOAL, label: 'Hedef', icon: '🧸', color: '#FFB74D' },
      { id: 'ERASER', label: 'Silgi', icon: '🧼', color: '#E0E0E0' },
    ];

    return (
      <View style={styles.editorContainer}>
        <Text style={styles.editorTitle}>🎨 Harita Atölyesi</Text>
        <Text style={styles.editorSubtitle}>Bir eşya seç ve kutulara dokun</Text>

        <View style={styles.toolsGrid}>
          {tools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.toolButton,
                { backgroundColor: tool.color },
                selectedTool === tool.id && styles.toolButtonActive,
              ]}
              onPress={() => setSelectedTool(tool.id)}
            >
              <Text style={styles.toolIcon}>{tool.icon}</Text>
              <Text style={[styles.toolLabel, tool.id === 'ERASER' && { color: '#333' }]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.editorActions}>
          <TouchableOpacity
            style={styles.clearEditorButton}
            onPress={() => setCustomLevelGrid(Array(4).fill(null).map(() => Array(4).fill(CellType.EMPTY)))}
          >
            <Text style={styles.clearEditorButtonText}>🗑️ Temizle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playEditorButton} onPress={handleSaveCustomLevel}>
            <Text style={styles.playEditorButtonText}>✅ Oyna!</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============== MAIN RENDER ==============
  return (
    <DynamicBackground>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitButton} onPress={onExit}>
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>🗺️ Minik Kaşif</Text>
            <Text style={styles.subtitle}>Harita ve Kodlama Atölyesi</Text>
          </View>
          <TouchableOpacity
            style={[styles.soundButton, !soundEnabled && styles.soundButtonMuted]}
            onPress={() => {
              if (soundEnabled) stopSpeech();
              setSoundEnabled(!soundEnabled);
            }}
          >
            <Text style={styles.soundButtonText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        {/* Level Selection & Editor Button */}
        <View style={styles.levelSelector}>
          {INITIAL_LEVELS.map((lvl) => (
            <TouchableOpacity
              key={lvl.id}
              style={[
                styles.levelButton,
                level.id === lvl.id && mode === GameMode.PLAY && styles.levelButtonActive,
              ]}
              onPress={() => selectLevel(lvl)}
            >
              <Text
                style={[
                  styles.levelButtonText,
                  level.id === lvl.id && mode === GameMode.PLAY && styles.levelButtonTextActive,
                ]}
              >
                {String(lvl.name).split(':')[0]}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.editorButton, mode === GameMode.EDIT && styles.editorButtonActive]}
            onPress={initEditor}
          >
            <Text style={[styles.editorButtonText, mode === GameMode.EDIT && { color: '#FFF' }]}>✏️ Çiz</Text>
          </TouchableOpacity>
        </View>

        {/* Story Card */}
        <View style={styles.storyCard}>
          <Text style={styles.storyEmoji}>👩‍🏫</Text>
          <View style={styles.storyContent}>
            <Text style={styles.storyTitle}>
              {mode === GameMode.EDIT ? 'Harita Çizme Zamanı!' : level.name}
            </Text>
            <Text style={styles.storyText}>
              {mode === GameMode.EDIT
                ? 'Kendi odanı veya bahçeni çizmek ister misin? Eşyaları yerleştir ve sonra "Oyna" düğmesine bas.'
                : level.story}
            </Text>
          </View>
        </View>

        {/* Progress Steps (Play Mode Only) */}
        {mode === GameMode.PLAY && (
          <View style={styles.progressSteps}>
            <View style={[styles.progressStep, gameStatus === GameStatus.PLANNING && styles.progressStepActive]}>
              <Text style={styles.progressStepIcon}>🤔</Text>
              <Text style={styles.progressStepText}>Düşün</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, commands.length > 0 && styles.progressStepActive]}>
              <Text style={styles.progressStepIcon}>👇</Text>
              <Text style={styles.progressStepText}>Sırala</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, gameStatus === GameStatus.RUNNING && styles.progressStepActive]}>
              <Text style={styles.progressStepIcon}>🏃</Text>
              <Text style={styles.progressStepText}>Git</Text>
            </View>
          </View>
        )}

        {/* Game Grid */}
        <View
          style={[
            styles.gridContainer,
            { width: GRID_CONTAINER_SIZE, height: GRID_CONTAINER_SIZE, backgroundColor: getThemeBackground(level.theme || 'room') },
          ]}
        >
          <View style={[styles.grid, { gap: CELL_GAP }]}>{renderGrid()}</View>

          {/* Player Overlay (Play Mode Only) */}
          {mode === GameMode.PLAY && (
            <Animated.View
              style={[
                styles.player,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  transform: [
                    { translateX: playerAnimX },
                    { translateY: playerAnimY },
                    { rotate: getPlayerRotation() },
                  ],
                },
              ]}
            >
              <Text style={styles.playerIcon}>🐰</Text>
            </Animated.View>
          )}
        </View>

        {/* Status Messages */}
        {mode === GameMode.PLAY && gameStatus === GameStatus.WON && (
          <View style={styles.statusWon}>
            <Text style={styles.statusText}>🎉 Harika! Hedefe ulaştın!</Text>
            <TouchableOpacity style={styles.finishButton} onPress={handleFinishGame}>
              <Text style={styles.finishButtonText}>Oyunu Bitir ⭐</Text>
            </TouchableOpacity>
          </View>
        )}
        {mode === GameMode.PLAY && gameStatus === GameStatus.LOST && (
          <View style={styles.statusLost}>
            <Text style={styles.statusText}>😕 Ah, engele çarptık. Tekrar dene!</Text>
          </View>
        )}

        {/* Editor Controls or Play Controls */}
        {mode === GameMode.EDIT ? (
          renderEditorTools()
        ) : (
          <>
            {/* Command Queue */}
            <View style={styles.commandQueue}>
              <View style={styles.commandQueueHeader}>
                <Text style={styles.commandQueueTitle}>📝 Yapılacaklar ({commands.length})</Text>
                {commands.length > 0 && gameStatus !== GameStatus.RUNNING && (
                  <View style={styles.commandQueueActions}>
                    <TouchableOpacity style={styles.clearLastButton} onPress={removeLastCommand}>
                      <Text style={styles.clearLastButtonText}>Son ⌫</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clearAllButton} onPress={clearCommands}>
                      <Text style={styles.clearAllButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commandList}>
                {commands.length === 0 ? (
                  <Text style={styles.emptyCommandText}>Henüz hareket eklemedin. Aşağıdaki oklara bas!</Text>
                ) : (
                  commands.map((cmd: Direction, idx: number) => (
                    <View
                      key={idx}
                      style={[
                        styles.commandItem,
                        { backgroundColor: getDirectionColor(cmd) },
                        currentStep === idx && styles.commandItemActive,
                        currentStep > idx && styles.commandItemDone,
                      ]}
                    >
                      <Text style={styles.commandItemText}>{getDirectionIcon(cmd)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Direction Controls */}
            <View style={styles.controls}>
              <Text style={styles.controlsTitle}>🎮 Yön Seç</Text>
              <View style={styles.directionPad}>
                <View style={styles.directionRow}>
                  <View style={styles.directionSpacer} />
                  <TouchableOpacity
                    style={[styles.directionButton, { backgroundColor: '#FFB74D' }]}
                    onPress={() => addCommand(Direction.UP)}
                    disabled={gameStatus === GameStatus.RUNNING}
                  >
                    <Text style={styles.directionButtonText}>⬆️</Text>
                  </TouchableOpacity>
                  <View style={styles.directionSpacer} />
                </View>
                <View style={styles.directionRow}>
                  <TouchableOpacity
                    style={[styles.directionButton, { backgroundColor: '#E91E63' }]}
                    onPress={() => addCommand(Direction.LEFT)}
                    disabled={gameStatus === GameStatus.RUNNING}
                  >
                    <Text style={styles.directionButtonText}>⬅️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.directionButton, { backgroundColor: '#9C27B0' }]}
                    onPress={() => addCommand(Direction.DOWN)}
                    disabled={gameStatus === GameStatus.RUNNING}
                  >
                    <Text style={styles.directionButtonText}>⬇️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.directionButton, { backgroundColor: '#4CAF50' }]}
                    onPress={() => addCommand(Direction.RIGHT)}
                    disabled={gameStatus === GameStatus.RUNNING}
                  >
                    <Text style={styles.directionButtonText}>➡️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setCommands([]);
                  resetLevel();
                }}
              >
                <Text style={styles.resetButtonText}>🔄 Başa Dön</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.runButton,
                  (gameStatus === GameStatus.RUNNING || commands.length === 0) && styles.runButtonDisabled,
                ]}
                onPress={handleRun}
                disabled={gameStatus === GameStatus.RUNNING || commands.length === 0}
              >
                <Text style={styles.runButtonText}>
                  {gameStatus === GameStatus.RUNNING ? '🏃 Gidiyor...' : '▶️ BAŞLA!'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <ConfettiCannon
        ref={confettiRef}
        count={100}
        origin={{ x: width / 2, y: 0 }}
        autoStart={false}
        fadeOut
      />
    </DynamicBackground>
  );
}

// ============== STYLES ==============
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
    marginTop: 30,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  subtitle: {
    fontSize: 13,
    color: '#546E7A',
    marginTop: 2,
  },
  exitButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  soundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundButtonMuted: {
    backgroundColor: 'rgba(158, 158, 158, 0.9)',
  },
  soundButtonText: {
    fontSize: 18,
  },
  levelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  levelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  levelButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#1565C0',
  },
  levelButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  levelButtonTextActive: {
    color: 'white',
  },
  editorButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  editorButtonActive: {
    backgroundColor: '#FFB74D',
    borderColor: '#F57C00',
  },
  editorButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F57C00',
  },
  storyCard: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storyEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  storyContent: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 4,
  },
  storyText: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  progressStep: {
    alignItems: 'center',
    opacity: 0.4,
  },
  progressStepActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  progressStepIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  progressStepText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
    borderStyle: 'dashed',
  },
  gridContainer: {
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
    position: 'relative',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  obstacleCell: {
    backgroundColor: '#607D8B',
    borderColor: '#455A64',
  },
  goalCell: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFB74D',
  },
  startCell: {
    backgroundColor: '#E3F2FD',
    borderColor: '#64B5F6',
    borderStyle: 'dashed',
  },
  cellIcon: {
    fontSize: 26,
  },
  bounceIcon: {},
  player: {
    position: 'absolute',
    top: 10,
    left: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playerIcon: {
    fontSize: 30,
  },
  statusWon: {
    backgroundColor: '#C8E6C9',
    padding: 14,
    borderRadius: 15,
    marginBottom: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#81C784',
  },
  statusLost: {
    backgroundColor: '#FFCDD2',
    padding: 14,
    borderRadius: 15,
    marginBottom: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E57373',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  finishButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  editorContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#E1BEE7',
    borderStyle: 'dashed',
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7B1FA2',
    textAlign: 'center',
    marginBottom: 4,
  },
  editorSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  toolButton: {
    width: 70,
    height: 70,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  toolButtonActive: {
    opacity: 1,
    borderWidth: 3,
    borderColor: '#7B1FA2',
    transform: [{ scale: 1.1 }],
  },
  toolIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  clearEditorButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFCDD2',
    alignItems: 'center',
  },
  clearEditorButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C62828',
  },
  playEditorButton: {
    flex: 2,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#7B1FA2',
    alignItems: 'center',
  },
  playEditorButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  commandQueue: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    width: '100%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: '#E0E0E0',
  },
  commandQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commandQueueTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  commandQueueActions: {
    flexDirection: 'row',
    gap: 8,
  },
  clearLastButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  clearLastButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
  },
  clearAllButton: {
    backgroundColor: '#FFCDD2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  clearAllButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#C62828',
  },
  commandList: {
    minHeight: 55,
  },
  emptyCommandText: {
    color: '#9E9E9E',
    fontStyle: 'italic',
    paddingVertical: 12,
    fontSize: 13,
  },
  commandItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commandItemActive: {
    transform: [{ scale: 1.2 }],
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  commandItemDone: {
    opacity: 0.4,
  },
  commandItemText: {
    fontSize: 22,
  },
  controls: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E3F2FD',
  },
  controlsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  directionPad: {
    alignItems: 'center',
  },
  directionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  directionSpacer: {
    width: 65,
    height: 65,
  },
  directionButton: {
    width: 65,
    height: 65,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  directionButtonText: {
    fontSize: 28,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  resetButton: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#B0BEC5',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#546E7A',
  },
  runButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#2E7D32',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  runButtonDisabled: {
    backgroundColor: '#BDBDBD',
    borderBottomColor: '#9E9E9E',
    shadowOpacity: 0,
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
