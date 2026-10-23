import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ORUNTU_BASAMAKLARI, ORUNTU_IKILI, ORUNTU_UCLU } from '../constants/oruntuOyunlari';

// Kullanıcı kuralı (2026-10-23): yeni geometri oyunlarında temel şekiller kare, daire, üçgen ve dikdörtgen.
// Bu test kuralı Akıllı Şekil Çiftleri üzerinde güvenceye alır; yeni geometri oyunu eklenince burada bir blok daha açılır.
// (Eski oyunlar kuralın dışındadır: ilk üç Diziyi Tamamla oyunu yıldız da kullanır; bilerek dokunulmadı.)

const ROOT = join(__dirname, '..');
const oku = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8').split('\r\n').join('\n');
const TEMEL_SEKILLER = ['kare', 'daire', 'ucgen', 'dikdortgen'];

describe('geometri temel şekilleri: Akıllı Şekil Çiftleri', () => {
    const kayit = oku('components', 'gameRegistry.tsx');
    const bas = kayit.indexOf("'akilli-hafiza-sekil': (c) =>");
    const blok = kayit.slice(bas, kayit.indexOf('\n  ),', bas));

    it('kayıt bulundu', () => {
        expect(bas).toBeGreaterThan(-1);
    });

    it('şekil havuzu tam olarak dört temel şekildir', () => {
        const m = blok.match(/emojiSet=\{\[([^\]]*)\]\}/);
        expect(m).not.toBeNull();
        const havuz = (m![1].match(/'([^']+)'/g) ?? []).map((x) => x.slice(1, -1));
        expect([...havuz].sort()).toEqual([...TEMEL_SEKILLER].sort());
    });

    it('her şeklin görseli kart görselleri arasında tanımlı', () => {
        for (const s of TEMEL_SEKILLER) expect(blok).toContain(`${s}: asset('/images/${s}.webp')`);
    });

    it('yıldız, kalp, baklava, ay ve artı simgesi yok', () => {
        for (const yasak of ['⭐', '❤️', '🔷', '🔶', '🌙', '➕', 'yildiz']) expect(blok).not.toContain(yasak);
    });

    it('dört şekil görseli diskte var ve görsel haritasında kayıtlı', () => {
        const harita = oku('lib', 'assetMap.ts');
        for (const s of TEMEL_SEKILLER) {
            expect(existsSync(join(ROOT, 'assets', 'images', `${s}.webp`))).toBe(true);
            expect(harita).toContain(`'/images/${s}.webp'`);
        }
    });
});

describe('geometri temel şekilleri: İkili Örüntü, Örüntü Basamakları, Üçlü Örüntü', () => {
    const SETLER: [string, { sequence: string[]; answer: string; options: string[] }[]][] = [
        ['İkili Örüntü', ORUNTU_IKILI],
        ['Örüntü Basamakları', ORUNTU_BASAMAKLARI],
        ['Üçlü Örüntü', ORUNTU_UCLU],
    ];

    it.each(SETLER)('%s: dizi, cevap ve seçeneklerde yalnız dört temel şekil var', (_ad, set) => {
        for (const p of set) {
            for (const s of [...p.sequence, p.answer, ...p.options]) expect(TEMEL_SEKILLER).toContain(s);
        }
    });

    it('dikdörtgen üç oyunun dizilerinde de gerçekten kullanılıyor (yıldızın yerini aldı)', () => {
        for (const [, set] of SETLER) {
            expect(set.some((p) => p.sequence.includes('dikdortgen'))).toBe(true);
        }
    });

    it('DiziyiTamamla dikdörtgen görselini çizebilir', () => {
        const kaynak = oku('components', 'DiziyiTamamla.tsx');
        expect(kaynak).toContain("dikdortgen: asset('/images/dikdortgen.webp')");
    });
});
