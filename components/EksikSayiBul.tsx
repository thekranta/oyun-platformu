
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import JuicyProgressBar from './JuicyProgressBar';
import { asset } from '../lib/assetMap';
import { speak, speakThenWait } from '../services/speechService';
import ListenButton from './ListenButton';

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// 10 ('On') VoiceBox'ta çok kısa geldiği için üretilemedi; rakam olarak ("10")
// üretildi — Türkçe TTS bunu doğru şekilde "on" diye okuyor.
const NUMBER_WORDS: Record<number, string> = {
  1: 'Bir', 2: 'İki', 3: 'Üç', 4: 'Dört', 5: 'Beş',
  6: 'Altı', 7: 'Yedi', 8: 'Sekiz', 9: 'Dokuz', 10: '10',
};

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
  numbers?: number[];   // temalı varyant için sayı aralığı (ör. [6,7,8,9,10])
  oyunAdi?: string;     // varyant oyun kimliği
}

type DropZone = { x: number; y: number; width: number; height: number };

const DEFAULT_NUMBERS = [1, 2, 3, 4, 5];
const { width } = Dimensions.get('window');
const CARD_SIZE = width > 600 ? 96 : 72;
const OPTION_SIZE = width > 600 ? 90 : 68;
const PLATFORM_LOGO = asset('/images/icon.png');

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
  onTap,
}: {
  value: number;
  disabled: boolean;
  dropZone: DropZone | null;
  onDrop: (value: number) => void;
  onTap: (value: number) => void;
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  // Parmak DRAG_THRESHOLD'u aşmadan kalktıysa bu bir DOKUNMA: sayı sesle söylenir (#9).
  const movedRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          movedRef.current = false;
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_evt, gesture) => {
          if (!movedRef.current) {
            if (Math.abs(gesture.dx) <= DRAG_THRESHOLD && Math.abs(gesture.dy) <= DRAG_THRESHOLD) return;
            movedRef.current = true;
            setIsDragging(true);
          }
          pan.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (!movedRef.current) {
            onTap(value);
            return;
          }
          movedRef.current = false;
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
          movedRef.current = false;
          setIsDragging(false);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
        },
      }),
    [disabled, dropZone, onDrop, onTap, pan, value],
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

export default function EksikSayiBul({ onGameEnd, onExit, numbers = DEFAULT_NUMBERS, oyunAdi = 'eksik-sayi-bul' }: EksikSayiBulProps) {
  const TOTAL_STAGES = numbers.length;
  const [currentStage, setCurrentStage] = useState(0);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const [placedNumber, setPlacedNumber] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);
  const correctScale = useRef(new Animated.Value(1)).current;
  const wrongShake = useRef(new Animated.Value(0)).current;
  // Bos kutunun (?) goze carpmasi icin surekli nefes alma animasyonu — cocuklar
  // hareket eden seyleri sabit duran bir isaretten cok daha kolay fark ediyor.
  const pulseScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.08, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseScale]);
  const startTimeRef = useRef(Date.now());
  const dropZoneRef = useRef<View>(null);
  // Asama-gecis/oyun-bitis setTimeout'lari; unmount'ta temizlenmezse cocuk cikis
  // yaptiktan sonra goNextStage/onGameEnd tetikleniyordu.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
  }, []);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const stageOrderRef = useRef<number[]>(shuffle(numbers));

  const missingNumber = stageOrderRef.current[currentStage];
  const options = useMemo(() => shuffle(numbers), [currentStage]);
  const sequence = numbers.map(n => (n === missingNumber ? null : n));

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
      onGameEnd(oyunAdi, duration, movesRef.current, errorsRef.current, undefined, {
        zorlukSeviyesi: currentStage + 1,
        kazanimOdagi: 'Sayı Dizisi Tamamlama',
      });
    }
  };

  const speakValue = (value: number) => speak(NUMBER_WORDS[value] ?? String(value));

  // Doğru bırakışta önce sayı söylenir, BİTİNCE 'Aferin!' (aynı anda başlarsa Aferin sayıyı
  // kesiyordu, çocuk hangi sayıyı koyduğunu duymuyordu — #9). Her adım üst sınırla beklenir:
  // ses takılırsa oyun durmasın. Çıkıldıysa aşama atlanmaz.
  const celebrateAndAdvance = async (spoken: Promise<void>, isLast: boolean) => {
    const cap = (p: Promise<void>, ms: number) =>
      Promise.race([p.catch(() => undefined), new Promise<void>(resolve => setTimeout(resolve, ms))]);
    await cap(spoken, 1500);
    await cap(speakThenWait('Aferin!', isLast ? 1400 : 700), 2600);
    if (mountedRef.current) goNextStage();
  };

  const handleDrop = (value: number) => {
    if (placedNumber !== null) return;
    const spoken = speakValue(value);
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
      const isLast = currentStage === TOTAL_STAGES - 1;
      if (isLast) setShowConfetti(true);
      celebrateAndAdvance(spoken, isLast);
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
      timersRef.current.push(setTimeout(() => setFeedback('idle'), 800));
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
          {/* flex: 1 → dar ekranda (320-360 px) altyazı ekran dışına taşmak yerine ikinci satıra sarılır */}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Eksik Sayıyı Bul</Text>
            <Text style={styles.subtitle}>{numbers[0]}-{numbers[numbers.length - 1]} arasında eksik sayıyı sürükle bırak.</Text>
          </View>
        </View>

        <ListenButton onPress={() => speak('Sıradaki eksik sayıyı bul ve yerine koy!', { instructions: HAPPY_VOICE })} color="#e65100" style={{ marginTop: 4, alignSelf: 'center' }} />

        <View style={styles.progressRow}>
          <JuicyProgressBar current={currentStage + 1} total={TOTAL_STAGES} />
          <View style={styles.roundBadge}>
            <Text style={styles.roundBadgeText}>{currentStage + 1}. Aşama</Text>
          </View>
        </View>

        <View style={styles.sequenceArea}>
          <Text style={styles.sectionLabel}>Dizi</Text>
          <View style={styles.sequenceRow}>
            {sequence.map((value, index) => {
              const isMissing = value === null;
              if (!isMissing) {
                return (
                  <TouchableOpacity
                    key={`seq-${index}`}
                    style={styles.sequenceCard}
                    onPress={() => speak(NUMBER_WORDS[value as number] ?? String(value))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sequenceText} selectable={false}>
                      {value}
                    </Text>
                  </TouchableOpacity>
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
                    { transform: [{ scale: correctScale }, { scale: pulseScale }, { translateX: wrongShake }] },
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
          <Text style={styles.sectionLabel}>Seçenekler</Text>
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
                  onTap={speakValue}
                />
              );
            })}
          </View>
          <Text style={styles.helperText}>Eksik kutuyu tamamlamak için sayıyı sürükle bırak.</Text>
        </View>
      </View>

      {!gameReady && (
        <CountdownOverlay
                    interaction="drag"
          message="Sıradaki eksik sayıyı bul ve yerine koy!"
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}
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
    // Sol üstte DynamicBackground'ın çıkış düğmesi (16+44 px) durur: logo onun SAĞINDAN başlar, köşesini örtmez.
    paddingLeft: 56,
    paddingRight: 8,
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
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: '#FF5252',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  missingText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FF5252',
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

