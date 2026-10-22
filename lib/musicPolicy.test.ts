import { GAME_CATALOG } from '../constants/gameCatalog';
import {
  DUCK_HOLD_MS,
  GAME_LEVEL,
  IDLE_SILENCE_MS,
  MENU_LEVEL,
  musicSceneForRoute,
  musicSceneForStage,
  rampMs,
  targetVolume,
  type MusicState,
} from './musicPolicy';

const base: MusicState = { scene: 'menu', muted: false, interacted: true, idle: false, speaking: false, appActive: true };

describe('müzik düzeyleri', () => {
  it('menü oyundan yüksek, ikisi de eski varsayılandan (0,5) çok kısık; oyun menüden belirgin kısık', () => {
    expect(MENU_LEVEL).toBeGreaterThan(GAME_LEVEL);
    expect(MENU_LEVEL).toBeLessThanOrEqual(0.2);
    expect(GAME_LEVEL).toBeLessThanOrEqual(0.08);
    expect(GAME_LEVEL).toBeGreaterThan(0);
    // background.mp3 en yüksek RMS 0,58, konuşma ~0,30: menü müziği konuşmanın en az 10 dB altında olmalı.
    const dbBelowSpeech = (level: number) => 20 * Math.log10(0.3 / (0.58 * level));
    expect(dbBelowSpeech(MENU_LEVEL)).toBeGreaterThanOrEqual(10);
    expect(dbBelowSpeech(GAME_LEVEL)).toBeGreaterThanOrEqual(18);
  });

  it('süreler makul', () => {
    expect(IDLE_SILENCE_MS).toBeGreaterThanOrEqual(30_000);
    expect(DUCK_HOLD_MS).toBeLessThan(1500);
  });
});

describe('targetVolume', () => {
  it('menüde ve oyunda sahne düzeyini verir', () => {
    expect(targetVolume(base)).toBe(MENU_LEVEL);
    expect(targetVolume({ ...base, scene: 'game' })).toBe(GAME_LEVEL);
  });

  it('sahne belirtilmeyen ekranda sessiz (varsayılan güvenli)', () => {
    expect(targetVolume({ ...base, scene: 'off' })).toBe(0);
  });

  it('kapalıyken, ilk dokunuştan önce, hareketsizlikte, konuşurken ve arka plandayken sessiz', () => {
    expect(targetVolume({ ...base, muted: true })).toBe(0);
    expect(targetVolume({ ...base, interacted: false })).toBe(0);
    expect(targetVolume({ ...base, idle: true })).toBe(0);
    expect(targetVolume({ ...base, speaking: true })).toBe(0);
    expect(targetVolume({ ...base, appActive: false })).toBe(0);
    expect(targetVolume({ ...base, scene: 'game', speaking: true })).toBe(0);
  });
});

describe('rampMs', () => {
  it('yükselirken yumuşak', () => {
    expect(rampMs(base, 0, MENU_LEVEL)).toBeGreaterThanOrEqual(1000);
  });
  it('konuşma başlayınca hızlı, hareketsizlikte yavaş, diğerinde orta', () => {
    expect(rampMs({ ...base, speaking: true }, MENU_LEVEL, 0)).toBeLessThanOrEqual(250);
    expect(rampMs({ ...base, idle: true }, MENU_LEVEL, 0)).toBeGreaterThanOrEqual(2000);
    const mid = rampMs({ ...base, muted: true }, MENU_LEVEL, 0);
    expect(mid).toBeGreaterThan(250);
    expect(mid).toBeLessThan(2000);
  });
});

describe('oyun sahneleri', () => {
  it('müzik, ritim, çalgı, hikaye ve mikrofon oyunlarında müzik hiç çalmaz', () => {
    const silent = GAME_CATALOG.filter((g) => g.domain === 'Muzik' || g.status === 'music' || g.status === 'story');
    expect(silent.length).toBeGreaterThanOrEqual(8);
    silent.forEach((g) => expect({ id: g.id, scene: musicSceneForRoute(g.routeKey) }).toEqual({ id: g.id, scene: 'off' }));
    expect(musicSceneForRoute('bunu-soyle')).toBe('off');
  });

  it('diğer oyunlarda çok kısık müzik (sahne game)', () => {
    ['hafiza', 'uzay-bloklari', 'sihirli-tuval', 'sihirli-siseler'].forEach((r) =>
      expect({ r, scene: musicSceneForRoute(r) }).toEqual({ r, scene: 'game' }),
    );
    const loud = GAME_CATALOG.filter((g) => musicSceneForRoute(g.routeKey) === 'game');
    expect(loud.length).toBeGreaterThan(100);
  });

  it('kataloğda olmayan anahtar ve ana ekran aşamaları', () => {
    expect(musicSceneForRoute('yok-boyle-oyun')).toBe('off');
    expect(musicSceneForStage('menu')).toBe('menu');
    expect(musicSceneForStage('giris')).toBe('off');
    expect(musicSceneForStage('sonuc')).toBe('off');
    expect(musicSceneForStage('hafiza')).toBe('game');
    expect(musicSceneForStage('davul-ustasi')).toBe('off');
  });

  it('her oyunun sahnesi tanımlı (off ya da game)', () => {
    GAME_CATALOG.forEach((g) => expect(['off', 'game']).toContain(musicSceneForRoute(g.routeKey)));
  });
});
