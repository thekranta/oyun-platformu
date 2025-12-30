import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';

interface EksikSayiBulProps {
  onGameEnd: (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
}

type DropZone = { x: number; y: number; width: number; height: number };

const NUMBERS = [1, 2, 3, 4, 5];
const TOTAL_STAGES = 5;
const { width } = Dimensions.get('window');
const CARD_SIZE = width > 600 ? 96 : 72;
const OPTION_SIZE = width > 600 ? 90 : 68;
const PLATFORM_LOGO = require('../assets/images/icon.png');

const shuffle = (items: number[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const DRAG_THRESHOLD = 4;

const DraggableOption = ({
  value,
  disabled,
  dropZone,
  onDrop,
}: {
  value: number;
  disabled: boolean;
  dropZone: DropZone | null;
  onDrop: (value: number) => void;
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          !disabled && (Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD),
        onPanResponderGrant: () => {
          setIsDragging(true);
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_evt, gesture) => {
          setIsDragging(false);
          const { moveX, moveY } = gesture;
          const isInside =
            !!dropZone &&
            moveX >= dropZone.x &&
            moveX <= dropZone.x + dropZone.width &&
            moveY >= dropZone.y &&
            moveY <= dropZone.y + dropZone.height;
          if (isInside) {
            onDrop(value);
          }
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
        },
      }),
    [disabled, dropZone, onDrop, pan, value],
  );

  return (
    <Animated.View
      style={[
        styles.optionCard,
        isDragging && styles.optionDragging,
        { transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.optionText} selectable={false}>
        {value}
      </Text>
    </Animated.View>
  );
};

export default function EksikSayiBul({ onGameEnd, onExit }: EksikSayiBulProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const [placedNumber, setPlacedNumber] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);
  const correctScale = useRef(new Animated.Value(1)).current;
  const wrongShake = useRef(new Animated.Value(0)).current;
  const startTimeRef = useRef(Date.now());
  const dropZoneRef = useRef<View>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const stageOrderRef = useRef<number[]>(shuffle(NUMBERS));

  const missingNumber = stageOrderRef.current[currentStage];
  const options = useMemo(() => shuffle(NUMBERS), [currentStage]);
  const sequence = NUMBERS.map(n => (n === missingNumber ? null : n));

  const measureDropZone = () => {
    if (!dropZoneRef.current) return;
    dropZoneRef.current.measureInWindow((x, y, width, height) => {
      setDropZone({ x, y, width, height });
    });
  };

  const goNextStage = () => {
    if (currentStage < TOTAL_STAGES - 1) {
      setCurrentStage(prev => prev + 1);
      setPlacedNumber(null);
      setFeedback('idle');
      correctScale.setValue(1);
      wrongShake.setValue(0);
      requestAnimationFrame(measureDropZone);
    } else {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      onGameEnd('eksik-sayi-bul', duration, movesRef.current, errorsRef.current, undefined, {
        zorlukSeviyesi: currentStage + 1,
        kazanimOdagi: 'Sayı Dizisi Tamamlama',
      });
    }
  };

  const handleDrop = (value: number) => {
    if (placedNumber !== null) return;
    setMoves(prev => {
      const next = prev + 1;
      movesRef.current = next;
      return next;
    });
    if (value === missingNumber) {
      setPlacedNumber(value);
      setFeedback('correct');
      Animated.sequence([
        Animated.spring(correctScale, { toValue: 1.12, useNativeDriver: true, friction: 5 }),
        Animated.spring(correctScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();
      if (currentStage === TOTAL_STAGES - 1) {
        setShowConfetti(true);
        setTimeout(goNextStage, 1600);
      } else {
        setTimeout(goNextStage, 1000);
      }
    } else {
      setErrors(prev => {
        const next = prev + 1;
        errorsRef.current = next;
        return next;
      });
      setFeedback('wrong');
      Animated.sequence([
        Animated.timing(wrongShake, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: 6, duration: 70, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: -6, duration: 70, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setFeedback('idle'), 800);
    }
  };

  return (
    <DynamicBackground onExit={onExit}>
      {showConfetti && (
        <ConfettiCannon
          count={180}
          origin={{ x: 0, y: 0 }}
          autoStart={true}
          ref={confettiRef}
          fadeOut={true}
        />
      )}
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={PLATFORM_LOGO} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.title}>Eksik Sayiyi Bul</Text>
            <Text style={styles.subtitle}>1-5 arasinda eksik sayiyi surukle birak.</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <ProgressBar current={currentStage + 1} total={TOTAL_STAGES} />
          <View style={styles.roundBadge}>
            <Text style={styles.roundBadgeText}>{currentStage + 1}. Asama</Text>
          </View>
        </View>

        <View style={styles.sequenceArea}>
          <Text style={styles.sectionLabel}>Dizi</Text>
          <View style={styles.sequenceRow}>
            {sequence.map((value, index) => {
              const isMissing = value === null;
              if (!isMissing) {
                return (
                  <View key={`seq-${index}`} style={styles.sequenceCard}>
                    <Text style={styles.sequenceText} selectable={false}>
                      {value}
                    </Text>
                  </View>
                );
              }
              return (
                <Animated.View
                  key={`seq-${index}`}
                  ref={dropZoneRef}
                  onLayout={measureDropZone}
                  style={[
                    styles.sequenceCard,
                    styles.missingCard,
                    feedback === 'correct' && styles.missingCorrect,
                    feedback === 'wrong' && styles.missingWrong,
                    { transform: [{ scale: correctScale }, { translateX: wrongShake }] },
                  ]}
                >
                  <Text style={styles.missingText} selectable={false}>
                    {placedNumber ?? '?'}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.optionsArea}>
          <Text style={styles.sectionLabel}>Secenekler</Text>
          <View style={styles.optionsGrid}>
            {options.map(option => {
              if (placedNumber === missingNumber && option === missingNumber) return null;
              return (
                <DraggableOption
                  key={`opt-${option}-${currentStage}`}
                  value={option}
                  disabled={placedNumber !== null}
                  dropZone={dropZone}
                  onDrop={handleDrop}
                />
              );
            })}
          </View>
          <Text style={styles.helperText}>Eksik kutuyu tamamlamak icin sayiyi surukle birak.</Text>
        </View>
      </View>
    </DynamicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 36,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ffe0b2',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4e342e',
  },
  subtitle: {
    fontSize: 13,
    color: '#6d4c41',
    marginTop: 4,
  },
  progressRow: {
    gap: 8,
  },
  roundBadge: {
    alignSelf: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffcc80',
  },
  roundBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e65100',
  },
  sequenceArea: {
    backgroundColor: '#fff7e0',
    borderRadius: 22,
    padding: 18,
    borderWidth: 2,
    borderColor: '#ffc88f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8d6e63',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sequenceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  sequenceCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 22,
    backgroundColor: '#fff3c4',
    borderWidth: 2,
    borderColor: '#ffb74d',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  sequenceText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#5d4037',
    userSelect: 'none',
  },
  missingCard: {
    borderStyle: 'dashed',
    borderColor: '#ff7043',
    backgroundColor: '#ffe0b2',
  },
  missingText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#5d4037',
    userSelect: 'none',
  },
  missingCorrect: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e9',
  },
  missingWrong: {
    borderColor: '#c62828',
    backgroundColor: '#ffebee',
  },
  optionsArea: {
    backgroundColor: '#eef7ff',
    borderRadius: 24,
    padding: 18,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#42a5f5',
    borderStyle: 'dashed',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  optionCard: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: OPTION_SIZE / 2,
    backgroundColor: '#e3f2fd',
    borderWidth: 3,
    borderColor: '#2196f3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  optionDragging: {
    borderColor: '#1565c0',
    backgroundColor: '#bbdefb',
  },
  optionText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0d47a1',
    userSelect: 'none',
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: '#546e7a',
    textAlign: 'center',
  },
});
