import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';

interface EksikSayiBulProps {
  onGameEnd: (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string },
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
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          setIsDragging(true);
          pan.setValue({ x: 0, y: 0 });
        },
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
      <Text style={styles.optionText}>{value}</Text>
    </Animated.View>
  );
};

export default function EksikSayiBul({ onGameEnd, onExit }: EksikSayiBulProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [placedNumber, setPlacedNumber] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
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
      requestAnimationFrame(measureDropZone);
    } else {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      onGameEnd('eksik-sayi-bul', duration, moves, errors);
    }
  };

  const handleDrop = (value: number) => {
    if (placedNumber !== null) return;
    setMoves(prev => prev + 1);
    if (value === missingNumber) {
      setPlacedNumber(value);
      setFeedback('correct');
      setTimeout(goNextStage, 1200);
    } else {
      setErrors(prev => prev + 1);
      setFeedback('wrong');
      setTimeout(() => setFeedback('idle'), 800);
    }
  };

  return (
    <DynamicBackground onExit={onExit}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={PLATFORM_LOGO} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.title}>Eksik Sayiyi Bul</Text>
            <Text style={styles.subtitle}>1-5 arasindaki eksik sayiyi surukle.</Text>
          </View>
        </View>

        <ProgressBar current={currentStage + 1} total={TOTAL_STAGES} />

        <View style={styles.sequenceArea}>
          <Text style={styles.sectionLabel}>Dizi</Text>
          <View style={styles.sequenceRow}>
            {sequence.map((value, index) => {
              const isMissing = value === null;
              if (!isMissing) {
                return (
                  <View key={`seq-${index}`} style={styles.sequenceCard}>
                    <Text style={styles.sequenceText}>{value}</Text>
                  </View>
                );
              }
              return (
                <View
                  key={`seq-${index}`}
                  ref={dropZoneRef}
                  onLayout={measureDropZone}
                  style={[
                    styles.sequenceCard,
                    styles.missingCard,
                    feedback === 'correct' && styles.missingCorrect,
                    feedback === 'wrong' && styles.missingWrong,
                  ]}
                >
                  <Text style={styles.missingText}>{placedNumber ?? '?'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.optionsArea}>
          <Text style={styles.sectionLabel}>Secenekler</Text>
          <View style={styles.optionsGrid}>
            {options.map(option => (
              <DraggableOption
                key={`opt-${option}-${currentStage}`}
                value={option}
                disabled={placedNumber !== null}
                dropZone={dropZone}
                onDrop={handleDrop}
              />
            ))}
          </View>
          <Text style={styles.helperText}>Eksik kutuya uygun rakami surukle birak.</Text>
        </View>
      </View>
    </DynamicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
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
    borderColor: '#f2d6a2',
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
  sequenceArea: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3e3c8',
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  sequenceCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 20,
    backgroundColor: '#fff8e1',
    borderWidth: 2,
    borderColor: '#fbc02d',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  sequenceText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6d4c41',
  },
  missingCard: {
    borderStyle: 'dashed',
    borderColor: '#8d6e63',
    backgroundColor: '#fff3e0',
  },
  missingText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#6d4c41',
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
    backgroundColor: '#fdfaf5',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#d7ccc8',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCard: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#90a4ae',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  optionDragging: {
    borderColor: '#1565c0',
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#37474f',
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: '#8d6e63',
    textAlign: 'center',
  },
});
