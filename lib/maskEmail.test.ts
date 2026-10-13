import { maskEmail } from './maskEmail';

describe('maskEmail', () => {
    it('normal adresi maskeler', () => {
        expect(maskEmail('ahmet@gmail.com')).toBe('ah***@gm***.com');
    });

    it('kısa yerel kısımda en az 1 karakter gösterir, kalanını gizler', () => {
        expect(maskEmail('ali@gmail.com')).toBe('a***@gm***.com');
        expect(maskEmail('al@gmail.com')).toBe('a***@gm***.com');
        expect(maskEmail('a@gmail.com')).toBe('a***@gm***.com');
        expect(maskEmail('abcd@gmail.com')).toBe('ab***@gm***.com');
    });

    it('kısa alan adında 1 karakter gösterir', () => {
        expect(maskEmail('ahmet@yo.com')).toBe('ah***@y***.com');
    });

    it('alt alan adlı domainde yalnız son uzantıyı gösterir', () => {
        expect(maskEmail('ahmet@mail.okul.com.tr')).toBe('ah***@ma***.tr');
        expect(maskEmail('ahmet@mail.okul.com')).toBe('ah***@ma***.com');
    });

    it('+etiketli adreste etiket sızmaz', () => {
        const out = maskEmail('ahmet+okul2024@gmail.com');
        expect(out).toBe('ah***@gm***.com');
        expect(out).not.toContain('okul');
    });

    it('büyük harfi korur, çökmez', () => {
        expect(maskEmail('AHMET@GMAIL.COM')).toBe('AH***@GM***.COM');
    });

    it('baş/son boşlukları yok sayar', () => {
        expect(maskEmail('  ahmet@gmail.com ')).toBe('ah***@gm***.com');
    });

    it('Türkçe karakterleri bölmez', () => {
        expect(maskEmail('şükrü@gmail.com')).toBe('şü***@gm***.com');
        expect(maskEmail('İpek@gmail.com')).toBe('İp***@gm***.com');
        expect(maskEmail('ışık@çocuk.com')).toBe('ış***@ço***.com');
    });

    it('boş / null / undefined için boş metin döner', () => {
        expect(maskEmail('')).toBe('');
        expect(maskEmail('   ')).toBe('');
        expect(maskEmail(null)).toBe('');
        expect(maskEmail(undefined)).toBe('');
        expect(maskEmail(42 as unknown as string)).toBe('');
    });

    it('geçersiz girdide çökmez ve ham metni sızdırmaz', () => {
        expect(maskEmail('gizlimetin')).toBe('***');
        expect(maskEmail('@gmail.com')).toBe('***');
        expect(maskEmail('ahmet@')).toBe('***');
        expect(maskEmail('@')).toBe('***');
    });

    it('noktasız alan adını maskeler', () => {
        expect(maskEmail('ahmet@localhost')).toBe('ah***@lo***');
        expect(maskEmail('ahmet@gmail.')).toBe('ah***@gm***');
    });

    it('çıktı özgün e-postayı tam içermez', () => {
        const email = 'veli.ornek@gmail.com';
        expect(maskEmail(email)).not.toContain('ornek');
        expect(maskEmail(email)).not.toBe(email);
    });
});
