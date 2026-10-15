import { attachPlayCounts, CodeCoverage, computeCodeCoverage, foldScoreName, officialSplit, recordsUnreliable, summarize } from './curriculumHealth';
import { MaarifCikti2026 } from '../../constants/maarifCurriculum2026';
import { MaarifEntry } from '../../constants/maarifMap';

const CIKTILAR: Record<string, MaarifCikti2026> = {
    'AAA.1': { code: 'AAA.1', alan: 'Fen', resmi: true, aciklama: 'Kapsanmayan kod' },
    'AAA.2': { code: 'AAA.2', alan: 'Fen', resmi: true, aciklama: 'Tek oyunlu (kırılgan) kod' },
    'BBB.1': { code: 'BBB.1', alan: 'Matematik', resmi: true, aciklama: 'İki oyunlu kod' },
};

const GAME_MAP: Record<string, MaarifEntry> = {
    'oyun-a': { displayName: 'Oyun A', alan: 'Fen', surec: 'x', cikti: 'AAA.2', ciktiAciklama: '' },
    'oyun-b': { displayName: 'Oyun B', alan: 'Matematik', surec: 'x', cikti: 'BBB.1', ciktiAciklama: '' },
    'oyun-c': { displayName: 'Oyun C', alan: 'Matematik', surec: 'x', cikti: 'BBB.1', ciktiAciklama: '' },
};

describe('computeCodeCoverage', () => {
    it('her kanonik kodu döner, oyunu olmayan kod boş dizi alır', () => {
        const result = computeCodeCoverage(CIKTILAR, GAME_MAP);
        expect(result).toHaveLength(3);
        const aaa1 = result.find((c) => c.code === 'AAA.1')!;
        expect(aaa1.oyunlar).toEqual([]);
    });

    it('bir koda bağlı oyunları doğru toplar', () => {
        const result = computeCodeCoverage(CIKTILAR, GAME_MAP);
        const bbb1 = result.find((c) => c.code === 'BBB.1')!;
        expect(bbb1.oyunlar.map((g) => g.oyunTuru).sort()).toEqual(['oyun-b', 'oyun-c']);
    });

    it('bilinmeyen bir cikti koduna sahip oyun sessizce atlanır (uydurma-kod koruması)', () => {
        const gameMapWithGhost = { ...GAME_MAP, 'oyun-hayalet': { displayName: 'Hayalet', alan: 'Fen', surec: 'x', cikti: 'ZZZ.9', ciktiAciklama: '' } };
        const result = computeCodeCoverage(CIKTILAR, gameMapWithGhost);
        expect(result.flatMap((c) => c.oyunlar.map((g) => g.oyunTuru))).not.toContain('oyun-hayalet');
    });
});

describe('attachPlayCounts', () => {
    it('eşleşen oynanma sayısını doğru iliştirir, eşleşmeyen 0 kalır', () => {
        const coverage = computeCodeCoverage(CIKTILAR, GAME_MAP);
        const result = attachPlayCounts(coverage, { 'oyun-b': 5 });
        const bbb1 = result.find((c) => c.code === 'BBB.1')!;
        const oyunB = bbb1.oyunlar.find((g) => g.oyunTuru === 'oyun-b')!;
        const oyunC = bbb1.oyunlar.find((g) => g.oyunTuru === 'oyun-c')!;
        expect(oyunB.oynanmaSayisi).toBe(5);
        expect(oyunC.oynanmaSayisi).toBe(0);
    });
});

