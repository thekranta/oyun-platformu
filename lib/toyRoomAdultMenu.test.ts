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
        for (const marker of ["styles.adultNote}>{t('toyRoom.adultNote')", 'styles.pkgCard', "<AdultSectionTitle text={t('toyRoom.sectionAccount')}", 'styles.search', 'filtered.map']) {
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

/**
 * Yetişkin menüsü anlaşılırlık düzenlemesi (2026-11-22): üç bölüm (paket / veli ve hesap / oyun kütüphanesi), Veli Paneli girişi,
 * alan etiketleri. Veli paneline yalnız giriş ekranından gidilebiliyordu; artık menüden de açılır (panel aktif oturumla parola sormadan açılır).
 */
describe('ToyRoom yetişkin menüsü anlaşılırlık', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tr = require('../locales/tr.json').toyRoom;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const en = require('../locales/en.json').toyRoom;
    const ANAHTARLAR = ['sectionAccount', 'sectionLibrary', 'libraryCount', 'parentPanel', 'parentPanelHint', 'accountPrivacyHint', 'reportProblemHint', 'reduceMotionHint', 'switchOn', 'switchOff', 'chipAll', 'area'];

    it('Veli Paneli menüden açılır', () => {
        expect(modal).toContain("router.push('/veli-dashboard')");
    });

    it('yeni metinlerin hepsi Türkçe ve İngilizce dosyalarında var', () => {
        for (const k of ANAHTARLAR) {
            expect(tr[k]).toBeDefined();
            expect(en[k]).toBeDefined();
        }
        expect(Object.keys(tr.area).sort()).toEqual(Object.keys(en.area).sort());
    });

    it('oyun kütüphanesi alan etiketleri sarılır, kaydırmaz (iç içe ScrollView yok) ve hepsinin adı tanımlı', () => {
        expect(modal).toContain('styles.chipRow');
        expect(src).toMatch(/chipRow: \{ flexDirection: 'row', flexWrap: 'wrap'/);
        for (const a of ['matematik', 'turkce', 'fen', 'sosyal', 'sanat', 'muzik', 'hareket', 'duygu', 'ingilizce']) expect(tr.area[a]).toBeTruthy();
    });
});
