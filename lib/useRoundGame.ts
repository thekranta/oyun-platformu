import { useCallback, useEffect, useRef, useState } from 'react';
import { stopSpeech } from '../services/speechService';

// Tur tabanlı sesli oyunların ortak iskeleti (KafiyeBahcesi, ResimdeNeTers gibi).
// Yeni oyun: bu hook + oyuna özgü sahne verisi/ekran. 5 kayıt dosyası için
// lib/newGameChecklist.test.ts eksikleri yakalar.

export type RoundGameEnd = (
  oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
  algilananKelime?: string,
  extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
) => void;

interface Options {
  /** Kayıt anahtarı (gameCatalog id / maarifMap anahtarı ile aynı). */
  oyunAdi: string;
  totalRounds: number;
  /** Sonuç ekranında gösterilen kazanım odağı (ör. 'Türkçe: ... (TAOB.3)'). */
  kazanimOdagi: string;
  onGameEnd: RoundGameEnd;
  zorlukSeviyesi?: number;
}

export function useRoundGame({ oyunAdi, totalRounds, kazanimOdagi, onGameEnd, zorlukSeviyesi = 1 }: Options) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [locked, setLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    stopSpeech();
  }, []);

  /** Bileşen kapanınca otomatik temizlenen zamanlayıcı. */
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => { if (isMountedRef.current) fn(); }, ms);
    timersRef.current.push(t);
  }, []);

  /** Sonucu bir kez bildirir (çift çağrıya karşı korumalı). */
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd(oyunAdi, duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi,
      kazanimOdagi,
      correct_answers: correctRef.current,
    });
  }, [onGameEnd, oyunAdi, kazanimOdagi, startTime, zorlukSeviyesi]);

  /** Doğru cevap: sayaç + konfeti. Sonraki tura geçişi çağıran `advance` ile yapar. */
  const markCorrect = useCallback(() => {
    movesRef.current += 1;
    correctRef.current += 1;
    setLocked(true);
    setShowConfetti(true);
  }, []);

  /** Hamle sayacı (doğru ara adımlar için; son doğruda markCorrect zaten sayar). */
  const markMove = useCallback(() => { movesRef.current += 1; }, []);

  /** Yanlış dokunuş: yalnızca sayaç (kilitlemez, ceza yok). */
  const markWrong = useCallback(() => {
    movesRef.current += 1;
    errorsRef.current += 1;
  }, []);

  /** Sonraki tura geç ya da son turdaysa bitir. */
  const advance = useCallback(() => {
    if (!isMountedRef.current) return;
    setShowConfetti(false);
    setLocked(false);
    if (round < totalRounds) setRound((r) => r + 1);
    else finish();
  }, [round, totalRounds, finish]);

  return {
    gameReady, setGameReady,
    round, totalRounds,
    locked, setLocked,
    showConfetti, setShowConfetti,
    isMountedRef, later,
    markCorrect, markWrong, markMove, advance, finish,
  };
}
