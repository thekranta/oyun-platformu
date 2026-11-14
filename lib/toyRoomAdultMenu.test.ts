import * as fs from 'fs';
import * as path from 'path';

/**
 * Yetişkin menüsü (Yetişkinler için) küçük telefonda (2026-11-14, 360x640 dp BlueStacks taraması): başlık, açıklama, paket kutusu,
 * düğmeler ve arama kutusu SABİT, yalnız oyun listesi kayıyordu ve sabit bölümlerden artan yüksekliği alıyordu → 360x640 dp'de liste 0 px,
 * 411x686 dp'de tek satır; ebeveyn "tüm oyunlar" listesine ulaşamıyordu. Kural: başlığın altındaki HER ŞEY tek ScrollView içinde olmalı.
 */
const src = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'ToyRoom.tsx'), 'utf8');
const start = src.indexOf("<Modal visible={adult}");
const end = src.indexOf('</Modal>', start);
const modal = src.slice(start, end);

describe('ToyRoom yetişkin menüsü kaydırma', () => {
    it('başlıktan sonra tek ScrollView başlar; not, paket, düğmeler, arama ve liste içindedir', () => {
        const header = modal.indexOf('styles.adultHeader');
        const scroll = modal.indexOf('<ScrollView keyboardShouldPersistTaps="handled"');
        expect(header).toBeGreaterThan(0);
        expect(scroll).toBeGreaterThan(header);
        for (const marker of ["styles.adultNote}>{t('toyRoom.adultNote')", 'styles.pkgCard', 'styles.adultActions', 'styles.search', 'filtered.map']) {
            const at = modal.indexOf(marker);
            expect(at).toBeGreaterThan(scroll);
        }
        const closeAt = modal.indexOf('</ScrollView>');
        expect(closeAt).toBeGreaterThan(modal.indexOf('filtered.map'));
    });

    it('iç içe ikinci bir ScrollView yok (liste dış ScrollView ile aynı)', () => {
        expect(modal.match(/<ScrollView/g)?.length).toBe(1);
    });
});