describe('summarize', () => {
    it('kapsam oranını doğru hesaplar (3 koddan 2si kapsanmış)', () => {
        const coverage = attachPlayCounts(computeCodeCoverage(CIKTILAR, GAME_MAP), {});
        const result = summarize(coverage);
        expect(result.toplamKod).toBe(3);
        expect(result.kapsananKod).toBe(2);
        expect(result.kapsamOrani).toBe(67);
    });

    it('boşlukları (0 oyunlu kodları) doğru bulur', () => {
        const coverage = attachPlayCounts(computeCodeCoverage(CIKTILAR, GAME_MAP), {});
        const result = summarize(coverage);
        expect(result.bosluklar.map((c) => c.code)).toEqual(['AAA.1']);
    });

    it('kırılgan (tek oyunlu) kodları doğru bulur', () => {
        const coverage = attachPlayCounts(computeCodeCoverage(CIKTILAR, GAME_MAP), {});
        const result = summarize(coverage);
        expect(result.kirilgan.map((c) => c.code)).toEqual(['AAA.2']);
    });

    it('alan bazlı toplamı doğru çıkarır', () => {
        const coverage = attachPlayCounts(computeCodeCoverage(CIKTILAR, GAME_MAP), {});
        const result = summarize(coverage);
        const fen = result.alanlar.find((a) => a.alan === 'Fen')!;
        const matematik = result.alanlar.find((a) => a.alan === 'Matematik')!;
        expect(fen).toEqual({ alan: 'Fen', kodSayisi: 2, kapsananKodSayisi: 1, oyunSayisi: 1 });
        expect(matematik).toEqual({ alan: 'Matematik', kodSayisi: 1, kapsananKodSayisi: 1, oyunSayisi: 2 });
    });

    it('hiç oynanmamış oyunları doğru tespit eder (kod kapsanmış ama oyun 0 kez oynanmış)', () => {
        const coverage = attachPlayCounts(computeCodeCoverage(CIKTILAR, GAME_MAP), { 'oyun-b': 3 });
        const result = summarize(coverage);
        expect(result.oynanmayanOyunlar.map((g) => g.oyunTuru).sort()).toEqual(['oyun-a', 'oyun-c']);
    });

    it('boş kapsamada tüm sayılar 0/boş döner', () => {
        const result = summarize([]);
        expect(result).toEqual({
            toplamKod: 0, kapsananKod: 0, kapsamOrani: 0,
            alanlar: [], bosluklar: [], kirilgan: [], oynanmayanOyunlar: [],
        });
    });
});

describe('takma adlar ve kayıt adı katlama', () => {
    const shared: MaarifEntry = { displayName: 'Ortak Oyun', alan: 'Fen', surec: 'x', cikti: 'AAA.2', ciktiAciklama: '' };
    const MAP2: Record<string, MaarifEntry> = { 'oyun-eski': shared, 'oyun-yeni': shared, 'oyun-b': GAME_MAP['oyun-b'] };

    it('aynı kaydı paylaşan anahtarlar TEK oyun sayılır (çift sayım yok)', () => {
        const cov = computeCodeCoverage(CIKTILAR, MAP2);
        const aaa2 = cov.find((c) => c.code === 'AAA.2')!;
        expect(aaa2.oyunlar).toHaveLength(1);
        expect(aaa2.oyunlar[0]).toMatchObject({ oyunTuru: 'oyun-eski', aliases: ['oyun-yeni'] });
    });

    it('oynanma sayısı takma adların toplamıdır', () => {
        const cov = attachPlayCounts(computeCodeCoverage(CIKTILAR, MAP2), { 'oyun-eski': 2, 'oyun-yeni': 3 });
        expect(cov.find((c) => c.code === 'AAA.2')!.oyunlar[0].oynanmaSayisi).toBe(5);
    });

    it('foldScoreName: "kimlik - ek" kayıtları kimliğe katlar, bilinmeyen adı olduğu gibi bırakır', () => {
        const map: Record<string, MaarifEntry> = { yapboz: shared };
        expect(foldScoreName('Yapboz - Karpuz', map)).toBe('yapboz');
        expect(foldScoreName('Yapboz', map)).toBe('yapboz');
        expect(foldScoreName('Başka - Şey', map)).toBe('baska---sey');
        expect(foldScoreName('', map)).toBe('bilinmeyen-oyun');
    });
});

describe('officialSplit', () => {
    it('resmi kodları platform becerilerinden ayırır', () => {
        const cov: CodeCoverage[] = [
            { code: 'MAB.1', alan: 'Matematik', aciklama: '', resmi: true, oyunlar: [{ oyunTuru: 'a', displayName: 'A', oynanmaSayisi: 0 }] },
            { code: 'MAB.2', alan: 'Matematik', aciklama: '', resmi: true, oyunlar: [] },
            { code: 'SDB.1', alan: 'Sosyal-Duygusal', aciklama: '', resmi: false, oyunlar: [{ oyunTuru: 'b', displayName: 'B', oynanmaSayisi: 0 }] },
            { code: 'SDB.2', alan: 'Sosyal-Duygusal', aciklama: '', resmi: false, oyunlar: [] },
        ];
        expect(officialSplit(cov)).toEqual({ resmiToplam: 2, resmiKapsanan: 1, beceriToplam: 2, beceriKapsanan: 1 });
    });
});

describe('recordsUnreliable', () => {
    it('hata ya da sıfır satır güvenilmez; satır varsa güvenilir', () => {
        expect(recordsUnreliable({ ok: false, rows: 500 })).toBe(true);
        expect(recordsUnreliable({ ok: true, rows: 0 })).toBe(true);
        expect(recordsUnreliable({ ok: true, rows: 12 })).toBe(false);
    });
});
