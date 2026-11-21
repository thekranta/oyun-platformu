import { DEFAULT_MAARIF, MAARIF_MAP } from './maarifMap';
import { isValidCikti2026, MAARIF_CIKTILAR_2026 } from './maarifCurriculum2026';

describe('MAARIF_MAP — 2026 kod bütünlüğü', () => {
    // Ek etkinlikler (ek: true, ör. İngilizce) Maarif dışıdır: kod taşımazlar, aşağıdaki Maarif kod testleri onlara uygulanmaz.
    const entries = Object.entries(MAARIF_MAP).filter(([, m]) => !m.ek);

    it('her oyunun cikti kodu 2026 kanonik listesinde var (uydurma kod yok)', () => {
        const uydurma = entries.filter(([, m]) => !isValidCikti2026(m.cikti));
        expect(uydurma.map(([oyun, m]) => `${oyun} -> ${m.cikti}`)).toEqual([]);
    });

    it('DEFAULT_MAARIF kodu geçerli', () => {
        expect(isValidCikti2026(DEFAULT_MAARIF.cikti)).toBe(true);
    });

    it('her oyunun alanı, atanan kodun resmi alanıyla tutarlı (Sosyal-Duygusal hariç serbest eşleşme yok)', () => {
        const tutarsiz = entries.filter(([, m]) => {
            const resmi = MAARIF_CIKTILAR_2026[m.cikti];
            return resmi && resmi.alan !== m.alan;
        });
        expect(tutarsiz.map(([oyun, m]) => `${oyun}: alan=${m.alan} ama kod alanı=${MAARIF_CIKTILAR_2026[m.cikti]?.alan}`)).toEqual([]);
    });

    it('ek etkinlikler (Maarif dışı) kod TAŞIMAZ ve Maarif kazanımı iddia etmez', () => {
        const ekler = Object.entries(MAARIF_MAP).filter(([, m]) => m.ek);
        expect(ekler.length).toBeGreaterThan(0);
        for (const [oyun, m] of ekler) {
            expect([oyun, m.cikti]).toEqual([oyun, '']);
            expect(m.ciktiAciklama).toMatch(/Maarif programında karşılığı olmayan ek etkinlik/);
            expect(m.deger).toBeUndefined();
        }
    });

    it('Maarif kodu olmayan (boş kodlu) her kayıt ek etkinlik olarak işaretli (sessizce kodsuz kalamaz)', () => {
        const kodsuz = Object.entries(MAARIF_MAP).filter(([, m]) => !m.cikti && !m.ek);
        expect(kodsuz.map(([oyun]) => oyun)).toEqual([]);
    });

    it('en az 100 oyun kayıtlı (regresyon: yanlışlıkla toplu silme olursa yakalar)', () => {
        expect(entries.length).toBeGreaterThan(100);
    });
});
