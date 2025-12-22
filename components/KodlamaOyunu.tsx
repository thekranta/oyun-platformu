import { useEffect, useRef, useState } from 'react';
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
import ProgressBar from './ProgressBar';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Types
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

// Initial Levels
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
      'Merhaba minik kaşif! Oyuncakların (engeller) etrafından dolaşarak sepetine (🧸) ulaşabilir misin?',
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
      'Şimdi bahçedeyiz! Çiçeklerin etrafından dolaşarak gizli hazineye (🌻) gidebilir misin?',
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
      'Oyun parkında kaydırağa (🎡) gitmek istiyorsun ama kum havuzunun etrafından dolaşmalısın!',
    theme: 'park',
  },
];

// Speech synthesis helper
const speakTeacher = (text: string) => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.pitch = 1.1;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

const stopSpeech = () => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

interface KodlamaOyunuProps {
  onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number) => void;
  onExit?: () => void;
}

export default function KodlamaOyunu({ onGameEnd, onExit }: KodlamaOyunuProps) {
  // Game State
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [level, setLevel] = useState<LevelConfig>(INITIAL_LEVELS[0]);
  const [playerPos, setPlayerPos] = useState<Position>(INITIAL_LEVELS[0].startPos);
  const [playerDirection, setPlayerDirection] = useState<Direction>(Direction.RIGHT);
  const [commands, setCommands] = useState<Direction[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLANNING);
  const [currentStep, setCurrentStep] = useState<number>(-1);

  // Stats
  const [totalMoves, setTotalMoves] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Animation
  const playerAnimX = useRef(new Animated.Value(0)).current;
  const playerAnimY = useRef(new Animated.Value(0)).current;

  // Confetti
  const confettiRef = useRef<ConfettiCannon>(null);

  // Calculate grid cell size
  const GRID_CONTAINER_SIZE = Math.min(width - 40, 400);
  const CELL_GAP = 8;
  const CELL_SIZE = (GRID_CONTAINER_SIZE - CELL_GAP * (level.gridSize - 1)) / level.gridSize;

  useEffect(() => {
    setStartTime(new Date());
  }, []);

  useEffect(() => {
    // Update player animation position
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

  useEffect(() => {
    if (soundEnabled && gameStatus === GameStatus.PLANNING && commands.length === 0) {
      speakTeacher(level.story || 'Hadi başlayalım!');
    } else if (soundEnabled && gameStatus === GameStatus.WON) {
      speakTeacher('Harikasın! Yolu buldun!');
    } else if (soundEnabled && gameStatus === GameStatus.LOST) {
      speakTeacher('Bir engele takıldık. Tekrar deneyelim mi?');
    }
  }, [level, gameStatus, soundEnabled]);

  const resetLevel = () => {
    setPlayerPos(level.startPos);
    setPlayerDirection(Direction.RIGHT);
    setGameStatus(GameStatus.PLANNING);
    setCurrentStep(-1);
    playerAnimX.setValue(level.startPos.x * (CELL_SIZE + CELL_GAP));
    playerAnimY.setValue(level.startPos.y * (CELL_SIZE + CELL_GAP));
    stopSpeech();
  };

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
      const directionTexts: Record<Direction, string> = {
        [Direction.UP]: 'Yukarı',
        [Direction.DOWN]: 'Aşağı',
        [Direction.LEFT]: 'Sola',
        [Direction.RIGHT]: 'Sağa',
      };
      speakTeacher(directionTexts[cmd]);
    }
  };

  const removeLastCommand = () => {
    if (gameStatus === GameStatus.RUNNING) return;
    setCommands((prev: Direction[]) => prev.slice(0, -1));
    if (soundEnabled) speakTeacher('Son hareketi sildim.');
  };

  const getNextPosition = (pos: Position, dir: Direction): Position => {
    let { x, y } = pos;
    switch (dir) {
      case Direction.UP:
        y -= 1;
        break;
      case Direction.DOWN:
        y += 1;
        break;
      case Direction.LEFT:
        x -= 1;
        break;
      case Direction.RIGHT:
        x += 1;
        break;
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
            confettiRef.current?.start();

            // Check if all levels completed
            if (currentLevelIndex >= INITIAL_LEVELS.length - 1) {
              // Game completed!
              const endTime = new Date();
              const totalTime = startTime
                ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
                : 0;
              setTimeout(() => {
                onGameEnd('Kodlama Oyunu', totalTime, totalMoves, totalErrors);
              }, 2000);
            }
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
  }, [gameStatus]);

  const handleRun = () => {
    if (commands.length === 0) return;
    resetLevel();
    setTimeout(() => {
      setGameStatus(GameStatus.RUNNING);
    }, 100);
  };

  const handleNextLevel = () => {
    const nextIndex = currentLevelIndex + 1;
    if (nextIndex < INITIAL_LEVELS.length) {
      setCurrentLevelIndex(nextIndex);
      const nextLevel = INITIAL_LEVELS[nextIndex];
      setLevel(nextLevel);
      setPlayerPos(nextLevel.startPos);
      playerAnimX.setValue(nextLevel.startPos.x * (CELL_SIZE + CELL_GAP));
      playerAnimY.setValue(nextLevel.startPos.y * (CELL_SIZE + CELL_GAP));
      setCommands([]);
      setGameStatus(GameStatus.PLANNING);
      setCurrentStep(-1);
    }
  };

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

  const themeIcons = getThemeIcons(level.theme || 'room');

  const getDirectionIcon = (dir: Direction) => {
    switch (dir) {
      case Direction.UP:
        return '⬆️';
      case Direction.DOWN:
        return '⬇️';
      case Direction.LEFT:
        return '⬅️';
      case Direction.RIGHT:
        return '➡️';
    }
  };

  const getDirectionColor = (dir: Direction) => {
    switch (dir) {
      case Direction.UP:
        return '#FFB74D';
      case Direction.DOWN:
        return '#9C27B0';
      case Direction.LEFT:
        return '#E91E63';
      case Direction.RIGHT:
        return '#4CAF50';
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < level.gridSize; y++) {
      for (let x = 0; x < level.gridSize; x++) {
        const isObstacleCell = level.obstacles.some((o: Position) => o.x === x && o.y === y);
        const isGoalCell = level.goalPos.x === x && level.goalPos.y === y;
        const isStartCell = level.startPos.x === x && level.startPos.y === y;

        let cellStyle = styles.cell;
        let content = null;

        if (isObstacleCell) {
          cellStyle = { ...styles.cell, ...styles.obstacleCell };
          content = <Text style={styles.cellIcon}>{themeIcons.obstacle}</Text>;
        } else if (isGoalCell) {
          cellStyle = { ...styles.cell, ...styles.goalCell };
          content = <Text style={[styles.cellIcon, styles.bounceIcon]}>{themeIcons.goal}</Text>;
        } else if (isStartCell) {
          cellStyle = { ...styles.cell, ...styles.startCell };
        }

        cells.push(
          <View
            key={`${x}-${y}`}
            style={[cellStyle, { width: CELL_SIZE, height: CELL_SIZE }]}
          >
            {content}
          </View>
        );
      }
    }
    return cells;
  };

  const getPlayerRotation = () => {
    switch (playerDirection) {
      case Direction.UP:
        return '-90deg';
      case Direction.DOWN:
        return '90deg';
      case Direction.LEFT:
        return '180deg';
      default:
        return '0deg';
    }
  };

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
            <Text style={styles.subtitle}>Harita ve Kodlama Oyunu</Text>
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

        {/* Progress */}
        <ProgressBar current={currentLevelIndex + 1} total={INITIAL_LEVELS.length} />

        {/* Level Selection */}
        <View style={styles.levelSelector}>
          {INITIAL_LEVELS.map((lvl, idx) => (
            <TouchableOpacity
              key={lvl.id}
              style={[
                styles.levelButton,
                currentLevelIndex === idx && styles.levelButtonActive,
                idx > currentLevelIndex && styles.levelButtonLocked,
              ]}
              onPress={() => {
                if (idx <= currentLevelIndex) {
                  setCurrentLevelIndex(idx);
                  setLevel(INITIAL_LEVELS[idx]);
                  setPlayerPos(INITIAL_LEVELS[idx].startPos);
                  setCommands([]);
                  setGameStatus(GameStatus.PLANNING);
                }
              }}
              disabled={idx > currentLevelIndex}
            >
              <Text
                style={[
                  styles.levelButtonText,
                  currentLevelIndex === idx && styles.levelButtonTextActive,
                ]}
              >
                {idx + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Story */}
        <View style={styles.storyCard}>
          <Text style={styles.storyTitle}>👩‍🏫 {level.name}</Text>
          <Text style={styles.storyText}>{level.story}</Text>
        </View>

        {/* Game Grid */}
        <View
          style={[
            styles.gridContainer,
            { width: GRID_CONTAINER_SIZE, height: GRID_CONTAINER_SIZE },
          ]}
        >
          <View
            style={[
              styles.grid,
              {
                gap: CELL_GAP,
                width: GRID_CONTAINER_SIZE,
              },
            ]}
          >
            {renderGrid()}
          </View>

          {/* Player Overlay */}
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
        </View>

        {/* Status Messages */}
        {gameStatus === GameStatus.WON && (
          <View style={styles.statusWon}>
            <Text style={styles.statusText}>🎉 Harika! Hedefe ulaştın!</Text>
            {currentLevelIndex < INITIAL_LEVELS.length - 1 && (
              <TouchableOpacity style={styles.nextLevelButton} onPress={handleNextLevel}>
                <Text style={styles.nextLevelButtonText}>Sonraki Bölüm →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {gameStatus === GameStatus.LOST && (
          <View style={styles.statusLost}>
            <Text style={styles.statusText}>😕 Engele çarptık! Tekrar dene.</Text>
          </View>
        )}

        {/* Command Queue */}
        <View style={styles.commandQueue}>
          <View style={styles.commandQueueHeader}>
            <Text style={styles.commandQueueTitle}>📝 Komutlar ({commands.length})</Text>
            {commands.length > 0 && gameStatus !== GameStatus.RUNNING && (
              <View style={styles.commandQueueActions}>
                <TouchableOpacity style={styles.clearLastButton} onPress={removeLastCommand}>
                  <Text style={styles.clearLastButtonText}>Son ⌫</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearAllButton} onPress={clearCommands}>
                  <Text style={styles.clearAllButtonText}>🗑️ Temizle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commandList}>
            {commands.length === 0 ? (
              <Text style={styles.emptyCommandText}>Henüz komut eklemedin. Aşağıdaki oklara bas!</Text>
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
              (gameStatus === GameStatus.RUNNING || commands.length === 0) &&
                styles.runButtonDisabled,
            ]}
            onPress={handleRun}
            disabled={gameStatus === GameStatus.RUNNING || commands.length === 0}
          >
            <Text style={styles.runButtonText}>
              {gameStatus === GameStatus.RUNNING ? '🏃 Gidiyor...' : '▶️ BAŞLA!'}
            </Text>
          </TouchableOpacity>
        </View>
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    marginTop: 30,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  subtitle: {
    fontSize: 14,
    color: '#546E7A',
    marginTop: 2,
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  soundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundButtonMuted: {
    backgroundColor: 'rgba(158, 158, 158, 0.9)',
  },
  soundButtonText: {
    fontSize: 20,
  },
  levelSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  levelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  levelButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#1565C0',
  },
  levelButtonLocked: {
    opacity: 0.5,
  },
  levelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  levelButtonTextActive: {
    color: 'white',
  },
  storyCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  storyText: {
    fontSize: 16,
    color: '#546E7A',
    lineHeight: 22,
  },
  gridContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    position: 'relative',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  obstacleCell: {
    backgroundColor: '#607D8B',
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
    fontSize: 28,
  },
  bounceIcon: {
    // Animation would require Animated API
  },
  player: {
    position: 'absolute',
    top: 15,
    left: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playerIcon: {
    fontSize: 32,
  },
  statusWon: {
    backgroundColor: '#C8E6C9',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#81C784',
  },
  statusLost: {
    backgroundColor: '#FFCDD2',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
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
  nextLevelButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  nextLevelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commandQueue: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commandQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commandQueueTitle: {
    fontSize: 16,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#C62828',
  },
  commandList: {
    minHeight: 60,
  },
  emptyCommandText: {
    color: '#9E9E9E',
    fontStyle: 'italic',
    paddingVertical: 15,
  },
  commandItem: {
    width: 50,
    height: 50,
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
    fontSize: 24,
  },
  controls: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E3F2FD',
  },
  controlsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 15,
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
    width: 70,
    height: 70,
  },
  directionButton: {
    width: 70,
    height: 70,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  directionButtonText: {
    fontSize: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  resetButton: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 25,
    paddingVertical: 18,
    borderRadius: 18,
    borderBottomWidth: 4,
    borderBottomColor: '#B0BEC5',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#546E7A',
  },
  runButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderRadius: 18,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});

