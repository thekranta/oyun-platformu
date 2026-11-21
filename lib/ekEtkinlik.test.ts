import { GAME_CATALOG } from '../constants/gameCatalog';
import { MAARIF_MAP, getMaarif, isEkEtkinlik } from '../constants/maarifMap';
import { groupByArea } from './institutionStats';
import { getMaarifInfo } from './maarifInfo';
import { buildGuide } from './teacherGameGuide';
import { buildTeacherSummaryPrompt, gameStats } from './teacherSummary';

/**
 * EK ETKİNLİKLER (Maarif programı DIŞI, ör. İngilizce): 2026 okul öncesi programında yabancı dil çıktısı yoktur.
 * Ürün kuralı (kullanıcı kararı, 2026-11-22): bu oyunlara Maarif kodu ÜRETME, hiçbir panel/rapor/AI metni Maarif
 * kazanımı iddia etmesin — "yalan beyan vermemeliyiz".
 */
const EK_ANAHTARLAR = Object.entries(MAARIF_MAP).filter(([, m]) => m.ek).map(([k]) => k);

describe('ek etkinlikler (Maarif dışı)', () => {
    it('en az bir ek etkinlik kayıtlı ve hepsi İngilizce alanında', () => {
        expect(EK_ANAHTARLAR.length).toBeGreaterThanOrEqual(5);
        for (const k of EK_ANAHTARLAR) expect(MAARIF_MAP[k].alan).toBe('İngilizce');
    });

    it('isEkEtkinlik: ek oyun true, Maarif oyunu false, bilinmeyen oyun false (varsayılan MAB.2 ek sayılmaz)', () => {
        expect(isEkEtkinlik(EK_ANAHTARLAR[0])).toBe(true);
        expect(isEkEtkinlik('yapboz')).toBe(false);
        expect(isEkEtkinlik('olmayan-oyun')).toBe(false);
    });

    it('öğretmen kartı: kod yok, ek etkinlik işareti ve dürüst metin var', () => {
        for (const k of EK_ANAHTARLAR) {
            const m = getMaarifInfo(k);
            expect(m.code).toBeNull();
            expect(m.ek).toBe(true);
            expect(m.official).toBe(false);
            expect(m.text).toMatch(/Maarif programında karşılığı olmayan ek etkinlik/);
        }
        expect(getMaarifInfo('yapboz').ek).toBe(false);
    });

    it('öğretmen oyun rehberinde (Maarif kodu → oyun) hiçbir ek etkinlik yer almaz', () => {
        const rehberOyunlari = buildGuide().flatMap(c => c.games.map(g => g.id));
        for (const g of GAME_CATALOG) {
            if (isEkEtkinlik(g.id) || isEkEtkinlik(g.routeKey)) expect(rehberOyunlari).not.toContain(g.id);
        }
        expect(buildGuide().every(c => c.alan !== 'İngilizce' && c.key !== '')).toBe(true);
    });

    it('kurum paneli payı: ek etkinlik "İngilizce (ek)" diye ayrı ve açıkça etiketli (Maarif alanı değil)', () => {
        const alanlar = groupByArea([{ oyunTuru: EK_ANAHTARLAR[0], gameCount: 2, childCount: 1 }, { oyunTuru: 'yapboz', gameCount: 2, childCount: 1 }]).map(a => a.alan);
        expect(alanlar).toContain('İngilizce (ek)');
        expect(alanlar).not.toContain('İngilizce');
    });

    it('öğretmen özeti istemi: ek etkinliğe Maarif kodu yazdırılmaz', () => {
        const oyunlar = [0, 1, 2].map(i => ({ oyun_turu: EK_ANAHTARLAR[0], created_at: '2026-11-0' + (i + 1) + 'T10:00:00Z', hamle_sayisi: 5, hata_sayisi: 1 }));
        const istem = buildTeacherSummaryPrompt(54, oyunlar);
        expect(istem).toMatch(/Maarif programı dışı ek etkinlik/);
        expect(gameStats(oyunlar)[0].code).toBe('');
    });

    it('getMaarif ek etkinliği varsayılan Maarif kaydına (MAB.2) düşürmez', () => {
        for (const k of EK_ANAHTARLAR) expect(getMaarif(k).cikti).toBe('');
    });
});
