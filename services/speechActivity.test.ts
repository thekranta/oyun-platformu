import { WATCHDOG_MS, beginSpeech, isSpeechActive, resetSpeech, subscribeSpeech } from './speechActivity';

describe('speechActivity', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetSpeech();
  });
  afterEach(() => {
    resetSpeech();
    jest.useRealTimers();
  });

  it('konuşma başlayınca etkin, bitince etkin değil; aboneye yalnız değişimde haber verir', () => {
    const seen: boolean[] = [];
    const off = subscribeSpeech((s) => seen.push(s));
    expect(isSpeechActive()).toBe(false);
    const end = beginSpeech();
    expect(isSpeechActive()).toBe(true);
    end();
    expect(isSpeechActive()).toBe(false);
    expect(seen).toEqual([true, false]);
    off();
  });

  it('art arda gelen konuşmalarda hepsi bitene kadar etkin kalır', () => {
    const seen: boolean[] = [];
    const off = subscribeSpeech((s) => seen.push(s));
    const a = beginSpeech();
    const b = beginSpeech();
    a();
    expect(isSpeechActive()).toBe(true);
    b();
    expect(isSpeechActive()).toBe(false);
    expect(seen).toEqual([true, false]);
    off();
  });

  it('bitirme fonksiyonu birden çok çağrılsa da bir kez etkili', () => {
    const a = beginSpeech();
    const b = beginSpeech();
    a();
    a();
    a();
    expect(isSpeechActive()).toBe(true);
    b();
    expect(isSpeechActive()).toBe(false);
  });

  it('resetSpeech hepsini hemen bitirir; eski jeton sonradan yeni konuşmayı bitirmez', () => {
    const old = beginSpeech();
    resetSpeech();
    expect(isSpeechActive()).toBe(false);
    const fresh = beginSpeech();
    old(); // geç gelen eski bitiş
    expect(isSpeechActive()).toBe(true);
    fresh();
    expect(isSpeechActive()).toBe(false);
  });

  it('bitiş hiç bildirilmezse bekçi zamanlayıcı kendiliğinden bitirir', () => {
    beginSpeech();
    expect(isSpeechActive()).toBe(true);
    jest.advanceTimersByTime(WATCHDOG_MS + 10);
    expect(isSpeechActive()).toBe(false);
  });

  it('abonelikten çıkınca haber gelmez', () => {
    const seen: boolean[] = [];
    const off = subscribeSpeech((s) => seen.push(s));
    off();
    beginSpeech()();
    expect(seen).toEqual([]);
  });
});
