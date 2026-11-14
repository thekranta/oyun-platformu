import * as fs from 'fs';
import * as path from 'path';

/**
 * Küçük/kısa telefonda (360x640 dp) tek ekran oyunların içeriği taşıyordu (2026-11-14 küçük ekran taraması):
 *  - Dünya Bayrakları / Selamları / Yapıları-Yiyecekleri (KulturEslestirme) / Bayrak Boya: `container {flex:1, justifyContent:'center'}`,
 *    içerik uzayınca üst ve alttan kesiliyor, alt satırlara dokunulamıyordu → `ScrollIfNeeded` (kısaysa eskisi gibi ortalı, uzunsa kayar).
 *  - Miktar/Deniz Avcısı (QuantityComparison): sahne SABİT `height` idi; meyveler satıra sarınca içerik taşıp sayı rozetini kesiyordu →
 *    `minHeight` + `comparisonArea.flexGrow`.
 */
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('ScrollIfNeeded kullanan dokunma oyunları', () => {
    it.each(['DunyaBayraklari', 'DunyaSelamlari', 'KulturEslestirme', 'BayrakBoya', 'KutuyuBul', 'AkilliKutuyuBul'])('%s: içerik ScrollIfNeeded içinde', (name) => {
        const src = read(`components/${name}.tsx`);
        expect(src).toContain("import ScrollIfNeeded from './ScrollIfNeeded';");
        expect(src).toContain('<ScrollIfNeeded contentStyle={styles.container}>');
        expect(src).toContain('</ScrollIfNeeded>');
        expect(src).not.toContain('<View style={styles.container}>');
    });

    it('sarmalayıcı: flex:1 → flexGrow:1 (kısa içerik ortalı kalır, uzun içerik kayar)', () => {
        const src = read('components/ScrollIfNeeded.tsx');
        expect(src).toMatch(/const \{ flex: _flex, \.\.\.rest \}/);
        expect(src).toMatch(/\[rest, \{ flexGrow: 1 \}\]/);
    });
});

describe('QuantityComparison sahnesi içerikle büyür', () => {
    const src = read('components/QuantityComparison.tsx');
    it('sahne sabit height değil minHeight', () => {
        expect(src).toMatch(/styles\.stageContainer, \{ width: containerWidth, minHeight: containerHeight \}/);
        expect(src).not.toMatch(/styles\.stageContainer, \{ width: containerWidth, height: containerHeight \}/);
    });
    it('karşılaştırma alanı flex:1 değil flexGrow:1', () => {
        const block = src.slice(src.indexOf('comparisonArea: {'), src.indexOf('sideArea: {'));
        expect(block).toMatch(/flexGrow: 1/);
        expect(block).not.toMatch(/\bflex: 1/);
    });
});

describe('küçük ekran (360x640 dp) ek düzeltmeleri', () => {
    it('Diziyi Tamamla: içerik (üst bardan sonrası) ScrollView içinde; geri sayım/konfeti dışarıda', () => {
        const src = read('components/DiziyiTamamla.tsx');
        const scroll = src.indexOf('<ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}');
        expect(scroll).toBeGreaterThan(src.indexOf('<CountdownOverlay'));
        expect(scroll).toBeGreaterThan(src.indexOf('<ConfettiCannon'));
        expect(scroll).toBeLessThan(src.indexOf('styles.topBar'));
        expect(src).toContain('</ScrollView>');
    });

    it('Onluk Çerçeve: hücre boyutu ızgara alanının genişliğiyle sınırlı', () => {
        expect(read('components/OnlukCerceve.tsx')).toContain('(containerWidth * 0.5 - 28) / 5.5');
    });

    it('Sihirli Tuval: kısa ekranda (< 660 dp) tuval küçülür', () => {
        expect(read('components/SihirliTuval.tsx')).toContain('screenH * (screenH < 660 ? 0.36 : 0.45)');
    });
});

describe('seçenek satırı alttan kesilen dokunma oyunları: içerik kayar', () => {
    it.each(['KafiyeBahcesi', 'SonraNeOlur', 'MinikMarket', 'ResimdeNeOluyor', 'IzDedektifi', 'MevsimBahcesi', 'ManzaraKasifi', 'SakinlesmeBahcesi', 'HangiCalgiCaldi', 'MuzikDuruncaDon', 'KucukAnlatici', 'SanatGozlugu', 'OdaminKrokisi', 'BoyamaKitabi'])('%s: başlıktan kök kapanışa kadar ScrollView, geri sayım dışarıda', (name) => {
        const src = read(`components/${name}.tsx`);
        const scroll = src.indexOf("<ScrollView style={{ flex: 1, alignSelf: 'stretch' }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center'");
        expect(scroll).toBeGreaterThan(src.indexOf('<CountdownOverlay'));
        expect(scroll).toBeLessThan(src.indexOf('<View style={styles.header}>'));
        expect(src).toContain('</ScrollView>');
        expect(src).toMatch(/import \{[^}]*\bScrollView\b[^}]*\} from 'react-native';/);
    });
});

describe('küçük ekran: başlık/katman çakışmaları', () => {
    it('Ceviz Macerası: başlık çıkış düğmesinin altına iner (marginTop 56)', () => {
        expect(read('components/CevizMacera.tsx')).toMatch(/header: \{[^}]*marginTop: 56/);
    });

    it('Küçük Kalpler: başlangıç katmanı (Hikayeyi Dinle) açıkken anlatım balonu gizli', () => {
        const src = read('components/SevgiHikayesi.tsx');
        expect(src).toContain('{node.narration && started ? (');
        expect(src).not.toContain('{node.narration ? (');
    });
});
