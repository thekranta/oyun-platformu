// Konuşma (yönerge, 'Aferin!' vb.) etkinliği: arka plan müziği konuşma sürerken kesilsin diye
// services/speechService.speak() başlarken beginSpeech(), bitince dönen fonksiyonu çağırır.
// Bu modül React'a ve ses kütüphanesine bağımlı değildir; SoundContext abone olur.
//
// Takılı kalmaya karşı iki güvence: her jeton için en çok WATCHDOG_MS sonra otomatik biter,
// stopSpeech() resetSpeech() ile hepsini hemen bitirir (konuşma kesildiğinde speak() sözü 8 sn'ye
// kadar geç çözülebiliyor; müzik o kadar sessiz kalmamalı).

type Listener = (speaking: boolean) => void;

export const WATCHDOG_MS = 30_000;

const listeners = new Set<Listener>();
const tokens = new Map<number, ReturnType<typeof setTimeout>>();
let seq = 0;
let speaking = false;

function emit() {
  const now = tokens.size > 0;
  if (now === speaking) return;
  speaking = now;
  listeners.forEach((l) => l(now));
}

function endToken(id: number) {
  const timer = tokens.get(id);
  if (timer) clearTimeout(timer);
  tokens.delete(id);
  emit();
}

/** Konuşma başladı; dönen fonksiyon (birden çok çağrılsa da bir kez etkili) bittiğini bildirir. */
export function beginSpeech(): () => void {
  const id = ++seq;
  tokens.set(id, setTimeout(() => endToken(id), WATCHDOG_MS));
  emit();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    endToken(id);
  };
}

/** Konuşma kesildi: bekleyen tüm jetonları hemen bitirir. */
export function resetSpeech() {
  tokens.forEach((timer) => clearTimeout(timer));
  tokens.clear();
  emit();
}

export const isSpeechActive = () => speaking;

/** Konuşma başlayıp bittikçe çağrılır; abonelikten çıkış fonksiyonu döner. */
export function subscribeSpeech(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Bir konuşma bitip `settleMs` geçene kadar bekler (araya yeni konuşma girerse sayaç sıfırlanır); hiç konuşma
 * olmazsa en geç `fallbackMs` sonra çözülür (o anda konuşma sürüyorsa bitmesini bekler). Büyük bir dosyanın
 * (arka plan müziği) indirmesi ilk konuşma kliplerinin yolunu kesmesin diye kullanılır.
 */
export function waitForQuietWindow(fallbackMs: number, settleMs: number): Promise<void> {
  return new Promise((resolve) => {
    let settle: ReturnType<typeof setTimeout> | null = null;
    let off: () => void = () => { };
    const done = () => {
      clearTimeout(fallback);
      if (settle) clearTimeout(settle);
      off();
      resolve();
    };
    const fallback = setTimeout(() => {
      if (!speaking) done();
    }, fallbackMs);
    off = subscribeSpeech((active) => {
      if (settle) {
        clearTimeout(settle);
        settle = null;
      }
      if (!active) settle = setTimeout(done, settleMs);
    });
  });
}
