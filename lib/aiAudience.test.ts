import { parentView, splitAnalysis, stripAudienceLabels, teacherView } from './aiAudience';

const PER_GAME =
    '**Öğrenme Çıktısı:** MAB.2 sayı sayma becerisi.\n\n**Süreç Analizi:** Dikkatli çalıştı.\n\n---\n\n' +
    '**VELİ BİLGİLENDİRME NOTU**\nDeğerli Velimiz, evde kaşık sayabilirsiniz.\n\nSaygılarımızla,\nChildhoodTech Ekibi';

const CUMULATIVE =
    '## BÖLÜM 1: MAARİF MODELİ PEDAGOJİK ANALİZ (Öğretmen/Akademisyen İçin)\n\nMAB.2 alanında yükselen trend.\n\n---\n\n' +
    '## BÖLÜM 2: VELİ BİLGİLENDİRME NOTU\n\nDeğerli Velimiz,\n\nÇocuğunuz sayılarda gelişiyor.\n\nSaygılarımızla,\nChildhoodTech Ekibi';

describe('splitAnalysis', () => {
    it('oyun bazlı biçim: akademik ve veli notu ayrılır', () => {
        const p = splitAnalysis(PER_GAME);
        expect(p.marked).toBe(true);
        expect(p.academic).toContain('MAB.2');
        expect(p.academic).not.toContain('VELİ');
        expect(p.academic).not.toContain('Değerli Velimiz');
        expect(p.academic!.endsWith('---')).toBe(false);
        expect(p.parent!.startsWith('Değerli Velimiz')).toBe(true);
        expect(p.parent).not.toContain('MAB.2');
        expect(p.parent).not.toContain('**');
    });

    it('kümülatif biçim (## BÖLÜM 2): akademik ve veli notu ayrılır', () => {
        const p = splitAnalysis(CUMULATIVE);
        expect(p.marked).toBe(true);
        expect(p.academic).toContain('MAB.2');
        expect(p.academic).not.toContain('BÖLÜM 2');
        expect(p.parent!.startsWith('Değerli Velimiz')).toBe(true);
        expect(p.parent).not.toContain('BÖLÜM');
        expect(p.parent).toContain('ChildhoodTech Ekibi');
    });

    it('işaretsiz metin: tamamı akademik sayılır, veli notu yok', () => {
        const p = splitAnalysis('Çocuk dikkatli. MAB.2 gelişiyor.');
        expect(p).toEqual({ academic: 'Çocuk dikkatli. MAB.2 gelişiyor.', parent: null, marked: false });
    });

    it('boş / null / yalnız boşluk', () => {
        for (const v of [null, undefined, '', '   \n ']) {
            expect(splitAnalysis(v)).toEqual({ academic: null, parent: null, marked: false });
        }
    });

    it('İ/I/i yazım farkları ve küçük harf işareti tanınır', () => {
        expect(splitAnalysis('A\n---\n**VELI BILGILENDIRME NOTU**\nmerhaba').marked).toBe(true);
        expect(splitAnalysis('A\n---\n**veli bilgilendirme notu**\nmerhaba').parent).toBe('merhaba');
    });

    it('işaret bölünmez boşluk / BOM ile yazılsa da tanınır (SQL eşi private.ai_academic_part aynısını yapar)', () => {
        for (const ch of [' ', ' ', ' ', '﻿', '　']) {
            const p = splitAnalysis(`Akademik.\n\n---\n\n**VELİ${ch}BİLGİLENDİRME${ch}NOTU**\nDeğerli Velimiz, merhaba.`);
            expect(p.marked).toBe(true);
            expect(p.academic).toBe('Akademik.');
            expect(p.parent).toBe('Değerli Velimiz, merhaba.');
        }
    });

    it('işaret aynı satırda devam metniyle gelirse metin kaybolmaz', () => {
        const p = splitAnalysis('Akademik.\n\n**VELİ BİLGİLENDİRME NOTU:** Değerli Velimiz, merhaba.');
        expect(p.parent).toBe('Değerli Velimiz, merhaba.');
    });

    it('yalnız veli notu varsa akademik kısım null', () => {
        const p = splitAnalysis('---\n**VELİ BİLGİLENDİRME NOTU**\nMerhaba velimiz');
        expect(p.academic).toBeNull();
        expect(p.parent).toBe('Merhaba velimiz');
    });

    it('CRLF satır sonları', () => {
        const p = splitAnalysis(PER_GAME.replace(/\n/g, '\r\n'));
        expect(p.academic).toContain('MAB.2');
        expect(p.parent).toContain('Değerli Velimiz');
    });
});

describe('parentView', () => {
    it('veli yalnız veli notunu görür (öğretmen başlığı, Maarif kodu, akademik metin YOK)', () => {
        for (const text of [PER_GAME, CUMULATIVE]) {
            const v = parentView(text)!;
            expect(v).toContain('Değerli Velimiz');
            expect(v).not.toMatch(/MAB\.\d/);
            expect(v).not.toContain('Öğretmen');
            expect(v).not.toContain('Akademisyen');
            expect(v).not.toContain('BÖLÜM');
        }
    });

    it('işaretli ama veli notu boşsa akademik kısmı velinin önüne KOYMAZ', () => {
        expect(parentView('Akademik metin MAB.2\n---\n**VELİ BİLGİLENDİRME NOTU**')).toBeNull();
    });

    it('işaretsiz eski metin gösterilir ama öğretmen etiketleri temizlenir', () => {
        const v = parentView('## BÖLÜM 1: ANALİZ (Öğretmen/Akademisyen İçin)\nÇocuk gelişiyor.')!;
        expect(v).toContain('Çocuk gelişiyor.');
        expect(v).not.toContain('Öğretmen');
    });

    it('boş girdi null', () => {
        expect(parentView(null)).toBeNull();
        expect(parentView('')).toBeNull();
    });
});

describe('teacherView', () => {
    it('öğretmen yalnız akademik kısmı görür (veli notu YOK)', () => {
        for (const text of [PER_GAME, CUMULATIVE]) {
            const v = teacherView(text)!;
            expect(v).toContain('MAB.2');
            expect(v).not.toContain('Değerli Velimiz');
            expect(v).not.toContain('Saygılarımızla');
            expect(v).not.toContain('VELİ BİLGİLENDİRME');
        }
    });

    it('işaretsiz metin (öğretmenin kendi kısa analizi) olduğu gibi döner', () => {
        expect(teacherView('Kısa pedagojik analiz.')).toBe('Kısa pedagojik analiz.');
    });

    it('yalnız veli notu olan metinde öğretmene hiçbir şey gitmez', () => {
        expect(teacherView('---\n**VELİ BİLGİLENDİRME NOTU**\nMerhaba velimiz')).toBeNull();
    });
});

describe('stripAudienceLabels', () => {
    it('parantez içindeki öğretmen/akademisyen etiketini siler, diğer parantezlere dokunmaz', () => {
        expect(stripAudienceLabels('Başlık (Öğretmen İçin) devam (5 dk)')).toBe('Başlık devam (5 dk)');
        expect(stripAudienceLabels('X (Öğretmen/Akademisyen İçin)')).toBe('X');
        expect(stripAudienceLabels(null)).toBeNull();
    });
});
