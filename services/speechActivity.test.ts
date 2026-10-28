import { WATCHDOG_MS, beginSpeech, isSpeechActive, resetSpeech, subscribeSpeech, waitForQuietWindow } from './speechActivity';

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

describe('waitForQuietWindow (büyük indirme ilk konuşmanın yolunu kesmesin)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetSpeech();
  });
  afterEach(() => {
    resetSpeech();
    jest.useRealTimers();
  });

  const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

  it('hiç konuşma olmazsa en geç fallbackMs sonra çözülür', async () => {
    let done = false;
    waitForQuietWindow(8000, 1500).then(() => { done = true; });
    jest.advanceTimersByTime(7999);
    await flush();
    expect(done).toBe(false);
    jest.advanceTimersByTime(2);
    await flush();
    expect(done).toBe(true);
  });

  it('bir konuşma bitince settleMs sonra çözülür (fallback beklenmez)', async () => {
    let done = false;
    waitForQuietWindow(8000, 1500).then(() => { done = true; });
    const end = beginSpeech();
    jest.advanceTimersByTime(2000);
    end();
    jest.advanceTimersByTime(1400);
    await flush();
    expect(done).toBe(false);
    jest.advanceTimersByTime(200);
    await flush();
    expect(done).toBe(true);
  });

  it('settle süresinde yeni konuşma başlarsa sayaç sıfırlanır', async () => {
    let done = false;
    waitForQuietWindow(8000, 1500).then(() => { done = true; });
    const a = beginSpeech();
    a();
    jest.advanceTimersByTime(1000);
    const b = beginSpeech();            // araya yeni konuşma girdi
    jest.advanceTimersByTime(3000);
    await flush();
    expect(done).toBe(false);
    b();
    jest.advanceTimersByTime(1600);
    await flush();
    expect(done).toBe(true);
  });

  it('fallback anında konuşma sürüyorsa çözülmez; konuşma bitince (settle sonra) çözülür', async () => {
    let done = false;
    const end = beginSpeech();
    waitForQuietWindow(8000, 1500).then(() => { done = true; });
    jest.advanceTimersByTime(9000);
    await flush();
    expect(done).toBe(false);           // uzun anlatım sürüyor
    end();
    jest.advanceTimersByTime(1600);
    await flush();
    expect(done).toBe(true);
  });

  it('çözüldükten sonra abonelik kalmaz', async () => {
    waitForQuietWindow(1000, 100);
    jest.advanceTimersByTime(1100);
    await flush();
    const seen: boolean[] = [];
    const off = subscribeSpeech((x) => seen.push(x));
    beginSpeech()();
    expect(seen).toEqual([true, false]);
    off();
  });
});
